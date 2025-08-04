import React from 'react';
import { Handle, Position } from 'reactflow';
import { Box, Typography, Chip, Grid, Paper } from '@mui/material';
import { Hub, CloudSync, Speed, Sync } from '@mui/icons-material';

interface SIEMIntegrationNodeProps {
  data: {
    label: string;
    config: Record<string, any>;
    status?: 'idle' | 'running' | 'success' | 'error';
  };
}

const SIEMIntegrationNode: React.FC<SIEMIntegrationNodeProps> = ({ data }) => {
  const getStatusColor = () => {
    switch (data.status) {
      case 'running': return '#ff5722';
      case 'success': return '#4caf50';
      case 'error': return '#f44336';
      default: return '#795548';
    }
  };

  const connectedSystems = data.config?.connectedSystems || 15;
  const eventsPerSecond = data.config?.eventsPerSecond || 2340;
  const correlationRules = data.config?.correlationRules || 89;

  return (
    <Box
      sx={{
        padding: 2,
        border: '2px solid',
        borderColor: getStatusColor(),
        borderRadius: 2,
        backgroundColor: 'background.paper',
        minWidth: 300,
        boxShadow: 4,
        background: 'linear-gradient(135deg, #efebe9 0%, #d7ccc8 100%)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Hub sx={{ color: 'warning.main' }} />
        <Box>
          <Typography variant="subtitle2" fontWeight="bold">
            {data.label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            SIEM Platform Integration
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={1} sx={{ mb: 2 }}>
        <Grid item xs={4}>
          <Paper elevation={1} sx={{ p: 1, textAlign: 'center' }}>
            <CloudSync sx={{ fontSize: 16, color: 'warning.main', mb: 0.5 }} />
            <Typography variant="caption" color="text.secondary" display="block">
              Systems
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="warning.main">
              {connectedSystems}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper elevation={1} sx={{ p: 1, textAlign: 'center' }}>
            <Speed sx={{ fontSize: 16, color: 'info.main', mb: 0.5 }} />
            <Typography variant="caption" color="text.secondary" display="block">
              Events/sec
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="info.main">
              {eventsPerSecond.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper elevation={1} sx={{ p: 1, textAlign: 'center' }}>
            <Sync sx={{ fontSize: 16, color: 'success.main', mb: 0.5 }} />
            <Typography variant="caption" color="text.secondary" display="block">
              Rules
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="success.main">
              {correlationRules}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" fontWeight="medium" color="text.primary" sx={{ mb: 1, display: 'block' }}>
          Supported Platforms:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {['Splunk', 'QRadar', 'ArcSight', 'Sentinel', 'LogRhythm'].map((platform, index) => (
            <Chip
              key={index}
              label={platform}
              size="small"
              variant="filled"
              sx={{
                fontSize: '0.7rem',
                height: 24,
                backgroundColor: 'warning.light',
                color: 'warning.contrastText',
              }}
            />
          ))}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label="✨ Enhanced"
            size="small"
            sx={{
              background: 'linear-gradient(45deg, #795548, #5d4037)',
              color: 'white',
              fontSize: '0.7rem',
              fontWeight: 'bold',
            }}
          />
          <Chip
            label="🔗 SIEM"
            size="small"
            sx={{
              background: 'linear-gradient(45deg, #ff5722, #d84315)',
              color: 'white',
              fontSize: '0.7rem',
              fontWeight: 'bold',
            }}
          />
        </Box>
        {data.status && (
          <Chip
            label={data.status}
            size="small"
            sx={{
              backgroundColor: getStatusColor(),
              color: 'white',
              fontSize: '0.7rem',
            }}
          />
        )}
      </Box>
      
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: '#795548',
          width: 12,
          height: 12,
        }}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: '#795548',
          width: 12,
          height: 12,
        }}
      />
    </Box>
  );
};

export default SIEMIntegrationNode;