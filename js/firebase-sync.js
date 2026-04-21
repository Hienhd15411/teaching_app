(function (global) {
  'use strict';

  // Thin wrapper around Firebase Realtime Database for class-wide sync.
  //
  // Design:
  //   - localStorage remains the source of truth (offline-first).
  //   - Every saveProgress debounces a push to /users/{profileId}.
  //   - Each entry: { profile: {name, avatar, createdAt}, progress, updatedAt }.
  //   - Teacher dashboard reads /users once per open.
  //
  // The module no-ops if FIREBASE_CONFIG still has placeholder values or
  // the Firebase SDK didn't load. Callers can check `FirebaseSync.enabled`.

  const cfg = global.FIREBASE_CONFIG || {};
  const hasRealConfig = cfg.apiKey
    && cfg.apiKey !== 'YOUR_API_KEY'
    && cfg.databaseURL
    && cfg.databaseURL.indexOf('YOUR_PROJECT') === -1;
  const sdkLoaded = typeof global.firebase !== 'undefined'
    && typeof global.firebase.initializeApp === 'function';

  let app = null;
  let db = null;
  let auth = null;
  let ready = false;
  let readyListeners = [];

  function enabled() { return hasRealConfig && sdkLoaded; }

  async function init() {
    if (!enabled()) return false;
    if (app) return ready;
    try {
      app = firebase.initializeApp(cfg);
      auth = firebase.auth();
      db = firebase.database();
      await auth.signInAnonymously();
      ready = true;
      readyListeners.forEach((fn) => { try { fn(); } catch (e) {} });
      readyListeners = [];
      return true;
    } catch (e) {
      console.warn('[FirebaseSync] init failed', e);
      return false;
    }
  }

  function whenReady(fn) {
    if (ready) { fn(); return; }
    readyListeners.push(fn);
  }

  // --- Push helpers (fire-and-forget) ---

  let pendingPush = null;
  function scheduleProgressPush() {
    if (!enabled()) return;
    if (pendingPush) clearTimeout(pendingPush);
    pendingPush = setTimeout(() => {
      pendingPush = null;
      pushActiveProfile().catch(() => {});
    }, 1500);
  }

  async function pushActiveProfile() {
    if (!enabled()) return;
    await init();
    if (!ready) return;
    const profile = Storage.getActiveProfile();
    if (!profile) return;
    const progress = Storage.getProgress(profile.id);
    const payload = {
      profile: {
        id: profile.id,
        name: profile.name,
        avatar: profile.avatar || '🙂',
        createdAt: profile.createdAt || Date.now(),
      },
      progress: progress,
      updatedAt: firebase.database.ServerValue.TIMESTAMP,
    };
    try {
      await db.ref('users/' + profile.id).set(payload);
    } catch (e) {
      console.warn('[FirebaseSync] push failed', e);
    }
  }

  async function deleteProfile(profileId) {
    if (!enabled()) return;
    await init();
    if (!ready) return;
    try { await db.ref('users/' + profileId).remove(); }
    catch (e) { console.warn('[FirebaseSync] delete failed', e); }
  }

  // --- Read helpers (for teacher dashboard) ---

  async function listAllStudents() {
    if (!enabled()) return [];
    await init();
    if (!ready) return [];
    try {
      const snap = await db.ref('users').once('value');
      const val = snap.val() || {};
      return Object.keys(val).map((id) => ({
        id,
        profile: val[id].profile || { id, name: id },
        progress: val[id].progress || Storage.emptyProgress(),
        updatedAt: val[id].updatedAt || 0,
      }));
    } catch (e) {
      console.warn('[FirebaseSync] list failed', e);
      return [];
    }
  }

  global.FirebaseSync = {
    init,
    whenReady,
    enabled,
    scheduleProgressPush,
    pushActiveProfile,
    deleteProfile,
    listAllStudents,
    hasRealConfig: hasRealConfig,
    sdkLoaded: sdkLoaded,
  };

  // Auto-init on load if config is real.
  if (enabled()) {
    init();
  }
})(window);
