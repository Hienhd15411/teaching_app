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

    // Topic breakdown — only topics that have been played, as a data table.
    const playedTopics = TOPICS
      .map((topic) => {
        const pt = progress.perTopic[topic.id];
        if (!pt || pt.attempts === 0) return null;
        const words = VOCAB[topic.id] || [];
        const tStats = SRS.topicStats(progress, topic.id, words);
        const accuracy = pt.correct + pt.wrong > 0
          ? Math.round((pt.correct / (pt.correct + pt.wrong)) * 100)
          : 0;
        const lastPlayedDays = pt.lastPlayedAt
          ? Math.max(0, Math.floor((Date.now() - pt.lastPlayedAt) / 86400000))
          : null;
        return { topic, words, tStats, pt, accuracy, lastPlayedDays };
      })
      .filter(Boolean);

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
            ${playedTopics.map(({ topic, tStats, pt, accuracy, lastPlayedDays }) => `
              <tr class="clickable" data-topic="${topic.id}">
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
      const topicDef = TOPICS.find((x) => x.id === topicId);
      const word = (VOCAB[topicId] || []).find((w) => w.en.toLowerCase() === en);
      if (!word || !topicDef) return;
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
      r.addEventListener('click', () => navigate('topic', { topicId: r.getAttribute('data-topic') }));
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
        <div id="classContent" class="empty-state" style="padding:30px 20px;">${t('class.loading')}</div>
      </section>
    `;

    const loadList = async () => {
      const content = appEl.querySelector('#classContent');
      content.innerHTML = `<div class="empty-state" style="padding:30px 20px;">${t('class.loading')}</div>`;
      const students = await FirebaseSync.listAllStudents();
      lastStudents = students;
      paintList(students);
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

      // Enrich each student with computed stats
      const rows = students.map((s) => {
        const p = s.progress || {};
        const wordsSeen = Object.keys(p.perWord || {}).length;
        let mastered = 0;
        Object.values(p.perWord || {}).forEach((w) => { if (w.box >= 4) mastered += 1; });
        const streak = p.streak || 0;
        const xp = p.xp || 0;
        const level = p.level || 1;
        const lastMs = s.updatedAt || 0;
        return { s, p, wordsSeen, mastered, streak, xp, level, lastMs };
      });

      // Default sort: XP descending
      rows.sort((a, b) => b.xp - a.xp);

      const lastActiveLabel = (ms) => {
        if (!ms) return t('class.neverActive');
        const days = Math.floor((Date.now() - ms) / 86400000);
        if (days <= 0) return t('class.today');
        return days + ' ' + t('class.daysAgo');
      };

      const body = rows.map((r, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${escapeHtml(r.s.profile.avatar || '🙂')} <strong>${escapeHtml(r.s.profile.name || r.s.id)}</strong></td>
          <td class="num">${r.level}</td>
          <td class="num">${r.xp}</td>
          <td class="num">🔥 ${r.streak}</td>
          <td class="num">${r.wordsSeen}</td>
          <td class="num">${r.mastered}</td>
          <td class="num muted">${lastActiveLabel(r.lastMs)}</td>
        </tr>
      `).join('');

      content.innerHTML = `
        <div style="color:var(--text-muted);font-size:13px;margin-bottom:10px;">${students.length} ${t('class.totalStudents')}</div>
        <table class="progress-table">
          <thead>
            <tr>
              <th>#</th>
              <th>${t('class.student')}</th>
              <th class="num">${t('class.level')}</th>
              <th class="num">${t('class.xp')}</th>
              <th class="num">${t('class.streak')}</th>
              <th class="num">${t('class.wordsSeen')}</th>
              <th class="num">${t('class.mastered')}</th>
              <th class="num">${t('class.lastActive')}</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      `;
    };

    appEl.querySelector('#refreshClassBtn').addEventListener('click', loadList);
    appEl.querySelector('#exportClassBtn').addEventListener('click', () => exportClassCsv(lastStudents));
    loadList();
  }

  function exportClassCsv(students) {
    if (!students || !students.length) return;
    const header = ['id', 'name', 'level', 'xp', 'streak', 'wordsSeen', 'mastered', 'updatedAt'];
    const rows = [header.join(',')];
    students.forEach((s) => {
      const p = s.progress || {};
      const wordsSeen = Object.keys(p.perWord || {}).length;
      let mastered = 0;
      Object.values(p.perWord || {}).forEach((w) => { if (w.box >= 4) mastered += 1; });
      rows.push([
        csvCell(s.id),
        csvCell(s.profile && s.profile.name || ''),
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
      FirebaseSync.onAuthChange(async (user) => {
        if (user) {
          await hydrateLocalFromCloud(user);
          syncClassNav();
          if (currentView === 'profile' || !currentView) navigate('topics');
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

  async function hydrateLocalFromCloud(user) {
    // Pull user's cloud state; create a local profile mirror using the
    // Firebase uid as the profile id so progress saves line up.
    const data = await FirebaseSync.pullCurrentUser();
    const cloudProfile = (data && data.profile) || {};
    const cloudProgress = (data && data.progress) || Storage.emptyProgress();

    const profiles = Storage.getProfiles();
    let localProfile = profiles.find((p) => p.id === user.uid);
    if (!localProfile) {
      localProfile = {
        id: user.uid,
        name: cloudProfile.name || user.displayName || (user.email || '').split('@')[0],
        avatar: cloudProfile.avatar || '🙂',
        createdAt: cloudProfile.createdAt || Date.now(),
      };
      profiles.push(localProfile);
    } else {
      // Refresh from cloud values (in case they changed on another device)
      if (cloudProfile.name) localProfile.name = cloudProfile.name;
      if (cloudProfile.avatar) localProfile.avatar = cloudProfile.avatar;
    }
    localStorage.setItem('vlt_profiles', JSON.stringify(profiles));

    // Save progress locally so the rest of the app reads from the
    // familiar storage path.
    localStorage.setItem('vlt_progress_' + user.uid, JSON.stringify(cloudProgress));
    Storage.setActiveProfile(user.uid);
    renderHeader();
  }

  function syncClassNav() {
    const classBtn = document.querySelector('[data-view-link="class"]');
    if (!classBtn) return;
    let showClass = false;
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.enabled()) {
      const u = FirebaseSync.getCurrentUser();
      if (u && FirebaseSync.isTeacher(u)) showClass = true;
    } else {
      // No cloud — hide class tab entirely.
      showClass = false;
    }
    classBtn.hidden = !showClass;
  }

  global.App = { navigate, toast, renderHeader };
  document.addEventListener('DOMContentLoaded', boot);
})(window);
