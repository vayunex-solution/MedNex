import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Terminal, Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getErrorMessage } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [showPass, setShowPass] = useState(false);
  const [apiError, setApiError] = useState('');

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: 'yashkr4748@gmail.com',
      password: 'yash00725',
    },
  });

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      navigate(from, { replace: true });
    },
    onError: (error) => {
      setApiError(getErrorMessage(error));
    },
  });

  return (
    <div className="min-h-screen flex bg-base">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-violet-900 p-12">
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
              <Terminal size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">NPC Admin</p>
              <p className="text-white/60 text-xs">Nex Platform Core</p>
            </div>
          </div>
        </div>
        <div className="relative z-10 space-y-4">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Enterprise Platform<br />
            <span className="text-primary-300">Administration</span>
          </h1>
          <p className="text-white/60 text-base leading-relaxed max-w-sm">
            Centralized control for your entire SaaS ecosystem — users, tenants, businesses, and infrastructure.
          </p>
          <div className="flex gap-6 pt-4">
            {[
              { label: 'Tenants', value: 'Multi-tier' },
              { label: 'Security', value: 'Enterprise' },
              { label: 'Audit', value: 'HMAC-chain' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-white font-semibold text-sm">{value}</p>
                <p className="text-white/50 text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-white/30 text-xs">
          © 2025 Vayunex Solution. All rights reserved.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 relative">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="absolute top-6 right-6 rounded-lg p-2 text-secondary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {theme === 'dark' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364-.707-.707M6.343 6.343l-.707-.707m12.728 0-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-violet-600">
              <Terminal size={18} className="text-white" />
            </div>
            <p className="font-bold text-lg text-primary">NPC Admin</p>
          </div>

          <h2 className="text-2xl font-bold text-primary">Welcome back</h2>
          <p className="mt-1 text-sm text-secondary">Sign in to your admin account</p>

          <form onSubmit={handleSubmit((v) => loginMutation.mutate(v))} className="mt-8 space-y-5">
            <Input
              label="Email address"
              type="email"
              placeholder="admin@example.com"
              autoComplete="email"
              required
              leftAddon={<Mail size={15} />}
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="space-y-1">
              <Input
                label="Password"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                leftAddon={<Lock size={15} />}
                rightAddon={
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            {apiError && (
              <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3">
                <p className="text-sm text-red-700 dark:text-red-400">{apiError}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={loginMutation.isPending}
            >
              Sign in to console
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-color">
            NPC Admin Console · Platform Infrastructure Management
          </p>
        </div>
      </div>
    </div>
  );
}
