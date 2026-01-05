import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, Box, Typography } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StorageIcon from '@mui/icons-material/Storage';
import DescriptionIcon from '@mui/icons-material/Description';
import BarChartIcon from '@mui/icons-material/BarChart';
import ScienceIcon from '@mui/icons-material/Science';
import SpeedIcon from '@mui/icons-material/Speed';
import { ViewType } from '../../App';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const menuItems = [
  { id: 'overview' as ViewType, label: 'Visão Geral', icon: <DashboardIcon /> },
  { id: 'nodes' as ViewType, label: 'Gerenciamento de Nós', icon: <StorageIcon /> },
  { id: 'logs' as ViewType, label: 'Visualizador de Logs', icon: <DescriptionIcon /> },
  { id: 'metrics' as ViewType, label: 'Métricas e Análises', icon: <BarChartIcon /> },
  { id: 'simulation' as ViewType, label: 'Controles de Simulação', icon: <ScienceIcon /> },
  { id: 'performance' as ViewType, label: 'Testes de Performance', icon: <SpeedIcon /> },
];

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
          bgcolor: '#1e293b',
          borderRight: '1px solid rgba(148, 163, 184, 0.1)',
        },
      }}
    >
      <Box sx={{ p: 3, borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
        <Typography variant="h6" sx={{ color: '#3b82f6', fontWeight: 700, letterSpacing: '-0.5px' }}>
          RaftTS
        </Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>
          Monitor de Consenso
        </Typography>
      </Box>
      
      <List sx={{ pt: 2, px: 1 }}>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.id}
            selected={currentView === item.id}
            onClick={() => onViewChange(item.id)}
            sx={{
              mb: 0.5,
              borderRadius: 2,
              transition: 'all 0.2s',
              '&.Mui-selected': {
                bgcolor: 'rgba(59, 130, 246, 0.15)',
                color: '#3b82f6',
                '&:hover': {
                  bgcolor: 'rgba(59, 130, 246, 0.2)',
                },
              },
              '&:hover': {
                bgcolor: 'rgba(148, 163, 184, 0.05)',
              },
            }}
          >
            <ListItemIcon sx={{ 
              color: currentView === item.id ? '#3b82f6' : '#94a3b8', 
              minWidth: 40,
              transition: 'color 0.2s'
            }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.label} 
              sx={{ 
                '& .MuiTypography-root': { 
                  fontSize: '0.875rem',
                  fontWeight: currentView === item.id ? 600 : 400,
                  color: currentView === item.id ? '#3b82f6' : '#f1f5f9'
                } 
              }} 
            />
          </ListItemButton>
        ))}
      </List>
      
      <Box sx={{ flexGrow: 1 }} />
      
      <Box sx={{ p: 2, borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
          v1.0.0 • Port: 1098
        </Typography>
      </Box>
    </Drawer>
  );
}
