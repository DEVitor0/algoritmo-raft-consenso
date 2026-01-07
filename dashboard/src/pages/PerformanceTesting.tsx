import { useState, useEffect } from 'react';
import { Grid, Paper, Typography, Box, Button, TextField, Slider, Alert } from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import SlowMotionVideoIcon from '@mui/icons-material/SlowMotionVideo';
import AssessmentIcon from '@mui/icons-material/Assessment';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:1098/raft';

interface ConsensusStats {
  currentTerm: number;
  leader: string;
  quorumSize: number;
  clusterSize: number;
  aliveNodes: number;
  committedLogs: number;
  pendingLogs: number;
  commitIndex: number;
  consensusHealth: string;
  replicationFactor: number;
  avgReplicationLag: number;
}

export default function PerformanceTesting() {
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [loadDuration, setLoadDuration] = useState(5);
  const [loadIntensity, setLoadIntensity] = useState(2000);
  const [slowdownNode, setSlowdownNode] = useState('node-2');
  const [slowdownDuration, setSlowdownDuration] = useState(10);
  const [stats, setStats] = useState<ConsensusStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${API_BASE}/analytics/consensus`);
        setStats(res.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleGenerateLoad = async () => {
    try {
      const res = await axios.post(`${API_BASE}/simulate/load`, {
        duration: loadDuration,
        intensity: loadIntensity
      });
      setMessage({ text: res.data.message, type: 'success' });
    } catch (error: any) {
      setMessage({ text: error.response?.data?.error || 'Falha na geração de carga', type: 'error' });
    }
  };

  const handleSlowdown = async () => {
    try {
      const res = await axios.post(`${API_BASE}/simulate/slowdown`, {
        nodeId: slowdownNode,
        duration: slowdownDuration
      });
      setMessage({ text: res.data.message, type: 'success' });
    } catch (error: any) {
      setMessage({ text: error.response?.data?.error || 'Falha na simulação de lentidão', type: 'error' });
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ color: '#f1f5f9', fontWeight: 600, mb: 0.5 }}>
          Testes de Performance
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          Teste de carga e simulação de lentidão
        </Typography>
      </Box>

      {message && (
        <Alert 
          severity={message.type} 
          onClose={() => setMessage(null)}
          sx={{ mb: 2.5 }}
        >
          {message.text}
        </Alert>
      )}

      <Grid container spacing={2.5}>
        {/* Consensus Stats */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2.5, bgcolor: '#1e293b', borderLeft: '4px solid #3b82f6', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#f1f5f9' }}>Estatísticas de Consenso</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>Termo Atual</Typography>
                <Typography variant="h6" sx={{ color: '#f1f5f9' }}>{stats?.currentTerm || 0}</Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>Tamanho do Quorum</Typography>
                <Typography variant="h6" sx={{ color: '#f1f5f9' }}>{stats?.quorumSize || 0}</Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>Logs Confirmados</Typography>
                <Typography variant="h6" sx={{ color: '#f1f5f9' }}>{stats?.committedLogs || 0}</Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>Logs Pendentes</Typography>
                <Typography variant="h6" sx={{ color: '#f1f5f9' }}>{stats?.pendingLogs || 0}</Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>Saúde do Consenso</Typography>
                <Typography 
                  variant="h6" 
                  sx={{ color: stats?.consensusHealth === 'Healthy' ? '#10b981' : '#1e40af' }}
                >
                  {stats?.consensusHealth === 'Healthy' ? 'Saudável' : stats?.consensusHealth === 'Degraded' ? 'Degradado' : 'Desconhecido'}
                </Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>Fator de Replicação</Typography>
                <Typography variant="h6" sx={{ color: '#f1f5f9' }}>{stats?.replicationFactor || 0}</Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>Lag Médio de Replicação</Typography>
                <Typography variant="h6" sx={{ color: '#f1f5f9' }}>{stats?.avgReplicationLag.toFixed(2) || 0}</Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>Índice de Commit</Typography>
                <Typography variant="h6" sx={{ color: '#f1f5f9' }}>{stats?.commitIndex || 0}</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Load Generation */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5, bgcolor: '#1e293b', borderTop: '3px solid #0ea5e9', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SpeedIcon sx={{ color: '#0ea5e9', mr: 1, fontSize: 28 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#f1f5f9' }}>Geração de Carga</Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2.5, lineHeight: 1.6 }}>
              Gera carga artificial para testar o cluster sob estresse.
            </Typography>

            <Typography sx={{ color: '#f1f5f9', mb: 1 }}>Duração: {loadDuration}s</Typography>
            <Slider
              value={loadDuration}
              onChange={(_, val) => setLoadDuration(val as number)}
              min={1}
              max={30}
              marks
              sx={{ mb: 3, color: '#0ea5e9' }}
            />

            <Typography sx={{ color: '#f1f5f9', mb: 1 }}>Intensidade: {loadIntensity} ops/s</Typography>
            <Slider
              value={loadIntensity}
              onChange={(_, val) => setLoadIntensity(val as number)}
              min={500}
              max={5000}
              step={500}
              marks
              sx={{ mb: 3, color: '#0ea5e9' }}
            />

            <Button
              fullWidth
              variant="contained"
              startIcon={<SpeedIcon />}
              onClick={handleGenerateLoad}
              sx={{
                bgcolor: '#0ea5e9',
                '&:hover': { bgcolor: '#0284c7' },
              }}
            >
              Gerar Carga
            </Button>
          </Paper>
        </Grid>

        {/* Node Slowdown */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5, bgcolor: '#1e293b', borderTop: '3px solid #10b981', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SlowMotionVideoIcon sx={{ color: '#10b981', mr: 1, fontSize: 28 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#f1f5f9' }}>Lentidão de Nó</Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2.5, lineHeight: 1.6 }}>
              Simula um nó lento para testar lag de replicação e recuperação.
            </Typography>

            <TextField
              fullWidth
              label="ID do Nó"
              value={slowdownNode}
              onChange={(e) => setSlowdownNode(e.target.value)}
              sx={{ mb: 2 }}
            />

            <Typography sx={{ color: '#f1f5f9', mb: 1 }}>Duração: {slowdownDuration}s</Typography>
            <Slider
              value={slowdownDuration}
              onChange={(_, val) => setSlowdownDuration(val as number)}
              min={5}
              max={60}
              marks
              sx={{ mb: 3, color: '#10b981' }}
            />

            <Button
              fullWidth
              variant="contained"
              startIcon={<SlowMotionVideoIcon />}
              onClick={handleSlowdown}
              sx={{
                bgcolor: '#10b981',
                '&:hover': { bgcolor: '#059669' },
              }}
            >
              Simular Lentidão
            </Button>
          </Paper>
        </Grid>

        {/* Testing Guidelines */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2.5, bgcolor: '#1e293b', borderTop: '3px solid #64748b', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <AssessmentIcon sx={{ color: '#64748b', mr: 1, fontSize: 28 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#f1f5f9' }}>Diretrizes de Teste de Performance</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ color: '#3b82f6', mb: 1.5, fontWeight: 600 }}>
                  Melhores Práticas de Teste de Carga:
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', mb: 0.8, lineHeight: 1.6 }}>
                  • Comece com baixa intensidade e aumente gradualmente
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', mb: 0.8, lineHeight: 1.6 }}>
                  • Monitore métricas durante a carga para identificar gargalos
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', lineHeight: 1.6 }}>
                  • Teste com diferentes durações para simular vários cenários
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ color: '#3b82f6', mb: 1.5, fontWeight: 600 }}>
                  Dicas de Teste de Lentidão:
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', mb: 0.8, lineHeight: 1.6 }}>
                  • Teste nós individuais para observar lag de replicação
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', mb: 0.8, lineHeight: 1.6 }}>
                  • Combine com geração de carga para teste de estresse
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', lineHeight: 1.6 }}>
                  • Observe como o cluster compensa nós lentos
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
