import { useState } from "react";

interface DemoAccount {
  name: string;
  username: string;
  password: string;
  roleLabel: string;
  initials: string;
  isAdmin?: boolean;
}

interface DemoAccountsProps {
  onSelect: (username: string, password: string) => void;
}

const ACCOUNTS: DemoAccount[] = [
  { name: "Admin Principal", username: "admin", password: "Admin1234!", roleLabel: "Admin", initials: "AP", isAdmin: true },
  { name: "Marie Koumba", username: "vendeur1", password: "Vendeur1234!", roleLabel: "Vendeur·se", initials: "MK" },
  { name: "Paul Moussavou", username: "vendeur2", password: "Vendeur1234!", roleLabel: "Vendeur·se", initials: "PM" },
];

const COPPER_GRADIENT = "linear-gradient(135deg, hsl(22 72% 48%), hsl(30 80% 38%))";
const FOREST_GRADIENT = "linear-gradient(135deg, hsl(145 45% 35%), hsl(160 50% 28%))";

function AccountCard({ account, onSelect }: { account: DemoAccount; onSelect: DemoAccountsProps["onSelect"] }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onSelect(account.username, account.password)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "hsl(22 72% 48% / 0.06)" : "hsl(var(--muted) / 0.4)",
        border: `1px solid ${hovered ? "hsl(22 72% 48% / 0.4)" : "hsl(var(--border))"}`,
        borderRadius: 12,
        padding: "10px 14px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 10,
        transition: "border-color 150ms, background 150ms",
        minWidth: 0,
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: account.isAdmin ? COPPER_GRADIENT : FOREST_GRADIENT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, lineHeight: 1 }}>
          {account.initials}
        </span>
      </div>

      {/* Info */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground))", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {account.name}
        </div>
        <div style={{ marginTop: 3 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              padding: "2px 6px",
              borderRadius: 99,
              background: account.isAdmin ? "hsl(22 72% 48% / 0.1)" : "hsl(145 45% 35% / 0.1)",
              color: account.isAdmin ? "hsl(22 72% 38%)" : "hsl(145 45% 30%)",
              display: "inline-block",
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {account.roleLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

export function DemoAccounts({ onSelect }: DemoAccountsProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header with dividers */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, height: 1, background: "hsl(var(--border))" }} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "hsl(var(--muted-foreground))",
            whiteSpace: "nowrap",
          }}
        >
          Comptes de démonstration
        </span>
        <div style={{ flex: 1, height: 1, background: "hsl(var(--border))" }} />
      </div>

      {/* Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          overflowX: "auto",
        }}
        className="demo-accounts-grid"
      >
        {ACCOUNTS.map((account) => (
          <AccountCard key={account.username} account={account} onSelect={onSelect} />
        ))}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .demo-accounts-grid {
            grid-template-columns: repeat(3, minmax(140px, 1fr)) !important;
          }
        }
      `}</style>
    </div>
  );
}
