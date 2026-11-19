import React from 'react';
import { Card, CardContent, Typography, Box, Chip, CircularProgress, useTheme, alpha } from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { HealthCheckResult } from '../../types/index';

interface ServerStatusProps {
  health: HealthCheckResult | null;
  loading: boolean;
}

export const ServerStatus: React.FC<ServerStatusProps> = ({ health, loading }) => {
  const theme = useTheme();

  const getStatusColor = () => {
    if (!health) return theme.palette.grey[500];
    return health.success ? theme.palette.success.main : theme.palette.error.main;
  };

  const getStatusText = () => {
    if (loading) return 'Verificando...';
    if (!health) return 'Desconhecido';
    return health.success ? 'Online' : 'Offline';
  };

  const statusColor = getStatusColor();

  return (
    <Card
      sx={{
        background: `linear-gradient(135deg, ${alpha(statusColor, 0.15)} 0%, ${alpha(
          statusColor,
          0.05
        )} 100%)`,
        border: `2px solid ${alpha(statusColor, 0.3)}`,
      }}
    >
      <CardContent>
        <Box display="flex" flexDirection="column" alignItems="center" py={2}>
          {loading ? (
            <CircularProgress size={60} sx={{ mb: 2 }} />
          ) : (
            <Box
              sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <FiberManualRecordIcon
                sx={{
                  fontSize: 80,
                  color: statusColor,
                  animation: health?.success ? 'pulse 2s infinite' : 'none',
                  '@keyframes pulse': {
                    '0%, 100%': {
                      opacity: 1,
                      transform: 'scale(1)',
                    },
                    '50%': {
                      opacity: 0.6,
                      transform: 'scale(1.1)',
                    },
                  },
                }}
              />
            </Box>
          )}

          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {getStatusText()}
          </Typography>

          {health && (
            <>
              <Chip
                label={`${health.responseTime}ms`}
                color={health.success ? 'success' : 'error'}
                sx={{ fontWeight: 'bold', fontSize: '1rem', px: 2, py: 2.5 }}
              />

              {health.error && (
                <Typography
                  variant="caption"
                  color="error"
                  sx={{ mt: 2, textAlign: 'center', maxWidth: 300 }}
                >
                  {health.error}
                </Typography>
              )}
            </>
          )}

          <Box mt={2}>
            <Typography variant="caption" color="text.secondary" textAlign="center">
              Status do servidor Raft Node
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ServerStatus;