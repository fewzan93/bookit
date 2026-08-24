import { Bell, BellOff, CheckCircle2, Ticket } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"

import { SiteHeader } from '@/components/layout/SiteHeader'
import { formatDate } from '@/lib/format'
import { useGetMyWaitlistsQuery, useLeaveWaitlistMutation } from '@/features/waitlist/api'

const STATUS_LABEL: Record<string, string> = {
  queued: 'Waiting for a seat',
  notified: 'Seat opened — book within 24h',
  fulfilled: 'Got your seat',
  removed: 'Removed',
}

export default function WaitlistsPage() {
  const { data: entries, isLoading } = useGetMyWaitlistsQuery()
  const [leave, { isLoading: leaving }] = useLeaveWaitlistMutation()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="font-heading text-2xl font-bold">Waitlists</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          When a seat frees up, the oldest entry in the queue is notified first.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Spinner className="size-6 text-primary" />
          </div>
        ) : !entries || entries.length === 0 ? (
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Bell />
              </EmptyMedia>
              <EmptyTitle>No waitlist entries</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <EmptyDescription>
                Join the waitlist from a sold-out event&apos;s ticket page and you&apos;ll land here.
              </EmptyDescription>
              <Link to="/">
                <Button>Browse events</Button>
              </Link>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="mt-6 space-y-3">
            {entries.map((entry) => (
              <div key={entry._id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                    {entry.tierId} · {formatDate(entry.eventSnapshot.startAt)}
                  </span>
                  <Badge variant={entry.status === 'queued' ? 'secondary' : entry.status === 'notified' ? 'default' : 'outline'}>
                    {STATUS_LABEL[entry.status] ?? entry.status}
                  </Badge>
                </div>
                <Link to={`/events/${entry.eventSnapshot.slug}`} className="mt-1.5 block font-heading font-semibold transition hover:text-primary">
                  {entry.eventSnapshot.title}
                </Link>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {entry.status === 'notified' ? (
                      <span className="inline-flex items-center gap-1 text-foreground">
                        <BellOff className="size-3.5" /> Check your email — then book the seat
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="size-3.5 text-primary" /> You&apos;re in the queue
                      </span>
                    )}
                  </span>
                  <Link to={`/events/${entry.eventSnapshot.slug}/seats`}>
                    <Button variant="outline" size="sm">
                      <Ticket data-icon="inline-start" /> Book seats
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void leave(entry._id)}
                    disabled={leaving}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
