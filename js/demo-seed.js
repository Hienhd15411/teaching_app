(function (global) {
  'use strict';

  // Demo-account seeding for sales demos.
  //
  // When an email listed in DEMO_ACCOUNTS (js/firebase-config.js) signs in
  // and its progress is still empty, this module fabricates ~2 weeks of
  // realistic study history so every screen (Tiến độ, chủ đề, TOEIC, huy
  // hiệu) looks lived-in instead of blank. Real accounts are never touched:
  // the seed only runs for listed emails AND only when xp === 0.

  const SEED_TOPICS = [
    { id: 'intro_people', sessions: 6 },
    { id: 'food_restaurants', sessions: 5 },
    { id: 'office_jobs', sessions: 4 },
    { id: 'travel_hotels', sessions: 3 },
    { id: 'business_actions', sessions: 3 },
    { id: 'toeic_2023_part1', sessions: 5 },
    { id: 'toeic_2023_part5', sessions: 4 },
  ];
  const MODES = ['flashcard', 'quiz', 'typing', 'matching', 'flashcard', 'quiz'];

  function wordsFor(topicId) {
    if (global.VOCAB && global.VOCAB[topicId]) return global.VOCAB[topicId];
    const m = /^toeic_([^_]+)_(.+)$/.exec(topicId);
    if (m && typeof global.TOEIC !== 'undefined') {
      return global.TOEIC.allWordsInPart(m[1], m[2]);
    }
    return [];
  }

  function ymd(d) {
    return d.toISOString().slice(0, 10);
  }

  function buildSeed() {
    const p = Storage.emptyProgress();
    const now = Date.now();
    const day = 86400000;

    // Spread sessions over the last 14 days, skipping day-3 and day-9 so
    // the history chart looks human, ending with a 4-day streak.
    const activeDayOffsets = [13, 12, 11, 10, 8, 7, 6, 5, 4, 3, 2, 1];
    let sessionSlots = [];
    SEED_TOPICS.forEach((t) => {
      for (let i = 0; i < t.sessions; i++) sessionSlots.push(t.id);
    });
    // Deterministic shuffle-ish interleave so topics mix across days.
    sessionSlots = sessionSlots
      .map((id, i) => ({ id, k: (i * 7919) % sessionSlots.length }))
      .sort((a, b) => a.k - b.k)
      .map((x) => x.id);

    sessionSlots.forEach((topicId, i) => {
      const offset = activeDayOffsets[i % activeDayOffsets.length];
      const ts = now - offset * day + (i % 5) * 3600000;
      const d = new Date(ts);
      const correct = 6 + ((i * 3) % 5);          // 6..10
      const wrong = 10 - correct;
      const xp = correct * 10 + (correct >= 8 ? 25 : 0);
      const mode = MODES[i % MODES.length];

      p.history.push({ date: ymd(d), ts, mode, topic: topicId, correct, wrong, xp });
      p.xp += xp;

      const t = p.perTopic[topicId] || { attempts: 0, correct: 0, wrong: 0, lastPlayedAt: 0 };
      t.attempts += 1;
      t.correct += correct;
      t.wrong += wrong;
      if (ts > t.lastPlayedAt) t.lastPlayedAt = ts;
      p.perTopic[topicId] = t;
    });
    p.history.sort((a, b) => a.ts - b.ts);

    // Per-word boxes: first ~18 words of each topic in a believable spread —
    // early words mastered, recent ones still climbing.
    SEED_TOPICS.forEach((seedTopic, ti) => {
      const words = wordsFor(seedTopic.id).slice(0, 18);
      words.forEach((w, wi) => {
        const box = wi < 6 ? 5 : wi < 10 ? 4 : wi < 14 ? 3 : (wi % 2) + 1;
        p.perWord[seedTopic.id + '::' + w.en.toLowerCase()] = {
          box,
          correct: box + (wi % 3),
          wrong: box >= 4 ? 0 : (wi % 2) + 1,
          lastReviewed: now - ((wi + ti) % 10) * day,
        };
      });
    });

    p.streak = 4;
    p.lastActiveDate = ymd(new Date(now - day)); // yesterday → first demo play extends the streak
    p.badges = ['firstWord', 'words100', 'streak3', 'flashcardFirst', 'quizFirst', 'matchingFirst'];
    p.level = Progress.computeLevel(p.xp).level;
    return p;
  }

  function isDemoUser(user) {
    if (!user || !user.email) return false;
    const list = (global.DEMO_ACCOUNTS || []).map((e) => String(e).toLowerCase().trim());
    return list.indexOf(user.email.toLowerCase()) >= 0;
  }

  // Called from app.js right after sign-in, before cloud hydration.
  function maybeSeed(user) {
    if (!isDemoUser(user)) return;
    try {
      // Friendly display identity for the demo profile.
      const profiles = Storage.getProfiles();
      const prof = profiles.find((x) => x.id === user.uid);
      if (prof && (!prof.name || prof.name === 'demo' || prof.name.indexOf('@') >= 0 || prof.name === (user.email || '').split('@')[0])) {
        prof.name = 'Học viên Demo';
        prof.avatar = '🎓';
        localStorage.setItem('vlt_profiles', JSON.stringify(profiles));
      }
      const progress = Storage.getProgress(user.uid);
      if ((progress.xp || 0) > 0) return; // already seeded (or really played)
      const seed = buildSeed();
      Storage.saveProgress(seed, user.uid); // also schedules cloud push
      console.log('[DemoSeed] seeded demo progress:', seed.xp + ' XP, ' + seed.history.length + ' sessions');
    } catch (e) {
      console.warn('[DemoSeed] seeding failed', e);
    }
  }

  // ---- Fabricated class roster for the teacher-dashboard demo ----
  //
  // Shaped exactly like FirebaseSync.listAllStudents() output so
  // renderClass/paintList/exportClassCsv work unchanged. Numbers are
  // varied on purpose: a couple of stars, a mid pack, one struggling
  // student and one inactive — the spread a prospect expects to manage.
  // Each student carries per-topic rollups tuned so the coaching insights
  // ("Cần quan tâm", accuracy column, weak-topic drill-down) have a story
  // to tell: stars, a mid pack, one low-accuracy student (Đức Anh 43% on
  // TOEIC Part 1 — the sales-pitch example), one fading, one inactive.
  const DEMO_STUDENTS = [
    { name: 'Minh Anh',   avatar: '🦊', level: 8, xp: 6420, streak: 12, seen: 210, mastered: 150, daysAgo: 0,
      topics: [{ id: 'toeic_2023_part1', acc: 88, att: 12 }, { id: 'office_jobs', acc: 90, att: 8 }, { id: 'intro_people', acc: 92, att: 6 }] },
    { name: 'Bảo Ngọc',   avatar: '🐰', level: 7, xp: 5310, streak: 9,  seen: 185, mastered: 122, daysAgo: 0,
      topics: [{ id: 'toeic_2023_part5', acc: 82, att: 10 }, { id: 'food_restaurants', acc: 86, att: 7 }] },
    { name: 'Tuấn Kiệt',  avatar: '🐯', level: 6, xp: 4150, streak: 5,  seen: 160, mastered: 96,  daysAgo: 1,
      topics: [{ id: 'toeic_2023_part1', acc: 78, att: 9 }, { id: 'travel_hotels', acc: 74, att: 5 }] },
    { name: 'Khánh Linh', avatar: '🐱', level: 5, xp: 3240, streak: 4,  seen: 130, mastered: 71,  daysAgo: 1,
      topics: [{ id: 'business_actions', acc: 76, att: 6 }, { id: 'meetings_phone', acc: 81, att: 4 }] },
    { name: 'Gia Hân',    avatar: '🐼', level: 5, xp: 2980, streak: 3,  seen: 118, mastered: 64,  daysAgo: 2,
      topics: [{ id: 'toeic_2023_part5', acc: 71, att: 7 }, { id: 'shopping_money', acc: 79, att: 4 }] },
    { name: 'Quang Huy',  avatar: '🦁', level: 4, xp: 2210, streak: 2,  seen: 95,  mastered: 41,  daysAgo: 2,
      topics: [{ id: 'toeic_2023_part1', acc: 62, att: 8 }, { id: 'intro_people', acc: 75, att: 3 }] },
    { name: 'Thu Hà',     avatar: '🐨', level: 4, xp: 1980, streak: 0,  seen: 88,  mastered: 35,  daysAgo: 4,
      topics: [{ id: 'food_restaurants', acc: 72, att: 6 }, { id: 'toeic_2024_part3', acc: 68, att: 3 }] },
    { name: 'Đức Anh',    avatar: '🐸', level: 3, xp: 1320, streak: 0,  seen: 60,  mastered: 18,  daysAgo: 5,
      topics: [{ id: 'toeic_2023_part1', acc: 43, att: 9 }, { id: 'office_jobs', acc: 58, att: 4 }] },
    { name: 'Mai Phương', avatar: '🐣', level: 2, xp: 640,  streak: 0,  seen: 34,  mastered: 6,   daysAgo: 8,
      topics: [{ id: 'intro_people', acc: 64, att: 4 }] },
    { name: 'Hoàng Nam',  avatar: '🐢', level: 1, xp: 180,  streak: 0,  seen: 12,  mastered: 1,   daysAgo: 12,
      topics: [{ id: 'intro_people', acc: 70, att: 2 }] },
  ];

  const ROSTER_WORD_TOPICS = ['intro_people', 'food_restaurants', 'office_jobs', 'travel_hotels', 'toeic_2023_part1', 'toeic_2023_part5'];

  function listDemoStudents() {
    const now = Date.now();
    const day = 86400000;
    return DEMO_STUDENTS.map((s, i) => {
      // perWord over real vocabulary so stuck-word pills show real words.
      // Weak students (low first-topic accuracy) get repeat-miss words.
      const struggling = s.topics[0].acc < 65;
      const perWord = {};
      for (let w = 0; w < s.seen; w++) {
        const topicId = ROSTER_WORD_TOPICS[w % ROSTER_WORD_TOPICS.length];
        const list = wordsFor(topicId);
        const word = list[Math.floor(w / ROSTER_WORD_TOPICS.length) % (list.length || 1)];
        if (!word) continue;
        const isMastered = w < s.mastered;
        perWord[topicId + '::' + word.en.toLowerCase()] = {
          box: isMastered ? 4 + (w % 2) : (w % 2) + 1,
          correct: 2 + (w % 4),
          wrong: isMastered ? 0 : (struggling && w % 3 === 0 ? 2 + (w % 2) : w % 2),
          lastReviewed: now - (w % 10) * day,
        };
      }

      // perTopic rollups from the accuracy spec.
      const perTopic = {};
      const history = [];
      s.topics.forEach((tp, ti) => {
        const total = tp.att * 10;
        const correct = Math.round(total * tp.acc / 100);
        perTopic[tp.id] = {
          attempts: tp.att,
          correct,
          wrong: total - correct,
          lastPlayedAt: now - (s.daysAgo + ti) * day,
        };
        // A few history rows per topic so the 14-day chart has bars.
        const sessions = Math.min(tp.att, 4);
        for (let k = 0; k < sessions; k++) {
          const ts = now - (s.daysAgo + ti + k * 2) * day + k * 3600000;
          const c = Math.max(1, Math.round(10 * tp.acc / 100) - (k % 2));
          history.push({
            date: ymd(new Date(ts)),
            ts,
            mode: MODES[(i + k) % MODES.length],
            topic: tp.id,
            correct: c,
            wrong: 10 - c,
            xp: c * 10,
          });
        }
      });
      history.sort((a, b) => a.ts - b.ts);

      return {
        id: 'demo-student-' + (i + 1),
        profile: {
          id: 'demo-student-' + (i + 1),
          name: s.name,
          email: 'hocvien' + String(i + 1).padStart(2, '0') + '@lopdemo.vn',
          avatar: s.avatar,
          // Staggered signup dates; the last two are fresh (<14d) so the
          // 🆕 badge shows in the tuition "unconfigured" list.
          createdAt: now - [90, 80, 70, 60, 50, 40, 30, 21, 6, 3][i] * day,
        },
        progress: {
          level: s.level,
          xp: s.xp,
          streak: s.streak,
          perWord,
          perTopic,
          history,
          badges: [],
        },
        updatedAt: now - s.daysAgo * day,
      };
    });
  }

  // ---- Fabricated tuition state for the billing/attendance demo ----
  //
  // Mirrors the /billing + /groups + /billing_settings shape and exposes a
  // Billing-compatible api that mutates it in memory, so a prospect can
  // click through điểm danh / đóng tiền and see live updates without ever
  // touching Firebase.
  let demoBillingState = null;

  function buildDemoBilling() {
    const now = Date.now();
    const day = 86400000;
    const d = (offset) => ymd(new Date(now - offset * day));

    function attendanceLog(count, startOffset, everyDays, counted) {
      const out = {};
      for (let i = 0; i < count; i++) {
        out[d(startOffset + i * everyDays)] = { status: 'present', counted: counted !== false, ts: now - (startOffset + i * everyDays) * day };
      }
      return out;
    }
    function payments(list) {
      const out = {};
      list.forEach((p, i) => { out['pay' + i] = Object.assign({ ts: now - (p.off || 0) * day }, p, { date: d(p.off || 0) }); });
      return out;
    }

    const groups = {
      g_toeic: {
        name: 'Nhóm TOEIC tối',
        ratePerSession: 150000,
        packageSize: 8,
        schedule: { tue: '18:00', fri: '18:00' },
        members: { 'demo-student-2': true, 'demo-student-5': true, 'demo-student-6': true, 'demo-student-7': true },
      },
    };

    const billing = {
      'demo-student-1': { // Minh Anh — 1-1 khoẻ mạnh
        plan: { type: '1v1', ratePerSession: 250000, packageSize: 8 },
        schedule: { tue: '17:00', sat: '9:00' },
        payments: payments([{ sessions: 8, amount: 2000000, off: 40 }, { sessions: 8, amount: 2000000, off: 12 }]),
        attendance: attendanceLog(11, 2, 3),
      },
      'demo-student-2': { // Hồng Ngọc — nhóm
        plan: { type: 'group', groupId: 'g_toeic' },
        payments: payments([{ sessions: 8, amount: 1200000, off: 20 }]),
        attendance: attendanceLog(5, 1, 3),
      },
      'demo-student-3': { // Tuấn Kiệt — 1-1
        plan: { type: '1v1', ratePerSession: 200000, packageSize: 8 },
        schedule: { mon: '19:00', thu: '19:00' },
        payments: payments([{ sessions: 8, amount: 1600000, off: 15 }]),
        attendance: attendanceLog(4, 2, 3),
      },
      'demo-student-4': { // Khánh Linh — 1-1, còn 2 buổi → sắp phải thu
        plan: { type: '1v1', ratePerSession: 220000, packageSize: 8 },
        schedule: { wed: '18:00' },
        payments: payments([{ sessions: 8, amount: 1760000, off: 45 }]),
        attendance: attendanceLog(6, 3, 6),
      },
      'demo-student-5': { // Gia Hân — nhóm
        plan: { type: 'group', groupId: 'g_toeic' },
        payments: payments([{ sessions: 8, amount: 1200000, off: 18 }]),
        attendance: attendanceLog(4, 2, 3),
      },
      'demo-student-6': { // Quang Huy — nhóm, có 1 buổi vắng bị trừ
        plan: { type: 'group', groupId: 'g_toeic' },
        payments: payments([{ sessions: 8, amount: 1200000, off: 18 }]),
        attendance: Object.assign(attendanceLog(4, 4, 3), { [d(1)]: { status: 'absent', counted: true, ts: now - day } }),
      },
      'demo-student-7': { // Thu Hà — nhóm, còn 1 buổi
        plan: { type: 'group', groupId: 'g_toeic' },
        payments: payments([{ sessions: 8, amount: 1200000, off: 30 }]),
        attendance: attendanceLog(7, 2, 3),
      },
      'demo-student-8': { // Đức Anh — 1-1, học vượt gói → âm 1 buổi
        plan: { type: '1v1', ratePerSession: 300000, packageSize: 8 },
        schedule: { sat: '15:00' },
        payments: payments([{ sessions: 8, amount: 2400000, off: 60 }]),
        attendance: attendanceLog(9, 3, 6),
      },
      // demo-student-9 (Mai Phương) & 10 (Hoàng Nam): chưa cấu hình — hiện khu 🔴
    };

    return {
      billing,
      groups,
      settings: (typeof Billing !== 'undefined') ? Billing.normalizeSettings(null) : { countRules: {} },
    };
  }

  function getDemoBillingApi() {
    if (!demoBillingState) demoBillingState = buildDemoBilling();
    const st = demoBillingState;
    const ok = () => Promise.resolve();
    return {
      fetchAll: () => Promise.resolve(st),
      saveStudentPlan: (uid, plan, schedule) => {
        const b = st.billing[uid] = st.billing[uid] || {};
        b.plan = plan;
        if (schedule !== undefined) b.schedule = schedule;
        return ok();
      },
      addPayment: (uid, payment) => {
        const b = st.billing[uid] = st.billing[uid] || {};
        b.payments = b.payments || {};
        b.payments['pay' + Date.now()] = Object.assign({ ts: Date.now() }, payment);
        return ok();
      },
      deletePayment: (uid, pid) => {
        if (st.billing[uid] && st.billing[uid].payments) delete st.billing[uid].payments[pid];
        return ok();
      },
      markAttendance: (uid, date, status, planType, settings) => {
        const b = st.billing[uid] = st.billing[uid] || {};
        b.attendance = b.attendance || {};
        const existing = b.attendance[date];
        if (existing && existing.status === status) {
          delete b.attendance[date];
        } else {
          b.attendance[date] = { status, counted: Billing.shouldCount(status, planType, settings), ts: Date.now() };
        }
        return ok();
      },
      saveGroup: (gid, data) => {
        const key = gid || ('g_' + Date.now());
        st.groups[key] = data;
        return Promise.resolve(key);
      },
      deleteGroup: (gid) => { delete st.groups[gid]; return ok(); },
      saveSettings: (settings) => { st.settings = Billing.normalizeSettings(settings); return ok(); },
    };
  }

  // The demo student's own tuition (for the reminder banner on Tiến độ).
  function myDemoBilling() {
    return { plan: { type: '1v1' }, remaining: 2 };
  }

  global.DemoSeed = { maybeSeed, isDemoUser, listDemoStudents, getDemoBillingApi, myDemoBilling };
})(window);
