import { useEffect, useState } from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Chip,
  TablePagination,
  TextField
} from '@mui/material';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:1098/raft';

interface LogEntry {
  index: number;
  term: number;
  command: string;
  timestamp: number;
  status: string;
}

export default function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axios.get(`${API_BASE}/logs?limit=100`);
        setLogs(res.data.logs || []);
      } catch (error) {
        console.error('Error fetching logs:', error);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(log => 
    log.command.toLowerCase().includes(filter.toLowerCase()) ||
    log.index.toString().includes(filter)
  );

  const paginatedLogs = filteredLogs.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ color: '#f1f5f9', fontWeight: 600, mb: 0.5 }}>
          Visualizador de Logs
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          Histórico de entradas de log do cluster
        </Typography>
      </Box>

      <Paper sx={{ bgcolor: '#1e293b', p: 2.5, mb: 2.5, borderRadius: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          label="Buscar logs (por comando ou índice)"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#3b82f6',
              },
              '&:hover fieldset': {
                borderColor: '#2563eb',
              },
            },
          }}
        />
      </Paper>

      <TableContainer component={Paper} sx={{ bgcolor: '#1e293b', borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#0f172a' }}>
              <TableCell sx={{ color: '#3b82f6', fontWeight: 600 }}>Índice</TableCell>
              <TableCell sx={{ color: '#3b82f6', fontWeight: 600 }}>Termo</TableCell>
              <TableCell sx={{ color: '#3b82f6', fontWeight: 600 }}>Comando</TableCell>
              <TableCell sx={{ color: '#3b82f6', fontWeight: 600 }}>Timestamp</TableCell>
              <TableCell sx={{ color: '#3b82f6', fontWeight: 600 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedLogs.map((log) => (
              <TableRow 
                key={log.index}
                sx={{ 
                  '&:hover': { bgcolor: '#0f172a' },
                  borderBottom: '1px solid #334155'
                }}
              >
                <TableCell sx={{ color: '#f1f5f9' }}>{log.index}</TableCell>
                <TableCell sx={{ color: '#f1f5f9' }}>{log.term}</TableCell>
                <TableCell sx={{ color: '#f1f5f9', fontFamily: 'monospace' }}>{log.command}</TableCell>
                <TableCell sx={{ color: '#f1f5f9' }}>
                  {new Date(log.timestamp).toLocaleString('pt-BR')}
                </TableCell>
                <TableCell>
                  <Chip
                    label={log.status === 'Committed' ? 'Confirmado' : log.status === 'Pending' ? 'Pendente' : log.status}
                    size="small"
                    sx={{
                      bgcolor: log.status === 'Committed' ? '#10b981' : '#0ea5e9',
                      color: '#ffffff',
                      fontWeight: 600
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredLogs.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{ color: '#f1f5f9' }}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </TableContainer>
    </Box>
  );
}
