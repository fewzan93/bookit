import { Loader2, Users, Ticket, TrendingUp, Calendar } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

import { formatDate, formatPrice } from '@/lib/format'
import { useGetAdminStatsQuery, useGetAdminUsersQuery, useGetAdminBookingsQuery } from '../api'

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'text-emerald-400',
  pending: 'text-amber-400',
  cancelled: 'text-red-400',
  refunded: 'text-red-300',
  expired: 'text-muted-foreground',
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useGetAdminStatsQuery()
  const { data: users, isLoading: usersLoading } = useGetAdminUsersQuery()
  const { data: bookings, isLoading: bookingsLoading } = useGetAdminBookingsQuery()

  if (statsLoading) {
    return (
      <div className="flex justify-center py-28">
        <Spinner className="size-6 text-primary" />
      </div>
    )
  }

  if (!stats) {
    return (
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon"><Users /></EmptyMedia>
          <EmptyTitle>Admin Dashboard</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <EmptyDescription>System data is loading. If this persists, check server logs.</EmptyDescription>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">System-wide overview of Bookit.</p>
      </div>

      {/* System Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <Users className="size-4" />
            </div>
            <CardTitle>Total Users</CardTitle>
            <CardDescription>registered accounts</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.totalUsers}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <Calendar className="size-4" />
            </div>
            <CardTitle>Total Events</CardTitle>
            <CardDescription>created across all organizers</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.totalEvents}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <TrendingUp className="size-4" />
            </div>
            <CardTitle>Total Revenue</CardTitle>
            <CardDescription>from confirmed bookings</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <Ticket className="size-4" />
            </div>
            <CardTitle>Attendance</CardTitle>
            <CardDescription>{Math.round(stats.attendanceRate * 100)}% check-in rate</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {stats.usedTickets}
            <span className="ml-1 text-sm font-normal text-muted-foreground">/ {stats.totalTickets} tickets</span>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({users?.length ?? 0})</CardTitle>
          <CardDescription>All registered accounts on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-primary" /></div>
          ) : !users || users.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No users found.</p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u._id} className="flex items-center justify-between rounded-md border border-border/70 bg-muted/30 px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                      {u.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <Badge variant={u.role === 'admin' ? 'default' : u.role === 'organizer' ? 'secondary' : 'outline'}>
                    {u.role}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>All Bookings ({bookings?.length ?? 0})</CardTitle>
          <CardDescription>Recent bookings across all events and users</CardDescription>
        </CardHeader>
        <CardContent>
          {bookingsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-primary" /></div>
          ) : !bookings || bookings.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            <div className="space-y-2">
              {bookings.map((b) => {
                const user = typeof b.userId === 'object' ? b.userId : null
                return (
                  <div key={b._id} className="flex items-center justify-between rounded-md border border-border/70 bg-muted/30 px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-primary">{b.bookingRef}</span>
                        <span className={`font-mono text-[10px] uppercase ${STATUS_COLORS[b.status] ?? 'text-muted-foreground'}`}>
                          {b.status}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-sm">{b.eventSnapshot.title}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {user?.name ?? 'Unknown'} ({user?.email ?? '—'}) · {b.items.map((i) => `Seat ${i.seatLabel}`).join(', ')}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-sm font-medium">{formatPrice(b.total, b.currency)}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{formatDate(b.createdAt)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
