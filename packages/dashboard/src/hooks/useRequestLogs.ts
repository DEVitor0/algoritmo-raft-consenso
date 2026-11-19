import { useState, useCallback } from 'react';
import { RequestLog } from '../types/index';
import { generateId } from '../utils/formatters';

const MAX_LOGS = 100;

export const useRequestLogs = () => {
  const [logs, setLogs] = useState<RequestLog[]>([]);

  const addLog = useCallback((log: Omit<RequestLog, 'id'>) => {
    const newLog: RequestLog = {
      ...log,
      id: generateId(),
    };

    setLogs((prev) => {
      const updated = [newLog, ...prev];
      return updated.slice(0, MAX_LOGS);
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const getSuccessRate = useCallback((): number => {
    if (logs.length === 0) return 0;
    const successCount = logs.filter((log) => log.success).length;
    return (successCount / logs.length) * 100;
  }, [logs]);

  const getAverageResponseTime = useCallback((): number => {
    if (logs.length === 0) return 0;
    const total = logs.reduce((acc, log) => acc + log.responseTime, 0);
    return total / logs.length;
  }, [logs]);

  return {
    logs,
    addLog,
    clearLogs,
    getSuccessRate,
    getAverageResponseTime,
    totalRequests: logs.length,
  };
};
