import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { API_BASE_URL } from '../config/api';
import axios from 'axios';

const OFFLINE_HIKE_DATA_KEY = 'offline_hike_data';
const SYNC_STATUS_KEY = 'hike_sync_status';

class OfflineHikeBuffer {
  constructor() {
    this.isOnline = true;
    this.syncInProgress = false;
    this.initNetworkListener();
  }

  initNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;

      if (this.isOnline && wasOffline) {
        console.log('Network restored, starting sync...');
        this.syncPendingData();
      }
    });
  }

  async storeHikeUpdate(hikeId, data) {
    try {
      const offlineData = await this.getOfflineData();
      const hikeKey = `hike_${hikeId}`;

      if (!offlineData[hikeKey]) {
        offlineData[hikeKey] = {
          hikeId,
          updates: [],
          createdAt: new Date().toISOString()
        };
      }

      
      const updateWithTimestamp = {
        ...data,
        timestamp: data.timestamp || new Date().toISOString(),
        storedAt: new Date().toISOString()
      };

      offlineData[hikeKey].updates.push(updateWithTimestamp);
      offlineData[hikeKey].lastUpdate = new Date().toISOString();

      await AsyncStorage.setItem(OFFLINE_HIKE_DATA_KEY, JSON.stringify(offlineData));

      console.log(`Stored offline hike update for ${hikeId}, total updates: ${offlineData[hikeKey].updates.length}`);

      
      if (this.isOnline && !this.syncInProgress) {
        this.syncHikeData(hikeId);
      }

      return true;
    } catch (error) {
      console.error('Error storing offline hike data:', error);
      return false;
    }
  }

  async getOfflineData() {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_HIKE_DATA_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error getting offline data:', error);
      return {};
    }
  }

  async syncHikeData(hikeId) {
    if (this.syncInProgress || !this.isOnline) {
      return false;
    }

    try {
      this.syncInProgress = true;
      const offlineData = await this.getOfflineData();
      const hikeKey = `hike_${hikeId}`;

      if (!offlineData[hikeKey] || offlineData[hikeKey].updates.length === 0) {
        return true; 
      }

      const updates = offlineData[hikeKey].updates;
      console.log(`Syncing ${updates.length} offline updates for hike ${hikeId}`);

      
      const syncData = {
        waypoints: updates.map(update => ({
          name: update.name || 'Offline Point',
          latitude: update.latitude || update.location?.[1],
          longitude: update.longitude || update.location?.[0],
          timestamp: update.timestamp
        }))
      };

      const response = await axios.post(`${API_BASE_URL}/api/hike/${hikeId}/sync`, syncData);

      if (response.data.success) {
        
        delete offlineData[hikeKey];
        await AsyncStorage.setItem(OFFLINE_HIKE_DATA_KEY, JSON.stringify(offlineData));
        console.log(`Successfully synced ${updates.length} updates for hike ${hikeId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error syncing hike data:', error);
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }

  async syncPendingData() {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    try {
      const offlineData = await this.getOfflineData();
      const hikeIds = Object.keys(offlineData).map(key => key.replace('hike_', ''));

      console.log(`Found ${hikeIds.length} hikes with pending offline data`);

      for (const hikeId of hikeIds) {
        await this.syncHikeData(hikeId);
      }
    } catch (error) {
      console.error('Error in syncPendingData:', error);
    }
  }

  async sendRealtimeUpdate(hikeId, data) {
    if (!this.isOnline) {
      // Store offline and return
      await this.storeHikeUpdate(hikeId, data);
      return { success: false, offline: true, message: 'Stored offline' };
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/hike/${hikeId}/location`, data);
      return { success: true, data: response.data };
    } catch (error) {
      console.warn('Failed to send realtime update, storing offline:', error.message);
      await this.storeHikeUpdate(hikeId, data);
      return { success: false, offline: true, error: error.message };
    }
  }

  async completeHike(hikeId, completionData) {
    try {
      if (this.isOnline) {
        
        const response = await axios.post(`${API_BASE_URL}/api/hike/${hikeId}/end`, completionData);
        if (response.data.success) {
          
          await this.syncHikeData(hikeId);
          return { success: true, data: response.data };
        }
      }

      
      const offlineData = await this.getOfflineData();
      const hikeKey = `hike_${hikeId}`;

      if (!offlineData[hikeKey]) {
        offlineData[hikeKey] = {
          hikeId,
          updates: [],
          createdAt: new Date().toISOString()
        };
      }

      offlineData[hikeKey].completionData = {
        ...completionData,
        storedAt: new Date().toISOString()
      };

      await AsyncStorage.setItem(OFFLINE_HIKE_DATA_KEY, JSON.stringify(offlineData));

      console.log(`Stored hike completion offline for ${hikeId}`);
      return { success: true, offline: true, message: 'Completion stored offline' };

    } catch (error) {
      console.error('Error completing hike:', error);
      return { success: false, error: error.message };
    }
  }

  async getPendingSyncCount() {
    try {
      const offlineData = await this.getOfflineData();
      let totalUpdates = 0;
      let hikesWithData = 0;

      Object.values(offlineData).forEach(hikeData => {
        if (hikeData.updates && hikeData.updates.length > 0) {
          totalUpdates += hikeData.updates.length;
          hikesWithData++;
        }
      });

      return { totalUpdates, hikesWithData };
    } catch (error) {
      console.error('Error getting pending sync count:', error);
      return { totalUpdates: 0, hikesWithData: 0 };
    }
  }

  async clearOldData(daysOld = 30) {
    try {
      const offlineData = await this.getOfflineData();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      let clearedCount = 0;
      Object.keys(offlineData).forEach(key => {
        const hikeData = offlineData[key];
        const createdAt = new Date(hikeData.createdAt);

        if (createdAt < cutoffDate) {
          delete offlineData[key];
          clearedCount++;
        }
      });

      if (clearedCount > 0) {
        await AsyncStorage.setItem(OFFLINE_HIKE_DATA_KEY, JSON.stringify(offlineData));
        console.log(`Cleared ${clearedCount} old offline hike records`);
      }

      return clearedCount;
    } catch (error) {
      console.error('Error clearing old data:', error);
      return 0;
    }
  }
}


export default new OfflineHikeBuffer();