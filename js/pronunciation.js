(function (global) {
  'use strict';

  const SUPPORTED = typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && typeof window.SpeechSynthesisUtterance === 'function';

  let cachedVoice = null;

  function pickVoice() {
    if (!SUPPORTED) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    // Strongly prefer a LOCAL English voice — Chrome-on-Mac sometimes
    // picks "Google US English" (cloud) which silently fails to speak
    // when the remote fetch is blocked or slow.
    const localEn = voices.filter(
      (v) => v.localService && (v.lang || '').toLowerCase().startsWith('en')
    );
    return (
      localEn.find((v) => v.lang === 'en-US') ||
      localEn.find((v) => v.lang === 'en-GB') ||
      localEn[0] ||
      voices.find((v) => v.lang === 'en-US') ||
      voices.find((v) => (v.lang || '').toLowerCase().startsWith('en')) ||
      voices[0]
    );
  }

  function refreshVoice() {
    cachedVoice = pickVoice();
  }

  if (SUPPORTED) {
    // Prime voice list; voices often load async on Chrome.
    try { window.speechSynthesis.getVoices(); } catch (e) {}
    refreshVoice();
    if (typeof window.speechSynthesis.addEventListener === 'function') {
      window.speechSynthesis.addEventListener('voiceschanged', refreshVoice);
    } else {
      window.speechSynthesis.onvoiceschanged = refreshVoice;
    }
  }

  function speak(text, opts, btn) {
    if (!SUPPORTED || !text) return false;
    try {
      // Chrome quirk: calling cancel() when nothing is speaking can leave
      // the engine in a broken state where subsequent speak() is silent.
      // Only cancel when there's actually something to cancel.
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }

      if (!cachedVoice) refreshVoice();

      const utter = new SpeechSynthesisUtterance(String(text));
      if (cachedVoice) utter.voice = cachedVoice;
      utter.lang = (cachedVoice && cachedVoice.lang) || 'en-US';
      utter.rate = (opts && opts.rate) || 0.95;
      utter.pitch = (opts && opts.pitch) || 1;
      utter.volume = 1;

      if (btn) {
        btn.classList.add('speaking');
        const clear = () => btn.classList.remove('speaking');
        utter.onend = clear;
        utter.onerror = clear;
      }

      window.speechSynthesis.speak(utter);
      return true;
    } catch (e) {
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

  global.Pronunciation = { speak, cancel, bindSpeakers, supported: SUPPORTED };
})(window);
