/* ── Morse sidetone: a clean CW note with soft edges (no clicks) ── */
(function () {
  'use strict';

  class MorseAudio {
    constructor() {
      this.ctx = null;
      this.osc = null;
      this.gain = null;
      this.frequency = 600;
      this.volume = 0.22;
      this.muted = false;
    }

    /** Browsers only allow audio after a real gesture, so this is called on first press. */
    ensure() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();

      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0;
      this.gain.connect(this.ctx.destination);

      this.osc = this.ctx.createOscillator();
      this.osc.type = 'sine';
      this.osc.frequency.value = this.frequency;
      this.osc.connect(this.gain);
      this.osc.start();
    }

    setFrequency(hz) {
      this.frequency = hz;
      if (this.osc) {
        this.osc.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.01);
      }
    }

    setMuted(muted) {
      this.muted = muted;
      if (muted) this.off();
    }

    /** 6 ms attack — long enough to kill the click, short enough to stay crisp. */
    on() {
      if (this.muted) return;
      this.ensure();
      if (!this.gain) return;
      const t = this.ctx.currentTime;
      this.gain.gain.cancelScheduledValues(t);
      this.gain.gain.setTargetAtTime(this.volume, t, 0.006);
    }

    off() {
      if (!this.gain) return;
      const t = this.ctx.currentTime;
      this.gain.gain.cancelScheduledValues(t);
      this.gain.gain.setTargetAtTime(0, t, 0.008);
    }

    /** Short confirmation blip used for letter/word boundaries. */
    blip(hz, ms) {
      if (this.muted) return;
      this.ensure();
      if (!this.ctx) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = hz;
      g.gain.value = 0;
      o.connect(g); g.connect(this.ctx.destination);
      const t = this.ctx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(this.volume * 0.35, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      o.start(t);
      o.stop(t + ms / 1000 + 0.02);
    }
  }

  window.MorseAudio = MorseAudio;
})();
