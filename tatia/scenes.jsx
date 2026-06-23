import React, { useState, useRef, useEffect } from 'react';

const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (p, a, b) => cl((p - a) / (b - a));

function useScene(cb) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !window.sceneController) return;
    return window.sceneController.add(ref.current, cb);
  }, []);
  return ref;
}

function Petals({ tone = 'gold' }) {
  const items = [
    { l: '12%', t: '18%', s: 14, d: '0s', dur: '8s', o: 0.5 },
    { l: '82%', t: '24%', s: 9, d: '1.2s', dur: '11s', o: 0.4 },
    { l: '24%', t: '74%', s: 11, d: '0.6s', dur: '9.5s', o: 0.45 },
    { l: '70%', t: '68%', s: 16, d: '2s', dur: '12s', o: 0.35 },
    { l: '50%', t: '12%', s: 7, d: '0.3s', dur: '10s', o: 0.5 },
    { l: '88%', t: '54%', s: 12, d: '1.6s', dur: '9s', o: 0.4 },
    { l: '8%', t: '50%', s: 8, d: '2.4s', dur: '11.5s', o: 0.45 },
  ];
  const fill = tone === 'gold'
    ? 'radial-gradient(circle at 35% 30%, #F3E3BC, #C9A35E)'
    : 'radial-gradient(circle at 35% 30%, #fff, #E7B9BE)';
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {items.map((p, i) => (
        <span key={i} className={i % 2 ? 'floaty' : 'floaty-s'}
          style={{
            position: 'absolute', left: p.l, top: p.t, width: p.s, height: p.s,
            borderRadius: i % 3 ? '50%' : '50% 50% 50% 0',
            background: fill, opacity: p.o, animationDelay: p.d,
            transform: `rotate(${i * 40}deg)`, filter: 'blur(0.3px)',
            boxShadow: '0 0 8px rgba(201,163,94,0.35)',
          }} />
      ))}
    </div>
  );
}

export function DateReveal() {
  const cardRef = useRef(null), numRef = useRef(null), labelRef = useRef(null), panelRef = useRef(null);
  const ref = useScene((p) => {
    const ip = seg(p, 0.05, 0.5);
    const out = seg(p, 0.78, 1);
    if (cardRef.current) {
      cardRef.current.style.transform =
        `perspective(1200px) rotateX(${(1 - ip) * 16}deg) translateY(${(1 - ip) * 46 - out * 70}px) scale(${0.94 + ip * 0.06})`;
      cardRef.current.style.opacity = `${cl(ip * 1.4)}`;
    }
    if (numRef.current) numRef.current.style.clipPath = `inset(${(1 - ip) * 100}% 0 0 0)`;
    if (labelRef.current) { labelRef.current.style.opacity = `${seg(p, 0.32, 0.6)}`; labelRef.current.style.transform = `translateY(${(1 - seg(p, 0.32, 0.6)) * 14}px)`; }
    if (panelRef.current) panelRef.current.style.opacity = `${1 - out * 0.6}`;
  });
  return (
    <section ref={ref} data-scene style={{ height: '200vh' }}>
      <div ref={panelRef} className="sticky top-0 flex items-center justify-center overflow-hidden" style={{ height: '100svh' }}>
        <Petals tone="rose" />
        <div ref={cardRef} className="relative glass glass-border rounded-[28px] px-12 py-14 flex flex-col items-center"
             style={{ willChange: 'transform' }}>
          <span className="eyebrow text-gold-deep mb-4" style={{ fontSize: 11 }}>Save the date</span>
          <div className="overflow-hidden">
            <div ref={numRef} className="font-display text-ink leading-none" style={{ fontSize: 'clamp(120px, 40vw, 190px)', fontWeight: 500 }}>
              <span className="text-gold-grad">10</span>
            </div>
          </div>
          <div ref={labelRef} className="flex items-center gap-3 mt-3">
            <span className="block w-7 gold-rule"></span>
            <span className="font-geo text-ink-soft" style={{ fontSize: 16, letterSpacing: '0.3em' }}>ივნისი</span>
            <span className="block w-7 gold-rule"></span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function TimeReveal() {
  const ringRef = useRef(null), ticksRef = useRef(null), timeRef = useRef(null), handRef = useRef(null);
  const C = 2 * Math.PI * 128;
  const ref = useScene((p) => {
    const draw = seg(p, 0.08, 0.6);
    const show = seg(p, 0.5, 0.78);
    const out = seg(p, 0.82, 1);
    if (ringRef.current) ringRef.current.style.strokeDashoffset = `${C * (1 - draw)}`;
    if (ticksRef.current) ticksRef.current.style.opacity = `${draw}`;
    if (handRef.current) handRef.current.style.transform = `rotate(${-90 + draw * 320}deg)`;
    if (timeRef.current) {
      timeRef.current.style.opacity = `${show * (1 - out)}`;
      timeRef.current.style.transform = `translateY(${(1 - show) * 16}px) scale(${0.92 + show * 0.08})`;
    }
  });
  const ticks = Array.from({ length: 12 });
  return (
    <section ref={ref} data-scene style={{ height: '200vh' }}>
      <div className="sticky top-0 flex items-center justify-center overflow-hidden" style={{ height: '100svh' }}>
        <Petals tone="gold" />
        <div className="relative" style={{ width: 'min(78vw, 320px)', aspectRatio: '1' }}>
          <svg viewBox="0 0 300 300" className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
            <circle cx="150" cy="150" r="128" fill="none" stroke="rgba(201,163,94,0.16)" strokeWidth="1" />
            <circle ref={ringRef} cx="150" cy="150" r="128" fill="none" stroke="url(#ring)" strokeWidth="2"
              strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C}
              transform="rotate(-90 150 150)" style={{ filter: 'drop-shadow(0 0 6px rgba(201,163,94,0.5))' }} />
            <g ref={ticksRef} style={{ opacity: 0 }}>
              {ticks.map((_, i) => {
                const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
                const r1 = i % 3 === 0 ? 110 : 118, r2 = 124;
                return <line key={i} x1={150 + Math.cos(a) * r1} y1={150 + Math.sin(a) * r1}
                  x2={150 + Math.cos(a) * r2} y2={150 + Math.sin(a) * r2}
                  stroke="#C9A35E" strokeWidth={i % 3 === 0 ? 1.6 : 0.8} strokeLinecap="round" opacity="0.7" />;
              })}
              <g ref={handRef} style={{ transformOrigin: '150px 150px' }}>
                <line x1="150" y1="150" x2="150" y2="64" stroke="#A47E42" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
              </g>
              <circle cx="150" cy="150" r="3.5" fill="#A47E42" />
            </g>
            <defs>
              <linearGradient id="ring" x1="0" y1="0" x2="300" y2="300">
                <stop offset="0" stopColor="#EBD3A0" /><stop offset="0.5" stopColor="#C9A35E" /><stop offset="1" stopColor="#A47E42" />
              </linearGradient>
            </defs>
          </svg>
          <div ref={timeRef} className="absolute inset-0 flex flex-col items-center justify-center" style={{ opacity: 0 }}>
            <div className="font-display text-gold-grad leading-none" style={{ fontSize: 'clamp(46px, 17vw, 72px)', fontWeight: 500 }}>17:00</div>
            <span className="font-geo text-ink-soft mt-3" style={{ fontSize: 13, letterSpacing: '0.34em' }}>დასაწყისი</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LocationReveal() {
  const cardRef = useRef(null);
  const ref = useScene((p) => {
    const ip = seg(p, 0.05, 0.5);
    const out = seg(p, 0.8, 1);
    if (cardRef.current) {
      cardRef.current.style.opacity = `${cl(ip * 1.3) * (1 - out * 0.5)}`;
      cardRef.current.style.filter = `blur(${(1 - ip) * 16}px)`;
      cardRef.current.style.transform =
        `perspective(1100px) translateY(${(1 - ip) * 50 - out * 60}px) scale(${1.16 - ip * 0.16})`;
    }
  });
  return (
    <section ref={ref} data-scene style={{ height: '190vh' }}>
      <div className="sticky top-0 flex items-center justify-center overflow-hidden px-7" style={{ height: '100svh' }}>
        <Petals tone="gold" />
        <div ref={cardRef} className="relative glass glass-border rounded-[30px] w-full max-w-[22rem] px-9 py-12 flex flex-col items-center text-center"
             style={{ willChange: 'transform, filter' }}>
          <span className="eyebrow text-gold-deep mb-5" style={{ fontSize: 11 }}>The venue</span>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" className="mb-4 floaty">
            <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" stroke="#C9A35E" strokeWidth="1.2" />
            <circle cx="12" cy="10" r="2.4" stroke="#C9A35E" strokeWidth="1.2" />
          </svg>
          <h2 className="font-display text-ink leading-tight" style={{ fontSize: 'clamp(40px, 13vw, 60px)', fontWeight: 500 }}>
            Hill <span className="italic text-gold-grad">Sunny</span>
          </h2>
          <div className="flex items-center gap-3 my-5">
            <span className="block w-8 gold-rule"></span><span className="gold-diamond"></span><span className="block w-8 gold-rule"></span>
          </div>
          <p className="font-geo text-ink-soft mb-8" style={{ fontSize: 14, letterSpacing: '0.18em' }}>შეხვედრის ადგილი</p>
          <a href="#" className="btn-lux glass-border rounded-full px-9 py-3.5 font-geo text-ink"
             style={{ fontSize: 14, background: 'linear-gradient(150deg, rgba(235,217,189,0.9), rgba(231,185,190,0.7))', boxShadow: '0 10px 30px -10px rgba(201,163,94,0.6)' }}>
            რუკაზე ნახვა
          </a>
        </div>
      </div>
    </section>
  );
}

export function InvitationObject3D() {
  const sceneRef = useRef(null), cardRef = useRef(null), shineRef = useRef(null), wrapRef = useRef(null);
  const ref = useScene((p) => {
    const inn = seg(p, 0.05, 0.5);
    const idle = seg(p, 0.5, 1);
    const out = seg(p, 0.86, 1);
    const rotY = 180 - inn * 180 + Math.sin(idle * Math.PI * 2) * 10;
    const rotX = (1 - inn) * 10 - 4 + Math.sin(idle * Math.PI * 1.3) * 3;
    const lift = (1 - inn) * 60 - out * 80;
    if (cardRef.current) cardRef.current.style.transform = `rotateY(${rotY}deg) rotateX(${rotX}deg)`;
    if (wrapRef.current) { wrapRef.current.style.transform = `translateY(${lift}px) scale(${0.86 + inn * 0.14})`; wrapRef.current.style.opacity = `${cl(inn * 1.4) * (1 - out * 0.7)}`; }
    if (shineRef.current) shineRef.current.style.backgroundPosition = `${idle * 260 - 30}% 0`;
  });
  return (
    <section ref={ref} data-scene style={{ height: '240vh' }}>
      <div ref={sceneRef} className="sticky top-0 flex items-center justify-center overflow-hidden px-7" style={{ height: '100svh', perspective: '1400px' }}>
        <Petals tone="gold" />
        <div ref={wrapRef} className="floaty-s" style={{ width: 'min(74vw, 300px)', aspectRatio: '0.66', willChange: 'transform' }}>
          <div ref={cardRef} className="relative w-full h-full" style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}>
            <div className="absolute inset-0 rounded-[22px] glass glass-border flex flex-col items-center justify-center text-center px-6"
                 style={{ backfaceVisibility: 'hidden', background: 'linear-gradient(160deg, #FBF6EC, #F1E2CC)' }}>
              <span className="eyebrow text-gold-deep" style={{ fontSize: 9 }}>You are invited</span>
              <div className="my-5 w-12 gold-rule"></div>
              <h3 className="font-display text-ink leading-tight" style={{ fontSize: 26, fontWeight: 500 }}>
                <span className="italic">Tatia's</span><br /><span className="text-gold-grad">Birthday</span><br />Party
              </h3>
              <div className="my-5 w-12 gold-rule"></div>
              <p className="font-geo text-ink-soft" style={{ fontSize: 13, letterSpacing: '0.06em' }}>10 ივნისი • 17:00</p>
              <p className="font-geo text-ink mt-1" style={{ fontSize: 13, letterSpacing: '0.14em' }}>Hill Sunny</p>
              <div ref={shineRef} className="absolute inset-0 rounded-[22px] pointer-events-none"
                   style={{ background: 'linear-gradient(115deg, transparent 38%, rgba(255,255,255,0.7) 50%, transparent 62%)', backgroundSize: '260% 100%', mixBlendMode: 'screen' }}></div>
            </div>
            <div className="absolute inset-0 rounded-[22px] flex items-center justify-center"
                 style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: 'linear-gradient(160deg, #2c1820, #160a0e)', boxShadow: 'inset 0 0 0 1px rgba(201,163,94,0.35)' }}>
              <div className="absolute inset-3 rounded-[16px]" style={{ boxShadow: 'inset 0 0 0 1px rgba(201,163,94,0.25)' }}></div>
              <span className="font-display italic text-gold-grad" style={{ fontSize: 86, fontWeight: 500 }}>T</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RSVPButton() {
  const [done, setDone] = useState(false);
  const btnRef = useRef(null);
  const onClick = () => {
    if (done) return;
    const r = btnRef.current.getBoundingClientRect();
    window.fireConfetti && window.fireConfetti(r.left + r.width / 2, r.top + r.height / 2);
    setDone(true);
  };
  return (
    <div className="flex flex-col items-center">
      <button ref={btnRef} onClick={onClick}
        className="btn-lux rounded-full px-12 py-4 font-geo text-velvet relative"
        style={{ fontSize: 16, letterSpacing: '0.18em', background: 'linear-gradient(135deg, #EBD3A0, #C9A35E 55%, #A47E42)', boxShadow: '0 14px 36px -10px rgba(164,126,66,0.75)' }}>
        {done ? 'გელოდები ♡' : 'მოვდივარ'}
      </button>
      <div className="overflow-hidden mt-4" style={{ height: 22 }}>
        <p className="font-geo text-ink-soft transition-all duration-700"
           style={{ fontSize: 12, letterSpacing: '0.2em', transform: done ? 'translateY(0)' : 'translateY(24px)', opacity: done ? 1 : 0 }}>
          მადლობა, რომ იქნები
        </p>
      </div>
    </div>
  );
}

export function ClosingSection() {
  const inviteRef = useRef(null), signRef = useRef(null), ctaRef = useRef(null), penRef = useRef(null);
  const ref = useScene((p) => {
    const a = seg(p, 0.1, 0.4), b = seg(p, 0.36, 0.62), c = seg(p, 0.62, 0.86);
    if (inviteRef.current) { inviteRef.current.style.opacity = `${a}`; inviteRef.current.style.transform = `translateY(${(1 - a) * 22}px)`; }
    if (signRef.current) signRef.current.style.clipPath = `inset(0 ${(1 - b) * 100}% 0 0)`;
    if (penRef.current) { penRef.current.style.opacity = `${b < 1 && b > 0.02 ? 1 : 0}`; penRef.current.style.left = `${b * 100}%`; }
    if (ctaRef.current) { ctaRef.current.style.opacity = `${c}`; ctaRef.current.style.transform = `translateY(${(1 - c) * 18}px) scale(${0.96 + c * 0.04})`; }
  });
  return (
    <section ref={ref} data-scene style={{ height: '200vh' }}>
      <div className="sticky top-0 flex items-center justify-center overflow-hidden px-8" style={{ height: '100svh', background: 'radial-gradient(120% 90% at 50% 30%, rgba(251,246,236,0.6), transparent 70%)' }}>
        <Petals tone="rose" />
        <div className="relative flex flex-col items-center text-center max-w-[22rem]">
          <div className="flex items-center gap-3 mb-8">
            <span className="block w-8 gold-rule"></span><span className="gold-diamond"></span><span className="block w-8 gold-rule"></span>
          </div>
          <p ref={inviteRef} className="font-geo text-ink" style={{ fontSize: 17, lineHeight: 1.95, fontWeight: 300, opacity: 0 }}>
            მოხარული ვიქნები, თუ ამ განსაკუთრებულ დღეს ჩემთან ერთად გაატარებ.
          </p>
          <div className="relative my-10 w-full flex justify-center">
            <div ref={signRef} className="font-display italic text-gold-grad text-center mx-auto" style={{ fontSize: 'clamp(30px,9.5vw,44px)', lineHeight: 1.15, clipPath: 'inset(0 100% 0 0)' }}>
              სიყვარულით, თათია
            </div>
            <span ref={penRef} className="absolute top-1/2 -translate-y-1/2 pointer-events-none" style={{ left: 0, opacity: 0 }}>
              <span className="block w-1.5 h-1.5 rounded-full" style={{ background: '#A47E42', boxShadow: '0 0 8px rgba(201,163,94,0.8)' }}></span>
            </span>
          </div>
          <div ref={ctaRef} style={{ opacity: 0 }}>
            <RSVPButton />
          </div>
        </div>
      </div>
    </section>
  );
}

export { useScene, cl, seg };
