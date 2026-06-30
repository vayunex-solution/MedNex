import React, { useState } from 'react';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  InputAdornment, IconButton, Checkbox, FormControlLabel,
  Alert, CircularProgress, Link,
} from '@mui/material';
import { Email, Lock, Visibility, VisibilityOff, LocalPharmacy } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/useRedux';
import { setCredentials } from '../../redux/slices/authSlice';
import { authService } from '../../services';

const schema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(4, 'Password too short').required('Password is required'),
  rememberMe: yup.boolean(),
});

type FormData = yup.InferType<typeof schema>;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: { email: 'admin@medibill.com', password: 'Admin@123', rememberMe: false },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      setError('');
      const res = await authService.login({ email: data.email, password: data.password });
      dispatch(setCredentials(res.data.data));
      navigate('/dashboard');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0D47A1 0%, #1565C0 40%, #1976D2 70%, #0288D1 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background decorations */}
      {[...Array(5)].map((_, i) => (
        <Box key={i} sx={{
          position: 'absolute',
          width: [300, 200, 400, 250, 180][i],
          height: [300, 200, 400, 250, 180][i],
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
          top: ['10%', '60%', '-10%', '40%', '80%'][i],
          left: ['70%', '5%', '30%', '85%', '50%'][i],
          transform: 'translate(-50%, -50%)',
        }} />
      ))}

      <Card sx={{ width: '100%', maxWidth: 440, borderRadius: 4, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', position: 'relative' }}>
        <CardContent sx={{ p: 5 }}>
          {/* Logo */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{
              width: 72, height: 72, borderRadius: 3, mx: 'auto', mb: 2,
              background: 'linear-gradient(135deg, #1565C0, #0288D1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(21,101,192,0.4)',
            }}>
              <LocalPharmacy sx={{ color: '#fff', fontSize: 40 }} />
            </Box>
            <Typography variant="h4" fontWeight={800} color="primary.main">MediBill Pro</Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Pharmacy Management & GST Billing System
            </Typography>
          </Box>

          <Typography variant="h6" fontWeight={700} mb={3}>Sign in to your account</Typography>

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Email Address"
                  type="email"
                  fullWidth
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Email color="action" fontSize="small" /></InputAdornment>,
                  }}
                />
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  fullWidth
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Lock color="action" fontSize="small" /></InputAdornment>,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} size="small">
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Controller
                name="rememberMe"
                control={control}
                render={({ field }) => (
                  <FormControlLabel control={<Checkbox {...field} checked={field.value} size="small" />} label={<Typography variant="body2">Remember me</Typography>} />
                )}
              />
              <Link href="#" variant="body2" fontWeight={600} underline="hover">Forgot password?</Link>
            </Box>

            <Button
              type="submit" variant="contained" fullWidth size="large" disabled={loading}
              sx={{ mt: 1, py: 1.5, borderRadius: 2, fontSize: '1rem', fontWeight: 700, background: 'linear-gradient(135deg, #1565C0, #0288D1)', boxShadow: '0 4px 16px rgba(21,101,192,0.4)' }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
          </Box>

          <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: 'action.hover', textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Default: <strong>admin@medibill.com</strong> / <strong>Admin@123</strong>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
