import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

const NotFound = () => {
  const location = useLocation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    // Trigger mount animations on next frame so initial opacity:0 is painted first
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, [location.pathname]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'hsl(30 20% 97%)' }}
    >
      <div className="text-center max-w-md">

        {/* 404 gradient text trois tons */}
        <div
          className="font-extrabold mb-4 font-heading leading-none select-none"
          style={{
            fontSize: 'clamp(5rem, 15vw, 9rem)',
            background: 'linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%), hsl(152 38% 38%))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.05em',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'scale(1)' : 'scale(0.92)',
            transition: 'opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          404
        </div>

        <h1
          className="text-foreground font-heading mb-2"
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 400ms ease 200ms, transform 400ms ease 200ms',
          }}
        >
          Page introuvable
        </h1>
        <p
          className="text-muted-foreground text-sm mb-8"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 400ms ease 200ms, transform 400ms ease 200ms',
          }}
        >
          Cette page n'existe pas ou vous n'avez pas les droits nécessaires.
        </p>

        <Link to="/">
          <button
            type="button"
            style={{
              background: 'linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))',
              color: 'white',
              border: 'none',
              borderRadius: 14,
              padding: '0.75rem 1.5rem',
              fontWeight: 600,
              fontSize: '0.9rem',
              boxShadow: '0 8px 20px hsl(22 72% 48% / 0.35)',
              cursor: 'pointer',
              minHeight: '44px',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease, opacity 400ms ease 350ms',
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(10px)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 28px hsl(22 72% 48% / 0.45), 0 0 0 4px hsl(22 72% 48% / 0.15)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 20px hsl(22 72% 48% / 0.35)';
            }}
          >
            ← Retour au tableau de bord
          </button>
        </Link>

        <p
          className="text-muted-foreground/50 mt-8"
          style={{
            fontSize: 12,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            opacity: mounted ? 0.5 : 0,
            transition: 'opacity 600ms ease 500ms',
          }}
        >
          NAOSERVICES INVENTORY · MPJ HIGH-TECH
        </p>
      </div>
    </div>
  );
};

export default NotFound;
