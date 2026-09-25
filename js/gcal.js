(function (global) {
  'use strict';

  // Google Calendar sync for the teacher (one-way: app → Calendar).
  //
  // Runs entirely in the browser: Google Identity Services hands us an
  // OAuth access token, and we call the Calendar REST API with fetch().
  // No backend needed because every fact we push (class schedules,
  // attendance, payments) only ever changes while the teacher is using
  // the app — so syncing right after each write is complete.
  //
  // What lands on the calendar "Vocab Quest — Lớp học":
  //   1. CLASS events — one weekly recurring event per (student|group, weekday),
  //      detailed per slot, popup reminder 15 min before.
  //   2. TUITION DIGEST — one short event per DAY at the digest time (default
  //      08:00) that lists every student who should pay that day: they have a
  //      class that day and their (projected) remaining sessions are ≤ 2.
  //      Days with nobody due get no event. Horizon: 14 days ahead.
  //
  // Event ids are deterministic (hex of a stable key) so re-syncing updates
  // in place instead of duplicating, and stale events are deleted.
  //
  // Setup (teacher, once): see docs/GOOGLE-CALENDAR.md, then paste the
  // OAuth Client ID into GOOGLE_CALENDAR_CLIENT_ID in js/firebase-config.js.

  const CAL_NAME = 'Vocab Quest — Lớp học';
  // Narrow scope: create secondary calendars and manage events ONLY on
  // calendars this app created. Never touches the teacher's own calendars.
  // If Google ever rejects it for your project, fall back to
  // 'https://www.googleapis.com/auth/calendar'.
  const SCOPE = 'https://www.googleapis.com/auth/calendar.app.created';
  const API = 'https://www.googleapis.com/calendar/v3';
  const DIGEST_HORIZON_DAYS = 14;
  const DUE_THRESHOLD = 2;
  const CLASS_REMIND_MIN = 15;
  const DEFAULT_DURATION = 60;
  const DEFAULT_DIGEST_TIME = '08:00';
  const LS_CONNECTED = 'vlt_gcal_connected';
  const LS_CAL_ID = 'vlt_gcal_calendar_id';
  const SS_TOKEN = 'vlt_gcal_token';

  const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const BYDAY = { mon: 'MO', tue: 'TU', wed: 'WE', thu: 'TH', fri: 'FR', sat: 'SA', sun: 'SU' };

  // ---------- small utils ----------

  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function localIso(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
      + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':00';
  }
  function tz() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh'; } catch (e) { return 'Asia/Ho_Chi_Minh'; }
  }
  function parseHm(s, fallback) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim());
    if (!m) return fallback;
    return { h: Math.min(23, +m[1]), m: Math.min(59, +m[2]) };
  }
  // Google event ids must be base32hex (a-v, 0-9), 5..1024 chars. Hex is a subset.
  function hexId(prefix, key) {
    let out = '';
    const bytes = new TextEncoder().encode(key);
    for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
    return 'vq' + prefix + out;
  }
  // Cheap stable hash of the parts of an event we care about → skip PATCH when unchanged.
  function fingerprint(ev) {
    const s = JSON.stringify([ev.summary, ev.description, ev.start, ev.end, ev.recurrence, ev.reminders, ev.colorId]);
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }
  function nextDateForDay(dayKey, from) {
    const want = DAY_KEYS.indexOf(dayKey);
    const d = new Date(from); d.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      if (d.getDay() === want) return d;
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  // ---------- desired state (pure; unit-testable) ----------
  //
  // opts = { students, billing, groups, lang, digestTime, today(Date) }
  // returns Map<id, eventBody>

  function classEvents(o, out) {
    const lang = o.lang === 'en' ? 'en' : 'vi';
    const today = o.today || new Date();
    const zone = tz();
    const nameOf = (s) => (s.profile && s.profile.name) || s.id;

    const slot = (id, summary, description, dayKey, time, duration, colorId) => {
      const first = nextDateForDay(dayKey, today);
      const hm = parseHm(time, null);
      const ev = {
        summary,
        description,
        recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=' + BYDAY[dayKey]],
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: CLASS_REMIND_MIN }] },
        colorId,
        extendedProperties: { private: { vq: 'class' } },
      };
      if (hm) {
        const start = new Date(first); start.setHours(hm.h, hm.m, 0, 0);
        const end = new Date(start.getTime() + (duration || DEFAULT_DURATION) * 60000);
        ev.start = { dateTime: localIso(start), timeZone: zone };
        ev.end = { dateTime: localIso(end), timeZone: zone };
      } else {
        // No time set yet → all-day placeholder so the day is still visible.
        const next = new Date(first); next.setDate(next.getDate() + 1);
        ev.start = { date: ymd(first) };
        ev.end = { date: ymd(next) };
      }
      out.set(id, ev);
    };

    // 1-1 students
    o.students.forEach((s) => {
      const b = o.billing[s.id];
      if (!b || !b.plan || b.plan.type === 'group') return;
      const sch = b.schedule || {};
      Object.keys(sch).forEach((dayKey) => {
        if (!BYDAY[dayKey]) return;
        slot(
          hexId('c', s.id + '|' + dayKey),
          '📚 ' + nameOf(s) + ' · 1-1',
          (lang === 'en' ? 'One-to-one class · Vocab Quest' : 'Lớp 1-1 · Vocab Quest'),
          dayKey, sch[dayKey], b.plan.duration, '9',
        );
      });
    });

    // groups
    Object.entries(o.groups || {}).forEach(([gid, g]) => {
      const sch = g.schedule || {};
      const memberNames = Object.keys(g.members || {})
        .map((uid) => o.students.find((s) => s.id === uid)).filter(Boolean).map(nameOf);
      const desc = (lang === 'en' ? 'Group class · Members: ' : 'Lớp nhóm · Thành viên: ')
        + (memberNames.join(', ') || '—') + '\nVocab Quest';
      Object.keys(sch).forEach((dayKey) => {
        if (!BYDAY[dayKey]) return;
        slot(hexId('g', gid + '|' + dayKey), '👥 ' + (g.name || 'Nhóm'), desc, dayKey, sch[dayKey], g.duration, '10');
      });
    });
  }

  // Per-student: class days + remaining. Projection: each scheduled class
  // day strictly between today and D is assumed attended (counted).
  function tuitionDigests(o, out) {
    const lang = o.lang === 'en' ? 'en' : 'vi';
    const today = o.today || new Date();
    const zone = tz();
    const nameOf = (s) => (s.profile && s.profile.name) || s.id;
    const hm = parseHm(o.digestTime, parseHm(DEFAULT_DIGEST_TIME));

    const rows = [];
    o.students.forEach((s) => {
      const b = o.billing[s.id];
      if (!b || !b.plan) return;
      const paid = Billing.paidSessions(b);
      if (paid === 0) return;
      const ep = Billing.effectivePlan(b, o.groups);
      const sch = (ep && ep.schedule) || {};
      const days = Object.keys(sch).filter((k) => BYDAY[k]);
      if (!days.length) return; // no fixed schedule → in-app list only, never a daily digest
      rows.push({ s, ep, sch, days, remaining: Billing.remaining(b), attendance: b.attendance || {} });
    });
    if (!rows.length) return;

    for (let i = 0; i < DIGEST_HORIZON_DAYS; i++) {
      const D = new Date(today); D.setHours(0, 0, 0, 0); D.setDate(D.getDate() + i);
      const dayKey = DAY_KEYS[D.getDay()];
      const dateStr = ymd(D);
      const due = [];
      rows.forEach((r) => {
        if (r.sch[dayKey] === undefined) return;
        // Project remaining down to the morning of D: every scheduled class
        // day from today up to (not including) D that isn't marked yet is
        // assumed attended. Already-marked days are in `remaining` already.
        let used = 0;
        for (let j = 0; j < i; j++) {
          const X = new Date(today); X.setHours(0, 0, 0, 0); X.setDate(X.getDate() + j);
          if (r.sch[DAY_KEYS[X.getDay()]] !== undefined && !r.attendance[ymd(X)]) used += 1;
        }
        const projected = r.remaining - used;
        if (projected > DUE_THRESHOLD) return;
        due.push({ r, projected });
      });
      if (!due.length) continue;
      due.sort((a, b) => a.projected - b.projected);

      const line = (x) => {
        const time = x.r.sch[dayKey] ? ' · ' + x.r.sch[dayKey] : '';
        const where = x.r.ep.type === 'group' ? (x.r.ep.groupName || (lang === 'en' ? 'group' : 'nhóm')) : '1-1';
        const left = x.projected <= 0
          ? (lang === 'en' ? 'package used up' + (x.projected < 0 ? ' (' + x.projected + ')' : '') : 'hết gói' + (x.projected < 0 ? ' (' + x.projected + ')' : ''))
          : (lang === 'en' ? x.projected + ' session(s) left' : 'còn ' + x.projected + ' buổi');
        const amount = x.r.ep.ratePerSession && x.r.ep.packageSize
          ? ' · ' + Billing.fmtVnd(x.r.ep.ratePerSession * x.r.ep.packageSize) + (lang === 'en' ? ' / package' : ' / gói') : '';
        return '• ' + nameOf(x.r.s) + ' — ' + left + ' · ' + where + time + amount;
      };
      const names = due.map((x) => nameOf(x.r.s));
      const shown = names.slice(0, 3).join(', ') + (names.length > 3 ? ' +' + (names.length - 3) : '');
      const start = new Date(D); start.setHours(hm.h, hm.m, 0, 0);
      const end = new Date(start.getTime() + 15 * 60000);
      out.set(hexId('t', dateStr), {
        summary: (lang === 'en' ? '💰 Collect tuition today: ' : '💰 Thu học phí hôm nay: ') + shown,
        description: (lang === 'en' ? 'Students to collect from today:\n' : 'Học viên cần thu học phí hôm nay:\n')
          + due.map(line).join('\n') + '\n\nVocab Quest · ' + (lang === 'en' ? 'auto-updated after each attendance/payment' : 'tự cập nhật sau mỗi lần điểm danh/đóng tiền'),
        start: { dateTime: localIso(start), timeZone: zone },
        end: { dateTime: localIso(end), timeZone: zone },
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 0 }, { method: 'email', minutes: 0 }] },
        colorId: '11',
        extendedProperties: { private: { vq: 'tuition' } },
      });
    }
  }

  function buildDesired(o) {
    const out = new Map();
    classEvents(o, out);
    tuitionDigests(o, out);
    out.forEach((ev) => { ev.extendedProperties.private.fp = fingerprint(ev); });
    return out;
  }

  // ---------- auth (Google Identity Services) ----------

  let tokenClient = null;
  let token = null; // { access_token, expiresAt }

  function clientId() { return (global.GOOGLE_CALENDAR_CLIENT_ID || '').trim(); }
  function configured() { return !!clientId(); }
  function gisReady() { return !!(global.google && global.google.accounts && global.google.accounts.oauth2); }
  function isConnected() { try { return localStorage.getItem(LS_CONNECTED) === '1'; } catch (e) { return false; } }

  function loadToken() {
    if (token) return token;
    try {
      const raw = sessionStorage.getItem(SS_TOKEN);
      if (raw) token = JSON.parse(raw);
    } catch (e) { token = null; }
    return token;
  }
  function storeToken(t) {
    token = t;
    try { if (t) sessionStorage.setItem(SS_TOKEN, JSON.stringify(t)); else sessionStorage.removeItem(SS_TOKEN); } catch (e) {}
  }
  function validToken() {
    const t = loadToken();
    return t && t.expiresAt - 60000 > Date.now() ? t.access_token : null;
  }

  function waitForGis(ms) {
    return new Promise((resolve) => {
      const t0 = Date.now();
      (function tick() {
        if (gisReady()) return resolve(true);
        if (Date.now() - t0 > (ms || 6000)) return resolve(false);
        setTimeout(tick, 150);
      })();
    });
  }

  // interactive=false → silent attempt ('' prompt): works when the teacher
  // already consented and is signed in to Google in this browser.
  async function getAccessToken(interactive) {
    const cached = validToken();
    if (cached) return cached;
    if (!configured()) throw new Error('GCAL_NOT_CONFIGURED');
    if (!(await waitForGis())) throw new Error('GCAL_GIS_UNAVAILABLE');
    return new Promise((resolve, reject) => {
      let settled = false;
      const done = (fn, v) => { if (!settled) { settled = true; fn(v); } };
      tokenClient = global.google.accounts.oauth2.initTokenClient({
        client_id: clientId(),
        scope: SCOPE,
        callback: (resp) => {
          if (resp && resp.access_token) {
            storeToken({ access_token: resp.access_token, expiresAt: Date.now() + ((resp.expires_in || 3600) * 1000) });
            done(resolve, resp.access_token);
          } else done(reject, new Error((resp && resp.error) || 'GCAL_TOKEN_FAILED'));
        },
        error_callback: (err) => done(reject, new Error((err && (err.type || err.message)) || 'GCAL_TOKEN_FAILED')),
      });
      const hint = (typeof FirebaseSync !== 'undefined' && FirebaseSync.getCurrentUser() || {}).email;
      // interactive: let Google decide (account chooser / consent only when needed);
      // silent: '' = never show UI, fail instead.
      const req = interactive ? {} : { prompt: '' };
      if (hint) req.hint = hint;
      try { tokenClient.requestAccessToken(req); } catch (e) { done(reject, e); }
      // Silent attempts that need user interaction never call back in some
      // browsers — give up after a while so the caller can offer a button.
      if (!interactive) setTimeout(() => done(reject, new Error('GCAL_NEEDS_INTERACTION')), 8000);
    });
  }

  // ---------- REST ----------

  // Thin fetch wrapper. 401 → token revoked server-side; drop it so the next
  // attempt re-authenticates instead of failing forever.
  async function api(method, path, body, tokenStr) {
    const res = await fetch(API + path, {
      method,
      headers: Object.assign({ Authorization: 'Bearer ' + tokenStr }, body ? { 'Content-Type': 'application/json' } : {}),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return null;
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok) {
      if (res.status === 401) storeToken(null);
      const err = new Error((data && data.error && data.error.message) || ('HTTP ' + res.status));
      err.status = res.status;
      throw err;
    }
    return data;
  }

  async function ensureCalendar(tokenStr, settings) {
    let id = (settings && settings.gcal && settings.gcal.calendarId) || null;
    if (!id) { try { id = localStorage.getItem(LS_CAL_ID); } catch (e) { id = null; } }
    if (id) {
      try {
        await api('GET', '/calendars/' + encodeURIComponent(id), null, tokenStr);
        return id;
      } catch (e) {
        if (e.status !== 404 && e.status !== 403) throw e;
        id = null; // teacher deleted it → recreate
      }
    }
    const created = await api('POST', '/calendars', { summary: CAL_NAME, timeZone: tz() }, tokenStr);
    id = created.id;
    try { localStorage.setItem(LS_CAL_ID, id); } catch (e) {}
    await persistGcalSettings({ calendarId: id });
    return id;
  }

  // Only events tagged by us (private extended property vq=class|tuition);
  // anything the teacher adds by hand to the calendar is left alone.
  async function listTagged(calId, tokenStr, tag, out) {
    let pageToken = null;
    do {
      const q = '?maxResults=2500&showDeleted=false&privateExtendedProperty=' + encodeURIComponent('vq=' + tag)
        + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
      const page = await api('GET', '/calendars/' + encodeURIComponent(calId) + '/events' + q, null, tokenStr);
      (page.items || []).forEach((ev) => out.set(ev.id, ev));
      pageToken = page.nextPageToken || null;
    } while (pageToken);
  }

  async function listOurEvents(calId, tokenStr) {
    const out = new Map();
    await listTagged(calId, tokenStr, 'class', out);
    await listTagged(calId, tokenStr, 'tuition', out);
    return out;
  }

  async function persistGcalSettings(patch) {
    if (typeof Billing === 'undefined' || !Billing.saveGcalSettings) return;
    try { await Billing.saveGcalSettings(patch); } catch (e) { /* offline/demo */ }
  }

  // A recurring class series keeps the start date it was first created with
  // (only weekday + time matter) so past occurrences stay on the calendar
  // instead of the series sliding forward on every sync.
  function anchorToExisting(body, cur) {
    if (!body.recurrence || !cur || !cur.start) return;
    const desiredTime = body.start.dateTime ? body.start.dateTime.slice(11, 16) : null;
    const curTime = cur.start.dateTime ? cur.start.dateTime.slice(11, 16) : null;
    const curDate = (cur.start.dateTime || cur.start.date || '').slice(0, 10);
    if (!curDate || desiredTime !== curTime) return; // time changed → let the series move
    const curDow = new Date(curDate + 'T12:00:00').getDay();
    const wantDow = new Date(body.start.dateTime ? body.start.dateTime.slice(0, 10) + 'T12:00:00' : body.start.date + 'T12:00:00').getDay();
    if (curDow !== wantDow) return;
    if (body.start.dateTime) {
      const dur = new Date(body.end.dateTime) - new Date(body.start.dateTime);
      const s = new Date(curDate + 'T' + desiredTime + ':00');
      body.start.dateTime = localIso(s);
      body.end.dateTime = localIso(new Date(s.getTime() + dur));
    } else {
      const s = new Date(curDate + 'T12:00:00');
      const e = new Date(s); e.setDate(e.getDate() + 1);
      body.start.date = ymd(s); body.end.date = ymd(e);
    }
    body.extendedProperties.private.fp = fingerprint(body);
  }

  // True when the failure just means "Google wants a click from the teacher".
  function isAuthError(e) {
    const code = (e && e.message) || '';
    return code === 'GCAL_NEEDS_INTERACTION'
      || /popup_failed_to_open|popup_closed|popup_blocked|access_denied|interaction_required|login_required|consent_required|invalid_grant/i.test(code)
      || e && e.status === 401;
  }

  // ---------- sync ----------

  let syncing = null;
  let lastResult = null;

  // ctx = { students, data:{billing,groups,settings}, lang }
  async function sync(ctx, opts) {
    if (syncing) return syncing;
    syncing = (async () => {
      const interactive = !!(opts && opts.interactive);
      const tokenStr = await getAccessToken(interactive);
      const settings = (ctx.data && ctx.data.settings) || {};
      const calId = await ensureCalendar(tokenStr, settings);
      const desired = buildDesired({
        students: ctx.students, billing: (ctx.data && ctx.data.billing) || {}, groups: (ctx.data && ctx.data.groups) || {},
        lang: ctx.lang, digestTime: (settings.gcal && settings.gcal.digestTime) || DEFAULT_DIGEST_TIME, today: new Date(),
      });
      const existing = await listOurEvents(calId, tokenStr);
      const base = '/calendars/' + encodeURIComponent(calId) + '/events';
      const stats = { inserted: 0, updated: 0, deleted: 0, unchanged: 0 };

      // upserts
      for (const [id, body] of desired) {
        const cur = existing.get(id);
        if (cur) {
          anchorToExisting(body, cur);
          const fp = cur.extendedProperties && cur.extendedProperties.private && cur.extendedProperties.private.fp;
          if (fp === body.extendedProperties.private.fp && cur.status !== 'cancelled') { stats.unchanged += 1; continue; }
          await api('PATCH', base + '/' + id, Object.assign({ status: 'confirmed' }, body), tokenStr);
          stats.updated += 1;
        } else {
          try {
            await api('POST', base, Object.assign({ id }, body), tokenStr);
            stats.inserted += 1;
          } catch (e) {
            // 409: id belongs to an event we deleted earlier (Google keeps
            // cancelled ids) → revive it in place.
            if (e.status === 409) {
              await api('PATCH', base + '/' + id, Object.assign({ status: 'confirmed' }, body), tokenStr);
              stats.updated += 1;
            } else throw e;
          }
        }
      }
      // deletes
      for (const [id] of existing) {
        if (desired.has(id)) continue;
        try { await api('DELETE', base + '/' + id, null, tokenStr); stats.deleted += 1; } catch (e) { if (e.status !== 404 && e.status !== 410) throw e; }
      }

      try { localStorage.setItem(LS_CONNECTED, '1'); } catch (e) {}
      const at = Date.now();
      await persistGcalSettings({ lastSyncAt: at, lastSyncCount: desired.size });
      lastResult = { at, count: desired.size, stats, calId };
      return lastResult;
    })();
    try { return await syncing; } finally { syncing = null; }
  }

  async function connect(ctx) {
    const r = await sync(ctx, { interactive: true });
    return r;
  }

  async function disconnect() {
    const t = validToken();
    if (t && gisReady()) { try { global.google.accounts.oauth2.revoke(t, () => {}); } catch (e) {} }
    storeToken(null);
    try { localStorage.removeItem(LS_CONNECTED); } catch (e) {}
    // Keep calendarId so a later reconnect reuses the same calendar.
  }

  // Debounced background sync after teacher writes (attendance, payment, …).
  let autoTimer = null;
  function autoSync(ctx, onResult) {
    if (!configured() || !isConnected()) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(async () => {
      try {
        const r = await sync(ctx, { interactive: false });
        if (onResult) onResult(null, r);
      } catch (e) { if (onResult) onResult(e, null); }
    }, 1500);
  }

  function status() {
    return { configured: configured(), connected: isConnected(), hasToken: !!validToken(), last: lastResult };
  }

  global.GCal = {
    CAL_NAME, SCOPE, DEFAULT_DIGEST_TIME, DEFAULT_DURATION, DUE_THRESHOLD, DIGEST_HORIZON_DAYS,
    configured, isConnected, status, buildDesired, sync, connect, disconnect, autoSync, isAuthError,
    _anchorToExisting: anchorToExisting, // exposed for tests
  };
})(typeof window !== 'undefined' ? window : globalThis);
