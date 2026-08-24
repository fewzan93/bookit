import { BarChart3, CalendarHeart, Home as HomeIcon } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '../../auth/hooks';

export default function DashboardLayout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 flex-wrap items-center justify-between gap-y-2 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-400">
                <CalendarHeart className="size-5" />
              </span>
              <span className="font-bold tracking-tight">Bookit Studio</span>
            </Link>
            <nav className="ml-2 flex items-center gap-1">
              <NavLink
                to="/dashboard"
                end
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-1.5 text-sm transition',
                    isActive ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white',
                  )
                }
              >
                Events
              </NavLink>
              <NavLink
                to="/dashboard/analytics"
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition',
                    isActive ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white',
                  )
                }
              >
                <BarChart3 className="size-4" /> Analytics
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-zinc-400 uppercase sm:inline">
              Organizer
            </span>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-zinc-300 transition hover:text-white"
            >
              <HomeIcon className="size-4" /> <span className="hidden sm:inline">Site preview</span>
            </Link>
            <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-500 text-sm font-bold text-white">
              {user?.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
