export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:1098',
  ENDPOINTS: {
    POLL: '/poll',
    HEALTH: '/poll',
  },
  REFRESH_INTERVAL: 5000, // 5 seconds
  TIMEOUT: 10000, // 10 seconds
} as const;

export const CHART_CONFIG = {
  COLORS: {
    PRIMARY: '#667eea',
    SECONDARY: '#764ba2',
    SUCCESS: '#10b981',
    WARNING: '#0ea5e9', // Azul claro
    ERROR: '#1e40af', // Azul escuro
    INFO: '#3b82f6',
  },
  ANIMATION: {
    DURATION: 750,
    EASING: 'easeInOutQuart',
  },
} as const;

export const DASHBOARD_CONFIG = {
  METRICS_HISTORY_SIZE: 50,
  AUTO_REFRESH: true,
  THEME_MODE: 'dark',
} as const;
