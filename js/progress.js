(function (global) {
  'use strict';

  const BADGES = [
    { id: 'firstWord', nameKey: 'badge.firstWord', emoji: '🌱' },
    { id: 'words100', nameKey: 'badge.words100', emoji: '📚' },
    { id: 'streak3', nameKey: 'badge.streak3', emoji: '🔥' },
    { id: 'streak7', nameKey: 'badge.streak7', emoji: '🔥' },
    { id: 'streak30', nameKey: 'badge.streak30', emoji: '🏆' },
    { id: 'topicMaster', nameKey: 'badge.topicMaster', emoji: '👑' },
    { id: 'flashcardFirst', nameKey: 'badge.flashcardFirst', emoji: '🎴' },
    { id: 'quizFirst', nameKey: 'badge.quizFirst', emoji: '❓' },
    { id: 'typingFirst', nameKey: 'badge.typingFirst', emoji: '⌨️' },
    { id: 'matchingFirst', nameKey: 'badge.matchingFirst', emoji: '🔗' },
  ];

  function xpForLevel(level) {
    return Math.round(100 * Math.pow(level, 1.5));
  }

  function computeLevel(xp) {
    let level = 1;
    let remaining = xp;
    while (remaining >= xpForLevel(level)) {
      remaining -= xpForLevel(level);
      level += 1;
    }
    return {
      level,
      xpInLevel: remaining,
      xpForNext: xpForLevel(level),
      pct: Math.round((remaining / xpForLevel(level)) * 100),
    };
  }

  function todayStr() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mm + '-' + dd;
  }

  function daysBetween(aStr, bStr) {
    const a = new Date(aStr + 'T00:00:00');
    const b = new Date(bStr + 'T00:00:00');
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
  }

  function updateStreak(progress) {
    const today = todayStr();
    if (progress.lastActiveDate === today) return progress.streak;
    if (!progress.lastActiveDate) {
      progress.streak = 1;
    } else {
      const diff = daysBetween(progress.lastActiveDate, today);
      if (diff === 1) progress.streak += 1;
      else if (diff > 1) progress.streak = 1;
    }
    progress.lastActiveDate = today;
    return progress.streak;
  }

  function awardBadge(progress, id, newly) {
    if (progress.badges.indexOf(id) === -1) {
      progress.badges.push(id);
      newly.push(id);
    }
  }

  // Called after each game session.
  // result: { mode, topicId, correct, wrong, xp, bestCombo, durationSec, wordsSeen }
  function finishSession(result) {
    const progress = Storage.getProgress();

    updateStreak(progress);
    progress.xp = (progress.xp || 0) + (result.xp || 0);
    const lvl = computeLevel(progress.xp);
    progress.level = lvl.level;

    // per-topic rollup
    const t = progress.perTopic[result.topicId] || { attempts: 0, correct: 0, wrong: 0 };
    t.attempts += 1;
    t.correct += result.correct;
    t.wrong += result.wrong;
    t.lastPlayedAt = Date.now();
    progress.perTopic[result.topicId] = t;

    // history (last 60 entries)
    progress.history.push({
      date: todayStr(),
      ts: Date.now(),
      mode: result.mode,
      topic: result.topicId,
      correct: result.correct,
      wrong: result.wrong,
      xp: result.xp,
    });
    if (progress.history.length > 300) progress.history = progress.history.slice(-300);

    // badges
    const newly = [];
    const totalAttempts = Object.values(progress.perWord).reduce(
      (acc, s) => acc + s.correct + s.wrong,
      0
    );
    const wordsSeen = Object.keys(progress.perWord).length;
    if (wordsSeen >= 1) awardBadge(progress, 'firstWord', newly);
    if (wordsSeen >= 100) awardBadge(progress, 'words100', newly);
    if (progress.streak >= 3) awardBadge(progress, 'streak3', newly);
    if (progress.streak >= 7) awardBadge(progress, 'streak7', newly);
    if (progress.streak >= 30) awardBadge(progress, 'streak30', newly);
    if (result.mode === 'flashcard') awardBadge(progress, 'flashcardFirst', newly);
    if (result.mode === 'quiz') awardBadge(progress, 'quizFirst', newly);
    if (result.mode === 'typing') awardBadge(progress, 'typingFirst', newly);
    if (result.mode === 'matching') awardBadge(progress, 'matchingFirst', newly);

    // topic master: ≥90% mastery on any topic
    if (typeof VOCAB !== 'undefined') {
      const words = VOCAB[result.topicId] || [];
      const stats = SRS.topicStats(progress, result.topicId, words);
      if (stats.masteryPct >= 90 && words.length > 0) {
        awardBadge(progress, 'topicMaster', newly);
      }
    }

    Storage.saveProgress(progress);
    return { progress, newBadges: newly, totalAttempts };
  }

  function globalStats() {
    const progress = Storage.getProgress();
    const wordsSeen = Object.keys(progress.perWord).length;
    let mastered = 0;
    Object.values(progress.perWord).forEach((s) => {
      if (s.box >= 4) mastered += 1;
    });
    const lvl = computeLevel(progress.xp || 0);
    return {
      xp: progress.xp || 0,
      level: lvl.level,
      xpInLevel: lvl.xpInLevel,
      xpForNext: lvl.xpForNext,
      pct: lvl.pct,
      streak: progress.streak || 0,
      wordsSeen,
      mastered,
    };
  }

  function getBadgeDef(id) {
    return BADGES.find((b) => b.id === id);
  }

  global.Progress = {
    BADGES,
    xpForLevel,
    computeLevel,
    finishSession,
    globalStats,
    getBadgeDef,
    updateStreak,
    todayStr,
  };
})(window);
