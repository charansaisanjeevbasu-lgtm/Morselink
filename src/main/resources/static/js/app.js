/* ──────────────────────────────────────────────────────────────
   Wiring: text boxes, instrument, meters and Java.
   Every translation on this page is an answer from the server.
   ────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const els = {
    english: $('english'), morse: $('morse'),
    englishCount: $('englishCount'), morseCount: $('morseCount'),
    englishBadge: $('englishBadge'), morseBadge: $('morseBadge'),
    wpm: $('wpm'), wpmValue: $('wpmValue'), unitValue: $('unitValue'),
    tone: $('tone'), toneValue: $('toneValue'), mute: $('mute'),
    status: $('status'), statusText: $('statusText'),
    ticker: $('ticker'), liveSymbols: $('liveSymbols'), liveLetter: $('liveLetter'),
    chartGrid: $('chartGrid'), benchHint: $('benchHint'), benchTitle: $('benchTitle'),
    swap: $('swap'), clearAll: $('clearAll'), flow: $('flow'),
    cardEnglish: document.querySelector('.card[data-side="english"]'),
    cardMorse: document.querySelector('.card[data-side="morse"]')
  };

  const audio = new window.MorseAudio();
  const tape = new window.Tape($('tape'));

  const state = {
    wpm: 15,
    presses: [],
    reading: null,
    source: 'key',        // 'english' | 'morse' | 'key'
    playing: false,
    chartCells: new Map()
  };

  /* ═════════ status + badges ═════════ */
  function status(text, isError) {
    els.statusText.textContent = text;
    els.status.classList.toggle('is-error', !!isError);
  }

  function setDirection(dir) {
    els.flow.querySelectorAll('.flow-line').forEach((line) => {
      line.classList.toggle('is-on', line.dataset.dir === dir);
    });
    els.cardEnglish.classList.toggle('is-active', dir === 'toMorse');
    els.cardMorse.classList.toggle('is-active', dir === 'toText');
  }

  function counts() {
    els.englishCount.textContent = els.english.value.length;
    els.morseCount.textContent = (els.morse.value.match(/[.\-]/g) || []).length;
  }

  function ping(card) {
    card.classList.remove('is-receiving');
    void card.offsetWidth;
    card.classList.add('is-receiving');
  }

  /* ═════════ ticker ═════════ */
  function tickerAdd(kind, text) {
    const chip = document.createElement('span');
    chip.className = 'sym ' + kind;
    chip.textContent = text;
    els.ticker.appendChild(chip);
    while (els.ticker.childElementCount > 140) els.ticker.firstElementChild.remove();
    els.ticker.scrollTop = els.ticker.scrollHeight;
    return chip;
  }

  function tickerClear() { els.ticker.innerHTML = ''; }

  function tickerFromMorse(morse) {
    tickerClear();
    const chips = [];
    for (const ch of morse) {
      if (ch === '.') chips.push(tickerAdd('dot', '·'));
      else if (ch === '-') chips.push(tickerAdd('dash', '—'));
      else if (ch === '/') tickerAdd('sep', '/');
      else if (ch === ' ') tickerAdd('sep', '·');
    }
    return chips;
  }

  /* ═════════ applying Java's verdict on the keyed stream ═════════ */
  function applyReading(reading) {
    state.reading = reading;
    instrument.setTiming(reading);

    els.morse.value = reading.morse;
    els.english.value = reading.text;
    counts();

    els.liveSymbols.textContent = reading.pendingSymbols || '—';
    const letter = reading.pendingChar || (reading.pendingSymbols ? '?' : '·');
    if (letter !== els.liveLetter.textContent) {
      els.liveLetter.textContent = letter;
      els.liveLetter.classList.remove('is-new');
      void els.liveLetter.offsetWidth;
      els.liveLetter.classList.add('is-new');
    }
    highlightChart(reading.pendingChar);

    els.unitValue.textContent = reading.unitMs;
    status('Java read ' + reading.symbolCount + ' symbol' + (reading.symbolCount === 1 ? '' : 's')
      + ' · dot ' + reading.unitMs + ' ms · dash over ' + reading.dashThresholdMs + ' ms');
  }

  async function refreshKeyStream(trailingGapMs) {
    try {
      const reading = await window.MorseApi.key(state.presses, state.wpm, trailingGapMs || 0);
      applyReading(reading);
    } catch (err) {
      status('Server unreachable — is the Java app running? (' + err.message + ')', true);
    }
  }

  /* ═════════ the instrument ═════════ */
  const instrument = new window.Instrument({
    audio: audio,
    tape: tape,
    onPressStart: () => {
      if (state.source !== 'key') {
        // the operator has taken over the key: start a fresh stream
        state.source = 'key';
        state.presses = [];
        tickerClear();
        els.english.value = '';
        els.morse.value = '';
        instrument.resetStream();
      }
      setDirection('toText');
    },
    onPress: (press) => {
      state.presses.push(press);
      refreshKeyStream(0).then(() => {
        const r = state.reading;
        if (r && r.lastSymbol) tickerAdd(r.lastSymbol === '.' ? 'dot' : 'dash',
          r.lastSymbol === '.' ? '·' : '—');
      });
    },
    onBoundary: (kind, gapMs) => {
      if (state.source !== 'key' || !state.presses.length) return;
      const settling = state.reading && state.reading.pendingChar;
      refreshKeyStream(gapMs).then(() => {
        if (settling) {
          tickerAdd('letter', settling);
          audio.blip(kind === 'word' ? 420 : 880, kind === 'word' ? 90 : 55);
          ping(els.cardEnglish);
        }
        if (kind === 'word') tickerAdd('sep', '/');
      });
    }
  });

  /* ═════════ typing: English → Morse (Java) ═════════ */
  let encodeTimer = null;
  els.english.addEventListener('input', () => {
    state.source = 'english';
    setDirection('toMorse');
    counts();
    clearTimeout(encodeTimer);
    encodeTimer = setTimeout(async () => {
      try {
        const res = await window.MorseApi.encode(els.english.value);
        els.morse.value = res.morse;
        counts();
        ping(els.cardMorse);
        if (res.unsupported) {
          els.englishBadge.textContent = 'skipped: ' + res.unsupported;
          els.englishBadge.className = 'badge bad';
          status('Encoded. Morse cannot carry these: ' + res.unsupported);
        } else {
          els.englishBadge.textContent = 'plain text';
          els.englishBadge.className = 'badge';
          status('Encoded by Java — ' + (res.morse.match(/[.\-]/g) || []).length + ' symbols.');
        }
      } catch (err) {
        status('Encode failed: ' + err.message, true);
      }
    }, 130);
  });

  /* ═════════ typing: Morse → English (Java) ═════════ */
  let decodeTimer = null;
  els.morse.addEventListener('input', () => {
    state.source = 'morse';
    setDirection('toText');
    counts();
    clearTimeout(decodeTimer);
    decodeTimer = setTimeout(async () => {
      try {
        const res = await window.MorseApi.decode(els.morse.value);
        els.english.value = res.text;
        counts();
        ping(els.cardEnglish);
        els.morseBadge.textContent = res.valid ? 'valid morse' : 'unknown pattern';
        els.morseBadge.className = 'badge ' + (res.valid ? 'ok' : 'bad');
        status(res.valid ? 'Decoded by Java.' : 'Decoded, but some groups are not real characters.');
      } catch (err) {
        status('Decode failed: ' + err.message, true);
      }
    }, 130);
  });

  /* ═════════ play back on the instrument ═════════ */
  async function playFrom(side, btn) {
    if (state.playing) { instrument.stop(); return; }

    const payload = side === 'morse'
      ? { morse: els.morse.value, wpm: state.wpm }
      : { text: els.english.value, wpm: state.wpm };
    if (!(payload.morse || payload.text || '').trim()) {
      status('Nothing to play — type something first.');
      return;
    }

    let plan;
    try {
      plan = await window.MorseApi.playback(payload);
    } catch (err) {
      status('Playback failed: ' + err.message, true);
      return;
    }
    if (!plan.timeline.length) { status('Nothing playable in that input.'); return; }

    els.morse.value = plan.morse;
    if (side === 'morse') {
      try { els.english.value = (await window.MorseApi.decode(plan.morse)).text; } catch (e) { /* keep */ }
    }
    counts();

    const chips = tickerFromMorse(plan.morse);
    let chipIndex = 0;

    state.playing = true;
    document.querySelectorAll('[data-play]').forEach((b) => {
      b.disabled = b !== btn;
    });
    btn.classList.add('is-playing');
    btn.querySelector('.lbl').textContent = 'Stop';
    setDirection(side === 'morse' ? 'toText' : 'toMorse');
    status('Transmitting ' + plan.morse.replace(/[^.\-]/g, '').length + ' symbols at '
      + plan.wpm + ' wpm (' + (plan.totalMs / 1000).toFixed(1) + ' s) — timeline built in Java.');

    instrument.onPlayStep = (i, tone) => {
      if (!tone.on) return;
      const chip = chips[chipIndex++];
      if (!chip) return;
      chips.forEach((c) => c.classList.remove('letter'));
      chip.classList.add('letter');
      chip.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      els.liveSymbols.textContent = tone.symbol === '.' ? '·' : '—';
    };

    instrument.play(plan.timeline, () => {
      state.playing = false;
      document.querySelectorAll('[data-play]').forEach((b) => { b.disabled = false; });
      btn.classList.remove('is-playing');
      btn.querySelector('.lbl').textContent = 'Play on instrument';
      chips.forEach((c) => c.classList.remove('letter'));
      instrument.onPlayStep = function () {};
      status('Transmission complete.');
    });
  }

  document.querySelectorAll('[data-play]').forEach((btn) => {
    btn.addEventListener('click', () => playFrom(btn.dataset.play, btn));
  });

  /* ═════════ copy / clear / swap ═════════ */
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const value = els[btn.dataset.copy].value;
      if (!value) { status('Nothing to copy.'); return; }
      try {
        await navigator.clipboard.writeText(value);
        const label = btn.querySelector('.lbl');
        btn.classList.add('is-copied');
        label.textContent = 'Copied';
        setTimeout(() => {
          btn.classList.remove('is-copied');
          label.textContent = 'Copy';
        }, 1100);
      } catch (err) {
        status('Clipboard blocked by the browser — select and copy manually.', true);
      }
    });
  });

  els.clearAll.addEventListener('click', () => {
    instrument.stop();
    state.presses = [];
    state.reading = null;
    state.source = 'key';
    els.english.value = '';
    els.morse.value = '';
    els.liveSymbols.textContent = '—';
    els.liveLetter.textContent = '·';
    els.englishBadge.textContent = 'plain text';
    els.englishBadge.className = 'badge';
    els.morseBadge.textContent = '· dot  — dash  / word';
    els.morseBadge.className = 'badge';
    tickerClear();
    highlightChart(null);
    instrument.resetStream();
    counts();
    setDirection(null);
    status('Cleared — tap the key, or start typing.');
  });

  els.swap.addEventListener('click', () => {
    const goToMorse = document.activeElement !== els.english;
    (goToMorse ? els.english : els.morse).focus();
    setDirection(goToMorse ? 'toMorse' : 'toText');
    status(goToMorse ? 'Direction: English → Morse.' : 'Direction: Morse → English.');
  });

  /* ═════════ instrument switch ═════════ */
  document.querySelectorAll('[data-instrument]').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-instrument]').forEach((c) => {
        const on = c === chip;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-selected', String(on));
      });
      const mode = chip.dataset.instrument;
      instrument.setMode(mode);
      els.benchTitle.textContent = mode === 'key' ? 'Telegraph Bench' : 'Keyer Bench';
      els.benchHint.innerHTML = mode === 'key'
        ? 'Press and <em>hold</em> the knob — a quick tap is a dot, a long hold is a dash. <em>Space</em> works too.'
        : 'Click the <em>red</em> paddle for a dot, the <em>blue</em> one for a dash. Arrow keys <em>←</em> / <em>→</em> work too.';
      status(mode === 'key' ? 'Straight key selected — timing decides the symbol.'
        : 'Dual paddle selected — the paddle states the symbol, pauses still split the letters.');
    });
  });

  /* ═════════ sliders ═════════ */
  let wpmTimer = null;
  els.wpm.addEventListener('input', () => {
    state.wpm = parseInt(els.wpm.value, 10);
    els.wpmValue.textContent = state.wpm;
    clearTimeout(wpmTimer);
    wpmTimer = setTimeout(loadTiming, 90);
  });

  els.tone.addEventListener('input', () => {
    const hz = parseInt(els.tone.value, 10);
    els.toneValue.textContent = hz;
    audio.setFrequency(hz);
  });

  els.mute.addEventListener('click', () => {
    const muted = els.mute.getAttribute('aria-pressed') === 'true' ? false : true;
    els.mute.setAttribute('aria-pressed', String(muted));
    els.mute.querySelector('.lbl').textContent = muted ? 'Sound off' : 'Sound on';
    audio.setMuted(muted);
  });

  /* ═════════ keyboard operators ═════════ */
  function typingInField(e) {
    const t = e.target;
    return t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT');
  }

  window.addEventListener('keydown', (e) => {
    if (typingInField(e) || state.playing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === 'Space' && instrument.mode === 'key') {
      e.preventDefault();
      if (!e.repeat) instrument.press(null);
    } else if (instrument.mode === 'paddle' && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
      e.preventDefault();
      if (e.repeat) return;
      const el = document.getElementById(e.code === 'ArrowLeft' ? 'paddleDot' : 'paddleDash');
      instrument.activePaddle = el;
      el.classList.add('is-down');
      instrument.press(el.dataset.symbol);
    }
  });

  window.addEventListener('keyup', (e) => {
    if (typingInField(e)) return;
    if (e.code === 'Space' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') instrument.release();
  });

  /* ═════════ alphabet chart + timing, both from Java ═════════ */
  function highlightChart(ch) {
    state.chartCells.forEach((cell) => cell.classList.remove('is-lit'));
    if (!ch) return;
    const cell = state.chartCells.get(ch);
    if (cell) cell.classList.add('is-lit');
  }

  async function loadTiming() {
    try {
      const data = await window.MorseApi.alphabet(state.wpm);
      els.unitValue.textContent = data.unitMs;
      instrument.setTiming(data);
      if (!state.chartCells.size) renderChart(data.chart);
    } catch (err) {
      status('Could not reach Java for timing: ' + err.message, true);
    }
  }

  function renderChart(chart) {
    const frag = document.createDocumentFragment();
    Object.keys(chart).forEach((ch) => {
      const cell = document.createElement('button');
      cell.className = 'chart-cell';
      cell.type = 'button';
      cell.innerHTML = '<b></b><span></span>';
      cell.querySelector('b').textContent = ch;
      cell.querySelector('span').textContent = chart[ch].replace(/\./g, '·').replace(/-/g, '—');
      cell.addEventListener('click', async () => {
        if (state.playing) return;
        try {
          const plan = await window.MorseApi.playback({ morse: chart[ch], wpm: state.wpm });
          highlightChart(ch);
          state.playing = true;
          instrument.play(plan.timeline, () => { state.playing = false; });
          status('Playing ' + ch + '  =  ' + chart[ch]);
        } catch (err) { status('Playback failed: ' + err.message, true); }
      });
      state.chartCells.set(ch, cell);
      frag.appendChild(cell);
    });
    els.chartGrid.appendChild(frag);
  }

  /* ═════════ go ═════════ */
  els.wpmValue.textContent = state.wpm;
  els.toneValue.textContent = els.tone.value;
  audio.setFrequency(parseInt(els.tone.value, 10));
  counts();
  loadTiming();
  status('Ready — tap the key, or start typing.');
})();
