(function (global) {
  'use strict';

  // Firebase Realtime Database + Email/Password Auth.
  //
  //   /users/{uid} = { profile, progress, updatedAt }
  //
  // Each student signs up with email/password → Firebase assigns a
  // stable uid. We use that uid as the profile id locally so the
  // local cache and cloud row match up exactly.
  //
  // Teachers (email in TEACHER_EMAILS) see the Class dashboard,
  // which lists all students from /users.

  const cfg = global.FIREBASE_CONFIG || {};
  const teacherEmails = (global.TEACHER_EMAILS || []).map((e) => String(e).toLowerCase().trim());
  const hasRealConfig = cfg.apiKey
    && cfg.apiKey !== 'YOUR_API_KEY'
    && cfg.databaseURL
    && cfg.databaseURL.indexOf('YOUR_PROJECT') === -1;
  const sdkLoaded = typeof global.firebase !== 'undefined'
    && typeof global.firebase.initializeApp === 'function';

  let app = null;
  let db = null;
  let auth = null;
  let currentUser = null;
  let authListeners = [];

  function enabled() { return hasRealConfig && sdkLoaded; }

  function init() {
    if (!enabled() || app) return;
    try {
      app = firebase.initializeApp(cfg);
      auth = firebase.auth();
      db = firebase.database();
      auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
      auth.onAuthStateChanged((user) => {
        currentUser = user || null;
        authListeners.forEach((fn) => { try { fn(currentUser); } catch (e) {} });
      });
    } catch (e) {
      console.warn('[FirebaseSync] init failed', e);
    }
  }

  function onAuthChange(fn) { authListeners.push(fn); return () => {
    const i = authListeners.indexOf(fn);
    if (i >= 0) authListeners.splice(i, 1);
  }; }

  function getCurrentUser() { return currentUser; }

  function isTeacher(emailOrUser) {
    const email = (emailOrUser && emailOrUser.email) || emailOrUser;
    if (!email) return false;
    return teacherEmails.indexOf(String(email).toLowerCase().trim()) >= 0;
  }

  function withTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(
        () => reject(new Error(label + ' timed out after ' + ms + 'ms')),
        ms
      )),
    ]);
  }

  // --- Auth ---
  async function signUp(email, password, displayName, avatar) {
    if (!enabled()) throw new Error('Firebase not configured');
    init();
    console.log('[FirebaseSync] signUp:', email);
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    const user = cred.user;
    console.log('[FirebaseSync] auth created, uid:', user.uid, '— seeding DB row...');
    const profile = {
      id: user.uid,
      name: displayName || (email.split('@')[0]),
      email: user.email,
      avatar: avatar || '🙂',
      createdAt: Date.now(),
    };
    try {
      await withTimeout(
        db.ref('users/' + user.uid).set({
          profile,
          progress: Storage.emptyProgress(),
          updatedAt: firebase.database.ServerValue.TIMESTAMP,
        }),
        4000,
        'Database write'
      );
      console.log('[FirebaseSync] DB seed OK');
    } catch (dbErr) {
      // Auth already succeeded — don't block sign-in. The onAuthChange
      // handler will try pullCurrentUser (also likely to fail), and
      // hydrateLocalFromCloud will fall back to creating a local profile.
      console.warn('[FirebaseSync] DB seed failed, continuing:', dbErr);
    }
    return user;
  }

  async function signIn(email, password) {
    if (!enabled()) throw new Error('Firebase not configured');
    init();
    console.log('[FirebaseSync] signIn:', email);
    const cred = await auth.signInWithEmailAndPassword(email, password);
    return cred.user;
  }

  async function signOut() {
    if (!enabled() || !auth) return;
    await auth.signOut();
  }

  async function sendPasswordReset(email) {
    if (!enabled()) throw new Error('Firebase not configured');
    init();
    await auth.sendPasswordResetEmail(email);
  }

  // --- Sync ---
  async function pullCurrentUser() {
    if (!enabled() || !currentUser) return null;
    try {
      const snap = await withTimeout(
        db.ref('users/' + currentUser.uid).once('value'),
        4000,
        'Database read'
      );
      return snap.val();
    } catch (e) {
      console.warn('[FirebaseSync] pull failed', e);
      return null;
    }
  }

  let pendingPush = null;
  function scheduleProgressPush() {
    if (!enabled() || !currentUser) return;
    if (pendingPush) clearTimeout(pendingPush);
    pendingPush = setTimeout(() => {
      pendingPush = null;
      pushActiveProfile().catch(() => {});
    }, 1500);
  }

  async function pushActiveProfile() {
    if (!enabled() || !currentUser) return;
    const profile = Storage.getActiveProfile();
    if (!profile || profile.id !== currentUser.uid) return;
    const progress = Storage.getProgress(profile.id);
    try {
      await db.ref('users/' + currentUser.uid).update({
        profile: {
          id: profile.id,
          name: profile.name,
          email: currentUser.email || '',
          avatar: profile.avatar || '🙂',
          createdAt: profile.createdAt || Date.now(),
        },
        progress: progress,
        updatedAt: firebase.database.ServerValue.TIMESTAMP,
      });
    } catch (e) {
      console.warn('[FirebaseSync] push failed', e);
    }
  }

  // --- Teacher read ---
  async function listAllStudents() {
    if (!enabled() || !currentUser) return [];
    if (!isTeacher(currentUser)) return [];
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
    enabled,
    init,
    onAuthChange,
    getCurrentUser,
    isTeacher,
    signUp,
    signIn,
    signOut,
    sendPasswordReset,
    pullCurrentUser,
    scheduleProgressPush,
    pushActiveProfile,
    listAllStudents,
    hasRealConfig,
    sdkLoaded,
  };

  if (enabled()) init();
})(window);
