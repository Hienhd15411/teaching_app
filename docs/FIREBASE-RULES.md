# Firebase Realtime Database rules

Paste the whole block below into **Firebase Console → Realtime Database →
Rules** and Publish. It adds the tuition nodes (`/billing`, `/groups`,
`/billing_settings`) on top of the existing user/teacher rules.

Access summary:

- `/users/{uid}/profile/email` must equal the signed-in account's email and
  `updatedAt` / `createdAt` cannot be in the future, so a student cannot
  impersonate a classmate (e.g. to be picked as "the account to keep" when
  the teacher merges duplicates) or pin themselves to the top of the roster.

- `/users/{uid}` — student reads/writes own row; teachers read all.
- `/billing/{uid}` — student **reads own** (fee-reminder banner + attendance
  history); only teachers write. Students can never edit sessions or money.
- `/groups`, `/billing_settings` — teachers only.
- `/feature_flags/{uid}` — student reads own (gates the ✈️ Interview nav);
  only teachers write (toggle in the student detail modal).
- `/merges/{keepUid}/{oldUid}` — duplicate-account merges. Teachers write
  (Lớp học → "Có thể trùng tài khoản" → Giữ tài khoản này); the student reads
  own so the app can fold the old account's progress into the kept one.

```json
{
  "rules": {
    "users": {
      ".read": "auth != null && root.child('teachers').child(auth.uid).val() == true",
      "$uid": {
        ".read": "auth != null && (auth.uid == $uid || root.child('teachers').child(auth.uid).val() == true)",
        ".write": "auth != null && auth.uid == $uid",
        "profile": {
          "email": { ".validate": "newData.isString() && newData.val() == auth.token.email" },
          "name": { ".validate": "newData.isString() && newData.val().length <= 60" },
          "createdAt": { ".validate": "newData.isNumber() && newData.val() <= now" }
        },
        "updatedAt": { ".validate": "newData.isNumber() && newData.val() <= now + 60000" }
      }
    },
    "billing": {
      ".read": "auth != null && root.child('teachers').child(auth.uid).val() == true",
      ".write": "auth != null && root.child('teachers').child(auth.uid).val() == true",
      "$uid": {
        ".read": "auth != null && (auth.uid == $uid || root.child('teachers').child(auth.uid).val() == true)"
      }
    },
    "groups": {
      ".read": "auth != null && root.child('teachers').child(auth.uid).val() == true",
      ".write": "auth != null && root.child('teachers').child(auth.uid).val() == true"
    },
    "billing_settings": {
      ".read": "auth != null && root.child('teachers').child(auth.uid).val() == true",
      ".write": "auth != null && root.child('teachers').child(auth.uid).val() == true"
    },
    "feature_flags": {
      ".read": "auth != null && root.child('teachers').child(auth.uid).val() == true",
      ".write": "auth != null && root.child('teachers').child(auth.uid).val() == true",
      "$uid": {
        ".read": "auth != null && (auth.uid == $uid || root.child('teachers').child(auth.uid).val() == true)"
      }
    },
    "merges": {
      ".read": "auth != null && root.child('teachers').child(auth.uid).val() == true",
      ".write": "auth != null && root.child('teachers').child(auth.uid).val() == true",
      "$uid": {
        ".read": "auth != null && (auth.uid == $uid || root.child('teachers').child(auth.uid).val() == true)"
      }
    },
    "teachers": {
      ".read": "auth != null",
      ".write": false
    }
  }
}
```

Reminder: `/teachers/{teacherUid}: true` must already exist (set up when the
Class dashboard was built). The teacher uid is visible in Authentication →
Users.
