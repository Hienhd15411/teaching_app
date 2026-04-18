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

  function getProgress(profileId) {
    const id = profileId || getActiveProfileId();
    if (!id) return emptyProgress();
    return readJSON(PROGRESS_PREFIX + id, emptyProgress());
  }

  function saveProgress(progress, profileId) {
    const id = profileId || getActiveProfileId();
    if (!id) return;
    writeJSON(PROGRESS_PREFIX + id, progress);
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
    exportProfile,
    importProfile,
    emptyProgress,
  };
})(window);
