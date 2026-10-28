// Browser QC flows (Playwright + Chromium, fake Firebase, fake microphone).
'use strict';
const path = require('path');
const { area, check, safe, startServer, fakeFirebaseSource, I18N_SPY } = require('./lib');

let playwright;
try { playwright = require('playwright'); } catch (e) {
  try { playwright = require('/opt/node-tools/node_modules/playwright'); } catch (e2) { playwright = null; }
}

const DAY = 86400000;
const TEACHER = { uid: 'teach1', email: 'lemytrinh1801@gmail.com' };
const STUDENT = { uid: 'stud1', email: 'hocvien@gmail.com' };
const DEMO = { uid: 'demo1', email: 'demo@vocabquest.app' };

// Fake microphone: SpeechRecognition that "hears" window.__say (or the
// on-screen target via window.__sayFrom selector) with high confidence.
const FAKE_MIC = `(() => {
  class FakeSR {
    constructor() { this.lang = 'en-US'; this.continuous = false; this.interimResults = false; window.__mics = (window.__mics || 0) + 1; }
    start() {
      window.__micOn = (window.__micOn || 0) + 1;
      setTimeout(() => {
        let text = window.__say || '';
        if (!text && window.__sayFrom) { const el = document.querySelector(window.__sayFrom); text = el ? el.textContent.replace(/🔊/g, '').trim() : ''; }
        const alt = { transcript: text, confidence: 0.92 };
        const res = [alt]; res.isFinal = true;
        const results = [res];
        try { this.onresult && this.onresult({ resultIndex: 0, results }); } catch (e) { window.__micErr = String(e); }
        setTimeout(() => { if (!this._stopped) { this._stopped = true; window.__micOn -= 1; this.onend && this.onend(); } }, 50);
      }, 120);
    }
    stop() { if (!this._stopped) { this._stopped = true; window.__micOn -= 1; setTimeout(() => this.onend && this.onend(), 10); } }
    abort() { this.stop(); }
  }
  window.SpeechRecognition = FakeSR; window.webkitSpeechRecognition = FakeSR;
  window.speechSynthesis = window.speechSynthesis || { speak() {}, cancel() {}, getVoices() { return []; }, addEventListener() {} };
  try { window.speechSynthesis.speak = () => {}; } catch (e) {}
})();`;

function vocabUsers(now) {
  const pw = (topic, n, box) => { const o = {}; for (let i = 0; i < n; i++) o[topic + '::w' + i] = { box: box || 2, correct: 2, wrong: 1, lastReviewed: now - DAY }; return o; };
  const hist = (n) => Array.from({ length: n }, (_, i) => ({ date: new Date(now - i * DAY).toISOString().slice(0, 10), ts: now - i * DAY, mode: 'quiz', topic: 'intro_people', correct: 7, wrong: 3, xp: 40 }));
  return {
    teach1: { profile: { id: 'teach1', name: 'Cô Trinh', email: TEACHER.email, createdAt: now - 200 * DAY }, progress: {}, updatedAt: now },
    s_minh: { profile: { id: 's_minh', name: 'Minh <b>XSS</b>', email: 'minh@gmail.com', avatar: '🦊', createdAt: now - 60 * DAY }, progress: { xp: 900, level: 4, streak: 3, perWord: pw('intro_people', 25), perTopic: { intro_people: { attempts: 6, correct: 40, wrong: 20, lastPlayedAt: now - DAY } }, history: hist(6) }, updatedAt: now - DAY },
    s_lan: { profile: { id: 's_lan', name: 'Lan', email: 'lan@gmial.com', createdAt: now - 40 * DAY }, progress: { xp: 100, perWord: pw('food_restaurants', 5, 1) }, updatedAt: now - 20 * DAY },
    s_lan2: { profile: { id: 's_lan2', name: 'Lan', email: 'lan@gmail.com', createdAt: now - 5 * DAY }, progress: { xp: 20 }, updatedAt: now - 2 * DAY },
    s_new: { profile: { id: 's_new', name: 'Hoa', email: 'hoa@gmail.com', createdAt: now - DAY }, progress: {}, updatedAt: now - DAY },
  };
}

module.exports = async function runE2E() {
  area('Trình duyệt: khởi động');
  if (!playwright) { check(false, 'Có Playwright để chạy test trình duyệt', 'npm i -D playwright'); return; }
  const { srv, url } = await startServer();
  let browser;
  try {
    browser = await playwright.chromium.launch();
  } catch (e) {
    check(false, 'Mở được Chromium', e.message.split('\n')[0]);
    srv.close();
    return;
  }

  // One page per scenario; collects JS errors and untranslated keys.
  async function openApp(opts) {
    const o = Object.assign({ user: null, data: {}, viewport: { width: 1200, height: 900 }, lang: 'vi' }, opts);
    const page = await browser.newPage({ viewport: o.viewport, acceptDownloads: true });
    const errs = [];
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|favicon/.test(m.text())) errs.push('console: ' + m.text()); });
    page.on('dialog', (d) => d.accept());
    await page.addInitScript(I18N_SPY);
    await page.addInitScript(FAKE_MIC);
    await page.addInitScript(`try { localStorage.setItem('vlt_lang', '${o.lang}'); } catch (e) {}`);
    // Offline by design: anything not served by the local QC server is
    // blocked (registered first = lowest priority), then the Firebase SDK
    // URLs are answered with the fake SDK.
    await page.route((u) => !u.href.startsWith(url), (r) => r.abort());
    await page.route(/firebase-app-compat/,(r) => r.fulfill({ contentType: 'application/javascript', body: fakeFirebaseSource({ user: o.user, data: o.data, failCreate: o.failCreate }) }));
    await page.route(/firebase-(auth|database)-compat|accounts\.google\.com|fonts\.googleapis/, (r) => r.fulfill({ contentType: 'application/javascript', body: '' }));
    await page.goto(url + '/index.html');
    await page.waitForTimeout(700);
    page.__errs = errs;
    return page;
  }
  async function finishPage(page, label) {
    const missing = await page.evaluate(() => Array.from(window.__missingKeys || []));
    check(missing.length === 0, label + ': không có chữ hiển thị dạng mã (thiếu bản dịch)', missing.join(', '));
    check(page.__errs.length === 0, label + ': không có lỗi JavaScript', page.__errs.slice(0, 5).join(' | '));
    await page.close();
  }
  const nav = (page, view, params) => page.evaluate(([v, p]) => App.navigate(v, p), [view, params || null]);
  const text = (page, sel) => page.locator(sel).first().textContent().catch(() => '');
  const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

  // Play any game mode to the result screen. Returns true if it finished.
  async function playGame(page, mode) {
    for (let step = 0; step < 60; step++) {
      if (await page.locator('.game-result').count()) return true;
      if (mode === 'flashcard') {
        if (await page.locator('#good').count()) await page.click('#good'); else await page.click('#card');
      } else if (mode === 'quiz') {
        const next = page.locator('#nextBtn');
        if (await next.count()) { await next.click(); continue; }
        const opt = page.locator('.quiz-option:not([disabled])').first();
        if (await opt.count()) await opt.click();
        await page.waitForTimeout(80);
      } else if (mode === 'typing') {
        const next = page.locator('#nextBtn');
        if (await next.count()) { await next.click(); continue; }
        if (await page.locator('#typingInput').count()) { await page.fill('#typingInput', 'qc'); await page.click('#submitBtn'); }
        await page.waitForTimeout(80);
      } else if (mode === 'matching') {
        const left = page.locator('.match-card[data-side="en"]:not(.matched):not([disabled])').first();
        if (!(await left.count())) { await page.waitForTimeout(700); continue; }
        const en = await left.getAttribute('data-en');
        await left.click();
        await page.locator('.match-card[data-side="vi"][data-en="' + en.replace(/"/g, '\\"') + '"]').first().click();
        await page.waitForTimeout(150);
      } else if (mode === 'speaking') {
        const next = page.locator('#nextBtn');
        if (await next.count()) { await next.click(); continue; }
        await page.evaluate(() => { window.__say = ''; window.__sayFrom = '.speak-en'; });
        if (await page.locator('#micBtn').count()) await page.click('#micBtn');
        await page.waitForTimeout(450);
      }
      await page.waitForTimeout(60);
    }
    return !!(await page.locator('.game-result').count());
  }

  // =============== 1. Đăng ký / đăng nhập ===============
  await safe('auth', async () => {
    area('Đăng ký / đăng nhập');
    const page = await openApp({ user: null, failCreate: true });
    check(await page.locator('#authForm').count() === 1, 'Chưa đăng nhập → hiện màn đăng nhập');
    await page.click('.auth-tab[data-mode="signup"]');
    await page.fill('#authName', 'QC');
    await page.fill('#authEmail', 'qc@gmial.com');
    await page.fill('#authPassword', '123456');
    await page.click('#submitAuthBtn');
    check(/gmail\.com/.test(await text(page, '#authError')), 'Email gõ nhầm bị chặn + gợi ý sửa');
    await page.click('#authError button >> nth=0');
    await page.click('#submitAuthBtn');
    await page.waitForTimeout(200);
    check(await page.locator('#authError button').count() === 2, 'Email đã có tài khoản → nút Đăng nhập / Quên mật khẩu');
    await page.click('#authError button >> nth=1');
    await page.waitForTimeout(300);
    const calls = await page.evaluate(() => window.__resetCalls);
    check(calls.length === 1 && calls[0][0] === 'qc@gmail.com', 'Quên mật khẩu gửi đúng email đã sửa');
    check(!(await page.locator('#authInfo').isHidden()), 'Hiện hướng dẫn kiểm tra Spam sau khi gửi');
    await page.fill('#authPassword', 'wrongpass');
    await page.click('#submitAuthBtn');
    await page.waitForTimeout(200);
    check(/Quên mật khẩu/.test(await text(page, '#authError')), 'Sai mật khẩu → nhắc dùng Quên mật khẩu');
    await page.fill('#authPassword', '123456');
    await page.click('#submitAuthBtn');
    await page.waitForTimeout(1200);
    check(await page.locator('.topic-card').count() > 0, 'Đăng nhập thành công → vào trang Chủ đề');
    await finishPage(page, 'Đăng nhập');
  });

  // =============== 2. Học viên: học từ vựng ===============
  await safe('student vocab', async () => {
    area('Học viên: chủ đề & 5 trò chơi');
    const page = await openApp({ user: STUDENT, data: { users: {} } });
    const cards = await page.locator('.topic-card').count();
    check(cards >= 20, 'Trang Chủ đề hiện đủ chủ đề (' + cards + ')');
    await page.locator('.topic-card').first().click();
    await page.waitForTimeout(200);
    check(await page.locator('.learn-summary').count() === 1, 'Trang chủ đề có dòng Đã học / Chưa học / Cần ôn');
    const topicId = await page.evaluate(() => (history.state && history.state.params && history.state.params.topicId));
    for (const mode of ['flashcard', 'quiz', 'typing', 'matching', 'speaking']) {
      await nav(page, 'topic', { topicId });
      await page.click('.mode-card[data-mode="' + mode + '"]');
      await page.waitForTimeout(150);
      const done = await playGame(page, mode);
      check(done, 'Chơi hết 1 lượt "' + mode + '" → ra màn kết quả');
      if (done) {
        const score = await text(page, '.grade-score');
        check(/\d/.test(score), '"' + mode + '": có điểm /10 (' + score.trim() + ')');
      }
    }
    const mic = await page.evaluate(() => window.__micOn || 0);
    check(mic <= 0, 'Micro được tắt sau khi rời trò Đọc & Chấm', 'mic còn bật: ' + mic);
    const p = await page.evaluate(() => Storage.getProgress());
    check(p.xp > 0 && Object.keys(p.perWord).length >= 10 && p.history.length === 5, 'Tiến độ được lưu: XP, từ đã học, 5 lượt chơi', 'xp=' + p.xp + ' words=' + Object.keys(p.perWord).length + ' hist=' + p.history.length);
    // first quiz must have tested flashcard words
    const learnedFirst = p.history.length >= 2;
    check(learnedFirst, 'Lịch sử ghi đủ các lượt');
    await page.waitForTimeout(1700); // debounce cloud push
    const cloud = await page.evaluate(() => (window.__fakeDb.users && window.__fakeDb.users.stud1) || null);
    check(cloud && cloud.progress && cloud.progress.xp === p.xp, 'Tiến độ được đồng bộ lên cloud', cloud ? 'cloud xp=' + (cloud.progress || {}).xp : 'no row');
    // Language toggle on a page that needs params (used to crash)
    await nav(page, 'topic', { topicId });
    await page.click('#langToggle');
    await page.waitForTimeout(200);
    check(await page.locator('.learn-summary').count() === 1 && /Learned/.test(await text(page, '.learn-summary')), 'Đổi sang tiếng Anh ngay trên trang chủ đề không lỗi');
    await page.click('#langToggle');
    await page.waitForTimeout(150);
    // Back from the first screen after sign-in never shows the login form
    await page.goBack(); await page.waitForTimeout(150);
    await page.goBack(); await page.waitForTimeout(150);
    check(await page.locator('#authForm').count() === 0, 'Đang đăng nhập: bấm Back không quay về màn đăng nhập');
    // Back button stays in the app
    await nav(page, 'progress');
    await nav(page, 'toeic');
    await page.goBack();
    await page.waitForTimeout(300);
    check(page.url().startsWith(url) && await page.locator('.progress-grid, .stats-grid, .view').count() > 0, 'Nút Back của trình duyệt quay về màn trước trong app');
    await finishPage(page, 'Học viên');
  });

  // =============== 3. Tiến độ, test đầu vào, lịch học ===============
  await safe('placement', async () => {
    area('Học viên: test đầu vào, lộ trình, lịch học');
    const page = await openApp({ user: STUDENT, data: { users: {} } });
    await nav(page, 'progress');
    await page.waitForTimeout(200);
    check(await page.locator('[data-test-track], #plGo').count() > 0, 'Tab Tiến độ có nút làm test');
    for (const track of ['toeic', 'conversation']) {
      await nav(page, 'placement', { track });
      await page.waitForTimeout(150);
      let guard = 0;
      while (guard++ < 80) {
        if (await page.locator('#plDone').count()) break;
        const opt = page.locator('#app [data-i], #app button[data-en]');
        if (await opt.count()) { await opt.first().click(); await page.waitForTimeout(60); continue; }
        if (await page.locator('#plText').count()) {
          await page.fill('#plText', 'My name is Lan. I am twenty years old and I love travelling because I want to meet people and learn about new cultures. In my free time I read books.');
          await page.click('#plSubmit');
          await page.waitForTimeout(150);
          continue;
        }
        const nextLike = page.locator('button.btn:not(#plExit)').first();
        if (await nextLike.count()) { await nextLike.click(); await page.waitForTimeout(80); } else break;
      }
      const hasResult = await page.locator('#plDone').count();
      check(hasResult, 'Làm hết bài test "' + track + '" → có kết quả');
      const res = await page.evaluate((tr) => (Storage.getProgress().placements || {})[tr] || null, track);
      check(res && ['A2', 'B1', 'B2'].includes(res.level), 'Bài "' + track + '": lưu trình độ (' + (res && res.level) + ')');
      if (hasResult) await page.click('#plDone');
      await page.waitForTimeout(200);
    }
    const rm = await page.evaluate(() => Storage.getProgress().roadmap);
    check(rm && rm.weeks.length === 4, 'Có lộ trình 4 tuần');
    check(await page.locator('[data-go]').count() >= 8, 'Lộ trình hiện các bài học bấm được');
    await page.locator('[data-go]').first().click();
    await page.waitForTimeout(250);
    check(await page.locator('.view').count() > 0, 'Bấm bài trong lộ trình mở đúng bài');
    await nav(page, 'progress');
    await page.click('#schEdit');
    await page.click('.sch-day[data-day="tue"]');
    await page.click('.sch-day[data-day="thu"]');
    await page.click('#schSave');
    await page.waitForTimeout(200);
    const sch = await page.evaluate(() => Storage.getProgress().schedule);
    check(sch && sch.days.length === 2, 'Lưu lịch học (T3, T5)');
    const dl = page.waitForEvent('download', { timeout: 3000 }).catch(() => null);
    await page.click('#schEdit');
    await page.click('#schIcs');
    const file = await dl;
    check(file && /\.ics$/.test(file.suggestedFilename()), 'Tải được file lịch .ics');
    await finishPage(page, 'Tiến độ');
  });

  // =============== 4. TOEIC ===============
  await safe('toeic', async () => {
    area('Học viên: TOEIC');
    const page = await openApp({ user: STUDENT, data: { users: {} } });
    await nav(page, 'toeic');
    await page.waitForTimeout(200);
    const parts = await page.evaluate(() => TOEIC.EDITIONS.length * TOEIC.PARTS.length);
    let opened = 0;
    for (const ed of await page.evaluate(() => TOEIC.EDITIONS.map((e) => e.id))) {
      for (const pt of await page.evaluate(() => TOEIC.PARTS.map((p) => p.id))) {
        await nav(page, 'toeic-part', { editionId: ed, partId: pt });
        if (await page.locator('.word-row').count() > 0 && await page.locator('.learn-summary').count()) opened += 1;
      }
    }
    check(opened === parts, 'Mở được mọi bộ đề × Part (' + opened + '/' + parts + ')');
    await page.click('.mode-card[data-mode="quiz"]');
    check(await playGame(page, 'quiz'), 'Chơi 1 lượt TOEIC đến hết');
    const tp = await page.evaluate(() => Object.keys(Storage.getProgress().perTopic).filter((k) => k.indexOf('toeic_') === 0));
    check(tp.length >= 1, 'Tiến độ TOEIC được lưu');
    await finishPage(page, 'TOEIC');
  });

  // =============== 4b. Học theo phần (ETS 2026 · Part 1, 78 từ) ===============
  await safe('chunks', async () => {
    area('Học viên: học theo phần');
    const page = await openApp({ user: STUDENT, data: { users: {} } });
    await nav(page, 'toeic-part', { editionId: '2026', partId: 'part1' });
    await page.waitForTimeout(250);
    const all = await page.evaluate(() => TOEIC.allWordsInPart('2026', 'part1').map((w) => w.en));
    const cards = await page.locator('.chunk-card').count();
    check(cards === Math.ceil(all.length / 10), 'Trang Part hiện ' + cards + ' phần cho ' + all.length + ' từ');
    check(/Phần 1/.test(await text(page, '.chunk-card.current')), 'Phần gợi ý hiện tại là Phần 1');
    // Learn part 2 (words 11–20)
    await page.click('[data-chunk="1"][data-cmode="flashcard"]');
    await page.waitForTimeout(150);
    const seenCards = [];
    for (let i = 0; i < 12 && !(await page.locator('.game-result').count()); i++) {
      seenCards.push((await text(page, '.big-word')).replace('🔊', '').trim());
      await page.click('#card'); await page.click('#good'); await page.waitForTimeout(60);
    }
    const want = all.slice(10, 20);
    check(seenCards.length === 10 && seenCards.every((w) => want.indexOf(w) >= 0), 'Học Phần 2 → đúng 10 từ số 11–20', seenCards.join(', '));
    check(/Kiểm tra phần 2/.test(await text(page, '#partNextBtn')), 'Học xong → nút "Kiểm tra phần 2"');
    await page.click('#partNextBtn');
    await page.waitForTimeout(150);
    const asked = await page.evaluate(() => { const q = document.querySelector('.quiz-question, .quiz-prompt, .game-view'); return q ? q.textContent : ''; });
    // Answer every question correctly by matching data-en against the part.
    let qn = 0;
    const askedWords = [];
    for (let i = 0; i < 40 && !(await page.locator('.game-result').count()); i++) {
      if (await page.locator('#nextBtn').count()) { await page.click('#nextBtn'); continue; }
      const opts = await page.locator('.quiz-option').evaluateAll((els) => els.map((e) => e.getAttribute('data-en')));
      if (!opts.length) { await page.waitForTimeout(100); continue; }
      const hit = opts.find((e) => want.indexOf(e) >= 0 && !askedWords.includes(e) && opts.filter((x) => want.indexOf(x) >= 0).length === 1) || opts.find((e) => want.indexOf(e) >= 0);
      askedWords.push(hit);
      await page.locator('.quiz-option[data-en="' + hit.replace(/"/g, '\\"') + '"]').first().click();
      qn += 1;
      await page.waitForTimeout(80);
    }
    void asked;
    check(qn === 10, 'Kiểm tra Phần 2 hỏi đủ 10 câu', String(qn));
    const rec = await page.evaluate(() => ((Storage.getProgress().perTopic.toeic_2026_part1 || {}).chunkTests || {}).c1 || null);
    check(rec && rec.total === 10, 'Lưu kết quả kiểm tra Phần 2 (' + (rec ? rec.correct + '/' + rec.total : '—') + ')');
    await page.click('#backToTopicBtn');
    await page.waitForTimeout(200);
    const chip = await text(page, '.chunk-card:nth-child(2) .chunk-chip');
    check(/Đạt|Kiểm tra/.test(chip), 'Thẻ Phần 2 hiện kết quả kiểm tra: ' + chip.trim());
    check(/^1$/.test((await text(page, '.word-num')).trim()), 'Danh sách từ có số thứ tự khớp với các phần');
    await finishPage(page, 'Học theo phần');
  });

  // =============== 5. Phỏng vấn + luyện phát âm ===============
  await safe('interview', async () => {
    area('Phỏng vấn tiếp viên & luyện IPA');
    const page = await openApp({ user: STUDENT, data: { users: {}, feature_flags: { stud1: { interview: true } } } });
    await page.waitForTimeout(400);
    check(await page.locator('#navInterview').isVisible(), 'Học viên được bật quyền → thấy menu Phỏng vấn');
    for (const al of ['vietjet', 'vna', 'sunphuquoc']) {
      await nav(page, 'interview');
      await page.waitForTimeout(150);
      await page.click('[data-airline="' + al + '"]');
      await page.waitForTimeout(150);
      check(await page.locator('[data-sec]').count() === 7, al + ': chọn được 7 phần thi');
    }
    await page.locator('[data-sec]').first().click();
    await page.click('#secStart');
    await page.waitForTimeout(200);
    let answered = 0;
    for (let i = 0; i < 40; i++) {
      if (await page.locator('#ivExitEnd, #ivAgain').count()) break;
      if (await page.locator('#ivNext').count()) { await page.click('#ivNext'); await page.waitForTimeout(150); continue; }
      if (await page.locator('#ivText').count()) {
        await page.fill('#ivText', 'Good morning. My name is Lan, I am 22 years old and I graduated from university. I have worked in customer service, I am friendly and hard-working and my dream is to fly.');
        await page.click('#ivSubmit');
        answered += 1;
        await page.waitForTimeout(250);
        continue;
      }
      await page.waitForTimeout(150);
    }
    check(answered >= 1 && await page.locator('#ivExitEnd, #ivAgain').count() > 0, 'Trả lời hết một phần thi → có tổng kết (' + answered + ' câu)');
    const iv = await page.evaluate(() => Storage.getProgress().history.filter((h) => h.mode === 'interview').length);
    check(iv >= 1, 'Buổi phỏng vấn được lưu vào lịch sử');
    // IPA drill
    await nav(page, 'drill');
    await page.waitForTimeout(150);
    check(await page.locator('[data-set]').count() >= 5, 'Luyện IPA: có ≥ 5 bộ câu');
    await page.locator('[data-set]').first().click();
    await page.waitForTimeout(150);
    await page.evaluate(() => { window.__say = ''; window.__sayFrom = '#pdTarget .pd-en, #pdTarget'; });
    const target = await text(page, '#pdTarget');
    await page.evaluate((t) => { window.__sayFrom = null; window.__say = t.split('\n')[0]; }, (await page.evaluate(() => PRON_DRILL.SETS[0].items[0].en)));
    await page.click('#pdMic');
    await page.waitForTimeout(700);
    const fb = await text(page, '#pdFeedback');
    check(/10/.test(fb), 'Đọc đúng câu mẫu → 10/10', fb.slice(0, 80) + ' | target=' + target.slice(0, 40));
    // Custom sentence: must not run HTML
    await nav(page, 'drill');
    await page.click('#pdCustom');
    await page.fill('#pdCustomText', '<img src=x onerror="window.__xss=1">Hello world');
    await page.click('#pdCustomStart');
    await page.waitForTimeout(300);
    check(!(await page.evaluate(() => window.__xss)), 'Câu tự nhập có mã HTML không bị chạy (an toàn)');
    await finishPage(page, 'Phỏng vấn/IPA');

    const p2 = await openApp({ user: { uid: 'stud2', email: 'x@gmail.com' }, data: { users: {} } });
    await p2.waitForTimeout(400);
    check(!(await p2.locator('#navInterview').isVisible()), 'Học viên chưa bật quyền → không thấy menu Phỏng vấn');
    await nav(p2, 'interview');
    await p2.waitForTimeout(300);
    check(await p2.locator('[data-airline]').count() === 0, 'Chưa có quyền: mở Phỏng vấn từ lộ trình/link vẫn bị chặn');
    await finishPage(p2, 'Phỏng vấn (khóa)');
  });

  // =============== 6. Giáo viên ===============
  await safe('teacher', async () => {
    area('Giáo viên: lớp học, học phí, điểm danh');
    const now = Date.now();
    const data = { users: vocabUsers(now), teachers: { teach1: true }, billing: {}, groups: {}, billing_settings: {}, merges: {} };
    const page = await openApp({ user: TEACHER, data });
    await page.waitForTimeout(300);
    check(await page.locator('.nav-btn[data-view-link="class"]').isVisible(), 'Giáo viên thấy tab Lớp học');
    await nav(page, 'class');
    await page.waitForSelector('.progress-table', { timeout: 4000 }).catch(() => {});
    const rows = await page.locator('.progress-table tbody tr').count();
    check(rows === 4, 'Danh sách có đủ 4 học viên (không tính tài khoản giáo viên)', String(rows));
    check(await page.evaluate(() => !document.querySelector('#classContent b')), 'Tên học viên có mã HTML được hiển thị an toàn');
    const firstRow = await text(page, '.progress-table tbody tr td:nth-child(2)');
    check(/Hoa/.test(firstRow), 'Sắp xếp: học viên đăng nhập lần đầu gần nhất đứng đầu', firstRow);
    check(await page.locator('.dup-card').count() === 1, 'Phát hiện tài khoản trùng (Lan)');
    await page.locator('.progress-table tbody tr').nth(1).click();
    await page.waitForTimeout(200);
    check(await page.locator('.student-detail').count() === 1, 'Mở chi tiết học viên');
    await page.click('#closeDetail');
    const dl = page.waitForEvent('download', { timeout: 3000 }).catch(() => null);
    await page.click('#exportClassBtn');
    check(!!(await dl), 'Xuất CSV danh sách lớp');

    // Billing
    await page.click('.class-tabs .auth-tab[data-tab="billing"]');
    await page.waitForTimeout(300);
    check(await page.locator('#newGroupBtn').count() === 1, 'Mở tab Học phí');
    await page.click('#newGroupBtn');
    await page.fill('#gName', 'Nhóm QC');
    await page.fill('#gRate', '150000');
    await page.click('.modal .day-chip[data-day="tue"]');
    await page.fill('#gTimeInputs input[data-day="tue"]', '19:30');
    await page.locator('#memberList input[type="checkbox"]').first().check();
    await page.click('#saveGroupBtn');
    await page.waitForTimeout(300);
    const g = await page.evaluate(() => Object.values(window.__fakeDb.groups || {})[0]);
    check(g && g.name === 'Nhóm QC' && g.schedule.tue === '19:30' && Object.keys(g.members).length === 1, 'Tạo nhóm: tên, giá, lịch, thành viên');
    // configure 1-1 for an unconfigured student
    await page.locator('[data-act="plan"]').first().click();
    await page.waitForTimeout(150);
    await page.fill('#rateInput', '200000');
    await page.click('.modal .day-chip[data-day="mon"]');
    await page.fill('#timeInputs input[data-day="mon"]', '18:00');
    await page.click('#savePlanBtn');
    await page.waitForTimeout(300);
    const plans = await page.evaluate(() => Object.entries(window.__fakeDb.billing || {}).filter(([, b]) => b.plan && b.plan.type === '1v1'));
    check(plans.length === 1 && plans[0][1].schedule.mon === '18:00' && plans[0][1].plan.ratePerSession === 200000, 'Cấu hình học phí 1-1 (giá + lịch)');
    const uid1 = plans[0] && plans[0][0];
    await page.locator('tr[data-uid="' + uid1 + '"] [data-act="pay"]').click();
    await page.waitForTimeout(150);
    await page.click('#addPayBtn');
    await page.waitForTimeout(300);
    const paid = await page.evaluate((u) => Object.values((window.__fakeDb.billing[u] || {}).payments || {}), uid1);
    check(paid.length === 1 && paid[0].sessions === 8 && paid[0].amount === 1600000, 'Ghi đóng tiền: 8 buổi = 1.600.000đ');
    check(/1\.600\.000/.test(await text(page, '#classContent')), 'Tổng quan thu nhập hiện số tiền vừa thu');
    // Attendance
    await page.click('.class-tabs .auth-tab[data-tab="attendance"]');
    await page.waitForTimeout(300);
    // pick a Monday so the 1-1 student is listed
    const monday = await page.evaluate(() => { const d = new Date(); while (d.getDay() !== 1) d.setDate(d.getDate() + 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
    await page.fill('#attDate', monday);
    await page.dispatchEvent('#attDate', 'change');
    await page.waitForTimeout(200);
    const btn = page.locator('.att-btn[data-uid="' + uid1 + '"][data-st="absent"]');
    check(await btn.count() === 1, 'Ngày thứ 2: học viên 1-1 có lịch hiện trong điểm danh');
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(300);
      const rec = await page.evaluate(([u, d]) => ((window.__fakeDb.billing[u] || {}).attendance || {})[d], [uid1, monday]);
      check(rec && rec.status === 'absent' && rec.counted === false, '1-1 vắng → không trừ buổi');
      await page.locator('.att-btn[data-uid="' + uid1 + '"][data-st="present"]').click();
      await page.waitForTimeout(300);
      const rec2 = await page.evaluate(([u, d]) => ((window.__fakeDb.billing[u] || {}).attendance || {})[d], [uid1, monday]);
      check(rec2 && rec2.counted === true, 'Có mặt → trừ 1 buổi');
    }
    const tuesday = await page.evaluate(() => { const d = new Date(); while (d.getDay() !== 2) d.setDate(d.getDate() + 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
    await page.fill('#attDate', tuesday);
    await page.dispatchEvent('#attDate', 'change');
    await page.waitForTimeout(200);
    const gBtn = page.locator('.att-btn[data-st="absent"]').first();
    if (await gBtn.count()) {
      const gu = await gBtn.getAttribute('data-uid');
      await gBtn.click();
      await page.waitForTimeout(300);
      const r = await page.evaluate(([u, d]) => ((window.__fakeDb.billing[u] || {}).attendance || {})[d], [gu, tuesday]);
      check(r && r.counted === true, 'Nhóm vắng → vẫn trừ buổi');
    } else check(false, 'Ngày thứ 3: nhóm có lịch hiện trong điểm danh');
    // Group ↔ plan stay in sync: move the group member to 1-1, then delete the group.
    await page.click('.class-tabs .auth-tab[data-tab="billing"]');
    await page.waitForTimeout(300);
    const gm = await page.evaluate(() => { const g = Object.entries(window.__fakeDb.groups || {})[0]; return g ? { gid: g[0], uid: Object.keys(g[1].members || {})[0] } : null; });
    if (gm && gm.uid) {
      await page.locator('tr[data-uid="' + gm.uid + '"] [data-act="plan"]').click();
      await page.waitForTimeout(150);
      await page.click('.modal .type-pill[data-type="1v1"]');
      await page.fill('#rateInput', '250000');
      await page.click('#savePlanBtn');
      await page.waitForTimeout(400);
      const after = await page.evaluate((x) => ({ members: Object.keys(((window.__fakeDb.groups || {})[x.gid] || {}).members || {}), plan: ((window.__fakeDb.billing || {})[x.uid] || {}).plan }), gm);
      check(after.members.indexOf(gm.uid) < 0 && after.plan && after.plan.type === '1v1', 'Chuyển học viên từ nhóm sang 1-1 → tự rời danh sách nhóm');
      // Put them back in, then delete the group: plan must be cleared.
      await page.locator('.group-card').first().click();
      await page.waitForTimeout(150);
      await page.click('.modal .flt[data-f="all"]');
      await page.locator('#memberList input[data-uid="' + gm.uid + '"]').check();
      await page.click('#saveGroupBtn');
      await page.waitForTimeout(400);
      await page.locator('.group-card').first().click();
      await page.waitForTimeout(150);
      await page.click('#delGroupBtn');
      await page.waitForTimeout(400);
      const del = await page.evaluate((x) => ({ g: (window.__fakeDb.groups || {})[x.gid] || null, plan: ((window.__fakeDb.billing || {})[x.uid] || {}).plan || null }), gm);
      check(!del.g && !del.plan, 'Xoá nhóm → thành viên về "chưa cấu hình", không trỏ vào nhóm đã xoá');
    } else check(false, 'Có nhóm để kiểm tra đồng bộ thành viên');
    // Calendar panel present (not connecting: needs real Google)
    await page.click('.class-tabs .auth-tab[data-tab="billing"]');
    await page.waitForTimeout(300);
    check(await page.locator('.gcal-card').count() === 1, 'Khối Google Calendar hiện trong tab Học phí');
    // Merge duplicate
    await page.click('.class-tabs .auth-tab[data-tab="progress"]');
    await page.waitForTimeout(400);
    if (await page.locator('.dup-card button').count()) {
      await page.locator('.dup-card button').first().click();
      await page.waitForTimeout(500);
      check(await page.locator('.progress-table tbody tr').count() === 3, 'Gộp tài khoản trùng → còn 3 học viên');
    }
    // Teacher interview question bank
    await nav(page, 'interview');
    await page.waitForTimeout(200);
    if (await page.locator('#ivReviewBank').count()) {
      await page.click('#ivReviewBank');
      await page.waitForTimeout(200);
      const bankText = await text(page, '#app');
      check(/Tell me about yourself/.test(bankText) && !/Ý đã cóname/.test(bankText), 'Giáo viên xem được bộ câu hỏi phỏng vấn');
    } else check(false, 'Giáo viên có nút xem bộ câu hỏi phỏng vấn');
    await finishPage(page, 'Giáo viên');
  });

  // =============== 7. Tài khoản demo ===============
  await safe('demo', async () => {
    area('Tài khoản demo');
    const page = await openApp({ user: DEMO, data: { users: {} } });
    await page.waitForTimeout(600);
    const p = await page.evaluate(() => Storage.getProgress());
    check(p.xp > 0 && p.history.length > 5, 'Demo tự có dữ liệu học mẫu');
    await nav(page, 'class');
    await page.waitForTimeout(500);
    const rows = await page.locator('.progress-table tbody tr').count();
    check(rows >= 8, 'Demo: lớp học có học viên mẫu (' + rows + ')');
    await page.click('.class-tabs .auth-tab[data-tab="billing"]');
    await page.waitForTimeout(300);
    check(await page.locator('.attn-card, .progress-table').count() > 0, 'Demo: tab Học phí có dữ liệu mẫu');
    check(await page.locator('.gcal-card').count() === 0, 'Demo: không hiện kết nối Google Calendar');
    const real = await page.evaluate(() => (window.__writes || []).filter((w) => /^(billing|groups|merges)/.test(w[1] || '')).length);
    check(real === 0, 'Demo không ghi gì vào dữ liệu thật');
    await finishPage(page, 'Demo');
  });

  // =============== 8. Điện thoại 360px + tiếng Anh ===============
  await safe('mobile', async () => {
    area('Điện thoại (360px) & tiếng Anh');
    for (const lang of ['vi', 'en']) {
      const page = await openApp({ user: TEACHER, data: { users: vocabUsers(Date.now()), teachers: { teach1: true }, billing: {}, groups: {} }, viewport: { width: 360, height: 740 }, lang });
      const views = [['topics'], ['progress'], ['toeic'], ['class'], ['drill'], ['interview']];
      const overflow = [];
      for (const [v] of views) {
        await nav(page, v);
        await page.waitForTimeout(350);
        if (!(await noHScroll(page))) overflow.push(v);
      }
      const topicId = await page.evaluate(() => TOPICS[0].id);
      await nav(page, 'topic', { topicId });
      await page.waitForTimeout(150);
      if (!(await noHScroll(page))) overflow.push('topic');
      await nav(page, 'game', { topicId, mode: 'matching' });
      await page.waitForTimeout(150);
      if (!(await noHScroll(page))) overflow.push('matching');
      check(overflow.length === 0, lang.toUpperCase() + ': không bị tràn ngang ở 360px', overflow.join(', '));
      await finishPage(page, lang.toUpperCase() + ' 360px');
    }
  });

  // =============== 8b. Mạng chậm lúc đăng nhập ===============
  await safe('sync', async () => {
    area('Đồng bộ cloud khi mạng chậm');
    const now = Date.now();
    const words = {}; for (let i = 0; i < 40; i++) words['intro_people::w' + i] = { box: 3, correct: 3, wrong: 0, lastReviewed: now - DAY };
    const cloudRow = { profile: { id: 'stud1', name: 'Lan', email: STUDENT.email, createdAt: now - 90 * DAY }, progress: { xp: 5000, level: 9, perWord: words, perTopic: {}, history: [{ ts: now - DAY, date: '2026-01-01', mode: 'quiz', topic: 'intro_people', correct: 9, wrong: 1, xp: 50 }] }, updatedAt: now - DAY };
    const opts = { user: STUDENT, data: { users: { stud1: cloudRow } } };
    // The first two cloud reads fail (slow 3G), as if on a new phone.
    const p2 = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    p2.__errs = [];
    p2.on('pageerror', (e) => p2.__errs.push(e.message));
    await p2.addInitScript(I18N_SPY);
    await p2.addInitScript(FAKE_MIC);
    await p2.route((u) => !u.href.startsWith(url), (r) => r.abort());
    await p2.route(/firebase-app-compat/, (r) => r.fulfill({ contentType: 'application/javascript', body: fakeFirebaseSource(Object.assign({ failUserReads: 2 }, opts)) }));
    await p2.route(/firebase-(auth|database)-compat|accounts\.google\.com/, (r) => r.fulfill({ contentType: 'application/javascript', body: '' }));
    await p2.goto(url + '/index.html');
    await p2.waitForTimeout(700);
    // Study immediately, while the cloud read is still failing.
    const topicId = await p2.evaluate(() => TOPICS[0].id);
    await nav(p2, 'game', { topicId, mode: 'flashcard' });
    await p2.waitForTimeout(200);
    await playGame(p2, 'flashcard');
    await p2.waitForTimeout(2000);
    const during = await p2.evaluate(() => window.__fakeDb.users.stud1.progress.xp);
    check(during === 5000, 'Đang chưa tải được cloud: KHÔNG ghi đè tiến độ cũ trên cloud', 'cloud xp=' + during);
    await p2.waitForTimeout(12000); // retries at ~3s and ~9s, then push
    const after = await p2.evaluate(() => ({ cloud: window.__fakeDb.users.stud1.progress, local: Storage.getProgress('stud1') }));
    check(Object.keys(after.cloud.perWord).length >= 40 && after.cloud.xp >= 5000, 'Tải lại thành công → giữ đủ 40 từ cũ trên cloud', 'words=' + Object.keys(after.cloud.perWord).length + ' xp=' + after.cloud.xp);
    check(Object.keys(after.local.perWord).length >= 45, 'Máy học viên có cả từ cũ (cloud) lẫn từ vừa học', String(Object.keys(after.local.perWord).length));
    check(after.cloud.history.length >= 2, 'Lịch sử học cũ + mới đều được giữ');
    const prof = await p2.evaluate(() => window.__fakeDb.users.stud1.profile);
    check(prof.createdAt === cloudRow.profile.createdAt, 'Ngày đăng ký gốc không bị ghi đè');
    check(p2.__errs.length === 0, 'Không có lỗi JavaScript', p2.__errs.join(' | '));
    await p2.close();
  });

  // =============== 9. Đổi tài khoản trên cùng máy ===============
  await safe('switch', async () => {
    area('Đổi tài khoản cùng máy');
    const page = await openApp({ user: STUDENT, data: { users: {} } });
    await page.evaluate(() => { const p = Storage.getProgress(); p.xp = 777; Storage.saveProgress(p); });
    await page.waitForTimeout(1700);
    await page.evaluate(() => firebase.auth().signOut());
    await page.waitForTimeout(300);
    check(await page.locator('#authForm').count() === 1, 'Đăng xuất → về màn đăng nhập');
    await page.fill('#authEmail', 'other@gmail.com');
    await page.fill('#authPassword', '123456');
    await page.click('#submitAuthBtn');
    await page.waitForTimeout(1200);
    const xp = await page.evaluate(() => Storage.getProgress().xp || 0);
    check(xp === 0, 'Tài khoản khác không thấy tiến độ của người trước', 'xp=' + xp);
    await page.waitForTimeout(1700);
    const leaked = await page.evaluate(() => { const u = window.__fakeDb.users || {}; return Object.keys(u).filter((k) => k !== 'stud1' && ((u[k].progress || {}).xp === 777)); });
    check(leaked.length === 0, 'Tiến độ người trước không bị đẩy sang tài khoản mới');
    await finishPage(page, 'Đổi tài khoản');
  });

  await browser.close();
  srv.close();
};
