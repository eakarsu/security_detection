import React from 'react';
import { Handle, Position } from 'reactflow';
import { Box, Typography, Chip, Grid, Paper } from '@mui/material';
import { Visibility, Mouse, Bolt, GpsFixed } from '@mui/icons-material';

interface DeceptionNodeProps {
  data: {
    label: string;
    config: Record<string, any>;
    status?: 'idle' | 'running' | 'success' | 'error';
  };
}

const DeceptionNode: React.FC<DeceptionNodeProps> = ({ data }) => {
  const getStatusColor = () => {
    switch (data.status) {
      case 'running': return '#9c27b0';
      case 'success': return '#4caf50';
      case 'error': return '#f44336';
      default: return '#673ab7';
    }
  };

  const honeypotsActive = data.config?.honeypotsActive || 12;
  const deceptionLevel = data.config?.deceptionLevel || 'Advanced';
  const threatsDetected = data.config?.threatsDetected || 3;

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
        background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Visibility sx={{ color: 'secondary.main' }} />
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">
              {data.label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Deception Technology
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <GpsFixed sx={{ fontSize: 16, color: 'secondary.main' }} />
          <Typography variant="caption" fontWeight="bold" color="secondary.main">
            {deceptionLevel}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={1} sx={{ mb: 2 }}>
        <Grid item xs={6}>
          <Paper elevation={1} sx={{ p: 1, textAlign: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
              <Mouse sx={{ fontSize: 16, color: 'secondary.main' }} />
              <Typography variant="caption" color="text.secondary">
                Honeypots
              </Typography>
            </Box>
            <Typography variant="body2" fontWeight="bold" color="secondary.main">
              {honeypotsActive} Active
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6}>
          <Paper elevation={1} sx={{ p: 1, textAlign: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
              <Bolt sx={{ fontSize: 16, color: 'error.main' }} />
              <Typography variant="caption" color="text.secondary">
                Threats
              </Typography>
            </Box>
            <Typography variant="body2" fontWeight="bold" color="error.main">
              {threatsDetected} Detected
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Visibility sx={{ fontSize: 16, color: 'secondary.main' }} />
          <Typography variant="caption" fontWeight="medium" color="text.primary">
            Active Deceptions:
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {['Honeypots', 'Decoy Files', 'Fake Credentials', 'Breadcrumbs'].map((type, index) => (
            <Chip
              key={index}
              label={type}
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.7rem',
                height: 24,
                borderColor: 'secondary.main',
                color: 'secondary.main',
              }}
            />
          ))}
        </Box>
      </Box>

      <Paper elevation={1} sx={{ p: 1, mb: 2, background: 'linear-gradient(45deg, #f3e5f5, #e1bee7)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" fontWeight="medium">
            Attacker Engagement
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'success.main' }} />
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'warning.main' }} />
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'error.main' }} />
          </Box>
        </Box>
        <Typography variant="caption" color="secondary.main" fontWeight="medium">
          {threatsDetected > 0 ? `${threatsDetected} active interactions` : 'Monitoring for threats...'}
        </Typography>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label="✨ Enhanced"
            size="small"
            sx={{
              background: 'linear-gradient(45deg, #673ab7, #9c27b0)',
              color: 'white',
              fontSize: '0.7rem',
              fontWeight: 'bold',
            }}
          />
          <Chip
            label="🎭 Deception"
            size="small"
            sx={{
              background: 'linear-gradient(45deg, #e91e63, #ad1457)',
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
          background: '#673ab7',
          width: 12,
          height: 12,
        }}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: '#673ab7',
          width: 12,
          height: 12,
        }}
      />
    </Box>
  );
};

export default DeceptionNode;