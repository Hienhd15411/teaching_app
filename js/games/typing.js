(function (global) {
  'use strict';

  function start(opts) {
    const { container, topicId, words, onExit, onFinish } = opts;
    const t = I18N.t;

    let idx = 0;
    let correct = 0;
    let wrong = 0;
    let xp = 0;
    let combo = 0;
    let bestCombo = 0;
    const startTs = Date.now();

    function renderHud() {
      const pct = Math.round((idx / words.length) * 100);
      return `
        <div class="game-hud">
          <button class="btn secondary" id="exitBtn">← ${t('game.back')}</button>
          <span class="chip">${idx + 1}/${words.length}</span>
          <div class="progress-bar"><span style="width:${pct}%"></span></div>
          <span class="chip correct">✓ ${correct}</span>
          <span class="chip wrong">✗ ${wrong}</span>
          <span class="chip combo">🔥 ${combo}</span>
        </div>
      `;
    }

    function render() {
      if (idx >= words.length) return finish();
      const w = words[idx];

      container.innerHTML = `
        <section class="view game-view">
          ${renderHud()}
          <div class="typing-prompt">
            <div class="meaning">${escapeHtml(w.vi)}</div>
            <div class="example">${w.pos ? '(' + w.pos + ') ' : ''}${escapeHtml(w.example || '')}</div>
          </div>
          <div class="typing-input-row">
            <input type="text" id="typingInput" placeholder="${t('game.typingPlaceholder')}" autocomplete="off" autocorrect="off" spellcheck="false" />
            <button class="btn" id="submitBtn">${t('game.submit')}</button>
          </div>
          <div class="typing-feedback" id="feedback"></div>
        </section>
      `;

      container.querySelector('#exitBtn').addEventListener('click', onExit);
      const input = container.querySelector('#typingInput');
      const submitBtn = container.querySelector('#submitBtn');
      input.focus();
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') check();
      });
      submitBtn.addEventListener('click', check);
    }

    function normalize(s) {
      return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }

    function check() {
      const w = words[idx];
      const input = container.querySelector('#typingInput');
      const feedback = container.querySelector('#feedback');
      const answer = normalize(input.value);
      if (!answer) return;

      const isCorrect = answer === normalize(w.en);
      const progress = Storage.getProgress();
      SRS.updateWord(progress, topicId, w.en, isCorrect);
      Storage.saveProgress(progress);

      if (isCorrect) {
        correct += 1;
        combo += 1;
        if (combo > bestCombo) bestCombo = combo;
        xp += 10 + (combo >= 3 ? 5 : 0);
        feedback.className = 'typing-feedback ok';
        feedback.textContent = I18N.t('game.typingCorrect');
      } else {
        wrong += 1;
        combo = 0;
        feedback.className = 'typing-feedback bad';
        feedback.textContent = I18N.t('game.typingWrong') + w.en;
      }

      input.disabled = true;
      container.querySelector('#submitBtn').disabled = true;

      setTimeout(() => {
        idx += 1;
        render();
      }, isCorrect ? 700 : 1400);
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

  global.TypingGame = { start };
})(window);
