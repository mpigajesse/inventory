import { useEffect, useRef } from "react";
import { Store, ShieldCheck } from "lucide-react";

export function FormHeader() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(-30px)";
    const raf = requestAnimationFrame(() => {
      el.style.transition = "opacity 500ms ease-out, transform 500ms ease-out";
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Mobile logo — hidden on md and above */}
      <div
        className="md:hidden"
        style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "8px",
            background: "linear-gradient(135deg, hsl(22 72% 56%), hsl(22 72% 38%))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Store size={20} color="white" />
        </div>
        <span
          style={{
            fontWeight: 800,
            color: "hsl(22 72% 48%)",
            fontSize: "15px",
            letterSpacing: "0.04em",
          }}
        >
          NAOSERVICES
        </span>
      </div>

      {/* Main heading */}
      <h1
        style={{
          fontSize: "clamp(1.6rem, 2.5vw, 2rem)",
          fontWeight: 900,
          letterSpacing: "-0.03em",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: "hsl(20 25% 12%)",
          margin: 0,
          lineHeight: 1.15,
        }}
      >
        Bienvenue
      </h1>

      {/* Accent line */}
      <p
        style={{
          fontSize: "15px",
          color: "hsl(20 15% 45%)",
          margin: 0,
        }}
      >
        Connectez-vous à votre espace
      </p>

      {/* Security badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          marginTop: "2px",
        }}
      >
        <ShieldCheck size={14} color="hsl(152 38% 38%)" strokeWidth={2.2} />
        <span
          style={{
            fontSize: "11px",
            color: "hsl(152 38% 38%)",
            fontWeight: 600,
          }}
        >
          Connexion sécurisée SSL
        </span>
      </div>
    </div>
  );
}
