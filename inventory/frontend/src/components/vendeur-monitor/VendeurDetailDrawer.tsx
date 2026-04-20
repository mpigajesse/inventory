import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { X, ExternalLink, Clock, ShoppingBag, Activity } from 'lucide-react';
import { api } from '@/lib/api';

// ── Inline online-status logic (mirrors VendeurOnlineBadge resolution) ────────

type OnlineStatus = 'online' | 'idle' | 'offline';

function resolveOnlineStatus(lastSeen: string | null | undefined): OnlineStatus {
  if (!lastSeen) return 'offline';
  const diffMinutes = (Date.now() - new Date(lastSeen).getTime()) / 60_000;
  if (isNaN(diffMinutes)) return 'offline';
  if (diffMinutes <= 5) return 'online';
  if (diffMinutes <= 30) return 'idle';
  return 'offline';
}

const ONLINE_STATUS_STYLES: Record<OnlineStatus, { color: string; label: string; pulse: string }> = {
  online: { color: 'hsl(152 52% 42%)', label: 'En ligne', pulse: 'onlinePulse 2s ease-in-out infinite' },
  idle:   { color: 'hsl(36 88% 52%)',  label: 'Inactif',  pulse: 'idlePulse 3s ease-in-out infinite' },
  offline:{ color: 'hsl(22 15% 65%)',  label: 'Hors ligne', pulse: 'none' },
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface VendeurDetailDrawerProps {
  vendeurId: number | null;
  vendeurName: string | null;
  onClose: () => void;
}

interface ActivityItem {
  id: number;
  timestamp: string;
  description: string;
  activity_type?: string;
}

interface ActivityResponse {
  results?: ActivityItem[];
  count?: number;
}

interface VendeurSummary {
  sales_count_today?: number;
  revenue_today?: number;
  last_seen?: string | null;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatFCFA(amount: number | undefined): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

function activityIcon(type: string | undefined) {
  if (!type) return <Activity size={14} />;
  if (type.includes('sale') || type.includes('vente')) return <ShoppingBag size={14} />;
  if (type.includes('login') || type.includes('logout')) return <Clock size={14} />;
  return <Activity size={14} />;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function VendeurDetailDrawer({ vendeurId, vendeurName, onClose }: VendeurDetailDrawerProps) {
  const isOpen = vendeurId !== null;

  // Fetch vendeur summary (sales_count_today, revenue_today, last_seen)
  // queryKey uses 'vendeur-detail-summary' to avoid collision with the monitor's
  // ['vendeur-summary', period] key which is invalidated by the global refetch.
  const { data: summary } = useQuery<VendeurSummary>({
    queryKey: ['vendeur-detail-summary', vendeurId],
    queryFn: async () => {
      // Guard: vendeurId is guaranteed non-null here because enabled ensures it,
      // but we cast explicitly to satisfy TypeScript and avoid /users/null/ calls.
      if (vendeurId === null) throw new Error('vendeurId is null');
      const { data } = await api.get(`/users/${vendeurId}/summary/`);
      return data;
    },
    enabled: isOpen && vendeurId !== null,
    staleTime: 30_000,
  });

  // Fetch today's activity timeline
  const { data: activityData, isLoading: activityLoading } = useQuery<ActivityResponse>({
    queryKey: ['vendeur-detail-activity', vendeurId],
    queryFn: async () => {
      if (vendeurId === null) throw new Error('vendeurId is null');
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await api.get('/activity/', {
        params: { user_id: vendeurId, date: today, page_size: 10 },
      });
      return data;
    },
    enabled: isOpen && vendeurId !== null,
    staleTime: 30_000,
  });

  const activities: ActivityItem[] = activityData?.results ?? [];
  const status = resolveOnlineStatus(summary?.last_seen);
  const statusCfg = ONLINE_STATUS_STYLES[status];

  // Derive initials for avatar
  const initials = vendeurName
    ? vendeurName
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('')
    : '?';

  return (
    <>
      <style>{`
        @keyframes onlinePulse {
          0%, 100% { box-shadow: 0 0 0 0 hsl(152 52% 42% / 0.4); }
          50%       { box-shadow: 0 0 0 4px hsl(152 52% 42% / 0); }
        }
        @keyframes idlePulse {
          0%, 100% { box-shadow: 0 0 0 0 hsl(36 88% 52% / 0.4); }
          50%       { box-shadow: 0 0 0 4px hsl(36 88% 52% / 0); }
        }
        @keyframes drawerSlideIn {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>

      {/* Scrim */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            zIndex: 49,
          }}
        />
      )}

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(380px, 100vw)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          background: 'hsl(var(--card, 0 0% 100%))',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.18)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          animation: isOpen ? 'drawerSlideIn 300ms cubic-bezier(0.16,1,0.3,1) forwards' : 'none',
          transition: isOpen ? 'none' : 'transform 200ms ease-in',
          overflowY: 'auto',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={vendeurName ? `Détail de ${vendeurName}` : 'Détail vendeur'}
      >
        {isOpen && (
          <>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '20px 20px 16px',
                borderBottom: '1px solid hsl(var(--border, 220 13% 91%))',
                position: 'sticky',
                top: 0,
                background: 'hsl(var(--card, 0 0% 100%))',
                zIndex: 1,
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'hsl(var(--primary, 221 83% 53%) / 0.12)',
                  color: 'hsl(var(--primary, 221 83% 53%))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 15,
                  flexShrink: 0,
                  letterSpacing: '0.03em',
                }}
              >
                {initials}
              </div>

              {/* Name + role + badge */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 15,
                    color: 'hsl(var(--foreground, 222 47% 11%))',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {vendeurName ?? '—'}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 3,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: 'hsl(var(--muted-foreground, 215 16% 47%))',
                      fontWeight: 500,
                    }}
                  >
                    Vendeur
                  </span>
                  {/* Inline online badge */}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: statusCfg.color,
                        animation: statusCfg.pulse,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 11,
                        color: statusCfg.color,
                        fontWeight: 500,
                        lineHeight: 1,
                      }}
                    >
                      {statusCfg.label}
                    </span>
                  </span>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                aria-label="Fermer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: '1px solid hsl(var(--border, 220 13% 91%))',
                  background: 'transparent',
                  color: 'hsl(var(--muted-foreground, 215 16% 47%))',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background 150ms, color 150ms',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    'hsl(var(--muted, 210 40% 96%))';
                  (e.currentTarget as HTMLButtonElement).style.color =
                    'hsl(var(--foreground, 222 47% 11%))';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color =
                    'hsl(var(--muted-foreground, 215 16% 47%))';
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* ── Quick stats ─────────────────────────────────────────────── */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                padding: '16px 20px',
                borderBottom: '1px solid hsl(var(--border, 220 13% 91%))',
              }}
            >
              {/* Sales count */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'hsl(var(--muted, 210 40% 96%))',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: 'hsl(var(--muted-foreground, 215 16% 47%))',
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  <ShoppingBag size={12} />
                  Ventes aujourd'hui
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: 'hsl(var(--foreground, 222 47% 11%))',
                    lineHeight: 1.2,
                  }}
                >
                  {summary?.sales_count_today ?? '—'}
                </div>
              </div>

              {/* Revenue */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'hsl(var(--muted, 210 40% 96%))',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: 'hsl(var(--muted-foreground, 215 16% 47%))',
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  <Activity size={12} />
                  Chiffre du jour
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'hsl(var(--foreground, 222 47% 11%))',
                    lineHeight: 1.3,
                    wordBreak: 'break-all',
                  }}
                >
                  {formatFCFA(summary?.revenue_today)}
                </div>
              </div>
            </div>

            {/* ── Activity timeline ────────────────────────────────────────── */}
            <div style={{ flex: 1, padding: '16px 20px' }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'hsl(var(--muted-foreground, 215 16% 47%))',
                  marginBottom: 14,
                }}
              >
                Activité récente
              </div>

              {activityLoading && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        height: 40,
                        borderRadius: 8,
                        background: 'hsl(var(--muted, 210 40% 96%))',
                        opacity: 1 - i * 0.15,
                      }}
                    />
                  ))}
                </div>
              )}

              {!activityLoading && activities.length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '32px 0',
                    color: 'hsl(var(--muted-foreground, 215 16% 47%))',
                    fontSize: 13,
                  }}
                >
                  Aucune activité aujourd'hui
                </div>
              )}

              {!activityLoading && activities.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                  }}
                >
                  {/* Vertical line */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 15,
                      top: 8,
                      bottom: 8,
                      width: 1,
                      background: 'hsl(var(--border, 220 13% 91%))',
                    }}
                  />

                  {activities.map((item, idx) => (
                    <div
                      key={item.id ?? idx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        paddingBottom: idx < activities.length - 1 ? 16 : 0,
                        position: 'relative',
                      }}
                    >
                      {/* Icon bubble */}
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          background: 'hsl(var(--background, 0 0% 100%))',
                          border: '1.5px solid hsl(var(--border, 220 13% 91%))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'hsl(var(--muted-foreground, 215 16% 47%))',
                          flexShrink: 0,
                          zIndex: 1,
                        }}
                      >
                        {activityIcon(item.activity_type)}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0, paddingTop: 5 }}>
                        <div
                          style={{
                            fontSize: 13,
                            color: 'hsl(var(--foreground, 222 47% 11%))',
                            lineHeight: 1.4,
                          }}
                        >
                          {item.description}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            marginTop: 3,
                            color: 'hsl(var(--muted-foreground, 215 16% 47%))',
                            fontSize: 11,
                          }}
                        >
                          <Clock size={10} />
                          {formatTime(item.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Footer: link to full profile ─────────────────────────────── */}
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid hsl(var(--border, 220 13% 91%))',
                position: 'sticky',
                bottom: 0,
                background: 'hsl(var(--card, 0 0% 100%))',
              }}
            >
              <Link
                to={`/users/${vendeurId}`}
                onClick={onClose}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'hsl(var(--primary, 221 83% 53%))',
                  textDecoration: 'none',
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid hsl(var(--primary, 221 83% 53%) / 0.3)',
                  transition: 'background 150ms',
                  width: '100%',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background =
                    'hsl(var(--primary, 221 83% 53%) / 0.08)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                }}
              >
                Voir le profil complet
                <ExternalLink size={14} />
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}
