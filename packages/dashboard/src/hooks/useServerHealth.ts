import { useState, useEffect, useCallback, useRef } from 'react';
import { raftService } from '../services/raft.service';
import { HealthCheckResult, ServerMetrics } from '../types/index';
import { API_CONFIG, DASHBOARD_CONFIG } from '../config/constants';

export const useServerHealth = (autoRefresh: boolean = true) => {
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      setLoading(true);
      const result = await raftService.checkHealth();
      setHealth(result);
      setError(result.error || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();

    if (autoRefresh) {
      intervalRef.current = setInterval(checkHealth, API_CONFIG.REFRESH_INTERVAL);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, checkHealth]);

  return { health, loading, error, refetch: checkHealth };
};

export const useMetricsHistory = (maxSize: number = DASHBOARD_CONFIG.METRICS_HISTORY_SIZE) => {
  const [metrics, setMetrics] = useState<ServerMetrics[]>([]);
  const { health } = useServerHealth(true);

  useEffect(() => {
    if (health) {
      const newMetric: ServerMetrics = {
        responseTime: health.responseTime,
        timestamp: health.timestamp,
        status: health.success ? 'online' : 'offline',
      };

      setMetrics((prev) => {
        const updated = [...prev, newMetric];
        return updated.slice(-maxSize);
      });
    }
  }, [health, maxSize]);

  const clearMetrics = useCallback(() => {
    setMetrics([]);
  }, []);

  return { metrics, clearMetrics };
};
