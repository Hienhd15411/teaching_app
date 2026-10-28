(function (global) {
  'use strict';

  // IPA pronunciation drill. The learner reads a target phrase shown with
  // its IPA, the recognizer transcribes, and each target word is scored by
  // how closely a spoken word matched it (Levenshtein). Words the engine
  // mishears are flagged as likely mispronunciations. This is the honest
  // client-side way to score pronunciation against IPA: the IPA is the
  // guide the learner reads, and ASR word-accuracy is the measurable signal.

  const SR = global.SpeechRecognition || global.webkitSpeechRecognition;

  // Chrome writes numbers as digits ("row 20", "15C"); targets spell them
  // out. Both sides are spelled out before comparing.
  const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  function numWords(n) {
    if (n < 20) return ONES[n];
    if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
    if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + numWords(n % 100) : '');
    return String(n);
  }
  function spellNumbers(s) {
    return String(s || '').replace(/(\d+)([a-z]?)/gi, (m, d, letter) => {
      const n = parseInt(d, 10);
      return (n < 1000 ? numWords(n) : d) + (letter ? ' ' + letter : '');
    });
  }

  function normalize(s) {
    return spellNumbers(String(s || '').toLowerCase()).trim()
      .replace(/[\u2018\u2019]/g, "'").replace(/[.,!?;:'"()]/g, '').replace(/\s+/g, ' ');
  }
  function words(s) { const n = normalize(s); return n ? n.split(' ') : []; }

  function levenshtein(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    const dp = new Array(n + 1);
    for (let j = 0; j <= n; j++) dp[j] = j;
    for (let i = 1; i <= m; i++) {
      let prev = dp[0]; dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const tmp = dp[j];
        dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
        prev = tmp;
      }
    }
    return dp[n];
  }

  // Per-word grade, IN ORDER: each target word is looked for in the next
  // few spoken words (also two adjacent spoken words joined, because ASR
  // splits "seatbelt" → "seat belt"). Saying the words in another order,
  // or burying the sentence in extra words, no longer earns 10/10.
  // ratio = distance / word length → 0 good, higher worse.
  const WINDOW = 4;
  function scorePhrase(target, transcript) {
    const tgt = words(target);
    const said = words(transcript);
    let j = 0;
    const perWord = tgt.map((w) => {
      let best = w.length;
      let bestEnd = j;
      for (let k = j; k < Math.min(said.length, j + WINDOW); k++) {
        const d1 = levenshtein(w, said[k]);
        if (d1 < best) { best = d1; bestEnd = k + 1; }
        if (k + 1 < said.length) {
          const d2 = levenshtein(w, said[k] + said[k + 1]);
          if (d2 < best) { best = d2; bestEnd = k + 2; }
        }
      }
      const ratio = best / Math.max(1, w.length);
      if (ratio <= 0.5) j = bestEnd; // advance only past a plausible match
      const state = ratio <= 0.25 ? 'good' : ratio <= 0.5 ? 'ok' : 'bad';
      return { word: w, ratio, state };
    });
    const goodCount = perWord.filter((p) => p.state === 'good').length;
    const okCount = perWord.filter((p) => p.state === 'ok').length;
    // Many more words than the sentence has → proportional penalty.
    const extra = said.length > tgt.length + 2 ? (tgt.length + 2) / said.length : 1;
    const perWordScore = tgt.length ? ((goodCount + okCount * 0.5) / tgt.length) * extra : 0;

    // Whole-utterance match ignoring word boundaries: strip spaces and
    // compare character sequences. A correct read whose only "error" is
    // where ASR put the spaces (seat belt / a board / take off) matches
    // here and earns full marks; extra speech counts as edits.
    const tj = normalize(target).replace(/\s+/g, '');
    const sj = normalize(transcript).replace(/\s+/g, '');
    const overall = tj.length ? 1 - Math.min(1, levenshtein(tj, sj) / tj.length) : 0;

    const score01 = Math.max(perWordScore, overall);
    return { perWord, score: Math.round(score01 * 100) / 10, said: normalize(transcript) };
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Word→IPA lookup built once from the app's vocabulary (each VOCAB entry
  // carries an `ipa`). Used to auto-annotate a custom sentence the learner
  // types — known words get IPA, unknown words are shown as-is. Browsers
  // can't phonemize arbitrary text, so this partial guide plus the TTS
  // model pronunciation is the honest best we can do client-side.
  let ipaMap = null;
  function buildIpaMap() {
    if (ipaMap) return ipaMap;
    ipaMap = {};
    try {
      // Base dictionary of common/function words first, then topical vocab.
      const base = global.IPA_DICT || {};
      Object.keys(base).forEach((k) => { ipaMap[normalize(k)] = base[k]; });
      const addWord = (en, ipa) => {
        const key = normalize(en);
        if (key && ipa && !ipaMap[key]) ipaMap[key] = String(ipa).replace(/^\/|\/$/g, '');
      };
      // Topic + TOEIC vocabulary (single words and short phrases).
      const V = global.VOCAB || {};
      Object.keys(V).forEach((topic) => (V[topic] || []).forEach((w) => { if (w) addWord(w.en, w.ipa); }));
      const T = global.TOEIC;
      if (T && T.EDITIONS && T.PARTS && T.allWordsInPart) {
        T.EDITIONS.forEach((ed) => T.PARTS.forEach((p) => {
          try { T.allWordsInPart(ed.id, p.id).forEach((w) => { if (w) addWord(w.en, w.ipa); }); } catch (e) {}
        }));
      }
      // Sample drill phrases carry a full-sentence IPA; when the word count
      // matches the IPA token count, each word's transcription is known.
      ((global.PRON_DRILL && global.PRON_DRILL.SETS) || []).forEach((s) => (s.items || []).forEach((it) => {
        const ws = normalize(it.en).split(' ').filter(Boolean);
        const ps = String(it.ipa || '').trim().split(/\s+/).filter(Boolean);
        if (ws.length && ws.length === ps.length) ws.forEach((w, i) => addWord(w, ps[i]));
      }));
    } catch (e) {}
    return ipaMap;
  }

  // Word-by-word IPA guide for a custom sentence. With `detail`, returns
  // { ipa, unknown: [words not in the dictionary] } (used by QC).
  function ipaForSentence(text, detail) {
    const map = buildIpaMap();
    const toks = normalize(text).split(' ').filter(Boolean);
    const unknown = [];
    let known = 0;
    const parts = toks.map((w) => {
      const hit = map[w] || (w.endsWith("'s") && map[w.slice(0, -2)] ? map[w.slice(0, -2)] + 'z' : null);
      if (hit) { known += 1; return hit; }
      unknown.push(w);
      return w;
    });
    const ipa = known ? parts.join(' ') : '';
    return detail ? { ipa, unknown } : ipa;
  }

  function start(opts) {
    const { container, onExit } = opts;
    const t = I18N.t;
    const lang = I18N.getLang();
    const sets = PRON_DRILL.SETS;
    let set = null;
    let idx = 0;
    let recognition = null;
    let listening = false;
    let scores = [];

    function stopAsr() {
      if (recognition) { try { recognition.onend = null; recognition.stop(); } catch (e) {} recognition = null; }
      listening = false;
    }

    // Teardown when the student leaves by ANY route (nav bar, device Back).
    if (global.App && App.onLeave) App.onLeave(() => { stopAsr(); });

    // ---- set picker ----
    function renderPicker() {
      stopAsr();
      container.innerHTML = `
        <section class="view iv-view">
          <button class="btn secondary" type="button" id="drillExit" style="margin-bottom:12px;">← ${t('game.back')}</button>
          <h1>🗣️ ${t('pd.title')}</h1>
          <p style="color:var(--text-muted);margin-top:4px;">${t('pd.sub')}</p>
          <div class="iv-section-grid">
            <button class="iv-section-chip" type="button" id="pdCustom" style="border-color:var(--primary);">
              <span class="iv-section-ic">✍️</span>
              <span>${esc(t('pd.customEntry'))}</span>
            </button>
            ${sets.map((s) => `
              <button class="iv-section-chip" type="button" data-set="${s.id}">
                <span class="iv-section-ic">${s.icon}</span>
                <span>${esc(s.label[lang] || s.label.vi)} <span class="muted-note" style="display:inline;">(${s.items.length})</span></span>
              </button>`).join('')}
          </div>
          ${!SR ? `<p class="muted-note" style="margin-top:14px;">${t('pd.noAsr')}</p>` : ''}
        </section>
      `;
      container.querySelector('#drillExit').addEventListener('click', onExit);
      container.querySelector('#pdCustom').addEventListener('click', renderCustomInput);
      container.querySelectorAll('.iv-section-chip[data-set]').forEach((btn) => {
        btn.addEventListener('click', () => {
          set = sets.find((s) => s.id === btn.getAttribute('data-set'));
          idx = 0; scores = [];
          renderCard();
        });
      });
    }

    // Custom-sentence mode: the learner types their own script, and we score
    // their read-aloud against it word-by-word (with auto IPA where known).
    function renderCustomInput() {
      stopAsr();
      container.innerHTML = `
        <section class="view iv-view">
          <button class="btn secondary" type="button" id="customBack" style="margin-bottom:12px;">← ${t('pd.sets')}</button>
          <h1>✍️ ${t('pd.customTitle')}</h1>
          <p style="color:var(--text-muted);margin-top:4px;">${t('pd.customSub')}</p>
          <textarea id="pdCustomText" class="iv-textarea" rows="3" placeholder="${t('pd.customPlaceholder')}"></textarea>
          <div class="btn-row" style="margin-top:12px;">
            <button class="btn" type="button" id="pdCustomStart">${t('pd.customStart')} →</button>
          </div>
        </section>
      `;
      container.querySelector('#customBack').addEventListener('click', renderPicker);
      const startBtn = container.querySelector('#pdCustomStart');
      const ta = container.querySelector('#pdCustomText');
      ta.focus();
      startBtn.addEventListener('click', () => {
        const txt = (ta.value || '').trim().replace(/\s+/g, ' ');
        if (txt.split(' ').length < 2) { App.toast(t('pd.customTooShort')); return; }
        set = {
          id: 'custom', icon: '✍️',
          label: { vi: 'Câu của bạn', en: 'Your sentence' },
          items: [{ en: txt, ipa: ipaForSentence(txt), vi: '' }],
        };
        idx = 0; scores = [];
        renderCard();
      });
    }

    function renderCard() {
      stopAsr();
      if (idx >= set.items.length) return renderResult();
      const item = set.items[idx];
      container.innerHTML = `
        <section class="view game-view iv-view">
          <div class="game-hud">
            <button class="btn secondary" type="button" id="drillBack">← ${t('pd.sets')}</button>
            <span class="chip">${idx + 1}/${set.items.length}</span>
            <span class="chip">${set.icon} ${esc(set.label[lang] || set.label.vi)}</span>
          </div>
          <div class="pd-card">
            <div class="pd-target" id="pdTarget">${item.en.split(/\s+/).filter((w) => normalize(w)).map((w) => `<span class="pd-w">${esc(w)}</span>`).join(' ')}
              <button class="speak-btn big" type="button" data-speak="${esc(item.en)}">🔊</button>
            </div>
            ${item.ipa ? `<div class="pd-ipa">/ ${esc(item.ipa)} /</div>` : `<div class="muted-note">${t('pd.customNoIpa')}</div>`}
            ${item.vi ? `<div class="pd-vi">${esc(item.vi)}</div>` : ''}
          </div>
          <div class="mic-stage">
            <button class="mic-btn" type="button" id="pdMic">
              <span class="mic-icon">🎤</span>
              <span id="pdMicLabel">${t('pd.tapToRead')}</span>
            </button>
          </div>
          ${!SR ? `<p class="muted-note" style="text-align:center;">${t('pd.noAsr')}</p>
            <div class="btn-row" style="justify-content:center;"><button class="btn secondary" type="button" id="pdSkip">${t('pd.skip')} →</button></div>` : ''}
          <div class="answer-feedback" id="pdFeedback"></div>
        </section>
      `;
      container.querySelector('#drillBack').addEventListener('click', renderPicker);
      const micBtn = container.querySelector('#pdMic');
      if (SR) micBtn.addEventListener('click', toggleMic);
      else {
        // Firefox / some iOS browsers: no speech recognition — let the
        // student listen and move on instead of being stuck on card 1.
        micBtn.disabled = true;
        container.querySelector('#pdSkip').addEventListener('click', () => { idx += 1; renderCard(); });
      }
      if (typeof Pronunciation !== 'undefined') {
        Pronunciation.bindSpeakers(container);
        Pronunciation.speak(item.en);
      }
    }

    function toggleMic() {
      if (listening) { stopAsr(); syncMic(); return; }
      if (typeof Pronunciation !== 'undefined') Pronunciation.cancel();
      recognition = new SR();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;
      let transcript = '';
      const mySet = set;
      const myIdx = idx;
      const stillHere = () => set === mySet && idx === myIdx && !!container.querySelector('#pdFeedback');
      recognition.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) transcript += e.results[i][0].transcript + ' ';
        }
      };
      recognition.onend = () => { listening = false; syncMic(); if (transcript.trim() && stillHere()) showResult(transcript.trim()); };
      recognition.onerror = (e) => {
        listening = false; syncMic();
        const code = e && e.error;
        if (code === 'not-allowed' || code === 'service-not-allowed') App.toast('🎤 ' + t('iv.micDenied'));
        else if (code === 'no-speech') App.toast('🎤 ' + t('iv.noSpeech'));
      };
      try { recognition.start(); listening = true; } catch (e) { listening = false; }
      syncMic();
    }

    function syncMic() {
      const btn = container.querySelector('#pdMic');
      const label = container.querySelector('#pdMicLabel');
      if (!btn) return;
      btn.classList.toggle('listening', listening);
      if (label) label.textContent = listening ? t('pd.listening') : t('pd.tapToRead');
    }

    function showResult(transcript) {
      const item = set.items[idx];
      const res = scorePhrase(item.en, transcript);
      scores[idx] = res.score; // a retry replaces this phrase's score

      // Recolor each target word.
      const targetEl = container.querySelector('#pdTarget');
      if (targetEl) {
        const spans = targetEl.querySelectorAll('.pd-w');
        res.perWord.forEach((p, i) => { if (spans[i]) spans[i].classList.add('pd-' + p.state); });
      }

      const g = res.score >= 9 ? { cls: 'grade-excellent', vi: 'Xuất sắc', en: 'Excellent' }
        : res.score >= 7 ? { cls: 'grade-good', vi: 'Tốt', en: 'Good' }
        : res.score >= 5 ? { cls: 'grade-fair', vi: 'Khá', en: 'Fair' }
        : { cls: 'grade-fail', vi: 'Cần luyện thêm', en: 'Keep practicing' };

      const fb = container.querySelector('#pdFeedback');
      fb.className = 'answer-feedback ok';
      fb.innerHTML = `
        <div class="grade-card ${g.cls}" style="margin:0 auto 12px;">
          <div class="grade-label">${t('pd.score')}</div>
          <div class="grade-score">${res.score}<span class="grade-max">/10</span></div>
          <div class="grade-rank">${lang === 'en' ? g.en : g.vi}</div>
        </div>
        <div class="fb-heard">${t('pd.heard')}: <em>${esc(res.said) || '—'}</em></div>
        <div class="pd-legend">
          <span class="pd-w pd-good">${t('pd.good')}</span>
          <span class="pd-w pd-ok">${t('pd.ok')}</span>
          <span class="pd-w pd-bad">${t('pd.bad')}</span>
        </div>
        <div class="fb-actions-row">
          <button class="btn listen-again" type="button" data-speak="${esc(item.en)}">🔊 ${t('word.listenAgain')}</button>
          <button class="btn secondary" type="button" id="pdRetry">🔁 ${t('pd.retry')}</button>
        </div>
        <div class="fb-actions"><button class="btn" type="button" id="pdNext">${t('game.next')} →</button></div>
      `;
      if (typeof Pronunciation !== 'undefined') Pronunciation.bindSpeakers(fb);
      fb.querySelector('#pdRetry').addEventListener('click', () => renderCard());
      fb.querySelector('#pdNext').addEventListener('click', () => { idx += 1; renderCard(); });
    }

    function renderResult() {
      const done = scores.filter((x) => typeof x === 'number');
      const avg = done.length ? Math.round(done.reduce((a, b) => a + b, 0) / done.length * 10) / 10 : 0;
      // Log the practice so it counts for streak, "studied today" on the
      // schedule and roadmap drill items.
      if (done.length && set && typeof Progress !== 'undefined') {
        const good = done.filter((x) => x >= 7).length;
        try { Progress.finishSession({ mode: 'drill', topicId: 'drill_' + set.id, correct: good, wrong: done.length - good, xp: good * 5, wordsSeen: done.length }); } catch (e) {}
      }
      container.innerHTML = `
        <section class="view game-view iv-view">
          <div class="game-result">
            <div class="big">🗣️</div>
            <h2>${t('pd.done')}</h2>
            <div class="grade-card ${avg >= 8 ? 'grade-excellent' : avg >= 6 ? 'grade-good' : 'grade-fair'}">
              <div class="grade-label">${t('pd.avgScore')}</div>
              <div class="grade-score">${avg}<span class="grade-max">/10</span></div>
            </div>
            <div class="btn-row" style="justify-content:center;margin-top:16px;">
              <button class="btn" type="button" id="pdAgain">🔁 ${t('pd.again')}</button>
              <button class="btn secondary" type="button" id="pdSets">${t('pd.sets')}</button>
            </div>
          </div>
        </section>
      `;
      container.querySelector('#pdAgain').addEventListener('click', () => { idx = 0; scores = []; renderCard(); });
      container.querySelector('#pdSets').addEventListener('click', renderPicker);
    }

    // Deep link (e.g. from a roadmap item): open a set directly.
    if (opts.setId) {
      set = sets.find((s) => s.id === opts.setId) || null;
      if (set) { idx = 0; scores = []; renderCard(); return; }
    }
    renderPicker();
  }

  global.PronDrill = { start, scorePhrase, ipaForSentence };
})(window);
