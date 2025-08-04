import React from 'react';
import { Handle, Position } from 'reactflow';
import { Box, Typography, Chip, Grid, Paper } from '@mui/material';
import { Search, Storage as DatabaseIcon, Schedule as ClockIcon, Fingerprint } from '@mui/icons-material';

interface ForensicsNodeProps {
  data: {
    label: string;
    config: Record<string, any>;
    status?: 'idle' | 'running' | 'success' | 'error';
  };
}

const ForensicsNode: React.FC<ForensicsNodeProps> = ({ data }) => {
  const getStatusColor = () => {
    switch (data.status) {
      case 'running': return '#00bcd4';
      case 'success': return '#4caf50';
      case 'error': return '#f44336';
      default: return '#607d8b';
    }
  };

  const artifactsCollected = data.config?.artifactsCollected || 247;
  const timelineDepth = data.config?.timelineDepth || '30 days';
  const evidenceIntegrity = data.config?.evidenceIntegrity || 'Verified';

  const getIntegrityColor = () => {
    switch (evidenceIntegrity) {
      case 'Verified': return '#4caf50';
      case 'Pending': return '#ff9800';
      default: return '#f44336';
    }
  };

  return (
    <Box
      sx={{
        padding: 2,
        border: '2px solid',
        borderColor: getStatusColor(),
        borderRadius: 2,
        backgroundColor: 'background.paper',
        minWidth: 320,
        boxShadow: 4,
        background: 'linear-gradient(135deg, #eceff1 0%, #cfd8dc 100%)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Search sx={{ color: 'primary.main' }} />
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">
              {data.label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Digital Forensics Engine
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Fingerprint sx={{ fontSize: 16, color: 'grey.600' }} />
          <Typography variant="caption" fontWeight="bold" color="grey.700">
            Chain of Custody
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={1} sx={{ mb: 2 }}>
        <Grid item xs={6}>
          <Paper elevation={1} sx={{ p: 1, textAlign: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
              <DatabaseIcon sx={{ fontSize: 16, color: 'grey.600' }} />
              <Typography variant="caption" color="text.secondary">
                Artifacts
              </Typography>
            </Box>
            <Typography variant="body2" fontWeight="bold" color="grey.800">
              {artifactsCollected}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6}>
          <Paper elevation={1} sx={{ p: 1, textAlign: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
              <ClockIcon sx={{ fontSize: 16, color: 'info.main' }} />
              <Typography variant="caption" color="text.secondary">
                Timeline
              </Typography>
            </Box>
            <Typography variant="body2" fontWeight="bold" color="info.main">
              {timelineDepth}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper elevation={1} sx={{ p: 1, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: getIntegrityColor(),
              }}
            />
            <Typography variant="caption" fontWeight="medium">
              Evidence Integrity:
            </Typography>
          </Box>
          <Typography
            variant="caption"
            fontWeight="bold"
            sx={{ color: getIntegrityColor() }}
          >
            {evidenceIntegrity}
          </Typography>
        </Box>
      </Paper>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {['Memory Analysis', 'Disk Imaging', 'Network Traces', 'Log Analysis'].map((type, index) => (
            <Chip
              key={index}
              label={type}
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.7rem',
                height: 24,
                borderColor: 'grey.400',
                color: 'grey.700',
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
              background: 'linear-gradient(45deg, #607d8b, #455a64)',
              color: 'white',
              fontSize: '0.7rem',
              fontWeight: 'bold',
            }}
          />
          <Chip
            label="🔍 Forensics"
            size="small"
            sx={{
              background: 'linear-gradient(45deg, #00bcd4, #0097a7)',
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
          background: '#607d8b',
          width: 12,
          height: 12,
        }}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: '#607d8b',
          width: 12,
          height: 12,
        }}
      />
    </Box>
  );
};

export default ForensicsNode;