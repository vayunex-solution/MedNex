import React, { useState } from 'react';
import {
  Box, TextField, Button, Typography,
  InputAdornment, IconButton, Checkbox, FormControlLabel,
  Alert, CircularProgress, Link, Chip,
} from '@mui/material';
import {
  Email, Lock, Visibility, VisibilityOff, LocalPharmacy,
  TrendingUp, Inventory, Receipt, BarChart, ArrowForward,
  CheckCircle,
} from '@mui/icons-material';
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

const features = [
  { icon: <Receipt sx={{ fontSize: 18 }} />, text: 'GST-Compliant A4 Invoice Printing' },
  { icon: <TrendingUp sx={{ fontSize: 18 }} />, text: 'Live Sales & Profit Dashboard' },
  { icon: <Inventory sx={{ fontSize: 18 }} />, text: 'Smart Stock & Expiry Alerts' },
  { icon: <BarChart sx={{ fontSize: 18 }} />, text: 'Detailed Reports & Analytics' },
];

const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: { email: 'admin@mednex.com', password: 'Admin@123', rememberMe: false },
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
    <Box sx={{ minHeight: '100vh', display: 'flex', fontFamily: "'Inter', sans-serif" }}>

      {/* ── LEFT PANEL ── */}
      <Box sx={{
        display: { xs: 'none', lg: 'flex' },
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: 'linear-gradient(150deg, #0D1B4B 0%, #1565C0 55%, #0288D1 100%)',
        p: 6,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        {[
          { size: 420, top: '-120px', right: '-120px', opacity: 0.06 },
          { size: 280, top: '40%', left: '-80px', opacity: 0.05 },
          { size: 180, bottom: '80px', right: '60px', opacity: 0.07 },
        ].map((c, i) => (
          <Box key={i} sx={{
            position: 'absolute', width: c.size, height: c.size, borderRadius: '50%',
            background: 'rgba(255,255,255,1)', opacity: c.opacity,
            top: c.top, bottom: c.bottom, left: c.left, right: c.right,
          }} />
        ))}

        {/* Top — Brand */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{
              width: 48, height: 48, borderRadius: 2.5,
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <LocalPharmacy sx={{ color: '#fff', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: '1.4rem', lineHeight: 1 }}>MedNex</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem', letterSpacing: 1.5 }}>PHARMACY ERP</Typography>
            </Box>
          </Box>
          <Chip
            label="by VayuNex Solution"
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem', border: '1px solid rgba(255,255,255,0.15)' }}
          />
        </Box>

        {/* Middle — Hero Text */}
        <Box>
          <Typography sx={{
            color: '#fff', fontWeight: 900,
            fontSize: 'clamp(1.8rem, 3vw, 2.8rem)',
            lineHeight: 1.15, letterSpacing: '-0.5px', mb: 2,
          }}>
            Smart Pharmacy<br />Billing Made<br />
            <Box component="span" sx={{ color: 'rgba(255,255,255,0.55)' }}>Simple.</Box>
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.95rem', lineHeight: 1.75, maxWidth: 360, mb: 4 }}>
            Complete GST-compliant pharmacy management — from inventory and purchases to sales invoicing and real-time analytics.
          </Typography>

          {/* Feature list */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {features.map((f) => (
              <Box key={f.text} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: 1.5,
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(255,255,255,0.85)', flexShrink: 0,
                }}>
                  {f.icon}
                </Box>
                <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', fontWeight: 500 }}>{f.text}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Bottom — Footer */}
        <Box>
          <Box sx={{ width: 40, height: 1, bgcolor: 'rgba(255,255,255,0.2)', mb: 2 }} />
          <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', letterSpacing: 1 }}>
            © 2025 VayuNex Solution · Engineered in India 🇮🇳
          </Typography>
        </Box>
      </Box>

      {/* ── RIGHT PANEL — LOGIN FORM ── */}
      <Box sx={{
        width: { xs: '100%', lg: '460px' },
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        px: { xs: 3, sm: 6 },
        py: 6,
        bgcolor: '#FAFBFF',
        position: 'relative',
      }}>

        {/* Mobile logo (only visible on small screens) */}
        <Box sx={{ display: { xs: 'flex', lg: 'none' }, alignItems: 'center', gap: 1.5, mb: 5 }}>
          <Box sx={{ width: 42, height: 42, borderRadius: 2, background: 'linear-gradient(135deg,#1565C0,#0288D1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LocalPharmacy sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: '1.2rem', color: '#1565C0', lineHeight: 1 }}>MedNex</Typography>
            <Typography sx={{ fontSize: '0.62rem', color: '#94A3B8', letterSpacing: 1 }}>by VayuNex Solution</Typography>
          </Box>
        </Box>

        {/* Back to home */}
        <Box
          onClick={() => navigate('/')}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 4, cursor: 'pointer', color: '#64748B', width: 'fit-content', '&:hover': { color: '#1565C0' }, transition: 'color 0.2s' }}
        >
          <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>← Back to home</Typography>
        </Box>

        {/* Heading */}
        <Box sx={{ mb: 4 }}>
          <Typography sx={{ fontSize: '1.75rem', fontWeight: 900, color: '#0F172A', lineHeight: 1.2, mb: 1 }}>
            Welcome back 👋
          </Typography>
          <Typography sx={{ color: '#64748B', fontSize: '0.9rem' }}>
            Sign in to your MedNex pharmacy account
          </Typography>
        </Box>

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2, fontSize: '0.875rem' }}>
            {error}
          </Alert>
        )}

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <Box>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', mb: 0.75 }}>Email Address</Typography>
                <TextField
                  {...field}
                  placeholder="admin@mednex.com"
                  type="email"
                  fullWidth
                  size="medium"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2.5, bgcolor: '#fff',
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#1565C0' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1565C0', borderWidth: 2 },
                    },
                  }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email sx={{ fontSize: 18, color: '#94A3B8' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Box>
            )}
          />

          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Password</Typography>
                  <Link href="#" sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#1565C0', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                    Forgot password?
                  </Link>
                </Box>
                <TextField
                  {...field}
                  placeholder="Enter your password"
                  type={showPassword ? 'text' : 'password'}
                  fullWidth
                  size="medium"
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2.5, bgcolor: '#fff',
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#1565C0' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1565C0', borderWidth: 2 },
                    },
                  }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ fontSize: 18, color: '#94A3B8' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)} size="small" edge="end">
                            {showPassword
                              ? <VisibilityOff sx={{ fontSize: 18, color: '#94A3B8' }} />
                              : <Visibility sx={{ fontSize: 18, color: '#94A3B8' }} />
                            }
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Box>
            )}
          />

          <Controller
            name="rememberMe"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Checkbox {...field} checked={field.value} size="small" sx={{ color: '#CBD5E1', '&.Mui-checked': { color: '#1565C0' } }} />}
                label={<Typography sx={{ fontSize: '0.85rem', color: '#64748B' }}>Keep me signed in</Typography>}
                sx={{ mt: -0.5 }}
              />
            )}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading}
            endIcon={!loading && <ArrowForward sx={{ fontSize: 18 }} />}
            sx={{
              mt: 0.5, py: 1.6, borderRadius: 2.5,
              fontSize: '0.95rem', fontWeight: 700,
              background: 'linear-gradient(135deg, #1565C0, #0288D1)',
              boxShadow: '0 6px 24px rgba(21,101,192,0.35)',
              textTransform: 'none',
              transition: 'all 0.25s',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 10px 32px rgba(21,101,192,0.45)',
              },
              '&:disabled': { background: '#CBD5E1', boxShadow: 'none' },
            }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In to MedNex'}
          </Button>
        </Box>




        {/* Powered by */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '0.72rem', color: '#CBD5E1' }}>
            Powered by{' '}
            <Box
              component="a" href="https://vayunexsolution.com" target="_blank"
              sx={{ color: '#94A3B8', fontWeight: 700, textDecoration: 'none', '&:hover': { color: '#1565C0' } }}
            >
              VayuNex Solution
            </Box>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;
