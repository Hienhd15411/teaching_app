(function (global) {
  'use strict';

  const SUPPORTED = typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && typeof window.SpeechSynthesisUtterance === 'function';

  let cachedVoice = null;
  let voicesReady = false;

  function pickVoice() {
    if (!SUPPORTED) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    // Prefer en-US / en-GB native voices, then any en-*.
    const prefer = (tag) => voices.find((v) => v.lang === tag && v.localService)
      || voices.find((v) => v.lang === tag);
    return (
      prefer('en-US') ||
      prefer('en-GB') ||
      voices.find((v) => (v.lang || '').toLowerCase().startsWith('en')) ||
      voices[0]
    );
  }

  function ensureVoice() {
    if (cachedVoice || voicesReady) return cachedVoice;
    cachedVoice = pickVoice();
    if (!cachedVoice && SUPPORTED) {
      // Voices may load asynchronously; listen once.
      window.speechSynthesis.onvoiceschanged = () => {
        cachedVoice = pickVoice();
        voicesReady = true;
      };
    } else {
      voicesReady = true;
    }
    return cachedVoice;
  }

  function speak(text, opts) {
    if (!SUPPORTED || !text) return false;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(String(text));
      const voice = ensureVoice();
      if (voice) utter.voice = voice;
      utter.lang = (voice && voice.lang) || 'en-US';
      utter.rate = (opts && opts.rate) || 0.95;
      utter.pitch = (opts && opts.pitch) || 1;
      window.speechSynthesis.speak(utter);
      return true;
    } catch (e) {
      return false;
    }
  }

  function cancel() {
    if (SUPPORTED) window.speechSynthesis.cancel();
  }

  // Convenience: wire up click-to-speak for buttons with [data-speak] attr.
  function bindSpeakers(root) {
    if (!root) return;
    root.querySelectorAll('[data-speak]').forEach((btn) => {
      if (btn.dataset.speakBound === '1') return;
      btn.dataset.speakBound = '1';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        speak(btn.getAttribute('data-speak'));
      });
    });
  }

  if (SUPPORTED) {
    // Kick off voice loading.
    try { window.speechSynthesis.getVoices(); } catch (e) {}
  }

  global.Pronunciation = { speak, cancel, bindSpeakers, supported: SUPPORTED };
})(window);
