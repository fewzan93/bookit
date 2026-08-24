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
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 pl-11 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-fuchsia-400/60 focus:bg-white/[0.06] focus:ring-2 focus:ring-fuchsia-400/20';

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
    <AuthShell>
      <h1 className="text-xl font-semibold text-white">Welcome back</h1>
      <p className="mt-1 text-sm text-zinc-400">Sign in to continue to Bookit.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-400/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-300">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-500" />
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
          <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-500" />
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
            className="absolute top-1/2 right-3.5 -translate-y-1/2 text-zinc-500 transition hover:text-zinc-300"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 py-3 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/25 transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
          {isLoading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-400">
        New to Bookit?{' '}
        <Link to="/register" className="font-medium text-fuchsia-400 transition hover:text-fuchsia-300">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
