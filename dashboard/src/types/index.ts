export interface ServerStatus {
  alive: string;
  timestamp?: number;
}

export interface ServerMetrics {
  responseTime: number;
  timestamp: number;
  status: 'online' | 'offline' | 'degraded';
}

export interface HealthCheckResult {
  success: boolean;
  responseTime: number;
  timestamp: number;
  error?: string;
}

export interface ChartDataPoint {
  time: string;
  value: number;
  label?: string;
}

export interface SystemInfo {
  port: number;
  baseUrl: string;
  version: string;
  name: string;
  uptime?: number;
}

export interface RequestLog {
  id: string;
  timestamp: number;
  method: string;
  endpoint: string;
  status: number;
  responseTime: number;
  success: boolean;
  error?: string;
}
