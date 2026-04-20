import { useState } from "react";
import { User, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

interface FormInputsProps {
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  error: string | null;
  isSubmitting: boolean;
}

const COPPER = "hsl(22 72% 48%)";
const COPPER_RING = "hsl(22 72% 48% / 0.12)";

function inputStyle(focused: boolean, hasError: boolean): React.CSSProperties {
  return {
    width: "100%",
    height: "54px",
    borderRadius: "14px",
    border: `1.5px solid ${hasError ? "#ef4444" : focused ? COPPER : "hsl(var(--border))"}`,
    padding: "0 16px 0 44px",
    fontSize: "16px",
    background: "hsl(var(--background))",
    color: "hsl(var(--foreground))",
    outline: "none",
    boxShadow: focused ? `0 0 0 3.5px ${COPPER_RING}` : hasError ? "0 0 0 3.5px rgba(239,68,68,0.12)" : "none",
    transition: "all 200ms",
    boxSizing: "border-box" as const,
  };
}

function iconStyle(focused: boolean): React.CSSProperties {
  return {
    position: "absolute" as const,
    left: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    color: focused ? COPPER : "hsl(var(--muted-foreground))",
    transition: "color 200ms",
    pointerEvents: "none" as const,
  };
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: "hsl(20 20% 35%)",
  letterSpacing: "0.01em",
  marginBottom: "6px",
};

export function FormInputs({
  username,
  setUsername,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  error,
  isSubmitting,
}: FormInputsProps) {
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const hasError = !!error;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Username field */}
      <div
        style={{
          opacity: 0,
          animation: "slideInUp 340ms ease forwards",
          animationDelay: "0ms",
        }}
      >
        <label htmlFor="login-username" style={labelStyle}>
          Nom d'utilisateur
        </label>
        <div style={{ position: "relative", height: "54px" }}>
          <span style={iconStyle(usernameFocused)}>
            <User size={18} />
          </span>
          <input
            id="login-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onFocus={() => setUsernameFocused(true)}
            onBlur={() => setUsernameFocused(false)}
            disabled={isSubmitting}
            style={inputStyle(usernameFocused, hasError)}
            placeholder="Votre identifiant"
          />
        </div>
      </div>

      {/* Password field */}
      <div
        style={{
          opacity: 0,
          animation: "slideInUp 340ms ease forwards",
          animationDelay: "120ms",
        }}
      >
        <label htmlFor="login-password" style={labelStyle}>
          Mot de passe
        </label>
        <div style={{ position: "relative", height: "54px" }}>
          <span style={iconStyle(passwordFocused)}>
            <Lock size={18} />
          </span>
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            disabled={isSubmitting}
            style={{
              ...inputStyle(passwordFocused, hasError),
              paddingRight: "48px",
            }}
            placeholder="Votre mot de passe"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isSubmitting}
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            style={{
              position: "absolute",
              right: "8px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              padding: "8px",
              minWidth: "44px",
              minHeight: "44px",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              color: "hsl(var(--muted-foreground))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 200ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = COPPER;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "hsl(var(--muted-foreground))";
            }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "#ef4444",
            fontSize: "13px",
            fontWeight: 500,
            marginTop: "-8px",
            animation: "slideInUp 220ms ease",
          }}
          role="alert"
        >
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
