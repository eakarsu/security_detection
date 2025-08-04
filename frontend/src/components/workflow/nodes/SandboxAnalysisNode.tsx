import React from 'react';
import { Handle, Position } from 'reactflow';
import { Box, Typography, Chip, Grid, Paper } from '@mui/material';
import { Security, BugReport, Timer, CheckCircle } from '@mui/icons-material';

interface SandboxAnalysisNodeProps {
  data: {
    label: string;
    config: Record<string, any>;
    status?: 'idle' | 'running' | 'success' | 'error';
  };
}

const SandboxAnalysisNode: React.FC<SandboxAnalysisNodeProps> = ({ data }) => {
  const getStatusColor = () => {
    switch (data.status) {
      case 'running': return '#ff6f00';
      case 'success': return '#4caf50';
      case 'error': return '#f44336';
      default: return '#ff8f00';
    }
  };

  const filesAnalyzed = data.config?.filesAnalyzed || 156;
  const malwareDetected = data.config?.malwareDetected || 12;
  const analysisTime = data.config?.analysisTime || '2.3 min';

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
        background: 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Security sx={{ color: 'warning.dark' }} />
        <Box>
          <Typography variant="subtitle2" fontWeight="bold">
            {data.label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Dynamic Malware Analysis
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={1} sx={{ mb: 2 }}>
        <Grid item xs={4}>
          <Paper elevation={1} sx={{ p: 1, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Files
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="warning.dark">
              {filesAnalyzed}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper elevation={1} sx={{ p: 1, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Threats
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="error.main">
              {malwareDetected}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper elevation={1} sx={{ p: 1, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Avg Time
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="info.main">
              {analysisTime}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mb: 2 }}>
        <Paper elevation={1} sx={{ p: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justify: 'space-between' }}>
            <Typography variant="caption" fontWeight="medium">
              Sandbox Environment:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: 'success.main',
                }}
              />
              <Typography variant="caption" color="success.main" fontWeight="bold">
                Isolated
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {['Dynamic Analysis', 'Static Analysis', 'Behavioral', 'Network Monitor'].map((feature, index) => (
            <Chip
              key={index}
              label={feature}
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.7rem',
                height: 24,
                borderColor: 'warning.dark',
                color: 'warning.dark',
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
              background: 'linear-gradient(45deg, #ff8f00, #ef6c00)',
              color: 'white',
              fontSize: '0.7rem',
              fontWeight: 'bold',
            }}
          />
          <Chip
            label="🔒 Sandbox"
            size="small"
            sx={{
              background: 'linear-gradient(45deg, #ff6f00, #e65100)',
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
          background: '#ff8f00',
          width: 12,
          height: 12,
        }}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: '#ff8f00',
          width: 12,
          height: 12,
        }}
      />
    </Box>
  );
};

export default SandboxAnalysisNode;