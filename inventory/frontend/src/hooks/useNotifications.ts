import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { notificationService } from '@/services/notificationService';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAuth } from '@/contexts/AuthContext';
import type { Notification } from '@/services/notificationService';

export interface UseNotificationsResult {
  unreadCount: number;
  recentUnread: Notification[];
  refetch: () => void;
}

export function useNotifications(): UseNotificationsResult {
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const { data, refetch } = useQuery({
    queryKey: ['notifications', 'unread', isAdmin],
    queryFn: () => notificationService.getUnreadCount(isAdmin ? { all: true } : undefined),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (data !== undefined) {
      setUnreadCount(data.count);
    }
  }, [data, setUnreadCount]);

  return {
    unreadCount: data?.count ?? 0,
    recentUnread: data?.notifications ?? [],
    refetch,
  };
}
