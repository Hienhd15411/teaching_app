(function (global) {
  'use strict';

  // Leitner 5-box spaced repetition — simple, offline-friendly.
  // box 1 = new/struggling, box 5 = mastered.

  const MAX_BOX = 5;

  function wordKey(topicId, en) {
    return topicId + '::' + en.toLowerCase();
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

  // Pick words for a session: prioritize lower box first (weakest), then unseen.
  function pickSession(progress, topicId, words, size) {
    const scored = words.map((w) => {
      const s = progress.perWord[wordKey(topicId, w.en)];
      const box = s ? s.box : 0; // 0 means unseen — highest priority
      return { w, box };
    });
    scored.sort((a, b) => a.box - b.box);
    const picked = scored.slice(0, size).map((x) => x.w);
    // shuffle
    for (let i = picked.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [picked[i], picked[j]] = [picked[j], picked[i]];
    }
    return picked;
  }

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
  };
})(window);
