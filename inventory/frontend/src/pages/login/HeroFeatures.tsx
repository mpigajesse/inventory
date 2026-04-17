import { useEffect, useRef } from "react";
import { Zap, Package, TrendingUp } from "lucide-react";

const FEATURES = [
  {
    icon: Zap,
    label: "Ventes en temps réel",
    desc: "POS + caisse intégrée, zéro latence",
    color: "hsl(36 88% 52%)",
  },
  {
    icon: Package,
    label: "Stock intelligent",
    desc: "Alertes automatiques, seuils configurables",
    color: "hsl(22 72% 56%)",
  },
  {
    icon: TrendingUp,
    label: "KPIs & rapports",
    desc: "Statistiques vendeurs, chiffre en direct",
    color: "hsl(152 50% 48%)",
  },
];

export function HeroFeatures() {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    itemRefs.current.forEach((el, i) => {
      if (!el) return
      el.style.opacity   = '0'
      el.style.transform = 'translateX(-36px)'
      setTimeout(() => {
        el.style.transition = `opacity 550ms cubic-bezier(0.16,1,0.3,1), transform 550ms cubic-bezier(0.16,1,0.3,1)`
        el.style.opacity    = '1'
        el.style.transform  = 'translateX(0)'
      }, 480 + i * 160)
    })
  }, [])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      {FEATURES.map(({ icon: Icon, label, desc, color }, index) => (
        <div
          key={label}
          ref={el => { itemRefs.current[index] = el }}
          style={{
            background:         "rgba(255,255,255,0.06)",
            backdropFilter:     "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border:             "1px solid rgba(255,255,255,0.10)",
            borderRadius:       16,
            padding:            "14px 18px",
            display:            "flex",
            alignItems:         "center",
            gap:                14,
            cursor:             "default",
            transition:         "border-color 220ms, background 220ms, box-shadow 220ms",
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLDivElement
            el.style.borderColor = "rgba(255,255,255,0.20)"
            el.style.background  = "rgba(255,255,255,0.10)"
            el.style.boxShadow   = "0 4px 24px rgba(0,0,0,0.18)"
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLDivElement
            el.style.borderColor = "rgba(255,255,255,0.10)"
            el.style.background  = "rgba(255,255,255,0.06)"
            el.style.boxShadow   = "none"
          }}
        >
          <div
            style={{
              width:          40,
              height:         40,
              minWidth:       40,
              borderRadius:   12,
              background:     `${color}22`,
              border:         `1px solid ${color}44`,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
            }}
          >
            <Icon size={19} color={color} strokeWidth={2} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#fff", lineHeight: 1.3 }}>
              {label}
            </span>
            <span style={{ fontSize: 12, color: "hsl(28 15% 60%)", lineHeight: 1.4 }}>
              {desc}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
