import { Loader2, Ticket } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"

import { SiteHeader } from '@/components/layout/SiteHeader'
import { formatDate, formatPrice } from '@/lib/format'
import {
  useCancelBookingMutation,
  useGetCheckoutMutation,
  useGetMyBookingsQuery,
  useRefundBookingMutation,
  type BookingDTO,
} from '@/features/checkout/api'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending payment',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  expired: 'Expired',
  refunded: 'Refunded',
}

export default function BookingsPage() {
  const { data: bookings, isLoading } = useGetMyBookingsQuery()
  const [cancel, { isLoading: cancelling }] = useCancelBookingMutation()
  const [refund, { isLoading: refunding }] = useRefundBookingMutation()
  const [getCheckout, { isLoading: reopening }] = useGetCheckoutMutation()
  const [error, setError] = useState<string | null>(null)

  async function handleCancel(booking: BookingDTO) {
    if (!window.confirm(`Cancel booking ${booking.bookingRef}? Your seats go back on the board.`)) return
    setError(null)
    try {
      await cancel(booking.bookingRef).unwrap()
    } catch {
      setError('Could not cancel this booking — try again.')
    }
  }

  async function handleRefund(booking: BookingDTO) {
    if (!window.confirm(`Refund booking ${booking.bookingRef}? The seats will be released.`)) return
    setError(null)
    try {
      await refund(booking.bookingRef).unwrap()
    } catch {
      setError('Could not process the refund — try again.')
    }
  }

  async function jumpToPayment(booking: BookingDTO) {
    setError(null)
    try {
      const result = await getCheckout(booking.bookingRef).unwrap()
      if (result.mode === 'stripe' && result.url) window.location.assign(result.url)
      else window.location.href = `/events/${booking.eventSnapshot.slug}/checkout?seats=${booking.items.map((i) => i.seatId).join(',')}`
    } catch {
      setError('Could not reopen checkout — the seats may have been released.')
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="font-heading text-2xl font-bold">My bookings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every ticket you hold, in one place.</p>

        {error && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Spinner className="size-6 text-primary" />
          </div>
        ) : !bookings || bookings.length === 0 ? (
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Ticket />
              </EmptyMedia>
              <EmptyTitle>No bookings yet</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <EmptyDescription>
                Pick seats on a live map and they&apos;ll show up here.
              </EmptyDescription>
              <Link to="/">
                <Button>Browse events</Button>
              </Link>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="mt-6 space-y-4">
            {bookings.map((booking) => (
              <div key={booking.bookingRef} className="rounded-lg border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs text-gold-dim">{booking.bookingRef}</span>
                    <Badge variant={booking.status === 'confirmed' ? 'default' : booking.status === 'pending' ? 'secondary' : 'outline'}>
                      {STATUS_LABEL[booking.status] ?? booking.status}
                    </Badge>
                  </div>
                  <span className="font-mono text-sm">{formatDate(booking.eventSnapshot.startAt)}</span>
                </div>

                <Link to={`/events/${booking.eventSnapshot.slug}`} className="mt-2 block font-heading font-semibold transition hover:text-primary">
                  {booking.eventSnapshot.title}
                </Link>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {booking.eventSnapshot.venueName || 'Venue TBA'} —{' '}
                  <span className="font-mono">{booking.items.map((i) => `Seat ${i.seatLabel}`).join(' · ')}</span>
                </p>

                <Separator className="my-4" />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-mono text-sm">
                    {formatPrice(booking.total, booking.currency)}
                    {booking.promoDiscount > 0 && <span className="ml-2 text-xs text-primary">promo −{formatPrice(booking.promoDiscount)}</span>}
                  </span>
                  <div className="flex items-center gap-2">
                    {booking.status === 'pending' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancel(booking)}
                          disabled={cancelling}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => void jumpToPayment(booking)}
                          disabled={reopening}
                        >
                          {reopening ? <Loader2 className="size-3.5 animate-spin" /> : null} Pay now
                        </Button>
                      </>
                    )}
                    {booking.status === 'confirmed' && (
                      <Button variant="outline" size="sm" onClick={() => handleRefund(booking)} disabled={refunding}>
                        Refund
                      </Button>
                    )}
                    {(booking.status === 'confirmed' || booking.status === 'refunded') && (
                      <Link to={`/booking/complete/${booking.bookingRef}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
