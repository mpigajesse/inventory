import { useEffect, useRef, useState } from "react";

const STATS = [
  { value: 99, suffix: "%", label: "Uptime" },
  { value: 50, suffix: "+", label: "Clients actifs" },
  { value: 24, suffix: "h", label: "Support" },
];

const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

function AnimatedCounter({ value, duration = 1400, start }: { value: number; duration?: number; start: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) return;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.round(easeOutQuart(progress) * value));
      if (progress < 1) requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, start]);

  return <>{count}</>;
}

export function HeroStats() {
  const wrapRef   = useRef<HTMLDivElement>(null);
  const copyRef   = useRef<HTMLDivElement>(null);
  const [counting, setCounting] = useState(false);

  useEffect(() => {
    const DELAY = 920;

    const wrap = wrapRef.current;
    const copy = copyRef.current;
    if (wrap) {
      wrap.style.opacity   = '0';
      wrap.style.transform = 'translateY(24px)';
    }
    if (copy) {
      copy.style.opacity   = '0';
      copy.style.transform = 'translateY(16px)';
    }

    setTimeout(() => {
      if (wrap) {
        wrap.style.transition = 'opacity 600ms cubic-bezier(0.16,1,0.3,1), transform 600ms cubic-bezier(0.16,1,0.3,1)';
        wrap.style.opacity    = '1';
        wrap.style.transform  = 'translateY(0)';
      }
      setCounting(true);
    }, DELAY);

    setTimeout(() => {
      if (copy) {
        copy.style.transition = 'opacity 500ms ease, transform 500ms ease';
        copy.style.opacity    = '1';
        copy.style.transform  = 'translateY(0)';
      }
    }, DELAY + 200);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Stats row */}
      <div
        ref={wrapRef}
        style={{
          paddingBlock:  "20px",
          borderTop:     "1px solid rgba(255,255,255,0.08)",
          display:       "flex",
          alignItems:    "center",
        }}
      >
        {STATS.map((stat, index) => (
          <div
            key={stat.label}
            style={{
              flex:           1,
              display:        "flex",
              flexDirection:  "column",
              alignItems:     "center",
              gap:            4,
              ...(index < STATS.length - 1
                ? { borderRight: "1px solid rgba(255,255,255,0.12)" }
                : {}),
            }}
          >
            <div
              style={{
                fontSize:   "clamp(1.5rem, 2.5vw, 1.9rem)",
                fontWeight: 900,
                fontFamily: "'Fraunces', serif",
                background: "linear-gradient(135deg, hsl(22 72% 62%), hsl(38 90% 62%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor:  "transparent",
                backgroundClip: "text",
                letterSpacing: "-0.02em",
                lineHeight:    1,
              }}
            >
              <AnimatedCounter value={stat.value} start={counting} />
              <span style={{ WebkitTextFillColor: "hsl(22 72% 60%)", color: "hsl(22 72% 60%)", fontSize: "0.85em" }}>
                {stat.suffix}
              </span>
            </div>
            <div
              style={{
                fontSize:      11,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color:         "hsl(28 15% 52%)",
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Copyright */}
      <div
        ref={copyRef}
        style={{
          paddingTop:    12,
          borderTop:     "1px solid rgba(255,255,255,0.06)",
          display:       "flex",
          alignItems:    "center",
          justifyContent: "space-between",
          gap:           8,
        }}
      >
        <span style={{ fontSize: 10.5, color: "hsl(28 12% 42%)", letterSpacing: "0.02em" }}>
          © {new Date().getFullYear()} Naoservices — MPJ HIGH-TECH
        </span>
        <span style={{ fontSize: 10, color: "hsl(28 12% 36%)", letterSpacing: "0.03em" }}>
          v1.0
        </span>
      </div>
    </div>
  );
}
