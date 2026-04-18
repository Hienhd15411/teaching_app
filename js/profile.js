(function (global) {
  'use strict';

  const AVATARS = ['🦊', '🐼', '🐸', '🐵', '🦁', '🐯', '🐶', '🐱', '🐰', '🐨', '🐻', '🦄', '🐙', '🐧', '🦉', '🐲'];

  function render(container) {
    const t = I18N.t;
    const profiles = Storage.getProfiles();

    container.innerHTML = `
      <section class="view profile-view">
        <div class="profile-hero">🎮</div>
        <h1>${t('profile.title')}</h1>
        <p class="profile-tagline">${t('profile.tagline')}</p>
        <div class="profile-list" id="profileList"></div>
        <div id="profileFormWrap"></div>
      </section>
    `;

    const list = container.querySelector('#profileList');
    profiles.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'profile-card';
      card.innerHTML = `
        <button class="delete" title="Delete">✕</button>
        <div class="avatar">${p.avatar || '🙂'}</div>
        <div class="name"></div>
        <div class="meta"></div>
      `;
      card.querySelector('.name').textContent = p.name;
      // XP summary from progress
      const progress = Storage.getProgress(p.id);
      const words = Object.keys(progress.perWord || {}).length;
      card.querySelector('.meta').textContent =
        `Lv ${progress.level || 1} · ${words} ${t('topics.wordsCount')}`;
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete')) return;
        Storage.setActiveProfile(p.id);
        App.navigate('topics');
      });
      card.querySelector('.delete').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(t('profile.confirmDelete'))) {
          Storage.deleteProfile(p.id);
          render(container);
        }
      });
      list.appendChild(card);
    });

    // "new" card
    const newCard = document.createElement('div');
    newCard.className = 'profile-card new';
    newCard.innerHTML = `
      <div class="avatar">➕</div>
      <div class="name">${t('profile.createNew')}</div>
    `;
    newCard.addEventListener('click', () => renderForm(container));
    list.appendChild(newCard);
  }

  function renderForm(container) {
    const t = I18N.t;
    const wrap = container.querySelector('#profileFormWrap');
    let selectedAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];

    wrap.innerHTML = `
      <div class="profile-form">
        <label>${t('profile.namePlaceholder')}</label>
        <input type="text" id="newName" maxlength="24" autofocus />
        <label>${t('profile.pickAvatar')}</label>
        <div class="avatar-picker" id="avatarPicker"></div>
        <div class="btn-row" style="justify-content:flex-end">
          <button class="btn secondary" id="cancelBtn">${t('profile.cancel')}</button>
          <button class="btn" id="saveBtn">${t('profile.save')}</button>
        </div>
      </div>
    `;

    const picker = wrap.querySelector('#avatarPicker');
    function paintAvatar() {
      picker.innerHTML = '';
      AVATARS.forEach((a) => {
        const b = document.createElement('button');
        b.textContent = a;
        if (a === selectedAvatar) b.classList.add('selected');
        b.addEventListener('click', () => {
          selectedAvatar = a;
          paintAvatar();
        });
        picker.appendChild(b);
      });
    }
    paintAvatar();

    wrap.querySelector('#cancelBtn').addEventListener('click', () => {
      wrap.innerHTML = '';
    });
    wrap.querySelector('#saveBtn').addEventListener('click', () => {
      const name = wrap.querySelector('#newName').value.trim();
      if (!name) {
        alert(t('profile.emptyName'));
        return;
      }
      const p = Storage.createProfile(name, selectedAvatar);
      Storage.setActiveProfile(p.id);
      App.navigate('topics');
    });
    wrap.querySelector('#newName').focus();
    wrap.querySelector('#newName').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') wrap.querySelector('#saveBtn').click();
    });
  }

  global.ProfileView = { render };
})(window);
