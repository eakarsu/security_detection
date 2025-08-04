import React from 'react';
import { Handle, Position } from 'reactflow';
import { Box, Typography, Chip, LinearProgress } from '@mui/material';
import { Assessment, TrendingUp, Warning, CheckCircle } from '@mui/icons-material';

interface RiskAssessmentNodeProps {
  data: {
    label: string;
    config: Record<string, any>;
    status?: 'idle' | 'running' | 'success' | 'error';
  };
}

const RiskAssessmentNode: React.FC<RiskAssessmentNodeProps> = ({ data }) => {
  const getStatusColor = () => {
    switch (data.status) {
      case 'running': return '#ff9800';
      case 'success': return '#4caf50';
      case 'error': return '#f44336';
      default: return '#ff5722';
    }
  };

  const riskScore = data.config?.riskScore || 7.5;
  const vulnerabilities = data.config?.vulnerabilities || 23;
  const mitigations = data.config?.mitigations || 18;

  const getRiskColor = () => {
    if (riskScore >= 8) return '#f44336';
    if (riskScore >= 6) return '#ff9800';
    return '#4caf50';
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
        background: 'linear-gradient(135deg, #fff3e0 0%, #ffcc80 100%)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Assessment sx={{ color: 'warning.main' }} />
        <Box>
          <Typography variant="subtitle2" fontWeight="bold">
            {data.label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Risk Assessment Engine
          </Typography>
        </Box>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" fontWeight="medium">
            Overall Risk Score
          </Typography>
          <Typography variant="caption" fontWeight="bold" sx={{ color: getRiskColor() }}>
            {riskScore}/10
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={riskScore * 10}
          sx={{
            height: 8,
            borderRadius: 4,
            '& .MuiLinearProgress-bar': {
              backgroundColor: getRiskColor(),
              borderRadius: 4,
            },
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ textAlign: 'center', flex: 1 }}>
          <Warning sx={{ fontSize: 16, color: 'error.main', mb: 0.5 }} />
          <Typography variant="caption" color="text.secondary" display="block">
            Vulnerabilities
          </Typography>
          <Typography variant="h6" fontWeight="bold" color="error.main">
            {vulnerabilities}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center', flex: 1 }}>
          <CheckCircle sx={{ fontSize: 16, color: 'success.main', mb: 0.5 }} />
          <Typography variant="caption" color="text.secondary" display="block">
            Mitigations
          </Typography>
          <Typography variant="h6" fontWeight="bold" color="success.main">
            {mitigations}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {['CVSS Scoring', 'Asset Criticality', 'Threat Modeling', 'Impact Analysis'].map((method, index) => (
            <Chip
              key={index}
              label={method}
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.7rem',
                height: 24,
                borderColor: 'warning.main',
                color: 'warning.main',
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
              background: 'linear-gradient(45deg, #ff5722, #d84315)',
              color: 'white',
              fontSize: '0.7rem',
              fontWeight: 'bold',
            }}
          />
          <Chip
            label="⚠️ Risk"
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
          background: '#ff5722',
          width: 12,
          height: 12,
        }}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: '#ff5722',
          width: 12,
          height: 12,
        }}
      />
    </Box>
  );
};

export default RiskAssessmentNode;