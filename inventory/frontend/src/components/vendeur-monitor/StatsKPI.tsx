import React, { useState, useEffect } from 'react';
import { Users, RefreshCw, Wifi } from 'lucide-react';

interface StatsKPIProps {
  vendeurCount: number;
  onlineCount: number;
  totalSales: number;
  totalRevenue: number;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  period: 'today' | 'week' | 'month';
  onRefresh: () => void;
}

const PERIOD_LABELS: Record<StatsKPIProps['period'], string> = {
  today: "Aujourd'hui",
  week: '7 jours',
  month: '30 jours',
};

function formatFCFA(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA';
}

function formatLastUpdated(date: Date | null): string {
  if (!date) return 'Jamais mis à jour';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `Mis à jour il y a ${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Mis à jour il y a ${diffMin}min`;
  return `Mis à jour à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

interface AnimatedNumberProps {
  value: number;
  formatter?: (v: number) => string;
  style?: React.CSSProperties;
}

function AnimatedNumber({ value, formatter, style }: AnimatedNumberProps) {
  const [flash, setFlash] = useState(false);
  const [prevValue, setPrevValue] = useState(value);

  useEffect(() => {
    if (value !== prevValue) {
      setFlash(true);
      setPrevValue(value);
      const timer = setTimeout(() => setFlash(false), 500);
      return () => clearTimeout(timer);
    }
  }, [value, prevValue]);

  const displayed = formatter ? formatter(value) : String(value);

  return (
    <>
      <style>{`
        @keyframes numFlash {
          0% { color: hsl(152, 52%, 42%); }
          100% { color: inherit; }
        }
      `}</style>
      <span
        style={{
          animation: flash ? 'numFlash 500ms ease-out forwards' : undefined,
          ...style,
        }}
      >
        {displayed}
      </span>
    </>
  );
}

export function StatsKPI({
  vendeurCount,
  onlineCount,
  totalSales,
  totalRevenue,
  isRefreshing,
  lastUpdated,
  period,
  onRefresh,
}: StatsKPIProps) {
  const [, forceUpdate] = useState(0);

  // Refresh the "last updated" relative time every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  const periodLabel = PERIOD_LABELS[period];

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: '16px 20px',
        border: '1px solid hsl(30, 55%, 88%)',
        boxShadow: '0 2px 8px rgba(180, 120, 60, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        boxSizing: 'border-box',
      }}
    >
      {/* Left section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        {/* Copper gradient icon */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'linear-gradient(135deg, hsl(30, 65%, 52%) 0%, hsl(20, 72%, 44%) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(180, 100, 40, 0.30)',
          }}
        >
          <Users size={22} color="#fff" strokeWidth={2} />
        </div>

        {/* Title + subtitle */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: '#1a1a2e',
                whiteSpace: 'nowrap',
              }}
            >
              Surveillance vendeurs
            </span>

            {/* Pulsing "En direct" badge */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 8px',
                borderRadius: 20,
                backgroundColor: 'hsl(152, 52%, 95%)',
                border: '1px solid hsl(152, 52%, 75%)',
                fontSize: 11,
                fontWeight: 600,
                color: 'hsl(152, 52%, 32%)',
                whiteSpace: 'nowrap',
              }}
            >
              <style>{`
                @keyframes pulse-dot {
                  0%, 100% { opacity: 1; transform: scale(1); }
                  50% { opacity: 0.5; transform: scale(0.75); }
                }
              `}</style>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: 'hsl(152, 52%, 42%)',
                  display: 'inline-block',
                  animation: 'pulse-dot 1.4s ease-in-out infinite',
                }}
              />
              <Wifi size={10} strokeWidth={2.5} style={{ color: 'hsl(152, 52%, 42%)' }} />
              En direct
            </span>
          </div>

          <div
            style={{
              fontSize: 12,
              color: '#888',
              marginTop: 2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {formatLastUpdated(lastUpdated)}
          </div>
        </div>
      </div>

      {/* Right section */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexShrink: 0,
        }}
      >
        {/* Vendeurs actifs */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#999',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: 2,
            }}
          >
            Vendeurs actifs
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              justifyContent: 'center',
            }}
          >
            <AnimatedNumber
              value={vendeurCount}
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: '#1a1a2e',
                lineHeight: 1,
              }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'hsl(152, 52%, 38%)',
                backgroundColor: 'hsl(152, 52%, 94%)',
                border: '1px solid hsl(152, 52%, 78%)',
                borderRadius: 20,
                padding: '2px 7px',
                whiteSpace: 'nowrap',
              }}
            >
              <AnimatedNumber value={onlineCount} /> en ligne
            </span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 40, backgroundColor: 'hsl(30, 40%, 88%)' }} />

        {/* Ventes */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#999',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: 2,
            }}
          >
            Ventes — {periodLabel}
          </div>
          <AnimatedNumber
            value={totalSales}
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: '#1a1a2e',
              lineHeight: 1,
              display: 'block',
            }}
          />
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 40, backgroundColor: 'hsl(30, 40%, 88%)' }} />

        {/* Revenus */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#999',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: 2,
            }}
          >
            Revenus — {periodLabel}
          </div>
          <AnimatedNumber
            value={totalRevenue}
            formatter={formatFCFA}
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: 'hsl(30, 65%, 42%)',
              lineHeight: 1,
              display: 'block',
            }}
          />
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 40, backgroundColor: 'hsl(30, 40%, 88%)' }} />

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Rafraîchir"
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            border: '2px solid hsl(30, 65%, 52%)',
            backgroundColor: isRefreshing ? 'hsl(30, 65%, 96%)' : 'hsl(30, 65%, 52%)',
            color: isRefreshing ? 'hsl(30, 65%, 52%)' : '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isRefreshing ? 'default' : 'pointer',
            flexShrink: 0,
            transition: 'background-color 150ms, color 150ms',
            outline: 'none',
          }}
        >
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
          <RefreshCw
            size={16}
            strokeWidth={2.5}
            style={{
              animation: isRefreshing ? 'spin 700ms linear infinite' : undefined,
            }}
          />
        </button>
      </div>
    </div>
  );
}

export default StatsKPI;
