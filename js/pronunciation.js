(function (global) {
  'use strict';

  const SUPPORTED = typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && typeof window.SpeechSynthesisUtterance === 'function';

  // Pending listeners invoked once voices finish loading.
  const pendingVoiceCallbacks = [];
  let voicesLoaded = false;

  function getVoicesSafe() {
    if (!SUPPORTED) return [];
    try { return window.speechSynthesis.getVoices() || []; }
    catch (e) { return []; }
  }

  function pickVoice() {
    const voices = getVoicesSafe();
    if (!voices.length) return null;
    const byLang = (tag, local) => voices.find(
      (v) => v.lang === tag && (!local || v.localService)
    );
    return (
      byLang('en-US', true) || byLang('en-US') ||
      byLang('en-GB', true) || byLang('en-GB') ||
      voices.find((v) => (v.lang || '').toLowerCase().startsWith('en')) ||
      voices[0]
    );
  }

  function waitForVoices(cb) {
    if (getVoicesSafe().length) { voicesLoaded = true; cb(); return; }
    pendingVoiceCallbacks.push(cb);
    // safety net: try again after a short delay in case the event doesn't fire.
    setTimeout(() => {
      if (!voicesLoaded && getVoicesSafe().length) {
        voicesLoaded = true;
        flushPending();
      }
    }, 500);
  }

  function flushPending() {
    while (pendingVoiceCallbacks.length) {
      try { pendingVoiceCallbacks.shift()(); } catch (e) {}
    }
  }

  if (SUPPORTED) {
    // Prime the voices list and listen for when they load.
    getVoicesSafe();
    if (typeof window.speechSynthesis.addEventListener === 'function') {
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        voicesLoaded = true;
        flushPending();
      });
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        voicesLoaded = true;
        flushPending();
      };
    }
  }

  // Visual feedback: add/remove .speaking class on the triggering button while utterance runs.
  let activeBtn = null;
  function markSpeaking(btn, on) {
    if (!btn) return;
    btn.classList.toggle('speaking', !!on);
  }

  function doSpeak(text, opts, btn) {
    if (!SUPPORTED || !text) return false;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(String(text));
      const voice = pickVoice();
      if (voice) utter.voice = voice;
      utter.lang = (voice && voice.lang) || 'en-US';
      utter.rate = (opts && opts.rate) || 0.95;
      utter.pitch = (opts && opts.pitch) || 1;

      if (activeBtn && activeBtn !== btn) markSpeaking(activeBtn, false);
      activeBtn = btn || null;
      markSpeaking(activeBtn, true);

      utter.onend = () => { markSpeaking(activeBtn, false); activeBtn = null; };
      utter.onerror = () => { markSpeaking(activeBtn, false); activeBtn = null; };

      window.speechSynthesis.speak(utter);
      // Chrome quirk: sometimes paused after cancel(); force resume.
      try { window.speechSynthesis.resume(); } catch (e) {}
      return true;
    } catch (e) {
      return false;
    }
  }

  function speak(text, opts, btn) {
    if (!SUPPORTED || !text) return false;
    if (getVoicesSafe().length) return doSpeak(text, opts, btn);
    // Voices not ready yet — queue and speak once loaded.
    waitForVoices(() => doSpeak(text, opts, btn));
    return true;
  }

  function cancel() {
    if (SUPPORTED) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
      if (activeBtn) { markSpeaking(activeBtn, false); activeBtn = null; }
    }
  }

  function bindSpeakers(root) {
    if (!root) return;
    root.querySelectorAll('[data-speak]').forEach((btn) => {
      if (btn.dataset.speakBound === '1') return;
      btn.dataset.speakBound = '1';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        speak(btn.getAttribute('data-speak'), null, btn);
      });
    });
  }

  global.Pronunciation = { speak, cancel, bindSpeakers, supported: SUPPORTED };
})(window);
