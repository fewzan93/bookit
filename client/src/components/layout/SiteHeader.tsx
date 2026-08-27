import { CalendarHeart, LayoutDashboard, LogOut, UserRound } from "lucide-react"
import { Link, NavLink } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useLogoutMutation } from "@/features/auth/api"
import { useAuth } from "@/features/auth/hooks"
import { resetAllApiState } from "@/app/resetApi"

export function SiteHeader() {
  const { user } = useAuth()
  const [logout, { isLoading }] = useLogoutMutation()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary/15 text-primary">              <CalendarHeart className="size-5" />
          </span>
          <span className="font-heading text-lg font-bold tracking-tight">Bookit</span>
        </Link>

        <nav className="flex items-center gap-1.5 sm:gap-2">
          {(user?.role === "organizer" || user?.role === "admin") && (
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              <LayoutDashboard className="size-4" />
              <span className="hidden sm:inline">Studio</span>
            </NavLink>
          )}
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/account"
                className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold text-foreground transition hover:border-primary/50"
                title={user.email}
              >
                {user.name.slice(0, 1).toUpperCase()}
              </Link>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={async () => {
                  await logout().unwrap()
                  resetAllApiState()
                }}
                disabled={isLoading}
                aria-label="Sign out"
                className="text-muted-foreground"
              >
                <LogOut />
              </Button>
            </div>
          ) : (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                <UserRound className="size-4" /> Sign in
              </NavLink>
              <Link
                to="/register"
                className="inline-flex h-8 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/80"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
