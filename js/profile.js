(function (global) {
  'use strict';

  const AVATARS = ['🦊', '🐼', '🐸', '🐵', '🦁', '🐯', '🐶', '🐱', '🐰', '🐨', '🐻', '🦄', '🐙', '🐧', '🦉', '🐲'];

  function render(container) {
    // When Firebase is configured, show auth UI. Otherwise the original
    // local-profile picker stays as an offline fallback.
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.enabled()) {
      renderAuth(container);
    } else {
      renderLocal(container);
    }
  }

  // ================== Auth (Firebase) ==================
  function renderAuth(container) {
    const t = I18N.t;
    container.innerHTML = `
      <section class="view profile-view">
        <div class="profile-hero">🎮</div>
        <h1>${t('profile.title')}</h1>
        <p class="profile-tagline">${t('auth.tagline')}</p>
        <div class="profile-form auth-form" id="authForm"></div>
      </section>
    `;
    paintAuthForm(container, 'signin');
  }

  function escapeAttr(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function paintAuthForm(container, mode, prefillEmail) {
    const t = I18N.t;
    const wrap = container.querySelector('#authForm');
    const isSignUp = mode === 'signup';
    let selectedAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    let typoAckFor = null; // email the student confirmed despite the typo warning

    wrap.innerHTML = `
      <div class="auth-tabs">
        <button class="auth-tab ${!isSignUp ? 'active' : ''}" data-mode="signin">${t('auth.signIn')}</button>
        <button class="auth-tab ${isSignUp ? 'active' : ''}" data-mode="signup">${t('auth.signUp')}</button>
      </div>
      ${isSignUp ? `
        <div class="auth-note" style="margin:0 0 10px;">${t('auth.signupHadAccount')}</div>
        <label>${t('auth.displayName')}</label>
        <input type="text" id="authName" maxlength="32" autocomplete="name" />
        <label>${t('profile.pickAvatar')}</label>
        <div class="avatar-picker" id="avatarPicker"></div>
      ` : ''}
      <label>${t('auth.email')}</label>
      <input type="email" id="authEmail" autocomplete="email" value="${escapeAttr(prefillEmail || '')}" />
      ${isSignUp ? `<div class="auth-hint">${t('auth.emailHint')}</div>` : ''}
      <label>${t('auth.password')}</label>
      <input type="password" id="authPassword" autocomplete="${isSignUp ? 'new-password' : 'current-password'}" />
      <div class="auth-error" id="authError" hidden></div>
      <div class="auth-note" id="authInfo" hidden></div>
      <div class="btn-row" style="justify-content:space-between;align-items:center;">
        ${!isSignUp
          ? `<button class="btn-link" id="forgotBtn" type="button">${t('auth.forgot')}</button>`
          : '<span></span>'}
        <button class="btn" id="submitAuthBtn" type="button">${isSignUp ? t('auth.createAccount') : t('auth.signIn')}</button>
      </div>
    `;

    if (isSignUp) {
      const picker = wrap.querySelector('#avatarPicker');
      function paintAvatars() {
        picker.innerHTML = '';
        AVATARS.forEach((a) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = a;
          if (a === selectedAvatar) b.classList.add('selected');
          b.addEventListener('click', () => { selectedAvatar = a; paintAvatars(); });
          picker.appendChild(b);
        });
      }
      paintAvatars();
    }

    const emailInput = () => wrap.querySelector('#authEmail');
    wrap.querySelectorAll('.auth-tab').forEach((tab) => {
      tab.addEventListener('click', () => paintAuthForm(container, tab.getAttribute('data-mode'), (emailInput().value || '').trim()));
    });

    const errEl = wrap.querySelector('#authError');
    const infoEl = wrap.querySelector('#authInfo');
    const hideInfo = () => { infoEl.hidden = true; infoEl.textContent = ''; };
    const showErr = (msg) => { hideInfo(); errEl.textContent = msg; errEl.hidden = false; };
    const clearErr = () => { errEl.hidden = true; errEl.textContent = ''; hideInfo(); };
    // Error text + action buttons (e.g. "Dùng abc@gmail.com", "Đăng nhập").
    const showErrActions = (msg, actions) => {
      hideInfo();
      errEl.innerHTML = '';
      const p = document.createElement('div');
      p.textContent = msg;
      errEl.appendChild(p);
      const row = document.createElement('div');
      row.className = 'auth-actions';
      actions.forEach((a) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn secondary';
        b.textContent = a.label;
        b.addEventListener('click', a.onClick);
        row.appendChild(b);
      });
      errEl.appendChild(row);
      errEl.hidden = false;
    };
    // Returns true when the caller should stop (typo shown, not yet confirmed).
    const typoGate = (email) => {
      const fix = typeof Accounts !== 'undefined' ? Accounts.suggestEmail(email) : null;
      if (!fix || typoAckFor === email.toLowerCase()) return false;
      showErrActions(t('auth.typoSuggest').replace('{email}', email).replace('{fix}', fix), [
        { label: t('auth.typoUseFix').replace('{fix}', fix), onClick: () => { emailInput().value = fix; clearErr(); } },
        { label: t('auth.typoKeep'), onClick: () => { typoAckFor = email.toLowerCase(); clearErr(); } },
      ]);
      return true;
    };

    const submitBtn = wrap.querySelector('#submitAuthBtn');
    submitBtn.addEventListener('click', async () => {
      clearErr();
      const email = (wrap.querySelector('#authEmail').value || '').trim();
      const password = wrap.querySelector('#authPassword').value || '';
      const name = isSignUp ? (wrap.querySelector('#authName').value || '').trim() : '';

      if (!email || !password) return showErr(t('auth.errMissing'));
      if (isSignUp && !name) return showErr(t('auth.errMissingName'));
      if (password.length < 6) return showErr(t('auth.errShortPassword'));
      // A mistyped address at sign-up means the reset mail can never
      // arrive later — the #1 cause of students re-registering.
      if (isSignUp && typoGate(email)) return;

      submitBtn.disabled = true;
      submitBtn.textContent = t('auth.working');

      // Independent watchdog: even if the auth await hangs forever, this
      // fires after 10s and either navigates (if auth already succeeded
      // under the hood) or re-enables the button so the user can retry.
      const watchdog = setTimeout(() => {
        if (!document.querySelector('#authForm')) return;
        const u = FirebaseSync.getCurrentUser();
        if (u && typeof App !== 'undefined') {
          App.navigate('topics');
        } else {
          submitBtn.disabled = false;
          submitBtn.textContent = isSignUp ? t('auth.createAccount') : t('auth.signIn');
          showErr(t('auth.errGeneric') + ' (timeout)');
        }
      }, 10000);

      try {
        if (isSignUp) {
          await FirebaseSync.signUp(email, password, name, selectedAvatar);
        } else {
          await FirebaseSync.signIn(email, password);
        }
        // Success — onAuthChange in app.js will navigate. If it doesn't
        // fire within ~2s, do it ourselves so the user isn't stuck.
        setTimeout(() => {
          if (!document.querySelector('#authForm')) return;
          if (FirebaseSync.getCurrentUser() && typeof App !== 'undefined') {
            clearTimeout(watchdog);
            App.navigate('topics');
          }
        }, 2000);
      } catch (e) {
        clearTimeout(watchdog);
        submitBtn.disabled = false;
        submitBtn.textContent = isSignUp ? t('auth.createAccount') : t('auth.signIn');
        const code = (e && e.code) || '';
        if (isSignUp && code === 'auth/email-already-in-use') {
          // Steer back to the existing account instead of a new one.
          showErrActions(t('auth.errEmailInUse'), [
            { label: t('auth.signInThis'), onClick: () => paintAuthForm(container, 'signin', email) },
            { label: t('auth.forgot'), onClick: () => { paintAuthForm(container, 'signin', email); setTimeout(() => { const f = container.querySelector('#forgotBtn'); if (f) f.click(); }, 0); } },
          ]);
          return;
        }
        if (!isSignUp && /wrong-password|invalid-credential|invalid-login-credentials|user-not-found/.test(code)) {
          const fix = typeof Accounts !== 'undefined' ? Accounts.suggestEmail(email) : null;
          showErr(t('auth.errWrongCredentials') + ' ' + (fix ? t('auth.typoHintSignin').replace('{fix}', fix) : t('auth.dontRegisterAgain')));
          return;
        }
        showErr(mapAuthError(e));
      }
    });

    wrap.querySelectorAll('input').forEach((el) => {
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitBtn.click(); });
    });

    const forgot = wrap.querySelector('#forgotBtn');
    if (forgot) {
      let cooldownUntil = 0;
      forgot.addEventListener('click', async () => {
        const email = (emailInput().value || '').trim();
        if (!email) return showErr(t('auth.enterEmailForReset'));
        if (Date.now() < cooldownUntil) return showErr(t('auth.resetWait'));
        clearErr();
        if (typoGate(email)) return;
        forgot.disabled = true;
        try {
          await FirebaseSync.sendPasswordReset(email);
          cooldownUntil = Date.now() + 60000;
          // Firebase does not reveal whether the email has an account, and
          // sends a LINK (not a code) that often lands in Spam.
          infoEl.textContent = '📧 ' + t('auth.resetSentDetail').replace('{email}', email);
          infoEl.hidden = false;
        } catch (e) {
          showErr(mapAuthError(e));
        } finally {
          forgot.disabled = false;
        }
      });
    }

    const firstInput = wrap.querySelector(isSignUp ? '#authName' : '#authEmail');
    if (firstInput) firstInput.focus();
  }

  function mapAuthError(e) {
    const code = (e && e.code) || '';
    const t = I18N.t;
    if (code === 'auth/invalid-email') return t('auth.errInvalidEmail');
    if (code === 'auth/email-already-in-use') return t('auth.errEmailInUse');
    if (code === 'auth/weak-password') return t('auth.errShortPassword');
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password'
        || code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') {
      return t('auth.errWrongCredentials');
    }
    if (code === 'auth/too-many-requests') return t('auth.errTooMany');
    if (code === 'auth/network-request-failed') return t('auth.errNetwork');
    return (e && e.message) || t('auth.errGeneric');
  }

  // ================== Local profile picker (offline fallback) ==================
  function renderLocal(container) {
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

    const newCard = document.createElement('div');
    newCard.className = 'profile-card new';
    newCard.innerHTML = `
      <div class="avatar">➕</div>
      <div class="name">${t('profile.createNew')}</div>
    `;
    newCard.addEventListener('click', () => renderLocalForm(container));
    list.appendChild(newCard);
  }

  function renderLocalForm(container) {
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
        b.addEventListener('click', () => { selectedAvatar = a; paintAvatar(); });
        picker.appendChild(b);
      });
    }
    paintAvatar();

    wrap.querySelector('#cancelBtn').addEventListener('click', () => { wrap.innerHTML = ''; });
    wrap.querySelector('#saveBtn').addEventListener('click', () => {
      const name = wrap.querySelector('#newName').value.trim();
      if (!name) { alert(t('profile.emptyName')); return; }
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
