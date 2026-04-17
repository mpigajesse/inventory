export function HeroDecor() {
  return (
    <>
      {/* Grain texture overlay for depth */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          opacity: 0.04,
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'1\'/%3E%3C/svg%3E")',
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px',
        }}
      />

      {/* Top-left corner accent lines */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 60,
          height: 60,
          zIndex: 1,
          borderTop: '1px solid hsl(22 72% 48% / 0.4)',
          borderLeft: '1px solid hsl(22 72% 48% / 0.4)',
          borderRadius: '0 0 8px 0',
        }}
      />

      {/* Bottom-right corner accent lines */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 60,
          height: 60,
          zIndex: 1,
          borderBottom: '1px solid hsl(22 72% 48% / 0.3)',
          borderRight: '1px solid hsl(22 72% 48% / 0.3)',
          borderRadius: '8px 0 0 0',
        }}
      />

      {/* Subtle "NAOSERVICES" watermark text */}
      <div
        style={{
          position: 'absolute',
          bottom: '40%',
          right: '-5%',
          zIndex: 0,
          fontSize: 'clamp(4rem, 8vw, 7rem)',
          fontWeight: 900,
          letterSpacing: '-0.04em',
          color: 'rgba(255,255,255,0.02)',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          userSelect: 'none',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          transform: 'rotate(-15deg)',
        }}
      >
        NAOSERVICES
      </div>
    </>
  );
}
