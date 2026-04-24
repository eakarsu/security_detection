import React, { useState, useEffect } from 'react';
import { useSearchParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorIcon,
  MailOutline as MailIcon,
} from '@mui/icons-material';
import { ENDPOINTS } from '../config/api.ts';

const EmailVerification: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'no-token'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      return;
    }

    const verify = async () => {
      try {
        const response = await fetch(ENDPOINTS.authVerifyEmail(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (response.ok) {
          setStatus('success');
          setMessage('Your email has been verified successfully!');
        } else {
          const err = await response.json().catch(() => ({}));
          setStatus('error');
          setMessage(err.message || 'Verification failed. The link may have expired.');
        }
      } catch {
        setStatus('error');
        setMessage('Unable to verify email. Please try again later.');
      }
    };

    verify();
  }, [token]);

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
      <Paper sx={{ p: 4, maxWidth: 420, width: '100%', textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <CircularProgress size={64} sx={{ mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Verifying your email...
            </Typography>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Email Verified
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {message}
            </Typography>
            <Button component={RouterLink} to="/login" variant="contained" size="large">
              Sign In
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Verification Failed
            </Typography>
            <Alert severity="error" sx={{ mb: 3 }}>
              {message}
            </Alert>
            <Button component={RouterLink} to="/login" variant="outlined">
              Back to Sign In
            </Button>
          </>
        )}

        {status === 'no-token' && (
          <>
            <MailIcon sx={{ fontSize: 64, color: 'info.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Check Your Email
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              We've sent a verification link to your email address. Please click the link to verify your account.
            </Typography>
            <Button component={RouterLink} to="/login" variant="outlined">
              Back to Sign In
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default EmailVerification;
