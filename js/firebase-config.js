// ============================================================
// FIREBASE CONFIG
// ============================================================
// 1. Go to https://console.firebase.google.com → Add project (free).
// 2. Project Settings → General → Your apps → Web app (</>) → Register.
//    Copy the `firebaseConfig` values shown.
// 3. In the left menu: Authentication → Sign-in method → enable
//    "Anonymous".
// 4. In the left menu: Build → Realtime Database → Create database →
//    pick region → Start in "locked mode" → then Rules tab, paste:
//
//      {
//        "rules": {
//          ".read": "auth != null",
//          ".write": "auth != null"
//        }
//      }
//
//    Publish. (For a tighter setup, restrict per-user writes later.)
// 5. Paste the config below. The `databaseURL` is the critical one for
//    Realtime Database — if it's missing from the snippet shown on
//    Firebase console, grab it from: Build → Realtime Database → your
//    DB → top of page (e.g. https://xxxxx-default-rtdb.firebaseio.com).
//
// While the values are the defaults ("YOUR_...") the app runs in
// local-only mode — nothing is sent to any server.
(function (global) {
  'use strict';
  global.FIREBASE_CONFIG = {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_PROJECT.firebaseapp.com',
    databaseURL: 'https://YOUR_PROJECT-default-rtdb.firebaseio.com',
    projectId: 'YOUR_PROJECT',
    appId: 'YOUR_APP_ID',
  };
})(window);
