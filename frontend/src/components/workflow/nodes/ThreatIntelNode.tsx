import React from 'react';
import { Handle, Position } from 'reactflow';
import { Box, Typography, Chip } from '@mui/material';
import { Security as ShieldIcon, Public as GlobeIcon, TrendingUp } from '@mui/icons-material';

interface ThreatIntelNodeProps {
  data: {
    label: string;
    config: Record<string, any>;
    status?: 'idle' | 'running' | 'success' | 'error';
  };
}

const ThreatIntelNode: React.FC<ThreatIntelNodeProps> = ({ data }) => {
  const getStatusColor = () => {
    switch (data.status) {
      case 'running': return '#ff9800';
      case 'success': return '#4caf50';
      case 'error': return '#f44336';
      default: return '#2196f3';
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
        minWidth: 280,
        boxShadow: 4,
        position: 'relative',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <ShieldIcon sx={{ color: 'primary.main' }} />
        <Box>
          <Typography variant="subtitle2" fontWeight="bold">
            {data.label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Threat Intelligence Engine
          </Typography>
        </Box>
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <GlobeIcon sx={{ fontSize: 16, color: 'info.main' }} />
          <Typography variant="caption" color="text.secondary">
            Sources: {data.config?.sources?.length || 5} feeds
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />
          <Typography variant="caption" color="text.secondary">
            Confidence: {data.config?.confidence || 'High'}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label="✨ Enhanced"
            size="small"
            sx={{
              background: 'linear-gradient(45deg, #673ab7, #2196f3)',
              color: 'white',
              fontSize: '0.7rem',
              fontWeight: 'bold',
            }}
          />
          <Chip
            label="🛡️ Intel"
            size="small"
            sx={{
              background: 'linear-gradient(45deg, #4caf50, #8bc34a)',
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

export default ThreatIntelNode;