/* ──────────────────────────────────────────────────────────────
   The physical instrument: press physics, spark, lamp, meters,
   and self-playback. It measures milliseconds and draws things.
   It never decides what a dot or a dash means - Java does that.
   ────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  class Instrument {
    constructor(opts) {
      this.audio = opts.audio;
      this.tape = opts.tape;
      this.onPress = opts.onPress || function () {};
      this.onPressStart = opts.onPressStart || function () {};
      this.onBoundary = opts.onBoundary || function () {};   // 'letter' | 'word'
      this.onPlayEnd = opts.onPlayEnd || function () {};
      this.onPlayStep = opts.onPlayStep || function () {};

      this.stage = document.getElementById('benchStage');
      this.keySvg = document.getElementById('straightKey');
      this.paddleSvg = document.getElementById('dualPaddle');
      this.lever = document.getElementById('keyLever');
      this.ripplesKey = document.getElementById('keyRipples');
      this.ripplesPaddle = document.getElementById('paddleRipples');

      this.meter = document.getElementById('holdMeter');
      this.meterFill = document.getElementById('meterFill');
      this.meterMs = document.getElementById('meterMs');
      this.meterTitle = document.getElementById('meterTitle');
      this.markDash = document.getElementById('markDash');
      this.markLetter = document.getElementById('markLetter');
      this.markWord = document.getElementById('markWord');

      this.mode = 'key';
      this.timing = { unitMs: 80, dashThresholdMs: 160, letterGapMs: 160, wordGapMs: 400 };

      this.down = false;
      this.pressStartedAt = 0;
      this.lastReleaseAt = 0;
      this.hasPressed = false;
      this.activePaddle = null;
      this.playing = false;
      this.playTimer = null;
      this.playDone = null;
      this.letterTimer = null;   // fires when the silence has ended the letter
      this.wordTimer = null;

      this.bindKey();
      this.bindPaddles();
      this.loopMeter();
    }

    /* ── instrument selection ── */
    setMode(mode) {
      this.mode = mode;
      this.keySvg.classList.toggle('is-hidden', mode !== 'key');
      this.paddleSvg.classList.toggle('is-hidden', mode !== 'paddle');
      this.release(true);
    }

    setTiming(t) {
      if (!t) return;
      this.timing = {
        unitMs: t.unitMs || this.timing.unitMs,
        dashThresholdMs: t.dashThresholdMs || this.timing.dashThresholdMs,
        letterGapMs: t.letterGapMs || this.timing.letterGapMs,
        wordGapMs: t.wordGapMs || this.timing.wordGapMs
      };
      this.layoutMarks();
    }

    /* ── event wiring ── */
    bindKey() {
      const start = (e) => {
        if (this.playing) return;
        e.preventDefault();
        this.press(null);
      };
      this.lever.addEventListener('pointerdown', start);
      this.lever.addEventListener('contextmenu', (e) => e.preventDefault());
      // release anywhere - dragging off the knob still opens the contact
      window.addEventListener('pointerup', () => this.release());
      window.addEventListener('pointercancel', () => this.release());
      window.addEventListener('blur', () => this.release());
    }

    bindPaddles() {
      ['paddleDot', 'paddleDash'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('pointerdown', (e) => {
          if (this.playing) return;
          e.preventDefault();
          this.activePaddle = el;
          this.press(el.dataset.symbol);
        });
      });
    }

    /* ── the press itself ── */
    press(forced) {
      if (this.down) return;
      this.clearBoundaryTimers();
      this.down = true;
      this.pressStartedAt = performance.now();

      this.stage.classList.add('is-down', 'is-keyed');
      if (this.activePaddle) this.activePaddle.classList.add('is-down');

      this.audio.on();
      this.tape.setLevel(true);
      this.ripple();
      this.meter.classList.remove('is-gap');
      this.meter.classList.add('is-hold');
      this.onPressStart();
    }

    release(silent) {
      if (!this.down) return;
      const now = performance.now();
      const durationMs = Math.round(now - this.pressStartedAt);
      const gapBeforeMs = this.hasPressed ? Math.round(this.pressStartedAt - this.lastReleaseAt) : 0;

      this.down = false;
      this.lastReleaseAt = now;
      this.hasPressed = true;

      this.stage.classList.remove('is-down', 'is-keyed');
      if (this.activePaddle) this.activePaddle.classList.remove('is-down');
      const forced = this.activePaddle ? this.activePaddle.dataset.symbol : null;
      this.activePaddle = null;

      this.audio.off();
      this.tape.setLevel(false);
      this.meter.classList.remove('is-hold');
      this.meter.classList.add('is-gap');

      if (!silent) {
        this.onPress({ durationMs, gapBeforeMs, forced });
        // A letter ends after a measured silence, whether or not the page is
        // animating - so these are timers, not animation-frame checks.
        this.letterTimer = setTimeout(
          () => this.onBoundary('letter', this.timing.letterGapMs), this.timing.letterGapMs);
        this.wordTimer = setTimeout(
          () => this.onBoundary('word', this.timing.wordGapMs), this.timing.wordGapMs);
      }
    }

    clearBoundaryTimers() {
      if (this.letterTimer) clearTimeout(this.letterTimer);
      if (this.wordTimer) clearTimeout(this.wordTimer);
      this.letterTimer = this.wordTimer = null;
    }

    /** Ring of energy leaving the contact. */
    ripple() {
      const host = this.mode === 'key' ? this.ripplesKey : this.ripplesPaddle;
      if (!host) return;
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('r', '6');
      host.appendChild(c);
      setTimeout(() => c.remove(), 950);
    }

    /* ── the hold / gap meter ── */
    layoutMarks() {
      const holdSpan = this.meterSpan('hold');
      const gapSpan = this.meterSpan('gap');
      this.markDash.style.left = pct(this.timing.dashThresholdMs / holdSpan);
      this.markLetter.style.left = pct(this.timing.letterGapMs / gapSpan);
      this.markWord.style.left = pct(this.timing.wordGapMs / gapSpan);
    }

    meterSpan(kind) {
      return kind === 'hold'
        ? Math.max(120, this.timing.dashThresholdMs * 2.4)
        : Math.max(240, this.timing.wordGapMs * 1.5);
    }

    loopMeter() {
      const tick = () => {
        const now = performance.now();
        if (this.down) {
          const held = now - this.pressStartedAt;
          this.meterTitle.textContent = held >= this.timing.dashThresholdMs ? 'HOLD — DASH' : 'HOLD — DOT';
          this.paintMeter(held, this.meterSpan('hold'));
        } else if (this.hasPressed) {
          const gap = now - this.lastReleaseAt;
          const span = this.meterSpan('gap');
          if (gap <= span * 1.05) {
            this.meterTitle.textContent = gap >= this.timing.wordGapMs ? 'GAP — NEW WORD'
              : gap >= this.timing.letterGapMs ? 'GAP — LETTER ENDS' : 'GAP — SAME LETTER';
            this.paintMeter(gap, span);
          }
          // tell the app when a boundary is crossed so it can settle the letter
          if (gap >= this.timing.wordGapMs && this.announced !== 'word') {
            this.announced = 'word';
            this.onBoundary('word', gap);
          } else if (gap >= this.timing.letterGapMs && !this.announced) {
            this.announced = 'letter';
            this.onBoundary('letter', gap);
          }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    paintMeter(ms, span) {
      this.meterFill.style.width = pct(Math.min(1, ms / span));
      this.meterMs.textContent = Math.round(ms);
    }

    /* ── self-playback: the instrument taps a message on its own ── */
    play(timeline, onDone) {
      this.stop();
      if (!timeline || !timeline.length) { onDone && onDone(); return; }
      this.playing = true;
      this.playDone = onDone || null;

      let i = 0;
      const startedAt = performance.now();
      let cursor = 0;   // scheduled position in the timeline, in ms

      const step = () => {
        if (!this.playing) return;
        if (i >= timeline.length) {
          this.finishPlayback();
          return;
        }
        const tone = timeline[i];
        this.playVisual(tone.on);
        this.onPlayStep(i, tone);
        if (tone.on) this.ripple();

        cursor += tone.ms;
        i++;
        // correct for timer drift so long messages stay in rhythm
        const delay = Math.max(0, cursor - (performance.now() - startedAt));
        this.playTimer = setTimeout(step, delay);
      };
      step();
    }

    playVisual(on) {
      if (on) {
        this.stage.classList.add('is-down', 'is-keyed');
        this.audio.on();
        this.tape.setLevel(true);
      } else {
        this.stage.classList.remove('is-down', 'is-keyed');
        this.audio.off();
        this.tape.setLevel(false);
      }
    }

    stop() {
      this.clearBoundaryTimers();
      if (this.playTimer) clearTimeout(this.playTimer);
      this.playTimer = null;
      if (this.playing) {
        this.finishPlayback();
      }
    }

    /** One exit path for playback, whether it ran out or was stopped by hand,
        so the caller's clean-up always runs. */
    finishPlayback() {
      this.playing = false;
      this.playVisual(false);
      this.onPlayEnd();
      const done = this.playDone;
      this.playDone = null;
      if (done) done();
    }

    resetStream() {
      this.clearBoundaryTimers();
      this.hasPressed = false;
      this.lastReleaseAt = 0;
      this.meterFill.style.width = '0%';
      this.meterMs.textContent = '0';
      this.meterTitle.textContent = 'HOLD';
      this.meter.classList.remove('is-gap');
      this.meter.classList.add('is-hold');
      this.tape.reset();
    }
  }

  function pct(ratio) {
    return (Math.max(0, Math.min(1, ratio)) * 100).toFixed(2) + '%';
  }

  window.Instrument = Instrument;
})();
