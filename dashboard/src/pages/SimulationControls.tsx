import { useState } from 'react';
import { Grid, Paper, Typography, Box, Button, TextField, Alert } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:1098/raft';

export default function SimulationControls() {
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [partitionNodes, setPartitionNodes] = useState('');

  const handleSimulateElection = async () => {
    try {
      const res = await axios.post(`${API_BASE}/simulate/election`);
      setMessage({ text: res.data.message, type: 'success' });
    } catch (error: any) {
      setMessage({ text: error.response?.data?.message || 'Falha na eleição', type: 'error' });
    }
  };

  const handleNetworkPartition = async () => {
    try {
      const nodeIds = partitionNodes.split(',').map(n => n.trim()).filter(n => n);
      const res = await axios.post(`${API_BASE}/simulate/partition`, { nodeIds });
      setMessage({ text: res.data.message, type: 'success' });
    } catch (error: any) {
      setMessage({ text: error.response?.data?.error || 'Falha na partição', type: 'error' });
    }
  };

  const handleResetCluster = async () => {
    try {
      const res = await axios.post(`${API_BASE}/simulate/reset`);
      setMessage({ text: res.data.message, type: 'success' });
    } catch (error: any) {
      setMessage({ text: error.response?.data?.error || 'Falha ao resetar', type: 'error' });
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ color: '#f1f5f9', fontWeight: 600, mb: 0.5 }}>
          Controles de Simulação
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          Teste cenários de falha e recuperação
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
        {/* Leader Election */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5, bgcolor: '#1e293b', borderTop: '3px solid #3b82f6', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <HowToVoteIcon sx={{ color: '#3b82f6', mr: 1, fontSize: 28 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#f1f5f9' }}>Eleição de Líder</Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2.5, lineHeight: 1.6 }}>
              Força uma nova eleição de líder. O cluster incrementará o termo e os nós votarão em um novo líder.
            </Typography>
            <Button
              fullWidth
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={handleSimulateElection}
              sx={{
                bgcolor: '#3b82f6',
                '&:hover': { bgcolor: '#2563eb' },
              }}
            >
              Iniciar Eleição
            </Button>
          </Paper>
        </Grid>

        {/* Network Partition */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5, bgcolor: '#1e293b', borderTop: '3px solid #f59e0b', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <NetworkCheckIcon sx={{ color: '#f59e0b', mr: 1, fontSize: 28 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#f1f5f9' }}>Partição de Rede</Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2.5, lineHeight: 1.6 }}>
              Simula partição de rede isolando nós específicos. Recuperação automática após 10 segundos.
            </Typography>
            <TextField
              fullWidth
              label="IDs dos Nós (separados por vírgula)"
              placeholder="ex: Node1, Node3"
              value={partitionNodes}
              onChange={(e) => setPartitionNodes(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              fullWidth
              variant="contained"
              startIcon={<NetworkCheckIcon />}
              onClick={handleNetworkPartition}
              sx={{
                bgcolor: '#f59e0b',
                '&:hover': { bgcolor: '#d97706' },
              }}
            >
              Simular Partição
            </Button>
          </Paper>
        </Grid>

        {/* Reset Cluster */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5, bgcolor: '#1e293b', borderTop: '3px solid #10b981', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <RestartAltIcon sx={{ color: '#10b981', mr: 1, fontSize: 28 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#f1f5f9' }}>Resetar Cluster</Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2.5, lineHeight: 1.6 }}>
              Reseta todo o cluster ao estado inicial. Todos os nós serão reativados, logs limpos e métricas resetadas.
            </Typography>
            <Button
              fullWidth
              variant="contained"
              startIcon={<RestartAltIcon />}
              onClick={handleResetCluster}
              sx={{
                bgcolor: '#10b981',
                '&:hover': { bgcolor: '#059669' },
              }}
            >
              Resetar Cluster
            </Button>
          </Paper>
        </Grid>

        {/* Info Panel */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5, bgcolor: '#1e293b', borderTop: '3px solid #64748b', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#f1f5f9' }}>Informações de Simulação</Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1, lineHeight: 1.6 }}>
              • Eleições testam a capacidade do algoritmo de selecionar um novo líder
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1, lineHeight: 1.6 }}>
              • Partições de rede testam cenários de split-brain e recuperação
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1, lineHeight: 1.6 }}>
              • Gerenciamento de nós permite testar cenários de falha
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8', lineHeight: 1.6 }}>
              • Reset retorna todos os componentes ao estado inicial
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
