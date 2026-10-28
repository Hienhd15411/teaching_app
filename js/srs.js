(function (global) {
  'use strict';

  // Leitner 5-box spaced repetition — simple, offline-friendly.
  // box 1 = new/struggling, box 5 = mastered.

  const MAX_BOX = 5;

  // Firebase RTDB keys may not contain . # $ [ ] / — one bad key ("Fill
  // out/in") makes the whole progress upload fail, so they become "_".
  function wordKey(topicId, en) {
    return (topicId + '::' + String(en).toLowerCase()).replace(/[.#$\[\]\/]/g, '_');
  }

  function getWordState(progress, topicId, en) {
    const key = wordKey(topicId, en);
    return progress.perWord[key] || { box: 1, lastReviewed: null, correct: 0, wrong: 0 };
  }

  function updateWord(progress, topicId, en, wasCorrect) {
    const key = wordKey(topicId, en);
    const state = progress.perWord[key] || { box: 1, lastReviewed: null, correct: 0, wrong: 0 };
    if (wasCorrect) {
      state.correct += 1;
      state.box = Math.min(MAX_BOX, state.box + 1);
    } else {
      state.wrong += 1;
      state.box = 1;
    }
    state.lastReviewed = Date.now();
    progress.perWord[key] = state;
    return state;
  }

  function topicStats(progress, topicId, words) {
    let seen = 0;
    let mastered = 0;
    let correctSum = 0;
    let attemptSum = 0;
    words.forEach((w) => {
      const state = progress.perWord[wordKey(topicId, w.en)];
      if (state) {
        seen += 1;
        if (state.box >= 4) mastered += 1;
        correctSum += state.correct;
        attemptSum += state.correct + state.wrong;
      }
    });
    return {
      seen,
      total: words.length,
      mastered,
      masteryPct: words.length ? Math.round((mastered / words.length) * 100) : 0,
      accuracy: attemptSum ? Math.round((correctSum / attemptSum) * 100) : 0,
    };
  }

  // ---------- learned / unseen / due ----------
  //
  // A word is "learned" (đã học) once it has any perWord record, i.e. the
  // student has rated or answered it at least once. Review intervals per
  // Leitner box decide when a learned word is due again.

  const DAY_MS = 86400000;
  const INTERVAL_DAYS = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 14 };
  const RECENT_WINDOW_MS = DAY_MS; // "just learned" = touched in the last 24h
  // Modes that teach new words. Every other mode is a test of learned words.
  const LEARN_MODES = { flashcard: true };

  // ≥ 1 means due. Box 1 (wrong / struggling) is always due.
  function dueRatio(s, now) {
    if (!s || !s.lastReviewed) return 1e9;
    const iv = (INTERVAL_DAYS[s.box] || 0) * DAY_MS;
    if (!iv) return 1e6 + (now - s.lastReviewed) / DAY_MS;
    return (now - s.lastReviewed) / iv;
  }

  function wordStatus(progress, topicId, en, now) {
    const s = progress.perWord[wordKey(topicId, en)];
    if (!s) return 'new';
    if (s.box >= 4 && dueRatio(s, now || Date.now()) < 1) return 'mastered';
    return dueRatio(s, now || Date.now()) >= 1 ? 'due' : 'learned';
  }

  function learnStatus(progress, topicId, words, now) {
    const t = now || Date.now();
    const out = { total: words.length, learned: 0, unseen: 0, due: 0, mastered: 0 };
    words.forEach((w) => {
      const st = wordStatus(progress, topicId, w.en, t);
      if (st === 'new') out.unseen += 1;
      else {
        out.learned += 1;
        if (st === 'due') out.due += 1;
        if (st === 'mastered') out.mastered += 1;
      }
    });
    return out;
  }

  function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Pick the words for one session.
  //
  //  • Learn mode (flashcard): the NEXT unseen words in list order, so a
  //    70-word list is studied 1–10, 11–20, … — plus up to 3 words the
  //    student keeps getting wrong. When nothing is unseen, review by due.
  //  • Test modes (quiz, typing, matching, speaking, review-wrong): only
  //    words already learned. First the ones learned since the last test
  //    in this topic (so "học 10 từ rồi bấm test" tests exactly those),
  //    then the most overdue. Unseen words only fill in when the student
  //    has learned fewer words than the session size.
  function pickSession(progress, topicId, words, size, mode) {
    const now = Date.now();
    const n = Math.min(size, words.length);
    const seen = [];
    const unseen = [];
    words.forEach((w, idx) => {
      const s = progress.perWord[wordKey(topicId, w.en)];
      if (s) seen.push({ w, s, idx });
      else unseen.push({ w, idx });
    });
    const byDue = (a, b) => (dueRatio(b.s, now) - dueRatio(a.s, now))
      || (a.s.box - b.s.box) || ((a.s.lastReviewed || 0) - (b.s.lastReviewed || 0));

    const ordered = [];
    if (LEARN_MODES[mode]) {
      const struggling = seen
        .filter((x) => x.s.box === 1 && x.s.wrong > 0)
        .sort((a, b) => (a.s.lastReviewed || 0) - (b.s.lastReviewed || 0))
        .slice(0, unseen.length ? Math.min(3, Math.floor(n * 0.3)) : n);
      struggling.forEach((x) => ordered.push(x.w));
      unseen.forEach((x) => ordered.push(x.w));
      seen.slice().sort(byDue).forEach((x) => ordered.push(x.w));
    } else {
      const topic = (progress.perTopic && progress.perTopic[topicId]) || {};
      const lastTest = topic.lastTestedAt || 0;
      const recent = seen
        .filter((x) => (x.s.lastReviewed || 0) > lastTest && now - (x.s.lastReviewed || 0) < RECENT_WINDOW_MS)
        .sort((a, b) => (b.s.lastReviewed || 0) - (a.s.lastReviewed || 0));
      recent.forEach((x) => ordered.push(x.w));
      seen.slice().sort(byDue).forEach((x) => ordered.push(x.w));
      unseen.forEach((x) => ordered.push(x.w));
    }

    const picked = [];
    const used = new Set();
    for (let i = 0; i < ordered.length && picked.length < n; i++) {
      const k = ordered[i].en.toLowerCase();
      if (used.has(k)) continue;
      used.add(k);
      picked.push(ordered[i]);
    }
    return shuffleInPlace(picked);
  }

  function isLearnMode(mode) { return !!LEARN_MODES[mode]; }

  function wrongWords(progress, topicId, words) {
    return words.filter((w) => {
      const s = progress.perWord[wordKey(topicId, w.en)];
      return s && s.wrong > 0 && s.box < 4;
    });
  }

  global.SRS = {
    MAX_BOX,
    wordKey,
    getWordState,
    updateWord,
    topicStats,
    pickSession,
    wrongWords,
    wordStatus,
    learnStatus,
    isLearnMode,
    dueRatio,
  };
})(window);
