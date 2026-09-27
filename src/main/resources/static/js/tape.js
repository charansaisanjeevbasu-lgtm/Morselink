/* ── Inker tape: the paper strip a real telegraph register would ink. ── */
(function () {
  'use strict';

  const WINDOW_MS = 4500;   // how much history the strip shows

  class Tape {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.edges = [];        // { t, level }  level 1 = key down
      this.level = 0;
      this.running = false;
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }

    resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = this.canvas.getBoundingClientRect();
      this.w = Math.max(320, rect.width || 900);
      this.h = rect.height || 76;
      this.canvas.width = this.w * dpr;
      this.canvas.height = this.h * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    start() {
      if (this.running) return;
      this.running = true;
      const loop = () => {
        if (!this.running) return;
        this.draw();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    setLevel(down) {
      const level = down ? 1 : 0;
      if (level === this.level) return;
      this.level = level;
      this.edges.push({ t: performance.now(), level });
      if (this.edges.length > 600) this.edges.splice(0, 200);
      this.start();
    }

    reset() {
      this.edges = [];
      this.level = 0;
    }

    draw() {
      const ctx = this.ctx;
      const now = performance.now();
      const from = now - WINDOW_MS;
      const w = this.w, h = this.h;
      const base = h - 18;
      const top = 14;

      ctx.clearRect(0, 0, w, h);

      // paper
      const paper = ctx.createLinearGradient(0, 0, 0, h);
      paper.addColorStop(0, '#0e1116');
      paper.addColorStop(1, '#090b0f');
      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, w, h);

      // one-second grid
      ctx.strokeStyle = 'rgba(255,255,255,.05)';
      ctx.lineWidth = 1;
      const firstTick = Math.ceil(from / 1000) * 1000;
      for (let t = firstTick; t <= now; t += 1000) {
        const x = ((t - from) / WINDOW_MS) * w;
        ctx.beginPath(); ctx.moveTo(x, top - 6); ctx.lineTo(x, base + 6); ctx.stroke();
      }

      // baseline
      ctx.strokeStyle = 'rgba(255,255,255,.10)';
      ctx.beginPath(); ctx.moveTo(0, base); ctx.lineTo(w, base); ctx.stroke();

      // ink the marks
      const xOf = (t) => ((Math.max(t, from) - from) / WINDOW_MS) * w;
      let level = this.levelAt(from);
      let cursor = from;

      ctx.shadowColor = 'rgba(255,180,60,.55)';
      for (let i = 0; i <= this.edges.length; i++) {
        const edge = this.edges[i];
        const segEnd = edge ? edge.t : now;
        if (segEnd > from && level === 1) {
          const x0 = xOf(cursor), x1 = xOf(segEnd);
          const grad = ctx.createLinearGradient(0, top, 0, base);
          grad.addColorStop(0, '#fff0c8');
          grad.addColorStop(0.5, '#ffb43c');
          grad.addColorStop(1, '#c97c12');
          ctx.fillStyle = grad;
          ctx.shadowBlur = 12;
          const width = Math.max(2, x1 - x0);
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(x0, top, width, base - top, 3);
          else ctx.rect(x0, top, width, base - top);
          ctx.fill();
        }
        if (!edge) break;
        level = edge.level;
        cursor = edge.t;
      }
      ctx.shadowBlur = 0;

      // the "now" head, where the stylus sits
      ctx.strokeStyle = this.level ? '#ffd98a' : 'rgba(255,255,255,.22)';
      ctx.lineWidth = this.level ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(w - 1, top - 8); ctx.lineTo(w - 1, base + 8); ctx.stroke();

      // idle-out: stop the loop once the strip is empty and the key is up
      if (!this.level && (!this.edges.length || this.edges[this.edges.length - 1].t < from)) {
        this.running = false;
      }
    }

    levelAt(t) {
      let level = 0;
      for (const e of this.edges) {
        if (e.t <= t) level = e.level; else break;
      }
      return level;
    }
  }

  window.Tape = Tape;
})();
