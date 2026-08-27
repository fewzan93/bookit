import { AlertCircle, Loader2, Lock, Mail, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { useRegisterMutation } from '../api';
import { AuthShell } from '../components/AuthShell';

const inputClass =
  'w-full rounded-xl border border-border bg-card px-4 py-3 pl-11 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary/60 focus:bg-accent focus:ring-2 focus:ring-primary/20';

type SignupRole = 'user';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [register, { isLoading }] = useRegisterMutation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role] = useState<SignupRole>('user');
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
      <h1 className="text-xl font-semibold text-foreground">Create your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">Join Bookit — seats, events and amazing experiences in one place.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="relative">
          <UserIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
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
            className="absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>

        <input type="hidden" value="user" />

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
          {isLoading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-fuchsia-400 transition hover:text-fuchsia-300">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
