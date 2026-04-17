import { Store, Zap, Package } from 'lucide-react'

const BADGES = [
  { icon: Zap, label: 'Ventes en temps réel', color: 'hsl(36 88% 52%)' },
  { icon: Package, label: 'Stock intelligent', color: 'hsl(22 72% 56%)' },
]

export function MobileLoginHeader() {
  return (
    <div
      style={{
        display: 'block',
      }}
      className="lg:hidden"
    >
      {/* Header bar */}
      <div
        style={{
          background: 'linear-gradient(135deg, hsl(20 35% 7%), hsl(22 30% 11%))',
          padding: '20px 24px',
        }}
      >
        {/* Logo + brand in one row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Logo mark */}
          <div
            style={{
              width: 40,
              height: 40,
              minWidth: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))',
              boxShadow: '0 4px 14px hsl(22 72% 48% / 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Store size={22} color="white" strokeWidth={2} />
          </div>

          {/* Brand text + tagline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span
                style={{
                  fontSize: 17,
                  fontWeight: 900,
                  letterSpacing: '-0.03em',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  background:
                    'linear-gradient(135deg, #fff 0%, hsl(36 88% 72%) 60%, hsl(22 72% 60%) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  lineHeight: 1.2,
                }}
              >
                NAOSERVICES
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase' as const,
                  color: 'hsl(22 72% 56%)',
                  lineHeight: 1.2,
                }}
              >
                INVENTORY
              </span>
            </div>
            <span
              style={{
                fontSize: 12,
                color: 'hsl(28 20% 60%)',
                fontStyle: 'italic',
              }}
            >
              Gérez votre commerce, simplement.
            </span>
          </div>
        </div>
      </div>

      {/* Copper gradient line */}
      <div
        style={{
          height: 3,
          background:
            'linear-gradient(90deg, hsl(22 72% 48%), hsl(36 88% 52%), transparent)',
        }}
      />

      {/* Feature badges — horizontal scroll */}
      <div
        style={{
          background: 'linear-gradient(135deg, hsl(20 35% 7%), hsl(22 30% 11%))',
          padding: '10px 24px 14px',
          display: 'flex',
          gap: 8,
          overflowX: 'auto' as const,
          scrollbarWidth: 'none' as const,
          msOverflowStyle: 'none' as const,
        }}
      >
        {BADGES.map(({ icon: Icon, label, color }) => (
          <div
            key={label}
            style={{
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 100,
              padding: '4px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap' as const,
              flexShrink: 0,
            }}
          >
            <Icon size={12} color={color} strokeWidth={2.5} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'hsl(28 15% 75%)',
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
