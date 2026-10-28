(function (global) {
  'use strict';

  // Account hygiene: email-typo detection, duplicate-account detection and
  // teacher-driven merging.
  //
  // Why duplicates happen: Firebase Auth never allows two Email/Password
  // accounts with the exact same email. "Duplicates" are the same student
  // signing up again with a DIFFERENT email — usually after mistyping the
  // first one (…@gmial.com, so the password-reset mail can never arrive)
  // or forgetting which address they used.
  //
  // Merge flow (teacher only, no Cloud Functions):
  //   /merges/{keepUid}/{oldUid} = { at, fromEmail, fromName, progress }
  //   • the teacher's roster hides every oldUid listed under /merges;
  //   • billing, attendance, group membership and feature flags are moved
  //     from oldUid to keepUid right away (teacher can write those nodes);
  //   • the student's own client merges `progress` into its row the next
  //     time it opens the app (only the student may write /users/{uid}).

  const POPULAR = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'yahoo.com.vn', 'live.com'];
  const KNOWN_OK = new Set(POPULAR.concat([
    'googlemail.com', 'mail.com', 'ymail.com', 'gmx.com', 'msn.com', 'me.com', 'mac.com', 'aol.com',
    'outlook.com.vn', 'hotmail.com.vn', 'proton.me', 'protonmail.com', 'zoho.com', 'yandex.com',
  ]));

  function lev(a, b) {
    const m = [];
    for (let j = 0; j <= b.length; j++) m[j] = j;
    for (let i = 1; i <= a.length; i++) {
      let prev = m[0];
      m[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const tmp = m[j];
        m[j] = Math.min(m[j] + 1, m[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = tmp;
      }
    }
    return m[b.length];
  }

  // 'abc@gmial.com' → 'abc@gmail.com'; null when the domain looks fine.
  // Providers with country domains (hotmail.fr, yahoo.co.uk) are valid;
  // only Gmail and iCloud exist solely on .com.
  const PROVIDERS = ['gmail', 'yahoo', 'hotmail', 'outlook', 'icloud', 'live'];
  const COM_ONLY = { gmail: true, icloud: true };
  const TLD_TYPOS = { con: 1, cmo: 1, comm: 1, cm: 1, om: 1, vom: 1, xom: 1, co: 1, c: 1, cpm: 1, coom: 1 };
  function suggestEmail(email) {
    const e = String(email || '').trim().toLowerCase();
    const at = e.lastIndexOf('@');
    if (at < 1) return null;
    const local = e.slice(0, at);
    const dom = e.slice(at + 1);
    if (!dom || KNOWN_OK.has(dom) || /\.(edu|gov|ac|org)(\.[a-z]{2})?$/.test(dom)) return null;
    const dot = dom.indexOf('.');
    const label = dot < 0 ? dom : dom.slice(0, dot);
    const tld = dot < 0 ? '' : dom.slice(dot + 1);
    const tldOk = !!tld && !TLD_TYPOS[tld] && /^[a-z]{2,6}(\.[a-z]{2})?$/.test(tld);
    let provider = PROVIDERS.indexOf(label) >= 0 ? label : null;
    if (!provider && label.length >= 3) {
      let bd = 99;
      // Fuzzy only against long provider names: "live" would match real
      // domains like love.com / lime.com.
      PROVIDERS.filter((p) => p.length >= 5).forEach((p) => { const d = lev(label, p); if (d < bd) { bd = d; provider = p; } });
      if (bd > 2) provider = null;
    }
    if (!provider) return null;
    const fixedTld = COM_ONLY[provider] ? 'com' : (tldOk ? tld : 'com');
    const fixed = provider + '.' + fixedTld;
    return fixed === dom ? null : local + '@' + fixed;
  }

  // Same mailbox under different spellings: Gmail ignores dots and +tags,
  // and typo domains are mapped to what was meant.
  function canonicalEmail(email) {
    const fixed = suggestEmail(email) || String(email || '').trim().toLowerCase();
    const at = fixed.lastIndexOf('@');
    if (at < 1) return fixed;
    let local = fixed.slice(0, at);
    let dom = fixed.slice(at + 1);
    if (dom === 'googlemail.com') dom = 'gmail.com';
    if (dom === 'gmail.com') local = local.split('+')[0].replace(/\./g, '');
    return local + '@' + dom;
  }

  function normName(name) {
    return String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  const GENERIC_NAMES = new Set(['me', 'test', 'abc', 'hs', 'hoc sinh', 'student', 'user', 'a', 'b']);

  // → [{ members: [student…], reasons: ['email'|'name'] }], members sorted
  // most recently active first (the account the student uses now).
  function findDuplicates(students) {
    const parent = students.map((_, i) => i);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const reasons = {};
    const link = (i, j, why) => {
      const a = find(i); const b = find(j);
      if (a !== b) parent[a] = b;
      (reasons[i] = reasons[i] || new Set()).add(why);
      (reasons[j] = reasons[j] || new Set()).add(why);
    };
    const byEmail = {};
    const byName = {};
    students.forEach((s, i) => {
      const p = s.profile || {};
      if (p.email) {
        const k = canonicalEmail(p.email);
        if (byEmail[k] !== undefined) link(byEmail[k], i, 'email'); else byEmail[k] = i;
      }
      const n = normName(p.name);
      if (n.length >= 3 && !GENERIC_NAMES.has(n)) {
        if (byName[n] !== undefined) link(byName[n], i, 'name'); else byName[n] = i;
      }
    });
    const groups = {};
    students.forEach((s, i) => {
      if (!reasons[i]) return;
      const r = find(i);
      (groups[r] = groups[r] || { members: [], reasons: new Set() }).members.push(s);
      reasons[i].forEach((x) => groups[r].reasons.add(x));
    });
    return Object.values(groups)
      .filter((g) => g.members.length > 1)
      .map((g) => ({
        members: g.members.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
        reasons: Array.from(g.reasons),
      }));
  }

  // ---------- merge (teacher) ----------

  function clean(obj) {
    // RTDB rejects undefined; JSON round-trip drops it.
    return obj == null ? null : JSON.parse(JSON.stringify(obj));
  }

  async function mergeInto(keep, old) {
    if (typeof FirebaseSync === 'undefined' || !FirebaseSync.enabled()) throw new Error('offline');
    const db = FirebaseSync.getDb();
    const me = FirebaseSync.getCurrentUser();
    if (!db || !me) throw new Error('not-signed-in');
    if (keep.id === old.id) return;
    const at = Date.now();

    const [bOld, bKeep, gSnap, fOld, fKeep] = await Promise.all([
      db.ref('billing/' + old.id).once('value').then((s) => s.val()).catch(() => null),
      db.ref('billing/' + keep.id).once('value').then((s) => s.val()).catch(() => null),
      db.ref('groups').once('value').then((s) => s.val()).catch(() => null),
      db.ref('feature_flags/' + old.id).once('value').then((s) => s.val()).catch(() => null),
      db.ref('feature_flags/' + keep.id).once('value').then((s) => s.val()).catch(() => null),
    ]);

    // Everything in ONE multi-path update: either the old account is hidden
    // AND its tuition moved, or nothing changes (no half-merged state).
    const update = {};
    // 1) Progress hand-off + hide the old account.
    update['merges/' + keep.id + '/' + old.id] = clean({
      at,
      by: me.uid,
      fromEmail: (old.profile && old.profile.email) || '',
      fromName: (old.profile && old.profile.name) || '',
      progress: old.progress || null,
    });
    // 2) Tuition: union payments + attendance; the kept account's plan wins.
    if (bOld) {
      const merged = Object.assign({}, bOld, bKeep || {});
      merged.payments = Object.assign({}, bOld.payments || {}, (bKeep && bKeep.payments) || {});
      merged.attendance = Object.assign({}, bOld.attendance || {}, (bKeep && bKeep.attendance) || {});
      if (!(bKeep && bKeep.plan) && bOld.plan) merged.plan = bOld.plan;
      if (!(bKeep && bKeep.schedule) && bOld.schedule) merged.schedule = bOld.schedule;
      update['billing/' + keep.id] = clean(merged);
      update['billing/' + old.id] = null;
    }
    // 3) Group membership follows the kept account's (merged) plan.
    const keptPlan = (bKeep && bKeep.plan) || (bOld && bOld.plan) || null;
    Object.entries(gSnap || {}).forEach(([gid, g]) => {
      if (g && g.members && g.members[old.id]) {
        update['groups/' + gid + '/members/' + old.id] = null;
        if (keptPlan && keptPlan.type === 'group' && keptPlan.groupId === gid) update['groups/' + gid + '/members/' + keep.id] = true;
      }
    });
    // 4) Feature flags (e.g. interview access).
    if (fOld) {
      if (!fKeep) update['feature_flags/' + keep.id] = clean(fOld);
      update['feature_flags/' + old.id] = null;
    }
    await db.ref().update(update);
  }

  global.Accounts = { suggestEmail, canonicalEmail, normName, findDuplicates, mergeInto };
})(typeof window !== 'undefined' ? window : globalThis);
