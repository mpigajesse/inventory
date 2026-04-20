import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { activityService } from '@/services/activityService';
import type { VendeurActivitySummary } from '@/services/activityService';
import type { ActivityLog } from '@/services/activityService';

export type ActivityPeriod = 'today' | 'week' | 'month';

export interface UseVendeurActivityReturn {
  summary: VendeurActivitySummary[];
  recentLogs: ActivityLog[];
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  period: ActivityPeriod;
  setPeriod: (p: ActivityPeriod) => void;
  topVendeur: VendeurActivitySummary | null;
  totalSalesToday: number;
  totalRevenuToday: number;
}

export function useVendeurActivity(initialPeriod: ActivityPeriod = 'today'): UseVendeurActivityReturn {
  const [period, setPeriod] = useState<ActivityPeriod>(initialPeriod);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const summaryQuery = useQuery({
    queryKey: ['vendeur-summary', period],
    // queryFn ne doit pas appeler setLastUpdated directement — le composant peut être
    // démonté quand la réponse arrive, ce qui cause une mise à jour sur un composant démonté.
    queryFn: () => activityService.getVendeurSummary(period),
    refetchInterval: 30_000,
    staleTime: 30_000,
  });

  // Mettre à jour lastUpdated uniquement quand les données changent et que le composant est monté
  useEffect(() => {
    if (summaryQuery.dataUpdatedAt > 0) {
      setLastUpdated(new Date(summaryQuery.dataUpdatedAt));
    }
  }, [summaryQuery.dataUpdatedAt]);

  const logsQuery = useQuery({
    queryKey: ['activity-logs-live', period],
    queryFn: () => activityService.getAll({ date: period === 'today' ? 'today' : period === 'week' ? 'week' : 'month', page_size: '20' }),
    refetchInterval: 30_000,
  });

  const summary = summaryQuery.data ?? [];
  const logs = (logsQuery.data as any)?.results ?? logsQuery.data ?? [];

  const topVendeur = summary.length > 0
    ? summary.reduce((best, v) => v.sales_count > best.sales_count ? v : best, summary[0])
    : null;

  const totalSalesToday = summary.reduce((sum, v) => sum + v.sales_count, 0);
  const totalRevenuToday = summary.reduce((sum, v) => sum + v.total_revenue, 0);

  return {
    summary,
    recentLogs: Array.isArray(logs) ? logs : [],
    isLoading: summaryQuery.isLoading,
    isRefreshing: summaryQuery.isFetching && !summaryQuery.isLoading,
    lastUpdated,
    period,
    setPeriod,
    topVendeur,
    totalSalesToday,
    totalRevenuToday,
  };
}
