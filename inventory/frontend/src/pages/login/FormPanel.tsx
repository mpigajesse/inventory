import { Store } from "lucide-react";
import { FormHeader } from "./FormHeader";
import { FormInputs } from "./FormInputs";
import { FormCTA } from "./FormCTA";
import { DemoAccounts } from "./DemoAccounts";
import { FormFooter } from "./FormFooter";

interface FormPanelProps {
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  error: string | null;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function FormPanel({
  username,
  setUsername,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  error,
  isSubmitting,
  onSubmit,
}: FormPanelProps) {
  const handleDemoSelect = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background: "hsl(30 20% 97%)",
        padding: "clamp(1.5rem, 5vw, 3rem) clamp(1rem, 4vw, 2.5rem)",
        minHeight: "100dvh",
        overflowY: "auto",
      }}
    >
      {/* Inner content — max-width 420px, centred */}
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          margin: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Mobile-only copper logo + brand name — hidden on lg+ */}
        <div
          className="lg:hidden"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "10px",
              background: "linear-gradient(135deg, hsl(22 72% 56%), hsl(22 72% 38%))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 2px 10px hsl(22 72% 48% / 0.30)",
            }}
          >
            <Store size={22} color="white" />
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: "16px",
              letterSpacing: "0.05em",
              color: "hsl(22 72% 38%)",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            NAOSERVICES
          </span>
        </div>

        {/* White card wrapping header + form */}
        <div
          style={{
            background: "white",
            borderRadius: "24px",
            padding: "clamp(1.5rem, 4vw, 2.5rem)",
            boxShadow:
              "0 4px 24px hsl(20 15% 15% / 0.08), 0 1px 4px hsl(20 15% 15% / 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: "28px",
          }}
        >
          <FormHeader />

          <form
            onSubmit={onSubmit}
            noValidate
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
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
        </div>

        {/* Demo accounts — below card */}
        <DemoAccounts onSelect={handleDemoSelect} />

        {/* Footer — trust badges + legal */}
        <FormFooter />
      </div>
    </div>
  );
}
