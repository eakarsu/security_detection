import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
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
import { Security as SecurityIcon } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth.tsx';

const DEFAULT_EMAIL = 'admin@nodeguard.ai';
const DEFAULT_PASSWORD = 'Admin1234';

interface LoginFormData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoLoginAttempted = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<LoginFormData>({
    defaultValues: { email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD },
  });

  // Auto-login on mount
  useEffect(() => {
    if (autoLoginAttempted.current) return;
    autoLoginAttempted.current = true;

    const autoLogin = async () => {
      setLoading(true);
      try {
        await login(DEFAULT_EMAIL, DEFAULT_PASSWORD);
        toast.success('Welcome back!');
        navigate('/');
      } catch (err) {
        setError('Auto-login failed. Please sign in manually.');
        setLoading(false);
      }
    };

    autoLogin();
  }, [login, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

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
      <Paper sx={{ p: 4, maxWidth: 420, width: '100%' }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <SecurityIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            NodeGuard AI
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sign in to your security dashboard
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
              error={!!errors.email}
              helperText={errors.email?.message}
              autoComplete="email"
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              })}
              error={!!errors.password}
              helperText={errors.password?.message}
              autoComplete="current-password"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Stack>
        </form>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Link component={RouterLink} to="/password-reset" variant="body2">
            Forgot password?
          </Link>
        </Box>
        <Box sx={{ mt: 1, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Don't have an account?{' '}
            <Link component={RouterLink} to="/register">
              Sign up
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login;
