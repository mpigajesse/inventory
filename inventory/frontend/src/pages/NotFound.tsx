import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'hsl(30 20% 97%)' }}
    >
      <div className="text-center max-w-md">

        {/* 404 gradient */}
        <div
          className="text-8xl font-extrabold mb-4 font-heading leading-none select-none"
          style={{
            background: 'linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%), hsl(152 38% 38%))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.04em',
          }}
        >
          404
        </div>

        <h1
          className="text-2xl font-extrabold text-foreground font-heading mb-2"
          style={{ letterSpacing: '-0.025em' }}
        >
          Page introuvable
        </h1>
        <p className="text-muted-foreground text-sm mb-8">
          Cette page n'existe pas ou vous n'avez pas les droits nécessaires.
        </p>

        <Link to="/">
          <button
            type="button"
            style={{
              background: 'linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '0.75rem 1.5rem',
              fontWeight: '600',
              fontSize: '0.9rem',
              boxShadow: '0 4px 14px hsl(22 72% 48% / 0.35)',
              cursor: 'pointer',
              transition: 'opacity 0.15s, transform 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '0.9';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '1';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            ← Retour au tableau de bord
          </button>
        </Link>

        <p className="text-xs text-muted-foreground/50 mt-8">
          NAOSERVICES INVENTORY · MPJ HIGH-TECH
        </p>
      </div>
    </div>
  );
};

export default NotFound;
