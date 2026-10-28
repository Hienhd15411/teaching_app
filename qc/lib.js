// Shared helpers for the QC suite (node qc/run.js).
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

// ---------- result collector ----------
const results = [];
let currentArea = 'general';
function area(name) { currentArea = name; }
function check(cond, msg, detail) {
  results.push({ area: currentArea, ok: !!cond, msg, detail: cond ? '' : (detail || '') });
  const line = (cond ? '  ok   ' : '  FAIL ') + msg + (!cond && detail ? '  → ' + detail : '');
  console.log(line);
  return !!cond;
}
// QC_ONLY=teacher node qc/run.js → run only scenarios whose name contains it.
async function safe(name, fn) {
  if (process.env.QC_ONLY && name.indexOf(process.env.QC_ONLY) < 0) return;
  try { await fn(); } catch (e) { check(false, name + ' crashed', (e && e.stack || String(e)).split('\n').slice(0, 6).join(' | ')); }
}

// ---------- static server ----------
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.md': 'text/plain' };
function startServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      let p = path.join(ROOT, u === '/' ? '/index.html' : u);
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, url: 'http://127.0.0.1:' + srv.address().port }));
  });
}

// ---------- browser-less module loader ----------
function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    clear: () => m.clear(),
    key: (i) => Array.from(m.keys())[i] || null,
    get length() { return m.size; },
  };
}
function loadModules(files, extra) {
  const elStub = () => ({ addEventListener() {}, querySelectorAll() { return []; }, querySelector() { return null; }, setAttribute() {}, appendChild() {}, classList: { add() {}, remove() {}, toggle() {} }, style: {} });
  const ctx = Object.assign({
    console, Math, Date, JSON, Intl, TextEncoder, Map, Set, Promise, setTimeout, clearTimeout, setInterval, clearInterval,
    localStorage: memStorage(), sessionStorage: memStorage(),
    document: { addEventListener() {}, querySelectorAll() { return []; }, querySelector() { return null; }, getElementById() { return elStub(); }, createElement: elStub, body: elStub() },
    navigator: { userAgent: 'node' }, location: { protocol: 'http:', origin: 'http://localhost' },
  }, extra || {});
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  const errors = [];
  files.forEach((f) => {
    try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); }
    catch (e) { errors.push(f + ': ' + e.message); }
  });
  return { ctx, errors };
}

// Script list in the same order as index.html (local scripts only).
function indexScripts() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  return Array.from(html.matchAll(/<script src="([^"]+)"/g)).map((m) => m[1]).filter((s) => !/^https?:/.test(s));
}

// ---------- fake Firebase SDK (served instead of the gstatic CDN) ----------
// opts: { user: {uid,email}|null, data: {...rtdb tree}, authDelay, failCreate }
function fakeFirebaseSource(opts) {
  const o = Object.assign({ user: null, data: {}, authDelay: 300, failUserReads: 0 }, opts || {});
  return `(function(){
  const data = ${JSON.stringify(o.data)};
  window.__fakeDb = data; window.__writes = []; window.__resetCalls = [];
  window.__failUserReads = ${o.failUserReads};
  const parts = (p) => String(p || '').split('/').filter(Boolean);
  const get = (p) => parts(p).reduce((x, k) => (x == null ? undefined : x[k]), data);
  const put = (p, v) => { const ks = parts(p); if (!ks.length) return; let x = data; ks.slice(0, -1).forEach((k) => { if (typeof x[k] !== 'object' || x[k] === null) x[k] = {}; x = x[k]; }); if (v === null || v === undefined) delete x[ks[ks.length - 1]]; else x[ks[ks.length - 1]] = JSON.parse(JSON.stringify(v)); };
  let pushN = 0;
  const ref = (p) => ({
    key: parts(p).slice(-1)[0] || null,
    once: () => {
      // Simulate a flaky network: the first N reads of a /users/<uid> row fail.
      if (String(p).indexOf('users/') === 0 && String(p).split('/').length === 2 && window.__failUserReads > 0) { window.__failUserReads -= 1; return Promise.reject(new Error('Database read timed out after 8000ms')); }
      return Promise.resolve({ val: () => { const v = get(p); return v === undefined ? null : JSON.parse(JSON.stringify(v)); }, exists: () => get(p) !== undefined });
    },
    set: (v) => { window.__writes.push(['set', p, v]); put(p, v); return Promise.resolve(); },
    update: (u) => { window.__writes.push(['update', p || '/', u]); Object.keys(u).forEach((k) => put((p ? p + '/' : '') + k, u[k])); return Promise.resolve(); },
    remove: () => { window.__writes.push(['remove', p]); put(p, null); return Promise.resolve(); },
    push: (v) => { const k = 'push' + (++pushN) + Date.now(); const full = (p ? p + '/' : '') + k; if (v !== undefined) put(full, v); window.__writes.push(['push', full, v]); const r = ref(full); r.key = k; r.then = (ok, bad) => Promise.resolve({ key: k }).then(ok, bad); return r; },
    on: () => {}, off: () => {},
  });
  let user = ${JSON.stringify(o.user)};
  const listeners = [];
  const auth = {
    get currentUser() { return user; },
    setPersistence: () => Promise.resolve(),
    onAuthStateChanged: (cb) => { listeners.push(cb); setTimeout(() => cb(user), ${o.authDelay}); return () => {}; },
    signInWithEmailAndPassword: (e, pw) => { if (pw === 'wrongpass') return Promise.reject({ code: 'auth/invalid-credential', message: 'bad' }); user = { uid: 'u_' + e.replace(/\\W/g, ''), email: e }; listeners.forEach((f) => f(user)); return Promise.resolve({ user }); },
    createUserWithEmailAndPassword: (e) => { if (${!!o.failCreate}) return Promise.reject({ code: 'auth/email-already-in-use', message: 'in use' }); user = { uid: 'u_' + e.replace(/\\W/g, ''), email: e }; setTimeout(() => listeners.forEach((f) => f(user)), 10); return Promise.resolve({ user }); },
    signOut: () => { user = null; listeners.forEach((f) => f(null)); return Promise.resolve(); },
    sendPasswordResetEmail: (e, s) => { window.__resetCalls.push([e, s || null, auth.languageCode || null]); return Promise.resolve(); },
    languageCode: null,
  };
  window.firebase = {
    initializeApp: () => ({}),
    auth: Object.assign(() => auth, { Auth: { Persistence: { LOCAL: 'local' } } }),
    database: Object.assign(() => ({ ref }), { ServerValue: { TIMESTAMP: Date.now() } }),
  };
})();`;
}

// Wrap I18N.t as soon as i18n.js defines it, recording keys with no translation.
const I18N_SPY = `(() => {
  window.__missingKeys = new Set();
  let real;
  Object.defineProperty(window, 'I18N', {
    configurable: true,
    get() { return real; },
    set(v) {
      const t0 = v.t;
      v.t = function (k) { const r = t0(k); if (r === k && typeof k === 'string' && k.indexOf('.') > 0) window.__missingKeys.add(k); return r; };
      real = v;
    },
  });
})();`;

function summary() {
  const byArea = {};
  results.forEach((r) => {
    const a = byArea[r.area] = byArea[r.area] || { pass: 0, fail: 0 };
    if (r.ok) a.pass += 1; else a.fail += 1;
  });
  return { byArea, failures: results.filter((r) => !r.ok), total: results.length, failed: results.filter((r) => !r.ok).length };
}

module.exports = { ROOT, area, check, safe, startServer, loadModules, indexScripts, fakeFirebaseSource, I18N_SPY, summary, results };
