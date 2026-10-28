// Logic + data QC (no browser). Run via: node qc/run.js
'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT, area, check, safe, loadModules } = require('./lib');

const DATA = [
  'js/data/topics.js', 'js/data/vocab.js', 'js/data/toeic.js',
  'js/data/toeic-part1.js', 'js/data/toeic-part2.js', 'js/data/toeic-part3.js', 'js/data/toeic-part4.js',
  'js/data/toeic-part5.js', 'js/data/toeic-part6.js', 'js/data/toeic-part7.js',
  'js/data/interview-bank.js', 'js/data/interview-airlines.js', 'js/data/ipa-dict.js',
  'js/data/pron-drill.js', 'js/data/placement-bank.js',
];
const CORE = ['js/i18n.js', 'js/storage.js', 'js/srs.js', 'js/progress.js', 'js/billing.js', 'js/gcal.js', 'js/accounts.js', 'js/class-insights.js', 'js/interview.js', 'js/pron-drill.js', 'js/placement.js'];

const DAY = 86400000;

module.exports = async function runUnit() {
  const { ctx: C, errors } = loadModules(DATA.concat(CORE));
  area('Tải module');
  check(errors.length === 0, 'Tất cả file dữ liệu + logic load không lỗi', errors.join(' | '));

  // ---------------- vocab data ----------------
  await safe('vocab data', async () => {
    area('Dữ liệu từ vựng');
    const topicIds = C.TOPICS.map((t) => t.id);
    const vocabIds = Object.keys(C.VOCAB);
    const noVocab = topicIds.filter((id) => !(C.VOCAB[id] || []).length);
    const orphan = vocabIds.filter((id) => topicIds.indexOf(id) < 0);
    check(noVocab.length === 0, 'Mọi chủ đề đều có từ', noVocab.join(', '));
    check(orphan.length === 0, 'Không có bộ từ nào thiếu chủ đề', orphan.join(', '));
    check(new Set(topicIds).size === topicIds.length, 'ID chủ đề không trùng');
    const missingFields = [];
    const dups = [];
    let total = 0; let ipa = 0; let ex = 0;
    vocabIds.forEach((id) => {
      const seen = new Set();
      (C.VOCAB[id] || []).forEach((w, i) => {
        total += 1;
        if (!w.en || !w.vi) missingFields.push(id + '#' + i);
        if (w.ipa) ipa += 1;
        if (w.example) ex += 1;
        const k = String(w.en || '').toLowerCase().trim();
        if (seen.has(k)) dups.push(id + ':' + w.en); else seen.add(k);
      });
    });
    check(missingFields.length === 0, 'Từ nào cũng có đủ EN + VI', missingFields.slice(0, 10).join(', '));
    check(dups.length === 0, 'Không có từ trùng trong cùng chủ đề (' + total + ' từ)', dups.slice(0, 15).join(', ') + (dups.length > 15 ? ' …+' + (dups.length - 15) : ''));
    check(ipa / total >= 0.95, 'IPA phủ ≥95% từ (' + Math.round(ipa / total * 100) + '%)');
    check(ex / total >= 0.95, 'Ví dụ phủ ≥95% từ (' + Math.round(ex / total * 100) + '%)');
    const badTopic = C.TOPICS.filter((t) => !t.title || !t.title.vi || !t.title.en || !t.icon).map((t) => t.id);
    check(badTopic.length === 0, 'Chủ đề nào cũng có tên VI/EN + icon', badTopic.join(', '));
  });

  // ---------------- TOEIC data ----------------
  await safe('toeic data', async () => {
    area('Dữ liệu TOEIC');
    const empty = [];
    C.TOEIC.EDITIONS.forEach((ed) => C.TOEIC.PARTS.forEach((p) => {
      const n = C.TOEIC.allWordsInPart(ed.id, p.id).length;
      if (!n) empty.push(ed.id + '/' + p.id);
    }));
    check(empty.length === 0, 'Mọi bộ đề × Part đều có từ (' + C.TOEIC.EDITIONS.length + ' bộ × ' + C.TOEIC.PARTS.length + ' part)', empty.join(', '));
  });

  // ---------------- i18n coverage ----------------
  await safe('i18n', async () => {
    area('Ngôn ngữ VI/EN');
    const src = fs.readdirSync(path.join(ROOT, 'js')).filter((f) => f.endsWith('.js')).map((f) => 'js/' + f)
      .concat(fs.readdirSync(path.join(ROOT, 'js/games')).map((f) => 'js/games/' + f));
    const used = new Set();
    src.forEach((f) => {
      const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
      for (const m of s.matchAll(/\bt\(\s*'([a-zA-Z][\w]*\.[\w.]+)'\s*\)/g)) used.add(m[1]);
    });
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    for (const m of html.matchAll(/data-i18n="([^"]+)"/g)) used.add(m[1]);
    const missVi = []; const missEn = [];
    C.I18N.setLang('vi');
    used.forEach((k) => { if (C.I18N.t(k) === k) missVi.push(k); });
    C.I18N.setLang('en');
    const enDict = [];
    used.forEach((k) => { if (C.I18N.t(k) === k) missEn.push(k); });
    C.I18N.setLang('vi');
    check(missVi.length === 0, 'Không thiếu chuỗi tiếng Việt (' + used.size + ' khoá tĩnh)', missVi.join(', '));
    check(missEn.length === 0, 'Không thiếu chuỗi tiếng Anh', missEn.join(', '));
    void enDict;
  });

  // ---------------- SRS word selection ----------------
  await safe('srs', async () => {
    area('Chọn từ học / kiểm tra');
    const S = C.SRS;
    const words = Array.from({ length: 70 }, (_, i) => ({ en: 'w' + (i + 1), vi: 'v' }));
    const T = 'qc';
    const key = (en) => S.wordKey(T, en);
    const nums = (a) => a.map((w) => +w.en.slice(1)).sort((x, y) => x - y).join(',');
    const p = { perWord: {}, perTopic: {} };
    const learn = S.pickSession(p, T, words, 10, 'flashcard');
    check(nums(learn) === '1,2,3,4,5,6,7,8,9,10', 'Học mới lần đầu → từ 1–10');
    learn.forEach((w) => { p.perWord[key(w.en)] = { box: 2, correct: 1, wrong: 0, lastReviewed: Date.now() - 60000 }; });
    ['quiz', 'typing', 'matching', 'speaking'].forEach((m) => check(nums(S.pickSession(p, T, words, 10, m)) === '1,2,3,4,5,6,7,8,9,10', 'Kiểm tra (' + m + ') ngay sau khi học → đúng 10 từ vừa học'));
    check(nums(S.pickSession(p, T, words, 10, 'flashcard')) === '11,12,13,14,15,16,17,18,19,20', 'Học tiếp → từ 11–20, không lặp lại');
    const ls = S.learnStatus(p, T, words);
    check(ls.learned === 10 && ls.unseen === 60, 'Đếm đã học / chưa học đúng');
    check(S.pickSession({ perWord: {}, perTopic: {} }, T, words.slice(0, 4), 10, 'quiz').length === 4, 'Chủ đề ít hơn 10 từ không lỗi');
    check(S.pickSession({ perWord: {}, perTopic: {} }, T, [], 10, 'quiz').length === 0, 'Danh sách rỗng không lỗi');
  });

  // ---------------- Progress / XP ----------------
  await safe('progress', async () => {
    area('XP, cấp độ, chuỗi ngày');
    const P = C.Progress;
    check(P.computeLevel(0).level === 1 && P.computeLevel(100).level === 2, 'Cấp độ tính từ XP đúng');
    let prev = 0; let mono = true;
    for (let xp = 0; xp < 20000; xp += 37) { const l = P.computeLevel(xp).level; if (l < prev) mono = false; prev = l; }
    check(mono, 'Cấp độ không bao giờ giảm khi XP tăng');
    C.localStorage.clear();
    const prof = C.Storage.createProfile('QC', '🙂');
    C.Storage.setActiveProfile(prof.id);
    const r = P.finishSession({ mode: 'quiz', topicId: 'intro_people', correct: 8, wrong: 2, xp: 50, wordsSeen: 10 });
    const pg = C.Storage.getProgress();
    check(pg.xp === 50 && pg.streak === 1 && pg.history.length === 1, 'Kết thúc lượt chơi: cộng XP, chuỗi ngày, lịch sử');
    check(pg.perTopic.intro_people.lastTestedAt > 0, 'Bài kiểm tra ghi mốc lastTestedAt');
    check(Array.isArray(r.newBadges), 'Huy hiệu trả về mảng');
  });

  // ---------------- Billing math ----------------
  await safe('billing', async () => {
    area('Học phí & điểm danh');
    const B = C.Billing;
    const s = B.normalizeSettings(null);
    check(B.shouldCount('present', '1v1', s) && !B.shouldCount('absent', '1v1', s) && !B.shouldCount('excused', '1v1', s), '1-1: có mặt trừ, vắng (có/không phép) không trừ');
    check(B.shouldCount('absent', 'group', s) && B.shouldCount('excused', 'group', s), 'Nhóm: vắng vẫn trừ (mặc định)');
    const s2 = B.normalizeSettings({ countRules: { group: { excused: false } } });
    check(!B.shouldCount('excused', 'group', s2) && B.shouldCount('absent', 'group', s2), 'Đổi quy tắc nhóm: vắng có phép không trừ');
    const b = { plan: { type: '1v1' }, payments: { a: { sessions: 8 }, b: { sessions: 4 } }, attendance: { d1: { counted: true }, d2: { counted: false }, d3: { counted: true } } };
    check(B.paidSessions(b) === 12 && B.usedSessions(b) === 2 && B.remaining(b) === 10, 'Còn lại = đã đóng − buổi bị trừ');
    check(B.remaining(null) === 0 && B.remaining({}) === 0, 'Học viên chưa có dữ liệu → 0, không lỗi');
    const ep = B.effectivePlan({ plan: { type: 'group', groupId: 'gone' } }, {});
    check(ep && ep.type === '1v1', 'Nhóm đã bị xoá → không crash (fallback)', JSON.stringify(ep));
    check(B.fmtVnd(1600000) === '1.600.000đ', 'Định dạng tiền VND');
    check(B.dayKeyOf('2026-10-28') === 'wed', 'Ngày → thứ đúng (28/10/2026 là thứ 4)');
  });

  // ---------------- Google Calendar desired events ----------------
  await safe('gcal', async () => {
    area('Google Calendar');
    const today = new Date(2026, 8, 28, 9, 0, 0); // Monday
    const students = [{ id: 'u1', profile: { name: 'Minh' } }, { id: 'u2', profile: { name: 'Lan' } }];
    const d = (n) => { const x = new Date(today); x.setDate(x.getDate() - n); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
    const att = (n) => { const o = {}; for (let i = 1; i <= n; i++) o[d(i * 3)] = { status: 'present', counted: true }; return o; };
    const billing = {
      u1: { plan: { type: '1v1', ratePerSession: 200000, packageSize: 8 }, schedule: { mon: '18:00', thu: '18:00' }, payments: { p: { sessions: 8 } }, attendance: att(6) },
      u2: { plan: { type: 'group', groupId: 'g1' }, payments: { p: { sessions: 8 } }, attendance: att(8) },
    };
    const groups = { g1: { name: 'Nhóm', ratePerSession: 150000, packageSize: 8, schedule: { tue: '19:30' }, members: { u2: true } } };
    const ev = C.GCal.buildDesired({ students, billing, groups, lang: 'vi', digestTime: '08:00', today });
    const all = Array.from(ev.entries());
    check(all.every(([id]) => /^[a-v0-9]{5,1024}$/.test(id)), 'ID sự kiện hợp lệ với Google');
    const classes = all.filter(([, e]) => e.extendedProperties.private.vq === 'class');
    const digests = all.filter(([, e]) => e.extendedProperties.private.vq === 'tuition');
    check(classes.length === 3, 'Nhắc lớp: 1 sự kiện mỗi khung giờ (3)', String(classes.length));
    const mon = digests.find(([, e]) => e.start.dateTime.startsWith('2026-09-28'));
    check(mon && /Minh/.test(mon[1].summary), 'Nhắc học phí sáng thứ 2: Minh (còn 2 buổi)');
    check(digests.every(([, e]) => e.start.dateTime.endsWith('08:00:00')), 'Nhắc học phí đúng giờ đã chọn');
    check(new Set(digests.map(([, e]) => e.start.dateTime.slice(0, 10))).size === digests.length, 'Tối đa 1 nhắc học phí mỗi ngày');
  });

  // ---------------- Accounts ----------------
  await safe('accounts', async () => {
    area('Tài khoản trùng / email sai');
    const A = C.Accounts;
    check(A.suggestEmail('a@gmial.com') === 'a@gmail.com' && A.suggestEmail('a@gmil.com') === 'a@gmail.com' && A.suggestEmail('a@gmail.con') === 'a@gmail.com', 'Bắt email gõ nhầm đuôi gmail');
    check(['a@gmail.com', 'a@ut.edu.vn', 'a@icloud.com', 'a@yahoo.com.vn'].every((e) => !A.suggestEmail(e)), 'Email đúng không bị báo nhầm');
    const g = A.findDuplicates([
      { id: '1', profile: { name: 'Ngọc Ánh', email: 'x@gmail.com' }, updatedAt: 1 },
      { id: '2', profile: { name: 'ngoc anh', email: 'y@gmail.com' }, updatedAt: 2 },
      { id: '3', profile: { name: 'Vy', email: 'v@gmial.com' }, updatedAt: 1 },
      { id: '4', profile: { name: 'Vy 2', email: 'v@gmail.com' }, updatedAt: 3 },
      { id: '5', profile: { name: 'Khác', email: 'k@gmail.com' }, updatedAt: 3 },
    ]);
    check(g.length === 2 && g.every((x) => x.members[0].updatedAt >= x.members[1].updatedAt), 'Phát hiện 2 cặp trùng, tài khoản dùng gần nhất đứng đầu');
  });

  // ---------------- Placement ----------------
  await safe('placement', async () => {
    area('Bài test đầu vào & lộ trình');
    const PB = C.PLACEMENT_BANK;
    const badQ = PB.GRAMMAR.concat(PB.DIALOGUES).filter((q) => !Array.isArray(q.choices) || q.choices.length < 2 || !(q.answer >= 0 && q.answer < q.choices.length) || !q.explain);
    check(badQ.length === 0, 'Câu hỏi ngữ pháp/hội thoại: đáp án hợp lệ, có giải thích (' + (PB.GRAMMAR.length + PB.DIALOGUES.length) + ')', badQ.map((q) => q.id).join(', '));
    const dupChoice = PB.GRAMMAR.concat(PB.DIALOGUES).filter((q) => new Set(q.choices).size !== q.choices.length);
    check(dupChoice.length === 0, 'Không có câu hỏi trùng phương án', dupChoice.map((q) => q.id).join(', '));
    Object.values(PB.TRACKS).forEach((tr) => {
      const w = tr.weights; const sum = w.vocab + w.second + w.speaking;
      check(Math.abs(sum - 1) < 1e-9, 'Trọng số bài ' + tr.id + ' cộng = 1');
    });
    const topicIds = new Set(C.TOPICS.map((t) => t.id));
    const tiers = [PB.VOCAB_TIERS, PB.CONV_VOCAB_TIERS];
    const badTier = [];
    tiers.forEach((t) => Object.values(t).forEach((arr) => arr.forEach((id) => { if (!topicIds.has(id)) badTier.push(id); })));
    check(badTier.length === 0, 'Chủ đề trong bài test đều tồn tại', badTier.join(', '));
    const partIds = new Set(C.TOEIC.PARTS.map((p) => p.id));
    const secIds = new Set(C.INTERVIEW_BANK.SECTIONS.map((s) => s.id));
    const setIds = new Set(C.PRON_DRILL.SETS.map((s) => s.id));
    const bad = [];
    let n = 0;
    Object.keys(PB.ROADMAPS).forEach((track) => ['A2', 'B1', 'B2'].forEach((lv) => {
      const rm = C.Placement.generateRoadmap(lv, track);
      if (rm.weeks.length !== 4) bad.push(track + lv + ' weeks=' + rm.weeks.length);
      rm.weeks.forEach((w) => w.items.forEach((it) => {
        n += 1;
        const ok = (it.type === 'topic' && topicIds.has(it.target)) || (it.type === 'toeic' && partIds.has(it.target))
          || (it.type === 'interview' && secIds.has(it.target)) || (it.type === 'drill' && setIds.has(it.target));
        if (!ok) bad.push(track + '/' + lv + ':' + it.type + ':' + it.target);
      }));
    }));
    check(bad.length === 0, 'Mọi mục trong lộ trình 4 tuần trỏ tới bài học có thật (' + n + ' mục)', bad.join(', '));
    check(C.Placement.levelFor(0).id === 'A2' && C.Placement.levelFor(50).id === 'B1' && C.Placement.levelFor(90).id === 'B2', 'Xếp trình độ A2/B1/B2 theo điểm');
    check(C.Placement.roadmapStatus({ perWord: {}, perTopic: {}, history: [] }) === null || typeof C.Placement.roadmapStatus({ perWord: {}, perTopic: {}, history: [] }) === 'object', 'Chưa có lộ trình → không lỗi');
  });

  // ---------------- Interview scoring ----------------
  await safe('interview', async () => {
    area('Phỏng vấn tiếp viên');
    const B = C.INTERVIEW_BANK;
    const noKw = B.questions.filter((q) => !q.keywords || !q.keywords.length || !q.model);
    check(noKw.length === 0, 'Câu hỏi nào cũng có ý chính + câu mẫu (' + B.questions.length + ' câu)', noKw.map((q) => q.id).join(', '));
    const secIds = new Set(B.SECTIONS.map((s) => s.id));
    const badSec = B.questions.filter((q) => q.section && !secIds.has(q.section));
    check(badSec.length === 0, 'Câu hỏi thuộc đúng phần thi', badSec.map((q) => q.id).join(', '));
    Object.keys(B.AIRLINES).forEach((al) => B.SECTIONS.forEach((sec) => {
      const n = B.questions.filter((q) => q.section === sec.id && (q.airlines === 'all' || (Array.isArray(q.airlines) && q.airlines.indexOf(al) >= 0))).length;
      check(n >= 1, 'Hãng ' + al + ' · phần ' + sec.id + ' có câu hỏi (' + n + ')');
    }));
    const low = []; const bad = [];
    B.questions.forEach((q) => {
      const r = C.InterviewGame.scoreAnswer(q, q.model, 0.9);
      if (!(r.total >= 8)) low.push(q.id + '=' + r.total);
      [C.InterviewGame.scoreAnswer(q, '', null), C.InterviewGame.scoreAnswer(q, 'um uh er like', null), C.InterviewGame.scoreAnswer(q, q.model.repeat(8), undefined)].forEach((x) => {
        if (!(x.total >= 0 && x.total <= 10) || Number.isNaN(x.total)) bad.push(q.id + ':' + x.total);
      });
    });
    check(low.length === 0, 'Câu trả lời mẫu được ≥ 8/10', low.join(', '));
    check(bad.length === 0, 'Trả lời rỗng / toàn từ đệm / rất dài: điểm luôn trong 0–10', bad.slice(0, 10).join(', '));
    check(C.InterviewGame.scoreAnswer(B.questions[0], '', null).total <= 1, 'Không trả lời → gần 0 điểm');
  });

  // ---------------- IPA drill ----------------
  await safe('drill', async () => {
    area('Luyện phát âm IPA');
    const sets = C.PRON_DRILL.SETS;
    sets.forEach((s) => check(s.items.length >= 20, 'Bộ "' + s.id + '" có ≥ 20 câu mẫu (' + s.items.length + ')'));
    const noIpa = []; sets.forEach((s) => s.items.forEach((it) => { if (!it.ipa || !it.vi) noIpa.push(s.id + ':' + it.en); }));
    check(noIpa.length === 0, 'Câu mẫu nào cũng có IPA + nghĩa', noIpa.slice(0, 5).join(' | '));
    const notPerfect = [];
    sets.forEach((s) => s.items.forEach((it) => { if (C.PronDrill.scorePhrase(it.en, it.en).score !== 10) notPerfect.push(it.en); }));
    check(notPerfect.length === 0, 'Đọc đúng nguyên văn → 10/10', notPerfect.slice(0, 5).join(' | '));
    check(C.PronDrill.scorePhrase('Fasten your seat belt.', 'fasten your seatbelt').score === 10, 'Nhận dạng tách/gộp từ (seat belt) vẫn 10/10');
    check(C.PronDrill.scorePhrase('Good morning.', '').score === 0, 'Không nói → 0');
    // Custom-sentence IPA guide must know every word used in the sample sets.
    const miss = new Set();
    sets.forEach((s) => s.items.forEach((it) => {
      const r = C.PronDrill.ipaForSentence(it.en, true);
      (r.unknown || []).forEach((w) => miss.add(w));
    }));
    check(miss.size === 0, 'Câu tự nhập: IPA tra được mọi từ có trong câu mẫu', Array.from(miss).slice(0, 25).join(', ') + (miss.size > 25 ? ' …+' + (miss.size - 25) : ''));
    const r2 = C.PronDrill.ipaForSentence('Please fasten your seatbelt and return your seat to the upright position', true);
    check(!(r2.unknown || []).length, 'Câu tự nhập thông dụng trên máy bay có đủ IPA', (r2.unknown || []).join(', '));
  });

  // ---------------- Schedule (study reminders) ----------------
  await safe('schedule', async () => {
    area('Lịch học & nhắc học');
    const S = C.Placement.Schedule;
    const ics = S.icsText({ days: ['tue', 'thu'], time: '20:00', minutes: 20 });
    check(/RRULE:FREQ=WEEKLY;BYDAY=TU,TH/.test(ics) && /BEGIN:VALARM/.test(ics) && /DTSTART:\d{8}T200000/.test(ics), 'File .ics: lặp hàng tuần đúng thứ, 20:00, có báo thức');
    const r = S.missedThisWeek({ schedule: { days: [], time: '20:00' }, history: [] });
    check(r.missed === 0, 'Lịch không có ngày nào → không tính bỏ buổi');
  });

  // ---------------- Regression checks for bugs fixed during QC ----------------
  await safe('regressions', async () => {
    area('Lỗi đã sửa (chống tái phát)');
    // Firebase rejects . # $ [ ] / in keys → one word used to block all sync.
    const bad = [];
    Object.keys(C.VOCAB).forEach((tid) => C.VOCAB[tid].forEach((w) => { const k = C.SRS.wordKey(tid, w.en); if (/[.#$\[\]\/]/.test(k)) bad.push(k); }));
    C.TOEIC.EDITIONS.forEach((ed) => C.TOEIC.PARTS.forEach((p) => C.TOEIC.allWordsInPart(ed.id, p.id).forEach((w) => { const k = C.SRS.wordKey('toeic_' + ed.id + '_' + p.id, w.en); if (/[.#$\[\]\/]/.test(k)) bad.push(k); })));
    check(bad.length === 0, 'Mọi khoá tiến độ hợp lệ với Firebase (không chứa . # $ [ ] /)', bad.join(', '));
    const old = C.Storage.normalizeProgress({ perWord: { 'business_actions::fill out/in': { box: 3, correct: 2, wrong: 0, lastReviewed: 1 } }, perTopic: {} });
    check(!Object.keys(old.perWord).some((k) => k.indexOf('/') >= 0) && old.perWord['business_actions::fill out_in'], 'Dữ liệu cũ có khoá lỗi được tự sửa khi tải');
    // Merge keeps every word's best state and both histories.
    const a = { xp: 100, perWord: { x: { box: 2, correct: 1, wrong: 0, lastReviewed: 5 } }, perTopic: {}, history: [{ ts: 1 }], badges: ['a'] };
    const b = { xp: 80, perWord: { x: { box: 4, correct: 3, wrong: 1, lastReviewed: 9 }, y: { box: 1, correct: 0, wrong: 1, lastReviewed: 3 } }, perTopic: {}, history: [{ ts: 2 }], badges: ['b'] };
    const m = C.Storage.mergeProgress(C.Storage.normalizeProgress(a), C.Storage.normalizeProgress(b));
    check(m.perWord.x.box === 4 && m.perWord.y && m.history.length === 2 && m.xp === 100 && m.badges.length === 2, 'Gộp tiến độ 2 thiết bị không mất từ / lịch sử');
    // Streak shows 0 once broken.
    const P = C.Progress;
    check(P.effectiveStreak({ streak: 7, lastActiveDate: '2020-01-01' }) === 0 && P.effectiveStreak({ streak: 3, lastActiveDate: P.todayStr() }) === 3, 'Chuỗi ngày về 0 khi đã bỏ học');
    // Interview keyword matching.
    const q = { keywords: ['personality|hard-working', 'reason|because|as', 'team|group'] };
    const r1 = C.InterviewGame.scoreAnswer(q, 'I am hard-working', null);
    check(r1.matched.indexOf('personality') >= 0, 'Từ khoá có gạch nối (hard-working) được nhận');
    const r2 = C.InterviewGame.scoreAnswer(q, 'it was a steam train', null);
    check(r2.matched.length === 0, 'Không khớp nhầm giữa chừng từ ("as" trong "was", "team" trong "steam")', r2.matched.join(','));
    check(C.InterviewGame.scoreAnswer(q, 'I like people and I like service', null).fillerCount === 0, '"like" dùng bình thường không bị tính là từ đệm');
    check(C.InterviewGame.scoreAnswer(q, '   ', 0.9).total === 0, 'Xoá hết câu trả lời → 0 điểm');
    // Drill scoring.
    const D = C.PronDrill.scorePhrase;
    const tgt = 'Please fasten your seatbelt.';
    check(D(tgt, 'please fasten your seatbelt and also some other words that are not part of the sentence at all really').score < 7, 'Đọc thêm nhiều từ thừa → bị trừ điểm');
    check(D(tgt, 'seatbelt your fasten please').score < 7, 'Đọc sai thứ tự → bị trừ điểm');
    check(D('Your seat is in row twenty.', 'your seat is in row 20').score === 10, 'Số dạng chữ số ("row 20") vẫn 10/10');
    check(D('Your seat is fifteen C.', 'your seat is 15C').score === 10, '"15C" khớp "fifteen C"');
    // Typo detector: real country domains are not flagged.
    check(['a@hotmail.fr', 'a@yahoo.co.uk', 'a@yahoo.fr', 'a@love.com'].every((e) => !C.Accounts.suggestEmail(e)), 'Email quốc gia hợp lệ (hotmail.fr, yahoo.co.uk) không bị báo nhầm');
    // Local dates (run with TZ=Asia/Ho_Chi_Minh).
    const S = C.Placement.Schedule;
    const now = new Date();
    const dayKey = C.Placement.DAY_KEYS[now.getDay()];
    const today = P.todayStr();
    const st = S.todayState({ schedule: { days: [dayKey], time: '00:00', minutes: 20 }, history: [{ date: today, ts: Date.now() }] });
    check(st && st.studied === true, 'Lịch học: đã học hôm nay được nhận đúng theo giờ Việt Nam');
    const ms = S.missedThisWeek({ schedule: { days: [dayKey], time: '00:00' }, history: [{ date: today, ts: Date.now() }] });
    check(ms.missed === 0, 'Không báo nhầm "bỏ buổi" khi đã học đúng ngày');
    // Placement options distinct in both languages.
    let dupOpt = 0;
    for (let i = 0; i < 20; i++) {
      C.Placement.__buildVocab && C.Placement.__buildVocab({ easy: 4, medium: 8, hard: 8 }, 'toeic').forEach((qq) => {
        const vis = qq.options.map((o) => String(o.vi).toLowerCase());
        if (new Set(vis).size !== vis.length) dupOpt += 1;
      });
    }
    check(!!C.Placement.__buildVocab && dupOpt === 0, 'Bài test: 4 phương án luôn khác nghĩa nhau', String(dupOpt));
  });
};
