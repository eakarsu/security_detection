import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  LinearProgress,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const stats = [
    {
      title: 'Active Threats',
      value: '12',
      icon: <SecurityIcon />,
      color: '#f44336',
      change: '+3 from yesterday',
      onClick: () => navigate('/incidents?severity=critical&status=open'),
    },
    {
      title: 'Incidents Resolved',
      value: '847',
      icon: <CheckCircleIcon />,
      color: '#4caf50',
      change: '+15 from yesterday',
      onClick: () => navigate('/incidents?status=resolved'),
    },
    {
      title: 'Alerts Generated',
      value: '1,234',
      icon: <WarningIcon />,
      color: '#ff9800',
      change: '+89 from yesterday',
      onClick: () => navigate('/incidents'),
    },
    {
      title: 'System Health',
      value: '98.5%',
      icon: <TrendingUpIcon />,
      color: '#2196f3',
      change: '+0.2% from yesterday',
      onClick: () => navigate('/settings'),
    },
  ];

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Security Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Real-time overview of your security posture
      </Typography>

      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              onClick={stat.onClick}
              sx={{
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 8px 25px rgba(0, 0, 0, 0.3)`,
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 1,
                      backgroundColor: stat.color,
                      color: 'white',
                      mr: 2,
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Box>
                    <Typography variant="h4" component="div">
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.title}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {stat.change}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Threat Detection Timeline
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Real-time threat detection and response metrics
              </Typography>
              <LinearProgress variant="determinate" value={75} sx={{ mt: 2 }} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                System processing at 75% capacity
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Alerts
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                No critical alerts in the last 24 hours
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
