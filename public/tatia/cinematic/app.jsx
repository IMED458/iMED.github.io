/* ===========================================================
   app.jsx — App, SceneController, HeroScene, luminance engine
   =========================================================== */
const { useScene: _useScene, seg: _seg, cl: _cl } = window;
const { CinematicIntro: _Intro, DateReveal, TimeReveal, LocationReveal, InvitationObject3D, ClosingSection } = window;

/* ---- Scene scroll controller (rAF, imperative) ---- */
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

/* ---- Luminance: dark velvet → light pearl ---- */
const VELVET = [22, 10, 14], PEARL = [247, 239, 228];
let _lastLum = -1;
function setLum(v) {
  v = v < 0 ? 0 : v > 1 ? 1 : v;
  if (Math.abs(v - _lastLum) < 0.003) return;   // avoid per-frame style thrash
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

/* ---- Hero: holds the cinematic intro; shatters on scroll ---- */
function HeroScene({ engine, introDone, onReady }) {
  const contentRef = useRef(null);
  const introDoneRef = useRef(false);
  useEffect(() => { introDoneRef.current = introDone; }, [introDone]);
  const ref = _useScene((p) => {
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
    <section ref={ref} data-scene data-screen-label="Intro" style={{ height: '220vh' }}>
      <div className="sticky top-0" style={{ height: '100svh' }}>
        <div ref={contentRef} style={{ willChange: 'transform, opacity, filter' }}>
          <_Intro engine={engine} onReady={onReady} />
        </div>
      </div>
    </section>
  );
}

/* ---- App ---- */
function App() {
  const [engine, setEngine] = useState(null);
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    setLum(0);

    // lock scroll during intro
    const prevent = (e) => { if (!document.body.dataset.unlocked) e.preventDefault(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('touchmove', prevent, { passive: false });
    window.addEventListener('wheel', prevent, { passive: false });

    // ambient field (independent)
    const amb = new window.AmbientField(document.getElementById('ambient'));
    window.__amb = amb; amb.lum = 0;

    // create particle engine once fonts are ready (so glyph sampling is accurate)
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
      const eng = new window.WordParticles(document.getElementById('particles'));
      eng.lum = 0;
      window.__eng = eng;
      setEngine(eng);
    });

    // Safety net: no matter what happens with the particle engine,
    // never leave the page locked on a blank screen.
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
  const handleReadyRef = useRef(handleReady);
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

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
