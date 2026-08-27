import { Loader2, LogOut, Mail, Shield, Ticket, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLogoutMutation } from '../api';
import { useAuth } from '../hooks';

export default function AccountPage() {
  const { user } = useAuth();
  const [logout, { isLoading }] = useLogoutMutation();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-4">
      <div className="w-full rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center shadow-2xl shadow-black/40">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <UserIcon className="size-8" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">{user?.name}</h1>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <Mail className="size-3.5" /> {user?.email}
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium capitalize text-primary">
          <Shield className="size-3.5" /> {user?.role} account
        </span>
        <button
          onClick={() => logout()}
          disabled={isLoading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground transition hover:border-destructive/40 hover:text-destructive disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
          Sign out
        </button>
        <Link
          to="/tickets"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
        >
          <Ticket className="size-4" /> My tickets
        </Link>
        <Link
          to="/bookings"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-110"
        >
          <Ticket className="size-4" /> My bookings
        </Link>
        <Link
          to="/waitlists"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
        >
          <Ticket className="size-4" /> My waitlists
        </Link>
        {user?.role !== 'user' && (
          <Link
            to="/scanner"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground transition hover:border-emerald-400/40 hover:text-emerald-400"
          >
            <Ticket className="size-4" /> Check-in scanner
          </Link>
        )}
      </div>
    </div>
  );
}
