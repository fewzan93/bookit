import { CheckCircle2, Loader2, Ticket } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

import { useGetBookingQuery } from '@/features/checkout/api'
import { formatDateTime, formatPrice } from '@/lib/format'

export default function BookingCompletePage() {
  const { ref = '' } = useParams()
  const { data: booking, refetch } = useGetBookingQuery(ref)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (booking?.status === 'pending' && tick < 12) {
      const t = setTimeout(() => {
        void refetch()
        setTick((v) => v + 1)
      }, 2000)
      return () => clearTimeout(t)
    }
    return undefined
  }, [booking?.status, tick, refetch])

  if (!booking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  const confirmed = booking.status === 'confirmed'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16 text-foreground">
      <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-2xl shadow-background/60">
        <div className="flex items-center justify-between px-5 pt-4 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
          <span>Bookit ticket</span>
          <span className="text-gold-dim">{booking.bookingRef}</span>
        </div>

        <div className="perfs mx-5 mt-2" />

        <div className="p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              {confirmed ? <CheckCircle2 className="size-6" /> : <Ticket className="size-6" />}
            </span>
            <div>
              <h1 className="font-heading text-xl font-semibold">
                {confirmed ? 'Booking confirmed' : 'Booking awaiting payment'}
              </h1>
              <p className="text-sm text-muted-foreground">{formatDateTime(booking.eventSnapshot.startAt)}</p>
            </div>
          </div>

          <Separator className="my-5" />

          <div className="space-y-1.5">
            {booking.items.map((item) => (
              <div key={item.seatId} className="flex items-center justify-between font-mono text-sm">
                <span className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[10px] uppercase">{item.tierName}</Badge>
                  Seat {item.seatLabel}
                </span>
                <span>{formatPrice(item.price, item.currency)}</span>
              </div>
            ))}
          </div>

          <Separator className="my-5" />

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total paid</span>
            <span className="font-mono text-lg font-bold">{formatPrice(booking.total, booking.currency)}</span>
          </div>
          {(booking.promoDiscount > 0 || booking.groupDiscount > 0) && (
            <p className="mt-2 text-xs text-muted-foreground">
              Promo {booking.promoDiscount > 0 ? `−${formatPrice(booking.promoDiscount)} ` : ''}
              {booking.groupDiscount > 0 ? `· group −${formatPrice(booking.groupDiscount)}` : ''}
            </p>
          )}

          <p className="mt-5 rounded-md border border-border bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            Digital QR tickets for the door arrive in the next phase — keep <span className="font-mono text-foreground">{booking.bookingRef}</span> until then.
          </p>
        </div>

        <div className="perfs mx-5" />

        <div className="flex items-center justify-between px-5 py-4">
          <Link to="/bookings" className="text-sm text-muted-foreground transition hover:text-foreground">My bookings</Link>
          <Link to={`/events/${booking.eventSnapshot.slug}`} className="text-sm text-primary transition hover:text-primary/80">View event</Link>
        </div>
      </div>
    </div>
  )
}
