// ============================================================
// 7-day usage report — paste vào DevTools console
// Yêu cầu: đã login bằng email teacher (lemytrinh1801@gmail.com)
// và đang ở trang https://incredible-bavarois-3059ff.netlify.app
// ============================================================
(async () => {
  if (typeof firebase === 'undefined' || !firebase.auth) {
    console.error('Firebase chưa load. Mở trang app rồi paste lại.');
    return;
  }
  const u = firebase.auth().currentUser;
  if (!u) { console.error('Chưa login.'); return; }
  if (!(window.TEACHER_EMAILS || []).includes((u.email||'').toLowerCase())) {
    console.error('Tài khoản', u.email, 'không phải teacher.');
    return;
  }
  console.log('Đang query Firebase /users ...');
  const snap = await firebase.database().ref('users').once('value');
  const all = snap.val() || {};
  const uids = Object.keys(all);
  console.log('Total users in DB:', uids.length);

  // Last-7-day window (today inclusive)
  const today = new Date();
  const ymd = (d) => d.toISOString().slice(0, 10);
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    days.push(ymd(d));
  }
  const daySet = new Set(days);

  // Aggregates
  const perDay = {};                // date -> { sessions, users:Set, xp, correct, wrong }
  days.forEach(d => perDay[d] = { sessions:0, users:new Set(), xp:0, correct:0, wrong:0 });
  const perUser = {};               // uid -> { email, name, sessions, xp, lastDate }
  const perTopic = {};              // topicId -> sessions
  const perMode = {};               // mode -> sessions

  for (const uid of uids) {
    const rec = all[uid] || {};
    const prof = rec.profile || {};
    const prog = rec.progress || {};
    const history = Array.isArray(prog.history) ? prog.history : [];
    const inWindow = history.filter(h => h && daySet.has(h.date));
    if (!inWindow.length) continue;
    const u = perUser[uid] = perUser[uid] || {
      email: prof.email || '?', name: prof.name || '?',
      sessions: 0, xp: 0, correct: 0, wrong: 0, lastDate: ''
    };
    for (const h of inWindow) {
      perDay[h.date].sessions += 1;
      perDay[h.date].users.add(uid);
      perDay[h.date].xp += (h.xp || 0);
      perDay[h.date].correct += (h.correct || 0);
      perDay[h.date].wrong += (h.wrong || 0);
      u.sessions += 1; u.xp += (h.xp || 0);
      u.correct += (h.correct || 0); u.wrong += (h.wrong || 0);
      if (h.date > u.lastDate) u.lastDate = h.date;
      perTopic[h.topic] = (perTopic[h.topic] || 0) + 1;
      perMode[h.mode] = (perMode[h.mode] || 0) + 1;
    }
  }

  // Print summary
  console.log('\n=== 7-DAY USAGE REPORT ===');
  console.log('Window:', days[0], '→', days[6]);
  const totalSessions = Object.values(perDay).reduce((s,d)=>s+d.sessions,0);
  const activeUsers = new Set();
  Object.values(perDay).forEach(d => d.users.forEach(u => activeUsers.add(u)));
  console.log('Active users (7d):', activeUsers.size, '/', uids.length, 'total');
  console.log('Total sessions:', totalSessions);

  console.log('\n--- Per day ---');
  console.table(days.map(d => ({
    date: d, sessions: perDay[d].sessions, DAU: perDay[d].users.size,
    xp: perDay[d].xp, correct: perDay[d].correct, wrong: perDay[d].wrong,
  })));

  console.log('\n--- Top users (by sessions) ---');
  const userRows = Object.entries(perUser).map(([uid, u]) => ({
    name: u.name, email: u.email,
    sessions: u.sessions, xp: u.xp,
    accuracy: u.correct + u.wrong ? Math.round(u.correct*100/(u.correct+u.wrong)) + '%' : '-',
    lastActive: u.lastDate,
  })).sort((a,b)=>b.sessions-a.sessions);
  console.table(userRows);

  console.log('\n--- Top topics (by sessions) ---');
  console.table(Object.entries(perTopic).sort((a,b)=>b[1]-a[1]).slice(0,15)
    .map(([t,n]) => ({ topic: t, sessions: n })));

  console.log('\n--- Mode breakdown ---');
  console.table(Object.entries(perMode).map(([m,n]) => ({ mode: m, sessions: n })));

  // JSON dump for sending back
  const dump = {
    window: { from: days[0], to: days[6] },
    totalUsersInDB: uids.length,
    activeUsers7d: activeUsers.size,
    totalSessions,
    perDay: days.map(d => ({
      date: d, sessions: perDay[d].sessions, dau: perDay[d].users.size, xp: perDay[d].xp,
    })),
    topUsers: userRows.slice(0, 20),
    topTopics: Object.entries(perTopic).sort((a,b)=>b[1]-a[1]).slice(0,15),
    modeBreakdown: perMode,
  };
  console.log('\n--- JSON for sharing back ---');
  console.log(JSON.stringify(dump, null, 2));
  window.__usageReport = dump;
  console.log('(saved to window.__usageReport)');
})();
