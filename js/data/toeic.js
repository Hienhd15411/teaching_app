(function (global) {
  'use strict';

  // TOEIC practice vocabulary.
  //
  // CONTENT DISCLAIMER
  // ------------------
  // These word sets are curated from publicly available TOEIC preparation
  // sources (600 Essential Words for the TOEIC, Oxford/Longman TOEIC guides,
  // onestopenglish.com, estudyme.com, BestMyTest lesson notes, etc.) grouped
  // by Part 1–7 context. They are NOT transcriptions of ETS (Educational
  // Testing Service) test content and should not be presented as such.
  //
  // "Editions" (2023 / 2024 / 2026) are rotating curated subsets drawn from
  // the same high-frequency pool so students can revise the same Part with
  // different word mixes across days — an exam-feel rotation, not a
  // reproduction of any specific ETS test book.
  //
  // Each entry uses the same schema as /js/data/vocab.js:
  //   { en, vi, pos, ipa, example, syn?, ant? }
  //
  // Each Part also exposes two word groups:
  //   highFreq — frequent words & collocations for that part
  //   keywords — "must-know" trigger words decisive to picking answers

  const PARTS = [
    { id: 'part1', number: 1, title: { vi: 'Part 1 · Mô tả ảnh', en: 'Part 1 · Photos' }, icon: '📷' },
    { id: 'part2', number: 2, title: { vi: 'Part 2 · Hỏi đáp', en: 'Part 2 · Q & A' }, icon: '💬' },
    { id: 'part3', number: 3, title: { vi: 'Part 3 · Hội thoại', en: 'Part 3 · Conversations' }, icon: '👥' },
    { id: 'part4', number: 4, title: { vi: 'Part 4 · Bài nói', en: 'Part 4 · Short Talks' }, icon: '🎙️' },
    { id: 'part5', number: 5, title: { vi: 'Part 5 · Hoàn thành câu', en: 'Part 5 · Incomplete Sentences' }, icon: '✏️' },
    { id: 'part6', number: 6, title: { vi: 'Part 6 · Hoàn thành đoạn văn', en: 'Part 6 · Text Completion' }, icon: '📝' },
    { id: 'part7', number: 7, title: { vi: 'Part 7 · Đọc hiểu', en: 'Part 7 · Reading Comprehension' }, icon: '📖' },
  ];

  const EDITIONS = [
    { id: '2023', label: 'ETS 2023', desc: { vi: 'Bộ xoay 2023', en: '2023 rotation' } },
    { id: '2024', label: 'ETS 2024', desc: { vi: 'Bộ xoay 2024', en: '2024 rotation' } },
    { id: '2026', label: 'ETS 2026', desc: { vi: 'Bộ xoay 2026', en: '2026 rotation' } },
  ];

  // Shape: TOEIC.data[edition][partId] = { highFreq: [...], keywords: [...] }
  // Populated incrementally in /js/data/toeic-*.js fragments.
  const data = {
    '2023': {},
    '2024': {},
    '2026': {},
  };

  function getPart(editionId, partId) {
    const ed = data[editionId];
    if (!ed) return { highFreq: [], keywords: [] };
    const p = ed[partId];
    if (!p) return { highFreq: [], keywords: [] };
    return { highFreq: p.highFreq || [], keywords: p.keywords || [] };
  }

  function setPart(editionId, partId, group, words) {
    if (!data[editionId]) data[editionId] = {};
    if (!data[editionId][partId]) data[editionId][partId] = { highFreq: [], keywords: [] };
    data[editionId][partId][group] = words;
  }

  function allWordsInPart(editionId, partId) {
    const { highFreq, keywords } = getPart(editionId, partId);
    // De-duplicate by English form — a word may live in both groups.
    const seen = new Set();
    const merged = [];
    [].concat(keywords, highFreq).forEach((w) => {
      const key = (w.en || '').toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(w);
    });
    return merged;
  }

  global.TOEIC = {
    PARTS,
    EDITIONS,
    data,
    getPart,
    setPart,
    allWordsInPart,
  };
})(window);
