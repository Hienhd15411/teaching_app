(function (global) {
  'use strict';

  // Placement test → level → 4-week roadmap, plus study-schedule helpers.
  //
  // Everything is stored on the student's progress object
  // (progress.placement / progress.roadmap / progress.schedule) so it syncs
  // to the cloud through the existing pipeline and the teacher dashboard
  // sees it without new database nodes or rules.

  const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function todayStr() { return new Date().toISOString().slice(0, 10); }

  // ---------- level / roadmap (pure) ----------

  function levelFor(score) {
    const L = PLACEMENT_BANK.LEVELS;
    let cur = L[0];
    L.forEach((l) => { if (score >= l.min) cur = l; });
    return cur;
  }

  function generateRoadmap(levelId, track) {
    const tr = track || 'toeic';
    const byTrack = PLACEMENT_BANK.ROADMAPS[tr] || PLACEMENT_BANK.ROADMAPS.toeic;
    const tpl = byTrack[levelId] || byTrack.B1;
    return {
      createdAt: Date.now(),
      level: levelId,
      track: tr,
      weeks: tpl.map((w, wi) => ({
        title: w.title,
        items: w.items.map((it, ii) => ({ id: 'w' + (wi + 1) + 'i' + (ii + 1), type: it.type, target: it.target })),
      })),
      manual: {},
    };
  }

  // Resolve an item to {icon, label, go} using existing banks.
  function describeItem(item, lang) {
    const L = lang === 'en' ? 'en' : 'vi';
    if (item.type === 'topic') {
      const tp = (global.TOPICS || []).find((x) => x.id === item.target);
      return { icon: tp ? tp.icon : '📘', label: tp ? tp.title[L] : item.target, kind: L === 'vi' ? 'Chủ đề' : 'Topic' };
    }
    if (item.type === 'toeic') {
      const part = global.TOEIC ? global.TOEIC.PARTS.find((p) => p.id === item.target) : null;
      return { icon: part ? part.icon : '📝', label: part ? part.title[L] : item.target, kind: 'TOEIC' };
    }
    if (item.type === 'interview') {
      const sec = global.INTERVIEW_BANK && INTERVIEW_BANK.SECTIONS
        ? INTERVIEW_BANK.SECTIONS.find((s) => s.id === item.target) : null;
      return { icon: sec ? sec.icon : '✈️', label: sec ? sec.label[L] : item.target, kind: L === 'vi' ? 'Phỏng vấn' : 'Interview' };
    }
    if (item.type === 'drill') {
      const set = global.PRON_DRILL ? PRON_DRILL.SETS.find((s) => s.id === item.target) : null;
      return { icon: set ? set.icon : '🗣️', label: set ? set.label[L] : item.target, kind: L === 'vi' ? 'Phát âm' : 'Pronunciation' };
    }
    return { icon: '•', label: item.target, kind: '' };
  }

  // Completion detection from progress data (plus manual ticks).
  function roadmapStatus(progress) {
    const rm = progress && progress.roadmap;
    if (!rm) return null;
    const since = rm.createdAt || 0;
    const perTopic = progress.perTopic || {};
    const history = Array.isArray(progress.history) ? progress.history : [];
    const interviewSessions = history.filter((h) => h.mode === 'interview' && (h.ts || 0) >= since).length;
    let interviewSeen = 0;
    let total = 0;
    let done = 0;
    const weeks = rm.weeks.map((w) => ({
      title: w.title,
      items: w.items.map((it) => {
        total += 1;
        let ok = !!(rm.manual && rm.manual[it.id]);
        if (!ok) {
          if (it.type === 'topic') {
            const pt = perTopic[it.target];
            ok = !!(pt && (pt.lastPlayedAt || 0) >= since);
          } else if (it.type === 'toeic') {
            ok = Object.keys(perTopic).some((k) => {
              const m = /^toeic_[^_]+_(part\d)$/.exec(k);
              return m && m[1] === it.target && (perTopic[k].lastPlayedAt || 0) >= since;
            });
          } else if (it.type === 'interview') {
            interviewSeen += 1;
            ok = interviewSessions >= interviewSeen;
          }
        }
        if (ok) done += 1;
        return Object.assign({}, it, { done: ok });
      }),
    }));
    return { weeks, total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  function toggleManual(itemId) {
    const p = Storage.getProgress();
    if (!p.roadmap) return;
    p.roadmap.manual = p.roadmap.manual || {};
    if (p.roadmap.manual[itemId]) delete p.roadmap.manual[itemId]; else p.roadmap.manual[itemId] = true;
    Storage.saveProgress(p);
  }

  // ---------- schedule helpers (pure-ish) ----------

  const Schedule = {
    get(progress) { return (progress && progress.schedule) || null; },
    save(sch) {
      const p = Storage.getProgress();
      p.schedule = sch;
      Storage.saveProgress(p);
    },
    isDay(sch, date) {
      if (!sch || !sch.days || !sch.days.length) return false;
      return sch.days.indexOf(DAY_KEYS[(date || new Date()).getDay()]) >= 0;
    },
    studiedOn(progress, dateStr) {
      return (progress.history || []).some((h) => h.date === dateStr);
    },
    // Scheduled days in the current Mon–Sun week that already passed
    // (today counts once its time has passed) with no study session.
    missedThisWeek(progress) {
      const sch = this.get(progress);
      if (!sch || !sch.days) return { missed: 0, planned: 0, missedDays: [] };
      const now = new Date();
      const dow = (now.getDay() + 6) % 7; // Mon=0
      const monday = new Date(now); monday.setDate(now.getDate() - dow); monday.setHours(0, 0, 0, 0);
      const [hh, mm] = String(sch.time || '20:00').split(':').map(Number);
      let missed = 0; let planned = 0; const missedDays = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday); d.setDate(monday.getDate() + i);
        if (!this.isDay(sch, d)) continue;
        const due = new Date(d); due.setHours(hh || 0, mm || 0, 0, 0);
        if (due > now) continue; // still upcoming
        planned += 1;
        const ds = d.toISOString().slice(0, 10);
        if (!this.studiedOn(progress, ds)) { missed += 1; missedDays.push(DAY_KEYS[d.getDay()]); }
      }
      return { missed, planned, missedDays };
    },
    // Today's reminder state for the in-app banner.
    todayState(progress) {
      const sch = this.get(progress);
      if (!sch || !this.isDay(sch, new Date())) return null;
      const studied = this.studiedOn(progress, todayStr());
      const [hh, mm] = String(sch.time || '20:00').split(':').map(Number);
      const due = new Date(); due.setHours(hh || 0, mm || 0, 0, 0);
      return { studied, time: sch.time, minutes: sch.minutes, overdue: !studied && new Date() > due };
    },
    // RFC 5545 calendar with a weekly recurring event + 10-min alarm.
    icsText(sch, title) {
      const byday = { mon: 'MO', tue: 'TU', wed: 'WE', thu: 'TH', fri: 'FR', sat: 'SA', sun: 'SU' };
      const [hh, mm] = String(sch.time || '20:00').split(':').map(Number);
      // First occurrence: next scheduled day from today.
      const start = new Date();
      for (let i = 0; i < 7; i++) {
        const d = new Date(); d.setDate(start.getDate() + i);
        if (this.isDay(sch, d)) { start.setTime(d.getTime()); break; }
      }
      start.setHours(hh || 0, mm || 0, 0, 0);
      const end = new Date(start.getTime() + (sch.minutes || 20) * 60000);
      const fmt = (d) => d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0')
        + 'T' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0') + '00';
      const days = sch.days.map((k) => byday[k]).filter(Boolean).join(',');
      return [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Vocab Quest//Study Plan//VI', 'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        'UID:vocabquest-study-' + Date.now() + '@vocabquest',
        'DTSTAMP:' + fmt(new Date()),
        'DTSTART:' + fmt(start),
        'DTEND:' + fmt(end),
        'RRULE:FREQ=WEEKLY;BYDAY=' + days,
        'SUMMARY:' + (title || 'Học tiếng Anh — Vocab Quest'),
        'DESCRIPTION:Mở app và học ' + (sch.minutes || 20) + ' phút.',
        'BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', 'DESCRIPTION:Đến giờ học tiếng Anh', 'END:VALARM',
        'END:VEVENT', 'END:VCALENDAR',
      ].join('\r\n');
    },
    downloadIcs(sch, title) {
      const blob = new Blob([this.icsText(sch, title)], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'lich-hoc-vocab-quest.ics';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    },
    // Browser notification while the app tab is open (no backend needed).
    // Checked once a minute; fires at the scheduled time on scheduled days
    // if the student hasn't studied yet today.
    _timer: null,
    startInPageNotifier() {
      if (this._timer || typeof Notification === 'undefined') return;
      this._timer = setInterval(() => {
        try {
          if (Notification.permission !== 'granted') return;
          const p = Storage.getProgress();
          const sch = this.get(p);
          if (!sch || !sch.remind || !this.isDay(sch, new Date())) return;
          const now = new Date();
          const hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
          if (hhmm !== sch.time) return;
          const key = 'vlt_notified_' + todayStr();
          if (localStorage.getItem(key) || this.studiedOn(p, todayStr())) return;
          localStorage.setItem(key, '1');
          new Notification('⏰ Đến giờ học tiếng Anh', { body: 'Học ' + (sch.minutes || 20) + ' phút hôm nay để giữ chuỗi 🔥' });
        } catch (e) {}
      }, 60000);
    },
    async requestPermission() {
      if (typeof Notification === 'undefined') return 'unsupported';
      if (Notification.permission === 'granted') return 'granted';
      try { return await Notification.requestPermission(); } catch (e) { return 'denied'; }
    },
  };

  // ---------- the test flow ----------

  function buildVocabQuestions(perTier) {
    const V = global.VOCAB || {};
    const tiers = PLACEMENT_BANK.VOCAB_TIERS;
    const out = [];
    Object.keys(perTier).forEach((tier) => {
      const pool = [];
      (tiers[tier] || []).forEach((tid) => (V[tid] || []).forEach((w) => pool.push(Object.assign({ topic: tid }, w))));
      const picks = shuffle(pool).slice(0, perTier[tier]);
      picks.forEach((w) => {
        const others = shuffle(pool.filter((x) => x.en !== w.en)).slice(0, 3);
        out.push({ tier, word: w, options: shuffle([w].concat(others)) });
      });
    });
    return shuffle(out);
  }

  function buildGrammarQuestions(counts) {
    const G = PLACEMENT_BANK.GRAMMAR;
    const by = (tier) => shuffle(G.filter((g) => g.tier === tier));
    return shuffle([].concat(by('easy').slice(0, counts.easy || 0), by('medium').slice(0, counts.medium || 0), by('hard').slice(0, counts.hard || 0)));
  }

  function start(opts) {
    const { container, onDone, onExit } = opts;
    const t = I18N.t;
    const lang = I18N.getLang();
    const L = lang === 'en' ? 'en' : 'vi';
    let track = null;        // PLACEMENT_BANK.TRACKS entry
    let vocabQs = [];
    let grammarQs = [];
    let prompts = [];
    const answers = { vocab: [], grammar: [], speaking: [] };
    let stage = 'intro';
    let idx = 0;
    let recognition = null;
    let listening = false;
    let confs = [];

    function hud(label, i, n) {
      return `
        <div class="game-hud">
          <button class="btn secondary" type="button" id="plExit">← ${t('game.back')}</button>
          <span class="chip">${label}</span>
          <span class="chip">${i}/${n}</span>
          <div class="progress-bar"><span style="width:${Math.round((i - 1) / n * 100)}%"></span></div>
        </div>`;
    }
    function bindExit() {
      const b = container.querySelector('#plExit');
      if (b) b.addEventListener('click', () => { stopAsr(); onExit(); });
    }

    function renderIntro() {
      const TR = PLACEMENT_BANK.TRACKS;
      container.innerHTML = `
        <section class="view iv-view">
          <div class="pl-intro">
            <div class="big">🎯</div>
            <h1>${t('pl.title')}</h1>
            <p>${t('pl.chooseTrack')}</p>
            <div class="iv-airline-grid" style="text-align:left;">
              ${Object.values(TR).map((tr) => `
                <button class="iv-airline-card" type="button" data-track="${tr.id}">
                  <div class="iv-airline-icon" style="font-size:40px;">${tr.icon}</div>
                  <div class="iv-airline-name">${esc(tr.label[L])}</div>
                  <div class="iv-airline-tag">${esc(tr.desc[L])}</div>
                </button>`).join('')}
            </div>
            <div class="btn-row" style="justify-content:center;margin-top:18px;">
              <button class="btn secondary" type="button" id="plExit">${t('game.back')}</button>
            </div>
          </div>
        </section>`;
      bindExit();
      container.querySelectorAll('[data-track]').forEach((b) => b.addEventListener('click', () => beginTrack(b.getAttribute('data-track'))));
    }

    function beginTrack(id) {
      track = PLACEMENT_BANK.TRACKS[id] || PLACEMENT_BANK.TRACKS.toeic;
      vocabQs = buildVocabQuestions(track.vocabTiers);
      grammarQs = buildGrammarQuestions(track.grammar);
      prompts = PLACEMENT_BANK.SPEAKING_PROMPTS.slice(0, track.speaking || 0);
      answers.vocab = []; answers.grammar = []; answers.speaking = [];
      stage = 'vocab'; idx = 0;
      renderVocab();
    }
    if (opts.track && PLACEMENT_BANK.TRACKS[opts.track]) {
      // Deep link straight into a track (e.g. "test this track" button).
      setTimeout(() => beginTrack(opts.track), 0);
    }

    function renderVocab() {
      if (idx >= vocabQs.length) { stage = 'grammar'; idx = 0; return renderGrammar(); }
      const q = vocabQs[idx];
      container.innerHTML = `
        <section class="view game-view iv-view">
          ${hud('📚 ' + t('pl.vocab'), idx + 1, vocabQs.length)}
          <div class="quiz-question"><div>${esc(q.word.en)}</div><div class="sub">${t('pl.pickMeaning')}</div></div>
          <div class="quiz-options">
            ${q.options.map((o) => `<button class="quiz-option" type="button" data-en="${esc(o.en)}">${esc(o.vi)}</button>`).join('')}
          </div>
        </section>`;
      bindExit();
      container.querySelectorAll('.quiz-option').forEach((b) => {
        b.addEventListener('click', () => {
          answers.vocab.push({ tier: q.tier, correct: b.getAttribute('data-en') === q.word.en });
          idx += 1; renderVocab();
        });
      });
    }

    function renderGrammar() {
      if (idx >= grammarQs.length) { stage = 'speaking'; return renderSpeaking(); }
      const g = grammarQs[idx];
      container.innerHTML = `
        <section class="view game-view iv-view">
          ${hud('✏️ ' + t('pl.grammar'), idx + 1, grammarQs.length)}
          <div class="quiz-question" style="font-size:20px;">${esc(g.q)}</div>
          <div class="quiz-options">
            ${g.choices.map((c, i) => `<button class="quiz-option" type="button" data-i="${i}">(${String.fromCharCode(65 + i)}) ${esc(c)}</button>`).join('')}
          </div>
        </section>`;
      bindExit();
      container.querySelectorAll('.quiz-option').forEach((b) => {
        b.addEventListener('click', () => {
          answers.grammar.push({ id: g.id, tier: g.tier, correct: Number(b.getAttribute('data-i')) === g.answer, g });
          idx += 1; renderGrammar();
        });
      });
    }

    const SR = global.SpeechRecognition || global.webkitSpeechRecognition;
    function stopAsr() {
      if (recognition) { try { recognition.onend = null; recognition.stop(); } catch (e) {} recognition = null; }
      listening = false;
    }

    function renderSpeaking() {
      if (!prompts.length || idx >= prompts.length) return finish();
      const pr = prompts[idx];
      confs = [];
      container.innerHTML = `
        <section class="view game-view iv-view">
          ${hud('🎤 ' + t('pl.speaking'), idx + 1, prompts.length)}
          <div class="iv-question-card">
            <div class="iv-question">${esc(pr.q)}
              <button class="speak-btn big" type="button" data-speak="${esc(pr.q)}">🔊</button></div>
            <div class="iv-question-vi">${esc(pr.qVi)}</div>
          </div>
          <div class="iv-answer-zone">
            ${SR ? `<div class="mic-stage"><button class="mic-btn" type="button" id="plMic"><span class="mic-icon">🎤</span><span id="plMicLabel">${t('iv.tapToAnswer')}</span></button></div>` : ''}
            <textarea id="plText" class="iv-textarea" rows="4" placeholder="${t('iv.typeHere')}"></textarea>
            <div class="btn-row" style="justify-content:center;margin-top:10px;">
              <button class="btn" type="button" id="plSubmit">${t('iv.submit')}</button>
              <button class="btn secondary" type="button" id="plSkip">${t('pl.skipSpeaking')}</button>
            </div>
          </div>
        </section>`;
      bindExit();
      if (typeof Pronunciation !== 'undefined') Pronunciation.bindSpeakers(container);
      const ta = container.querySelector('#plText');
      if (SR) {
        container.querySelector('#plMic').addEventListener('click', () => {
          if (listening) { stopAsr(); syncMic(); return; }
          recognition = new SR();
          recognition.lang = 'en-US'; recognition.continuous = true; recognition.interimResults = true;
          let committed = ta.value ? ta.value.trim() + ' ' : '';
          recognition.onresult = (e) => {
            let interim = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
              const r = e.results[i];
              if (r.isFinal) { committed += r[0].transcript + ' '; if (r[0].confidence > 0) confs.push(r[0].confidence); }
              else interim += r[0].transcript;
            }
            ta.value = (committed + interim).trim();
          };
          recognition.onend = () => { listening = false; syncMic(); };
          recognition.onerror = () => { listening = false; syncMic(); };
          try { recognition.start(); listening = true; } catch (e) { listening = false; }
          syncMic();
        });
      }
      function syncMic() {
        const b = container.querySelector('#plMic'); const l = container.querySelector('#plMicLabel');
        if (!b) return; b.classList.toggle('listening', listening);
        if (l) l.textContent = listening ? t('iv.listening') : t('iv.tapToAnswer');
      }
      container.querySelector('#plSubmit').addEventListener('click', () => {
        stopAsr();
        const text = ta.value.trim();
        let score = null;
        if (text && global.InterviewGame && global.INTERVIEW_BANK) {
          const q = INTERVIEW_BANK.questions.find((x) => x.id === pr.bankId) || INTERVIEW_BANK.questions[0];
          const conf = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : null;
          score = InterviewGame.scoreAnswer(q, text, conf).total; // 0-10
        }
        answers.speaking.push({ id: pr.id, text, score });
        idx += 1; renderSpeaking();
      });
      container.querySelector('#plSkip').addEventListener('click', () => { stopAsr(); answers.speaking.push({ id: pr.id, text: '', score: null }); idx += 1; renderSpeaking(); });
    }

    function pct(list) { return list.length ? Math.round(list.filter((a) => a.correct).length / list.length * 100) : 0; }

    function finish() {
      const vocabPct = pct(answers.vocab);
      const grammarPct = pct(answers.grammar);
      const tierPct = (list, tier) => pct(list.filter((a) => a.tier === tier));
      const spoken = answers.speaking.filter((s) => typeof s.score === 'number');
      const speakingPct = spoken.length
        ? Math.round(spoken.reduce((a, s) => a + s.score, 0) / spoken.length * 10) : null;
      // Track weights; if speaking was skipped its weight is redistributed.
      const w = Object.assign({}, track.weights);
      if (speakingPct == null) { const rest = w.vocab + w.grammar; w.vocab = w.vocab / rest; w.grammar = w.grammar / rest; w.speaking = 0; }
      const composite = Math.round(vocabPct * w.vocab + grammarPct * w.grammar + (speakingPct || 0) * w.speaking);
      const level = levelFor(composite);

      const placement = {
        track: track.id, takenAt: Date.now(), score: composite, level: level.id, toeic: level.toeic,
        vocabPct, grammarPct, speakingPct,
        tiers: {
          vocab: { easy: tierPct(answers.vocab, 'easy'), medium: tierPct(answers.vocab, 'medium'), hard: tierPct(answers.vocab, 'hard') },
          grammar: { easy: tierPct(answers.grammar, 'easy'), medium: tierPct(answers.grammar, 'medium'), hard: tierPct(answers.grammar, 'hard') },
        },
      };
      const p = Storage.getProgress();
      p.placements = p.placements || {};
      p.placements[track.id] = placement;
      p.placement = placement;                       // latest, for teacher chip / back-compat
      p.roadmap = generateRoadmap(level.id, track.id);
      Storage.saveProgress(p);
      renderResult(placement, level);
    }

    function renderResult(pl, level) {
      const wrong = answers.grammar.filter((a) => !a.correct);
      container.innerHTML = `
        <section class="view iv-view">
          <div class="game-result">
            <div class="big">${level.icon}</div>
            <h2>${track.icon} ${esc(track.label[L])} — ${t('pl.resultTitle')}</h2>
            <div class="grade-card grade-good" style="max-width:340px;">
              <div class="grade-label">${t('pl.yourLevel')}</div>
              <div class="grade-score" style="font-size:38px;">${esc(level.label[L])}</div>
              <div class="grade-rank">${track.id === 'toeic' ? 'TOEIC ≈ ' + esc(level.toeic) : t('pl.convLevelHint')}</div>
            </div>
            <div class="stats">
              <div class="stat"><div class="v">${pl.vocabPct}%</div><div class="l">${t('pl.vocab')}</div></div>
              <div class="stat"><div class="v">${pl.grammarPct}%</div><div class="l">${t('pl.grammar')}</div></div>
              <div class="stat"><div class="v">${pl.speakingPct == null ? '—' : pl.speakingPct + '%'}</div><div class="l">${t('pl.speaking')}</div></div>
            </div>
            ${wrong.length ? `<details class="iv-details" style="max-width:640px;margin:14px auto;"><summary>✏️ ${t('pl.reviewGrammar')} (${wrong.length})</summary>
              ${wrong.map((a) => `<p><strong>${esc(a.g.q)}</strong><br/>✅ ${esc(a.g.choices[a.g.answer])} — <span class="muted-note" style="display:inline;">${esc(a.g.explain)}</span></p>`).join('')}
            </details>` : ''}
            <p style="max-width:560px;margin:10px auto;color:var(--text-muted);">${t('pl.roadmapMade')}</p>
            <div class="btn-row" style="justify-content:center;">
              <button class="btn" type="button" id="plDone">🗺️ ${t('pl.viewRoadmap')}</button>
            </div>
          </div>
        </section>`;
      container.querySelector('#plDone').addEventListener('click', onDone);
    }

    renderIntro();
  }

  global.Placement = {
    start, levelFor, generateRoadmap, roadmapStatus, describeItem, toggleManual, Schedule, DAY_KEYS,
  };
})(window);
