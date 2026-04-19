(function (global) {
  'use strict';

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function start(opts) {
    const { container, topicId, words, allTopicWords, onExit, onFinish } = opts;
    const t = I18N.t;
    const distractorPool = (allTopicWords || words).slice();

    let idx = 0;
    let correct = 0;
    let wrong = 0;
    let xp = 0;
    let combo = 0;
    let bestCombo = 0;
    let locked = false;
    const startTs = Date.now();

    // For each word, precompute question direction (50% en→vi, 50% vi→en) and options
    const questions = words.map((w) => {
      const enToVi = Math.random() < 0.5;
      const others = distractorPool.filter((x) => x.en !== w.en);
      const picks = shuffle(others).slice(0, 3);
      const options = shuffle([w, ...picks]);
      return { word: w, enToVi, options };
    });

    function renderHud() {
      const pct = Math.round((idx / questions.length) * 100);
      return `
        <div class="game-hud">
          <button class="btn secondary" id="exitBtn">← ${t('game.back')}</button>
          <span class="chip">${idx + 1}/${questions.length}</span>
          <div class="progress-bar"><span style="width:${pct}%"></span></div>
          <span class="chip correct">✓ ${correct}</span>
          <span class="chip wrong">✗ ${wrong}</span>
          <span class="chip combo">🔥 ${combo}</span>
        </div>
      `;
    }

    function render() {
      if (idx >= questions.length) return finish();
      const q = questions[idx];
      const prompt = q.enToVi ? q.word.en : q.word.vi;
      const sub = q.enToVi ? 'Chọn nghĩa tiếng Việt' : 'Choose the English word';
      const optHtml = q.options.map((o) => {
        const label = q.enToVi ? o.vi : o.en;
        return `<button class="quiz-option" data-en="${escapeAttr(o.en)}">${escapeHtml(label)}</button>`;
      }).join('');

      container.innerHTML = `
        <section class="view game-view">
          ${renderHud()}
          <div class="quiz-question">
            <div>${escapeHtml(prompt)}</div>
            <div class="sub">${sub}</div>
          </div>
          <div class="quiz-options">${optHtml}</div>
          <div class="typing-feedback" id="quizFeedback"></div>
        </section>
      `;
      locked = false;
      container.querySelector('#exitBtn').addEventListener('click', onExit);
      container.querySelectorAll('.quiz-option').forEach((btn) => {
        btn.addEventListener('click', () => onPick(btn, q));
      });
    }

    function onPick(btn, q) {
      if (locked) return;
      locked = true;
      const picked = btn.getAttribute('data-en');
      const isCorrect = picked === q.word.en;
      const progress = Storage.getProgress();
      SRS.updateWord(progress, topicId, q.word.en, isCorrect);
      Storage.saveProgress(progress);

      if (isCorrect) {
        correct += 1;
        combo += 1;
        if (combo > bestCombo) bestCombo = combo;
        xp += 10 + (combo >= 3 ? 5 : 0);
        btn.classList.add('correct');
      } else {
        wrong += 1;
        combo = 0;
        btn.classList.add('wrong');
        container.querySelectorAll('.quiz-option').forEach((b) => {
          if (b.getAttribute('data-en') === q.word.en) b.classList.add('correct');
        });
      }
      container.querySelectorAll('.quiz-option').forEach((b) => (b.disabled = true));

      showFeedback(q, isCorrect);
    }

    function showFeedback(q, isCorrect) {
      const w = q.word;
      const feedback = container.querySelector('#quizFeedback');
      if (!feedback) return;

      const ipaStr = w.ipa ? `<span class="ipa">/${escapeHtml(w.ipa)}/</span>` : '';
      const bigIcon = isCorrect
        ? '<div class="fb-big-icon ok">✓</div>'
        : '<div class="fb-big-icon bad">✗</div>';
      const header = isCorrect
        ? `<div class="fb-status ok">${I18N.t('game.typingCorrect')}</div>`
        : `<div class="fb-status bad">${I18N.t('game.typingWrong')}</div>`;
      const wordBlock = `
        <div class="fb-word">
          <strong>${escapeHtml(w.en)}</strong> ${ipaStr}
        </div>
        <div class="fb-meaning">${I18N.t('game.meaning')}: <em>${escapeHtml(w.vi)}</em></div>`;
      const listenBtn = `<button class="btn listen-again" data-speak="${escapeHtml(w.en)}" type="button">🔊 ${I18N.t('word.listenAgain')}</button>`;
      const exampleBlock = w.example ? `<div class="fb-example">${escapeHtml(w.example)}</div>` : '';
      const synBlock = (w.syn && w.syn.length)
        ? `<div class="fb-row"><span class="fb-label">${I18N.t('word.synonym')}</span><span class="syn-list">${w.syn.map((s) => `<span>${escapeHtml(s)}</span>`).join('')}</span></div>`
        : '';
      const antBlock = (w.ant && w.ant.length)
        ? `<div class="fb-row"><span class="fb-label">${I18N.t('word.antonym')}</span><span class="ant-list">${w.ant.map((a) => `<span>${escapeHtml(a)}</span>`).join('')}</span></div>`
        : '';
      const nextBtn = `<button class="btn" id="nextBtn">${I18N.t('game.next')} →</button>`;

      feedback.className = 'typing-feedback ' + (isCorrect ? 'ok' : 'bad');
      feedback.innerHTML = bigIcon + header + wordBlock
        + `<div class="fb-actions-row">${listenBtn}</div>`
        + exampleBlock + synBlock + antBlock
        + `<div class="fb-actions">${nextBtn}</div>`;

      if (typeof Pronunciation !== 'undefined') {
        Pronunciation.bindSpeakers(feedback);
        Pronunciation.speak(w.en);
      }

      const nextEl = feedback.querySelector('#nextBtn');
      let armed = false;
      const advance = () => {
        document.removeEventListener('keydown', onKey);
        idx += 1;
        render();
      };
      const onKey = (e) => {
        if (!armed) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advance(); }
      };
      nextEl.addEventListener('click', advance);
      setTimeout(() => { armed = true; document.addEventListener('keydown', onKey); }, 250);
      nextEl.focus();
    }

    function finish() {
      onFinish({
        correct,
        wrong,
        xp,
        bestCombo,
        durationSec: (Date.now() - startTs) / 1000,
        wordsSeen: words.length,
      });
    }

    render();
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function escapeAttr(s) { return escapeHtml(s); }

  global.QuizGame = { start };
})(window);
