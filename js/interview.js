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
  // sections: optional array of section ids to focus on. When given, only
  // those sections are drawn; a single focused section yields more
  // questions so the drill is worthwhile.
  function buildSession(airlineId, sections) {
    const bank = INTERVIEW_BANK.questions;
    const forAirline = (q) => q.airlines === 'all' || (Array.isArray(q.airlines) && q.airlines.indexOf(airlineId) >= 0);
    let plan = INTERVIEW_BANK.SECTION_PLAN;
    if (sections && sections.length) {
      const focus = sections.length === 1 ? 5 : sections.length <= 2 ? 3 : 2;
      plan = INTERVIEW_BANK.SECTION_PLAN
        .filter((p) => sections.indexOf(p.section) >= 0)
        .map((p) => ({ section: p.section, n: focus }));
    }

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

  // pronConfidence: average SpeechRecognition confidence (0-1) for the
  // spoken answer, or null when the student typed. Browsers can't compare
  // free-form speech to a target IPA phoneme-by-phoneme, so we use ASR
  // confidence as an honest pronunciation-clarity proxy: the clearer the
  // pronunciation, the more reliably the engine recognizes the words.
  function scoreAnswer(question, rawText, pronConfidence) {
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

    let vocabHits = 0;
    INTERVIEW_BANK.AVIATION_VOCAB.forEach((v) => { if (text.indexOf(v) >= 0) vocabHits += 1; });
    const vocab = Math.min(1, vocabHits / 2);

    // Pronunciation from ASR confidence. Chrome tends to report 0.7-0.95
    // for clear speech; map that band to 0-1 so the score is discriminating.
    const hasPron = typeof pronConfidence === 'number' && pronConfidence > 0;
    const pron = hasPron ? Math.max(0, Math.min(1, (pronConfidence - 0.5) / 0.4)) : null;

    // Weights: content 40, fluency 30, pronunciation 15, vocab 15. When the
    // answer was typed (no pronunciation), its 15% is redistributed to the
    // other three so typing is never unfairly capped.
    let total;
    if (pron == null) {
      total = (content * 0.40 + fluency * 0.30 + vocab * 0.15) / 0.85;
    } else {
      total = content * 0.40 + fluency * 0.30 + pron * 0.15 + vocab * 0.15;
    }
    total = Math.round(total * 100) / 10;
    return { total, content, fluency, pron, vocab, matched, missed, words, fillerCount };
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
              <div class="iv-airline-logo">${airlineLogo(a)}</div>
              <div class="iv-airline-name">${escapeHtml(a.name)}</div>
              <div class="iv-airline-tag">${escapeHtml(a.tagline[lang] || a.tagline.vi)}</div>
            </button>`).join('')}
        </div>
        <div class="btn-row" style="margin-top:16px;">
          <button class="btn secondary" type="button" id="ivDrill">🗣️ ${t('pd.entry')}</button>
          ${isTeacher() ? `<button class="btn secondary" type="button" id="ivReviewBank">📋 ${t('iv.reviewBank')}</button>` : ''}
        </div>
        <p class="muted-note" style="margin-top:12px;">${t('iv.pickAirlineNote')}</p>
      </section>
    `;
    container.querySelectorAll('.iv-airline-card').forEach((btn) => {
      btn.addEventListener('click', () => pickSections(opts, btn.getAttribute('data-airline')));
    });
    const rb = container.querySelector('#ivReviewBank');
    if (rb) rb.addEventListener('click', () => renderBank(opts));
    const dr = container.querySelector('#ivDrill');
    if (dr && typeof PronDrill !== 'undefined') {
      dr.addEventListener('click', () => PronDrill.start({ container, onExit: () => start(opts) }));
    }
  }

  function isTeacher() {
    return typeof FirebaseSync !== 'undefined' && FirebaseSync.enabled()
      && FirebaseSync.isTeacher(FirebaseSync.getCurrentUser());
  }

  // Teacher-only: browse the whole question bank to cross-check content —
  // grouped by section, filterable by airline, showing each question's
  // Vietnamese gloss, scoring keywords, and model answer.
  function renderBank(opts) {
    const { container } = opts;
    const t = I18N.t;
    const lang = I18N.getLang();
    const airlines = INTERVIEW_BANK.AIRLINES;
    const sections = INTERVIEW_BANK.SECTIONS;
    let airlineFilter = 'all';

    const paint = () => {
      const forA = (q) => airlineFilter === 'all' || q.airlines === 'all'
        || (Array.isArray(q.airlines) && q.airlines.indexOf(airlineFilter) >= 0);
      const total = INTERVIEW_BANK.questions.filter(forA).length;

      const blocks = sections.map((sec) => {
        const qs = INTERVIEW_BANK.questions.filter((q) => q.section === sec.id && forA(q));
        if (!qs.length) return '';
        return `
          <h3 class="detail-h">${sec.icon} ${escapeHtml(sec.label[lang] || sec.label.vi)} <span class="muted-note" style="display:inline;">(${qs.length})</span></h3>
          ${qs.map((q) => {
            const airlineTag = Array.isArray(q.airlines)
              ? q.airlines.map((id) => (airlines[id] ? airlines[id].icon + ' ' + airlines[id].name : id)).join(', ')
              : '';
            const kws = (q.keywords || []).map((k) => `<span>${escapeHtml(String(k).split('|')[0])}</span>`).join('');
            return `
              <div class="iv-bank-item">
                <div class="iv-bank-q">${escapeHtml(q.q)}
                  <button class="speak-btn" type="button" data-speak="${escapeHtml(q.q)}">🔊</button>
                  ${airlineTag ? `<span class="iv-bank-airline">${escapeHtml(airlineTag)}</span>` : ''}
                </div>
                <div class="iv-bank-vi">${escapeHtml(q.qVi || '')}</div>
                ${kws ? `<div class="fb-row"><span class="fb-label">${t('iv.hitKeywords')}</span><span class="syn-list">${kws}</span></div>` : ''}
                ${q.model ? `<details class="iv-details"><summary>💡 ${t('iv.modelAnswer')}</summary><p>${escapeHtml(q.model)}</p></details>` : ''}
              </div>`;
          }).join('')}`;
      }).join('');

      container.innerHTML = `
        <section class="view iv-view">
          <button class="btn secondary" type="button" id="bankBack" style="margin-bottom:12px;">← ${t('game.back')}</button>
          <h1>📋 ${t('iv.bankTitle')}</h1>
          <p style="color:var(--text-muted);margin-top:4px;">${total} ${t('iv.bankCount')}</p>
          <div class="voice-pills" style="margin:12px 0;">
            <button class="voice-pill iv-af ${airlineFilter === 'all' ? 'active' : ''}" data-af="all">${t('bill.filterAll')}</button>
            ${Object.values(airlines).map((a) => `<button class="voice-pill iv-af ${airlineFilter === a.id ? 'active' : ''}" data-af="${a.id}">${a.icon} ${escapeHtml(a.name)}</button>`).join('')}
          </div>
          ${blocks}
        </section>
      `;
      container.querySelector('#bankBack').addEventListener('click', () => start(opts));
      container.querySelectorAll('.iv-af').forEach((b) => {
        b.addEventListener('click', () => { airlineFilter = b.getAttribute('data-af'); paint(); });
      });
      if (typeof Pronunciation !== 'undefined') Pronunciation.bindSpeakers(container);
    };
    paint();
  }

  // Optional airline logo: if the teacher has dropped a licensed logo file
  // at assets/airline-logos/<id>.png it is used; otherwise a branded
  // colored monogram card is shown (real trademarked logos are not bundled).
  function airlineLogo(a) {
    const src = 'assets/airline-logos/' + a.id + '.png';
    return `<img src="${src}" alt="${escapeHtml(a.name)}" class="iv-logo-img"
      onerror="this.remove();" />
      <span class="iv-logo-fallback" style="background:${a.accent};">${a.icon}</span>`;
  }

  // Section picker — choose the whole interview or drill specific sections.
  function pickSections(opts, airlineId) {
    const { container } = opts;
    const t = I18N.t;
    const lang = I18N.getLang();
    const airline = (INTERVIEW_BANK.AIRLINES || {})[airlineId];
    const sections = INTERVIEW_BANK.SECTIONS;
    const selected = new Set();

    container.innerHTML = `
      <section class="view iv-view">
        <button class="btn secondary" type="button" id="secBack" style="margin-bottom:12px;">← ${t('iv.changeAirline')}</button>
        <h1>${airline ? airline.icon + ' ' + escapeHtml(airline.name) : ''}</h1>
        <p style="color:var(--text-muted);margin-top:4px;">${t('iv.pickSectionSub')}</p>
        <div class="iv-section-grid">
          ${sections.map((s) => `
            <button class="iv-section-chip" type="button" data-sec="${s.id}">
              <span class="iv-section-ic">${s.icon}</span>
              <span>${escapeHtml(s.label[lang] || s.label.vi)}</span>
            </button>`).join('')}
        </div>
        <div class="btn-row" style="margin-top:20px;">
          <button class="btn" type="button" id="secFull">🎬 ${t('iv.fullInterview')}</button>
          <button class="btn secondary" type="button" id="secStart" disabled>${t('iv.startSelected')} (<span id="secCount">0</span>)</button>
        </div>
      </section>
    `;
    container.querySelector('#secBack').addEventListener('click', () => start(Object.assign({}, opts, { airlineId: null, sections: null })));
    container.querySelectorAll('.iv-section-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const id = chip.getAttribute('data-sec');
        if (selected.has(id)) { selected.delete(id); chip.classList.remove('active'); }
        else { selected.add(id); chip.classList.add('active'); }
        container.querySelector('#secCount').textContent = selected.size;
        container.querySelector('#secStart').disabled = selected.size === 0;
      });
    });
    container.querySelector('#secFull').addEventListener('click', () => runSession(opts, airlineId));
    container.querySelector('#secStart').addEventListener('click', () => {
      if (!selected.size) return;
      runSession(Object.assign({}, opts, { sections: Array.from(selected) }), airlineId);
    });
  }

  function runSession(opts, airlineId) {
    const { container, onExit } = opts;
    const t = I18N.t;
    const lang = I18N.getLang();
    const airline = (INTERVIEW_BANK.AIRLINES || {})[airlineId] || null;
    const sectionOf = {};
    (INTERVIEW_BANK.SECTIONS || []).forEach((s) => { sectionOf[s.id] = s; });
    const session = buildSession(airlineId, opts.sections);
    const results = []; // {question, text, score}
    let queue = session.slice();
    let followUpsUsed = 0;
    let current = null;
    let answerConfidences = []; // ASR confidence samples for the current answer
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
      answerConfidences = [];
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
          const res = e.results[i];
          const tr = res[0].transcript;
          if (res.isFinal) {
            committed += tr + ' ';
            if (typeof res[0].confidence === 'number' && res[0].confidence > 0) {
              answerConfidences.push(res[0].confidence);
            }
          } else interim += tr;
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
      const avgConf = answerConfidences.length
        ? answerConfidences.reduce((a, b) => a + b, 0) / answerConfidences.length : null;
      const score = scoreAnswer(current, text, avgConf);
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
          ${score.pron == null
            ? `<div class="iv-crit"><span class="iv-crit-label">${t('iv.critPron')}</span><span class="iv-crit-pct" style="width:auto;color:var(--text-muted);">${t('iv.pronTyped')}</span></div>`
            : bar(t('iv.critPron'), score.pron)}
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
