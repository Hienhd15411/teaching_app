(function (global) {
  'use strict';

  const appEl = document.getElementById('app');
  const navEl = document.getElementById('mainNav');
  const chipEl = document.getElementById('profileChip');
  const langBtn = document.getElementById('langToggle');
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
        || (view === 'toeic-part' && v === 'toeic');
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

  // ========== Boot ==========
  function boot() {
    I18N.applyStaticTranslations();

    // Header buttons
    document.querySelectorAll('[data-view-link]').forEach((el) => {
      el.addEventListener('click', () => {
        const v = el.getAttribute('data-view-link');
        if (v === 'topics' || v === 'progress' || v === 'toeic') {
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
