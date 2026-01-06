import { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Box, Button, Chip, Card, CardContent } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:1098/raft';

interface Node {
  id: string;
  status: string;
  lastHeartbeat: number;
  voteCount: number;
  logIndex: number;
  commitIndex: number;
  ip: string;
  port: number;
}

export default function NodeManagement() {
  const [nodes, setNodes] = useState<Node[]>([]);

  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const res = await axios.get(`${API_BASE}/nodes`);
        setNodes(res.data);
      } catch (error) {
        console.error('Error fetching nodes:', error);
      }
    };

    fetchNodes();
    const interval = setInterval(fetchNodes, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleKillNode = async (nodeId: string) => {
    try {
      await axios.delete(`${API_BASE}/simulate/kill/${nodeId}`);
    } catch (error) {
      console.error('Error killing node:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Leader': return '#3b82f6';
      case 'Follower': return '#10b981';
      case 'Candidate': return '#0ea5e9'; // Azul claro
      case 'Dead': return '#1e40af'; // Azul escuro
      case 'Partitioned': return '#64748b';
      default: return '#64748b';
    }
  };

  const getStatusIcon = (status: string) => {
    return status === 'Dead' || status === 'Partitioned' 
      ? <CancelIcon sx={{ color: '#1e40af' }} /> 
      : <CheckCircleIcon sx={{ color: '#10b981' }} />;
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ color: '#f1f5f9', fontWeight: 600, mb: 0.5 }}>
          Gerenciamento de Nós
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          Controle e monitore cada nó do cluster
        </Typography>
      </Box>

      <Grid container spacing={2.5}>
        {nodes.map((node) => (
          <Grid item xs={12} md={6} lg={4} key={node.id}>
            <Card sx={{ 
              bgcolor: '#1e293b', 
              border: `2px solid ${getStatusColor(node.status)}`,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 20px ${getStatusColor(node.status)}40` }
            }}>
              <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 600 }}>
                    {node.id}
                  </Typography>
                  {getStatusIcon(node.status)}
                </Box>

                <Chip 
                  label={node.status === 'Leader' ? 'Líder' : node.status === 'Follower' ? 'Seguidor' : node.status === 'Dead' ? 'Inativo' : node.status} 
                  size="small"
                  sx={{ 
                    bgcolor: getStatusColor(node.status), 
                    color: '#fff',
                    fontWeight: 600,
                    mb: 2.5,
                    alignSelf: 'flex-start'
                  }} 
                />

                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>Endereço</Typography>
                    <Typography variant="body2" sx={{ color: '#f1f5f9', fontFamily: 'monospace' }}>{node.ip}:{node.port}</Typography>
                  </Box>

                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>Índice de Log</Typography>
                    <Typography variant="body2" sx={{ color: '#f1f5f9', fontWeight: 500 }}>{node.logIndex}</Typography>
                  </Box>

                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>Índice de Commit</Typography>
                    <Typography variant="body2" sx={{ color: '#f1f5f9', fontWeight: 500 }}>{node.commitIndex}</Typography>
                  </Box>

                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>Último Heartbeat</Typography>
                    <Typography variant="body2" sx={{ color: '#f1f5f9', fontSize: '0.85rem' }}>
                      {node.lastHeartbeat > 0 ? new Date(node.lastHeartbeat).toLocaleTimeString('pt-BR') : 'N/A'}
                    </Typography>
                  </Box>

                  {node.status === 'Leader' && (
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>Votos Recebidos</Typography>
                      <Typography variant="body2" sx={{ color: '#f1f5f9', fontWeight: 500 }}>{node.voteCount}</Typography>
                    </Box>
                  )}
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  size="small"
                  startIcon={node.status === 'Dead' ? <RestartAltIcon /> : <CancelIcon />}
                  onClick={() => handleKillNode(node.id)}
                  sx={{
                    mt: 'auto',
                    bgcolor: node.status === 'Dead' ? '#10b981' : '#ef4444',
                    '&:hover': {
                      bgcolor: node.status === 'Dead' ? '#059669' : '#dc2626',
                    },
                  }}
                >
                  {node.status === 'Dead' ? 'Reativar Nó' : 'Desativar Nó'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
