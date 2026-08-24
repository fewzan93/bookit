import { AlertCircle, ArrowLeft, Loader2, Lock, PartyPopper } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Separator } from "@/components/ui/separator"

import { getSocket } from '@/lib/socket'
import { formatDate, formatPrice, formatTime } from '@/lib/format'
import { useGetEventQuery, useGetSeatMapQuery, type EventTierDTO } from '@/features/events/api'
import {
  useCreateBookingMutation,
  useDevConfirmMutation,
  useGetCheckoutMutation,
  useValidatePromoMutation,
  type BookingDTO,
  type PromoCheckResult,
} from '@/features/checkout/api'
import { computeCheckoutTotals } from '@/features/checkout/pricing'

export default function CheckoutPage() {
  const { slug = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const seatIds = useMemo(
    () => (params.get('seats') ?? '').split(',').filter(Boolean).slice(0, 10),
    [params],
  )

  const { data: event } = useGetEventQuery(slug)
  const eventId = event?._id
  const { data: seatMap } = useGetSeatMapQuery(eventId ?? '', { skip: !eventId })

  const [createBooking, { isLoading: creating }] = useCreateBookingMutation()
  const [getCheckout, { isLoading: openingCheckout }] = useGetCheckoutMutation()
  const [devConfirm, { isLoading: confirming }] = useDevConfirmMutation()
  const [validatePromo, { isLoading: validating }] = useValidatePromoMutation()

  const [promoInput, setPromoInput] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<PromoCheckResult['promo'] | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [booking, setBooking] = useState<BookingDTO | null>(null)
  const [devMode, setDevMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const tierById = useMemo(() => {
    const map = new Map<string, EventTierDTO>()
    for (const t of seatMap?.tiers ?? []) map.set(t.tierId, t)
    return map
  }, [seatMap])

  const seatRows = useMemo(() => {
    if (!seatMap) return []
    return seatMap.sections
      .flatMap((s) => s.seats)
      .filter((s) => seatIds.includes(s.id))
      .map((s) => {
        const tier = tierById.get(s.tierId)
        return { id: s.id, label: `${s.row}${s.number}`, tierName: tier?.name ?? s.tierId, price: tier?.price ?? 0, currency: tier?.currency ?? 'USD' }
      })
  }, [seatMap, seatIds, tierById])

  const totals = useMemo(
    () => computeCheckoutTotals(seatRows.map((s) => s.price), appliedPromo),
    [seatRows, appliedPromo],
  )

  /* keep the seat lock alive while the checkout is open */
  useEffect(() => {
    if (!eventId || booking) return
    const socket = getSocket()
    let ready = false
    const onConnect = () => {
      ready = true
      socket.emit('seatmap:join', { eventId })
    }
    socket.on('connect', onConnect)
    if (socket.connected) onConnect()
    heartbeatRef.current = setInterval(() => {
      if (ready && socket.connected && seatIds.length > 0) {
        socket.emit('seat:heartbeat', { eventId, seatIds })
      }
    }, 60_000)
    return () => {
      socket.off('connect', onConnect)
      socket.emit('seatmap:leave', { eventId })
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [eventId, seatIds, booking])

  async function applyPromo() {
    setPromoError(null)
    if (!promoInput.trim()) return
    try {
      const result = await validatePromo({ code: promoInput.trim(), quantity: seatIds.length }).unwrap()
      setAppliedPromo(result.promo)
    } catch {
      setAppliedPromo(null)
      setPromoError('That promo code is not valid for this order.')
    }
  }

  async function pay() {
    setError(null)
    if (!eventId || seatIds.length === 0) {
      navigate(`/events/${slug}/seats`)
      return
    }
    try {
      const created = await createBooking({ eventId, seatIds, promoCode: appliedPromo?.code }).unwrap()
      setBooking(created)
      const result = await getCheckout(created.bookingRef).unwrap()
      if (result.mode === 'stripe' && result.url) {
        window.location.assign(result.url)
      } else {
        setDevMode(true)
      }
    } catch (err) {
      const data = (err as { data?: { message?: string } })?.data
      setError(data?.message ?? 'Could not start checkout — press again or reselect your seats.')
    }
  }

  async function payDev() {
    setError(null)
    if (!booking) return
    try {
      await devConfirm(booking.bookingRef).unwrap()
      navigate(`/booking/complete/${booking.bookingRef}`)
    } catch (err) {
      const data = (err as { data?: { message?: string } })?.data
      setError(data?.message ?? 'Payment simulation failed.')
    }
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner className="size-6 text-primary" />
      </div>
    )
  }

  const busy = creating || openingCheckout

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to={`/events/${slug}/seats`} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to seats
          </Link>
          <span className="font-heading font-semibold">Checkout</span>
          <span className="w-24" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                {formatDate(event.startAt)} · {formatTime(event.startAt)}
              </p>
              <h1 className="mt-1 font-heading text-2xl font-semibold">{event.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {event.venue?.name ?? 'Venue TBA'}
                {event.city ? ` — ${event.city}` : ''}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              <Lock className="size-3" /> Seats held
            </span>
          </div>

          <Separator className="my-5" />

          <div className="space-y-2">
            {seatRows.map((seat) => (
              <div key={seat.id} className="flex items-center justify-between rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-sm">
                <span className="flex items-center gap-2 font-mono text-xs">
                  <Badge variant="outline" className="font-mono text-[10px] uppercase">{seat.tierName}</Badge>
                  Seat {seat.label}
                </span>
                <span className="font-mono">{formatPrice(seat.price, seat.currency)}</span>
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <Input
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              placeholder="Promo code"
              className="h-8 bg-muted/50 font-mono text-xs uppercase"
              disabled={Boolean(booking) || validating}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={applyPromo}
              disabled={Boolean(booking) || validating || !promoInput.trim()}
            >
              {validating ? <Spinner data-icon="inline-start" /> : null} Apply
            </Button>
          </div>
          {promoError && (
            <p className="mt-1.5 text-xs text-destructive">{promoError}</p>
          )}
          {appliedPromo && (
            <p className="mt-1.5 font-mono text-xs text-primary">
              {appliedPromo.code} applied —{' '}
              {appliedPromo.type === 'percent' ? `${appliedPromo.value}% off` : `$${appliedPromo.value} off`}
            </p>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2.5 rounded-md border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Separator className="my-5" />

          <div className="space-y-1.5 font-mono text-sm">
            <Row label="Subtotal" value={formatPrice(totals.subtotal)} />
            {totals.promoDiscount > 0 && (
              <Row label={`Promo ${appliedPromo?.code ?? ''}`} value={`− ${formatPrice(totals.promoDiscount)}`} accent />
            )}
            {totals.groupDiscount > 0 && (
              <Row label="Group discount (5+)" value={`− ${formatPrice(totals.groupDiscount)}`} accent />
            )}
            <div className="flex items-center justify-between pt-2 text-base font-bold">
              <span>{booking ? 'Total charged' : 'Total'}</span>
              <span>{formatPrice(booking?.total ?? totals.total)}</span>
            </div>
          </div>

          {!booking ? (
            <Button onClick={pay} disabled={busy} className="mt-6 w-full">
              {busy ? <Spinner data-icon="inline-start" /> : <Lock data-icon="inline-start" />} Secure seats & pay
            </Button>
          ) : devMode ? (
            <>
              <Button onClick={payDev} disabled={confirming} className="mt-6 w-full">
                {confirming ? <Spinner data-icon="inline-start" /> : <PartyPopper data-icon="inline-start" />} Pay in dev mode
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                No Stripe keys configured — this simulates a successful payment.
              </p>
            </>
          ) : (
            <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Opening checkout…
            </p>
          )}

          {booking && !devMode && (
            <p className="mt-3 text-center font-mono text-[11px] text-muted-foreground">
              Booking {booking.bookingRef} — resolving payment
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className={accent ? 'text-primary' : undefined}>{value}</span>
    </div>
  )
}
