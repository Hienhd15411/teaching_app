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
  let preferredGender = 'auto';
  try {
    const saved = localStorage.getItem(GENDER_KEY);
    if (saved === 'female' || saved === 'male' || saved === 'auto') preferredGender = saved;
  } catch (e) {}

  function getGender() { return preferredGender; }
  function setGender(g) {
    if (g !== 'auto' && g !== 'female' && g !== 'male') return;
    preferredGender = g;
    try { localStorage.setItem(GENDER_KEY, g); } catch (e) {}
  }

  function getVoices() {
    if (!SUPPORTED) return [];
    try { return window.speechSynthesis.getVoices() || []; }
    catch (e) { return []; }
  }

  function pickEnglishVoice() {
    const voices = getVoices();
    if (!voices.length) return null;
    const enLocal = voices.filter((v) => v.localService && (v.lang || '').toLowerCase().startsWith('en'));
    const matchGender = (list) => {
      if (preferredGender === 'auto') return null;
      const g = list.filter((v) => detectGender(v) === preferredGender);
      if (!g.length) return null;
      return g.find((v) => v.lang === 'en-US') || g.find((v) => v.lang === 'en-GB') || g[0];
    };

    // 1. Try gender-matched local English voice first.
    const genderedLocal = matchGender(enLocal);
    if (genderedLocal) return genderedLocal;

    // 2. Fall back to any local English voice.
    const anyLocal =
      enLocal.find((v) => v.lang === 'en-US') ||
      enLocal.find((v) => v.lang === 'en-GB') ||
      enLocal[0];
    if (anyLocal) return anyLocal;

    // 3. Last resort — non-local voices, prefer en-US, exclude flaky cloud voices when possible.
    const anyEn = voices.filter((v) => (v.lang || '').toLowerCase().startsWith('en'));
    const genderedAny = matchGender(anyEn);
    if (genderedAny) return genderedAny;
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

  global.Pronunciation = {
    speak, cancel, bindSpeakers,
    supported: SUPPORTED,
    getGender, setGender,
    listEnglishVoicesByGender,
  };
})(window);
