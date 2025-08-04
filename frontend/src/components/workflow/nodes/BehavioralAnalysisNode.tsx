import React from 'react';
import { Handle, Position } from 'reactflow';
import { Box, Typography, Chip, Grid, Paper } from '@mui/material';
import { Psychology, Visibility, TrendingUp, PersonSearch } from '@mui/icons-material';

interface BehavioralAnalysisNodeProps {
  data: {
    label: string;
    config: Record<string, any>;
    status?: 'idle' | 'running' | 'success' | 'error';
  };
}

const BehavioralAnalysisNode: React.FC<BehavioralAnalysisNodeProps> = ({ data }) => {
  const getStatusColor = () => {
    switch (data.status) {
      case 'running': return '#9c27b0';
      case 'success': return '#4caf50';
      case 'error': return '#f44336';
      default: return '#673ab7';
    }
  };

  const usersMonitored = data.config?.usersMonitored || 1247;
  const anomalousActivities = data.config?.anomalousActivities || 8;
  const riskScore = data.config?.riskScore || 6.2;

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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Psychology sx={{ color: 'secondary.main' }} />
        <Box>
          <Typography variant="subtitle2" fontWeight="bold">
            {data.label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            User Behavior Analytics
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={1} sx={{ mb: 2 }}>
        <Grid item xs={4}>
          <Paper elevation={1} sx={{ p: 1, textAlign: 'center' }}>
            <PersonSearch sx={{ fontSize: 16, color: 'secondary.main', mb: 0.5 }} />
            <Typography variant="caption" color="text.secondary" display="block">
              Users
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="secondary.main">
              {usersMonitored.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper elevation={1} sx={{ p: 1, textAlign: 'center' }}>
            <Visibility sx={{ fontSize: 16, color: 'warning.main', mb: 0.5 }} />
            <Typography variant="caption" color="text.secondary" display="block">
              Anomalies
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="warning.main">
              {anomalousActivities}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper elevation={1} sx={{ p: 1, textAlign: 'center' }}>
            <TrendingUp sx={{ fontSize: 16, color: 'error.main', mb: 0.5 }} />
            <Typography variant="caption" color="text.secondary" display="block">
              Risk Score
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="error.main">
              {riskScore}/10
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {['ML Models', 'Pattern Recognition', 'Baseline Learning', 'Peer Analysis'].map((method, index) => (
            <Chip
              key={index}
              label={method}
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
            label="🧠 Behavioral"
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

export default BehavioralAnalysisNode;