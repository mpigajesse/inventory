import { useEffect, useRef } from 'react';
import {
  ShoppingCart,
  LogIn,
  Plus,
  Edit2,
  Trash2,
  Activity,
} from 'lucide-react';
import type { ActivityLog } from '@/services/activityService';

interface LiveActivityFeedProps {
  logs: ActivityLog[];
  newLogIds: Set<number>;
  isLoading: boolean;
  maxHeight?: number;
}

interface ActionMeta {
  icon: React.ElementType;
  color: string;
  bg: string;
}

function getActionMeta(action: string): ActionMeta {
  const key = action.toLowerCase();
  if (key === 'sale') {
    return { icon: ShoppingCart, color: 'hsl(152 52% 42%)', bg: 'hsl(152 38% 93%)' };
  }
  if (key === 'login') {
    return { icon: LogIn, color: 'hsl(22 72% 48%)', bg: 'hsl(22 60% 93%)' };
  }
  if (key === 'create') {
    return { icon: Plus, color: 'hsl(36 88% 52%)', bg: 'hsl(36 80% 93%)' };
  }
  if (key === 'update') {
    return { icon: Edit2, color: 'hsl(210 70% 50%)', bg: 'hsl(210 60% 93%)' };
  }
  if (key === 'delete') {
    return { icon: Trash2, color: 'hsl(0 72% 51%)', bg: 'hsl(0 60% 93%)' };
  }
  return { icon: Activity, color: 'hsl(220 9% 46%)', bg: 'hsl(220 9% 93%)' };
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function getUserInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

export function LiveActivityFeed({
  logs,
  newLogIds,
  isLoading,
  maxHeight = 420,
}: LiveActivityFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && newLogIds.size > 0) {
      scrollRef.current.scrollTop = 0;
    }
  }, [newLogIds]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid hsl(220 13% 91%)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'hsl(220 9% 25%)',
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
          }}
        >
          Activité récente
        </span>

        {/* LIVE badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 9px',
            borderRadius: '999px',
            background: 'hsl(152 38% 95%)',
            border: '1px solid hsl(152 38% 82%)',
          }}
        >
          {/* Pulsing dot */}
          <span
            style={{
              display: 'inline-block',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: 'hsl(152 52% 42%)',
              animation: 'livePulse 1.4s ease-in-out infinite',
            }}
          />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'hsl(152 52% 35%)',
              letterSpacing: '0.06em',
            }}
          >
            LIVE
          </span>
        </div>
      </div>

      {/* Scroll container */}
      <div
        ref={scrollRef}
        style={{
          overflowY: 'auto',
          maxHeight: `min(${maxHeight}px, 60svh)`,
          flex: 1,
        }}
      >
        {isLoading && logs.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 16px',
              color: 'hsl(220 9% 60%)',
              fontSize: '13px',
            }}
          >
            Chargement…
          </div>
        ) : logs.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 16px',
              color: 'hsl(220 9% 60%)',
              fontSize: '13px',
            }}
          >
            Aucune activité récente.
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {logs.map((log) => {
              const isNew = newLogIds.has(log.id);
              const { icon: Icon, color, bg } = getActionMeta(log.action);
              const initials = getUserInitials(log.user_name);
              const showAmount =
                log.sale_amount !== null &&
                log.sale_amount !== undefined &&
                log.sale_amount > 0;

              return (
                <li
                  key={log.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 16px',
                    borderBottom: '1px solid hsl(220 13% 95%)',
                    borderLeft: isNew
                      ? '3px solid hsl(152 52% 42%)'
                      : '3px solid transparent',
                    background: isNew
                      ? 'hsl(152 38% 95%)'
                      : 'transparent',
                    animation: isNew ? 'newItemFlash 1.5s ease-out forwards' : 'none',
                    transition: 'background 0.3s',
                  }}
                >
                  {/* Time */}
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: '11px',
                      color: 'hsl(220 9% 55%)',
                      fontVariantNumeric: 'tabular-nums',
                      marginTop: '2px',
                      minWidth: '38px',
                    }}
                  >
                    {formatTime(log.created_at)}
                  </span>

                  {/* Action icon */}
                  <div
                    style={{
                      flexShrink: 0,
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: '1px',
                    }}
                  >
                    <Icon size={13} color={color} strokeWidth={2.2} />
                  </div>

                  {/* User avatar initials */}
                  <div
                    style={{
                      flexShrink: 0,
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: 'hsl(220 13% 88%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'hsl(220 9% 35%)',
                      letterSpacing: '0.02em',
                      marginTop: '1px',
                    }}
                  >
                    {initials}
                  </div>

                  {/* Description + badge */}
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12.5px',
                        color: 'hsl(220 9% 20%)',
                        lineHeight: '1.4',
                        wordBreak: 'break-word',
                      }}
                    >
                      {log.description}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {log.user_name && (
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'hsl(220 9% 55%)',
                          }}
                        >
                          {log.user_name}
                        </span>
                      )}

                      {showAmount && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'hsl(152 52% 35%)',
                            background: 'hsl(152 38% 90%)',
                            border: '1px solid hsl(152 38% 78%)',
                            borderRadius: '4px',
                            padding: '1px 6px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatAmount(log.sale_amount as number)}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Keyframe styles injected once via a style tag */}
      <style>{`
        @keyframes newItemFlash {
          0%   { background: hsl(152 38% 85%); }
          100% { background: hsl(152 38% 95%); }
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.45; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
