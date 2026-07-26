# Firebase Realtime Database rules

Paste the whole block below into **Firebase Console → Realtime Database →
Rules** and Publish. It adds the tuition nodes (`/billing`, `/groups`,
`/billing_settings`) on top of the existing user/teacher rules.

Access summary:

- `/users/{uid}` — student reads/writes own row; teachers read all.
- `/billing/{uid}` — student **reads own** (fee-reminder banner + attendance
  history); only teachers write. Students can never edit sessions or money.
- `/groups`, `/billing_settings` — teachers only.

```json
{
  "rules": {
    "users": {
      ".read": "auth != null && root.child('teachers').child(auth.uid).val() == true",
      "$uid": {
        ".read": "auth != null && (auth.uid == $uid || root.child('teachers').child(auth.uid).val() == true)",
        ".write": "auth != null && auth.uid == $uid"
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
