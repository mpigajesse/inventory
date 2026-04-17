import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import type { VendeurActivitySummary } from '@/services/activityService';

// ─── helpers ────────────────────────────────────────────────────────────────

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diffMs)) return '—';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} j`;
}

function formatRevenue(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA';
}

// ─── inline status logic (mirrors VendeurOnlineBadge) ───────────────────────

type Status = 'online' | 'idle' | 'offline';

function resolveStatus(lastSeen: string | null | undefined, isOnline?: boolean): Status {
  if (isOnline === true) return 'online';
  if (!lastSeen) return 'offline';
  const diffMs = Date.now() - new Date(lastSeen).getTime();
  if (isNaN(diffMs)) return 'offline';
  const diffMinutes = diffMs / 60_000;
  if (diffMinutes <= 5) return 'online';
  if (diffMinutes <= 30) return 'idle';
  return 'offline';
}

const STATUS_CONFIG: Record<Status, { color: string; label: string; animation: string }> = {
  online: {
    color: 'hsl(152 52% 42%)',
    label: 'En ligne',
    animation: 'vcOnlinePulse 2s ease-in-out infinite',
  },
  idle: {
    color: 'hsl(36 88% 52%)',
    label: 'Inactif',
    animation: 'vcIdlePulse 3s ease-in-out infinite',
  },
  offline: {
    color: 'hsl(22 15% 65%)',
    label: 'Hors ligne',
    animation: 'none',
  },
};

// ─── component ───────────────────────────────────────────────────────────────

interface VendeurCardProps {
  vendeur: VendeurActivitySummary;
  isTop: boolean;
  isNew?: boolean;
  onClick: () => void;
}

export function VendeurCard({ vendeur, isTop, isNew = false, onClick }: VendeurCardProps) {
  const [hovered, setHovered] = useState(false);

  const status = resolveStatus(vendeur.last_seen, vendeur.is_online);
  const statusCfg = STATUS_CONFIG[status];

  const borderColor = isTop ? 'hsl(43 74% 49%)' : 'hsl(22 55% 52%)';

  const baseBoxShadow = hovered
    ? '0 8px 24px hsl(0 0% 0% / 0.13)'
    : '0 2px 8px hsl(0 0% 0% / 0.07)';

  const boxShadow = isNew
    ? `${baseBoxShadow}, 0 0 0 2px hsl(152 52% 42%)`
    : baseBoxShadow;

  const border = isNew ? '1px solid hsl(152 52% 42% / 0.4)' : '1px solid hsl(0 0% 90%)';

  return (
    <>
      <style>{`
        @keyframes vcOnlinePulse {
          0%, 100% { box-shadow: 0 0 0 0 hsl(152 52% 42% / 0.4); }
          50%       { box-shadow: 0 0 0 4px hsl(152 52% 42% / 0); }
        }
        @keyframes vcIdlePulse {
          0%, 100% { box-shadow: 0 0 0 0 hsl(36 88% 52% / 0.4); }
          50%       { box-shadow: 0 0 0 4px hsl(36 88% 52% / 0); }
        }
      `}</style>

      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          backgroundColor: '#ffffff',
          borderRadius: 16,
          padding: '18px',
          border,
          borderLeft: `4px solid ${borderColor}`,
          boxShadow,
          transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
          transition: 'transform 200ms ease, box-shadow 200ms ease',
          cursor: 'pointer',
          outline: 'none',
          userSelect: 'none',
        }}
      >
        {/* Top-right badge */}
        {isTop && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              right: 14,
              background: 'linear-gradient(135deg, hsl(43 74% 49%), hsl(36 88% 62%))',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.04em',
              padding: '3px 9px',
              borderRadius: 20,
              textTransform: 'uppercase',
              boxShadow: '0 2px 6px hsl(43 74% 49% / 0.4)',
            }}
          >
            Top vendeur
          </div>
        )}

        {/* Header row: avatar + name/role + online badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          {/* Avatar */}
          <div
            style={{
              flexShrink: 0,
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, hsl(22 55% 52%), hsl(22 45% 38%))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}
          >
            {getInitials(vendeur.full_name)}
          </div>

          {/* Name + role */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'hsl(222 20% 14%)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.3,
              }}
            >
              {vendeur.full_name}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'hsl(222 12% 55%)',
                marginTop: 2,
                lineHeight: 1.2,
              }}
            >
              Vendeur
            </div>
          </div>

          {/* Online badge (inlined) */}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: statusCfg.color,
                animation: statusCfg.animation,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 11,
                lineHeight: 1,
                color: statusCfg.color,
                fontWeight: 500,
              }}
            >
              {statusCfg.label}
            </span>
          </span>
        </div>

        {/* Big number: sales count */}
        <div style={{ marginBottom: 12, textAlign: 'center' }}>
          <span
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: 'hsl(222 20% 14%)',
              lineHeight: 1,
            }}
          >
            {vendeur.sales_count}
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'hsl(222 12% 55%)',
              marginLeft: 6,
            }}
          >
            ventes
          </span>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            gap: 1,
            borderRadius: 10,
            overflow: 'hidden',
            marginBottom: 12,
            background: 'hsl(222 15% 94%)',
          }}
        >
          {/* Revenue */}
          <div
            style={{
              flex: 1,
              padding: '8px 10px',
              background: 'hsl(222 15% 96%)',
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: 'hsl(222 12% 55%)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 2,
              }}
            >
              Revenus
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'hsl(152 52% 38%)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {formatRevenue(vendeur.total_revenue)}
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              flex: 1,
              padding: '8px 10px',
              background: 'hsl(222 15% 96%)',
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: 'hsl(222 12% 55%)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 2,
              }}
            >
              Actions
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'hsl(222 20% 30%)',
              }}
            >
              {vendeur.action_count}
            </div>
          </div>
        </div>

        {/* Last action row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'hsl(222 12% 55%)',
          }}
        >
          <Clock size={12} strokeWidth={2} style={{ flexShrink: 0 }} />
          <span
            style={{
              fontSize: 11,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
            }}
          >
            {vendeur.last_action
              ? `${vendeur.last_action} · ${formatTimeAgo(vendeur.last_action_at)}`
              : formatTimeAgo(vendeur.last_action_at)}
          </span>
        </div>
      </div>
    </>
  );
}
