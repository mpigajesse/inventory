import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import { HeroBg }            from "./login/HeroBg";
import { HeroBrand }         from "./login/HeroBrand";
import { HeroDecor }         from "./login/HeroDecor";
import { HeroFeatures }      from "./login/HeroFeatures";
import { HeroStats }         from "./login/HeroStats";
import { FormInputs }        from "./login/FormInputs";
import { FormCTA }           from "./login/FormCTA";
import { DemoAccounts }      from "./login/DemoAccounts";
import { FormFooter }        from "./login/FormFooter";

export default function LoginPage() {
  const [username,     setUsername]     = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const { login }   = useAuth();
  const navigate    = useNavigate();
  const location    = useLocation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(username, password);
      // Redirect to the page the user originally requested, or fall back to /dashboard
      const from = (location.state as { from?: Location })?.from?.pathname ?? "/dashboard";
      navigate(from, { replace: true });
    } catch {
      setError("Identifiants incorrects. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", maxWidth: "100vw" }}>

      {/* Main split layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Left hero panel — clamp(380px, 48%, 560px), hidden on mobile ── */}
        <div
          className="hidden lg:flex"
          style={{
            position:       "relative",
            flex:           "0 0 clamp(380px, 48%, 560px)",
            overflow:       "hidden",
            flexDirection:  "column",
            justifyContent: "space-between",
            padding:        "clamp(2rem, 4vw, 3.5rem)",
            background:     "hsl(20 35% 7%)",
          }}
        >
          {/* Absolute background layer */}
          <HeroBg />

          {/* Decorative overlays */}
          <HeroDecor />

          {/* Brand — top */}
          <div style={{ position: "relative", zIndex: 2 }}>
            <HeroBrand />
          </div>

          {/* Feature list — centre */}
          <div
            style={{
              position:     "relative",
              zIndex:       2,
              flex:         1,
              display:      "flex",
              alignItems:   "center",
              paddingBlock: "2rem",
            }}
          >
            <HeroFeatures />
          </div>

          {/* Stats — bottom */}
          <div style={{ position: "relative", zIndex: 2 }}>
            <HeroStats />
          </div>
        </div>

        {/* ── Right form panel — flex-1, full width on mobile ── */}
        <div
          style={{
            flex:           1,
            background:     "hsl(30 20% 97%)",
            overflowY:      "auto",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            padding:        "clamp(1rem, 4vw, 3rem) clamp(0.75rem, 4vw, 3rem)",
          }}
        >
          {/* Form card */}
          <div
            style={{
              maxWidth:     440,
              width:        "100%",
              minWidth:     0,
              margin:       "0 auto",
              padding:      "clamp(1.25rem, 4vw, 3rem)",
              background:   "white",
              borderRadius: 24,
              boxShadow:    "0 4px 32px hsl(20 15% 15% / 0.08), 0 1px 4px hsl(20 15% 15% / 0.04)",
              display:      "flex",
              flexDirection: "column",
              gap:          24,
              boxSizing:    "border-box" as const,
            }}
          >
            <form
              onSubmit={handleSubmit}
              noValidate
              style={{ display: "flex", flexDirection: "column", gap: 20 }}
            >
              <FormInputs
                username={username}
                setUsername={setUsername}
                password={password}
                setPassword={setPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                error={error}
                isSubmitting={isSubmitting}
              />
              <FormCTA isSubmitting={isSubmitting} />
            </form>

            <DemoAccounts
              onSelect={(u, p) => {
                setUsername(u);
                setPassword(p);
              }}
            />

            <FormFooter />
          </div>
        </div>

      </div>
    </div>
  );
}
