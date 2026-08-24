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
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-fuchsia-500/15 text-fuchsia-400">
          <UserIcon className="size-8" />
        </div>
        <h1 className="text-xl font-semibold text-white">{user?.name}</h1>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-zinc-400">
          <Mail className="size-3.5" /> {user?.email}
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1 text-xs font-medium capitalize text-fuchsia-300">
          <Shield className="size-3.5" /> {user?.role} account
        </span>
        <button
          onClick={() => logout()}
          disabled={isLoading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-medium text-zinc-200 transition hover:border-red-400/40 hover:text-red-300 disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
          Sign out
        </button>
        <Link
          to="/tickets"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-medium text-zinc-200 transition hover:border-fuchsia-400/40 hover:text-white"
        >
          <Ticket className="size-4" /> My tickets
        </Link>
        <Link
          to="/bookings"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 py-3 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/20 transition hover:brightness-110"
        >
          <Ticket className="size-4" /> My bookings
        </Link>
        <Link
          to="/waitlists"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-medium text-zinc-200 transition hover:border-fuchsia-400/40 hover:text-white"
        >
          <Ticket className="size-4" /> My waitlists
        </Link>
        {user?.role !== 'user' && (
          <Link
            to="/scanner"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-medium text-zinc-200 transition hover:border-emerald-400/40 hover:text-emerald-300"
          >
            <Ticket className="size-4" /> Check-in scanner
          </Link>
        )}
      </div>
    </div>
  );
}
