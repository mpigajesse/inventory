import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  activityService,
  type ActivityLog,
  type VendeurActivitySummary,
  type VendeurAlert,
  type OnlineUser,
} from '@/services/activityService';

export type MonitorPeriod = 'today' | 'week' | 'month';

export interface UseVendeurMonitorReturn {
  summary: VendeurActivitySummary[];
  recentLogs: ActivityLog[];
  newLogIds: Set<number>;
  onlineUsers: OnlineUser[];
  alerts: VendeurAlert[];
  period: MonitorPeriod;
  setPeriod: (p: MonitorPeriod) => void;
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  selectedVendeurId: number | null;
  setSelectedVendeurId: (id: number | null) => void;
  dismissAlert: (id: string) => void;
  totalSales: number;
  totalRevenue: number;
  topVendeur: VendeurActivitySummary | null;
  onlineCount: number;
  refetch: () => void;
}

const MAX_RECENT_LOGS = 50;
const NEW_LOG_HIGHLIGHT_MS = 8_000;

export function useVendeurMonitor(): UseVendeurMonitorReturn {
  const queryClient = useQueryClient();

  const [period, setPeriod] = useState<MonitorPeriod>('today');
  const [selectedVendeurId, setSelectedVendeurId] = useState<number | null>(null);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set());
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  // newLogTimestamps maps each highlighted log ID to the time it was received.
  // This lets us expire IDs individually instead of clearing the entire Set at once,
  // which previously caused IDs from earlier polls to linger until the last timer fired.
  const newLogTimestampsRef = useRef<Map<number, number>>(new Map());
  const [newLogIds, setNewLogIds] = useState<Set<number>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Use a ref so the polling interval always reads the latest value without re-triggering effects.
  const latestIdRef = useRef<number | undefined>(undefined);

  // Timeout ref for clearing new log highlights.
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Summary query — refreshes every 30 seconds ───────────────────────────
  const summaryQuery = useQuery({
    queryKey: ['vendeur-summary', period],
    queryFn: () => activityService.getVendeurSummary(period),
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  // ─── Realtime query — refreshes every 10 seconds ──────────────────────────
  const realtimeQuery = useQuery({
    queryKey: ['vendeur-realtime'],
    queryFn: () => activityService.getRealtime(latestIdRef.current),
    refetchInterval: 10_000,
    staleTime: 0,
  });

  // Process realtime query results whenever fresh data arrives.
  useEffect(() => {
    const data = realtimeQuery.data;
    if (!data) return;

    // Update online users list.
    setOnlineUsers(data.online_users ?? []);

    const incoming = data.new_logs ?? [];

    if (incoming.length > 0) {
      // Determine which IDs are truly new (not seen before).
      const incomingIds = new Set(incoming.map((log) => log.id));

      setRecentLogs((prev) => {
        const existingIds = new Set(prev.map((log) => log.id));
        const brandNew = incoming.filter((log) => !existingIds.has(log.id));
        if (brandNew.length === 0) return prev;
        return [...brandNew, ...prev].slice(0, MAX_RECENT_LOGS);
      });

      // Record when each incoming ID was received so we can expire them individually.
      const now = Date.now();
      incomingIds.forEach((id) => newLogTimestampsRef.current.set(id, now));

      setNewLogIds((prev) => new Set([...prev, ...incomingIds]));

      // Schedule a sweep that removes only the IDs whose 8-second window has elapsed.
      // We cancel any pending sweep first so we don't stack timers.
      if (highlightTimerRef.current !== null) {
        clearTimeout(highlightTimerRef.current);
      }
      highlightTimerRef.current = setTimeout(() => {
        const cutoff = Date.now() - NEW_LOG_HIGHLIGHT_MS;
        newLogTimestampsRef.current.forEach((ts, id) => {
          if (ts <= cutoff) {
            newLogTimestampsRef.current.delete(id);
          }
        });
        setNewLogIds(new Set(newLogTimestampsRef.current.keys()));
        highlightTimerRef.current = null;
      }, NEW_LOG_HIGHLIGHT_MS);
    }

    // Advance the cursor so the next poll only fetches newer items.
    if (data.latest_id !== undefined && data.latest_id !== null) {
      latestIdRef.current = data.latest_id;
    }

    setLastUpdated(new Date());
  }, [realtimeQuery.data]);

  // ─── Alerts query — refreshes every 60 seconds ────────────────────────────
  const alertsQuery = useQuery({
    queryKey: ['vendeur-alerts'],
    queryFn: () => activityService.getAlerts(),
    refetchInterval: 60_000,
    staleTime: 50_000,
  });

  // ─── Dismiss alert (local only, no API call) ───────────────────────────────
  const dismissAlert = useCallback((id: string) => {
    setDismissedAlertIds((prev) => new Set([...prev, id]));
  }, []);

  // ─── Manual refetch ───────────────────────────────────────────────────────
  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['vendeur-summary'] });
    queryClient.invalidateQueries({ queryKey: ['vendeur-realtime'] });
    queryClient.invalidateQueries({ queryKey: ['vendeur-alerts'] });
  }, [queryClient]);

  // ─── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current !== null) {
        clearTimeout(highlightTimerRef.current);
      }
      // Release the timestamps map so GC can collect it.
      newLogTimestampsRef.current.clear();
    };
  }, []);

  // ─── Derived values ───────────────────────────────────────────────────────
  const summary: VendeurActivitySummary[] = summaryQuery.data ?? [];

  const totalSales = summary.reduce((acc, v) => acc + v.sales_count, 0);
  const totalRevenue = summary.reduce((acc, v) => acc + v.total_revenue, 0);

  const topVendeur: VendeurActivitySummary | null =
    summary.length === 0
      ? null
      : summary.reduce((best, v) => (v.total_revenue > best.total_revenue ? v : best), summary[0]);

  const onlineCount = realtimeQuery.data?.online_count ?? onlineUsers.length;

  const alerts: VendeurAlert[] = (alertsQuery.data ?? []).filter(
    (alert) => !dismissedAlertIds.has(alert.id),
  );

  const isLoading =
    (summaryQuery.isLoading && !summaryQuery.data) ||
    (realtimeQuery.isLoading && !realtimeQuery.data);

  const isRefreshing =
    (summaryQuery.isFetching && !!summaryQuery.data) ||
    (realtimeQuery.isFetching && !!realtimeQuery.data);

  return {
    summary,
    recentLogs,
    newLogIds,
    onlineUsers,
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
  };
}
