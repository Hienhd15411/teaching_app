(function (global) {
  'use strict';

  const SUPPORTED = typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && typeof window.SpeechSynthesisUtterance === 'function';

  // Turn on to log every speak() call to the console (for diagnosing Chrome silence).
  const DEBUG = true;

  // Gender heuristic — Web Speech API doesn't expose voice gender, so we
  // match on common voice names across macOS, Windows, Android, and Chrome's
  // bundled voices.
  const FEMALE_HINTS = [
    'samantha', 'allison', 'ava', 'karen', 'moira', 'tessa', 'victoria',
    'susan', 'kathy', 'vicki', 'princess', 'female', 'zira', 'hazel',
    'heather', 'catherine', 'audrey', 'amelie', 'anna', 'serena', 'fiona',
    'veena', 'kate', 'siri (female', 'eva', 'helena', 'paulina',
  ];
  const MALE_HINTS = [
    'alex', 'daniel', 'fred', 'tom', 'aaron', 'reed', 'rishi', 'mark',
    'david', 'james', 'albert', 'bruce', 'oliver', 'george', 'arthur',
    'male', 'lee', 'ralph', 'magnus', 'oskar', 'siri (male',
  ];

  function detectGender(voice) {
    const name = (voice && voice.name || '').toLowerCase();
    if (!name) return null;
    if (FEMALE_HINTS.some((n) => name.includes(n))) return 'female';
    if (MALE_HINTS.some((n) => name.includes(n))) return 'male';
    return null;
  }

  // Persisted gender preference: 'auto' | 'female' | 'male'.
  const GENDER_KEY = 'vlt_voice_gender';
  const VOICE_NAME_KEY = 'vlt_voice_name';
  let preferredGender = 'auto';
  let preferredVoiceName = null;
  try {
    const saved = localStorage.getItem(GENDER_KEY);
    if (saved === 'female' || saved === 'male' || saved === 'auto') preferredGender = saved;
    preferredVoiceName = localStorage.getItem(VOICE_NAME_KEY) || null;
  } catch (e) {}

  function getGender() { return preferredGender; }
  function setGender(g) {
    if (g !== 'auto' && g !== 'female' && g !== 'male') return;
    preferredGender = g;
    try { localStorage.setItem(GENDER_KEY, g); } catch (e) {}
  }

  function getVoiceName() { return preferredVoiceName; }
  function setVoiceName(name) {
    preferredVoiceName = name || null;
    try {
      if (name) localStorage.setItem(VOICE_NAME_KEY, name);
      else localStorage.removeItem(VOICE_NAME_KEY);
    } catch (e) {}
  }

  // All English voices, decorated with metadata for the picker UI.
  function listEnglishVoices() {
    return getVoices()
      .filter((v) => (v.lang || '').toLowerCase().startsWith('en'))
      .map((v) => ({
        name: v.name,
        lang: v.lang,
        localService: v.localService,
        gender: detectGender(v),
        enhanced: /enhanced|premium|natural|neural/i.test(v.name || ''),
        lowQuality: /\b(alex|fred|bruce|junior|ralph|whisper|bahh|trinoids|zarvox|cellos|hysterical|bells|organ|boing|bubbles|deranged|pipe organ)\b/i.test(v.name || ''),
      }));
  }

  function getVoices() {
    if (!SUPPORTED) return [];
    try { return window.speechSynthesis.getVoices() || []; }
    catch (e) { return []; }
  }

  function pickEnglishVoice() {
    const voices = getVoices();
    if (!voices.length) return null;

    // 0. Explicit user pick wins over everything else.
    if (preferredVoiceName) {
      const pick = voices.find((v) => v.name === preferredVoiceName);
      if (pick) return pick;
    }

    const enLocal = voices.filter((v) => v.localService && (v.lang || '').toLowerCase().startsWith('en'));

    // Score a voice: higher = better. We tilt toward natural-sounding
    // modern voices and away from the robotic ones (Alex, Fred, Ralph,
    // Zarvox, Bahh, Whisper, Trinoids, etc.).
    const scoreVoice = (v) => {
      let s = 0;
      const n = (v.name || '').toLowerCase();
      if (/enhanced|premium|natural|neural/.test(n)) s += 20;
      if (v.lang === 'en-US') s += 4;
      else if (v.lang === 'en-GB') s += 3;
      else if ((v.lang || '').startsWith('en')) s += 1;
      // Newer, more natural voices
      if (/\b(tom|daniel|oliver|rishi|aaron|arthur|albert|ava|samantha|karen|victoria|tessa|susan|moira|siri)\b/.test(n)) s += 5;
      // Older / robotic voices to avoid
      if (/\b(alex|fred|bruce|junior|ralph|whisper|bahh|trinoids|zarvox|cellos|hysterical|bells|organ|boing|bubbles|deranged|good news|bad news|pipe organ|kathy|reed|princess)\b/.test(n)) s -= 15;
      return s;
    };

    const sortedGendered = (list, gender) => {
      const g = list.filter((v) => detectGender(v) === gender);
      if (!g.length) return null;
      g.sort((a, b) => scoreVoice(b) - scoreVoice(a));
      return g[0];
    };

    // 1. Gender-matched, best-scored local voice.
    if (preferredGender !== 'auto') {
      const matched = sortedGendered(enLocal, preferredGender);
      if (matched) return matched;
    }

    // 2. Best-scored local English voice.
    if (enLocal.length) {
      const sorted = enLocal.slice().sort((a, b) => scoreVoice(b) - scoreVoice(a));
      if (sorted[0]) return sorted[0];
    }

    // 3. Last resort — cloud voices (exclude Google on Chrome/Mac which tends to silently fail).
    const anyEn = voices.filter((v) => (v.lang || '').toLowerCase().startsWith('en'));
    if (preferredGender !== 'auto') {
      const matched = sortedGendered(anyEn, preferredGender);
      if (matched && !/google/i.test(matched.name || '')) return matched;
    }
    return (
      anyEn.find((v) => v.lang === 'en-US' && !/google/i.test(v.name || '')) ||
      anyEn.find((v) => !/google/i.test(v.name || '')) ||
      anyEn[0] ||
      null
    );
  }

  // Expose voice list grouped by detected gender so the UI can show counts.
  function listEnglishVoicesByGender() {
    const voices = getVoices();
    const out = { auto: voices.length, female: 0, male: 0, unknown: 0 };
    voices.forEach((v) => {
      if (!(v.lang || '').toLowerCase().startsWith('en')) return;
      const g = detectGender(v) || 'unknown';
      out[g] = (out[g] || 0) + 1;
    });
    return out;
  }

  if (SUPPORTED) {
    try { getVoices(); } catch (e) {}
    const ping = () => { /* warms the voice list */ getVoices(); };
    if (typeof window.speechSynthesis.addEventListener === 'function') {
      window.speechSynthesis.addEventListener('voiceschanged', ping);
    } else {
      window.speechSynthesis.onvoiceschanged = ping;
    }
  }

  function speak(text, opts, btn) {
    if (!SUPPORTED || !text) return false;

    try {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }

      const utter = new SpeechSynthesisUtterance(String(text));
      const voice = pickEnglishVoice();
      if (voice) utter.voice = voice;
      utter.lang = (voice && voice.lang) || 'en-US';
      utter.rate = (opts && opts.rate) || 0.95;
      utter.pitch = (opts && opts.pitch) || 1;
      utter.volume = 1;

      if (btn) {
        btn.classList.add('speaking');
        const clear = () => btn.classList.remove('speaking');
        utter.onend = clear;
        utter.onerror = (e) => {
          clear();
          if (DEBUG) console.warn('[Pronunciation] utterance error', e);
        };
      }

      if (DEBUG) {
        console.log('[Pronunciation] speak', {
          text: String(text),
          voice: voice ? voice.name + ' / ' + voice.lang + (voice.localService ? ' (local)' : ' (cloud)') : '(no voice set — default)',
          totalVoices: getVoices().length,
        });
      }

      window.speechSynthesis.speak(utter);
      return true;
    } catch (e) {
      if (DEBUG) console.warn('[Pronunciation] speak() threw', e);
      return false;
    }
  }

  function cancel() {
    if (SUPPORTED) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
  }

  function bindSpeakers(root) {
    if (!root) return;
    root.querySelectorAll('[data-speak]').forEach((btn) => {
      if (btn.dataset.speakBound === '1') return;
      btn.dataset.speakBound = '1';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        speak(btn.getAttribute('data-speak'), null, btn);
      });
    });
  }

  // Info about what voice will be used next. Useful for UI tooltips.
  function getCurrentVoiceInfo() {
    if (!SUPPORTED) return null;
    const v = pickEnglishVoice();
    if (!v) return null;
    const name = v.name || '';
    const lowQuality = /\b(alex|fred|bruce|junior|ralph|whisper|bahh|trinoids|zarvox|cellos|hysterical|bells|organ|boing|bubbles|deranged|pipe organ)\b/i.test(name);
    const enhanced = /enhanced|premium|natural|neural/i.test(name);
    return {
      name: v.name,
      lang: v.lang,
      gender: detectGender(v),
      localService: v.localService,
      lowQuality,
      enhanced,
    };
  }

  global.Pronunciation = {
    speak, cancel, bindSpeakers,
    supported: SUPPORTED,
    getGender, setGender,
    getVoiceName, setVoiceName,
    listEnglishVoices, listEnglishVoicesByGender,
    getCurrentVoiceInfo,
  };
})(window);
