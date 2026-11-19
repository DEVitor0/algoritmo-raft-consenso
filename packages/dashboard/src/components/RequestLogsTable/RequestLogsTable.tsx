import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip
} from '@mui/material';

interface LogEntry {
  index: number;
  term: number;
  command: string;
  timestamp: number;
  status: string;
}

interface RequestLogsTableProps {
  logs: LogEntry[];
  maxRows?: number;
}

const RequestLogsTable: React.FC<RequestLogsTableProps> = ({ logs, maxRows = 10 }) => {
  const displayLogs = logs.slice(0, maxRows);

  return (
    <TableContainer component={Paper} elevation={0}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Index</TableCell>
            <TableCell>Term</TableCell>
            <TableCell>Command</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Time</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {displayLogs.map((log) => (
            <TableRow key={log.index}>
              <TableCell>#{log.index}</TableCell>
              <TableCell>{log.term}</TableCell>
              <TableCell sx={{ fontFamily: 'monospace' }}>{log.command}</TableCell>
              <TableCell>
                <Chip 
                  label={log.status} 
                  size="small" 
                  color={log.status === 'Committed' ? 'success' : 'warning'} 
                  variant="outlined"
                />
              </TableCell>
              <TableCell align="right">
                {new Date(log.timestamp).toLocaleTimeString()}
              </TableCell>
            </TableRow>
          ))}
          {logs.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} align="center">No logs available</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default RequestLogsTable;