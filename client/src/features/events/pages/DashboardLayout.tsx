import { BarChart3, CalendarHeart, Home as HomeIcon } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '../../auth/hooks';

export default function DashboardLayout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 flex-wrap items-center justify-between gap-y-2 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <CalendarHeart className="size-5" />
              </span>
              <span className="font-heading font-bold tracking-tight">Bookit Studio</span>
            </Link>
            <nav className="ml-2 flex items-center gap-1">
              <NavLink
                to="/dashboard"
                end
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-1.5 text-sm transition',
                    isActive ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground',
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
                    isActive ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                <BarChart3 className="size-4" /> Analytics
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase sm:inline">
              Organizer
            </span>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground"
            >
              <HomeIcon className="size-4" /> <span className="hidden sm:inline">Site preview</span>
            </Link>
            <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground">
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
