import React from 'react';
import { Handle, Position } from 'reactflow';
import { Box, Typography, Chip } from '@mui/material';
import { Analytics as AnalyticsIcon } from '@mui/icons-material';

interface MLScoringNodeProps {
  data: {
    label: string;
    config: Record<string, any>;
    status?: 'idle' | 'running' | 'success' | 'error';
  };
}

const MLScoringNode: React.FC<MLScoringNodeProps> = ({ data }) => {
  const getStatusColor = () => {
    switch (data.status) {
      case 'running': return '#ff9800';
      case 'success': return '#4caf50';
      case 'error': return '#f44336';
      default: return '#9e9e9e';
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
        minWidth: 200,
        boxShadow: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <AnalyticsIcon sx={{ color: 'primary.main' }} />
        <Typography variant="subtitle2" fontWeight="bold">
          {data.label}
        </Typography>
      </Box>
      
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Model: {data.config?.model || 'Unknown'}
      </Typography>
      
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Threshold: {data.config?.threshold || 0.7}
      </Typography>
      
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
      
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: '#2196f3',
          width: 12,
          height: 12,
        }}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: '#2196f3',
          width: 12,
          height: 12,
        }}
      />
    </Box>
  );
};

export default MLScoringNode;
