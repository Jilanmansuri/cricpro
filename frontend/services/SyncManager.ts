import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { API_BASE_URL } from './api';

const OFFLINE_QUEUE_KEY = 'cricstats_pending_sync_matches';

export class SyncManager {
  private static isSyncing = false;

  // Queue a match payload to be saved when offline
  public static async queueOfflineMatch(payload: any): Promise<void> {
    try {
      const existingQueueStr = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      const queue = existingQueueStr ? JSON.parse(existingQueueStr) : [];
      
      // Add unique timestamp id
      const queuedItem = {
        id: `offline_${Date.now()}`,
        payload,
        queuedAt: new Date().toISOString(),
      };

      queue.push(queuedItem);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      console.log('Match successfully queued offline.');
    } catch (err) {
      console.error('Failed to queue match offline:', err);
    }
  }

  // Retrieve queued items count
  public static async getQueuedCount(): Promise<number> {
    try {
      const existingQueueStr = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!existingQueueStr) return 0;
      const queue = JSON.parse(existingQueueStr);
      return queue.length;
    } catch {
      return 0;
    }
  }

  // Ping the server to check active internet connection
  public static async isServerOnline(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const serverRoot = API_BASE_URL.replace(/\/api\/?$/, '');
      const res = await fetch(`${serverRoot}/`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res.status === 200;
    } catch (e) {
      return false;
    }
  }

  // Flush all queued matches to the backend
  public static async syncPendingMatches(): Promise<{ success: boolean; syncedCount: number }> {
    if (this.isSyncing) return { success: false, syncedCount: 0 };
    
    const isOnline = await this.isServerOnline();
    if (!isOnline) {
      return { success: false, syncedCount: 0 };
    }

    this.isSyncing = true;
    let syncedCount = 0;

    try {
      const existingQueueStr = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!existingQueueStr) {
        this.isSyncing = false;
        return { success: true, syncedCount: 0 };
      }

      const queue = JSON.parse(existingQueueStr);
      const remainingQueue: any[] = [];

      for (const item of queue) {
        try {
          const res = await api.post('/matches/save', item.payload);
          if (res.data.success) {
            syncedCount++;
          } else {
            remainingQueue.push(item);
          }
        } catch (err) {
          console.error(`Failed to sync queued item ${item.id}:`, err);
          remainingQueue.push(item); // Keep in queue for retry later
        }
      }

      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
      this.isSyncing = false;
      return { success: true, syncedCount };
    } catch (err) {
      console.error('Offline synchronization process failed:', err);
      this.isSyncing = false;
      return { success: false, syncedCount };
    }
  }
}
export default SyncManager;
