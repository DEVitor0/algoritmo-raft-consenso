import { apiService } from './api.service';
import { API_CONFIG } from '../config/constants';
import { ServerStatus, HealthCheckResult } from '../types/index';

class RaftService {
  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = performance.now();
    try {
      const response = await apiService.get<ServerStatus>(API_CONFIG.ENDPOINTS.HEALTH);
      const responseTime = performance.now() - startTime;
      
      return {
        success: response.alive === 'okay',
        responseTime: Math.round(responseTime),
        timestamp: Date.now(),
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        success: false,
        responseTime: Math.round(responseTime),
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async performLoadTest(requests: number = 10): Promise<HealthCheckResult[]> {
    const promises = Array.from({ length: requests }, () => this.checkHealth());
    return Promise.all(promises);
  }

  async getServerStatus(): Promise<ServerStatus> {
    return apiService.get<ServerStatus>(API_CONFIG.ENDPOINTS.POLL);
  }
}

export const raftService = new RaftService();
