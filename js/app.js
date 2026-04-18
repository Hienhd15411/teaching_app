(function (global) {
  'use strict';

  const appEl = document.getElementById('app');
  const navEl = document.getElementById('mainNav');
  const chipEl = document.getElementById('profileChip');
  const langBtn = document.getElementById('langToggle');
  const switchBtn = document.getElementById('switchProfileBtn');

  let currentView = null;

  function navigate(view, params) {
    currentView = view;
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
      case 'grammar':
        renderGrammarStub();
        break;
      case 'game':
        renderGame(params);
        break;
      default:
        renderTopics();
    }
  }

  function highlightNav(view) {
    navEl.querySelectorAll('.nav-btn').forEach((b) => {
      const v = b.getAttribute('data-view-link');
      b.classList.toggle('active', v === view || (view === 'topic' && v === 'topics') || (view === 'game' && v === 'topics'));
    });
  }

  function renderHeader() {
    const p = Storage.getActiveProfile();
    if (p) {
      chipEl.hidden = false;
      navEl.hidden = false;
      document.getElementById('profileAvatar').textContent = p.avatar || '🙂';
      document.getElementById('profileName').textContent = p.name;
    } else {
      chipEl.hidden = true;
      navEl.hidden = true;
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
        </div>

        ${reviewBtn}

        <h2 style="margin-top:24px;">${t('topic.allWords')}</h2>
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
    words.forEach((w) => {
      const state = SRS.getWordState(progress, topicId, w.en);
      const row = document.createElement('div');
      row.className = 'word-row';
      row.innerHTML = `
        <div class="en"></div>
        <div class="vi"></div>
        <span class="mastery-dot box-${state.box}" title="Box ${state.box}/5"></span>
      `;
      row.querySelector('.en').textContent = w.en + (w.pos ? ` (${w.pos})` : '');
      row.querySelector('.vi').textContent = w.vi;
      wordListEl.appendChild(row);
    });
  }

  // ========== Game runner ==========
  function renderGame(params) {
    const { topicId, mode, wordsOverride } = params;
    const words = wordsOverride && wordsOverride.length ? wordsOverride : (VOCAB[topicId] || []);
    if (!words.length) return navigate('topic', { topicId });

    // Pick session based on SRS priority (max 10)
    const progress = Storage.getProgress();
    const sessionWords = wordsOverride
      ? words.slice()
      : SRS.pickSession(progress, topicId, words, Math.min(10, words.length));

    const game = getGameModule(mode);
    if (!game) return navigate('topic', { topicId });

    game.start({
      container: appEl,
      topicId,
      words: sessionWords,
      allTopicWords: words,
      onExit: () => navigate('topic', { topicId }),
      onFinish: (result) => handleFinish(Object.assign({ mode, topicId }, result)),
    });
  }

  function getGameModule(mode) {
    if (mode === 'flashcard') return FlashcardGame;
    if (mode === 'quiz') return QuizGame;
    if (mode === 'typing') return TypingGame;
    if (mode === 'matching') return MatchingGame;
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
    const badgeHtml = (newBadges || []).map((id) => {
      const b = Progress.getBadgeDef(id);
      return `<span class="badge-earned">${b.emoji} ${t(b.nameKey)}</span>`;
    }).join('');

    appEl.innerHTML = `
      <section class="view game-view">
        <div class="game-result">
          <div class="big">${acc >= 80 ? '🎉' : acc >= 50 ? '👍' : '💪'}</div>
          <h2>${t('result.title')}</h2>
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
      navigate('game', { topicId: result.topicId, mode: result.mode });
    });
    appEl.querySelector('#backToTopicBtn').addEventListener('click', () => {
      navigate('topic', { topicId: result.topicId });
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
          <div class="empty-state">${t('progress.empty')}</div>
          <div style="text-align:center;">
            <button class="btn" id="goTopics">${t('nav.topics')}</button>
          </div>
        </section>
      `;
      appEl.querySelector('#goTopics').addEventListener('click', () => navigate('topics'));
      return;
    }

    // Topic breakdown
    const topicRows = TOPICS.map((topic) => {
      const words = VOCAB[topic.id] || [];
      const tStats = SRS.topicStats(progress, topic.id, words);
      const pt = progress.perTopic[topic.id];
      const accuracy = pt && pt.correct + pt.wrong > 0
        ? Math.round((pt.correct / (pt.correct + pt.wrong)) * 100)
        : 0;
      return `
        <div class="topic-progress-row">
          <div>
            <strong>${topic.icon} ${topic.title[lang]}</strong>
            <div class="accuracy">${tStats.mastered}/${tStats.total} · ${t('result.accuracy')} ${accuracy}%</div>
          </div>
          <div class="progress-bar"><span style="width:${tStats.masteryPct}%"></span></div>
          <div class="accuracy" style="text-align:right;">${tStats.masteryPct}%</div>
          <button class="btn secondary" data-topic="${topic.id}">→</button>
        </div>
      `;
    }).join('');

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
      const ds = d.toISOString().slice(0, 10);
      const v = histByDate[ds] || 0;
      const h = Math.round((v / maxVal) * 100);
      bars.push(`<div class="history-bar" style="height:${Math.max(h, v ? 8 : 2)}%;opacity:${v ? 1 : 0.15}" data-tip="${ds}: ${v}"></div>`);
    }

    // Badges
    const allBadges = Progress.BADGES.map((b) => {
      const earned = progress.badges.indexOf(b.id) >= 0;
      return `<span class="badge ${earned ? 'earned' : ''}">${b.emoji} ${t(b.nameKey)}</span>`;
    }).join('');

    appEl.innerHTML = `
      <section class="view">
        <h1>${t('progress.title')}</h1>

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
            <div class="hint">Total XP earned</div>
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
        <div>${topicRows}</div>

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

    appEl.querySelectorAll('.topic-progress-row button[data-topic]').forEach((b) => {
      b.addEventListener('click', () => navigate('topic', { topicId: b.getAttribute('data-topic') }));
    });

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

  function renderGrammarStub() {
    const t = I18N.t;
    appEl.innerHTML = `
      <section class="view">
        <h1>${t('nav.grammar')}</h1>
        <div class="empty-state">📝 ${t('grammar.soon')}</div>
      </section>
    `;
  }

  // ========== Boot ==========
  function boot() {
    I18N.applyStaticTranslations();

    // Header buttons
    document.querySelectorAll('[data-view-link]').forEach((el) => {
      el.addEventListener('click', () => {
        const v = el.getAttribute('data-view-link');
        if (v === 'grammar') {
          navigate('grammar');
        } else if (v === 'topics' || v === 'progress') {
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
      if (currentView) navigate(currentView);
    });

    switchBtn.addEventListener('click', () => {
      Storage.setActiveProfile(null);
      navigate('profile');
    });

    // Initial route
    if (!Storage.getActiveProfileId() || !Storage.getActiveProfile()) {
      navigate('profile');
    } else {
      navigate('topics');
    }
  }

  global.App = { navigate, toast, renderHeader };
  document.addEventListener('DOMContentLoaded', boot);
})(window);
