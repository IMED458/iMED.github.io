/* ===========================================================
   particles.jsx — vanilla engines exposed on window
   - WordParticles : text→particle assembly on #particles canvas
   - AmbientField  : floating glowing dust on #ambient canvas
   - fireConfetti  : pearl/gold/pink sparkle burst on #confetti
   =========================================================== */

const PALETTE = [
  [235, 211, 160],  // gold-light
  [201, 163, 94],   // gold
  [247, 239, 228],  // pearl
  [231, 185, 190],  // blush
  [216, 190, 151],  // champagne-deep
];

function pick(a) { return a[(Math.random() * a.length) | 0]; }
function lerp(a, b, t) { return a + (b - a) * t; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

/* ----------------------------------------------------------- */
class WordParticles {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = 0; this.H = 0;
    this.particles = [];
    this.count = 0;
    this.lum = 0;            // 0 dark .. 1 light  -> blend mode + glow
    this.scatter = 0;        // 0 assembled .. 1 fully dispersed
    this.gather = 0;         // 0 invisible/scattered home .. 1 gathered to targets
    this.visible = 1;        // master alpha
    this.running = false;
    this._t0 = performance.now();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(() => {
        if ((this.W === 0 || this.H === 0) && window.innerWidth > 0) this.resize();
      });
      this._ro.observe(document.documentElement);
    }
    this._init();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.W = w; this.H = h;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // re-sample current text on resize so words stay centered & fitted
    if (this._lines) this.setText(this._lines, this._opts, true);
  }

  _init() {
    const area = this.W * this.H;
    this.count = Math.max(900, Math.min(1900, Math.round(area / 720)));
    this.particles = [];
    const cx = this.W / 2, cy = this.H / 2;
    for (let i = 0; i < this.count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.max(this.W, this.H) * (0.55 + Math.random() * 0.6);
      const col = pick(PALETTE);
      this.particles.push({
        x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r,
        hx: cx + Math.cos(a) * r, hy: cy + Math.sin(a) * r, // "home" (scatter destination)
        tx: cx, ty: cy,        // assembly target
        vx: 0, vy: 0,
        size: 0.7 + Math.random() * 1.7,
        col, base: 0.5 + Math.random() * 0.5,
        tw: Math.random() * Math.PI * 2, tws: 0.6 + Math.random() * 1.6,
        k: 0.05 + Math.random() * 0.05, hasT: false,
        sx: (Math.random() - 0.5), sy: (Math.random() - 0.5), // scatter direction
      });
    }
  }

  /* Sample target points from rendered text lines */
  setText(lines, opts = {}, silent = false) {
    this._lines = lines; this._opts = opts;
    const W = this.W, H = this.H;
    if (!W || !H) return;   // viewport not measured yet — bail safely
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const o = off.getContext('2d');
    o.clearRect(0, 0, W, H);
    o.fillStyle = '#fff';
    o.textAlign = 'center';
    o.textBaseline = 'middle';

    const family = opts.font || '"Bodoni Moda", serif';
    const weight = opts.weight || 500;
    const maxW = W * (opts.widthPct || 0.84);
    const tracking = opts.tracking != null ? opts.tracking : 0;

    // fit each line, choose smallest scale so all fit
    let fontSize = opts.size || Math.min(W * 0.2, 150);
    const fit = (fs) => {
      o.font = `${opts.italic ? 'italic ' : ''}${weight} ${fs}px ${family}`;
      let max = 0;
      for (const ln of lines) {
        let wln = o.measureText(ln).width + tracking * Math.max(0, ln.length - 1);
        if (wln > max) max = wln;
      }
      return max;
    };
    let guard = 0;
    while (fit(fontSize) > maxW && fontSize > 14 && guard++ < 60) fontSize *= 0.94;
    o.font = `${opts.italic ? 'italic ' : ''}${weight} ${fontSize}px ${family}`;

    const lh = fontSize * (opts.lineHeight || 1.02);
    const totalH = lh * lines.length;
    const cy = H * (opts.cy || 0.46);
    const startY = cy - totalH / 2 + lh / 2;

    // draw with manual letter tracking
    lines.forEach((ln, li) => {
      const y = startY + li * lh;
      if (!tracking) {
        o.fillText(ln, W / 2, y);
      } else {
        const widths = [...ln].map(ch => o.measureText(ch).width);
        const total = widths.reduce((s, w) => s + w, 0) + tracking * (ln.length - 1);
        let x = W / 2 - total / 2;
        [...ln].forEach((ch, ci) => {
          o.fillText(ch, x + widths[ci] / 2, y);
          x += widths[ci] + tracking;
        });
      }
    });

    // gather sample points
    const img = o.getImageData(0, 0, W, H).data;
    const step = opts.step || (W < 460 ? 4 : 5);
    const pts = [];
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) {
        const idx = (y * W + x) * 4 + 3;
        if (img[idx] > 130) pts.push([x + (Math.random() - 0.5) * step, y + (Math.random() - 0.5) * step]);
      }
    }
    // shuffle
    for (let i = pts.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = pts[i]; pts[i] = pts[j]; pts[j] = t;
    }

    const n = this.particles.length;
    for (let i = 0; i < n; i++) {
      const p = this.particles[i];
      if (i < pts.length) {
        p.tx = pts[i % pts.length][0];
        p.ty = pts[i % pts.length][1];
        p.hasT = true;
      } else if (pts.length > 0) {
        // extra particles double up on random points so glyphs stay dense
        const q = pts[(Math.random() * pts.length) | 0];
        p.tx = q[0] + (Math.random() - 0.5) * 6;
        p.ty = q[1] + (Math.random() - 0.5) * 6;
        p.hasT = true;
      } else {
        p.hasT = false;
      }
      // assign a fresh scatter home far off in a random direction
      const a = Math.atan2(p.ty - H / 2, p.tx - W / 2) + (Math.random() - 0.5) * 1.4;
      const r = Math.max(W, H) * (0.7 + Math.random() * 0.5);
      p.hx = W / 2 + Math.cos(a) * r;
      p.hy = H / 2 + Math.sin(a) * r;
    }
  }

  clearText() {
    for (const p of this.particles) p.hasT = false;
  }

  start() { if (!this.running) { this.running = true; this._loop(); } }
  stop() { this.running = false; }

  _loop() {
    if (!this.running) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);
    const dark = this.lum < 0.5;
    ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    const now = performance.now() * 0.001;
    const gather = this.gather, scatter = this.scatter, vis = this.visible;

    for (const p of this.particles) {
      // resolve target: blend between home(scatter) and text target by gather, then by scatter push back out
      let goalX, goalY;
      if (p.hasT && gather > 0) {
        const gx = lerp(p.hx, p.tx, gather);
        const gy = lerp(p.hy, p.ty, gather);
        // scatter pushes outward from target
        goalX = lerp(gx, p.hx, scatter);
        goalY = lerp(gy, p.hy, scatter);
      } else {
        goalX = p.hx; goalY = p.hy;
      }
      // spring
      p.vx += (goalX - p.x) * p.k;
      p.vy += (goalY - p.y) * p.k;
      p.vx *= 0.82; p.vy *= 0.82;
      p.x += p.vx; p.y += p.vy;
      // shimmer twinkle
      p.tw += 0.016 * p.tws;
      const tw = 0.55 + 0.45 * Math.sin(p.tw + now);

      const settled = p.hasT ? gather * (1 - scatter) : 0.0;
      let alpha = vis * (0.25 + 0.75 * settled) * (0.5 + 0.5 * tw) * p.base;
      if (!p.hasT) alpha *= 0.5; // background drifters dimmer
      if (alpha <= 0.01) continue;

      const s = p.size * (dark ? 1.25 : 1.0);
      const [r, g, b] = p.col;
      if (dark) {
        // glow
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s * 3.2);
        grd.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
        grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(p.x, p.y, s * 3.2, 0, 6.283); ctx.fill();
      } else {
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, 6.283); ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(() => this._loop());
  }
}

/* ----------------------------------------------------------- */
class AmbientField {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.lum = 0;
    this.parts = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this._init();
    requestAnimationFrame(() => this._loop());
  }
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.W = w; this.H = h;
    this.canvas.width = w * this.dpr; this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }
  _init() {
    const n = Math.max(26, Math.min(60, Math.round(this.W * this.H / 26000)));
    this.parts = [];
    for (let i = 0; i < n; i++) {
      this.parts.push({
        x: Math.random() * this.W, y: Math.random() * this.H,
        r: 0.6 + Math.random() * 2.4,
        vy: -(0.08 + Math.random() * 0.28),
        vx: (Math.random() - 0.5) * 0.18,
        col: pick(PALETTE), tw: Math.random() * 6.28, tws: 0.4 + Math.random() * 1.2,
        a: 0.2 + Math.random() * 0.5,
      });
    }
  }
  _loop() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);
    const dark = this.lum < 0.5;
    ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    for (const p of this.parts) {
      p.x += p.vx; p.y += p.vy; p.tw += 0.01 * p.tws;
      if (p.y < -10) { p.y = this.H + 10; p.x = Math.random() * this.W; }
      if (p.x < -10) p.x = this.W + 10; if (p.x > this.W + 10) p.x = -10;
      const tw = 0.5 + 0.5 * Math.sin(p.tw);
      const alpha = p.a * tw * (dark ? 0.9 : 0.55);
      const [r, g, b] = p.col;
      const s = p.r * (dark ? 2.4 : 1.4);
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s);
      grd.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, 6.283); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(() => this._loop());
  }
}

/* ----------------------------------------------------------- */
let _confettiRunning = false;
function fireConfetti(originX, originY) {
  const canvas = document.getElementById('confetti');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth, H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const ox = originX != null ? originX : W / 2;
  const oy = originY != null ? originY : H * 0.62;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const N = reduce ? 40 : 150;
  const ps = [];
  for (let i = 0; i < N; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
    const sp = 5 + Math.random() * 13;
    const shape = Math.random() < 0.4 ? 'dot' : (Math.random() < 0.5 ? 'rect' : 'ribbon');
    ps.push({
      x: ox + (Math.random() - 0.5) * 40, y: oy,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2,
      g: 0.16 + Math.random() * 0.12,
      col: pick(PALETTE), s: 3 + Math.random() * 5,
      rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3,
      life: 0, max: 90 + Math.random() * 50, shape,
    });
  }
  const start = performance.now();
  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    let alive = 0;
    for (const p of ps) {
      p.life++;
      if (p.life > p.max) continue;
      alive++;
      p.vy += p.g; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      const fade = 1 - p.life / p.max;
      const [r, g, b] = p.col;
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = fade;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      if (p.shape === 'dot') {
        ctx.beginPath(); ctx.arc(0, 0, p.s * 0.6, 0, 6.283); ctx.fill();
      } else if (p.shape === 'rect') {
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s);
      } else {
        ctx.fillRect(-p.s * 0.4, -p.s * 1.6, p.s * 0.8, p.s * 3.2);
      }
      ctx.restore();
    }
    if (alive > 0 && performance.now() - start < 4500) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, W, H);
  }
  requestAnimationFrame(frame);
}

Object.assign(window, { WordParticles, AmbientField, fireConfetti });
