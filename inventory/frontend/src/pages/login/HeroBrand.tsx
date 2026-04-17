import { Store } from 'lucide-react'
import { useEffect, useRef } from 'react'

export function HeroBrand() {
  const logoRef  = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const tagRef   = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const els = [
      { el: logoRef.current,  delay: 80  },
      { el: titleRef.current, delay: 220 },
      { el: tagRef.current,   delay: 360 },
    ]

    els.forEach(({ el, delay }) => {
      if (!el) return
      el.style.opacity   = '0'
      el.style.transform = 'translateY(32px)'
      setTimeout(() => {
        el.style.transition = 'opacity 600ms cubic-bezier(0.16,1,0.3,1), transform 600ms cubic-bezier(0.16,1,0.3,1)'
        el.style.opacity    = '1'
        el.style.transform  = 'translateY(0)'
      }, delay)
    })
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
      {/* Logo mark */}
      <div ref={logoRef} style={{ marginBottom: 16 }}>
        <div
          style={{
            width:      52,
            height:     52,
            borderRadius: 14,
            background: 'linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))',
            boxShadow:  '0 8px 32px hsl(22 72% 48% / 0.5), 0 2px 8px hsl(22 72% 48% / 0.3)',
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Store size={28} color="white" strokeWidth={2} />
        </div>
      </div>

      {/* Title + subtitle */}
      <div ref={titleRef} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span
          style={{
            fontSize:   'clamp(1.7rem, 3vw, 2.4rem)',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            background: 'linear-gradient(135deg, #fff 0%, hsl(36 88% 78%) 55%, hsl(22 72% 62%) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor:  'transparent',
            backgroundClip: 'text',
            lineHeight: 1.1,
          }}
        >
          NAOSERVICES
        </span>
        <span
          style={{
            fontSize:      11,
            fontWeight:    700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color:         'hsl(22 72% 56%)',
          }}
        >
          INVENTORY
        </span>
      </div>

      {/* Tagline */}
      <p
        ref={tagRef}
        style={{
          fontSize:   'clamp(0.88rem, 1.4vw, 1rem)',
          color:      'hsl(28 18% 60%)',
          fontStyle:  'italic',
          margin:     '10px 0 0 0',
          lineHeight: 1.5,
        }}
      >
        Gérez votre commerce, simplement.
      </p>
    </div>
  )
}
