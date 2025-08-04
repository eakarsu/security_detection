import React from 'react';
import { Handle, Position } from 'reactflow';
import { Box, Typography, Chip, Grid, Paper } from '@mui/material';
import { NetworkCheck, Router, Speed, Timeline } from '@mui/icons-material';

interface NetworkAnalysisNodeProps {
  data: {
    label: string;
    config: Record<string, any>;
    status?: 'idle' | 'running' | 'success' | 'error';
  };
}

const NetworkAnalysisNode: React.FC<NetworkAnalysisNodeProps> = ({ data }) => {
  const getStatusColor = () => {
    switch (data.status) {
      case 'running': return '#2196f3';
      case 'success': return '#4caf50';
      case 'error': return '#f44336';
      default: return '#00acc1';
    }
  };

  const packetsAnalyzed = data.config?.packetsAnalyzed || 45123;
  const anomaliesDetected = data.config?.anomaliesDetected || 12;
  const bandwidth = data.config?.bandwidth || '1.2 Gbps';

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
        background: 'linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <NetworkCheck sx={{ color: 'info.main' }} />
        <Box>
          <Typography variant="subtitle2" fontWeight="bold">
            {data.label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Network Traffic Analysis
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={1} sx={{ mb: 2 }}>
        <Grid item xs={4}>
          <Paper elevation={1} sx={{ p: 1, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Packets
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="info.main">
              {packetsAnalyzed.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper elevation={1} sx={{ p: 1, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Anomalies
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="error.main">
              {anomaliesDetected}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper elevation={1} sx={{ p: 1, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Bandwidth
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="success.main">
              {bandwidth}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {['DPI', 'Flow Analysis', 'Protocol Inspection', 'Geo-IP'].map((feature, index) => (
            <Chip
              key={index}
              label={feature}
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.7rem',
                height: 24,
                borderColor: 'info.main',
                color: 'info.main',
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
              background: 'linear-gradient(45deg, #00acc1, #0097a7)',
              color: 'white',
              fontSize: '0.7rem',
              fontWeight: 'bold',
            }}
          />
          <Chip
            label="🌐 Network"
            size="small"
            sx={{
              background: 'linear-gradient(45deg, #2196f3, #1976d2)',
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
          background: '#00acc1',
          width: 12,
          height: 12,
        }}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: '#00acc1',
          width: 12,
          height: 12,
        }}
      />
    </Box>
  );
};

export default NetworkAnalysisNode;