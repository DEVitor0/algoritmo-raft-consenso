import React from 'react';
import { Typography, Box, useTheme } from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface IRaftMetrics {
  timestamps: string[];
  latency: number[];
  throughput: number[];
  memoryUsage: number[];
}

interface ResponseTimeChartProps {
  data: IRaftMetrics;
}

const ResponseTimeChart: React.FC<ResponseTimeChartProps> = ({ data }) => {
  const theme = useTheme();

  // Guard against undefined data
  if (!data || !data.timestamps || data.timestamps.length === 0) {
    return (
      <Box sx={{ height: '100%', width: '100%', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">No data available</Typography>
      </Box>
    );
  }

  const chartData = {
    labels: data.timestamps,
    datasets: [
      {
        label: 'Latency (ms)',
        data: data.latency,
        borderColor: theme.palette.secondary.main,
        backgroundColor: `${theme.palette.secondary.main}20`,
        fill: true,
        tension: 0.4,
        yAxisID: 'y',
      },
      {
        label: 'Throughput (ops/s)',
        data: data.throughput,
        borderColor: theme.palette.primary.main,
        backgroundColor: `${theme.palette.primary.main}20`,
        fill: true,
        tension: 0.4,
        yAxisID: 'y1',
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: theme.palette.text.primary },
      },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: theme.palette.text.secondary },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: { display: true, text: 'Latency (ms)', color: theme.palette.secondary.main },
        ticks: { color: theme.palette.text.secondary },
        grid: { color: theme.palette.divider },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: { display: true, text: 'Throughput (ops/s)', color: theme.palette.primary.main },
        ticks: { color: theme.palette.text.secondary },
        grid: { drawOnChartArea: false },
      },
    },
  };

  return (
    <Box sx={{ height: '100%', width: '100%', minHeight: 300 }}>
        <Line options={options} data={chartData} />
    </Box>
  );
};

export default ResponseTimeChart;