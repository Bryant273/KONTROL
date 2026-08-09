// KONTROL ERP - Offline Queue & Automatic Database Sync Engine

export interface OfflineAction {
  id: string;
  type: 'TRANSACTION' | 'CHAT_MESSAGE' | 'CHARGE' | 'TIER' | 'STOCK_MOVEMENT' | 'API_MUTATION';
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  payload: any;
  timestamp: number;
  retryCount: number;
}

const STORAGE_KEY = 'kontrol_offline_queue';

/**
 * Get all queued offline actions
 */
export function getOfflineQueue(): OfflineAction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[OFFLINE-SYNC] Failed to read queue:', e);
    return [];
  }
}

/**
 * Enqueue an action when offline or request fails due to network
 */
export function enqueueOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): OfflineAction {
  const newAction: OfflineAction = {
    ...action,
    id: `off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    retryCount: 0
  };

  const queue = getOfflineQueue();
  queue.push(newAction);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));

  console.log(`[OFFLINE-SYNC] Action queued (${newAction.type}):`, newAction);
  window.dispatchEvent(new CustomEvent('kontrol:offline_queue_updated', { detail: { count: queue.length } }));

  return newAction;
}

/**
 * Clear or remove a synced action from queue
 */
export function removeOfflineAction(id: string) {
  const queue = getOfflineQueue().filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent('kontrol:offline_queue_updated', { detail: { count: queue.length } }));
}

/**
 * Process and flush the offline queue into the remote/local server database
 */
export async function syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
  if (!navigator.onLine) {
    console.log('[OFFLINE-SYNC] Still offline. Postponing sync.');
    return { synced: 0, failed: 0 };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { synced: 0, failed: 0 };
  }

  console.log(`[OFFLINE-SYNC] Network restored! Synchronizing ${queue.length} offline items to database...`);
  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const response = await fetch(item.endpoint, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          'x-kontrol-origin': 'KONTROL_PWA_SYNC',
          'x-kontrol-shield': 'HARDENED'
        },
        body: JSON.stringify(item.payload)
      });

      if (response.ok) {
        removeOfflineAction(item.id);
        synced++;
        console.log(`[OFFLINE-SYNC] Successfully synchronized action ${item.id} to DB!`);
      } else {
        item.retryCount++;
        failed++;
        console.warn(`[OFFLINE-SYNC] Server returned ${response.status} for item ${item.id}`);
      }
    } catch (err) {
      console.error(`[OFFLINE-SYNC] Error syncing item ${item.id}:`, err);
      failed++;
    }
  }

  window.dispatchEvent(new CustomEvent('kontrol:sync_completed', { detail: { synced, failed } }));
  return { synced, failed };
}

/**
 * Register online/offline event listeners
 */
export function initOfflineSyncManager(onSyncStatus?: (status: { isOnline: boolean; queueLength: number }) => void) {
  const updateStatus = () => {
    const isOnline = navigator.onLine;
    const queueLength = getOfflineQueue().length;
    if (onSyncStatus) onSyncStatus({ isOnline, queueLength });
  };

  window.addEventListener('online', async () => {
    console.log('[OFFLINE-SYNC] Event: Device came ONLINE');
    updateStatus();
    await syncOfflineQueue();
    updateStatus();
  });

  window.addEventListener('offline', () => {
    console.log('[OFFLINE-SYNC] Event: Device went OFFLINE');
    updateStatus();
  });

  window.addEventListener('kontrol:offline_queue_updated', updateStatus);

  // Auto register Service Worker if supported
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('[PWA] Service Worker registered successfully:', reg.scope);
      }).catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
    });
  }

  updateStatus();
}
