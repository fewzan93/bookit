import { AlertCircle, Loader2, Lock, Mail, User as UserIcon, Eye, EyeOff, CalendarHeart, Ticket } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { useRegisterMutation } from '../api';
import { AuthShell } from '../components/AuthShell';

const inputClass =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 pl-11 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-fuchsia-400/60 focus:bg-white/[0.06] focus:ring-2 focus:ring-fuchsia-400/20';

type SignupRole = 'user' | 'organizer';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [register, { isLoading }] = useRegisterMutation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<SignupRole>('user');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await register({ name, email, password, role }).unwrap();
      navigate('/', { replace: true });
    } catch (err) {
      const data = (err as { data?: { message?: string } })?.data;
      setError(data?.message ?? 'Something went wrong, please try again.');
    }
  }

  return (
    <AuthShell>
      <h1 className="text-xl font-semibold text-white">Create your account</h1>
      <p className="mt-1 text-sm text-zinc-400">Join Bookit — tickets, seats and events in one place.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-400/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-300">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="relative">
          <UserIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            required
            minLength={2}
            autoComplete="name"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>

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
            minLength={8}
            autoComplete="new-password"
            placeholder="Password (min. 8 characters)"
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

        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-zinc-400 uppercase">Account type</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole('user')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition',
                role === 'user'
                  ? 'border-fuchsia-400/60 bg-fuchsia-500/15 text-white'
                  : 'border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/25',
              )}
            >
              <Ticket className="size-4" /> Attendee
            </button>
            <button
              type="button"
              onClick={() => setRole('organizer')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition',
                role === 'organizer'
                  ? 'border-fuchsia-400/60 bg-fuchsia-500/15 text-white'
                  : 'border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/25',
              )}
            >
              <CalendarHeart className="size-4" /> Organizer
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 py-3 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/25 transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
          {isLoading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-400">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-fuchsia-400 transition hover:text-fuchsia-300">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
