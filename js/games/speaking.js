(function (global) {
  'use strict';

  // Speaking game — student sees Vietnamese + IPA + English, reads the
  // English aloud, browser SpeechRecognition transcribes, we grade.
  //
  // Supported browsers: Chrome, Edge, Opera (desktop & Android). Safari
  // has spotty coverage; Firefox has none. Unsupported browsers get a
  // friendly notice and the mode short-circuits to onExit.

  const SR = (typeof window !== 'undefined')
    && (window.SpeechRecognition || window.webkitSpeechRecognition);

  function normalize(s) {
    return String(s || '')
      .toLowerCase()
      .trim()
      .replace(/[.,!?;:'"()]/g, '')
      .replace(/\s+/g, ' ');
  }

  function levenshtein(a, b) {
    a = normalize(a); b = normalize(b);
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    const dp = new Array(n + 1);
    for (let j = 0; j <= n; j++) dp[j] = j;
    for (let i = 1; i <= m; i++) {
      let prev = dp[0];
      dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const temp = dp[j];
        if (a[i - 1] === b[j - 1]) dp[j] = prev;
        else dp[j] = 1 + Math.min(prev, dp[j], dp[j - 1]);
        prev = temp;
      }
    }
    return dp[n];
  }

  // Compare transcript alternatives to target; returns {grade, bestTranscript, distance}.
  //   grade = 'exact' | 'close' | 'wrong'
  function grade(alternatives, target) {
    const tgt = normalize(target);
    let best = { grade: 'wrong', transcript: '', distance: Infinity };
    (alternatives || []).forEach((alt) => {
      const a = normalize(alt);
      if (!a) return;
      if (a === tgt) {
        if (best.grade !== 'exact') best = { grade: 'exact', transcript: a, distance: 0 };
        return;
      }
      // Strip leading/trailing articles, "a/an/the" — often added by ASR.
      const stripped = a.replace(/^(a|an|the)\s+/, '').replace(/\s+(a|an|the)$/, '');
      if (stripped === tgt) {
        if (best.distance > 0) best = { grade: 'exact', transcript: a, distance: 0 };
        return;
      }
      const d = levenshtein(a, tgt);
      const threshold = Math.max(2, Math.floor(tgt.length * 0.25));
      if (d <= threshold && d < best.distance) {
        best = { grade: 'close', transcript: a, distance: d };
      } else if (d < best.distance) {
        best = { grade: 'wrong', transcript: a, distance: d };
      }
    });
    return best;
  }

  function start(opts) {
    const { container, topicId, words, onExit, onFinish } = opts;
    const t = I18N.t;

    if (!SR) {
      container.innerHTML = `
        <section class="view game-view">
          <div class="game-hud">
            <button class="btn secondary" id="exitBtn">← ${t('game.back')}</button>
          </div>
          <div class="empty-state" style="padding:40px 20px;">
            <div style="font-size:42px;margin-bottom:10px;">🎤</div>
            <h2 style="margin:0 0 8px;">${t('game.speakingNotSupported')}</h2>
            <p style="color:var(--text-muted);">${t('game.speakingUseChrome')}</p>
          </div>
        </section>
      `;
      container.querySelector('#exitBtn').addEventListener('click', onExit);
      return;
    }

    let idx = 0;
    let correct = 0;
    let close = 0;
    let wrong = 0;
    let xp = 0;
    let combo = 0;
    let bestCombo = 0;
    let recognition = null;
    let isListening = false;
    const startTs = Date.now();

    function renderHud() {
      const pct = Math.round((idx / words.length) * 100);
      return `
        <div class="game-hud">
          <button class="btn secondary" type="button" id="exitBtn">← ${t('game.back')}</button>
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
      const ipaStr = w.ipa ? `<div class="speak-ipa">/${escapeHtml(w.ipa)}/</div>` : '';

      container.innerHTML = `
        <section class="view game-view">
          ${renderHud()}
          <div class="speak-card">
            <div class="speak-vi">${escapeHtml(w.vi)}</div>
            ${ipaStr}
            <div class="speak-en">${escapeHtml(w.en)}
              <button class="speak-btn" type="button" data-speak="${escapeHtml(w.en)}" title="${t('word.listen')}">🔊</button>
            </div>
            ${w.pos ? `<div class="speak-pos">(${escapeHtml(w.pos)})</div>` : ''}
          </div>
          <div class="mic-stage">
            <button class="mic-btn" type="button" id="micBtn">
              <span class="mic-icon">🎤</span>
              <span class="mic-label" id="micLabel">${t('game.tapToSpeak')}</span>
            </button>
          </div>
          <div class="answer-feedback" id="feedback"></div>
        </section>
      `;

      container.querySelector('#exitBtn').addEventListener('click', () => {
        stopListening();
        onExit();
      });
      container.querySelector('#micBtn').addEventListener('click', toggleMic);
      if (typeof Pronunciation !== 'undefined') {
        Pronunciation.bindSpeakers(container);
      }
    }

    function toggleMic() {
      if (isListening) {
        stopListening();
      } else {
        startListening();
      }
    }

    function startListening() {
      if (isListening) return;
      // Stop any ongoing TTS so it doesn't bleed into ASR.
      if (typeof Pronunciation !== 'undefined') Pronunciation.cancel();

      try {
        recognition = new SR();
      } catch (e) {
        showError(t('game.speakingNotSupported'));
        return;
      }
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 5;

      const micBtn = container.querySelector('#micBtn');
      const micLabel = container.querySelector('#micLabel');
      micBtn.classList.add('listening');
      if (micLabel) micLabel.textContent = t('game.listening');
      isListening = true;

      recognition.onresult = (event) => {
        const alts = [];
        const results = event.results[0];
        for (let i = 0; i < results.length; i++) {
          alts.push(results[i].transcript);
        }
        finalize(alts);
      };
      recognition.onerror = (event) => {
        const kind = event && event.error;
        let msg = t('game.speakingError');
        if (kind === 'no-speech') msg = t('game.noSpeechHeard');
        else if (kind === 'not-allowed' || kind === 'service-not-allowed') msg = t('game.micNotAllowed');
        else if (kind === 'audio-capture') msg = t('game.micNotFound');
        stopListening();
        showError(msg);
      };
      recognition.onend = () => {
        // If onresult didn't fire first, treat as no-speech silently.
        if (isListening) stopListening();
      };

      try {
        recognition.start();
      } catch (e) {
        stopListening();
        showError(t('game.speakingError'));
      }
    }

    function stopListening() {
      isListening = false;
      if (recognition) {
        try { recognition.onresult = null; recognition.onerror = null; recognition.onend = null; } catch (e) {}
        try { recognition.abort(); } catch (e) {}
        recognition = null;
      }
      const micBtn = container.querySelector('#micBtn');
      const micLabel = container.querySelector('#micLabel');
      if (micBtn) micBtn.classList.remove('listening');
      if (micLabel) micLabel.textContent = t('game.tapToSpeak');
    }

    function showError(msg) {
      const feedback = container.querySelector('#feedback');
      if (!feedback) return;
      feedback.className = 'answer-feedback bad';
      feedback.innerHTML = `
        <div class="fb-status bad">${escapeHtml(msg)}</div>
        <div class="fb-actions-row">
          <button class="btn listen-again" type="button" id="tryAgainBtn">↻ ${t('game.tryAgain')}</button>
        </div>
      `;
      const btn = feedback.querySelector('#tryAgainBtn');
      if (btn) btn.addEventListener('click', () => { feedback.innerHTML = ''; feedback.className = 'answer-feedback'; });
    }

    function finalize(alts) {
      stopListening();
      const w = words[idx];
      const result = grade(alts, w.en);
      const progress = Storage.getProgress();
      const wasCorrect = result.grade === 'exact' || result.grade === 'close';
      SRS.updateWord(progress, topicId, w.en, wasCorrect);
      Storage.saveProgress(progress);

      if (result.grade === 'exact') {
        correct += 1;
        combo += 1;
        if (combo > bestCombo) bestCombo = combo;
        xp += 10 + (combo >= 3 ? 5 : 0);
      } else if (result.grade === 'close') {
        close += 1;
        combo += 1;
        if (combo > bestCombo) bestCombo = combo;
        xp += 5;
      } else {
        wrong += 1;
        combo = 0;
      }

      renderFeedback(w, result);
    }

    function renderFeedback(w, result) {
      const feedback = container.querySelector('#feedback');
      if (!feedback) return;
      const icon = result.grade === 'exact' ? '✓' : (result.grade === 'close' ? '≈' : '✗');
      const iconCls = result.grade === 'exact' ? 'ok' : (result.grade === 'close' ? 'close' : 'bad');
      const statusKey = result.grade === 'exact' ? 'game.speakingExact'
                    : result.grade === 'close' ? 'game.speakingClose'
                    : 'game.speakingWrong';
      const heard = result.transcript
        ? `<div class="fb-heard">${escapeHtml(I18N.t('game.heardYou'))}: <em>"${escapeHtml(result.transcript)}"</em></div>`
        : `<div class="fb-heard">${escapeHtml(I18N.t('game.noSpeechHeard'))}</div>`;
      const ipaStr = w.ipa ? `<span class="ipa">/${escapeHtml(w.ipa)}/</span>` : '';
      const listenBtn = `<button class="btn listen-again" type="button" data-speak="${escapeHtml(w.en)}">🔊 ${I18N.t('word.listenAgain')}</button>`;
      const tryBtn = `<button class="btn secondary" type="button" id="retryBtn">↻ ${I18N.t('game.tryAgain')}</button>`;
      const nextBtn = `<button class="btn" type="button" id="nextBtn">${I18N.t('game.next')} →</button>`;

      feedback.className = 'answer-feedback ' + (iconCls === 'ok' ? 'ok' : (iconCls === 'close' ? 'close' : 'bad'));
      feedback.innerHTML = `
        <div class="fb-big-icon ${iconCls}">${icon}</div>
        <div class="fb-status ${iconCls}">${I18N.t(statusKey)}</div>
        <div class="fb-word">
          <strong>${escapeHtml(w.en)}</strong> ${ipaStr}
        </div>
        ${heard}
        <div class="fb-actions-row">${listenBtn}${tryBtn}</div>
        <div class="fb-actions">${nextBtn}</div>
      `;

      if (typeof Pronunciation !== 'undefined') {
        Pronunciation.bindSpeakers(feedback);
        Pronunciation.speak(w.en);
      }

      feedback.querySelector('#retryBtn').addEventListener('click', () => {
        feedback.innerHTML = '';
        feedback.className = 'answer-feedback';
        startListening();
      });

      const nextEl = feedback.querySelector('#nextBtn');
      let armed = false;
      let armTimer = null;
      const advance = () => {
        if (armTimer) { clearTimeout(armTimer); armTimer = null; }
        document.removeEventListener('keydown', onKey);
        idx += 1;
        render();
      };
      const onKey = (e) => {
        if (!armed) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advance(); }
      };
      nextEl.addEventListener('click', advance);
      armTimer = setTimeout(() => {
        armed = true;
        armTimer = null;
        document.addEventListener('keydown', onKey);
      }, 400);
    }

    function finish() {
      stopListening();
      onFinish({
        correct: correct + close, // count close as correct for XP/stats
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
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  global.SpeakingGame = { start, supported: !!SR };
})(window);
