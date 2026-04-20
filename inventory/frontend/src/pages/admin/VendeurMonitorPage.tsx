import { useOutletContext } from 'react-router-dom';
import { Topbar } from '@/components/layout/Topbar';
import { useVendeurMonitor } from '@/hooks/useVendeurMonitor';
import { StatsKPI } from '@/components/vendeur-monitor/StatsKPI';
import { LiveActivityFeed } from '@/components/vendeur-monitor/LiveActivityFeed';
import { VendeurCard } from '@/components/vendeur-monitor/VendeurCard';
import AlertsPanel from '@/components/vendeur-monitor/AlertsPanel';
import { VendeurDetailDrawer } from '@/components/vendeur-monitor/VendeurDetailDrawer';
import type { AppLayoutContext } from '@/components/layout/AppLayout';
import { Users } from 'lucide-react';
import type { MonitorPeriod } from '@/hooks/useVendeurMonitor';

// ─── Period pill ───────────────────────────────────────────────────────────────

interface PeriodPillProps {
  value: MonitorPeriod;
  label: string;
  active: boolean;
  onClick: () => void;
}

function PeriodPill({ value: _value, label, active, onClick }: PeriodPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 16px',
        borderRadius: 100,
        fontSize: 12,
        fontWeight: 600,
        border: active ? '1.5px solid hsl(22 72% 48%)' : '1.5px solid hsl(22 30% 85%)',
        background: active
          ? 'linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))'
          : 'hsl(30 30% 98%)',
        color: active ? '#fff' : 'hsl(22 30% 40%)',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        boxShadow: active ? '0 2px 8px hsl(22 72% 48% / 0.25)' : 'none',
      }}
    >
      {label}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VendeurMonitorPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();

  const {
    summary,
    recentLogs,
    newLogIds,
    alerts,
    period,
    setPeriod,
    isLoading,
    isRefreshing,
    lastUpdated,
    selectedVendeurId,
    setSelectedVendeurId,
    dismissAlert,
    totalSales,
    totalRevenue,
    topVendeur,
    onlineCount,
    refetch,
  } = useVendeurMonitor();

  // Derive the top vendeur's user_id for the "isTop" card flag
  const topVendeurId = topVendeur?.user_id ?? null;

  // A log belongs to a vendeur when log.user matches vendeur.user_id
  function vendeurHasNewLog(vendeurId: number): boolean {
    for (const log of recentLogs) {
      if (log.user === vendeurId && newLogIds.has(log.id)) return true;
    }
    return false;
  }

  // Find vendeur name for the drawer
  const selectedVendeurName =
    summary.find((v) => v.user_id === selectedVendeurId)?.full_name ?? null;

  return (
    <>
      <style>{`
        @keyframes cardEnter {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.75); }
        }

        .vm-layout {
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }
        .vm-left {
          flex: 1;
          min-width: 0;
        }
        .vm-center {
          flex: 1;
          min-width: 0;
        }
        .vm-right {
          width: 280px;
          flex-shrink: 0;
          position: sticky;
          top: 20px;
        }

        @media (max-width: 900px) {
          .vm-layout {
            flex-direction: column;
          }
          .vm-left {
            width: 100%;
          }
          .vm-center {
            width: 100%;
          }
          .vm-right {
            width: 100%;
            position: static;
          }
        }

        @media (max-width: 480px) {
          .vm-cards-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <Topbar
        title="Surveillance vendeurs·ses"
        subtitle="Temps réel — actualisation 10s"
        onMenuClick={onMenuClick}
      />

      <div className="page-container animate-slide-in">

        {/* ── KPI bar ── */}
        <StatsKPI
          vendeurCount={summary.length}
          onlineCount={onlineCount}
          totalSales={totalSales}
          totalRevenue={totalRevenue}
          isRefreshing={isRefreshing}
          lastUpdated={lastUpdated}
          period={period}
          onRefresh={refetch}
        />

        {/* ── Period selector ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <PeriodPill
            value="today"
            label="Aujourd'hui"
            active={period === 'today'}
            onClick={() => setPeriod('today')}
          />
          <PeriodPill
            value="week"
            label="7 jours"
            active={period === 'week'}
            onClick={() => setPeriod('week')}
          />
          <PeriodPill
            value="month"
            label="30 jours"
            active={period === 'month'}
            onClick={() => setPeriod('month')}
          />
        </div>

        {/* ── 3-column layout ── */}
        <div className="vm-layout">

          {/* ── Left: vendeur cards grid ── */}
          <div className="vm-left">
            {isLoading && summary.length === 0 ? (
              <div
                style={{
                  padding: '48px 0',
                  textAlign: 'center',
                  color: 'hsl(220 9% 55%)',
                  fontSize: 13,
                }}
              >
                Chargement…
              </div>
            ) : summary.length === 0 ? (
              <div
                style={{
                  padding: '48px 24px',
                  textAlign: 'center',
                  background: '#fff',
                  borderRadius: 16,
                  border: '1px solid hsl(220 13% 91%)',
                  color: 'hsl(220 9% 55%)',
                  fontSize: 13,
                }}
              >
                <Users
                  size={32}
                  style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }}
                />
                Aucune activité vendeur sur cette période.
              </div>
            ) : (
              <div
                className="vm-cards-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: 14,
                }}
              >
                {summary.map((vendeur, idx) => (
                  <div
                    key={vendeur.user_id}
                    style={{
                      opacity: 0,
                      animation: 'cardEnter 0.35s ease forwards',
                      animationDelay: `${idx * 55}ms`,
                    }}
                  >
                    <VendeurCard
                      vendeur={vendeur}
                      isTop={vendeur.user_id === topVendeurId && vendeur.sales_count > 0}
                      isNew={vendeurHasNewLog(vendeur.user_id)}
                      onClick={() => setSelectedVendeurId(vendeur.user_id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Center: live activity feed ── */}
          <div
            className="vm-center"
            style={{
              background: '#fff',
              borderRadius: 16,
              border: '1px solid hsl(220 13% 91%)',
              boxShadow: '0 2px 8px hsl(0 0% 0% / 0.06)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <LiveActivityFeed
              logs={recentLogs}
              newLogIds={newLogIds}
              isLoading={isLoading}
              maxHeight={520}
            />
          </div>

          {/* ── Right: alerts panel ── */}
          <div className="vm-right">
            <AlertsPanel
              alerts={alerts}
              onDismiss={dismissAlert}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>

      {/* ── Detail drawer ── */}
      <VendeurDetailDrawer
        vendeurId={selectedVendeurId}
        vendeurName={selectedVendeurName}
        onClose={() => setSelectedVendeurId(null)}
      />
    </>
  );
}
