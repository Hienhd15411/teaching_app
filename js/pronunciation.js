(function (global) {
  'use strict';

  const SUPPORTED = typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && typeof window.SpeechSynthesisUtterance === 'function';

  // Turn on to log every speak() call to the console (for diagnosing Chrome silence).
  const DEBUG = true;

  function getVoices() {
    if (!SUPPORTED) return [];
    try { return window.speechSynthesis.getVoices() || []; }
    catch (e) { return []; }
  }

  function pickEnglishVoice() {
    const voices = getVoices();
    if (!voices.length) return null;
    // Strict local-first. Chrome on Mac defaults to "Google US English" which is
    // a cloud voice — if Chrome can't reach Google's TTS server, the utterance
    // is silently dropped. Safari picks a local voice (Samantha) by default.
    return (
      voices.find((v) => v.localService && v.lang === 'en-US') ||
      voices.find((v) => v.localService && v.lang === 'en-GB') ||
      voices.find((v) => v.localService && (v.lang || '').toLowerCase().startsWith('en')) ||
      voices.find((v) => v.lang === 'en-US' && !/google/i.test(v.name || '')) ||
      voices.find((v) => (v.lang || '').toLowerCase().startsWith('en') && !/google/i.test(v.name || '')) ||
      voices.find((v) => (v.lang || '').toLowerCase().startsWith('en')) ||
      null
    );
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

  global.Pronunciation = { speak, cancel, bindSpeakers, supported: SUPPORTED };
})(window);
