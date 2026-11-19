import React from 'react';
import { Card, CardContent, Typography, Box, useTheme } from '@mui/material';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartOptions } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface SuccessRateChartProps {
  successRate: number;
}

export const SuccessRateChart: React.FC<SuccessRateChartProps> = ({ successRate }) => {
  const theme = useTheme();
  const failureRate = 100 - successRate;

  const data = {
    labels: ['Sucesso', 'Falha'],
    datasets: [
      {
        data: [successRate, failureRate],
        backgroundColor: [theme.palette.success.main, theme.palette.error.main],
        borderColor: [theme.palette.success.dark, theme.palette.error.dark],
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: theme.palette.text.primary,
          font: {
            size: 12,
            weight: 600,
          },
          padding: 15,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context) => {
            return `${context.label}: ${context.parsed.toFixed(1)}%`;
          },
        },
      },
    },
    cutout: '70%',
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          ✅ Taxa de Sucesso
        </Typography>
        <Box sx={{ height: 250, position: 'relative', mt: 2 }}>
          <Doughnut data={data} options={options} />
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <Typography variant="h3" fontWeight="bold" color="primary">
              {successRate.toFixed(0)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Sucesso
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
