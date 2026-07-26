(function (global) {
  'use strict';

  // Tuition (học phí) data layer.
  //
  //   /billing/{uid} = {
  //     plan: { type: '1v1'|'group', ratePerSession, packageSize, groupId? },
  //     schedule: { mon: '18:00', ... },        // prefill only, never auto-counts
  //     payments:   { pushId: { date, amount, sessions, note, ts } },
  //     attendance: { 'YYYY-MM-DD': { status, counted, ts } },  // 1 record/day
  //   }
  //   /groups/{gid} = { name, ratePerSession, packageSize, schedule, members: {uid:true} }
  //   /billing_settings = { countRules: { '1v1': {absent,excused}, group: {absent,excused} } }
  //
  // Prepaid model: remaining = sum(payments.sessions) - count(attendance where counted).
  // Whether an absence counts is decided AT MARKING TIME from the current
  // rules and frozen into the record — changing the rules later never
  // rewrites past billing.

  const DEFAULT_SETTINGS = {
    countRules: {
      '1v1': { present: true, absent: false, excused: false },
      group: { present: true, absent: true, excused: true },
    },
  };

  function db() {
    return (typeof FirebaseSync !== 'undefined' && FirebaseSync.enabled()) ? FirebaseSync.getDb() : null;
  }

  // ---------- reads ----------

  async function fetchAll() {
    const d = db();
    if (!d) return { billing: {}, groups: {}, settings: DEFAULT_SETTINGS };
    const [bSnap, gSnap, sSnap] = await Promise.all([
      d.ref('billing').once('value'),
      d.ref('groups').once('value'),
      d.ref('billing_settings').once('value'),
    ]);
    return {
      billing: bSnap.val() || {},
      groups: gSnap.val() || {},
      settings: normalizeSettings(sSnap.val()),
    };
  }

  async function fetchMine(uid) {
    const d = db();
    if (!d || !uid) return null;
    try {
      const snap = await d.ref('billing/' + uid).once('value');
      return snap.val();
    } catch (e) {
      return null; // rules may deny before teacher applies the update
    }
  }

  function normalizeSettings(s) {
    const out = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    if (s && s.countRules) {
      ['1v1', 'group'].forEach((k) => {
        if (s.countRules[k]) {
          ['absent', 'excused'].forEach((st) => {
            if (typeof s.countRules[k][st] === 'boolean') out.countRules[k][st] = s.countRules[k][st];
          });
        }
      });
    }
    return out;
  }

  // ---------- derived ----------

  function paidSessions(b) {
    let n = 0;
    Object.values((b && b.payments) || {}).forEach((p) => { n += p.sessions || 0; });
    return n;
  }

  function usedSessions(b) {
    let n = 0;
    Object.values((b && b.attendance) || {}).forEach((a) => { if (a.counted) n += 1; });
    return n;
  }

  function remaining(b) {
    return paidSessions(b) - usedSessions(b);
  }

  // Resolve rate/schedule for group members from the group node.
  function effectivePlan(b, groups) {
    const plan = (b && b.plan) || null;
    if (!plan) return null;
    if (plan.type === 'group' && plan.groupId && groups && groups[plan.groupId]) {
      const g = groups[plan.groupId];
      return {
        type: 'group',
        groupId: plan.groupId,
        groupName: g.name,
        ratePerSession: g.ratePerSession || 0,
        packageSize: g.packageSize || 8,
        schedule: g.schedule || {},
      };
    }
    return {
      type: '1v1',
      ratePerSession: plan.ratePerSession || 0,
      packageSize: plan.packageSize || 8,
      schedule: (b && b.schedule) || {},
    };
  }

  function shouldCount(status, planType, settings) {
    const rules = (settings || DEFAULT_SETTINGS).countRules[planType === 'group' ? 'group' : '1v1'];
    if (status === 'present') return true;
    if (status === 'absent') return !!rules.absent;
    if (status === 'excused') return !!rules.excused;
    return false;
  }

  // ---------- writes (teacher only; rules enforce) ----------

  async function saveStudentPlan(uid, plan, schedule) {
    const d = db();
    if (!d) throw new Error('offline');
    const update = { plan };
    if (schedule !== undefined) update.schedule = schedule;
    await d.ref('billing/' + uid).update(update);
  }

  async function addPayment(uid, payment) {
    const d = db();
    if (!d) throw new Error('offline');
    await d.ref('billing/' + uid + '/payments').push(Object.assign({ ts: Date.now() }, payment));
  }

  async function deletePayment(uid, paymentId) {
    const d = db();
    if (!d) throw new Error('offline');
    await d.ref('billing/' + uid + '/payments/' + paymentId).remove();
  }

  // One attendance record per student per date. Re-marking the same
  // status toggles it off; a different status overwrites.
  async function markAttendance(uid, date, status, planType, settings) {
    const d = db();
    if (!d) throw new Error('offline');
    const ref = d.ref('billing/' + uid + '/attendance/' + date);
    const existing = (await ref.once('value')).val();
    if (existing && existing.status === status) {
      await ref.remove();
      return null;
    }
    const record = { status, counted: shouldCount(status, planType, settings), ts: Date.now() };
    await ref.set(record);
    return record;
  }

  async function saveGroup(gid, data) {
    const d = db();
    if (!d) throw new Error('offline');
    if (!gid) {
      const ref = d.ref('groups').push(data);
      return ref.key;
    }
    await d.ref('groups/' + gid).set(data);
    return gid;
  }

  async function deleteGroup(gid) {
    const d = db();
    if (!d) throw new Error('offline');
    await d.ref('groups/' + gid).remove();
  }

  async function saveSettings(settings) {
    const d = db();
    if (!d) throw new Error('offline');
    await d.ref('billing_settings').set(normalizeSettings(settings));
  }

  // ---------- misc helpers ----------

  function fmtVnd(n) {
    return (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
  }

  const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const DAY_LABELS = { vi: { mon: 'T2', tue: 'T3', wed: 'T4', thu: 'T5', fri: 'T6', sat: 'T7', sun: 'CN' },
                       en: { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' } };

  function dayKeyOf(dateStr) {
    return DAY_KEYS[new Date(dateStr + 'T12:00:00').getDay()];
  }

  function scheduleLabel(schedule, lang) {
    const L = DAY_LABELS[lang === 'en' ? 'en' : 'vi'];
    const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    return order.filter((k) => schedule && schedule[k] !== undefined)
      .map((k) => L[k] + (schedule[k] ? ' ' + schedule[k] : ''))
      .join(', ');
  }

  global.Billing = {
    DEFAULT_SETTINGS,
    fetchAll,
    fetchMine,
    paidSessions,
    usedSessions,
    remaining,
    effectivePlan,
    shouldCount,
    saveStudentPlan,
    addPayment,
    deletePayment,
    markAttendance,
    saveGroup,
    deleteGroup,
    saveSettings,
    normalizeSettings,
    fmtVnd,
    dayKeyOf,
    scheduleLabel,
    DAY_LABELS,
  };
})(window);
