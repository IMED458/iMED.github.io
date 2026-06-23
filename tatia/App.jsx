import React, { useState, useEffect, useRef } from 'react';
import { WordParticles, AmbientField } from './particles.js';
import { CinematicIntro } from './intro.jsx';
import { DateReveal, TimeReveal, LocationReveal, InvitationObject3D, ClosingSection, useScene, seg as _seg, cl as _cl } from './scenes.jsx';

class SceneController {
  constructor() { this.entries = []; this._loop = this._loop.bind(this); requestAnimationFrame(this._loop); }
  add(el, cb) { const e = { el, cb }; this.entries.push(e); return () => { const i = this.entries.indexOf(e); if (i >= 0) this.entries.splice(i, 1); }; }
  _loop() {
    const vh = window.innerHeight;
    for (const e of this.entries) {
      const r = e.el.getBoundingClientRect();
      const total = r.height - vh;
      let p = total > 0 ? (-r.top) / total : (r.top <= 0 ? 1 : 0);
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      e.cb(p);
    }
    requestAnimationFrame(this._loop);
  }
}
window.sceneController = new SceneController();

const VELVET = [22, 10, 14], PEARL = [247, 239, 228];
let _lastLum = -1;
function setLum(v) {
  v = v < 0 ? 0 : v > 1 ? 1 : v;
  if (Math.abs(v - _lastLum) < 0.003) return;
  _lastLum = v;
  const bg = VELVET.map((x, i) => Math.round(x + (PEARL[i] - x) * v));
  const rgb = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
  document.body.style.background = rgb;
  document.documentElement.style.setProperty('--lum', v.toFixed(3));
  if (window.__eng) window.__eng.lum = v;
  if (window.__amb) window.__amb.lum = v;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', rgb);
}

function HeroScene({ engine, introDone, onReady }) {
  const contentRef = useRef(null);
  const introDoneRef = useRef(false);
  useEffect(() => { introDoneRef.current = introDone; }, [introDone]);
  const ref = useScene((p) => {
    if (!introDoneRef.current) { setLum(0); return; }
    const fade = _seg(p, 0, 0.4), rise = _seg(p, 0, 0.55), blur = _seg(p, 0, 0.4);
    if (contentRef.current) {
      contentRef.current.style.opacity = `${1 - fade}`;
      contentRef.current.style.transform = `translateY(${-rise * 80}px)`;
      contentRef.current.style.filter = `blur(${blur * 6}px)`;
    }
    if (engine) {
      const emerge = _seg(p, 0, 0.3), fly = _seg(p, 0.3, 1);
      engine.visible = emerge * (1 - fly);
      engine.scatter = fly;
    }
    setLum(_seg(p, 0.2, 0.72));
  });
  return (
    <section ref={ref} data-scene style={{ height: '220vh' }}>
      <div className="sticky top-0" style={{ height: '100svh' }}>
        <div ref={contentRef} style={{ willChange: 'transform, opacity, filter' }}>
          <CinematicIntro engine={engine} onReady={onReady} />
        </div>
      </div>
    </section>
  );
}

export function App() {
  const [engine, setEngine] = useState(null);
  const [introDone, setIntroDone] = useState(false);
  const handleReadyRef = useRef(null);

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    setLum(0);

    const prevent = (e) => { if (!document.body.dataset.unlocked) e.preventDefault(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('touchmove', prevent, { passive: false });
    window.addEventListener('wheel', prevent, { passive: false });

    const amb = new AmbientField(document.getElementById('ambient'));
    window.__amb = amb; amb.lum = 0;

    const ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    let cancelled = false;

    const waitForViewport = () => new Promise((resolve) => {
      if (window.innerWidth > 0 && window.innerHeight > 0) return resolve();
      const tick = () => {
        if (cancelled) return resolve();
        if (window.innerWidth > 0 && window.innerHeight > 0) return resolve();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    Promise.all([
      ready,
      document.fonts ? document.fonts.load('500 100px "Bodoni Moda"').catch(() => {}) : Promise.resolve(),
      waitForViewport(),
    ]).then(() => {
      if (cancelled) return;
      const eng = new WordParticles(document.getElementById('particles'));
      eng.lum = 0;
      window.__eng = eng;
      setEngine(eng);
    });

    const failSafe = setTimeout(() => {
      if (!document.body.dataset.unlocked) handleReadyRef.current && handleReadyRef.current();
    }, 9000);

    return () => {
      cancelled = true;
      clearTimeout(failSafe);
      window.removeEventListener('touchmove', prevent);
      window.removeEventListener('wheel', prevent);
    };
  }, []);

  const handleReady = () => {
    document.body.style.overflow = '';
    document.body.dataset.unlocked = '1';
    setIntroDone(true);
  };
  useEffect(() => { handleReadyRef.current = handleReady; });

  return (
    <React.Fragment>
      <HeroScene engine={engine} introDone={introDone} onReady={handleReady} />
      <DateReveal />
      <TimeReveal />
      <LocationReveal />
      <InvitationObject3D />
      <ClosingSection />
      <div style={{ height: '10vh' }}></div>
    </React.Fragment>
  );
}
