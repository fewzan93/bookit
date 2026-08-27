import { AlertCircle, Loader2, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { useAppDispatch } from '../../../app/hooks';
import { useLoginMutation } from '../api';
import { resetError } from '../authSlice';
import { useAuth } from '../hooks';
import { AuthShell } from '../components/AuthShell';

const inputClass =
  'w-full rounded-xl border border-border bg-card px-4 py-3 pl-11 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary/60 focus:bg-accent focus:ring-2 focus:ring-primary/20';

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { error } = useAuth();
  const [login, { isLoading }] = useLoginMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    dispatch(resetError());
    try {
      await login({ email, password }).unwrap();
      navigate(from, { replace: true });
    } catch {
      void 0;
    }
  }

  return (
    <AuthShell>        <h1 className="text-xl font-semibold text-foreground">Welcome back</h1>
      <p className="mt-1 text-sm text-muted-foreground">Sign in to continue to Bookit.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cn(inputClass, 'pr-11')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
          {isLoading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Bookit?{' '}
        <Link to="/register" className="font-medium text-fuchsia-400 transition hover:text-fuchsia-300">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
