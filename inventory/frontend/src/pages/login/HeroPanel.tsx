import { HeroBg } from './HeroBg'
import { HeroBrand } from './HeroBrand'
import { HeroFeatures } from './HeroFeatures'
import { HeroStats } from './HeroStats'

export function HeroPanel() {
  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      {/* Absolute dark animated background at z-0 */}
      <HeroBg />

      {/* Content layer at z-1 */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          gap: 'clamp(1.5rem, 3vh, 2.5rem)',
        }}
      >
        {/* Brand block — top */}
        <div>
          <HeroBrand />
        </div>

        {/* Feature cards — vertically centred in remaining space */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <HeroFeatures />
        </div>

        {/* Stats bar — bottom */}
        <div>
          <HeroStats />
        </div>
      </div>

      {/* Gradient separator at the right edge (panel / form boundary) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 1,
          background:
            'linear-gradient(to bottom, transparent, hsl(22 72% 48% / 0.3) 30%, hsl(36 88% 52% / 0.2) 70%, transparent)',
          zIndex: 2,
        }}
      />
    </div>
  )
}
