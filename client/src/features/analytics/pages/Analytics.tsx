import { useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3, Download, Ticket, TrendingUp, Users } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"

import { formatPrice } from '@/lib/format'
import {
  downloadCsv,
  useGetAnalyticsSummaryQuery,
  useGetEventAnalyticsQuery,
} from '@/features/analytics/api'

const TIER_COLORS = ['#e879f9', '#a78bfa', '#38bdf8', '#34d399', '#fbbf24', '#fb7185']

export default function AnalyticsPage() {
  const { data: summary, isLoading } = useGetAnalyticsSummaryQuery()
  const [eventId, setEventId] = useState('')
  const { data: analytics, isLoading: analyticsLoading } = useGetEventAnalyticsQuery(eventId, { skip: !eventId })
  const [exportError, setExportError] = useState<string | null>(null)

  const selected = summary?.events.find((e) => e._id === eventId)

  async function exportCsv(kind: 'orders' | 'attendees') {
    if (!eventId) return
    setExportError(null)
    try {
      await downloadCsv(`analytics/events/${eventId}/export/${kind}`, `${kind}-${selected?.slug ?? eventId}.csv`)
    } catch {
      setExportError('Export failed — try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-28">
        <Spinner className="size-6 text-primary" />
      </div>
    )
  }

  if (!summary || summary.events.length === 0) {
    return (
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BarChart3 />
          </EmptyMedia>
          <EmptyTitle>No events to analyze yet</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <EmptyDescription>Publish an event, collect bookings, and the numbers show up here.</EmptyDescription>
        </EmptyContent>
      </Empty>
    )
  }

  const fillRate = summary.capacity > 0 ? Math.round((summary.ticketsSold / summary.capacity) * 100) : 0
  const attendanceRate = summary.issuedTickets > 0 ? Math.round((summary.usedTickets / summary.issuedTickets) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Sales, revenue and attendance across your events.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <TrendingUp className="size-4" />
            </div>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>confirmed payments</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{formatPrice(summary.revenue)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <Ticket className="size-4" />
            </div>
            <CardTitle>Seats sold</CardTitle>
            <CardDescription>{fillRate}% of capacity</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {summary.ticketsSold}
            <span className="ml-1 text-sm font-normal text-muted-foreground">/ {summary.capacity}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <Users className="size-4" />
            </div>
            <CardTitle>Checked in</CardTitle>
            <CardDescription>{attendanceRate}% attendance</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {summary.usedTickets}
            <span className="ml-1 text-sm font-normal text-muted-foreground">/ {summary.issuedTickets} tickets</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <BarChart3 className="size-4" />
            </div>
            <CardTitle>Events</CardTitle>
            <CardDescription>published and counted</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{summary.events.length}</CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <div className="min-w-56 flex-1">
          <p className="mb-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Drill into an event</p>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="w-full rounded-md border border-input bg-muted/40 px-3 py-2 text-sm outline-none focus:border-primary/60"
          >
            <option value="" className="bg-card">Choose an event…</option>
            {summary.events.map((e) => (
              <option key={e._id} value={e._id} className="bg-card">
                {e.title}
              </option>
            ))}
          </select>
        </div>
        {eventId && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void exportCsv('orders')}>
              <Download data-icon="inline-start" /> Orders CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => void exportCsv('attendees')}>
              <Download data-icon="inline-start" /> Attendees CSV
            </Button>
          </div>
        )}
        {exportError && <p className="w-full text-xs text-destructive">{exportError}</p>}
      </div>

      {eventId && (
        analyticsLoading || !analytics ? (
          <div className="flex justify-center py-20">
            <Spinner className="size-6 text-primary" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{formatPrice(analytics.overview.revenue)}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Seats</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">
                  {analytics.overview.sold}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">/ {analytics.overview.capacity}</span>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Attendance</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">
                  {Math.round(analytics.overview.attendanceRate * 100)}%
                  <span className="ml-1 text-sm font-normal text-muted-foreground">({analytics.overview.attendance} checked in)</span>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by day</CardTitle>
                  <CardDescription>confirmed payments per date</CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.daily}>
                      <defs>
                        <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#e879f9" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#e879f9" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262133" />
                      <XAxis dataKey="label" stroke="#a1a2b8" fontSize={11} />
                      <YAxis stroke="#a1a2b8" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#14111d', border: '1px solid #262133', borderRadius: 8, fontSize: 12 }}
                        formatter={(value) => [formatPrice(Number(value)), 'Revenue']}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#e879f9" fill="url(#rev)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Bookings by hour</CardTitle>
                  <CardDescription>when your audience buys</CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  {analytics.peakHours.length === 0 ? (
                    <p className="pt-16 text-center text-sm text-muted-foreground">No purchase data yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.peakHours}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#262133" />
                        <XAxis dataKey="hour" stroke="#a1a2b8" fontSize={11} tickFormatter={(h: number) => `${h}:00`} />
                        <YAxis stroke="#a1a2b8" fontSize={11} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#14111d', border: '1px solid #262133', borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="count" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tiers</CardTitle>
                  <CardDescription>sold per tier</CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.tiers.map((t) => ({ name: t.name, value: t.sold }))}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {analytics.tiers.map((_, i) => (
                          <Cell key={i} fill={TIER_COLORS[i % TIER_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#14111d', border: '1px solid #262133', borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent bookings</CardTitle>
                  <CardDescription>latest confirmed payments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {analytics.recentBookings.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No bookings yet.</p>
                  ) : (
                    analytics.recentBookings.map((b) => (
                      <div key={b.bookingRef} className="flex items-center justify-between rounded-md border border-border/70 bg-muted/30 px-3 py-2 font-mono text-xs">
                        <span>{b.bookingRef}</span>
                        <span className="text-foreground">{formatPrice(b.total)}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )
      )}
    </div>
  )
}
