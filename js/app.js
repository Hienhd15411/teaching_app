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
          <div class="mode-card" data-mode="speaking">
            <div class="icon">🎤</div>
            <div class="title">${t('mode.speaking')}</div>
            <div class="desc">${t('mode.speakingDesc')}</div>
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
      const ipaHtml = w.ipa ? `<span class="ipa">${escapeHtml(w.ipa)}</span>` : '';
      row.innerHTML = `
        <div class="en">
          <button class="speak-btn" data-speak="${escapeHtml(w.en)}" title="${t('word.listen')}">🔊</button>
          <span class="w">${escapeHtml(w.en)}</span>
          ${w.pos ? `<span style="color:var(--text-muted);font-weight:400;font-size:12px;">(${w.pos})</span>` : ''}
          ${ipaHtml}
        </div>
        <div class="vi">${escapeHtml(w.vi)}</div>
        <span class="mastery-dot box-${state.box}" title="Box ${state.box}/5"></span>
      `;
      wordListEl.appendChild(row);
    });
    if (typeof Pronunciation !== 'undefined') Pronunciation.bindSpeakers(wordListEl);
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
    const sessionWords = wordsOverride
      ? SRS.pickSession(progress, topicId, words.slice(), Math.min(10, words.length))
      : SRS.pickSession(progress, topicId, words, Math.min(10, words.length));

    const game = getGameModule(mode);
    if (!game) return exitTarget();

    game.start({
      container: appEl,
      topicId,
      words: sessionWords,
      allTopicWords: words,
      onExit: exitTarget,
      onFinish: (result) => handleFinish(Object.assign({ mode, topicId, toeicContext }, result)),
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
          <div class="empty-state">${t('progress.empty')}</div>
          <div style="text-align:center;">
            <button class="btn" id="goTopics">${t('nav.topics')}</button>
          </div>
        </section>
      `;
      appEl.querySelector('#goTopics').addEventListener('click', () => navigate('topics'));
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

    const { highFreq, keywords } = TOEIC.getPart(editionId, partId);
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

        ${renderGroupList(keywords, '🎯 ' + t('toeic.group.keywords'))}
        ${renderGroupList(highFreq, '📊 ' + t('toeic.group.highFreq'))}
      </section>
    `;

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
    const state = SRS.getWordState(progress, topicId, w.en);
    const ipaHtml = w.ipa ? `<span class="ipa">${escapeHtml(w.ipa)}</span>` : '';
    return `
      <div class="word-row">
        <div class="en">
          <button class="speak-btn" data-speak="${escapeHtml(w.en)}" title="${I18N.t('word.listen')}">🔊</button>
          <span class="w">${escapeHtml(w.en)}</span>
          ${w.pos ? `<span style="color:var(--text-muted);font-weight:400;font-size:12px;">(${escapeHtml(w.pos)})</span>` : ''}
          ${ipaHtml}
        </div>
        <div class="vi">${escapeHtml(w.vi)}</div>
        <span class="mastery-dot box-${state.box}" title="Box ${state.box}/5"></span>
      </div>
    `;
  }

  // ========== Class (teacher) dashboard ==========
  let classTab = 'progress'; // survives tab re-renders within the session

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

    const loadList = async () => {
      const content = appEl.querySelector('#classContent');
      content.innerHTML = `<div class="empty-state" style="padding:30px 20px;">${t('class.loading')}</div>`;
      // Demo accounts see a fabricated roster — never real student data.
      const demoUser = FirebaseSync.getCurrentUser();
      if (typeof DemoSeed !== 'undefined' && DemoSeed.isDemoUser(demoUser) && !FirebaseSync.isTeacher(demoUser)) {
        lastStudents = DemoSeed.listDemoStudents();
        paintList(lastStudents);
        const note = document.createElement('div');
        note.style.cssText = 'margin-top:10px;font-size:12px;color:var(--text-muted);';
        note.textContent = '🧪 Dữ liệu minh hoạ cho tài khoản demo — không phải học viên thật.';
        content.appendChild(note);
        return;
      }
      const result = await FirebaseSync.listAllStudents();
      lastStudents = result.students || [];
      if (result.error === 'permission-denied') {
        content.className = 'empty-state';
        content.style.padding = '30px 20px';
        content.innerHTML = `
          <div style="font-size:40px;margin-bottom:8px;">🔒</div>
          <h2 style="margin:0 0 6px;">Permission denied</h2>
          <p style="color:var(--text-muted);max-width:580px;margin:0 auto 12px;line-height:1.5;">
            Rules Firebase đang chặn. Cần update rules để teacher được đọc <code>/users</code>:
          </p>
          <pre style="text-align:left;background:var(--bg-soft);padding:14px;border-radius:10px;font-size:12px;max-width:600px;margin:0 auto;overflow:auto;">${t('class.fixRulesSample')}</pre>
        `;
        return;
      }
      if (result.error === 'timeout') {
        content.className = 'empty-state';
        content.style.padding = '30px 20px';
        content.innerHTML = `⏱️ Database read timed out. Check databaseURL region in js/firebase-config.js.`;
        return;
      }
      if (result.error === 'not-teacher') {
        content.className = 'empty-state';
        content.style.padding = '30px 20px';
        content.innerHTML = `Chỉ giáo viên mới xem được. Email hiện tại không có trong TEACHER_EMAILS.`;
        return;
      }
      paintList(lastStudents);
    };

    let lastStudents = [];

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
        const streak = p.streak || 0;
        const xp = p.xp || 0;
        const level = p.level || 1;
        const lastMs = s.updatedAt || 0;
        const insights = (typeof ClassInsights !== 'undefined')
          ? ClassInsights.analyze(s, lang)
          : { accuracy: null, riskLevel: 'ok', riskScore: 0, suggestions: [], weakTopics: [], stuckWords: [], inactiveDays: null };
        return { s, p, wordsSeen, mastered, streak, xp, level, lastMs, insights };
      });

      // Default sort: XP descending
      rows.sort((a, b) => b.xp - a.xp);

      const lastActiveLabel = (ms) => {
        if (!ms) return t('class.neverActive');
        const days = Math.floor((Date.now() - ms) / 86400000);
        if (days <= 0) return t('class.today');
        return days + ' ' + t('class.daysAgo');
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

      const body = rows.map((r, idx) => `
        <tr class="clickable" data-student="${escapeHtml(r.s.id)}">
          <td>${idx + 1}</td>
          <td>${escapeHtml(r.s.profile.avatar || '🙂')} <strong>${escapeHtml(r.s.profile.name || r.s.id)}</strong></td>
          <td class="muted">${escapeHtml(r.s.profile.email || '')}</td>
          <td class="num">${r.level}</td>
          <td class="num">${r.xp}</td>
          ${accCell(r.insights)}
          <td class="num">🔥 ${r.streak}</td>
          <td class="num">${r.wordsSeen}</td>
          <td class="num">${r.mastered}</td>
          <td class="num muted">${lastActiveLabel(r.lastMs)}</td>
        </tr>
      `).join('');

      content.innerHTML = `
        <h3 style="margin:4px 0 10px;">${t('class.attention')}</h3>
        ${attnHtml}
        <div style="color:var(--text-muted);font-size:13px;margin:18px 0 10px;">${students.length} ${t('class.totalStudents')} · ${t('class.clickRow')}</div>
        <table class="progress-table">
          <thead>
            <tr>
              <th>#</th>
              <th>${t('class.student')}</th>
              <th>${t('class.email')}</th>
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
    };

    const isDemoView = () => {
      const u = FirebaseSync.getCurrentUser();
      return typeof DemoSeed !== 'undefined' && DemoSeed.isDemoUser(u) && !FirebaseSync.isTeacher(u);
    };

    const loadBillingTab = async (kind) => {
      const content = appEl.querySelector('#classContent');
      content.className = '';
      content.style.padding = '0';
      content.innerHTML = `<div class="empty-state" style="padding:30px 20px;">${t('class.loading')}</div>`;

      let students;
      let api;
      let data;
      if (isDemoView()) {
        students = DemoSeed.listDemoStudents();
        api = DemoSeed.getDemoBillingApi();
        data = await api.fetchAll();
      } else {
        if (!lastStudents.length) {
          const result = await FirebaseSync.listAllStudents();
          lastStudents = result.students || [];
        }
        students = lastStudents;
        api = Billing;
        try {
          data = await Billing.fetchAll();
        } catch (e) {
          content.className = 'empty-state';
          content.style.padding = '30px 20px';
          content.innerHTML = `🔒 ${t('bill.rulesMissing')}`;
          return;
        }
      }

      const ctx = {
        students,
        data,
        api,
        lang: I18N.getLang(),
        reload: async () => {
          ctx.data = await api.fetchAll();
          if (kind === 'billing') BillingUI.renderBillingTab(content, ctx);
          else BillingUI.renderAttendanceTab(content, ctx);
        },
      };
      if (kind === 'billing') BillingUI.renderBillingTab(content, ctx);
      else BillingUI.renderAttendanceTab(content, ctx);
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
              <td class="num">${w.attempts}</td>
              <td class="num ${w.accuracy < 50 ? 'acc-bad' : 'acc-warn'}">${w.accuracy}%</td>
            </tr>`).join('')}
          </tbody>
        </table>`
      : `<div class="muted-note">${t('class.noWeakTopics')}</div>`;

    const stuck = insights.stuckWords.slice(0, 16);
    const stuckHtml = stuck.length
      ? `<div class="stuck-list">${stuck.map((w) =>
          `<span class="stuck-pill">${w.icon} ${escapeHtml(w.en)} <em>✗${w.wrong}</em></span>`).join('')}</div>`
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
      const ds = d.toISOString().slice(0, 10);
      const v = byDate[ds] || 0;
      const h = Math.round((v / maxV) * 100);
      bars.push(`<div class="history-bar" style="height:${Math.max(h, v ? 8 : 2)}%;opacity:${v ? 1 : 0.15}" data-tip="${ds}: ${v}"></div>`);
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal student-detail">
        <div class="modal-head">
          <h2>${escapeHtml(s.profile.avatar || '🙂')} ${escapeHtml(s.profile.name || s.id)}</h2>
          <button class="icon-btn" id="closeDetail" title="Close">✕</button>
        </div>
        <p class="modal-sub">${escapeHtml(s.profile.email || '')}</p>
        <div class="btn-row" style="margin-bottom:14px;">
          ${chip(t('class.level'), level)}
          ${chip('XP', xp)}
          ${chip(t('class.streak'), '🔥 ' + streak)}
          ${chip(t('class.accuracyCol'), insights.accuracy == null ? '—' : insights.accuracy + '%')}
          ${chip(t('class.mastered'), mastered + '/' + wordsSeen)}
        </div>
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
        p.streak || 0,
        wordsSeen,
        mastered,
        s.updatedAt ? new Date(s.updatedAt).toISOString() : '',
      ].join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
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
    const s = String(v == null ? '' : v).replace(/"/g, '""');
    return /[,"\n]/.test(s) ? '"' + s + '"' : s;
  }

  // ========== Boot ==========
  function boot() {
    I18N.applyStaticTranslations();

    // Header buttons
    document.querySelectorAll('[data-view-link]').forEach((el) => {
      el.addEventListener('click', () => {
        const v = el.getAttribute('data-view-link');
        if (v === 'topics' || v === 'progress' || v === 'toeic' || v === 'class') {
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
      if (currentView) navigate(currentView);
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
          if (currentView === 'profile' || !currentView) navigate('topics');
          hydrateLocalFromCloud(user).catch((e) => console.warn('[app] hydrate error', e));
        } else {
          Storage.setActiveProfile(null);
          syncClassNav();
          navigate('profile');
        }
      });
    }
    syncClassNav();

    // Initial route
    const hasActive = Storage.getActiveProfileId() && Storage.getActiveProfile();
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.enabled()) {
      // Wait for onAuthChange; default to auth screen meanwhile.
      navigate('profile');
    } else if (!hasActive) {
      navigate('profile');
    } else {
      navigate('topics');
    }
  }

  function ensureLocalProfileForUser(user) {
    const profiles = Storage.getProfiles();
    let localProfile = profiles.find((p) => p.id === user.uid);
    if (!localProfile) {
      localProfile = {
        id: user.uid,
        name: user.displayName || (user.email || '').split('@')[0] || 'Me',
        avatar: '🙂',
        createdAt: Date.now(),
      };
      profiles.push(localProfile);
      localStorage.setItem('vlt_profiles', JSON.stringify(profiles));
    }
    return localProfile;
  }

  async function hydrateLocalFromCloud(user) {
    // Pulls cloud state and merges onto the local profile. Runs in the
    // background after the view has already swapped to 'topics', so a
    // slow/failing DB read never blocks the UI.
    let data = null;
    try {
      data = await FirebaseSync.pullCurrentUser();
    } catch (e) {
      console.warn('[app] pullCurrentUser failed — keeping local state', e);
      return;
    }
    if (!data) return; // First signin or DB empty — keep local state.

    const cloudProfile = data.profile || {};
    const cloudProgress = data.progress || null;

    // Update profile metadata from cloud (name/avatar may have changed
    // on another device).
    const profiles = Storage.getProfiles();
    const localProfile = profiles.find((p) => p.id === user.uid);
    if (localProfile) {
      if (cloudProfile.name) localProfile.name = cloudProfile.name;
      if (cloudProfile.avatar) localProfile.avatar = cloudProfile.avatar;
      localStorage.setItem('vlt_profiles', JSON.stringify(profiles));
    }

    // Merge progress field-by-field. A winner-takes-all comparison on XP
    // silently dropped the smaller side's perWord/history when both devices
    // had studied; union-merging keeps every word's best state instead.
    if (cloudProgress) {
      const localProgress = Storage.getProgress(user.uid);
      const merged = mergeProgress(localProgress, Storage.normalizeProgress(cloudProgress));
      localStorage.setItem('vlt_progress_' + user.uid, JSON.stringify(merged));
      if ((merged.xp || 0) > (cloudProgress.xp || 0)) {
        // Local contributed something cloud lacked — push the merge back up.
        FirebaseSync.scheduleProgressPush();
      }
    }
    renderHeader();
  }

  function mergeProgress(a, b) {
    const out = Storage.emptyProgress();
    out.xp = Math.max(a.xp || 0, b.xp || 0);
    out.level = Math.max(a.level || 1, b.level || 1);
    out.streak = Math.max(a.streak || 0, b.streak || 0);
    out.lastActiveDate = [a.lastActiveDate, b.lastActiveDate].filter(Boolean).sort().pop() || null;
    out.badges = Array.from(new Set([].concat(a.badges || [], b.badges || [])));

    const wordKeys = new Set([].concat(Object.keys(a.perWord || {}), Object.keys(b.perWord || {})));
    wordKeys.forEach((k) => {
      const wa = (a.perWord || {})[k];
      const wb = (b.perWord || {})[k];
      if (!wa) { out.perWord[k] = wb; return; }
      if (!wb) { out.perWord[k] = wa; return; }
      out.perWord[k] = {
        box: Math.max(wa.box || 1, wb.box || 1),
        correct: Math.max(wa.correct || 0, wb.correct || 0),
        wrong: Math.max(wa.wrong || 0, wb.wrong || 0),
        lastReviewed: Math.max(wa.lastReviewed || 0, wb.lastReviewed || 0),
      };
    });

    const topicKeys = new Set([].concat(Object.keys(a.perTopic || {}), Object.keys(b.perTopic || {})));
    topicKeys.forEach((k) => {
      const ta = (a.perTopic || {})[k];
      const tb = (b.perTopic || {})[k];
      if (!ta) { out.perTopic[k] = tb; return; }
      if (!tb) { out.perTopic[k] = ta; return; }
      out.perTopic[k] = {
        attempts: Math.max(ta.attempts || 0, tb.attempts || 0),
        correct: Math.max(ta.correct || 0, tb.correct || 0),
        wrong: Math.max(ta.wrong || 0, tb.wrong || 0),
        lastPlayedAt: Math.max(ta.lastPlayedAt || 0, tb.lastPlayedAt || 0),
      };
    });

    const seenTs = new Set();
    out.history = [].concat(a.history || [], b.history || [])
      .filter((h) => {
        if (!h || seenTs.has(h.ts)) return false;
        seenTs.add(h.ts);
        return true;
      })
      .sort((x, y) => (x.ts || 0) - (y.ts || 0))
      .slice(-300);

    return out;
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

  global.App = { navigate, toast, renderHeader };
  document.addEventListener('DOMContentLoaded', boot);
})(window);
