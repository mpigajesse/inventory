import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext, Link } from 'react-router-dom';
import { Topbar } from '@/components/layout/Topbar';
import { activityService } from '@/services/activityService';
import type { AppLayoutContext } from '@/components/layout/AppLayout';
import { Users, TrendingUp, Activity, RefreshCw, Clock, ShoppingBag } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = 'today' | 'week' | 'month';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function formatTimeShort(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatRevenue(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA';
}

function getInitials(name: string | null): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Period pill button ───────────────────────────────────────────────────────

interface PeriodPillProps {
  value: Period;
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
        borderRadius: '100px',
        fontSize: '12px',
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

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  name,
  size = 40,
  gold = false,
}: {
  name: string | null;
  size?: number;
  gold?: boolean;
}) {
  const initials = getInitials(name);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: gold
          ? 'linear-gradient(135deg, hsl(42 95% 48%), hsl(36 88% 58%))'
          : 'linear-gradient(135deg, hsl(22 72% 45%), hsl(28 60% 55%))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 700,
        fontSize: size > 32 ? '14px' : '11px',
        flexShrink: 0,
        boxShadow: gold
          ? '0 2px 12px hsl(42 95% 48% / 0.4)'
          : '0 2px 8px hsl(22 72% 45% / 0.3)',
      }}
    >
      {initials}
    </div>
  );
}

// ─── Vendeur card ─────────────────────────────────────────────────────────────

interface VendeurCardProps {
  userId: number;
  name: string | null;
  salesCount: number;
  revenue: number;
  actionCount: number;
  lastActionAt: string | null;
  lastAction: string;
  isTop: boolean;
}

function VendeurCard({
  userId,
  name,
  salesCount,
  revenue,
  actionCount,
  lastActionAt,
  lastAction,
  isTop,
}: VendeurCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      to={`/admin/users/${userId}`}
      style={{ textDecoration: 'none' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          background: hovered ? 'hsl(30 25% 99%)' : '#fff',
          borderRadius: '16px',
          padding: '20px',
          border: isTop
            ? '1px solid hsl(42 95% 52% / 0.4)'
            : '1px solid hsl(22 72% 48% / 0.18)',
          borderLeftWidth: '4px',
          borderLeftColor: isTop ? 'hsl(42 95% 52%)' : 'hsl(22 72% 48%)',
          boxShadow: hovered
            ? '0 8px 24px hsl(22 30% 15% / 0.12)'
            : '0 2px 8px hsl(22 30% 15% / 0.06)',
          transition: 'all 0.2s ease',
          transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {isTop && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'linear-gradient(135deg, hsl(42 95% 48%), hsl(36 88% 58%))',
              color: '#fff',
              fontSize: '9px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '100px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              boxShadow: '0 2px 8px hsl(42 95% 48% / 0.35)',
            }}
          >
            Top vendeur
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Avatar name={name} size={44} gold={isTop} />
          <div>
            <div
              style={{ fontWeight: 700, fontSize: '15px', color: 'hsl(22 30% 18%)', lineHeight: 1.2 }}
            >
              {name ?? 'Vendeur inconnu'}
            </div>
            <div style={{ fontSize: '11px', color: 'hsl(22 30% 55%)', marginTop: '2px' }}>
              Vendeur
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: '36px',
            fontWeight: 800,
            color: isTop ? 'hsl(42 80% 40%)' : 'hsl(22 72% 45%)',
            lineHeight: 1,
            marginBottom: '4px',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {salesCount}
        </div>
        <div style={{ fontSize: '11px', color: 'hsl(22 30% 55%)', marginBottom: '14px', fontWeight: 500 }}>
          vente{salesCount !== 1 ? 's' : ''}
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            padding: '10px 12px',
            background: 'hsl(30 30% 97%)',
            borderRadius: '10px',
            marginBottom: '12px',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '10px',
                color: 'hsl(22 30% 55%)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Revenus
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'hsl(152 38% 35%)', marginTop: '2px' }}>
              {formatRevenue(revenue)}
            </div>
          </div>
          <div style={{ width: '1px', background: 'hsl(22 30% 88%)' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '10px',
                color: 'hsl(22 30% 55%)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Actions
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'hsl(22 30% 30%)', marginTop: '2px' }}>
              {actionCount}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
          <Clock
            style={{
              width: '12px',
              height: '12px',
              color: 'hsl(22 30% 60%)',
              flexShrink: 0,
              marginTop: '2px',
            }}
          />
          <div>
            <div style={{ fontSize: '11px', color: 'hsl(22 30% 50%)', lineHeight: 1.4 }}>
              {lastAction || 'Aucune action'}
            </div>
            <div style={{ fontSize: '10px', color: 'hsl(22 30% 65%)', marginTop: '2px' }}>
              {formatTime(lastActionAt)}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Activity feed item ───────────────────────────────────────────────────────

interface FeedItemProps {
  userName: string | null;
  description: string;
  createdAt: string;
  saleAmount: number | null;
  index: number;
}

function FeedItem({ userName, description, createdAt, saleAmount, index }: FeedItemProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px 0',
        borderBottom: '1px solid hsl(22 30% 92%)',
        opacity: 0,
        animation: 'feedItemIn 0.3s ease forwards',
        animationDelay: `${index * 40}ms`,
      }}
    >
      <div
        style={{
          width: '44px',
          flexShrink: 0,
          fontSize: '11px',
          fontWeight: 600,
          color: 'hsl(22 30% 55%)',
          fontVariantNumeric: 'tabular-nums',
          paddingTop: '2px',
          textAlign: 'right',
        }}
      >
        {formatTimeShort(createdAt)}
      </div>
      <div
        style={{
          position: 'relative',
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'center',
          paddingTop: '4px',
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'hsl(22 72% 48%)',
            boxShadow: '0 0 0 2px hsl(22 72% 48% / 0.2)',
          }}
        />
      </div>
      <Avatar name={userName} size={28} />
      <div style={{ flex: 1, minWidth: 0, paddingTop: '2px' }}>
        <span style={{ fontSize: '13px', color: 'hsl(22 30% 20%)', fontWeight: 600 }}>
          {userName ?? 'Système'}
        </span>
        <span style={{ fontSize: '12px', color: 'hsl(22 30% 45%)', marginLeft: '4px' }}>
          — {description}
        </span>
      </div>
      {saleAmount != null && saleAmount > 0 && (
        <div
          style={{
            flexShrink: 0,
            padding: '3px 8px',
            borderRadius: '100px',
            background: 'hsl(152 38% 38% / 0.1)',
            color: 'hsl(152 38% 30%)',
            fontSize: '11px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {formatRevenue(saleAmount)}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function VendeurMonitorPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const [period, setPeriod] = useState<Period>('today');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const {
    data: summaryData,
    isLoading: summaryLoading,
    refetch: refetchSummary,
    isFetching: summaryFetching,
  } = useQuery({
    queryKey: ['vendeur-summary', period],
    queryFn: () => activityService.getVendeurSummary(period),
    refetchInterval: 30_000,
    onSuccess: () => setLastRefresh(new Date()),
  });

  const { data: feedData, isLoading: feedLoading } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: () => activityService.getAll({ date: 'today', page_size: '20' }),
    refetchInterval: 30_000,
  });

  const summary = summaryData ?? [];
  const feedItems = feedData?.results ?? [];

  const topVendeurId =
    summary.length > 0
      ? summary.reduce((best, v) => (v.sales_count > best.sales_count ? v : best), summary[0])
          .user_id
      : null;

  const totalSales = summary.reduce((s, v) => s + v.sales_count, 0);
  const totalRevenue = summary.reduce((s, v) => s + v.total_revenue, 0);

  function handleManualRefresh() {
    void refetchSummary();
    setLastRefresh(new Date());
  }

  const refreshLabel = `Actualisé à ${lastRefresh.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  return (
    <>
      <style>{`
        @keyframes feedItemIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes vendeurCardIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(0.8); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @media (max-width: 900px) {
          .vendor-monitor-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <Topbar
        title="Surveillance vendeurs"
        subtitle="Surveillance en temps réel"
        onMenuClick={onMenuClick}
      />

      <div className="page-container animate-slide-in">
        {/* ── Live header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '24px',
            padding: '16px 20px',
            background: '#fff',
            borderRadius: '16px',
            border: '1px solid hsl(22 72% 48% / 0.15)',
            boxShadow: '0 2px 12px hsl(22 30% 15% / 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px hsl(22 72% 48% / 0.3)',
                flexShrink: 0,
              }}
            >
              <Users style={{ width: '20px', height: '20px', color: '#fff' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color: 'hsl(22 30% 18%)',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    letterSpacing: '-0.02em',
                    margin: 0,
                  }}
                >
                  Surveillance vendeurs
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'hsl(152 52% 42%)',
                      animation: 'pulseDot 1.8s ease-in-out infinite',
                      boxShadow: '0 0 0 3px hsl(152 52% 42% / 0.2)',
                    }}
                  />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'hsl(152 38% 35%)' }}>
                    En direct
                  </span>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: 'hsl(22 30% 55%)', margin: '2px 0 0 0' }}>
                {refreshLabel}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'hsl(22 72% 45%)', fontVariantNumeric: 'tabular-nums' }}>
                {summary.length}
              </div>
              <div style={{ fontSize: '10px', color: 'hsl(22 30% 55%)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Vendeur{summary.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ width: '1px', height: '36px', background: 'hsl(22 30% 88%)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'hsl(22 72% 45%)', fontVariantNumeric: 'tabular-nums' }}>
                {totalSales}
              </div>
              <div style={{ fontSize: '10px', color: 'hsl(22 30% 55%)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Ventes
              </div>
            </div>
            <div style={{ width: '1px', height: '36px', background: 'hsl(22 30% 88%)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'hsl(152 38% 35%)', fontVariantNumeric: 'tabular-nums' }}>
                {formatRevenue(totalRevenue)}
              </div>
              <div style={{ fontSize: '10px', color: 'hsl(22 30% 55%)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Revenus
              </div>
            </div>
            <button
              type="button"
              onClick={handleManualRefresh}
              title="Actualiser"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: '1px solid hsl(22 72% 48% / 0.25)',
                background: 'hsl(22 72% 48% / 0.06)',
                color: 'hsl(22 72% 48%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <RefreshCw
                style={{
                  width: '15px',
                  height: '15px',
                  animation: summaryFetching ? 'spin 0.8s linear infinite' : 'none',
                }}
              />
            </button>
          </div>
        </div>

        {/* ── Period selector ── */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <PeriodPill value="today" label="Aujourd'hui" active={period === 'today'} onClick={() => setPeriod('today')} />
          <PeriodPill value="week"  label="7 jours"     active={period === 'week'}  onClick={() => setPeriod('week')}  />
          <PeriodPill value="month" label="30 jours"    active={period === 'month'} onClick={() => setPeriod('month')} />
        </div>

        {/* ── Two-column layout ── */}
        <div
          className="vendor-monitor-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 380px)',
            gap: '20px',
            alignItems: 'start',
          }}
        >
          {/* Left: vendeur cards */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <TrendingUp style={{ width: '16px', height: '16px', color: 'hsl(22 72% 48%)' }} />
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'hsl(22 30% 20%)' }}>
                Performance vendeurs
              </span>
              {summaryLoading && (
                <span style={{ fontSize: '11px', color: 'hsl(22 30% 55%)', fontStyle: 'italic' }}>
                  Chargement…
                </span>
              )}
            </div>

            {!summaryLoading && summary.length === 0 ? (
              <div
                style={{
                  padding: '40px',
                  textAlign: 'center',
                  background: '#fff',
                  borderRadius: '16px',
                  border: '1px solid hsl(22 30% 90%)',
                  color: 'hsl(22 30% 55%)',
                  fontSize: '13px',
                }}
              >
                <Users
                  style={{ width: '32px', height: '32px', margin: '0 auto 12px', opacity: 0.3, display: 'block' }}
                />
                Aucune activité vendeur sur cette période.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '14px',
                }}
              >
                {summary.map((v, idx) => (
                  <div
                    key={v.user_id}
                    style={{
                      opacity: 0,
                      animation: 'vendeurCardIn 0.35s ease forwards',
                      animationDelay: `${idx * 60}ms`,
                    }}
                  >
                    <VendeurCard
                      userId={v.user_id}
                      name={v.full_name}
                      salesCount={v.sales_count}
                      revenue={v.total_revenue}
                      actionCount={v.action_count}
                      lastActionAt={v.last_action_at}
                      lastAction={v.last_action}
                      isTop={v.user_id === topVendeurId && v.sales_count > 0}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: live activity feed */}
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              border: '1px solid hsl(22 30% 90%)',
              boxShadow: '0 2px 8px hsl(22 30% 15% / 0.06)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid hsl(22 30% 92%)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'hsl(30 30% 98%)',
              }}
            >
              <Activity style={{ width: '15px', height: '15px', color: 'hsl(22 72% 48%)' }} />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'hsl(22 30% 20%)' }}>
                Activité du jour
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '10px',
                  color: 'hsl(152 38% 35%)',
                  fontWeight: 600,
                  background: 'hsl(152 38% 38% / 0.1)',
                  padding: '2px 8px',
                  borderRadius: '100px',
                }}
              >
                Live
              </span>
            </div>
            <div
              style={{
                padding: '4px 16px',
                maxHeight: '520px',
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                scrollbarColor: 'hsl(22 30% 85%) transparent',
              }}
            >
              {feedLoading ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'hsl(22 30% 55%)', fontSize: '13px' }}>
                  <ShoppingBag
                    style={{ width: '24px', height: '24px', margin: '0 auto 8px', opacity: 0.3, display: 'block' }}
                  />
                  Chargement du flux…
                </div>
              ) : feedItems.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'hsl(22 30% 55%)', fontSize: '13px' }}>
                  <Activity
                    style={{ width: '24px', height: '24px', margin: '0 auto 8px', opacity: 0.3, display: 'block' }}
                  />
                  Aucune activité aujourd'hui.
                </div>
              ) : (
                feedItems.map((item, idx) => (
                  <FeedItem
                    key={item.id}
                    userName={item.user_name}
                    description={item.description}
                    createdAt={item.created_at}
                    saleAmount={item.sale_amount}
                    index={idx}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
