import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { API_CONFIG } from '../config/constants';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        config.metadata = { startTime: new Date().getTime() };
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => {
        const endTime = new Date().getTime();
        const startTime = response.config.metadata?.startTime || endTime;
        response.responseTime = endTime - startTime;
        return response;
      },
      (error) => {
        if (error.config?.metadata?.startTime) {
          const endTime = new Date().getTime();
          error.responseTime = endTime - error.config.metadata.startTime;
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  getResponseTime(url: string): Promise<number> {
    const startTime = performance.now();
    return this.client
      .get(url)
      .then(() => performance.now() - startTime)
      .catch(() => -1);
  }
}

export const apiService = new ApiService();

declare module 'axios' {
  export interface AxiosRequestConfig {
    metadata?: {
      startTime: number;
    };
  }
  export interface AxiosResponse {
    responseTime?: number;
  }
}
