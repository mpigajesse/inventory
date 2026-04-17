import { Loader2, LogIn } from "lucide-react";

interface FormCTAProps {
  isSubmitting: boolean;
  label?: string;
}

export function FormCTA({ isSubmitting, label = "Se connecter" }: FormCTAProps) {
  return (
    <>
      <style>{`
        .form-cta-btn {
          position: relative;
          width: 100%;
          height: 54px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, hsl(22 72% 44%), hsl(22 72% 52%), hsl(36 88% 52%));
          background-size: 200% auto;
          background-position: left center;
          color: white;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          overflow: hidden;
          transition:
            background-position 300ms ease,
            box-shadow 300ms ease,
            transform 300ms ease,
            opacity 300ms ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .form-cta-btn:not(:disabled):hover {
          background-position: right center;
          box-shadow: 0 8px 24px hsl(22 72% 48% / 0.45);
          transform: translateY(-1px);
        }

        .form-cta-btn:not(:disabled):active {
          transform: translateY(0);
          box-shadow: 0 4px 12px hsl(22 72% 48% / 0.3);
        }

        .form-cta-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .form-cta-shine {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 60px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent);
          transform: skewX(-15deg);
          left: -60px;
          transition: none;
          pointer-events: none;
        }

        .form-cta-btn:not(:disabled):hover .form-cta-shine {
          animation: cta-shine 600ms ease forwards;
        }

        @keyframes cta-shine {
          from {
            left: -60px;
          }
          to {
            left: calc(100% + 60px);
          }
        }
      `}</style>

      <button
        type="submit"
        disabled={isSubmitting}
        className="form-cta-btn"
        aria-busy={isSubmitting}
      >
        <span className="form-cta-shine" />
        {isSubmitting ? (
          <>
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            <span>Connexion en cours...</span>
          </>
        ) : (
          <>
            <LogIn size={18} aria-hidden="true" />
            <span>{label}</span>
          </>
        )}
      </button>
    </>
  );
}
