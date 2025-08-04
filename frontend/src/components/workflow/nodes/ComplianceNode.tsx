import React from 'react';
import { Handle, Position } from 'reactflow';
import { Box, Typography, Chip, LinearProgress } from '@mui/material';
import { Gavel as ScaleIcon, Assignment as FileCheckIcon, CheckCircle, EmojiEvents as AwardIcon } from '@mui/icons-material';

interface ComplianceNodeProps {
  data: {
    label: string;
    config: Record<string, any>;
    status?: 'idle' | 'running' | 'success' | 'error';
  };
}

const ComplianceNode: React.FC<ComplianceNodeProps> = ({ data }) => {
  const getStatusColor = () => {
    switch (data.status) {
      case 'running': return '#ff9800';
      case 'success': return '#4caf50';
      case 'error': return '#f44336';
      default: return '#3f51b5';
    }
  };

  const frameworks = data.config?.frameworks || ['SOC2', 'PCI-DSS', 'GDPR'];
  const complianceScore = data.config?.score || 85;

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
          <ScaleIcon sx={{ color: 'secondary.main' }} />
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">
              {data.label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Compliance Monitoring
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="caption" fontWeight="bold" color="secondary.main">
            {complianceScore}%
          </Typography>
          <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
        </Box>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <FileCheckIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
          <Typography variant="caption" fontWeight="medium" color="text.primary">
            Active Frameworks:
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {frameworks.map((framework: string, index: number) => (
            <Chip
              key={index}
              label={framework}
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

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" fontWeight="medium">
            Compliance Score
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {complianceScore}/100
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={complianceScore}
          sx={{
            height: 8,
            borderRadius: 4,
            '& .MuiLinearProgress-bar': {
              backgroundColor: complianceScore >= 90 ? '#4caf50' : complianceScore >= 70 ? '#ff9800' : '#f44336',
              borderRadius: 4,
            },
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label="✨ Enhanced"
            size="small"
            sx={{
              background: 'linear-gradient(45deg, #3f51b5, #9c27b0)',
              color: 'white',
              fontSize: '0.7rem',
              fontWeight: 'bold',
            }}
          />
          <Chip
            icon={<AwardIcon sx={{ fontSize: '12px !important' }} />}
            label="Certified"
            size="small"
            sx={{
              background: 'linear-gradient(45deg, #ff9800, #f57c00)',
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
          background: '#3f51b5',
          width: 12,
          height: 12,
        }}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: '#3f51b5',
          width: 12,
          height: 12,
        }}
      />
    </Box>
  );
};

export default ComplianceNode;