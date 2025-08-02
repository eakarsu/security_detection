import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Login: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'background.default',
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 400, width: '100%' }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          NodeGuard AI
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center">
          Login functionality coming soon...
        </Typography>
      </Paper>
    </Box>
  );
};

export default Login;
