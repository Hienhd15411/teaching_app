// ============================================================
// FIREBASE CONFIG
// ============================================================
// Values pasted from Firebase console, re-wrapped into the IIFE shape
// the app expects. Only databaseURL is still missing — grab it after
// creating the Realtime Database (Build → Realtime Database → Create).
//
// Remaining setup:
//   1. Firebase console → Build → Authentication → Sign-in method →
//      enable "Email/Password".
//   2. Firebase console → Build → Realtime Database → Create database →
//      region Singapore (asia-southeast1) → "Start in locked mode".
//      Copy the URL from the top of the page (e.g.
//      https://teaching-app-3959a-default-rtdb.asia-southeast1.firebasedatabase.app)
//      and paste it into databaseURL below.
//   3. Realtime Database → Rules tab → paste these rules and Publish:
//
//        {
//          "rules": {
//            "users": {
//              "$uid": {
//                ".read":  "auth != null && (auth.uid == $uid || root.child('teachers').child(auth.uid).val() == true)",
//                ".write": "auth != null && auth.uid == $uid"
//              }
//            },
//            "teachers": {
//              ".read": "auth != null",
//              ".write": false
//            }
//          }
//        }
//
//   4. Sign up in the app with the email you want to use as the teacher.
//   5. Firebase console → Authentication → Users → copy your UID.
//   6. Realtime Database → Data tab → add node:
//        teachers/{your-uid}: true
//   7. Add your email to TEACHER_EMAILS below so the Class tab shows up.

(function (global) {
  'use strict';

  global.FIREBASE_CONFIG = {
    apiKey: 'AIzaSyBwPovKwvCD49C-49hAlp1_TBzRIWkLLk8',
    authDomain: 'teaching-app-3959a.firebaseapp.com',
    // TODO: paste databaseURL after creating Realtime Database.
    // It looks like: https://teaching-app-3959a-default-rtdb.<region>.firebasedatabase.app
    databaseURL: 'https://teaching-app-3959a-default-rtdb.firebaseio.com',
    projectId: 'teaching-app-3959a',
    storageBucket: 'teaching-app-3959a.firebasestorage.app',
    messagingSenderId: '1055636163241',
    appId: '1:1055636163241:web:d5454d87d7e57dc06d37b8',
    measurementId: 'G-0Q61EHF9HE',
  };

  // Emails that get access to the Class dashboard. Usually just you.
  global.TEACHER_EMAILS = [
    // 'you@example.com',
  ];
})(window);
