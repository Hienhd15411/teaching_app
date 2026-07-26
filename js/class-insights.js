(function (global) {
  'use strict';

  // Per-student coaching insights for the Class dashboard.
  //
  // Everything is computed client-side from the progress payload that
  // listAllStudents() already returns — no extra backend reads. The goal
  // is to turn raw counters into the sentence a teacher would actually
  // say: "Kèm thêm TOEIC Part 1 — độ chính xác 43%".

  const DAY = 86400000;

  function resolveTopicDef(topicId) {
    const topic = (global.TOPICS || []).find((x) => x.id === topicId);
    if (topic) return { icon: topic.icon, title: topic.title };
    const m = /^toeic_([^_]+)_(.+)$/.exec(topicId || '');
    if (m && typeof global.TOEIC !== 'undefined') {
      const ed = global.TOEIC.EDITIONS.find((e) => e.id === m[1]);
      const part = global.TOEIC.PARTS.find((p) => p.id === m[2]);
      if (ed && part) {
        return {
          icon: part.icon,
          title: {
            vi: part.title.vi + ' · ' + ed.label,
            en: part.title.en + ' · ' + ed.label,
          },
        };
      }
    }
    return { icon: '📘', title: { vi: topicId, en: topicId } };
  }

  function analyze(student, lang) {
    const L = lang === 'en' ? 'en' : 'vi';
    const p = (student && student.progress) || {};
    const perTopic = p.perTopic || {};
    const perWord = p.perWord || {};
    const history = Array.isArray(p.history) ? p.history : [];
    const now = Date.now();

    // Overall accuracy from per-topic rollups.
    let sumC = 0;
    let sumW = 0;
    let lastPlayedAt = 0;
    Object.values(perTopic).forEach((t) => {
      sumC += t.correct || 0;
      sumW += t.wrong || 0;
      if ((t.lastPlayedAt || 0) > lastPlayedAt) lastPlayedAt = t.lastPlayedAt;
    });
    const accuracy = sumC + sumW > 0 ? Math.round((sumC / (sumC + sumW)) * 100) : null;

    // Last activity: perTopic timestamps, then history, then updatedAt.
    if (!lastPlayedAt && history.length) {
      history.forEach((h) => { if ((h.ts || 0) > lastPlayedAt) lastPlayedAt = h.ts; });
    }
    if (!lastPlayedAt) lastPlayedAt = student.updatedAt || 0;
    const inactiveDays = lastPlayedAt ? Math.max(0, Math.floor((now - lastPlayedAt) / DAY)) : null;

    // Weak topics: enough attempts to mean something, accuracy under 65%.
    const weakTopics = Object.entries(perTopic)
      .map(([id, t]) => {
        const c = t.correct || 0;
        const w = t.wrong || 0;
        if (c + w < 8) return null;
        const acc = Math.round((c / (c + w)) * 100);
        if (acc >= 65) return null;
        const def = resolveTopicDef(id);
        return { id, icon: def.icon, title: def.title, accuracy: acc, attempts: t.attempts || 0 };
      })
      .filter(Boolean)
      .sort((a, b) => a.accuracy - b.accuracy);

    // Stuck words: low box + repeated misses.
    const stuckWords = [];
    Object.entries(perWord).forEach(([key, st]) => {
      if ((st.box || 1) <= 2 && (st.wrong || 0) >= 2) {
        const sep = key.indexOf('::');
        const topicId = key.slice(0, sep);
        stuckWords.push({ en: key.slice(sep + 2), icon: resolveTopicDef(topicId).icon, wrong: st.wrong || 0 });
      }
    });
    stuckWords.sort((a, b) => b.wrong - a.wrong);

    const hasActivity = sumC + sumW > 0 || history.length > 0;

    // Risk score → high / watch / ok.
    let risk = 0;
    if (inactiveDays != null) {
      if (inactiveDays >= 7) risk += 50;
      else if (inactiveDays >= 3) risk += 30;
    }
    if (accuracy != null) {
      if (accuracy < 50) risk += 40;
      else if (accuracy < 65) risk += 25;
    }
    risk += Math.min(20, stuckWords.length * 2);
    if ((p.streak || 0) === 0 && hasActivity) risk += 10;
    const riskLevel = risk >= 60 ? 'high' : risk >= 30 ? 'watch' : 'ok';

    // Actionable suggestions, worst problem first.
    const suggestions = [];
    if (weakTopics.length) {
      const wt = weakTopics[0];
      suggestions.push(L === 'vi'
        ? 'Kèm thêm ' + wt.title.vi + ' — độ chính xác ' + wt.accuracy + '%'
        : 'Extra coaching on ' + wt.title.en + ' — ' + wt.accuracy + '% accuracy');
    }
    if (inactiveDays != null && inactiveDays >= 3) {
      suggestions.push(L === 'vi'
        ? 'Chưa học ' + inactiveDays + ' ngày — nhắn nhắc nhé'
        : 'Inactive for ' + inactiveDays + ' days — send a nudge');
    }
    if (stuckWords.length >= 5) {
      suggestions.push(L === 'vi'
        ? stuckWords.length + ' từ kẹt ở Box 1-2 — giao bài ôn lại'
        : stuckWords.length + ' words stuck in Box 1-2 — assign a review round');
    }
    if (!suggestions.length && hasActivity) {
      suggestions.push(L === 'vi'
        ? 'Đang học đều và tốt — khen một câu 👏'
        : 'Consistent and doing well — send some praise 👏');
    }
    if (!hasActivity) {
      suggestions.push(L === 'vi'
        ? 'Chưa bắt đầu học — hướng dẫn buổi đầu'
        : 'Has not started yet — walk them through the first session');
    }

    return { accuracy, inactiveDays, weakTopics, stuckWords, riskScore: risk, riskLevel, suggestions };
  }

  global.ClassInsights = { analyze, resolveTopicDef };
})(window);
