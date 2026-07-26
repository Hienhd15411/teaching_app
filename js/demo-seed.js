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

  global.DemoSeed = { maybeSeed, isDemoUser, listDemoStudents };
})(window);
