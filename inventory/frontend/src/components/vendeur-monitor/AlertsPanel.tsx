import { useState } from 'react';
import { Bell, AlertTriangle, Info, X, CheckCircle } from 'lucide-react';
import type { VendeurAlert } from '@/services/activityService';

interface AlertsPanelProps {
  alerts: VendeurAlert[];
  onDismiss: (id: string) => void;
  isLoading?: boolean;
}

const SEVERITY_COLORS = {
  critical: 'hsl(0 72% 51%)',
  warning: 'hsl(36 88% 52%)',
  info: 'hsl(210 70% 50%)',
} as const;

const MAX_VISIBLE = 8;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'à l\'instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

function getMaxSeverity(alerts: VendeurAlert[]): 'critical' | 'warning' | 'info' {
  if (alerts.some(a => a.severity === 'critical')) return 'critical';
  if (alerts.some(a => a.severity === 'warning')) return 'warning';
  return 'info';
}

export default function AlertsPanel({ alerts, onDismiss, isLoading }: AlertsPanelProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const visible = alerts.slice(0, MAX_VISIBLE);
  const overflow = alerts.length - MAX_VISIBLE;
  const maxSeverity = alerts.length > 0 ? getMaxSeverity(alerts) : 'info';
  const badgeColor = SEVERITY_COLORS[maxSeverity];

  return (
    <>
      <style>{`
        @keyframes alertSlideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div style={{
        background: '#fff',
        borderRadius: 16,
        border: '1px solid hsl(220 13% 91%)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '16px 20px',
          borderBottom: '1px solid hsl(220 13% 91%)',
        }}>
          <Bell size={18} color="hsl(220 13% 46%)" />
          <span style={{ fontWeight: 600, fontSize: 14, color: 'hsl(220 13% 18%)', flex: 1 }}>
            Alertes intelligentes
          </span>
          {alerts.length > 0 && (
            <span style={{
              background: badgeColor,
              color: '#fff',
              borderRadius: 20,
              padding: '2px 9px',
              fontSize: 12,
              fontWeight: 700,
              minWidth: 22,
              textAlign: 'center',
            }}>
              {alerts.length}
            </span>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'hsl(220 13% 60%)', fontSize: 13 }}>
              Chargement…
            </div>
          ) : visible.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              padding: '36px 20px',
              color: 'hsl(220 13% 60%)',
            }}>
              <CheckCircle size={32} color="hsl(142 71% 45%)" />
              <span style={{ fontSize: 13 }}>Aucune alerte</span>
            </div>
          ) : (
            <>
              {visible.map((alert, index) => {
                const accentColor = SEVERITY_COLORS[alert.severity];
                const isHovered = hoveredId === alert.id;
                const IconComponent = alert.severity === 'info' ? Info : AlertTriangle;

                return (
                  <div
                    key={alert.id}
                    onMouseEnter={() => setHoveredId(alert.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      position: 'relative',
                      background: isHovered ? 'hsl(220 13% 97%)' : 'transparent',
                      transition: 'background 150ms ease',
                      animation: `alertSlideIn 280ms ease both`,
                      animationDelay: `${index * 50}ms`,
                      borderBottom: index < visible.length - 1 ? '1px solid hsl(220 13% 94%)' : 'none',
                    }}
                  >
                    {/* Accent bar */}
                    <div style={{
                      width: 3,
                      alignSelf: 'stretch',
                      background: accentColor,
                      flexShrink: 0,
                      borderRadius: '0 2px 2px 0',
                    }} />

                    {/* Content */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', flex: 1, minWidth: 0 }}>
                      <IconComponent size={16} color={accentColor} style={{ flexShrink: 0, marginTop: 1 }} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'hsl(220 13% 18%)', lineHeight: 1.3 }}>
                          {alert.title}
                        </div>
                        <div style={{ fontSize: 12, color: 'hsl(220 13% 46%)', marginTop: 2, lineHeight: 1.4 }}>
                          {alert.message}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                          {alert.user_name && (
                            <span style={{
                              background: 'hsl(220 13% 93%)',
                              color: 'hsl(220 13% 36%)',
                              borderRadius: 6,
                              padding: '1px 7px',
                              fontSize: 11,
                              fontWeight: 600,
                            }}>
                              {alert.user_name}
                            </span>
                          )}
                          <span style={{ fontSize: 10, color: 'hsl(220 13% 62%)' }}>
                            {timeAgo(alert.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Dismiss button */}
                      <button
                        onClick={() => onDismiss(alert.id)}
                        title="Ignorer"
                        style={{
                          width: 20,
                          height: 20,
                          border: 'none',
                          background: isHovered ? 'hsl(220 13% 88%)' : 'transparent',
                          borderRadius: 4,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          opacity: isHovered ? 1 : 0,
                          transition: 'opacity 150ms ease, background 150ms ease',
                          padding: 0,
                        }}
                      >
                        <X size={12} color="hsl(220 13% 46%)" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {overflow > 0 && (
                <div style={{
                  padding: '10px 20px',
                  fontSize: 12,
                  color: 'hsl(220 13% 56%)',
                  textAlign: 'center',
                  borderTop: '1px solid hsl(220 13% 94%)',
                }}>
                  + {overflow} autre{overflow > 1 ? 's' : ''}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
