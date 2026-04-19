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
      const posHint = w.pos
        ? `<div class="pos-hint">(${escapeHtml(w.pos)}) · ${escapeHtml(w.en.length + '')} ${t('word.letters') || 'letters'}</div>`
        : '';

      container.innerHTML = `
        <section class="view game-view">
          ${renderHud()}
          <div class="typing-prompt">
            <div class="meaning">${escapeHtml(w.vi)}</div>
            ${posHint}
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
      } else {
        wrong += 1;
        combo = 0;
      }

      // Lock input & swap submit for Next
      input.disabled = true;
      container.querySelector('#submitBtn').style.display = 'none';

      // Build detailed feedback: big icon + answer + IPA + audio + example + syn/ant
      const ipaStr = w.ipa ? `<span class="ipa">/${escapeHtml(w.ipa)}/</span>` : '';
      const speakBtn = `<button class="speak-btn big" data-speak="${escapeHtml(w.en)}" title="${I18N.t('word.listen')}">🔊</button>`;
      const bigIcon = isCorrect
        ? '<div class="fb-big-icon ok">✓</div>'
        : '<div class="fb-big-icon bad">✗</div>';
      const header = isCorrect
        ? `<div class="fb-status ok">${I18N.t('game.typingCorrect')}</div>`
        : `<div class="fb-status bad">${I18N.t('game.typingWrong')}</div>`;
      const wordBlock = `
        <div class="fb-word">
          <strong>${escapeHtml(w.en)}</strong> ${ipaStr} ${speakBtn}
        </div>
        <div class="fb-meaning">${I18N.t('game.meaning')}: <em>${escapeHtml(w.vi)}</em></div>`;
      const exampleBlock = w.example
        ? `<div class="fb-example">${escapeHtml(w.example)}</div>` : '';
      const synBlock = (w.syn && w.syn.length)
        ? `<div class="fb-row"><span class="fb-label">${I18N.t('word.synonym')}</span><span class="syn-list">${w.syn.map((s) => `<span>${escapeHtml(s)}</span>`).join('')}</span></div>`
        : '';
      const antBlock = (w.ant && w.ant.length)
        ? `<div class="fb-row"><span class="fb-label">${I18N.t('word.antonym')}</span><span class="ant-list">${w.ant.map((a) => `<span>${escapeHtml(a)}</span>`).join('')}</span></div>`
        : '';
      const nextBtn = `<button class="btn" id="nextBtn" autofocus>${I18N.t('game.next')} →</button>`;

      feedback.className = 'typing-feedback ' + (isCorrect ? 'ok' : 'bad');
      feedback.innerHTML = bigIcon + header + wordBlock + exampleBlock + synBlock + antBlock + `<div class="fb-actions">${nextBtn}</div>`;

      if (typeof Pronunciation !== 'undefined') {
        Pronunciation.bindSpeakers(feedback);
        Pronunciation.speak(w.en);
      }

      const nextEl = feedback.querySelector('#nextBtn');
      const advance = () => {
        document.removeEventListener('keydown', onKey);
        idx += 1;
        render();
      };
      const onKey = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); advance(); }
      };
      nextEl.addEventListener('click', advance);
      document.addEventListener('keydown', onKey);
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

  global.TypingGame = { start };
})(window);
