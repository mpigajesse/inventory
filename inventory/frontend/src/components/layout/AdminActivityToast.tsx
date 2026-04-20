import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { activityService } from '@/services/activityService';
import type { ActivityLog } from '@/services/activityService';

const MAX_TOASTS_PER_CYCLE = 3;

function isVendeurAction(log: ActivityLog): boolean {
  // N'inclure que les actions des vendeurs — exclure les actions système sans rôle
  return log.user_role === 'vendeur';
}

function showToastForLog(log: ActivityLog): void {
  const userName = log.user_name ?? 'Utilisateur inconnu';

  if (log.action === 'sale' || log.target_model?.toLowerCase() === 'sale') {
    toast.success('💰 Nouvelle vente', {
      description: `${userName} — ${log.description}`,
    });
    return;
  }

  if (log.action === 'login') {
    toast.info('👤 Connexion vendeur', {
      description: `${userName} vient de se connecter`,
    });
    return;
  }

  if (log.action === 'create' && log.target_model === 'Client') {
    toast('👥 Nouveau client', {
      description: log.description,
    });
    return;
  }
}

function isKeyAction(log: ActivityLog): boolean {
  if (log.action === 'sale' || log.target_model?.toLowerCase() === 'sale') return true;
  if (log.action === 'login') return true;
  if (log.action === 'create' && log.target_model === 'Client') return true;
  return false;
}

export function AdminActivityToast() {
  const latestIdRef = useRef<number>(0);
  const initializedRef = useRef(false);

  const { data } = useQuery({
    queryKey: ['admin-realtime-toast'],
    queryFn: () => activityService.getRealtime(latestIdRef.current || undefined),
    refetchInterval: 15_000,
    // Ne pas continuer à poller si l'onglet est en arrière-plan
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!data) return;

    if (!initializedRef.current) {
      initializedRef.current = true;
      if (data.latest_id) {
        latestIdRef.current = data.latest_id;
      }
      return;
    }

    const newLogs = data.new_logs
      .filter(log => log.id > latestIdRef.current)
      .filter(isVendeurAction)
      .filter(isKeyAction)
      .slice(0, MAX_TOASTS_PER_CYCLE);

    for (const log of newLogs) {
      showToastForLog(log);
    }

    if (data.latest_id && data.latest_id > latestIdRef.current) {
      latestIdRef.current = data.latest_id;
    }
  }, [data]);

  return null;
}
