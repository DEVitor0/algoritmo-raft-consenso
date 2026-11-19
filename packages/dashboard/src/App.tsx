import { useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box, Alert } from '@mui/material';
import Sidebar from './components/Sidebar/Sidebar';
import ClusterOverview from './pages/ClusterOverview';
import NodeManagement from './pages/NodeManagement';
import LogViewer from './pages/LogViewer';
import MetricsAnalytics from './pages/MetricsAnalytics';
import SimulationControls from './pages/SimulationControls';
import PerformanceTesting from './pages/PerformanceTesting';
import './App.css';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3b82f6',
    },
    secondary: {
      main: '#06b6d4', // Ciano
    },
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8',
    },
    error: {
      main: '#1e40af', // Azul escuro
    },
    warning: {
      main: '#0ea5e9', // Azul claro
    },
    info: {
      main: '#06b6d4',
    },
    success: {
      main: '#10b981',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 600,
    },
  },
});

export type ViewType = 'overview' | 'nodes' | 'logs' | 'metrics' | 'simulation' | 'performance';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('overview');

  const renderView = () => {
    switch (currentView) {
      case 'overview':
        return <ClusterOverview />;
      case 'nodes':
        return <NodeManagement />;
      case 'logs':
        return <LogViewer />;
      case 'metrics':
        return <MetricsAnalytics />;
      case 'simulation':
        return <SimulationControls />;
      case 'performance':
        return <PerformanceTesting />;
      default:
        return <ClusterOverview />;
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar currentView={currentView} onViewChange={setCurrentView} />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            overflow: 'auto',
            bgcolor: 'background.default',
          }}
        >
          <Alert
            severity="info"
            variant="outlined"
            sx={{
              mb: 2,
              py: 0.25,
              borderColor: 'rgba(148, 163, 184, 0.25)',
              color: '#94a3b8',
              '& .MuiAlert-icon': { color: '#64748b' },
            }}
          >
            Modo simulação: os dados exibidos são gerados e não representam medições reais
          </Alert>
          {renderView()}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
