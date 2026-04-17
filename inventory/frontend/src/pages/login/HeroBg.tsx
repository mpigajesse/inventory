export function HeroBg() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <style>{`
        @keyframes orbDrift1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-40px) scale(1.08)} }
        @keyframes orbDrift2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-20px,30px) scale(0.94)} }
        @keyframes orbDrift3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(15px,20px) scale(1.05)} }
        @keyframes starPulse { 0%,100%{opacity:0.3} 50%{opacity:0.8} }
      `}</style>

      {/* Base gradient */}
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg, hsl(20 35% 5%) 0%, hsl(22 30% 9%) 40%, hsl(18 28% 7%) 100%)' }} />

      {/* Mesh grid */}
      <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(hsl(0 0% 100% / 0.025) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / 0.025) 1px, transparent 1px)', backgroundSize:'44px 44px' }} />

      {/* Orb 1 — copper, top-right */}
      <div style={{ position:'absolute', top:'-10%', right:'-5%', width:420, height:420, borderRadius:'50%', background:'radial-gradient(circle, hsl(22 72% 48% / 0.18) 0%, transparent 70%)', filter:'blur(60px)', animation:'orbDrift1 9s ease-in-out infinite', willChange:'transform' }} />

      {/* Orb 2 — amber, bottom-left */}
      <div style={{ position:'absolute', bottom:'-5%', left:'-8%', width:360, height:360, borderRadius:'50%', background:'radial-gradient(circle, hsl(36 88% 52% / 0.12) 0%, transparent 70%)', filter:'blur(70px)', animation:'orbDrift2 12s ease-in-out 1s infinite', willChange:'transform' }} />

      {/* Orb 3 — forest, center */}
      <div style={{ position:'absolute', top:'40%', left:'30%', width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle, hsl(152 38% 38% / 0.09) 0%, transparent 70%)', filter:'blur(50px)', animation:'orbDrift3 15s ease-in-out 3s infinite', willChange:'transform' }} />

      {/* Star dots — scattered micro dots */}
      {[{t:'15%',l:'20%',d:'0s'},{t:'35%',l:'75%',d:'0.5s'},{t:'60%',l:'15%',d:'1s'},{t:'80%',l:'60%',d:'1.5s'},{t:'25%',l:'45%',d:'2s'},{t:'70%',l:'85%',d:'2.5s'}].map((dot, i) => (
        <div key={i} style={{ position:'absolute', top:dot.t, left:dot.l, width:2, height:2, borderRadius:'50%', background:'white', opacity:0.4, animation:`starPulse ${2 + i * 0.4}s ease-in-out ${dot.d} infinite` }} />
      ))}
    </div>
  );
}
