import { Lock, ShieldCheck } from "lucide-react";

export function FormFooter() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Trust badges */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            background: "hsl(152 38% 38% / 0.08)",
            border: "1px solid hsl(152 38% 38% / 0.20)",
            borderRadius: "100px",
            padding: "3px 10px",
            fontSize: "11px",
            fontWeight: 600,
            color: "hsl(152 38% 38%)",
          }}
        >
          <Lock size={12} />
          Chiffrement SSL
        </span>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            background: "hsl(152 38% 38% / 0.08)",
            border: "1px solid hsl(152 38% 38% / 0.20)",
            borderRadius: "100px",
            padding: "3px 10px",
            fontSize: "11px",
            fontWeight: 600,
            color: "hsl(152 38% 38%)",
          }}
        >
          <ShieldCheck size={12} />
          Données sécurisées
        </span>
      </div>

      {/* Divider */}
      <div
        style={{
          height: "1px",
          background: "hsl(var(--border))",
        }}
      />

      {/* Bottom row */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "3px",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "hsl(var(--muted-foreground))",
            fontWeight: 600,
          }}
        >
          NAOSERVICES INVENTORY
        </span>
        <span
          style={{
            fontSize: "10px",
            color: "hsl(var(--muted-foreground))",
          }}
        >
          v1.0 — MPJ HIGH-TECH × Naoservices
        </span>
      </div>
    </div>
  );
}
