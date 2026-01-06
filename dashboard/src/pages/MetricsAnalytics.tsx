import { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_BASE = 'http://127.0.0.1:1098/raft';

interface MetricsSummary {
  latency: { avg: string; min: string; max: string; current: string };
  throughput: { avg: number; min: number; max: number; current: number };
  memory: { avg: string; current: string };
  cpu: { avg: string; current: string };
}

interface LatencyAnalysis {
  min: string;
  max: string;
  avg: string;
  median: string;
  p50: string;
  p90: string;
  p95: string;
  p99: string;
  stdDev: string;
}

interface Metrics {
  timestamps: string[];
  latency: number[];
  throughput: number[];
  memoryUsage: number[];
  cpuUsage: number[];
  networkIO: number[];
  diskIO: number[];
}

export default function MetricsAnalytics() {
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [latencyAnalysis, setLatencyAnalysis] = useState<LatencyAnalysis | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, latencyRes, metricsRes] = await Promise.all([
          axios.get(`${API_BASE}/metrics/summary`),
          axios.get(`${API_BASE}/analytics/latency`),
          axios.get(`${API_BASE}/metrics`)
        ]);
        setSummary(summaryRes.data);
        setLatencyAnalysis(latencyRes.data);
        setMetrics(metricsRes.data);
      } catch (error) {
        console.error('Error fetching metrics:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const latencyPercentileData = {
    labels: ['P50', 'P90', 'P95', 'P99', 'Max'],
    datasets: [
      {
        label: 'Latency (ms)',
        data: latencyAnalysis ? [
          parseFloat(latencyAnalysis.p50),
          parseFloat(latencyAnalysis.p90),
          parseFloat(latencyAnalysis.p95),
          parseFloat(latencyAnalysis.p99),
          parseFloat(latencyAnalysis.max)
        ] : [],
        backgroundColor: ['#3b82f6', '#10b981', '#0ea5e9', '#06b6d4', '#64748b'],
      },
    ],
  };

  const ioChartData = {
    labels: metrics?.timestamps.slice(-10) || [],
    datasets: [
      {
        label: 'Network I/O (MB/s)',
        data: metrics?.networkIO.slice(-10) || [],
        borderColor: '#66FCF1',
        backgroundColor: 'rgba(102, 252, 241, 0.2)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Disk I/O (MB/s)',
        data: metrics?.diskIO.slice(-10) || [],
        borderColor: '#1e40af',
        backgroundColor: 'rgba(30, 64, 175, 0.2)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const resourceDistribution = {
    labels: ['CPU Usage', 'Memory Usage', 'Available'],
    datasets: [
      {
        data: summary ? [
          parseFloat(summary.cpu.current),
          parseFloat(summary.memory.current),
          100 - parseFloat(summary.cpu.current) - parseFloat(summary.memory.current)
        ] : [0, 0, 100],
        backgroundColor: ['#0ea5e9', '#10b981', '#1e293b'],
        borderColor: ['#0ea5e9', '#10b981', '#3b82f6'],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#C5C6C7' },
      },
    },
    scales: {
      x: {
        ticks: { color: '#C5C6C7' },
        grid: { color: '#2A3842' },
      },
      y: {
        ticks: { color: '#C5C6C7' },
        grid: { color: '#2A3842' },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#C5C6C7' },
      },
    },
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ color: '#f1f5f9', fontWeight: 600, mb: 0.5 }}>
          Métricas e Análises
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          Análise detalhada de performance e recursos
        </Typography>
      </Box>

      <Grid container spacing={2.5}>
        {/* Summary Cards */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2.5, bgcolor: '#1e293b', borderLeft: '3px solid #1e40af', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>Latência Média</Typography>
            <Typography variant="h6" sx={{ color: '#1e40af', mt: 0.5, fontWeight: 600 }}>
              {summary?.latency.avg || '0'} ms
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
              Mín: {summary?.latency.min || '0'} | Máx: {summary?.latency.max || '0'}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2.5, bgcolor: '#1e293b', borderLeft: '3px solid #3b82f6', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>Taxa de Transferência Média</Typography>
            <Typography variant="h6" sx={{ color: '#3b82f6', mt: 0.5, fontWeight: 600 }}>
              {summary?.throughput.avg || 0} ops/s
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
              Mín: {summary?.throughput.min || 0} | Máx: {summary?.throughput.max || 0}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2.5, bgcolor: '#1e293b', borderLeft: '3px solid #10b981', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>Uso de Memória</Typography>
            <Typography variant="h6" sx={{ color: '#10b981', mt: 0.5, fontWeight: 600 }}>
              {summary?.memory.current || '0'}%
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
              Média: {summary?.memory.avg || '0'}%
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2.5, bgcolor: '#1e293b', borderLeft: '3px solid #0ea5e9', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>Uso de CPU</Typography>
            <Typography variant="h6" sx={{ color: '#0ea5e9', mt: 0.5, fontWeight: 600 }}>
              {summary?.cpu.current || '0'}%
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
              Média: {summary?.cpu.avg || '0'}%
            </Typography>
          </Paper>
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5, bgcolor: '#1e293b', borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#f1f5f9' }}>Percentis de Latência</Typography>
            <Box sx={{ height: 300 }}>
              <Bar data={latencyPercentileData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5, bgcolor: '#1e293b', borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#f1f5f9' }}>Distribuição de Recursos</Typography>
            <Box sx={{ height: 300 }}>
              <Doughnut data={resourceDistribution} options={doughnutOptions} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2.5, bgcolor: '#1e293b', borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#f1f5f9' }}>Performance de I/O</Typography>
            <Box sx={{ height: 300 }}>
              <Line data={ioChartData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>

        {/* Latency Stats */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2.5, bgcolor: '#1e293b', borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 2.5, fontWeight: 600, color: '#f1f5f9' }}>Estatísticas de Latência</Typography>
            <Grid container spacing={2.5}>
              <Grid item xs={6} md={3}>
                <Box sx={{ p: 2, bgcolor: '#0f172a', borderRadius: 1.5 }}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>Mínima</Typography>
                  <Typography variant="h6" sx={{ color: '#10b981', mt: 0.5, fontWeight: 600 }}>{latencyAnalysis?.min || '0'} ms</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ p: 2, bgcolor: '#0f172a', borderRadius: 1.5 }}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>Média</Typography>
                  <Typography variant="h6" sx={{ color: '#3b82f6', mt: 0.5, fontWeight: 600 }}>{latencyAnalysis?.avg || '0'} ms</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ p: 2, bgcolor: '#0f172a', borderRadius: 1.5 }}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>Mediana</Typography>
                  <Typography variant="h6" sx={{ color: '#06b6d4', mt: 0.5, fontWeight: 600 }}>{latencyAnalysis?.median || '0'} ms</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ p: 2, bgcolor: '#0f172a', borderRadius: 1.5 }}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>Desvio Padrão</Typography>
                  <Typography variant="h6" sx={{ color: '#0ea5e9', mt: 0.5, fontWeight: 600 }}>{latencyAnalysis?.stdDev || '0'} ms</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
