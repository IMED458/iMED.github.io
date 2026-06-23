import React, { useState, useEffect, useRef } from 'react';

function tween(dur, from, to, onUpdate, ease = (t) => t, onDone) {
  const t0 = performance.now();
  function step(now) {
    let t = Math.min(1, (now - t0) / dur);
    onUpdate(from + (to - from) * ease(t));
    if (t < 1) requestAnimationFrame(step);
    else if (onDone) onDone();
  }
  requestAnimationFrame(step);
}
const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

function AnimatedTitle({ show, small }) {
  const sweepRef = useRef(null);
  useEffect(() => {
    if (show && sweepRef.current) {
      const id = setTimeout(() => sweepRef.current && sweepRef.current.classList.add('go'), 350);
      return () => clearTimeout(id);
    }
  }, [show]);
  const reveal = (delay) => ({
    opacity: show ? 1 : 0,
    transform: show ? 'translateY(0)' : 'translateY(12px)',
    filter: show ? 'blur(0)' : 'blur(6px)',
    transition: 'opacity 1.4s cubic-bezier(0.22,1,0.36,1), transform 1.4s cubic-bezier(0.22,1,0.36,1), filter 1.4s cubic-bezier(0.22,1,0.36,1)',
    transitionDelay: delay,
  });
  return (
    <div className="flex flex-col items-center select-none">
      <div style={reveal('0ms')}>
        <div className="flex items-center gap-3 mb-5">
          <span className="block w-10 gold-rule"></span>
          <span className="eyebrow text-gold-grad" style={{ fontSize: small ? 11 : 13 }}>Invitation</span>
          <span className="block w-10 gold-rule"></span>
        </div>
      </div>

      <div ref={sweepRef} className="sweep" style={reveal('120ms')}>
        <h1 className="font-display text-center leading-[0.92] text-pearl"
            style={{ fontSize: small ? 40 : 'clamp(46px, 15vw, 82px)' }}>
          <span className="block italic font-normal tracking-tight"
                style={{ fontFamily: '"Bodoni Moda", serif' }}>Tatia's</span>
          <span className="block text-gold-grad tracking-[0.02em] mt-1"
                style={{ fontWeight: 500 }}>Birthday Party</span>
        </h1>
      </div>
    </div>
  );
}

export function CinematicIntro({ engine, onReady }) {
  const [phase, setPhase] = useState(0);
  const [drawLine, setDrawLine] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let timers = [];
    const T = (fn, ms) => timers.push(setTimeout(fn, ms));

    function finish() {
      if (doneRef.current) return;
      doneRef.current = true;
      if (engine) {
        engine.setText(['Tatia’s', 'Birthday Party'], {
          font: '"Bodoni Moda", serif', weight: 500, tracking: 0, size: Math.min(window.innerWidth * 0.2, 150),
          cy: 0.46, lineHeight: 1.08, widthPct: 0.86,
        });
        engine.gather = 1; engine.scatter = 0; engine.visible = 0;
      }
      onReady && onReady();
    }

    if (reduce) {
      setDrawLine(true); setPhase(3);
      T(() => setPhase(4), 300);
      T(() => setPhase(5), 800);
      T(finish, 1200);
      return () => timers.forEach(clearTimeout);
    }

    if (!engine) { return; }
    engine.start();
    engine.lum = 0; engine.visible = 1; engine.gather = 0; engine.scatter = 0;

    T(() => { setDrawLine(true); setPhase(1); }, 350);

    T(() => {
      setPhase(2);
      engine.setText(['Tatia’s'], { font: '"Bodoni Moda", serif', italic: true, weight: 500, size: Math.min(window.innerWidth * 0.34, 200), cy: 0.46, widthPct: 0.7 });
      tween(1700, 0, 1, (v) => engine.gather = v, easeOut);
    }, 1150);

    T(() => {
      engine.setText(['Birthday', 'Party'], { font: '"Bodoni Moda", serif', weight: 500, size: Math.min(window.innerWidth * 0.26, 170), cy: 0.46, lineHeight: 1.02, widthPct: 0.84 });
    }, 3050);

    T(() => {
      setPhase(3);
      engine.setText(['Tatia’s', 'Birthday Party'], { font: '"Bodoni Moda", serif', weight: 500, size: Math.min(window.innerWidth * 0.2, 150), cy: 0.46, lineHeight: 1.08, widthPct: 0.86 });
      tween(1400, engine.visible, 0.0, (v) => engine.visible = v, easeInOut);
    }, 4450);

    T(() => setPhase(4), 5400);
    T(() => setPhase(5), 6200);
    T(finish, 6600);

    return () => timers.forEach(clearTimeout);
  }, [engine]);

  return (
    <div className="relative w-full" style={{ minHeight: '100svh' }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-7"
           style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

        <svg className="absolute" style={{ width: 'min(78vw, 360px)', top: '50%', transform: 'translateY(-148px)', opacity: drawLine ? 0.9 : 0 }}
             viewBox="0 0 360 60" fill="none">
          <path d="M8 34 C 70 6, 130 6, 180 30 C 230 54, 290 54, 352 26"
                stroke="url(#gl)" strokeWidth="1.4" strokeLinecap="round"
                className={drawLine ? 'draw-on' : ''}
                style={{ filter: 'drop-shadow(0 0 6px rgba(201,163,94,0.5))' }} />
          <defs>
            <linearGradient id="gl" x1="0" y1="0" x2="360" y2="0">
              <stop offset="0" stopColor="#A47E42" stopOpacity="0"/>
              <stop offset="0.5" stopColor="#EBD3A0"/>
              <stop offset="1" stopColor="#A47E42" stopOpacity="0"/>
            </linearGradient>
          </defs>
        </svg>

        <div className="relative z-10">
          <AnimatedTitle show={phase >= 3} />
        </div>

        <div className="relative z-10 mt-9 max-w-[20rem] text-center"
             style={{ opacity: phase >= 4 ? 1 : 0, transform: phase >= 4 ? 'translateY(0)' : 'translateY(8px)', filter: phase >= 4 ? 'blur(0)' : 'blur(5px)', transition: 'opacity 1.6s cubic-bezier(0.22,1,0.36,1), transform 1.6s cubic-bezier(0.22,1,0.36,1), filter 1.6s cubic-bezier(0.22,1,0.36,1)' }}>
          <p className="font-geo text-pearl/80" style={{ fontSize: 15, lineHeight: 1.85, fontWeight: 300 }}>
            მოხარული ვიქნები, თუ ამ განსაკუთრებულ დღეს ჩემთან ერთად გაატარებ.
          </p>
        </div>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
           style={{ opacity: phase >= 5 ? 1 : 0, transition: 'opacity 1s ease', bottom: 'calc(env(safe-area-inset-bottom) + 26px)' }}>
        <span className="eyebrow text-pearl/55" style={{ fontSize: 10, letterSpacing: '0.42em' }}>გადაასქროლე</span>
        <svg className="cue" width="16" height="24" viewBox="0 0 16 24" fill="none">
          <path d="M8 2 V 19 M2 13 L8 20 L14 13" stroke="#EBD3A0" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}

export { tween, easeInOut, easeOut };
