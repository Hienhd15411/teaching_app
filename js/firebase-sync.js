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
    // onAuthStateChanged fires before this function resumes; remember the
    // chosen name/avatar so the local profile isn't named after the email.
    pendingSignup = { email: String(email).toLowerCase().trim(), name: displayName, avatar: avatar, createdAt: Date.now() };
    const cred = await withTimeout(
      auth.createUserWithEmailAndPassword(email, password),
      8000,
      'Sign up'
    );
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
    const cred = await withTimeout(
      auth.signInWithEmailAndPassword(email, password),
      8000,
      'Sign in'
    );
    console.log('[FirebaseSync] signIn ok, uid:', cred.user.uid);
    return cred.user;
  }

  // Name/avatar typed on the sign-up form (consumed once by app.js).
  let pendingSignup = null;
  function takePendingSignup(email) {
    const p = pendingSignup;
    if (p && email && p.email === String(email).toLowerCase().trim()) { pendingSignup = null; return p; }
    return null;
  }

  async function signOut() {
    if (!enabled() || !auth) return;
    // Upload anything still waiting on the debounce before the user goes.
    if (pendingPush) {
      clearTimeout(pendingPush);
      pendingPush = null;
      try { await withTimeout(pushActiveProfile(), 4000, 'Final push'); } catch (e) {}
    }
    hydratedUid = null;
    await auth.signOut();
  }

  // Firebase sends a LINK (not a code) from noreply@<project>.firebaseapp.com.
  // With "email enumeration protection" on (default for new projects) this
  // resolves even when no account uses that email — the UI must say so.
  async function sendPasswordReset(email) {
    if (!enabled()) throw new Error('Firebase not configured');
    init();
    try { auth.languageCode = (typeof I18N !== 'undefined' && I18N.getLang() === 'en') ? 'en' : 'vi'; } catch (e) {}
    const canContinue = /^https?:$/.test(global.location && global.location.protocol);
    if (canContinue) {
      try {
        // "Continue" button on Firebase's reset page brings the student back here.
        await auth.sendPasswordResetEmail(email, { url: global.location.origin + '/' });
        return;
      } catch (e) {
        const code = (e && e.code) || '';
        // Domain not in Firebase Auth → Authorized domains: send without it.
        if (!/continue-uri|unauthorized-domain|argument-error/.test(code)) throw e;
      }
    }
    await auth.sendPasswordResetEmail(email);
  }

  // Student side: progress handed over from accounts the teacher merged
  // into this one (see js/accounts.js). Null when none / rules missing.
  async function pullMerges(uid) {
    const id = uid || (currentUser && currentUser.uid);
    if (!enabled() || !id) return null;
    try {
      const snap = await withTimeout(db.ref('merges/' + id).once('value'), 4000, 'Merges read');
      return snap.val();
    } catch (e) {
      return null;
    }
  }

  // --- Sync ---
  // Returns the cloud row, or null when the account has no row yet.
  // THROWS on timeout/permission errors: callers must not mistake a failed
  // read for an empty account (that used to let a fresh device overwrite
  // months of cloud progress).
  async function pullCurrentUser() {
    if (!enabled() || !currentUser) return null;
    const snap = await withTimeout(
      db.ref('users/' + currentUser.uid).once('value'),
      8000,
      'Database read'
    );
    return snap.val();
  }

  // Uploads stay blocked until app.js has merged the cloud copy into the
  // local one for this uid (markHydrated).
  let hydratedUid = null;
  function markHydrated(uid) {
    hydratedUid = uid;
    scheduleProgressPush();
  }
  function isHydrated() { return !!currentUser && hydratedUid === currentUser.uid; }

  let pendingPush = null;
  function scheduleProgressPush() {
    if (!enabled() || !currentUser) return;
    if (pendingPush) clearTimeout(pendingPush);
    pendingPush = setTimeout(() => {
      pendingPush = null;
      pushActiveProfile().catch(() => {});
    }, 1500);
  }

  // Read-merge-write: another device may have uploaded newer work since
  // this tab last synced, so the cloud copy is merged in (and saved
  // locally) before uploading. Never runs before the first successful pull.
  let pushing = false;
  async function pushActiveProfile() {
    if (!enabled() || !currentUser) return;
    if (!isHydrated()) return;
    if (pushing) { scheduleProgressPush(); return; }
    const uid = currentUser.uid;
    const profile = Storage.getActiveProfile();
    if (!profile || profile.id !== uid) return;
    pushing = true;
    try {
      const snap = await withTimeout(db.ref('users/' + uid).once('value'), 8000, 'Pre-push read');
      if (!currentUser || currentUser.uid !== uid) return; // signed out meanwhile
      const cloud = snap.val() || {};
      const local = Storage.getProgress(uid);
      const merged = cloud.progress
        ? Storage.mergeProgress(local, Storage.normalizeProgress(cloud.progress))
        : local;
      Storage.saveProgressLocal(merged, uid);
      const cloudProfile = cloud.profile || {};
      const createdAt = Math.min(profile.createdAt || Infinity, cloudProfile.createdAt || Infinity);
      const update = {
        'profile/id': uid,
        'profile/name': profile.name || cloudProfile.name || '',
        'profile/email': currentUser.email || '',
        'profile/avatar': profile.avatar || cloudProfile.avatar || '🙂',
        progress: merged,
        updatedAt: firebase.database.ServerValue.TIMESTAMP,
      };
      // Keep the ORIGINAL signup time (roster sorts by first login).
      if (createdAt !== Infinity) update['profile/createdAt'] = createdAt;
      await db.ref('users/' + uid).update(update);
    } catch (e) {
      console.warn('[FirebaseSync] push failed, will retry', e);
      if (pushRetry) clearTimeout(pushRetry);
      pushRetry = setTimeout(() => { pushRetry = null; scheduleProgressPush(); }, 15000);
    } finally {
      pushing = false;
    }
  }
  let pushRetry = null;

  // --- Teacher read ---
  async function listAllStudents() {
    if (!enabled() || !currentUser) {
      console.log('[FirebaseSync] listAllStudents: not signed in');
      return { students: [], error: 'not-signed-in' };
    }
    if (!isTeacher(currentUser)) {
      console.log('[FirebaseSync] listAllStudents: not a teacher (email=' + currentUser.email + ')');
      return { students: [], error: 'not-teacher' };
    }
    try {
      const snap = await withTimeout(
        db.ref('users').once('value'),
        6000,
        'Teacher list read'
      );
      const val = snap.val() || {};
      // Accounts merged into another one are hidden from every teacher view.
      let mergedAway = {};
      try {
        const m = (await withTimeout(db.ref('merges').once('value'), 4000, 'Merges read')).val() || {};
        Object.keys(m).forEach((keep) => Object.keys(m[keep] || {}).forEach((old) => { mergedAway[old] = keep; }));
      } catch (e) { mergedAway = {}; /* rules not updated yet → show everything */ }
      // Teacher and sales-demo accounts are not students: keep them out of
      // the roster, counts, billing and calendar.
      const demoEmails = (global.DEMO_ACCOUNTS || []).map((e) => String(e).toLowerCase().trim());
      const notStudent = (id) => {
        const em = String(((val[id] || {}).profile || {}).email || '').toLowerCase().trim();
        return !!em && (teacherEmails.indexOf(em) >= 0 || demoEmails.indexOf(em) >= 0);
      };
      const students = Object.keys(val).filter((id) => !mergedAway[id] && !notStudent(id)).map((id) => ({
        id,
        profile: val[id].profile || { id, name: id },
        progress: val[id].progress || Storage.emptyProgress(),
        updatedAt: val[id].updatedAt || 0,
      }));
      const hiddenCount = Object.keys(mergedAway).filter((id) => val[id]).length;
      console.log('[FirebaseSync] listAllStudents ok, ' + students.length + ' students (' + hiddenCount + ' merged)');
      return { students, error: null, mergedCount: hiddenCount };
    } catch (e) {
      console.warn('[FirebaseSync] list failed', e);
      const code = (e && (e.code || e.message)) || '';
      let kind = 'error';
      if (/permission/i.test(code) || /PERMISSION/i.test(code)) kind = 'permission-denied';
      else if (/timed out/i.test(code)) kind = 'timeout';
      return { students: [], error: kind, raw: String(code) };
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
    pullMerges,
    pullCurrentUser,
    markHydrated,
    isHydrated,
    takePendingSignup,
    scheduleProgressPush,
    pushActiveProfile,
    listAllStudents,
    hasRealConfig,
    sdkLoaded,
    getDb: function () { return db; },
  };

  if (enabled()) init();
})(window);
