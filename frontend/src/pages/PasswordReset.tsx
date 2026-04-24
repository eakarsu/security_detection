import React, { useState } from 'react';
import { useSearchParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Link,
  Stack,
} from '@mui/material';
import { Security as SecurityIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ENDPOINTS } from '../config/api.ts';

interface ForgotFormData {
  email: string;
}

interface ResetFormData {
  new_password: string;
  confirmPassword: string;
}

const PasswordReset: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const forgotForm = useForm<ForgotFormData>();
  const resetForm = useForm<ResetFormData>();
  const newPassword = resetForm.watch('new_password');

  const handleForgotPassword = async (data: ForgotFormData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(ENDPOINTS.authForgotPassword(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Request failed');
      setSuccess(true);
      toast.success('If the email exists, a reset link has been sent.');
    } catch (err) {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (data: ResetFormData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(ENDPOINTS.authResetPassword(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: data.new_password }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Reset failed');
      }
      setSuccess(true);
      toast.success('Password reset successful!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success && !token) {
    return (
      <Box
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', backgroundColor: 'background.default',
        }}
      >
        <Paper sx={{ p: 4, maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>Check Your Email</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            If an account with that email exists, we've sent a password reset link.
          </Typography>
          <Link component={RouterLink} to="/login">Back to Sign In</Link>
        </Paper>
      </Box>
    );
  }

  if (success && token) {
    return (
      <Box
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', backgroundColor: 'background.default',
        }}
      >
        <Paper sx={{ p: 4, maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>Password Reset Successful</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            You can now log in with your new password.
          </Typography>
          <Button component={RouterLink} to="/login" variant="contained">
            Sign In
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', backgroundColor: 'background.default',
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 420, width: '100%' }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <SecurityIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h5" gutterBottom>
            {token ? 'Set New Password' : 'Reset Password'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {token
              ? 'Enter your new password below.'
              : 'Enter your email to receive a password reset link.'}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {token ? (
          <form onSubmit={resetForm.handleSubmit(handleResetPassword)}>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="New Password"
                type="password"
                {...resetForm.register('new_password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Minimum 8 characters' },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                    message: 'Must contain uppercase, lowercase, and number',
                  },
                })}
                error={!!resetForm.formState.errors.new_password}
                helperText={resetForm.formState.errors.new_password?.message}
              />
              <TextField
                fullWidth
                label="Confirm Password"
                type="password"
                {...resetForm.register('confirmPassword', {
                  required: 'Please confirm',
                  validate: (v) => v === newPassword || 'Passwords do not match',
                })}
                error={!!resetForm.formState.errors.confirmPassword}
                helperText={resetForm.formState.errors.confirmPassword?.message}
              />
              <Button type="submit" fullWidth variant="contained" size="large" disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </Stack>
          </form>
        ) : (
          <form onSubmit={forgotForm.handleSubmit(handleForgotPassword)}>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                {...forgotForm.register('email', {
                  required: 'Email is required',
                  pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email' },
                })}
                error={!!forgotForm.formState.errors.email}
                helperText={forgotForm.formState.errors.email?.message}
              />
              <Button type="submit" fullWidth variant="contained" size="large" disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </Stack>
          </form>
        )}

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Link component={RouterLink} to="/login" variant="body2">
            Back to Sign In
          </Link>
        </Box>
      </Paper>
    </Box>
  );
};

export default PasswordReset;
