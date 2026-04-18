(function (global) {
  'use strict';

  function start(opts) {
    const { container, topicId, words, onExit, onFinish } = opts;
    const t = I18N.t;

    let idx = 0;
    let flipped = false;
    let correct = 0;
    let wrong = 0;
    let xp = 0;
    let bestCombo = 0;
    let combo = 0;
    const startTs = Date.now();

    function renderHud() {
      const pct = Math.round((idx / words.length) * 100);
      return `
        <div class="game-hud">
          <button class="btn secondary" id="exitBtn">← ${t('game.back')}</button>
          <span class="chip">${idx + 1}/${words.length}</span>
          <div class="progress-bar"><span style="width:${pct}%"></span></div>
          <span class="chip correct">✓ ${correct}</span>
          <span class="chip combo">🔥 ${combo}</span>
        </div>
      `;
    }

    function renderCard() {
      if (idx >= words.length) return finish();
      const w = words[idx];

      container.innerHTML = `
        <section class="view game-view">
          ${renderHud()}
          <div class="flashcard-stage">
            <div class="flashcard" id="card">
              ${flipped ? `
                <div class="big-word">${escapeHtml(w.en)}</div>
                <div class="pos">${w.pos || ''}</div>
                <div class="meaning">${escapeHtml(w.vi)}</div>
                <div class="example">${escapeHtml(w.example || '')}</div>
              ` : `
                <div class="big-word">${escapeHtml(w.en)}</div>
                <div class="pos">${w.pos || ''}</div>
                <div class="hint">${t('game.tapToFlip')}</div>
              `}
            </div>
          </div>
          ${flipped ? `
            <div class="rate-row">
              <button class="rate-btn again" id="again">😵 ${t('game.again')}</button>
              <button class="rate-btn good" id="good">🙂 ${t('game.good')}</button>
              <button class="rate-btn easy" id="easy">🤩 ${t('game.easy')}</button>
            </div>
          ` : ''}
        </section>
      `;

      container.querySelector('#exitBtn').addEventListener('click', onExit);
      container.querySelector('#card').addEventListener('click', () => {
        if (!flipped) {
          flipped = true;
          renderCard();
        }
      });
      if (flipped) {
        container.querySelector('#again').addEventListener('click', () => rate('again'));
        container.querySelector('#good').addEventListener('click', () => rate('good'));
        container.querySelector('#easy').addEventListener('click', () => rate('easy'));
      }
    }

    function rate(level) {
      const w = words[idx];
      const progress = Storage.getProgress();
      if (level === 'again') {
        SRS.updateWord(progress, topicId, w.en, false);
        wrong += 1;
        combo = 0;
      } else {
        SRS.updateWord(progress, topicId, w.en, true);
        correct += 1;
        combo += 1;
        if (combo > bestCombo) bestCombo = combo;
        xp += level === 'easy' ? 10 : 5;
        if (combo >= 3) xp += 5;
      }
      Storage.saveProgress(progress);
      idx += 1;
      flipped = false;
      renderCard();
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

    renderCard();
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  global.FlashcardGame = { start };
})(window);
