import React from 'react';
import { Card, CardContent, Typography, Box, useTheme, alpha } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string; // Allow specific hex or palette name
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  color = 'primary',
}) => {
  const theme = useTheme();

  const getColorValue = () => {
    // If it's a hex code, return it
    if (color.startsWith('#') || color.startsWith('rgb')) return color;

    // Otherwise map to theme palette
    switch (color) {
      case 'success':
        return theme.palette.success.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'error':
        return theme.palette.error.main;
      case 'info':
        return theme.palette.info.main;
      case 'secondary':
        return theme.palette.secondary.main;
      default:
        return theme.palette.primary.main;
    }
  };

  const mainColor = getColorValue();

  return (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(mainColor, 0.1)} 0%, ${alpha(
          mainColor,
          0.05
        )} 100%)`,
        border: `1px solid ${alpha(mainColor, 0.2)}`,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 24px ${alpha(mainColor, 0.3)}`,
        },
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: 1 }}
          >
            {title}
          </Typography>
          {icon && (
            <Box
              sx={{
                color: mainColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </Box>
          )}
        </Box>

        <Typography variant="h3" fontWeight="bold" color={mainColor} mb={1}>
          {value}
        </Typography>

        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}

        {trend && trendValue && (
          <Box display="flex" alignItems="center" mt={1}>
            {trend === 'up' ? (
              <TrendingUpIcon fontSize="small" sx={{ color: theme.palette.success.main, mr: 0.5 }} />
            ) : trend === 'down' ? (
              <TrendingDownIcon fontSize="small" sx={{ color: theme.palette.error.main, mr: 0.5 }} />
            ) : null}
            <Typography
              variant="caption"
              sx={{
                color: trend === 'up' ? theme.palette.success.main : theme.palette.error.main,
                fontWeight: 600,
              }}
            >
              {trendValue}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard;