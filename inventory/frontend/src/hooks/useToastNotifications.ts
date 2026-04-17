import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { Notification } from '@/services/notificationService';

type NotificationType = 'stock_low' | 'stock_critical' | 'new_sale' | 'new_client' | 'system';

function showToastForNotification(notification: Notification): void {
  const type = notification.notification_type as NotificationType;

  switch (type) {
    case 'new_sale':
      toast.success('Nouvelle vente enregistrée', {
        description: notification.message,
      });
      break;
    case 'stock_low':
      toast.warning('Stock bas détecté', {
        description: notification.message,
      });
      break;
    case 'stock_critical':
      toast.error('STOCK CRITIQUE !', {
        description: notification.message,
        duration: Infinity,
      });
      break;
    case 'new_client':
      toast.info('Nouveau client', {
        description: notification.message,
      });
      break;
    case 'system':
      toast(notification.title, {
        description: notification.message,
      });
      break;
    default:
      toast(notification.title, {
        description: notification.message,
      });
  }
}

export interface UseToastNotificationsOptions {
  /** Unread notifications from the latest poll */
  recentUnread: Notification[];
}

/**
 * Watches the recentUnread list from useNotifications and fires sonner toasts
 * whenever new items appear (i.e. items whose IDs were not present in the
 * previous poll cycle).
 */
export function useToastNotifications({
  recentUnread,
}: UseToastNotificationsOptions): void {
  const seenIdsRef = useRef<Set<number>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (recentUnread.length === 0) return;

    // On the very first load, populate seen IDs silently — no toasts for
    // notifications that were already there before the user opened the app.
    if (!initializedRef.current) {
      recentUnread.forEach((n) => seenIdsRef.current.add(n.id));
      initializedRef.current = true;
      return;
    }

    const newNotifications = recentUnread.filter(
      (n) => !seenIdsRef.current.has(n.id),
    );

    newNotifications.forEach((n) => {
      seenIdsRef.current.add(n.id);
      showToastForNotification(n);
    });
  }, [recentUnread]);
}
