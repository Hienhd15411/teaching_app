(function (global) {
  'use strict';

  const PROFILES_KEY = 'vlt_profiles';
  const ACTIVE_KEY = 'vlt_active_profile';
  const PROGRESS_PREFIX = 'vlt_progress_';

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getProfiles() {
    return readJSON(PROFILES_KEY, []);
  }

  function saveProfiles(list) {
    writeJSON(PROFILES_KEY, list);
  }

  function genId() {
    return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  }

  function createProfile(name, avatar) {
    const profiles = getProfiles();
    const profile = {
      id: genId(),
      name: name.trim().slice(0, 24),
      avatar: avatar || '🙂',
      createdAt: Date.now(),
    };
    profiles.push(profile);
    saveProfiles(profiles);
    return profile;
  }

  function deleteProfile(id) {
    const profiles = getProfiles().filter((p) => p.id !== id);
    saveProfiles(profiles);
    localStorage.removeItem(PROGRESS_PREFIX + id);
    if (getActiveProfileId() === id) {
      localStorage.removeItem(ACTIVE_KEY);
    }
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.enabled()
        && typeof FirebaseSync.deleteProfile === 'function') {
      FirebaseSync.deleteProfile(id);
    }
  }

  function getActiveProfileId() {
    return localStorage.getItem(ACTIVE_KEY);
  }

  function setActiveProfile(id) {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  }

  function getActiveProfile() {
    const id = getActiveProfileId();
    if (!id) return null;
    return getProfiles().find((p) => p.id === id) || null;
  }

  function emptyProgress() {
    return {
      xp: 0,
      level: 1,
      streak: 0,
      lastActiveDate: null,
      badges: [],
      perWord: {},
      perTopic: {},
      history: [],
    };
  }

  // Back-fill any keys missing from older schemas or hand-imported JSON so
  // downstream code (progress.js, srs.js) can rely on the full shape.
  function normalizeProgress(p) {
    const base = emptyProgress();
    if (!p || typeof p !== 'object') return base;
    if (typeof p.xp !== 'number') p.xp = base.xp;
    if (typeof p.level !== 'number') p.level = base.level;
    if (typeof p.streak !== 'number') p.streak = base.streak;
    if (!('lastActiveDate' in p)) p.lastActiveDate = base.lastActiveDate;
    if (!Array.isArray(p.badges)) p.badges = base.badges;
    if (!p.perWord || typeof p.perWord !== 'object') p.perWord = base.perWord;
    if (!p.perTopic || typeof p.perTopic !== 'object') p.perTopic = base.perTopic;
    if (!Array.isArray(p.history)) p.history = base.history;
    sanitizeKeys(p);
    return p;
  }

  // Firebase rejects keys containing . # $ [ ] / — rename any such word or
  // topic key (older data saved "…::fill out/in") so uploads succeed again.
  function sanitizeKeys(p) {
    ['perWord', 'perTopic'].forEach((field) => {
      const obj = p[field];
      if (!obj) return;
      Object.keys(obj).forEach((k) => {
        if (!/[.#$\[\]\/]/.test(k)) return;
        const nk = k.replace(/[.#$\[\]\/]/g, '_');
        if (!obj[nk]) obj[nk] = obj[k];
        delete obj[k];
      });
    });
    return p;
  }

  // Union-merge two progress objects (devices, cloud vs local, merged
  // accounts): every word keeps its best state, history is de-duplicated.
  function mergeProgress(a, b) {
    const out = emptyProgress();
    out.xp = Math.max(a.xp || 0, b.xp || 0);
    out.level = Math.max(a.level || 1, b.level || 1);
    out.streak = Math.max(a.streak || 0, b.streak || 0);
    out.lastActiveDate = [a.lastActiveDate, b.lastActiveDate].filter(Boolean).sort().pop() || null;
    out.badges = Array.from(new Set([].concat(a.badges || [], b.badges || [])));
    // Placement / roadmap / schedule: newest wins (roadmap keeps manual
    // ticks from both sides when it's the same roadmap).
    const newer = (x, y, key) => ((y && y[key]) || 0) > ((x && x[key]) || 0) ? y : x;
    out.placement = newer(a.placement, b.placement, 'takenAt') || undefined;
    // Per-track placements: newest per track.
    const pk = new Set([].concat(Object.keys(a.placements || {}), Object.keys(b.placements || {})));
    if (pk.size) {
      out.placements = {};
      pk.forEach((k) => { out.placements[k] = newer((a.placements || {})[k], (b.placements || {})[k], 'takenAt'); });
    }
    const rm = newer(a.roadmap, b.roadmap, 'createdAt');
    if (rm) {
      out.roadmap = JSON.parse(JSON.stringify(rm));
      if (a.roadmap && b.roadmap && a.roadmap.createdAt === b.roadmap.createdAt) {
        out.roadmap.manual = Object.assign({}, a.roadmap.manual || {}, b.roadmap.manual || {});
      }
    }
    out.schedule = newer(a.schedule, b.schedule, 'updatedAt') || undefined;
    if (out.placement === undefined) delete out.placement;
    if (out.schedule === undefined) delete out.schedule;
    // Account merges already applied (uid → merge timestamp), max per key.
    const mf = Object.assign({}, a.mergedFrom || {});
    Object.keys(b.mergedFrom || {}).forEach((k) => { mf[k] = Math.max(mf[k] || 0, b.mergedFrom[k] || 0); });
    if (Object.keys(mf).length) out.mergedFrom = mf;

    const wordKeys = new Set([].concat(Object.keys(a.perWord || {}), Object.keys(b.perWord || {})));
    wordKeys.forEach((k) => {
      const wa = (a.perWord || {})[k];
      const wb = (b.perWord || {})[k];
      if (!wa) { out.perWord[k] = wb; return; }
      if (!wb) { out.perWord[k] = wa; return; }
      out.perWord[k] = {
        box: Math.max(wa.box || 1, wb.box || 1),
        correct: Math.max(wa.correct || 0, wb.correct || 0),
        wrong: Math.max(wa.wrong || 0, wb.wrong || 0),
        lastReviewed: Math.max(wa.lastReviewed || 0, wb.lastReviewed || 0),
      };
    });

    const topicKeys = new Set([].concat(Object.keys(a.perTopic || {}), Object.keys(b.perTopic || {})));
    topicKeys.forEach((k) => {
      const ta = (a.perTopic || {})[k];
      const tb = (b.perTopic || {})[k];
      if (!ta) { out.perTopic[k] = tb; return; }
      if (!tb) { out.perTopic[k] = ta; return; }
      out.perTopic[k] = {
        attempts: Math.max(ta.attempts || 0, tb.attempts || 0),
        correct: Math.max(ta.correct || 0, tb.correct || 0),
        wrong: Math.max(ta.wrong || 0, tb.wrong || 0),
        lastPlayedAt: Math.max(ta.lastPlayedAt || 0, tb.lastPlayedAt || 0),
        lastTestedAt: Math.max(ta.lastTestedAt || 0, tb.lastTestedAt || 0),
      };
    });

    const seenTs = new Set();
    out.history = [].concat(a.history || [], b.history || [])
      .filter((h) => {
        if (!h || seenTs.has(h.ts)) return false;
        seenTs.add(h.ts);
        return true;
      })
      .sort((x, y) => (x.ts || 0) - (y.ts || 0))
      .slice(-300);

    return out;
  }

  function getProgress(profileId) {
    const id = profileId || getActiveProfileId();
    if (!id) return emptyProgress();
    return normalizeProgress(readJSON(PROGRESS_PREFIX + id, emptyProgress()));
  }

  // Local write only (used by the cloud sync after merging, to avoid a loop).
  function saveProgressLocal(progress, profileId) {
    const id = profileId || getActiveProfileId();
    if (!id) return;
    writeJSON(PROGRESS_PREFIX + id, progress);
  }

  function saveProgress(progress, profileId) {
    const id = profileId || getActiveProfileId();
    if (!id) return;
    writeJSON(PROGRESS_PREFIX + id, progress);
    // Fire-and-forget cloud sync; no-op if Firebase disabled.
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.enabled()) {
      FirebaseSync.scheduleProgressPush();
    }
  }

  function exportProfile(profileId) {
    const id = profileId || getActiveProfileId();
    if (!id) return null;
    const profile = getProfiles().find((p) => p.id === id);
    if (!profile) return null;
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile,
      progress: getProgress(id),
    };
  }

  function importProfile(data) {
    if (!data || !data.profile || !data.progress) throw new Error('Invalid data');
    const profiles = getProfiles();
    // Merge or create with new id to avoid collision
    const newProfile = Object.assign({}, data.profile, {
      id: genId(),
      name: (data.profile.name || 'Imported') + ' (imported)',
    });
    profiles.push(newProfile);
    saveProfiles(profiles);
    writeJSON(PROGRESS_PREFIX + newProfile.id, data.progress);
    return newProfile;
  }

  global.Storage = {
    getProfiles,
    createProfile,
    deleteProfile,
    getActiveProfileId,
    getActiveProfile,
    setActiveProfile,
    getProgress,
    saveProgress,
    saveProgressLocal,
    exportProfile,
    importProfile,
    emptyProgress,
    normalizeProgress,
    mergeProgress,
    sanitizeKeys,
  };
})(window);
