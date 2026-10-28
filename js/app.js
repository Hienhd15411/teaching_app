(function (global) {
  'use strict';

  const appEl = document.getElementById('app');
  const navEl = document.getElementById('mainNav');
  const chipEl = document.getElementById('profileChip');
  const langBtn = document.getElementById('langToggle');
  const voiceBtn = document.getElementById('voiceToggle');
  const switchBtn = document.getElementById('switchProfileBtn');

  let currentView = null;

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  let currentParams = null;

  // Views register teardown (mic, timers, document listeners) here; it runs
  // on every navigation, whatever button or Back gesture caused it.
  const leaveHandlers = [];
  function onLeave(fn) { if (typeof fn === 'function') leaveHandlers.push(fn); }
  function runLeaveHandlers() {
    while (leaveHandlers.length) {
      const fn = leaveHandlers.pop();
      try { fn(); } catch (e) { console.warn('[app] leave handler failed', e); }
    }
  }

  // Local calendar date (Vietnam is UTC+7: toISOString() gives YESTERDAY
  // between 00:00 and 07:00).
  function localYmd(d) {
    const x = d instanceof Date ? d : new Date(d);
    return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  }

  function navigate(view, params, opts) {
    const o = opts || {};
    const fb = typeof FirebaseSync !== 'undefined' && FirebaseSync.enabled();
    // Auth guard: signed-in users never see the sign-in form (e.g. via
    // Back), signed-out users never see app views.
    if (fb) {
      const signedIn = !!FirebaseSync.getCurrentUser();
      if (signedIn && view === 'profile') { view = 'topics'; params = null; }
      else if (!signedIn && view !== 'profile') { view = 'profile'; params = null; }
    } else if (view !== 'profile' && !Storage.getActiveProfileId()) {
      view = 'profile'; params = null;
    }
    // Interview is per-student gated; roadmap links and Back must respect it.
    if (view === 'interview' && fb && !o.accessOk && typeof InterviewAccess !== 'undefined') {
      const u = FirebaseSync.getCurrentUser();
      InterviewAccess.isEnabledFor(u).then((ok) => {
        if (ok) navigate('interview', params, Object.assign({}, o, { accessOk: true }));
        else {
          toast('🔒 ' + I18N.t('iv.locked'));
          if (o.fromPop || !currentView) navigate('topics', null, { fromPop: true });
        }
      });
      return;
    }

    runLeaveHandlers();
    currentView = view;
    currentParams = params || null;
    // Push a browser-history entry so the device/browser Back button walks
    // back through in-app views instead of leaving the app. When the call
    // itself came from a popstate (Back), don't push again.
    if (typeof history !== 'undefined') {
      try {
        if (o.replace) history.replaceState({ view: view, params: params || null }, '');
        else if (!o.fromPop) history.pushState({ view: view, params: params || null }, '');
      } catch (e) {}
    }
    if (view === 'game') currentToeicContext = (params && params.toeicContext) || null;
    renderHeader();
    highlightNav(view);
    switch (view) {
      case 'profile':
        ProfileView.render(appEl);
        break;
      case 'topics':
        renderTopics();
        break;
      case 'topic':
        renderTopicDetail(params.topicId);
        break;
      case 'progress':
        renderProgress();
        break;
      case 'toeic':
        renderToeic();
        break;
      case 'class':
        renderClass();
        break;
      case 'toeic-part':
        renderToeicPart(params.editionId, params.partId);
        break;
      case 'game':
        renderGame(params);
        break;
      case 'interview':
        InterviewGame.start({ container: appEl, onExit: () => navigate('topics'), sections: params && params.sections });
        break;
      case 'placement':
        Placement.start({ container: appEl, onDone: () => navigate('progress'), onExit: () => navigate('progress'), track: params && params.track });
        break;
      case 'drill':
        PronDrill.start({ container: appEl, onExit: () => navigate('progress'), setId: params && params.setId });
        break;
      default:
        renderTopics();
    }
  }

  function highlightNav(view) {
    navEl.querySelectorAll('.nav-btn').forEach((b) => {
      const v = b.getAttribute('data-view-link');
      const matches = v === view
        || (view === 'topic' && v === 'topics')
        || (view === 'game' && v === 'topics' && !currentToeicContext)
        || (view === 'game' && v === 'toeic' && currentToeicContext)
        || (view === 'toeic-part' && v === 'toeic')
        || (view === 'class' && v === 'class');
      b.classList.toggle('active', matches);
    });
  }

  // Tracks whether the current game was launched from a TOEIC Part (for routing back).
  let currentToeicContext = null;

  function renderHeader() {
    const p = Storage.getActiveProfile();
    if (p) {
      chipEl.hidden = false;
      navEl.hidden = false;
      const avatarEl = document.getElementById('profileAvatar');
      const nameEl = document.getElementById('profileName');
      avatarEl.textContent = p.avatar || '🙂';
      nameEl.textContent = p.name;
      nameEl.title = p.name;

      const cloudAuth = typeof FirebaseSync !== 'undefined'
        && FirebaseSync.enabled()
        && FirebaseSync.getCurrentUser();
      if (switchBtn) {
        if (cloudAuth) {
          switchBtn.classList.add('signout-btn');
          switchBtn.innerHTML = '⎋ ' + I18N.t('auth.signOut');
          switchBtn.title = I18N.t('auth.signOut');
        } else {
          switchBtn.classList.remove('signout-btn');
          switchBtn.innerHTML = '↺';
          switchBtn.title = I18N.t('profile.switch') || 'Đổi profile';
        }
      }
    } else {
      chipEl.hidden = true;
      navEl.hidden = true;
      // Clear residual text so nothing leaks into the next login.
      const nameEl = document.getElementById('profileName');
      const avatarEl = document.getElementById('profileAvatar');
      if (nameEl) { nameEl.textContent = ''; nameEl.title = ''; }
      if (avatarEl) avatarEl.textContent = '🙂';
    }
  }

  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 200);
    }, 1600);
  }

  // ========== Topics list ==========
  function renderTopics() {
    const t = I18N.t;
    const lang = I18N.getLang();
    const progress = Storage.getProgress();

    const cards = TOPICS.map((topic) => {
      const words = VOCAB[topic.id] || [];
      const stats = SRS.topicStats(progress, topic.id, words);
      return `
        <div class="topic-card" data-topic="${topic.id}">
          <div class="title-row">
            <span class="icon">${topic.icon}</span>
            <div>
              <div class="title">${topic.title[lang]}</div>
              <div class="subtitle">${words.length} ${t('topics.wordsCount')}</div>
            </div>
          </div>
          <div class="desc">${topic.desc[lang]}</div>
          <div class="progress-bar"><span style="width:${stats.masteryPct}%"></span></div>
          <div class="stats">
            <span>${stats.mastered}/${stats.total} ${t('topics.mastered')}</span>
            <span>${stats.masteryPct}%</span>
          </div>
        </div>
      `;
    }).join('');

    appEl.innerHTML = `
      <section class="view">
        ${renderTopicsPrompt(progress, lang)}
        <div class="topics-header">
          <div>
            <h1>${t('topics.title')}</h1>
            <p>${t('topics.subtitle')}</p>
          </div>
        </div>
        <div class="topics-grid">${cards}</div>
      </section>
    `;

    appEl.querySelectorAll('.topic-card').forEach((el) => {
      el.addEventListener('click', () => {
        navigate('topic', { topicId: el.getAttribute('data-topic') });
      });
    });
    // Placement CTA on the Topics tab (was rendered but never wired).
    appEl.querySelectorAll('#plGo').forEach((b) => b.addEventListener('click', () => navigate('placement')));
  }

  // ========== Topic detail (mode picker + word list) ==========
  function renderTopicDetail(topicId) {
    const t = I18N.t;
    const lang = I18N.getLang();
    const topic = TOPICS.find((x) => x.id === topicId);
    if (!topic) return navigate('topics');
    const words = VOCAB[topicId] || [];
    const progress = Storage.getProgress();
    const stats = SRS.topicStats(progress, topicId, words);

    const wrongs = SRS.wrongWords(progress, topicId, words);
    const reviewBtn = wrongs.length
      ? `<button class="btn secondary" id="reviewWrongBtn">🩹 ${t('progress.reviewWrong')} (${wrongs.length})</button>`
      : '';

    appEl.innerHTML = `
      <section class="view topic-detail">
        <button class="back" id="backBtn">${t('topic.back')}</button>
        <h1>${topic.icon} ${topic.title[lang]}</h1>
        <p style="color:var(--text-muted)">${topic.desc[lang]}</p>
        <div class="progress-bar" style="margin:14px 0;"><span style="width:${stats.masteryPct}%"></span></div>
        <div style="color:var(--text-muted);font-size:13px;">
          ${stats.mastered}/${stats.total} ${t('topics.mastered')} · ${stats.masteryPct}%
        </div>
        ${renderLearnSummary(progress, topicId, words)}

        <h2 style="margin-top:24px;">${t('topic.chooseMode')}</h2>
        <div class="mode-grid">
          <div class="mode-card" data-mode="flashcard">
            <div class="icon">🎴</div>
            <div class="title">${t('mode.flashcard')}</div>
            <div class="desc">${t('mode.flashcardDesc')}</div>
          </div>
          <div class="mode-card" data-mode="quiz">
            <div class="icon">❓</div>
            <div class="title">${t('mode.quiz')}</div>
            <div class="desc">${t('mode.quizDesc')}</div>
          </div>
          <div class="mode-card" data-mode="typing">
            <div class="icon">⌨️</div>
            <div class="title">${t('mode.typing')}</div>
            <div class="desc">${t('mode.typingDesc')}</div>
          </div>
          <div class="mode-card" data-mode="matching">
            <div class="icon">🔗</div>
            <div class="title">${t('mode.matching')}</div>
            <div class="desc">${t('mode.matchingDesc')}</div>
          </div>
          <div class="mode-card" data-mode="speaking">
            <div class="icon">🎤</div>
            <div class="title">${t('mode.speaking')}</div>
            <div class="desc">${t('mode.speakingDesc')}</div>
          </div>
        </div>

        ${reviewBtn}

        <h2 style="margin-top:24px;">${t('topic.allWords')}</h2>
        ${renderWordFilter()}
        <div class="word-list" id="wordList"></div>
      </section>
    `;

    appEl.querySelector('#backBtn').addEventListener('click', () => navigate('topics'));
    appEl.querySelectorAll('.mode-card').forEach((el) => {
      el.addEventListener('click', () => {
        navigate('game', { topicId, mode: el.getAttribute('data-mode') });
      });
    });
    if (reviewBtn) {
      appEl.querySelector('#reviewWrongBtn').addEventListener('click', () => {
        navigate('game', { topicId, mode: 'quiz', wordsOverride: wrongs });
      });
    }

    const wordListEl = appEl.querySelector('#wordList');
    wordListEl.innerHTML = words.map((w) => renderWordRow(w, topicId, progress)).join('');
    wireWordFilter(appEl);
    if (typeof Pronunciation !== 'undefined') Pronunciation.bindSpeakers(wordListEl);
  }

  // "Đã học x/N · Chưa học y · Cần ôn z" + what each mode picks.
  function renderLearnSummary(progress, topicId, words) {
    const t = I18N.t;
    const ls = SRS.learnStatus(progress, topicId, words);
    return `
      <div class="learn-summary">
        <span class="ls-chip learned">✅ ${t('learn.learned')} <strong>${ls.learned}/${ls.total}</strong></span>
        <span class="ls-chip new">🆕 ${t('learn.unseen')} <strong>${ls.unseen}</strong></span>
        <span class="ls-chip due">🔁 ${t('learn.due')} <strong>${ls.due}</strong></span>
      </div>
      <div class="muted-note learn-hint">${t('learn.modeHint')}</div>`;
  }

  function renderWordFilter() {
    const t = I18N.t;
    return `
      <div class="btn-row word-filter">
        ${['all', 'new', 'learned', 'due'].map((k) =>
          `<button type="button" class="voice-pill ${k === 'all' ? 'active' : ''}" data-wf="${k}">${t('learn.filter.' + k)}</button>`).join('')}
      </div>`;
  }

  function wireWordFilter(root) {
    const btns = root.querySelectorAll('[data-wf]');
    btns.forEach((b) => b.addEventListener('click', () => {
      const f = b.getAttribute('data-wf');
      btns.forEach((x) => x.classList.toggle('active', x === b));
      root.querySelectorAll('.word-row[data-status]').forEach((row) => {
        const st = row.getAttribute('data-status');
        const show = f === 'all'
          || (f === 'new' && st === 'new')
          || (f === 'learned' && st !== 'new')
          || (f === 'due' && st === 'due');
        row.style.display = show ? '' : 'none';
      });
    }));
  }

  // ========== Game runner ==========
  function renderGame(params) {
    const { topicId, mode, wordsOverride, toeicContext } = params;
    const words = wordsOverride && wordsOverride.length ? wordsOverride : (VOCAB[topicId] || []);
    currentToeicContext = toeicContext || null;
    const exitTarget = toeicContext
      ? () => navigate('toeic-part', { editionId: toeicContext.editionId, partId: toeicContext.partId })
      : () => navigate('topic', { topicId });
    if (!words.length) return exitTarget();

    const progress = Storage.getProgress();
    const sessionWords = SRS.pickSession(progress, topicId, words.slice(), Math.min(10, words.length), mode);

    const game = getGameModule(mode);
    if (!game) return exitTarget();

    // Distractors / same-meaning answers come from the whole topic (or TOEIC
    // part), not just the review list — a 1-word review used to make every
    // quiz question single-option.
    const pool = toeicContext ? words : ((VOCAB[topicId] && VOCAB[topicId].length) ? VOCAB[topicId] : words);
    const reviewWords = (!toeicContext && wordsOverride && wordsOverride.length) ? wordsOverride : null;
    game.start({
      container: appEl,
      topicId,
      words: sessionWords,
      allTopicWords: pool,
      onExit: exitTarget,
      onFinish: (result) => handleFinish(Object.assign({ mode, topicId, toeicContext, reviewWords }, result)),
    });
  }

  function getGameModule(mode) {
    if (mode === 'flashcard') return FlashcardGame;
    if (mode === 'quiz') return QuizGame;
    if (mode === 'typing') return TypingGame;
    if (mode === 'matching') return MatchingGame;
    if (mode === 'speaking') return SpeakingGame;
    return null;
  }

  function handleFinish(result) {
    const { progress, newBadges } = Progress.finishSession(result);
    renderGameResult(result, progress, newBadges);
  }

  function renderGameResult(result, progress, newBadges) {
    const t = I18N.t;
    const total = result.correct + result.wrong;
    const acc = total ? Math.round((result.correct / total) * 100) : 0;
    const dur = Math.round(result.durationSec || 0);
    // Vietnamese 10-point grading scale
    const score10 = total ? Math.round((result.correct / total) * 100) / 10 : 0;
    const gradeLabel =
      acc >= 90 ? t('result.gradeExcellent') :
      acc >= 80 ? t('result.gradeGood') :
      acc >= 70 ? t('result.gradeFair') :
      acc >= 50 ? t('result.gradePass') :
      t('result.gradeFail');
    const gradeClass =
      acc >= 90 ? 'grade-excellent' :
      acc >= 80 ? 'grade-good' :
      acc >= 70 ? 'grade-fair' :
      acc >= 50 ? 'grade-pass' :
      'grade-fail';
    const gradeEmoji =
      acc >= 90 ? '🏆' :
      acc >= 80 ? '🎉' :
      acc >= 70 ? '👏' :
      acc >= 50 ? '👍' :
      '💪';
    const badgeHtml = (newBadges || []).map((id) => {
      const b = Progress.getBadgeDef(id);
      return `<span class="badge-earned">${b.emoji} ${t(b.nameKey)}</span>`;
    }).join('');

    appEl.innerHTML = `
      <section class="view game-view">
        <div class="game-result">
          <div class="big">${gradeEmoji}</div>
          <h2>${t('result.title')}</h2>
          <div class="grade-card ${gradeClass}">
            <div class="grade-label">${t('result.grade')}</div>
            <div class="grade-score">${score10.toFixed(1)}<span class="grade-max">/10</span></div>
            <div class="grade-rank">${gradeLabel}</div>
          </div>
          <div class="stats">
            <div class="stat"><div class="v">${result.correct}/${total}</div><div class="l">${t('game.correct')}</div></div>
            <div class="stat"><div class="v">${acc}%</div><div class="l">${t('result.accuracy')}</div></div>
            <div class="stat"><div class="v">+${result.xp}</div><div class="l">${t('result.xpEarned')}</div></div>
            <div class="stat"><div class="v">${result.bestCombo || 0}</div><div class="l">${t('result.bestCombo')}</div></div>
            <div class="stat"><div class="v">${dur}s</div><div class="l">${t('result.time')}</div></div>
          </div>
          ${badgeHtml ? `<div style="margin-top:12px;"><div style="color:var(--text-muted);font-size:12px;margin-bottom:6px;">${t('result.newBadges')}</div>${badgeHtml}</div>` : ''}
          <div class="btn-row" style="justify-content:center;margin-top:20px;">
            <button class="btn secondary" id="againBtn">${t('result.playAgain')}</button>
            <button class="btn" id="backToTopicBtn">${t('result.backToTopics')}</button>
          </div>
        </div>
      </section>
    `;

    appEl.querySelector('#againBtn').addEventListener('click', () => {
      if (result.toeicContext) {
        navigate('game', {
          topicId: result.topicId,
          mode: result.mode,
          wordsOverride: TOEIC.allWordsInPart(result.toeicContext.editionId, result.toeicContext.partId),
          toeicContext: result.toeicContext,
        });
      } else if (result.reviewWords) {
        // "Play again" on a review round reviews the words still wrong.
        const left = SRS.wrongWords(Storage.getProgress(), result.topicId, VOCAB[result.topicId] || []);
        navigate('game', left.length ? { topicId: result.topicId, mode: result.mode, wordsOverride: left } : { topicId: result.topicId, mode: result.mode });
      } else {
        navigate('game', { topicId: result.topicId, mode: result.mode });
      }
    });
    appEl.querySelector('#backToTopicBtn').addEventListener('click', () => {
      if (result.toeicContext) {
        navigate('toeic-part', {
          editionId: result.toeicContext.editionId,
          partId: result.toeicContext.partId,
        });
      } else {
        navigate('topic', { topicId: result.topicId });
      }
    });
  }

  // ========== Progress view ==========
  function renderProgress() {
    const t = I18N.t;
    const lang = I18N.getLang();
    const stats = Progress.globalStats();
    const progress = Storage.getProgress();

    if (!stats.wordsSeen && !progress.history.length) {
      appEl.innerHTML = `
        <section class="view">
          <h1>${t('progress.title')}</h1>
          ${renderPlacementCard(progress, lang)}
          ${renderScheduleCard(progress, lang)}
          <div class="empty-state">${t('progress.empty')}</div>
          <div style="text-align:center;">
            <button class="btn" id="goTopics">${t('nav.topics')}</button>
          </div>
        </section>
      `;
      appEl.querySelector('#goTopics').addEventListener('click', () => navigate('topics'));
      wirePlacementAndSchedule(progress);
      return;
    }

    // Topic breakdown — every played topic, including TOEIC virtual topics.
    const playedTopics = Object.keys(progress.perTopic || {})
      .map((tid) => {
        const pt = progress.perTopic[tid];
        if (!pt || pt.attempts === 0) return null;
        const meta = resolveTopicMeta(tid);
        if (!meta) return null;
        const tStats = SRS.topicStats(progress, tid, meta.words);
        const accuracy = pt.correct + pt.wrong > 0
          ? Math.round((pt.correct / (pt.correct + pt.wrong)) * 100)
          : 0;
        const lastPlayedDays = pt.lastPlayedAt
          ? Math.max(0, Math.floor((Date.now() - pt.lastPlayedAt) / 86400000))
          : null;
        return { topic: meta.def, toeic: meta.toeic, words: meta.words, tStats, pt, accuracy, lastPlayedDays };
      })
      .filter(Boolean)
      .sort((a, b) => (b.pt.lastPlayedAt || 0) - (a.pt.lastPlayedAt || 0));

    const topicTable = playedTopics.length === 0
      ? `<div class="empty-state" style="padding:20px;">${t('progress.noTopicsPlayed')}</div>`
      : `
        <table class="progress-table">
          <thead>
            <tr>
              <th>${t('progress.topicCol')}</th>
              <th>${t('progress.masteryCol')}</th>
              <th class="num">${t('progress.accuracyCol')}</th>
              <th class="num">${t('progress.attempts')}</th>
              <th class="num">${t('progress.lastPlayed')}</th>
            </tr>
          </thead>
          <tbody>
            ${playedTopics.map(({ topic, toeic, tStats, pt, accuracy, lastPlayedDays }) => `
              <tr class="clickable" data-topic="${topic.id}"${toeic ? ` data-toeic-ed="${toeic.editionId}" data-toeic-part="${toeic.partId}"` : ''}>
                <td>${topic.icon} ${escapeHtml(topic.title[lang])}</td>
                <td>
                  <span class="mini-bar"><span style="width:${tStats.masteryPct}%"></span></span>
                  <span class="muted">${tStats.mastered}/${tStats.total}</span>
                </td>
                <td class="num">${accuracy}%</td>
                <td class="num">${pt.attempts}</td>
                <td class="num muted">${lastPlayedDays === 0 ? (lang === 'vi' ? 'hôm nay' : 'today') : lastPlayedDays + 'd'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

    // Words to review: words with box <= 2 or wrong > 0, sorted by struggle score.
    const reviewCandidates = [];
    Object.entries(progress.perWord || {}).forEach(([key, state]) => {
      const sepIdx = key.indexOf('::');
      const topicId = key.slice(0, sepIdx);
      const en = key.slice(sepIdx + 2);
      const meta = resolveTopicMeta(topicId);
      const word = meta ? meta.words.find((w) => w.en.toLowerCase() === en) : null;
      if (!word || !meta) return;
      const topicDef = meta.def;
      const struggleScore = state.wrong * 3 + (6 - state.box);
      if (state.box <= 2 || state.wrong > 0) {
        reviewCandidates.push({ word, state, topicId, topicDef, struggleScore });
      }
    });
    reviewCandidates.sort((a, b) => b.struggleScore - a.struggleScore);
    const reviewTop = reviewCandidates.slice(0, 12);
    const reviewHtml = reviewTop.length === 0
      ? `<div class="empty-state" style="padding:20px;">${t('progress.noWordsToReview')}</div>`
      : `<div class="review-list">
          ${reviewTop.map(({ word, state, topicDef }) => `
            <div class="review-item box-${state.box}">
              <div>
                <div class="w-en">${escapeHtml(word.en)}</div>
                <div class="w-vi">${escapeHtml(word.vi)}</div>
              </div>
              <div class="w-meta">
                ${topicDef.icon}<br/>
                ✗ ${state.wrong} · ▣ ${state.box}/5
              </div>
            </div>
          `).join('')}
        </div>`;

    // History: last 30 days
    const today = new Date();
    const bars = [];
    const histByDate = {};
    (progress.history || []).forEach((h) => {
      histByDate[h.date] = (histByDate[h.date] || 0) + (h.correct || 0) + (h.wrong || 0);
    });
    let maxVal = 1;
    Object.values(histByDate).forEach((v) => { if (v > maxVal) maxVal = v; });
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = localYmd(d);
      const v = histByDate[ds] || 0;
      const h = Math.round((v / maxVal) * 100);
      bars.push(`<div class="history-bar" style="height:${Math.max(h, v ? 8 : 2)}%;opacity:${v ? 1 : 0.15}" data-tip="${ds}: ${Number(v) || 0}"></div>`);
    }

    // Badges
    const allBadges = Progress.BADGES.map((b) => {
      const earned = progress.badges.indexOf(b.id) >= 0;
      return `<span class="badge ${earned ? 'earned' : ''}">${b.emoji} ${t(b.nameKey)}</span>`;
    }).join('');

    // Personal coaching banner — same engine as the teacher dashboard,
    // phrased as self-directed nudges.
    let coachHtml = '';
    let coachWeakTopic = null;
    if (typeof ClassInsights !== 'undefined') {
      const selfInsights = ClassInsights.analyze({ progress, updatedAt: Date.now() }, lang, 'student');
      coachWeakTopic = selfInsights.weakTopics.length ? selfInsights.weakTopics[0] : null;
      const items = selfInsights.suggestions.slice(0, 3);
      if (items.length) {
        const cta = coachWeakTopic
          ? `<button class="btn" id="coachGoBtn" style="margin-top:10px;">${t('progress.coachGo')}</button>`
          : '';
        coachHtml = `
          <div class="coach-banner">
            <div class="coach-title">${t('progress.coachTitle')}</div>
            <ul class="coach-list">${items.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
            ${cta}
          </div>`;
      }
    }

    appEl.innerHTML = `
      <section class="view">
        <h1>${t('progress.title')}</h1>
        ${coachHtml}
        ${renderPlacementCard(progress, lang)}
        ${renderScheduleCard(progress, lang)}

        <div class="progress-grid">
          <div class="stat-card">
            <div class="label">${t('progress.level')}</div>
            <div class="value">${stats.level}</div>
            <div class="progress-bar" style="margin-top:8px;"><span style="width:${stats.pct}%"></span></div>
            <div class="hint">${stats.xpInLevel} / ${stats.xpForNext} XP</div>
          </div>
          <div class="stat-card">
            <div class="label">${t('progress.xp')}</div>
            <div class="value">${stats.xp}</div>
            <div class="hint">${t('progress.totalXpHint')}</div>
          </div>
          <div class="stat-card">
            <div class="label">${t('progress.streak')}</div>
            <div class="value">🔥 ${stats.streak}</div>
            <div class="hint">${stats.streak} ${t('progress.days')}</div>
          </div>
          <div class="stat-card">
            <div class="label">${t('progress.wordsLearned')}</div>
            <div class="value">${stats.wordsSeen}</div>
            <div class="hint">${stats.mastered} ${t('progress.wordsMastered')}</div>
          </div>
        </div>

        <h2 class="section-title">${t('progress.byTopic')}</h2>
        ${topicTable}

        <h2 class="section-title">${t('progress.toReview')}</h2>
        ${reviewHtml}

        <h2 class="section-title">${t('progress.history')}</h2>
        <div class="history-chart">${bars.join('')}</div>

        <h2 class="section-title">${t('progress.badges')}</h2>
        <div class="badge-row">${allBadges}</div>

        <div class="btn-row" style="margin-top:30px;">
          <button class="btn secondary" id="exportBtn">⬇️ ${t('progress.export')}</button>
          <label class="btn secondary" style="cursor:pointer;">
            ⬆️ ${t('progress.import')}
            <input type="file" id="importInput" accept="application/json" hidden />
          </label>
        </div>
      </section>
    `;

    appEl.querySelectorAll('.progress-table tr.clickable[data-topic]').forEach((r) => {
      r.addEventListener('click', () => {
        const ed = r.getAttribute('data-toeic-ed');
        const part = r.getAttribute('data-toeic-part');
        if (ed && part) navigate('toeic-part', { editionId: ed, partId: part });
        else navigate('topic', { topicId: r.getAttribute('data-topic') });
      });
    });

    const coachGoBtn = appEl.querySelector('#coachGoBtn');
    if (coachGoBtn && coachWeakTopic) {
      coachGoBtn.addEventListener('click', () => {
        const meta = resolveTopicMeta(coachWeakTopic.id);
        if (meta && meta.toeic) navigate('toeic-part', { editionId: meta.toeic.editionId, partId: meta.toeic.partId });
        else navigate('topic', { topicId: coachWeakTopic.id });
      });
    }

    appendTuitionReminder();
    wirePlacementAndSchedule(progress);

    appEl.querySelector('#exportBtn').addEventListener('click', () => {
      const data = Storage.exportProfile();
      if (!data) return;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vocab-quest-${data.profile.name}-${Progress.todayStr()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    appEl.querySelector('#importInput').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          const u = (typeof FirebaseSync !== 'undefined' && FirebaseSync.enabled()) ? FirebaseSync.getCurrentUser() : null;
          if (u) {
            // Signed in: fold the file into THIS account so it syncs, instead
            // of creating a local-only profile that disappears on reload.
            if (!data || !data.progress) throw new Error('Invalid data');
            const merged = mergeProgress(Storage.getProgress(u.uid), Storage.normalizeProgress(data.progress));
            Storage.saveProgress(merged, u.uid);
            toast('✅ ' + I18N.t('progress.importMerged'));
            navigate('progress', null, { fromPop: true });
            return;
          }
          const p = Storage.importProfile(data);
          Storage.setActiveProfile(p.id);
          toast('Imported: ' + p.name);
          renderHeader();
          navigate('progress');
        } catch (err) {
          alert('Import failed: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  // Async: pull the signed-in student's own /billing node and, when the
  // prepaid package is nearly used up, append a reminder line to the coach
  // banner (creating the banner if the view rendered without one).
  async function appendTuitionReminder() {
    if (typeof FirebaseSync === 'undefined' || !FirebaseSync.enabled()) return;
    const user = FirebaseSync.getCurrentUser();
    if (!user) return;

    let remaining = null;
    if (typeof DemoSeed !== 'undefined' && DemoSeed.isDemoUser(user)) {
      remaining = DemoSeed.myDemoBilling().remaining;
    } else if (typeof Billing !== 'undefined') {
      const b = await Billing.fetchMine(user.uid);
      if (!b || !b.plan || Billing.paidSessions(b) === 0) return;
      remaining = Billing.remaining(b);
    }
    if (remaining == null || remaining > 2) return;

    // View may have changed while we were fetching.
    const view = appEl.querySelector('.view');
    if (!view || !appEl.querySelector('.progress-grid')) return;

    const msg = remaining <= 0
      ? I18N.t('bill.remindOut')
      : I18N.t('bill.remindLow').replace('{n}', remaining);

    let list = appEl.querySelector('.coach-banner .coach-list');
    if (!list) {
      const banner = document.createElement('div');
      banner.className = 'coach-banner';
      banner.innerHTML = `<div class="coach-title">${I18N.t('progress.coachTitle')}</div><ul class="coach-list"></ul>`;
      view.insertBefore(banner, appEl.querySelector('.progress-grid'));
      list = banner.querySelector('.coach-list');
    }
    const li = document.createElement('li');
    li.textContent = msg;
    list.appendChild(li);
  }

  // ========== Placement / roadmap / schedule cards ==========

  function renderPlacementCard(progress, lang) {
    const t = I18N.t;
    if (typeof Placement === 'undefined') return '';
    const L = lang === 'en' ? 'en' : 'vi';
    const TR = PLACEMENT_BANK.TRACKS;
    const pls = progress.placements || (progress.placement ? { [progress.placement.track || 'toeic']: progress.placement } : {});
    // Track strip: per track either the level (switch roadmap) or a "test" button.
    const trackStrip = `
      <div class="btn-row" style="margin-bottom:10px;">
        ${Object.values(TR).map((tr) => {
          const pl = pls[tr.id];
          const active = progress.roadmap && progress.roadmap.track === tr.id;
          if (pl) {
            const lvl = PLACEMENT_BANK.LEVELS.find((x) => x.id === pl.level) || PLACEMENT_BANK.LEVELS[1];
            return `<button class="voice-pill ${active ? 'active' : ''}" type="button" data-switch-track="${tr.id}" title="${t('pl.switchTrack')}">${tr.icon} ${escapeHtml(tr.label[L])} · ${lvl.id}</button>`;
          }
          return `<button class="voice-pill" type="button" data-test-track="${tr.id}">${tr.icon} ${escapeHtml(tr.label[L])} · ${t('pl.trackNotTested')}</button>`;
        }).join('')}
      </div>`;

    if (!progress.roadmap || !Object.keys(pls).length) {
      return `
        <div class="plan-card plan-cta">
          <div class="plan-cta-icon">🎯</div>
          <div>
            <div class="plan-title">${t('pl.ctaTitle')}</div>
            <div class="muted-note">${t('pl.ctaSub')}</div>
          </div>
          <button class="btn" type="button" id="plGo">${t('pl.ctaBtn')} →</button>
        </div>`;
    }
    const rmTrack = progress.roadmap.track || 'toeic';
    const pl = pls[rmTrack] || progress.placement;
    const lvl = (PLACEMENT_BANK.LEVELS.find((x) => x.id === (pl ? pl.level : progress.roadmap.level)) || PLACEMENT_BANK.LEVELS[1]);
    const trDef = TR[rmTrack] || TR.toeic;
    const st = Placement.roadmapStatus(progress);
    const weeks = st.weeks.map((w, wi) => `
      <div class="plan-week">
        <div class="plan-week-title">${escapeHtml(w.title[L] || w.title.vi)}
          <span class="muted-note" style="display:inline;">${w.items.filter((i) => i.done).length}/${w.items.length}</span></div>
        ${w.items.map((it) => {
          const d = Placement.describeItem(it, lang);
          return `<div class="plan-item ${it.done ? 'done' : ''}">
            <button class="plan-tick" type="button" data-tick="${it.id}" title="${t('pl.tick')}">${it.done ? '✅' : '⬜'}</button>
            <button class="plan-go" type="button" data-go="${it.id}" data-type="${it.type}" data-target="${escapeHtml(it.target)}">
              <span>${d.icon}</span><span class="plan-kind">${escapeHtml(d.kind)}</span><span>${escapeHtml(d.label)}</span>
            </button>
          </div>`;
        }).join('')}
      </div>`).join('');
    return `
      <div class="plan-card">
        ${trackStrip}
        <div class="plan-head">
          <div>
            <div class="plan-title">${trDef.icon} ${escapeHtml(trDef.label[L])} · ${lvl.icon} <strong>${escapeHtml(lvl.label[L])}</strong>
              ${rmTrack === 'toeic' && pl ? `<span class="muted-note" style="display:inline;">· TOEIC ≈ ${escapeHtml(pl.toeic)}</span>` : ''}</div>
            <div class="muted-note">${t('pl.roadmapTitle')} · ${st.done}/${st.total} ${t('pl.itemsDone')}</div>
          </div>
          <div class="btn-row">
            <span class="mini-bar" style="width:120px;"><span style="width:${st.pct}%"></span></span>
            <button class="btn secondary" type="button" id="plRetake" data-track="${rmTrack}">🔁 ${t('pl.retake')}</button>
          </div>
        </div>
        <div class="plan-weeks">${weeks}</div>
      </div>`;
  }

  function renderScheduleCard(progress, lang) {
    const t = I18N.t;
    if (typeof Placement === 'undefined') return '';
    const S = Placement.Schedule;
    const sch = S.get(progress);
    const L = (typeof Billing !== 'undefined' && Billing.DAY_LABELS) ? Billing.DAY_LABELS[lang === 'en' ? 'en' : 'vi'] : null;
    const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const dayLabel = (k) => (L ? L[k] : k);
    const state = S.todayState(progress);
    const todayBanner = state
      ? (state.studied
        ? `<div class="attn-empty" style="margin-bottom:10px;">✅ ${t('pl.todayDone')}</div>`
        : `<div class="coach-banner" style="margin-bottom:10px;">⏰ ${state.overdue ? t('pl.todayOverdue') : t('pl.todayPlanned')} <strong>${escapeHtml(state.time)}</strong> · ${state.minutes} ${t('pl.min')}</div>`)
      : '';
    const missed = S.missedThisWeek(progress);
    const missedNote = sch && missed.missed
      ? `<div class="muted-note" style="color:var(--danger);">⚠️ ${t('pl.missedWeek').replace('{n}', missed.missed)}</div>` : '';
    const notifSupported = typeof Notification !== 'undefined';
    const notifState = notifSupported ? Notification.permission : 'unsupported';
    return `
      <div class="plan-card">
        ${todayBanner}
        <div class="plan-head">
          <div>
            <div class="plan-title">📅 ${t('pl.scheduleTitle')}</div>
            <div class="muted-note">${sch ? escapeHtml(sch.days.map(dayLabel).join(', ')) + ' · ' + escapeHtml(sch.time) + ' · ' + sch.minutes + ' ' + t('pl.min') : t('pl.scheduleSub')}</div>
            ${missedNote}
          </div>
          <button class="btn secondary" type="button" id="schEdit">${sch ? '✏️ ' + t('bill.editPlan') : '+ ' + t('pl.setSchedule')}</button>
        </div>
        <div id="schForm" class="sch-form" hidden>
          <div class="btn-row">${order.map((k) => `<button type="button" class="voice-pill sch-day ${sch && sch.days.indexOf(k) >= 0 ? 'active' : ''}" data-day="${k}">${dayLabel(k)}</button>`).join('')}</div>
          <div class="btn-row" style="margin-top:8px;align-items:center;">
            <label class="muted-note">${t('pl.at')}</label><input type="time" id="schTime" value="${sch ? escapeHtml(sch.time) : '20:00'}" class="bill-select" style="width:auto;" />
            <label class="muted-note">${t('pl.duration')}</label>
            <select id="schMin" class="bill-select" style="width:auto;">${[10, 15, 20, 30, 45, 60].map((m) => `<option value="${m}" ${sch && sch.minutes === m ? 'selected' : (!sch && m === 20 ? 'selected' : '')}>${m} ${t('pl.min')}</option>`).join('')}</select>
          </div>
          <div class="btn-row" style="margin-top:10px;">
            <button class="btn" type="button" id="schSave">${t('bill.save')}</button>
            ${sch ? `<button class="btn secondary" type="button" id="schIcs">📲 ${t('pl.addToCalendar')}</button>` : ''}
            ${notifState === 'granted' ? `<span class="muted-note">🔔 ${t('pl.notifOn')}</span>`
              : notifState === 'unsupported' ? '' : `<button class="btn secondary" type="button" id="schNotif">🔔 ${t('pl.notifAsk')}</button>`}
          </div>
          <div class="muted-note" style="margin-top:8px;">${t('pl.calendarHint')}</div>
        </div>
      </div>`;
  }

  function renderTopicsPrompt(progress, lang) {
    const t = I18N.t;
    if (typeof Placement === 'undefined') return '';
    const S = Placement.Schedule;
    const state = S.todayState(progress);
    let html = '';
    if (state && !state.studied) {
      html += `<div class="coach-banner" style="margin-bottom:14px;">⏰ ${state.overdue ? t('pl.todayOverdue') : t('pl.todayPlanned')} <strong>${escapeHtml(state.time)}</strong> · ${state.minutes} ${t('pl.min')}</div>`;
    }
    if (!progress.placement) {
      html += `
        <div class="plan-card plan-cta" style="margin-bottom:16px;">
          <div class="plan-cta-icon">🎯</div>
          <div>
            <div class="plan-title">${t('pl.ctaTitle')}</div>
            <div class="muted-note">${t('pl.ctaSub')}</div>
          </div>
          <button class="btn" type="button" id="plGo">${t('pl.ctaBtn')} →</button>
        </div>`;
    }
    return html;
  }

  function renderTeacherPlanRow(p, lang) {
    const t = I18N.t;
    if (typeof Placement === 'undefined') return '';
    const st = Placement.roadmapStatus(p);
    const sch = Placement.Schedule.get(p);
    const missed = sch ? Placement.Schedule.missedThisWeek(p) : null;
    const L = (typeof Billing !== 'undefined' && Billing.DAY_LABELS) ? Billing.DAY_LABELS[lang === 'en' ? 'en' : 'vi'] : null;
    if (!st && !sch) return '';
    return `
      <div class="member-row" style="border:1px solid var(--border);border-radius:10px;margin-bottom:14px;display:block;">
        ${st ? `<div>🗺️ ${t('pl.roadmapTitle')}: <strong>${st.done}/${st.total}</strong> (${st.pct}%)</div>` : ''}
        ${sch ? `<div>📅 ${t('pl.scheduleTitle')}: ${escapeHtml(sch.days.map((k) => (L ? L[k] : k)).join(', '))} · ${escapeHtml(sch.time)}
          ${missed && missed.missed ? `<span style="color:var(--danger);font-weight:700;"> · ${t('pl.missedWeek').replace('{n}', missed.missed)}</span>` : ''}</div>` : ''}
      </div>`;
  }

  function wirePlacementAndSchedule(progress) {
    const t = I18N.t;
    if (typeof Placement === 'undefined') return;
    appEl.querySelectorAll('#plGo').forEach((b) => b.addEventListener('click', () => navigate('placement')));
    const retake = appEl.querySelector('#plRetake');
    if (retake) retake.addEventListener('click', () => { if (confirm(t('pl.retakeConfirm'))) navigate('placement', { track: retake.getAttribute('data-track') }); });
    appEl.querySelectorAll('[data-test-track]').forEach((b) => b.addEventListener('click', () => navigate('placement', { track: b.getAttribute('data-test-track') })));
    appEl.querySelectorAll('[data-switch-track]').forEach((b) => b.addEventListener('click', () => {
      const tr = b.getAttribute('data-switch-track');
      const p = Storage.getProgress();
      const pl = p.placements && p.placements[tr];
      if (!pl) return;
      if (p.roadmap && p.roadmap.track === tr) return;
      p.roadmap = Placement.generateRoadmap(pl.level, tr);
      Storage.saveProgress(p);
      navigate('progress', null, { fromPop: true });
    }));
    appEl.querySelectorAll('[data-tick]').forEach((b) => b.addEventListener('click', () => {
      Placement.toggleManual(b.getAttribute('data-tick'));
      navigate('progress', null, { fromPop: true });
    }));
    appEl.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
      const type = b.getAttribute('data-type');
      const target = b.getAttribute('data-target');
      if (type === 'topic') navigate('topic', { topicId: target });
      else if (type === 'toeic') navigate('toeic-part', { editionId: '2024', partId: target });
      else if (type === 'interview') navigate('interview', { sections: [target] });
      else if (type === 'drill') navigate('drill', { setId: target });
    }));

    const form = appEl.querySelector('#schForm');
    const editBtn = appEl.querySelector('#schEdit');
    if (editBtn && form) editBtn.addEventListener('click', () => { form.hidden = !form.hidden; });
    appEl.querySelectorAll('.sch-day').forEach((d) => d.addEventListener('click', () => d.classList.toggle('active')));
    const save = appEl.querySelector('#schSave');
    if (save) save.addEventListener('click', () => {
      const days = Array.from(appEl.querySelectorAll('.sch-day.active')).map((d) => d.getAttribute('data-day'));
      if (!days.length) { toast(t('pl.pickDays')); return; }
      Placement.Schedule.save({
        days, time: appEl.querySelector('#schTime').value || '20:00',
        minutes: Number(appEl.querySelector('#schMin').value) || 20,
        remind: true, updatedAt: Date.now(),
      });
      toast('✅ ' + t('pl.scheduleSaved'));
      navigate('progress', null, { fromPop: true });
    });
    const ics = appEl.querySelector('#schIcs');
    if (ics) ics.addEventListener('click', () => Placement.Schedule.downloadIcs(Placement.Schedule.get(Storage.getProgress())));
    const notif = appEl.querySelector('#schNotif');
    if (notif) notif.addEventListener('click', async () => {
      const r = await Placement.Schedule.requestPermission();
      toast(r === 'granted' ? '🔔 ' + t('pl.notifOn') : t('pl.notifDenied'));
      if (r === 'granted') Placement.Schedule.startInPageNotifier();
      navigate('progress', null, { fromPop: true });
    });
  }

  // ========== TOEIC views ==========
  function renderToeic() {
    const t = I18N.t;
    const lang = I18N.getLang();

    const editionCards = TOEIC.EDITIONS.map((ed) => {
      let totalWords = 0;
      TOEIC.PARTS.forEach((p) => {
        totalWords += TOEIC.allWordsInPart(ed.id, p.id).length;
      });
      return `
        <div class="edition-section" data-edition="${ed.id}">
          <div class="edition-header">
            <h2>${ed.label}</h2>
            <span class="edition-count">${totalWords} ${t('toeic.wordsInGroup')}</span>
          </div>
          <div class="topics-grid toeic-parts-grid">
            ${TOEIC.PARTS.map((p) => {
              const all = TOEIC.allWordsInPart(ed.id, p.id);
              const progress = Storage.getProgress();
              const stats = SRS.topicStats(progress, toeicTopicId(ed.id, p.id), all);
              return `
                <div class="topic-card toeic-part-card" data-edition="${ed.id}" data-part="${p.id}">
                  <div class="title-row">
                    <span class="icon">${p.icon}</span>
                    <div>
                      <div class="title">${p.title[lang]}</div>
                      <div class="subtitle">${all.length} ${t('toeic.wordsInGroup')}</div>
                    </div>
                  </div>
                  <div class="progress-bar"><span style="width:${stats.masteryPct}%"></span></div>
                  <div class="stats">
                    <span>${stats.mastered}/${stats.total} ${t('topics.mastered')}</span>
                    <span>${stats.masteryPct}%</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    appEl.innerHTML = `
      <section class="view">
        <div class="topics-header">
          <div>
            <h1>${t('toeic.title')}</h1>
            <p>${t('toeic.subtitle')}</p>
          </div>
        </div>
        ${editionCards}
        <p class="source-note">ℹ️ ${t('toeic.sourceNote')}</p>
      </section>
    `;

    appEl.querySelectorAll('.toeic-part-card').forEach((el) => {
      el.addEventListener('click', () => {
        navigate('toeic-part', {
          editionId: el.getAttribute('data-edition'),
          partId: el.getAttribute('data-part'),
        });
      });
    });
  }

  function toeicTopicId(editionId, partId) {
    return 'toeic_' + editionId + '_' + partId;
  }

  // Resolve a perTopic/perWord topicId — regular topic or TOEIC virtual id
  // ('toeic_<edition>_<part>') — to a display definition + word list.
  // Progress scans must use this instead of TOPICS.find, otherwise TOEIC
  // study sessions are invisible in the Progress view.
  function resolveTopicMeta(topicId) {
    const topic = TOPICS.find((x) => x.id === topicId);
    if (topic) return { def: topic, words: VOCAB[topicId] || [], toeic: null };
    if (topicId === 'interview_cabin_crew') {
      return {
        def: { id: topicId, icon: '✈️', title: { vi: 'Phỏng vấn TVHK', en: 'Cabin Crew Interview' } },
        words: [],
        toeic: null,
      };
    }
    const m = /^toeic_([^_]+)_(.+)$/.exec(topicId || '');
    if (m && typeof TOEIC !== 'undefined') {
      const ed = TOEIC.EDITIONS.find((e) => e.id === m[1]);
      const part = TOEIC.PARTS.find((p) => p.id === m[2]);
      if (ed && part) {
        return {
          def: {
            id: topicId,
            icon: part.icon,
            title: {
              vi: part.title.vi + ' · ' + ed.label,
              en: part.title.en + ' · ' + ed.label,
            },
          },
          words: TOEIC.allWordsInPart(ed.id, part.id),
          toeic: { editionId: ed.id, partId: part.id },
        };
      }
    }
    return null;
  }

  function renderToeicPart(editionId, partId) {
    const t = I18N.t;
    const lang = I18N.getLang();
    const ed = TOEIC.EDITIONS.find((e) => e.id === editionId);
    const part = TOEIC.PARTS.find((p) => p.id === partId);
    if (!ed || !part) return navigate('toeic');

    const raw = TOEIC.getPart(editionId, partId);
    // The source lists repeat some words (e.g. "receipt" twice in 2023 Part 3);
    // show each word once, keyword group first — same set the games use.
    const seenEn = new Set();
    const uniq = (arr) => (arr || []).filter((w) => {
      const k = String(w.en || '').toLowerCase().trim();
      if (!k || seenEn.has(k)) return false;
      seenEn.add(k); return true;
    });
    const keywords = uniq(raw.keywords);
    const highFreq = uniq(raw.highFreq);
    const allWords = TOEIC.allWordsInPart(editionId, partId);
    const virtualTopicId = toeicTopicId(editionId, partId);
    const progress = Storage.getProgress();
    const stats = SRS.topicStats(progress, virtualTopicId, allWords);

    const renderGroupList = (wordArr, groupLabel) => {
      if (!wordArr.length) return '';
      return `
        <h3 class="group-heading">${groupLabel} <span class="count">(${wordArr.length})</span></h3>
        <div class="word-list">${wordArr.map((w) => renderWordRow(w, virtualTopicId, progress)).join('')}</div>
      `;
    };

    appEl.innerHTML = `
      <section class="view topic-detail">
        <button class="back" id="backBtn">${t('topic.back')}</button>
        <h1>${part.icon} ${ed.label} · ${part.title[lang]}</h1>
        <div class="progress-bar" style="margin:14px 0;"><span style="width:${stats.masteryPct}%"></span></div>
        <div style="color:var(--text-muted);font-size:13px;">
          ${stats.mastered}/${stats.total} ${t('topics.mastered')} · ${stats.masteryPct}%
        </div>
        ${renderLearnSummary(progress, virtualTopicId, allWords)}

        <h2 style="margin-top:24px;">${t('topic.chooseMode')}</h2>
        <div class="mode-grid">
          <div class="mode-card" data-mode="flashcard">
            <div class="icon">🎴</div><div class="title">${t('mode.flashcard')}</div>
            <div class="desc">${t('mode.flashcardDesc')}</div>
          </div>
          <div class="mode-card" data-mode="quiz">
            <div class="icon">❓</div><div class="title">${t('mode.quiz')}</div>
            <div class="desc">${t('mode.quizDesc')}</div>
          </div>
          <div class="mode-card" data-mode="typing">
            <div class="icon">⌨️</div><div class="title">${t('mode.typing')}</div>
            <div class="desc">${t('mode.typingDesc')}</div>
          </div>
          <div class="mode-card" data-mode="matching">
            <div class="icon">🔗</div><div class="title">${t('mode.matching')}</div>
            <div class="desc">${t('mode.matchingDesc')}</div>
          </div>
          <div class="mode-card" data-mode="speaking">
            <div class="icon">🎤</div><div class="title">${t('mode.speaking')}</div>
            <div class="desc">${t('mode.speakingDesc')}</div>
          </div>
        </div>

        <div style="margin-top:20px;">${renderWordFilter()}</div>
        ${renderGroupList(keywords, '🎯 ' + t('toeic.group.keywords'))}
        ${renderGroupList(highFreq, '📊 ' + t('toeic.group.highFreq'))}
      </section>
    `;

    wireWordFilter(appEl);
    appEl.querySelector('#backBtn').addEventListener('click', () => navigate('toeic'));
    appEl.querySelectorAll('.mode-card').forEach((el) => {
      el.addEventListener('click', () => {
        navigate('game', {
          topicId: virtualTopicId,
          mode: el.getAttribute('data-mode'),
          wordsOverride: allWords,
          toeicContext: { editionId, partId },
        });
      });
    });
    if (typeof Pronunciation !== 'undefined') Pronunciation.bindSpeakers(appEl);
  }

  function renderWordRow(w, topicId, progress) {
    const rec = progress.perWord[SRS.wordKey(topicId, w.en)];
    const box = rec ? rec.box : 0; // 0 = chưa học (hollow dot)
    const status = SRS.wordStatus(progress, topicId, w.en);
    const dotTitle = I18N.t('learn.status.' + status) + (rec ? ' · Box ' + box + '/5' : '');
    const ipaHtml = w.ipa ? `<span class="ipa">${escapeHtml(w.ipa)}</span>` : '';
    return `
      <div class="word-row" data-status="${status}">
        <div class="en">
          <button class="speak-btn" data-speak="${escapeHtml(w.en)}" title="${I18N.t('word.listen')}">🔊</button>
          <span class="w">${escapeHtml(w.en)}</span>
          ${w.pos ? `<span style="color:var(--text-muted);font-weight:400;font-size:12px;">(${escapeHtml(w.pos)})</span>` : ''}
          ${ipaHtml}
        </div>
        <div class="vi">${escapeHtml(w.vi)}</div>
        <span class="mastery-dot box-${box}" title="${escapeHtml(dotTitle)}"></span>
      </div>
    `;
  }

  // ========== Class (teacher) dashboard ==========
  let classTab = 'progress'; // survives tab re-renders within the session

  // "⚠️ email sai?" when the domain looks mistyped → reset mail can't arrive.
  function emailWarn(email) {
    const fix = typeof Accounts !== 'undefined' ? Accounts.suggestEmail(email) : null;
    return fix ? ` <span class="email-warn" title="${escapeHtml(I18N.t('acc.typoTitle').replace('{fix}', fix))}">⚠️ ${I18N.t('acc.typoShort')}</span>` : '';
  }

  function renderClass() {
    const t = I18N.t;

    if (typeof FirebaseSync === 'undefined' || !FirebaseSync.enabled()) {
      appEl.innerHTML = `
        <section class="view">
          <h1>${t('class.title')}</h1>
          <div class="empty-state" style="padding:30px 20px;">
            <div style="font-size:42px;margin-bottom:10px;">☁️</div>
            <h2 style="margin:0 0 8px;">${t('class.disabled')}</h2>
            <p style="color:var(--text-muted);max-width:520px;margin:0 auto;line-height:1.5;">${t('class.disabledHint')}</p>
          </div>
        </section>
      `;
      return;
    }

    appEl.innerHTML = `
      <section class="view">
        <div class="topics-header">
          <div>
            <h1>${t('class.title')}</h1>
            <p>${t('class.subtitle')} <span style="color:var(--success);font-size:12px;">${t('class.synced')}</span></p>
          </div>
          <div class="btn-row">
            <button class="btn secondary" id="refreshClassBtn">↻ ${t('class.refresh')}</button>
            <button class="btn secondary" id="exportClassBtn">⬇️ ${t('class.exportCsv')}</button>
          </div>
        </div>
        <div class="auth-tabs class-tabs">
          <button class="auth-tab ${classTab === 'progress' ? 'active' : ''}" data-tab="progress">${t('class.tabProgress')}</button>
          <button class="auth-tab ${classTab === 'billing' ? 'active' : ''}" data-tab="billing">💰 ${t('class.tabBilling')}</button>
          <button class="auth-tab ${classTab === 'attendance' ? 'active' : ''}" data-tab="attendance">✓ ${t('class.tabAttendance')}</button>
        </div>
        <div id="classContent" class="empty-state" style="padding:30px 20px;">${t('class.loading')}</div>
      </section>
    `;

    // Each tab load gets a token; a slower, older load must not paint over
    // the tab the teacher has switched to since.
    let loadToken = 0;
    const loadList = async () => {
      const my = ++loadToken;
      const content = appEl.querySelector('#classContent');
      content.innerHTML = `<div class="empty-state" style="padding:30px 20px;">${t('class.loading')}</div>`;
      // Demo accounts see a fabricated roster — never real student data.
      const demoUser = FirebaseSync.getCurrentUser();
      if (typeof DemoSeed !== 'undefined' && DemoSeed.isDemoUser(demoUser) && !FirebaseSync.isTeacher(demoUser)) {
        lastStudents = DemoSeed.listDemoStudents();
        if (my !== loadToken) return;
        paintList(lastStudents);
        const note = document.createElement('div');
        note.style.cssText = 'margin-top:10px;font-size:12px;color:var(--text-muted);';
        note.textContent = '🧪 Dữ liệu minh hoạ cho tài khoản demo — không phải học viên thật.';
        content.appendChild(note);
        return;
      }
      const result = await FirebaseSync.listAllStudents();
      if (my !== loadToken) return;
      lastStudents = result.students || [];
      lastMergedCount = result.mergedCount || 0;
      if (result.error === 'permission-denied') {
        content.className = 'empty-state';
        content.style.padding = '30px 20px';
        content.innerHTML = `
          <div style="font-size:40px;margin-bottom:8px;">🔒</div>
          <h2 style="margin:0 0 6px;">${t('class.permDeniedTitle')}</h2>
          <p style="color:var(--text-muted);max-width:580px;margin:0 auto 12px;line-height:1.5;">
            ${t('class.permDeniedBody')}
          </p>
          <pre style="text-align:left;background:var(--bg-soft);padding:14px;border-radius:10px;font-size:12px;max-width:600px;margin:0 auto;overflow:auto;">${t('class.fixRulesSample')}</pre>
        `;
        return;
      }
      if (result.error === 'timeout') {
        content.className = 'empty-state';
        content.style.padding = '30px 20px';
        content.innerHTML = '⏱️ ' + t('class.readTimeout');
        return;
      }
      if (result.error === 'not-teacher') {
        content.className = 'empty-state';
        content.style.padding = '30px 20px';
        content.innerHTML = t('class.notTeacher');
        return;
      }
      paintList(lastStudents);
    };

    let lastStudents = [];
    let lastMergedCount = 0;

    const paintList = (students) => {
      const content = appEl.querySelector('#classContent');
      if (!students.length) {
        content.className = 'empty-state';
        content.style.padding = '30px 20px';
        content.innerHTML = t('class.empty');
        return;
      }
      content.className = '';
      content.style.padding = '0';

      const lang = I18N.getLang();

      // Enrich each student with computed stats + coaching insights
      const rows = students.map((s) => {
        const p = s.progress || {};
        const wordsSeen = Object.keys(p.perWord || {}).length;
        let mastered = 0;
        Object.values(p.perWord || {}).forEach((w) => { if (w.box >= 4) mastered += 1; });
        const streak = Progress.effectiveStreak(p);
        // Students can write anything into their own row: coerce every
        // number shown on the teacher's screen (stored-XSS hardening).
        const xp = Number(p.xp) || 0;
        const level = Number(p.level) || 1;
        const lastMs = Number(s.updatedAt) || 0;
        const insights = (typeof ClassInsights !== 'undefined')
          ? ClassInsights.analyze(s, lang)
          : { accuracy: null, riskLevel: 'ok', riskScore: 0, suggestions: [], weakTopics: [], stuckWords: [], inactiveDays: null };
        const createdMs = Number(s.profile && s.profile.createdAt) || 0;
        return { s, p, wordsSeen, mastered, streak, xp, level, lastMs, createdMs, insights };
      });

      // Default sort: newest first-login (account creation) first;
      // accounts without createdAt fall back to their last-sync time.
      rows.sort((a, b) => (b.createdMs || b.lastMs) - (a.createdMs || a.lastMs));

      const lastActiveLabel = (ms) => {
        if (!ms) return t('class.neverActive');
        const days = Math.floor((Date.now() - ms) / 86400000);
        if (days <= 0) return t('class.today');
        return days + ' ' + t('class.daysAgo');
      };

      const signupLabel = (ms) => {
        if (!ms) return '—';
        const d = new Date(ms);
        return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
      };

      // "Needs attention" cards — worst risk first, top 6.
      const flagged = rows
        .filter((r) => r.insights.riskLevel !== 'ok')
        .sort((a, b) => b.insights.riskScore - a.insights.riskScore)
        .slice(0, 6);
      const attnHtml = flagged.length === 0
        ? `<div class="attn-empty">${t('class.allGood')}</div>`
        : `<div class="attn-grid">${flagged.map((r) => `
            <div class="attn-card ${r.insights.riskLevel}" data-student="${escapeHtml(r.s.id)}">
              <div class="attn-head">
                <span>${escapeHtml(r.s.profile.avatar || '🙂')} <strong>${escapeHtml(r.s.profile.name || r.s.id)}</strong></span>
                <span class="attn-chip ${r.insights.riskLevel}">${t('class.risk.' + r.insights.riskLevel)}</span>
              </div>
              <div class="attn-suggestion">${escapeHtml(r.insights.suggestions[0] || '')}</div>
            </div>
          `).join('')}</div>`;

      const accCell = (ins) => {
        if (ins.accuracy == null) return '<td class="num muted">—</td>';
        const cls = ins.accuracy < 50 ? 'acc-bad' : ins.accuracy < 65 ? 'acc-warn' : 'acc-ok';
        return `<td class="num ${cls}">${ins.accuracy}%</td>`;
      };

      const newCutoff = Date.now() - 14 * 86400000;
      const body = rows.map((r, idx) => `
        <tr class="clickable" data-student="${escapeHtml(r.s.id)}">
          <td>${idx + 1}</td>
          <td>${escapeHtml(r.s.profile.avatar || '🙂')} <strong>${escapeHtml(r.s.profile.name || r.s.id)}</strong>${r.createdMs > newCutoff ? ` <span class="new-badge">🆕</span>` : ''}</td>
          <td class="muted">${escapeHtml(r.s.profile.email || '')}${emailWarn(r.s.profile.email)}</td>
          <td class="num muted">${signupLabel(r.createdMs)}</td>
          <td class="num">${r.level}</td>
          <td class="num">${r.xp}</td>
          ${accCell(r.insights)}
          <td class="num">🔥 ${r.streak}</td>
          <td class="num">${r.wordsSeen}</td>
          <td class="num">${r.mastered}</td>
          <td class="num muted">${lastActiveLabel(r.lastMs)}</td>
        </tr>
      `).join('');

      // Likely duplicate accounts (same person, different email).
      const dupGroups = typeof Accounts !== 'undefined' ? Accounts.findDuplicates(students) : [];
      const dupHtml = !dupGroups.length ? '' : `
        <h3 style="margin:18px 0 6px;">⚠️ ${t('acc.dupTitle')} (${dupGroups.length})</h3>
        <div class="muted-note" style="margin-bottom:10px;">${t('acc.dupSub')}</div>
        ${dupGroups.map((g, gi) => `
          <div class="dup-card">
            <div class="dup-reason">${g.reasons.map((r) => t('acc.reason.' + r)).join(' · ')}</div>
            ${g.members.map((s, mi) => {
              const words = Object.keys((s.progress && s.progress.perWord) || {}).length;
              return `
              <div class="dup-acc">
                <span>${escapeHtml(s.profile.avatar || '🙂')} <strong>${escapeHtml(s.profile.name || s.id)}</strong>
                  <span class="muted">· ${escapeHtml(s.profile.email || '')}</span>${emailWarn(s.profile.email)}<br>
                  <span class="muted">${t('acc.created')} ${signupLabel((s.profile && s.profile.createdAt) || 0)} · ${words} ${t('acc.words')} · ${t('acc.active')} ${lastActiveLabel(s.updatedAt || 0)}${mi === 0 ? ' · <strong>' + t('acc.mostRecent') + '</strong>' : ''}</span></span>
                <button class="btn ${mi === 0 ? '' : 'secondary'}" type="button" data-keep="${gi}:${mi}">${t('acc.keepThis')}</button>
              </div>`;
            }).join('')}
          </div>`).join('')}`;

      content.innerHTML = `
        <h3 style="margin:4px 0 10px;">${t('class.attention')}</h3>
        ${attnHtml}
        ${dupHtml}
        <div style="color:var(--text-muted);font-size:13px;margin:18px 0 10px;">${students.length} ${t('class.totalStudents')}${lastMergedCount ? ' · ' + t('acc.mergedHidden').replace('{n}', lastMergedCount) : ''} · ${t('class.clickRow')}</div>
        <table class="progress-table">
          <thead>
            <tr>
              <th>#</th>
              <th>${t('class.student')}</th>
              <th>${t('class.email')}</th>
              <th class="num">${t('bill.signupCol')}</th>
              <th class="num">${t('class.level')}</th>
              <th class="num">${t('class.xp')}</th>
              <th class="num">${t('class.accuracyCol')}</th>
              <th class="num">${t('class.streak')}</th>
              <th class="num">${t('class.wordsSeen')}</th>
              <th class="num">${t('class.mastered')}</th>
              <th class="num">${t('class.lastActive')}</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      `;

      const openById = (id) => {
        const row = rows.find((r) => r.s.id === id);
        if (row) openStudentDetail(row, lang);
      };
      content.querySelectorAll('[data-student]').forEach((el) => {
        el.addEventListener('click', () => openById(el.getAttribute('data-student')));
      });
      content.querySelectorAll('[data-keep]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (isDemoView()) { toast(t('acc.demoBlocked')); return; }
          const [gi, mi] = btn.getAttribute('data-keep').split(':').map(Number);
          const g = dupGroups[gi];
          const keep = g.members[mi];
          const others = g.members.filter((_, i) => i !== mi);
          const msg = t('acc.confirmMerge')
            .replace('{n}', others.length)
            .replace('{name}', keep.profile.name || keep.id)
            .replace('{email}', keep.profile.email || '')
            .replace('{others}', others.map((o) => o.profile.email || o.id).join(', '));
          if (!confirm(msg)) return;
          btn.disabled = true;
          try {
            for (const o of others) await Accounts.mergeInto(keep, o);
            toast('✅ ' + t('acc.mergeDone'));
            loadList();
          } catch (e) {
            btn.disabled = false;
            const code = (e && (e.code || e.message)) || '';
            toast(/permission/i.test(code) ? '🔒 ' + t('acc.rulesMissing') : '❌ ' + code);
          }
        });
      });
    };

    const isDemoView = () => {
      const u = FirebaseSync.getCurrentUser();
      return typeof DemoSeed !== 'undefined' && DemoSeed.isDemoUser(u) && !FirebaseSync.isTeacher(u);
    };

    const loadBillingTab = async (kind) => {
      const my = ++loadToken;
      const content = appEl.querySelector('#classContent');
      content.className = '';
      content.style.padding = '0';
      content.innerHTML = `<div class="empty-state" style="padding:30px 20px;">${t('class.loading')}</div>`;

      let students;
      let api;
      let data;
      let rosterOk = true;
      if (isDemoView()) {
        students = DemoSeed.listDemoStudents();
        lastStudents = students;
        api = DemoSeed.getDemoBillingApi();
        data = await api.fetchAll();
      } else {
        // Always refetch: new signups must appear in "Chưa cấu hình" on ↻.
        const result = await FirebaseSync.listAllStudents();
        if (my !== loadToken) return;
        rosterOk = !result.error;
        if (rosterOk) lastStudents = result.students || [];
        students = lastStudents;
        api = Billing;
        try {
          data = await Billing.fetchAll();
        } catch (e) {
          if (my !== loadToken) return;
          content.className = 'empty-state';
          content.style.padding = '30px 20px';
          content.innerHTML = `🔒 ${t('bill.rulesMissing')}`;
          return;
        }
      }

      // Panel shows for real teachers (with a setup hint until a Client ID
      // is configured); never for the demo account.
      const allowGcal = !isDemoView() && typeof GCal !== 'undefined';
      // Every teacher write (plan, payment, attendance, group, rules) goes
      // through reload(), so pushing to Google Calendar here keeps it exact.
      const gcalAfterWrite = () => {
        if (!allowGcal || !GCal.configured() || !GCal.isConnected()) return;
        // Never sync from a failed/empty roster: it would delete every event.
        if (!rosterOk || !ctx.students.length) return;
        GCal.autoSync(ctx, (err, r) => {
          const msg = content.querySelector('#gcalMsg');
          if (err && GCal.isAuthError(err)) toast('📅 ' + t('gcal.needAuth'));
          else if (err) toast('📅 ❌ ' + err.message);
          else if (msg && r) {
            msg.textContent = '✅ ' + t('gcal.syncDone').replace('{n}', r.count)
              .replace('{i}', r.stats.inserted).replace('{u}', r.stats.updated).replace('{d}', r.stats.deleted);
          }
        });
      };
      const ctx = {
        students,
        data,
        api,
        lang: I18N.getLang(),
        allowGcal,
        reload: async (opts) => {
          ctx.data = await api.fetchAll();
          if (kind === 'billing') BillingUI.renderBillingTab(content, ctx);
          else BillingUI.renderAttendanceTab(content, ctx);
          if (!(opts && opts.skipGcal)) gcalAfterWrite();
        },
      };
      if (my !== loadToken) return;
      if (kind === 'billing') BillingUI.renderBillingTab(content, ctx);
      else BillingUI.renderAttendanceTab(content, ctx);
      // Opening the tab: refresh the calendar if the last push is stale
      // (projections in the tuition digest move as days pass).
      const lastSync = (data.settings && data.settings.gcal && data.settings.gcal.lastSyncAt) || 0;
      if (Date.now() - lastSync > 30 * 60 * 1000) gcalAfterWrite();
    };

    const showTab = (tab) => {
      classTab = tab;
      appEl.querySelectorAll('.class-tabs .auth-tab').forEach((b) =>
        b.classList.toggle('active', b.getAttribute('data-tab') === tab));
      if (tab === 'progress') loadList();
      else loadBillingTab(tab);
    };

    appEl.querySelectorAll('.class-tabs .auth-tab').forEach((b) => {
      b.addEventListener('click', () => showTab(b.getAttribute('data-tab')));
    });
    appEl.querySelector('#refreshClassBtn').addEventListener('click', () => showTab(classTab));
    appEl.querySelector('#exportClassBtn').addEventListener('click', () => exportClassCsv(lastStudents));
    showTab(classTab);
  }

  function openStudentDetail(row, lang) {
    const t = I18N.t;
    const { s, insights, level, xp, streak, wordsSeen, mastered } = row;
    const p = s.progress || {};

    const chip = (label, value) =>
      `<span class="chip" style="background:var(--bg-soft);padding:6px 12px;border-radius:999px;font-size:13px;">${label}: <strong>${value}</strong></span>`;

    const suggestionsHtml = insights.suggestions.length
      ? `<ul class="detail-suggestions">${insights.suggestions.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`
      : '';

    const weakHtml = insights.weakTopics.length
      ? `<table class="progress-table" style="margin-top:6px;">
          <thead><tr>
            <th>${t('progress.topicCol')}</th>
            <th class="num">${t('class.attempts')}</th>
            <th class="num">${t('class.accuracyCol')}</th>
          </tr></thead>
          <tbody>${insights.weakTopics.map((w) => `
            <tr>
              <td>${w.icon} ${escapeHtml(w.title[lang] || w.title.vi)}</td>
              <td class="num">${Number(w.attempts) || 0}</td>
              <td class="num ${w.accuracy < 50 ? 'acc-bad' : 'acc-warn'}">${w.accuracy}%</td>
            </tr>`).join('')}
          </tbody>
        </table>`
      : `<div class="muted-note">${t('class.noWeakTopics')}</div>`;

    const stuck = insights.stuckWords.slice(0, 16);
    const stuckHtml = stuck.length
      ? `<div class="stuck-list">${stuck.map((w) =>
          `<span class="stuck-pill">${w.icon} ${escapeHtml(w.en)} <em>✗${Number(w.wrong) || 0}</em></span>`).join('')}</div>`
      : `<div class="muted-note">${t('class.noStuckWords')}</div>`;

    // 14-day activity bars from history.
    const hist = Array.isArray(p.history) ? p.history : [];
    const byDate = {};
    hist.forEach((h) => { byDate[h.date] = (byDate[h.date] || 0) + (h.correct || 0) + (h.wrong || 0); });
    let maxV = 1;
    Object.values(byDate).forEach((v) => { if (v > maxV) maxV = v; });
    const bars = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = localYmd(d);
      const v = byDate[ds] || 0;
      const h = Math.round((v / maxV) * 100);
      bars.push(`<div class="history-bar" style="height:${Math.max(h, v ? 8 : 2)}%;opacity:${v ? 1 : 0.15}" data-tip="${ds}: ${Number(v) || 0}"></div>`);
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal student-detail">
        <div class="modal-head">
          <h2>${escapeHtml(s.profile.avatar || '🙂')} ${escapeHtml(s.profile.name || s.id)}</h2>
          <button class="icon-btn" id="closeDetail" title="Close">✕</button>
        </div>
        <p class="modal-sub">${escapeHtml(s.profile.email || '')}${emailWarn(s.profile.email)}
          ${s.profile.email ? `<button class="btn-link" type="button" id="sendResetBtn" style="margin-left:8px;">📧 ${t('acc.sendReset')}</button>` : ''}</p>
        <div class="btn-row" style="margin-bottom:14px;">
          ${chip(t('class.level'), level)}
          ${chip('XP', xp)}
          ${chip(t('class.streak'), '🔥 ' + streak)}
          ${chip(t('class.accuracyCol'), insights.accuracy == null ? '—' : insights.accuracy + '%')}
          ${chip(t('class.mastered'), mastered + '/' + wordsSeen)}
          ${p.placement ? chip(t('pl.levelShort'), escapeHtml(p.placement.level) + ' · TOEIC ' + escapeHtml(p.placement.toeic)) : ''}
        </div>
        ${renderTeacherPlanRow(p, lang)}
        <label class="member-row" id="ivFlagRow" hidden style="border:1px solid var(--border);border-radius:10px;margin-bottom:14px;">
          <input type="checkbox" id="ivFlagCb" />
          <span>✈️ ${t('class.interviewAccess')}</span>
        </label>
        <h3 class="detail-h">${t('class.suggestions')}</h3>
        ${suggestionsHtml}
        <h3 class="detail-h">${t('class.weakTopics')}</h3>
        ${weakHtml}
        <h3 class="detail-h">${t('class.stuckWords')}</h3>
        ${stuckHtml}
        <h3 class="detail-h">${t('class.activity14')}</h3>
        <div class="history-chart" style="margin-top:6px;">${bars.join('')}</div>
      </div>
    `;
    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
    backdrop.querySelector('#closeDetail').addEventListener('click', close);
    // Teacher re-sends the reset link (same Firebase mail the student gets).
    const resetBtn = backdrop.querySelector('#sendResetBtn');
    if (resetBtn) resetBtn.addEventListener('click', async () => {
      const u = FirebaseSync.getCurrentUser();
      if (typeof DemoSeed !== 'undefined' && DemoSeed.isDemoUser(u) && !FirebaseSync.isTeacher(u)) { toast(t('acc.demoBlocked')); return; }
      const fix = typeof Accounts !== 'undefined' ? Accounts.suggestEmail(s.profile.email) : null;
      if (fix && !confirm(t('acc.typoResetConfirm').replace('{fix}', fix))) return;
      resetBtn.disabled = true;
      try {
        await FirebaseSync.sendPasswordReset(s.profile.email);
        toast('📧 ' + t('acc.resetSentTeacher').replace('{email}', s.profile.email));
      } catch (e) {
        resetBtn.disabled = false;
        toast('❌ ' + ((e && (e.code || e.message)) || 'error'));
      }
    });

    // Interview feature-flag toggle — real teacher accounts only, and not
    // for the fabricated demo roster (writes would pollute the DB).
    (async () => {
      const me = (typeof FirebaseSync !== 'undefined' && FirebaseSync.enabled()) ? FirebaseSync.getCurrentUser() : null;
      const isRealTeacher = me && FirebaseSync.isTeacher(me)
        && !(typeof DemoSeed !== 'undefined' && DemoSeed.isDemoUser(me));
      if (!isRealTeacher || String(s.id).indexOf('demo-student-') === 0) return;
      const row = backdrop.querySelector('#ivFlagRow');
      const cb = backdrop.querySelector('#ivFlagCb');
      if (!row || !cb) return;
      cb.disabled = true;
      row.hidden = false;
      cb.checked = await InterviewAccess.getFor(s.id);
      cb.disabled = false;
      cb.addEventListener('change', async () => {
        cb.disabled = true;
        try {
          await InterviewAccess.setFor(s.id, cb.checked);
          toast((cb.checked ? '✅ ' : '🚫 ') + t('class.interviewAccess') + ': ' + (s.profile.name || s.id));
        } catch (e) {
          cb.checked = !cb.checked;
          toast('❌ ' + (e && e.message || 'error'));
        }
        cb.disabled = false;
      });
    })();
  }

  function exportClassCsv(students) {
    if (!students || !students.length) return;
    const header = ['id', 'name', 'email', 'level', 'xp', 'streak', 'wordsSeen', 'mastered', 'updatedAt'];
    const rows = [header.join(',')];
    students.forEach((s) => {
      const p = s.progress || {};
      const wordsSeen = Object.keys(p.perWord || {}).length;
      let mastered = 0;
      Object.values(p.perWord || {}).forEach((w) => { if (w.box >= 4) mastered += 1; });
      rows.push([
        csvCell(s.id),
        csvCell(s.profile && s.profile.name || ''),
        csvCell(s.profile && s.profile.email || ''),
        p.level || 1,
        p.xp || 0,
        Progress.effectiveStreak(p),
        wordsSeen,
        mastered,
        s.updatedAt ? new Date(s.updatedAt).toISOString() : '',
      ].join(','));
    });
    // BOM so Excel opens Vietnamese names as UTF-8 instead of mojibake.
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'class-progress-' + Progress.todayStr() + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function csvCell(v) {
    let s = String(v == null ? '' : v);
    // A name like "=HYPERLINK(...)" must stay text in Excel/Sheets.
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    s = s.replace(/"/g, '""');
    return /[,"\n]/.test(s) ? '"' + s + '"' : s;
  }

  // ========== Boot ==========
  function boot() {
    I18N.applyStaticTranslations();

    // Header buttons
    document.querySelectorAll('[data-view-link]').forEach((el) => {
      el.addEventListener('click', () => {
        const v = el.getAttribute('data-view-link');
        if (v === 'topics' || v === 'progress' || v === 'toeic' || v === 'class' || v === 'interview') {
          if (!Storage.getActiveProfileId()) {
            navigate('profile');
          } else {
            navigate(v);
          }
        }
      });
    });

    langBtn.addEventListener('click', () => {
      I18N.toggle();
      syncVoiceLabel();
      // Re-render the same screen with its params. Live sessions (a game,
      // test, interview, drill) keep going: re-rendering would restart them.
      const live = ['game', 'placement', 'interview', 'drill'];
      if (currentView && live.indexOf(currentView) < 0) navigate(currentView, currentParams, { fromPop: true });
      else renderHeader();
    });

    function syncVoiceLabel() {
      if (!voiceBtn || typeof Pronunciation === 'undefined') return;
      const g = Pronunciation.getGender();
      const explicit = Pronunciation.getVoiceName();
      const label = voiceBtn.querySelector('#voiceLabel');
      const map = { auto: '🤖', female: '👩', male: '👨' };
      if (label) label.textContent = explicit ? '🔊' : (map[g] || '🤖');
      const info = Pronunciation.getCurrentVoiceInfo();
      voiceBtn.title = info && info.name ? info.name : I18N.t('voice.auto');
    }
    syncVoiceLabel();

    function openVoicePicker() {
      if (typeof Pronunciation === 'undefined') return;
      const voices = Pronunciation.listEnglishVoices();
      const curGender = Pronunciation.getGender();
      const curName = Pronunciation.getVoiceName();

      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      const genderRow = (gender, label, emoji) => {
        const isActive = !curName && curGender === gender;
        return `<button class="voice-pill ${isActive ? 'active' : ''}" data-gender="${gender}">${emoji} ${escapeHtml(label)}</button>`;
      };
      const voiceRow = (v) => {
        const isActive = curName === v.name;
        const genderIcon = v.gender === 'female' ? '👩' : v.gender === 'male' ? '👨' : '🔊';
        const badges = [];
        if (v.enhanced) badges.push('<span class="vbadge good">Enhanced</span>');
        if (v.localService) badges.push('<span class="vbadge">Local</span>');
        if (v.lowQuality) badges.push('<span class="vbadge bad">Cũ</span>');
        return `
          <div class="voice-row ${isActive ? 'active' : ''}" data-name="${escapeHtml(v.name)}">
            <span class="voice-left">${genderIcon} <strong>${escapeHtml(v.name)}</strong> <span class="voice-lang">${escapeHtml(v.lang)}</span></span>
            <span class="voice-badges">${badges.join('')}</span>
            <button class="speak-btn preview-btn" data-preview="${escapeHtml(v.name)}" title="${I18N.t('word.listen')}">▶</button>
          </div>
        `;
      };
      const voicesHtml = voices.length
        ? voices.map(voiceRow).join('')
        : `<div class="empty-state" style="padding:16px;">${I18N.t('voice.noVoices')}</div>`;

      backdrop.innerHTML = `
        <div class="modal voice-picker">
          <div class="modal-head">
            <h2>${I18N.t('voice.pickTitle')}</h2>
            <button class="icon-btn" id="closePicker" title="Close">✕</button>
          </div>
          <p class="modal-sub">${I18N.t('voice.pickSub')}</p>
          <div class="voice-pills">
            ${genderRow('auto', I18N.t('voice.auto'), '🤖')}
            ${genderRow('female', I18N.t('voice.female'), '👩')}
            ${genderRow('male', I18N.t('voice.male'), '👨')}
          </div>
          <div class="voice-list">${voicesHtml}</div>
          <p class="source-note" style="margin-top:14px;">💡 ${I18N.t('voice.downloadHint')}</p>
        </div>
      `;
      document.body.appendChild(backdrop);

      const close = () => {
        Pronunciation.cancel();
        backdrop.remove();
      };
      backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
      backdrop.querySelector('#closePicker').addEventListener('click', close);

      backdrop.querySelectorAll('.voice-pill').forEach((btn) => {
        btn.addEventListener('click', () => {
          const g = btn.getAttribute('data-gender');
          Pronunciation.setVoiceName(null);
          Pronunciation.setGender(g);
          syncVoiceLabel();
          Pronunciation.speak('hello', null, btn);
          backdrop.querySelectorAll('.voice-pill').forEach((b) => b.classList.toggle('active', b === btn));
          backdrop.querySelectorAll('.voice-row').forEach((r) => r.classList.remove('active'));
        });
      });

      backdrop.querySelectorAll('.preview-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const name = btn.getAttribute('data-preview');
          // Preview without committing selection
          const prev = Pronunciation.getVoiceName();
          Pronunciation.setVoiceName(name);
          Pronunciation.speak('hello', null, btn);
          Pronunciation.setVoiceName(prev);
        });
      });

      backdrop.querySelectorAll('.voice-row').forEach((row) => {
        row.addEventListener('click', (e) => {
          if (e.target.closest('.preview-btn')) return;
          const name = row.getAttribute('data-name');
          Pronunciation.setVoiceName(name);
          syncVoiceLabel();
          Pronunciation.speak('hello', null, row);
          backdrop.querySelectorAll('.voice-row').forEach((r) => r.classList.toggle('active', r === row));
          backdrop.querySelectorAll('.voice-pill').forEach((b) => b.classList.remove('active'));
          toast(I18N.t('voice.changedTo') + ' ' + name);
        });
      });
    }

    if (voiceBtn) {
      voiceBtn.addEventListener('click', openVoicePicker);
    }

    switchBtn.addEventListener('click', async () => {
      if (typeof FirebaseSync !== 'undefined' && FirebaseSync.enabled()
          && FirebaseSync.getCurrentUser()) {
        await FirebaseSync.signOut();
        // onAuthChange will navigate to profile.
      } else {
        Storage.setActiveProfile(null);
        navigate('profile');
      }
    });

    // Hook Firebase auth state if enabled.
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.enabled()) {
      FirebaseSync.onAuthChange((user) => {
        if (user) {
          // Navigate right away using whatever local info we have so the
          // user never stares at 'Đang xử lý'. Cloud hydration runs in
          // the background and updates the UI when it finishes.
          ensureLocalProfileForUser(user);
          Storage.setActiveProfile(user.uid);
          if (typeof DemoSeed !== 'undefined') DemoSeed.maybeSeed(user);
          renderHeader();
          syncClassNav();
          syncInterviewNav();
          if (typeof Placement !== 'undefined') Placement.Schedule.startInPageNotifier();
          if (currentView === 'profile' || !currentView) navigate('topics', null, { replace: true });
          hydrateLocalFromCloud(user).catch((e) => console.warn('[app] hydrate error', e));
        } else {
          Storage.setActiveProfile(null);
          syncClassNav();
          syncInterviewNav();
          navigate('profile', null, { replace: true });
        }
      });
    }
    syncClassNav();

    // Browser/device Back button: walk back through in-app views instead
    // of leaving the app. popstate gives us the previous view's state; if
    // there's none left, stay on a safe in-app view rather than bouncing
    // out to a blank page.
    window.addEventListener('popstate', (e) => {
      const st = e.state;
      if (st && st.view === 'game' && st.params) {
        // Back onto a finished/abandoned game must not start a new session:
        // land on that game's topic (or TOEIC part) instead.
        const gp = st.params;
        if (gp.toeicContext) navigate('toeic-part', { editionId: gp.toeicContext.editionId, partId: gp.toeicContext.partId }, { fromPop: true, replace: true });
        else navigate('topic', { topicId: gp.topicId }, { fromPop: true, replace: true });
      } else if (st && st.view) {
        navigate(st.view, st.params, { fromPop: true });
      } else {
        const home = (typeof FirebaseSync !== 'undefined' && FirebaseSync.enabled()
          && !FirebaseSync.getCurrentUser()) ? 'profile' : 'topics';
        navigate(home, null, { fromPop: true });
      }
    });

    // Initial route
    const hasActive = Storage.getActiveProfileId() && Storage.getActiveProfile();
    // replace: the first screen must not leave an extra history entry
    // (Back from Topics used to show the sign-in form).
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.enabled()) {
      // Wait for onAuthChange; default to auth screen meanwhile.
      navigate('profile', null, { replace: true });
    } else if (!hasActive) {
      navigate('profile', null, { replace: true });
    } else {
      navigate('topics', null, { replace: true });
    }
  }

  function ensureLocalProfileForUser(user) {
    const profiles = Storage.getProfiles();
    let localProfile = profiles.find((p) => p.id === user.uid);
    if (!localProfile) {
      // Just signed up on this device → use what was typed on the form.
      const pending = FirebaseSync.takePendingSignup ? FirebaseSync.takePendingSignup(user.email) : null;
      localProfile = {
        id: user.uid,
        name: (pending && pending.name) || user.displayName || (user.email || '').split('@')[0] || 'Me',
        avatar: (pending && pending.avatar) || '🙂',
        // Only a brand-new signup knows its creation time; otherwise the
        // cloud value is copied in by hydrateLocalFromCloud.
        createdAt: pending ? pending.createdAt : null,
      };
      profiles.push(localProfile);
      localStorage.setItem('vlt_profiles', JSON.stringify(profiles));
    }
    return localProfile;
  }

  // Pulls cloud state and merges it into the local profile, in the
  // background after the view already switched to 'topics'. A FAILED read
  // (slow 3G, timeout) is retried and uploads stay blocked until it
  // succeeds — a failure is never treated as "empty account".
  async function hydrateLocalFromCloud(user, attempt) {
    const tries = attempt || 0;
    const stillMe = () => { const u = FirebaseSync.getCurrentUser(); return !!u && u.uid === user.uid; };
    let data = null;
    try {
      data = await FirebaseSync.pullCurrentUser();
    } catch (e) {
      console.warn('[app] cloud read failed (attempt ' + (tries + 1) + ') — retrying', e);
      if (tries === 1) toast('☁️ ' + I18N.t('sync.retrying'));
      if (stillMe()) setTimeout(() => hydrateLocalFromCloud(user, tries + 1).catch(() => {}), Math.min(60000, 3000 * Math.pow(2, tries)));
      return;
    }
    if (!stillMe()) return;

    if (data) {
      const cloudProfile = data.profile || {};
      // Profile metadata from cloud (name/avatar may have changed on another
      // device; createdAt = the ORIGINAL signup time, keep the earliest).
      const profiles = Storage.getProfiles();
      const localProfile = profiles.find((p) => p.id === user.uid);
      if (localProfile) {
        if (cloudProfile.name) localProfile.name = cloudProfile.name;
        if (cloudProfile.avatar) localProfile.avatar = cloudProfile.avatar;
        const c = [localProfile.createdAt, cloudProfile.createdAt].filter((x) => typeof x === 'number' && x > 0);
        if (c.length) localProfile.createdAt = Math.min.apply(null, c);
        localStorage.setItem('vlt_profiles', JSON.stringify(profiles));
      }
      // Union-merge progress field by field (every word keeps its best state).
      if (data.progress) {
        const merged = mergeProgress(Storage.getProgress(user.uid), Storage.normalizeProgress(data.progress));
        Storage.saveProgressLocal(merged, user.uid);
      }
    }
    await applyAccountMerges(user);
    if (!stillMe()) return;
    // Uploads allowed from now on; this also pushes anything only this
    // device had (read-merge-write in FirebaseSync.pushActiveProfile).
    FirebaseSync.markHydrated(user.uid);
    renderHeader();
    // Show the merged numbers on the screen the student is looking at.
    const refreshable = ['topics', 'progress', 'topic', 'toeic', 'toeic-part'];
    if (refreshable.indexOf(currentView) >= 0) navigate(currentView, currentParams, { fromPop: true });
  }

  // The teacher merged an old (duplicate) account into this one: fold its
  // progress in once. `mergedFrom` lives inside progress so it syncs and a
  // second device never applies the same merge twice.
  async function applyAccountMerges(user) {
    if (!FirebaseSync.pullMerges) return;
    const merges = await FirebaseSync.pullMerges(user.uid);
    const u = FirebaseSync.getCurrentUser();
    if (!u || u.uid !== user.uid) return; // switched accounts meanwhile
    if (!merges) return;
    let p = Storage.getProgress(user.uid);
    let changed = false;
    Object.keys(merges).forEach((fromUid) => {
      const m = merges[fromUid];
      if (!m || !m.at) return;
      if (((p.mergedFrom || {})[fromUid] || 0) >= m.at) return;
      const other = Storage.normalizeProgress(m.progress ? JSON.parse(JSON.stringify(m.progress)) : null);
      const xp = (p.xp || 0) + (other.xp || 0); // two separate accounts → add up
      const merged = mergeProgress(p, other);
      merged.xp = xp;
      merged.level = Progress.computeLevel(xp).level;
      merged.mergedFrom = Object.assign({}, p.mergedFrom || {}, { [fromUid]: m.at });
      p = merged;
      changed = true;
    });
    if (!changed) return;
    Storage.saveProgress(p, user.uid); // pushed once hydration completes
    toast('🔗 ' + I18N.t('acc.mergedToast'));
  }

  // Field-by-field union of two progress objects (lives in Storage so the
  // cloud sync can merge before every upload).
  function mergeProgress(a, b) { return Storage.mergeProgress(a, b); }

  // Show the ✈️ Phỏng vấn nav item only for accounts with the feature
  // flag (or teacher / demo, handled inside InterviewAccess).
  async function syncInterviewNav() {
    const btn = document.getElementById('navInterview');
    if (!btn) return;
    let show = false;
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.enabled() && typeof InterviewAccess !== 'undefined') {
      const u = FirebaseSync.getCurrentUser();
      if (u) {
        try { show = await InterviewAccess.isEnabledFor(u); } catch (e) { show = false; }
      }
    }
    btn.hidden = !show;
  }

  function syncClassNav() {
    const classBtn = document.querySelector('[data-view-link="class"]');
    if (!classBtn) return;
    let showClass = false;
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.enabled()) {
      const u = FirebaseSync.getCurrentUser();
      if (u && FirebaseSync.isTeacher(u)) showClass = true;
      // Demo accounts get the dashboard too — with fabricated students.
      if (u && typeof DemoSeed !== 'undefined' && DemoSeed.isDemoUser(u)) showClass = true;
    } else {
      // No cloud — hide class tab entirely.
      showClass = false;
    }
    classBtn.hidden = !showClass;
  }

  global.App = { navigate, toast, renderHeader, onLeave };
  document.addEventListener('DOMContentLoaded', boot);
})(window);
