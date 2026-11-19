import { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import { Line } from 'react-chartjs-2';
import axios from 'axios';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import StorageIcon from '@mui/icons-material/Storage';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const API_BASE = 'http://127.0.0.1:1098/raft';

interface ClusterHealth {
  status: string;
  totalNodes: number;
  aliveNodes: number;
  deadNodes: number;
  leader: string;
  currentTerm: number;
  avgLatency: string;
  commitIndex: number;
}

interface Metrics {
  timestamps: string[];
  latency: number[];
  throughput: number[];
  memoryUsage: number[];
  cpuUsage: number[];
}

export default function ClusterOverview() {
  const [health, setHealth] = useState<ClusterHealth | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [healthRes, metricsRes] = await Promise.all([
          axios.get(`${API_BASE}/health`),
          axios.get(`${API_BASE}/metrics`)
        ]);
        setHealth(healthRes.data);
        setMetrics(metricsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const latencyChartData = {
    labels: metrics?.timestamps || [],
    datasets: [
      {
        label: 'Latency (ms)',
        data: metrics?.latency || [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6,
      },
    ],
  };

  const throughputChartData = {
    labels: metrics?.timestamps || [],
    datasets: [
      {
        label: 'Throughput (ops/s)',
        data: metrics?.throughput || [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6,
      },
    ],
  };

  const resourceChartData = {
    labels: metrics?.timestamps || [],
    datasets: [
      {
        label: 'Memory',
        data: metrics?.memoryUsage || [],
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6,
      },
      {
        label: 'CPU',
        data: metrics?.cpuUsage || [],
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#94a3b8',
          font: { size: 11, family: 'Inter' },
          padding: 12,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
      },
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { size: 10 } },
        grid: { color: 'rgba(148, 163, 184, 0.05)' },
        border: { display: false },
      },
      y: {
        ticks: { color: '#64748b', font: { size: 10 } },
        grid: { color: 'rgba(148, 163, 184, 0.05)' },
        border: { display: false },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ color: '#f1f5f9', fontWeight: 600, mb: 0.5 }}>
            Visão Geral do Cluster
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Visualização simulada do estado do cluster
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={2.5}>
        {/* Health Status Cards */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ 
            p: 2.5, 
            bgcolor: '#1e293b', 
            borderLeft: '3px solid #3b82f6'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CheckCircleIcon sx={{ color: health?.status === 'Healthy' ? '#10b981' : '#1e40af', fontSize: 20 }} />
              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Status
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ color: health?.status === 'Healthy' ? '#10b981' : '#1e40af', fontWeight: 600 }}>
              {health?.status === 'Healthy' ? 'Saudável' : 'Degradado'}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={3}>
          <Paper sx={{ 
            p: 2.5, 
            bgcolor: '#1e293b', 
            borderLeft: '3px solid #06b6d4'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <PersonIcon sx={{ color: '#06b6d4', fontSize: 20 }} />
              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Líder
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ color: '#06b6d4', fontWeight: 600 }}>
              {health?.leader || 'None'}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={3}>
          <Paper sx={{ 
            p: 2.5, 
            bgcolor: '#1e293b', 
            borderLeft: '3px solid #10b981'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <StorageIcon sx={{ color: '#10b981', fontSize: 20 }} />
              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Nós
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ color: '#10b981', fontWeight: 600 }}>
              {health?.aliveNodes || 0} / {health?.totalNodes || 0}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={3}>
          <Paper sx={{ 
            p: 2.5, 
            bgcolor: '#1e293b', 
            borderLeft: '3px solid #0ea5e9'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <TrendingUpIcon sx={{ color: '#0ea5e9', fontSize: 20 }} />
              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Termo
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ color: '#0ea5e9', fontWeight: 600 }}>
              {health?.currentTerm || 0}
            </Typography>
          </Paper>
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5, bgcolor: '#1e293b', borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#f1f5f9' }}>
              Latência simulada
            </Typography>
            <Box sx={{ height: 280 }}>
              <Line data={latencyChartData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5, bgcolor: '#1e293b', borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#f1f5f9' }}>
              Taxa de transferência simulada
            </Typography>
            <Box sx={{ height: 280 }}>
              <Line data={throughputChartData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2.5, bgcolor: '#1e293b', borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#f1f5f9' }}>
              Uso de recursos simulado
            </Typography>
            <Box sx={{ height: 280 }}>
              <Line data={resourceChartData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>

        {/* Cluster Info */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2.5, bgcolor: '#1e293b', borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 2.5, fontWeight: 600, color: '#f1f5f9' }}>
              Detalhes do Cluster
            </Typography>
            <Grid container spacing={2.5}>
              <Grid item xs={6} md={3}>
                <Box sx={{ p: 2, bgcolor: '#0f172a', borderRadius: 1.5 }}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>Latência média simulada</Typography>
                  <Typography variant="h6" sx={{ color: '#3b82f6', mt: 0.5, fontWeight: 600 }}>{health?.avgLatency || '0'} ms</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ p: 2, bgcolor: '#0f172a', borderRadius: 1.5 }}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>Índice de Commit</Typography>
                  <Typography variant="h6" sx={{ color: '#8b5cf6', mt: 0.5, fontWeight: 600 }}>{health?.commitIndex || 0}</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ p: 2, bgcolor: '#0f172a', borderRadius: 1.5 }}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>Nós Inativos</Typography>
                  <Typography variant="h6" sx={{ color: '#ef4444', mt: 0.5, fontWeight: 600 }}>{health?.deadNodes || 0}</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ p: 2, bgcolor: '#0f172a', borderRadius: 1.5 }}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>Tamanho do Quorum</Typography>
                  <Typography variant="h6" sx={{ color: '#10b981', mt: 0.5, fontWeight: 600 }}>{Math.floor((health?.totalNodes || 0) / 2) + 1}</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
