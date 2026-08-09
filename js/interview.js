(function (global) {
  'use strict';

  // Cabin-crew interview simulator (see js/data/interview-bank.js for the
  // researched question bank). Mimics the Vietjet AI-video round / VNA
  // English 1-1: questions are spoken (TTS) + shown, answers come in by
  // speech recognition or typing, follow-ups are triggered by keywords in
  // the answer, and every answer gets a 4-criteria heuristic score.

  const TIMER_KEY = 'vlt_interview_timer';
  const TIMER_SECONDS = 90;
  const MAX_FOLLOWUPS = 2;

  // ---------- feature flag (per-student access) ----------

  const InterviewAccess = {
    async isEnabledFor(user) {
      if (!user) return false;
      if (typeof DemoSeed !== 'undefined' && DemoSeed.isDemoUser(user)) return true;
      if (typeof FirebaseSync !== 'undefined' && FirebaseSync.isTeacher(user)) return true;
      try {
        const db = FirebaseSync.getDb();
        if (!db) return false;
        const snap = await db.ref('feature_flags/' + user.uid + '/interview').once('value');
        return snap.val() === true;
      } catch (e) {
        return false;
      }
    },
    async getFor(uid) {
      try {
        const db = FirebaseSync.getDb();
        if (!db) return false;
        const snap = await db.ref('feature_flags/' + uid + '/interview').once('value');
        return snap.val() === true;
      } catch (e) { return false; }
    },
    async setFor(uid, on) {
      const db = FirebaseSync.getDb();
      if (!db) throw new Error('offline');
      await db.ref('feature_flags/' + uid + '/interview').set(on === true);
    },
  };

  // ---------- session assembly ----------

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Build a section-by-section interview for a given airline. Each section
  // draws from questions scoped to that airline ('all' or containing the
  // airline id), following INTERVIEW_BANK.SECTION_PLAN. Airline-knowledge
  // questions are airline-specific; the rest are shared.
  function buildSession(airlineId) {
    const bank = INTERVIEW_BANK.questions;
    const forAirline = (q) => q.airlines === 'all' || (Array.isArray(q.airlines) && q.airlines.indexOf(airlineId) >= 0);
    const plan = INTERVIEW_BANK.SECTION_PLAN;

    const picks = [];
    plan.forEach(({ section, n }) => {
      let pool = bank.filter((q) => q.section === section && forAirline(q));
      // Warm-up always opens with the classic self-intro if present.
      if (section === 'warmup') {
        const intro = pool.find((q) => q.id === 'self_intro');
        if (intro) {
          picks.push(intro);
          pool = pool.filter((q) => q.id !== 'self_intro');
          if (n - 1 > 0) picks.push(...shuffle(pool).slice(0, n - 1));
          return;
        }
      }
      picks.push(...shuffle(pool).slice(0, n));
    });
    return picks.filter(Boolean);
  }

  // ---------- scoring ----------

  function normalizeText(s) {
    return ' ' + String(s || '').toLowerCase().replace(/[^a-z0-9']+/g, ' ').trim() + ' ';
  }

  // Connectives that signal coherent, linked speech. Includes natural
  // spoken connectors (and/but/where/which), not just essay-style markers
  // — a grammatical, flowing answer should score well here even without
  // "firstly ... finally". True grammar checking isn't possible client-side
  // on punctuation-less ASR transcripts, so this criterion measures
  // coherence/linking and is labeled accordingly.
  const STRUCTURE_MARKERS = [
    'first', 'second', 'then', 'next', 'after', 'before', 'finally',
    'because', 'so', 'and', 'but', 'also', 'where', 'which', 'when',
    'while', 'however', 'therefore', 'for example', 'as a result',
    'in my opinion', 'i think', 'i believe', 'since', 'although',
    'even', 'that is why', 'once', 'if', 'until', 'both', 'instead',
  ];

  function markerHit(text, marker) {
    const rx = new RegExp('\\b' + marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+') + '\\b', 'i');
    return rx.test(text);
  }

  function scoreAnswer(question, rawText) {
    const text = normalizeText(rawText);
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;

    // Each keyword is a synonym group 'label|alt1|alt2...' — the idea is
    // covered if ANY variant appears. Candidates say "friendly and
    // hard-working", not the meta-word "personality".
    const matched = [];
    const missed = [];
    (question.keywords || []).forEach((k) => {
      const alts = String(k).split('|');
      const hit = alts.some((a) => text.indexOf(a.trim().toLowerCase()) >= 0);
      if (hit) matched.push(alts[0]); else missed.push(alts[0]);
    });
    // Keyword lists are a SUPERSET of possible ideas — a strong answer
    // covers the main ones, not literally all of them. Covering ~60% of
    // the listed ideas already earns full content marks (calibrated so the
    // model answers themselves score ~9-10).
    const coverage = question.keywords && question.keywords.length
      ? matched.length / question.keywords.length : 0.6;
    const content = Math.min(1, coverage / 0.6);

    const minWords = question.minWords || 25;
    let fillerCount = 0;
    INTERVIEW_BANK.FILLERS.forEach((f) => {
      const m = text.match(new RegExp('\\b' + f.replace(/ /g, '\\s+') + '\\b', 'g'));
      if (m) fillerCount += m.length;
    });
    const fluency = Math.max(0, Math.min(1, words / minWords) - Math.min(0.3, fillerCount * 0.05));

    // Coherence: two distinct connectives already reads as linked, natural
    // speech. Bar kept low so a fluent answer (like the model answers) is
    // not punished for lacking essay-style "firstly ... finally".
    let structHits = 0;
    STRUCTURE_MARKERS.forEach((m) => { if (markerHit(text, m)) structHits += 1; });
    const structure = Math.min(1, structHits / 2);

    let vocabHits = 0;
    INTERVIEW_BANK.AVIATION_VOCAB.forEach((v) => { if (text.indexOf(v) >= 0) vocabHits += 1; });
    const vocab = Math.min(1, vocabHits / 2);

    const total = Math.round((content * 0.4 + fluency * 0.25 + structure * 0.2 + vocab * 0.15) * 100) / 10;
    return { total, content, fluency, structure, vocab, matched, missed, words, fillerCount };
  }

  function gradeMeta(score10) {
    if (score10 >= 9) return { cls: 'grade-excellent', vi: 'Xuất sắc', en: 'Excellent' };
    if (score10 >= 7.5) return { cls: 'grade-good', vi: 'Giỏi', en: 'Very good' };
    if (score10 >= 6) return { cls: 'grade-fair', vi: 'Khá', en: 'Good' };
    if (score10 >= 5) return { cls: 'grade-pass', vi: 'Trung bình', en: 'Fair' };
    return { cls: 'grade-fail', vi: 'Cần cố gắng', en: 'Needs work' };
  }

  // ---------- engine ----------

  // Airline picker — the entry screen. Choosing an airline starts a
  // section-based session tuned to that airline's signature.
  function start(opts) {
    const { container, onExit } = opts;
    const t = I18N.t;
    const lang = I18N.getLang();

    if (opts.airlineId) return runSession(opts, opts.airlineId);

    const airlines = INTERVIEW_BANK.AIRLINES;
    container.innerHTML = `
      <section class="view iv-view">
        <h1>✈️ ${t('iv.pickAirlineTitle')}</h1>
        <p style="color:var(--text-muted);margin-top:4px;">${t('iv.pickAirlineSub')}</p>
        <div class="iv-airline-grid">
          ${Object.values(airlines).map((a) => `
            <button class="iv-airline-card" type="button" data-airline="${a.id}" style="--airline-accent:${a.accent};">
              <div class="iv-airline-icon">${a.icon}</div>
              <div class="iv-airline-name">${escapeHtml(a.name)}</div>
              <div class="iv-airline-tag">${escapeHtml(a.tagline[lang] || a.tagline.vi)}</div>
            </button>`).join('')}
        </div>
        <p class="muted-note" style="margin-top:16px;">${t('iv.pickAirlineNote')}</p>
      </section>
    `;
    container.querySelectorAll('.iv-airline-card').forEach((btn) => {
      btn.addEventListener('click', () => runSession(opts, btn.getAttribute('data-airline')));
    });
  }

  function runSession(opts, airlineId) {
    const { container, onExit } = opts;
    const t = I18N.t;
    const lang = I18N.getLang();
    const airline = (INTERVIEW_BANK.AIRLINES || {})[airlineId] || null;
    const sectionOf = {};
    (INTERVIEW_BANK.SECTIONS || []).forEach((s) => { sectionOf[s.id] = s; });
    const session = buildSession(airlineId);
    const results = []; // {question, text, score}
    let queue = session.slice();
    let followUpsUsed = 0;
    let current = null;
    let recognition = null;
    let listening = false;
    let timerId = null;
    let timeLeft = 0;
    let timerOn = localStorage.getItem(TIMER_KEY) !== '0';
    const startTs = Date.now();

    const SR = global.SpeechRecognition || global.webkitSpeechRecognition;
    const asrSupported = !!SR;

    function stopAsr() {
      if (recognition) {
        try { recognition.onend = null; recognition.stop(); } catch (e) {}
        recognition = null;
      }
      listening = false;
    }

    function stopTimer() {
      if (timerId) { clearInterval(timerId); timerId = null; }
    }

    function cleanup() {
      stopAsr();
      stopTimer();
      if (typeof Pronunciation !== 'undefined') Pronunciation.cancel();
    }

    function catBadge(q) {
      const sec = sectionOf[q.section];
      const c = sec || (INTERVIEW_BANK.CATEGORIES[q.cat]) || { icon: '❓', label: { vi: q.cat, en: q.cat } };
      return `<span class="iv-cat">${c.icon} ${escapeHtml(c.label[lang] || c.label.vi)}</span>`;
    }

    function renderQuestion() {
      if (!queue.length) return renderResult();
      current = queue.shift();
      const answered = results.length;
      const totalPlanned = answered + 1 + queue.length;

      container.innerHTML = `
        <section class="view game-view iv-view">
          <div class="game-hud">
            <button class="btn secondary" type="button" id="ivExit">← ${t('game.back')}</button>
            ${airline ? `<span class="chip iv-airline-chip">${airline.icon} ${escapeHtml(airline.name)}</span>` : ''}
            <span class="chip">${answered + 1}/${totalPlanned}</span>
            <button class="icon-btn" type="button" id="ivTimerToggle" title="${t('iv.timerToggle')}">⏱ ${timerOn ? 'ON' : 'OFF'}</button>
            <span class="chip iv-timer" id="ivTimer" ${timerOn ? '' : 'hidden'}></span>
          </div>
          <div class="iv-question-card">
            ${catBadge(current)}
            ${current.isFollowUp ? `<span class="iv-followup-tag">↳ ${t('iv.followUp')}</span>` : ''}
            <div class="iv-question">${escapeHtml(current.q)}
              <button class="speak-btn big" type="button" data-speak="${escapeHtml(current.q)}">🔊</button>
            </div>
            <div class="iv-question-vi">${escapeHtml(current.qVi || '')}</div>
          </div>
          <div class="iv-answer-zone">
            ${asrSupported ? `
              <div class="mic-stage">
                <button class="mic-btn" type="button" id="ivMic">
                  <span class="mic-icon">🎤</span>
                  <span id="ivMicLabel">${t('iv.tapToAnswer')}</span>
                </button>
              </div>` : `<div class="muted-note" style="text-align:center;">${t('iv.noAsr')}</div>`}
            <textarea id="ivText" class="iv-textarea" rows="5" placeholder="${t('iv.typeHere')}"></textarea>
            <div class="muted-note" style="text-align:center;">${t('iv.editHint')}</div>
            <div class="btn-row" style="justify-content:center;margin-top:10px;">
              <button class="btn" type="button" id="ivSubmit">${t('iv.submit')}</button>
            </div>
          </div>
          <div class="answer-feedback" id="ivFeedback"></div>
        </section>
      `;

      container.querySelector('#ivExit').addEventListener('click', () => { cleanup(); start(Object.assign({}, opts, { airlineId: null })); });
      container.querySelector('#ivTimerToggle').addEventListener('click', () => {
        timerOn = !timerOn;
        localStorage.setItem(TIMER_KEY, timerOn ? '1' : '0');
        container.querySelector('#ivTimerToggle').textContent = '⏱ ' + (timerOn ? 'ON' : 'OFF');
        const chip = container.querySelector('#ivTimer');
        chip.hidden = !timerOn;
        stopTimer();
        if (timerOn) startTimer();
      });
      container.querySelector('#ivSubmit').addEventListener('click', submit);
      if (asrSupported) container.querySelector('#ivMic').addEventListener('click', toggleMic);
      if (typeof Pronunciation !== 'undefined') {
        Pronunciation.bindSpeakers(container);
        Pronunciation.speak(current.q);
      }
      if (timerOn) startTimer();
    }

    function startTimer() {
      timeLeft = TIMER_SECONDS;
      const chip = container.querySelector('#ivTimer');
      const paint = () => {
        if (!chip) return;
        const m = Math.floor(timeLeft / 60);
        const s = timeLeft % 60;
        chip.textContent = m + ':' + String(s).padStart(2, '0');
        chip.classList.toggle('danger', timeLeft <= 15);
      };
      paint();
      timerId = setInterval(() => {
        timeLeft -= 1;
        paint();
        if (timeLeft <= 0) {
          stopTimer();
          submit(); // auto-submit whatever is there, like the real AI round
        }
      }, 1000);
    }

    function toggleMic() {
      if (listening) { stopAsr(); syncMicUi(); return; }
      if (typeof Pronunciation !== 'undefined') Pronunciation.cancel();
      recognition = new SR();
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;
      const textarea = container.querySelector('#ivText');
      let committed = textarea.value ? textarea.value.trim() + ' ' : '';
      recognition.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const tr = e.results[i][0].transcript;
          if (e.results[i].isFinal) committed += tr + ' ';
          else interim += tr;
        }
        textarea.value = (committed + interim).trim();
      };
      recognition.onend = () => { listening = false; syncMicUi(); };
      recognition.onerror = () => { listening = false; syncMicUi(); };
      try { recognition.start(); listening = true; } catch (e) { listening = false; }
      syncMicUi();
    }

    function syncMicUi() {
      const btn = container.querySelector('#ivMic');
      const label = container.querySelector('#ivMicLabel');
      if (!btn) return;
      btn.classList.toggle('listening', listening);
      if (label) label.textContent = listening ? t('iv.listening') : t('iv.tapToAnswer');
    }

    function submit() {
      stopAsr();
      stopTimer();
      const textarea = container.querySelector('#ivText');
      if (!textarea) return;
      const text = textarea.value.trim();
      const score = scoreAnswer(current, text);
      results.push({ question: current, text, score });

      // Keyword-triggered follow-up (only from main questions).
      if (!current.isFollowUp && current.follow && followUpsUsed < MAX_FOLLOWUPS && text) {
        const norm = normalizeText(text);
        for (const key of Object.keys(current.follow)) {
          if (norm.indexOf(key.toLowerCase()) >= 0) {
            const f = current.follow[key];
            queue.unshift({
              id: current.id + '_f_' + key,
              cat: current.cat,
              q: f.q,
              qVi: t('iv.followUpHint'),
              keywords: f.keywords || [],
              minWords: 20,
              isFollowUp: true,
            });
            followUpsUsed += 1;
            break;
          }
        }
      }
      renderFeedback(score, text);
    }

    function bar(label, ratio) {
      const pct = Math.round(ratio * 100);
      return `
        <div class="iv-crit">
          <span class="iv-crit-label">${label}</span>
          <span class="mini-bar" style="width:120px;"><span style="width:${pct}%"></span></span>
          <span class="iv-crit-pct">${pct}%</span>
        </div>`;
    }

    function renderFeedback(score, text) {
      const fb = container.querySelector('#ivFeedback');
      const g = gradeMeta(score.total);
      const zone = container.querySelector('.iv-answer-zone');
      if (zone) zone.style.display = 'none';
      const timerChip = container.querySelector('#ivTimer');
      if (timerChip) timerChip.hidden = true;

      fb.className = 'answer-feedback ok';
      fb.innerHTML = `
        <div class="grade-card ${g.cls}" style="margin:0 auto 14px;">
          <div class="grade-label">${t('iv.answerScore')}</div>
          <div class="grade-score">${score.total}<span class="grade-max">/10</span></div>
          <div class="grade-rank">${lang === 'en' ? g.en : g.vi}</div>
        </div>
        <div class="iv-crits">
          ${bar(t('iv.critContent'), score.content)}
          ${bar(t('iv.critFluency'), score.fluency)}
          ${bar(t('iv.critStructure'), score.structure)}
          ${bar(t('iv.critVocab'), score.vocab)}
        </div>
        ${score.matched.length ? `<div class="fb-row"><span class="fb-label">${t('iv.hitKeywords')}</span><span class="syn-list">${score.matched.map((k) => `<span>${escapeHtml(k)}</span>`).join('')}</span></div>` : ''}
        ${(score.missed.length && score.content < 1) ? `<div class="fb-row"><span class="fb-label">${t('iv.missKeywords')}</span><span class="ant-list">${score.missed.map((k) => `<span>${escapeHtml(k)}</span>`).join('')}</span></div>` : ''}
        ${text ? `<details class="iv-details"><summary>${t('iv.yourAnswer')} (${score.words} ${t('iv.words')})</summary><p>${escapeHtml(text)}</p></details>` : `<div class="muted-note">${t('iv.noAnswer')}</div>`}
        ${current.model ? `<details class="iv-details"><summary>💡 ${t('iv.modelAnswer')}</summary><p>${escapeHtml(current.model)}</p></details>` : ''}
        <div class="fb-actions"><button class="btn" type="button" id="ivNext">${t('game.next')} →</button></div>
      `;
      fb.querySelector('#ivNext').addEventListener('click', renderQuestion);
      fb.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function renderResult() {
      cleanup();
      const avg = results.length
        ? Math.round(results.reduce((a, r) => a + r.score.total, 0) / results.length * 10) / 10
        : 0;
      const g = gradeMeta(avg);
      const good = results.filter((r) => r.score.total >= 6).length;

      // Log into normal progress so the teacher dashboard sees the session.
      try {
        Progress.finishSession({
          mode: 'interview',
          topicId: 'interview_cabin_crew',
          correct: good,
          wrong: results.length - good,
          xp: Math.round(avg * results.length),
          bestCombo: 0,
          durationSec: (Date.now() - startTs) / 1000,
          wordsSeen: results.length,
        });
      } catch (e) {}

      container.innerHTML = `
        <section class="view game-view iv-view">
          <div class="game-result">
            <div class="big">🛬</div>
            <h2>${t('iv.done')}</h2>
            <div class="grade-card ${g.cls}">
              <div class="grade-label">${t('iv.overall')}</div>
              <div class="grade-score">${avg}<span class="grade-max">/10</span></div>
              <div class="grade-rank">${lang === 'en' ? g.en : g.vi}</div>
            </div>
            <table class="progress-table" style="margin:18px auto;max-width:640px;">
              <thead><tr><th>#</th><th>${t('iv.questionCol')}</th><th class="num">${t('iv.scoreCol')}</th></tr></thead>
              <tbody>
                ${results.map((r, i) => `
                  <tr><td>${i + 1}</td>
                  <td style="text-align:left;">${r.question.isFollowUp ? '↳ ' : ''}${escapeHtml(r.question.q)}</td>
                  <td class="num"><strong>${r.score.total}</strong></td></tr>`).join('')}
              </tbody>
            </table>
            <div class="btn-row" style="justify-content:center;">
              <button class="btn" type="button" id="ivAgain">🔁 ${t('iv.again')}</button>
              <button class="btn secondary" type="button" id="ivChangeAirline">✈️ ${t('iv.changeAirline')}</button>
              <button class="btn secondary" type="button" id="ivExitEnd">${t('game.back')}</button>
            </div>
            <p class="muted-note" style="max-width:560px;margin:14px auto 0;">${t('iv.disclaimer')}</p>
          </div>
        </section>
      `;
      container.querySelector('#ivAgain').addEventListener('click', () => runSession(opts, airlineId));
      container.querySelector('#ivChangeAirline').addEventListener('click', () => start(Object.assign({}, opts, { airlineId: null })));
      container.querySelector('#ivExitEnd').addEventListener('click', onExit);
    }

    renderQuestion();
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  global.InterviewGame = { start, scoreAnswer, buildSession, gradeMeta };
  global.InterviewAccess = InterviewAccess;
})(window);
