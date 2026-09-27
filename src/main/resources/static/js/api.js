/* ── Thin client over the Java endpoints. No Morse knowledge lives here. ── */
(function () {
  'use strict';

  async function post(path, body) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(path + ' -> HTTP ' + res.status);
    return res.json();
  }

  window.MorseApi = {
    encode: (text) => post('/api/encode', { text }),
    decode: (morse) => post('/api/decode', { morse }),
    key: (presses, wpm, trailingGapMs) =>
      post('/api/key', { presses, wpm, trailingGapMs: trailingGapMs || 0 }),
    playback: (opts) => post('/api/playback', {
      text: opts.text || null, morse: opts.morse || null, wpm: opts.wpm || 15
    }),
    alphabet: async (wpm) => {
      const res = await fetch('/api/alphabet?wpm=' + (wpm || 15));
      if (!res.ok) throw new Error('/api/alphabet -> HTTP ' + res.status);
      return res.json();
    }
  };
})();
