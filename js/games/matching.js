(function (global) {
  'use strict';

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function start(opts) {
    const { container, topicId, words, onExit, onFinish } = opts;
    const t = I18N.t;

    // Use up to 6 pairs per round to keep grid playable.
    const PAIR_COUNT = Math.min(6, words.length);
    const roundWords = shuffle(words).slice(0, PAIR_COUNT);

    let matchedCount = 0;
    let correct = 0;
    let wrong = 0;
    let xp = 0;
    let combo = 0;
    let bestCombo = 0;
    let selectedEl = null; // { side, en, node }
    const startTs = Date.now();

    const leftItems = shuffle(roundWords.map((w) => ({ side: 'en', en: w.en, label: w.en })));
    const rightItems = shuffle(roundWords.map((w) => ({ side: 'vi', en: w.en, label: w.vi })));

    function renderHud() {
      return `
        <div class="game-hud">
          <button class="btn secondary" id="exitBtn">← ${t('game.back')}</button>
          <span class="chip">${matchedCount}/${roundWords.length}</span>
          <span class="chip correct">✓ ${correct}</span>
          <span class="chip wrong">✗ ${wrong}</span>
          <span class="chip combo">🔥 ${combo}</span>
        </div>
      `;
    }

    function render() {
      // 2-column grid: col 1 English, col 2 Vietnamese — render rows [L, R]
      let gridHtml = '';
      for (let i = 0; i < leftItems.length; i++) {
        const l = leftItems[i];
        const r = rightItems[i];
        gridHtml += `<button class="match-card" data-side="en" data-en="${escapeAttr(l.en)}">${escapeHtml(l.label)}</button>`;
        gridHtml += `<button class="match-card" data-side="vi" data-en="${escapeAttr(r.en)}">${escapeHtml(r.label)}</button>`;
      }

      container.innerHTML = `
        <section class="view game-view">
          ${renderHud()}
          <p style="color:var(--text-muted);text-align:center;font-size:13px;">${t('game.matchingHint')}</p>
          <div class="matching-grid">${gridHtml}</div>
        </section>
      `;

      container.querySelector('#exitBtn').addEventListener('click', onExit);
      container.querySelectorAll('.match-card').forEach((c) => {
        c.addEventListener('click', () => onCardClick(c));
      });
    }

    function onCardClick(node) {
      if (node.classList.contains('matched')) return;
      const side = node.getAttribute('data-side');
      const en = node.getAttribute('data-en');

      if (!selectedEl) {
        selectedEl = { side, en, node };
        node.classList.add('selected');
        return;
      }

      // Clicked same card again: deselect
      if (selectedEl.node === node) {
        node.classList.remove('selected');
        selectedEl = null;
        return;
      }

      // Same side clicked: switch selection
      if (selectedEl.side === side) {
        selectedEl.node.classList.remove('selected');
        selectedEl = { side, en, node };
        node.classList.add('selected');
        return;
      }

      // Different side: check match
      const progress = Storage.getProgress();
      if (selectedEl.en === en) {
        // match!
        node.classList.add('matched');
        selectedEl.node.classList.add('matched');
        selectedEl.node.classList.remove('selected');
        SRS.updateWord(progress, topicId, en, true);
        correct += 1;
        combo += 1;
        if (combo > bestCombo) bestCombo = combo;
        xp += 10 + (combo >= 3 ? 5 : 0);
        matchedCount += 1;
        selectedEl = null;
        Storage.saveProgress(progress);
        updateHud();
        if (matchedCount >= roundWords.length) {
          setTimeout(finish, 500);
        }
      } else {
        // wrong
        node.classList.add('wrong');
        selectedEl.node.classList.add('wrong');
        SRS.updateWord(progress, topicId, selectedEl.en, false);
        SRS.updateWord(progress, topicId, en, false);
        wrong += 1;
        combo = 0;
        Storage.saveProgress(progress);
        const prev = selectedEl;
        selectedEl = null;
        setTimeout(() => {
          prev.node.classList.remove('wrong', 'selected');
          node.classList.remove('wrong');
          updateHud();
        }, 600);
      }
    }

    function updateHud() {
      const hud = container.querySelector('.game-hud');
      if (!hud) return;
      const wrapper = document.createElement('div');
      wrapper.innerHTML = renderHud();
      hud.replaceWith(wrapper.firstElementChild);
      const ex = container.querySelector('#exitBtn');
      if (ex) ex.addEventListener('click', onExit);
    }

    function finish() {
      onFinish({
        correct,
        wrong,
        xp,
        bestCombo,
        durationSec: (Date.now() - startTs) / 1000,
        wordsSeen: roundWords.length,
      });
    }

    render();
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function escapeAttr(s) { return escapeHtml(s); }

  global.MatchingGame = { start };
})(window);
