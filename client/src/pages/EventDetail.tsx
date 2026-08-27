import { ArrowLeft, Bell, CalendarDays, CalendarPlus, CheckCircle2, Clock3, Download, Loader2, Linkedin, LogIn, MapPin, MessageCircle, Send, Share2, Ticket, Twitter, UserRound, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { formatDate, formatPrice, formatTime } from '../lib/format';
import { downloadIcs, googleCalendarHref } from '../lib/calendar';
import { linkedinShareUrl, setSocialMeta, telegramShareUrl, whatsappShareUrl, xShareUrl } from '../lib/share';
import { SiteHeader } from '../components/layout/SiteHeader';
import { useGetEventQuery, useGetRelatedQuery, useGetSeatMapQuery, type EventTierDTO } from '../features/events/api';
import { useAuth } from '../features/auth/hooks';
import { useGetMyWaitlistsQuery, useJoinWaitlistMutation } from '../features/waitlist/api';
import { useGetMyBookingsQuery } from '../features/checkout/api';
import { EventCard } from '../features/events/components/EventCard';

function tierExpiredNow(tier: EventTierDTO): boolean {
  if (tier.sold >= tier.capacity) return true;
  if (!tier.activeUntil) return false;
  return new Date(tier.activeUntil).getTime() <= Date.now();
}

function tierPriceNow(tier: EventTierDTO): number {
  return tierExpiredNow(tier) ? (tier.afterPrice ?? tier.price) : tier.price;
}

export default function EventDetailPage() {
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const { data: event, isLoading, isError, refetch } = useGetEventQuery(slug);
  const { data: related } = useGetRelatedQuery(event?._id ?? '', { skip: !event });
  const { data: seatMap } = useGetSeatMapQuery(event?._id ?? '', { skip: !event });
  const { data: myBookings } = useGetMyBookingsQuery(undefined, { skip: !user });
  const { data: waitlists, refetch: refetchWaitlists } = useGetMyWaitlistsQuery(undefined, { skip: !user });
  const [joinWaitlist, { isLoading: joiningWaitlist }] = useJoinWaitlistMutation();
  const [icsBusy, setIcsBusy] = useState(false);
  const [waitlistMsg, setWaitlistMsg] = useState<string | null>(null);

  async function handleJoinWaitlist(tierId: string) {
    if (!event || !user) return;
    setWaitlistMsg(null);
    try {
      await joinWaitlist({ eventId: event._id, tierId }).unwrap();
      setWaitlistMsg('You are on the waitlist — we will email you when a seat opens.');
      refetchWaitlists();
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message ?? 'Could not join the waitlist.';
      setWaitlistMsg(message);
    }
  }

  useEffect(() => {
    if (!event) return;
    setSocialMeta({
      title: `${event.title} — Bookit`,
      description: `${event.title} · ${formatDate(event.startAt)}${event.city ? ` · ${event.city}` : ''}`,
      image: event.banner.url,
      url: window.location.href,
    });
  }, [event]);

  const shareEvent = event ? { title: event.title, slug: event.slug } : null;

  function tierPlanStats(tierId: string) {
    let total = 0;
    let disabled = 0;
    let booked = 0;
    let locked = 0;
    for (const section of seatMap?.sections ?? []) {
      for (const seat of section.seats) {
        if (seat.tierId !== tierId) continue;
        total += 1;
        if (seat.status === 'disabled') disabled += 1;
        if (seat.status === 'booked') booked += 1;
        if (seat.status === 'locked') locked += 1;
      }
    }
    return total > 0 ? { total, disabled, booked, locked, left: total - disabled - booked - locked } : null;
  }

  const hasPlan = (seatMap?.sections?.length ?? 0) > 0;
  const planTotals = (() => {
    let total = 0;
    let left = 0;
    for (const section of seatMap?.sections ?? []) {
      for (const seat of section.seats) {
        if (seat.status === 'disabled') continue;
        total += 1;
        if (seat.status !== 'booked' && seat.status !== 'locked') left += 1;
      }
    }
    return { total, left };
  })();

  const ownedByMe = new Map<string, number>();
  for (const booking of myBookings ?? []) {
    if (booking.eventId !== event?._id) continue;
    if (booking.status !== 'pending' && booking.status !== 'confirmed') continue;
    for (const item of booking.items) {
      ownedByMe.set(item.tierId, (ownedByMe.get(item.tierId) ?? 0) + 1);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
          <XCircle className="size-10 text-destructive" />
          <h1 className="text-2xl font-bold text-foreground">Event not found</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            It may have been unpublished, cancelled, or the link is misspelled.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/50"
            >
              Retry
            </button>
            <Link to="/" className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground">
              Back to events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalSeats = hasPlan ? planTotals.total : event.tiers.reduce((sum, t) => sum + t.capacity, 0);
  const soldSeats = hasPlan ? totalSeats - planTotals.left : event.tiers.reduce((sum, t) => sum + t.sold, 0);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <div className="relative h-[420px] w-full overflow-hidden">
        <img src={event.banner.url} alt={event.title} className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/20" />
        <div className="absolute bottom-0 left-0 right-0">
          <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
            <Link
              to="/"
              className="mb-4 inline-flex items-center gap-1.5 rounded-xl border border-border bg-background/40 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur transition hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" /> All events
            </Link>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 font-semibold tracking-wide text-primary uppercase backdrop-blur">
                {event.category}
              </span>
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 font-semibold tracking-wide uppercase backdrop-blur',
                  event.status === 'published' && 'border border-emerald-400/40 bg-emerald-500/10 text-emerald-400',
                  (event.status === 'draft' || event.status === 'ended') && 'border border-amber-400/40 bg-amber-500/10 text-amber-400',
                  event.status === 'cancelled' && 'border border-destructive/40 bg-destructive/10 text-destructive',
                )}
              >
                {event.status}
              </span>
            </div>
            <h1 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">{event.title}</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
          <div className="space-y-8">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <InfoTile
                icon={<CalendarDays className="size-4" />}
                label="Starts"
                value={`${formatDate(event.startAt)} · ${formatTime(event.startAt)}`}
              />
              <InfoTile
                icon={<MapPin className="size-4" />}
                label="Venue"
                value={event.venue?.name ?? event.city ?? 'TBA'}
                sub={event.address ? `${event.address}${event.city ? `, ${event.city}` : ''}` : undefined}
              />
              <InfoTile
                icon={<UserRound className="size-4" />}
                label="Organizer"
                value={event.organizer?.name ?? 'Bookit'}
                sub={event.organizer?.email}
              />
            </div>

            {shareEvent && (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
                <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                  <Share2 className="size-3.5" /> Share
                </span>
                {[
                  { icon: <Send className="size-3.5" />, href: telegramShareUrl(shareEvent), label: 'Telegram' },
                  { icon: <MessageCircle className="size-3.5" />, href: whatsappShareUrl(shareEvent), label: 'WhatsApp' },
                  { icon: <Twitter className="size-3.5" />, href: xShareUrl(shareEvent), label: 'X' },
                  { icon: <Linkedin className="size-3.5" />, href: linkedinShareUrl(shareEvent), label: 'LinkedIn' },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    title={`Share on ${s.label}`}
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            )}

            <div>
              <h2 className="text-lg font-semibold text-foreground">About this event</h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-muted-foreground">{event.description}</p>
              {event.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {event.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="h-fit space-y-4 lg:sticky lg:top-24">
            <div className="rounded-3xl border border-border bg-card p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-foreground uppercase">
                <Ticket className="size-4 text-fuchsia-400" /> Ticket tiers
              </h2>

              <div className="mt-4 space-y-3">
                {event.tiers.map((tier) => {
                  const plan = tierPlanStats(tier.tierId);
                  const tierTotal = plan ? plan.total - plan.disabled : tier.capacity;
                  const tierSold = plan ? plan.booked : tier.sold;
                  const tierLeft = plan ? plan.left : Math.max(tier.capacity - tier.sold, 0);
                  const progress = tierTotal > 0 ? Math.min((tierSold / tierTotal) * 100, 100) : 0;
                  const soldOut = tierLeft <= 0 || tier.sold >= tier.capacity;
                  const expired = tierExpiredNow(tier);
                  const priceNow = tierPriceNow(tier);
                  const myEntry = waitlists?.find((w) => w.eventId === event._id && w.tierId === tier.tierId);
                  const queued = myEntry?.status === 'queued' || myEntry?.status === 'notified';
                  const myHeld = ownedByMe.get(tier.tierId) ?? 0;
                  return (
                    <div key={tier.tierId} className="rounded-2xl border border-border bg-card p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">
                            {tier.name}
                            {soldOut && (
                              <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300 uppercase">Sold out</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tierLeft} of {tierTotal} seats left
                            {tier.activeUntil && !expired && (
                              <span className="block text-amber-400">
                                <Clock3 className="mr-1 inline size-3" />
                                Limited offer ends {formatDate(tier.activeUntil)} — then {formatPrice(tier.afterPrice ?? tier.price, tier.currency)}
                              </span>
                            )}
                            {tier.activeUntil && expired && tier.afterPrice !== undefined && (
                              <span className="block text-muted-foreground">Offer ended — regular price applies</span>
                            )}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-foreground">
                          {expired && tier.afterPrice !== undefined && (
                            <span className="mr-1.5 text-xs font-normal text-muted-foreground line-through">{formatPrice(tier.price, tier.currency)}</span>
                          )}
                          {formatPrice(priceNow, tier.currency)}
                        </p>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={cn('h-full rounded-full transition-all', soldOut ? 'bg-red-400' : 'bg-fuchsia-400')}
                          style={{ width: `${progress}%` }}
                        />
                      </div>                        {soldOut && (
                            <div className="mt-3">
                              {myHeld > 0 ? (
                                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                                  <CheckCircle2 className="size-3.5" /> You hold {myHeld} seat{myHeld > 1 ? 's' : ''} in this tier
                                </span>
                              ) : queued ? (
                                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                              <Bell className="size-3.5" /> You&apos;re queued — first slot notifies you
                            </span>                              ) : user ? (
                            <button
                              onClick={() => handleJoinWaitlist(tier.tierId)}
                              disabled={joiningWaitlist}
                              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-60"
                            >
                              {joiningWaitlist ? <Loader2 className="size-3.5 animate-spin" /> : <Bell className="size-3.5" />}
                              Join waitlist
                            </button>
                          ) : (
                            <Link
                              to="/login"
                              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/40"
                            >
                              <LogIn className="size-3.5" /> Sign in to join waitlist
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {waitlistMsg && (
                <p className="mt-3 text-xs text-fuchsia-300">{waitlistMsg}</p>
              )}

              <div className="mt-4 flex items-center justify-between rounded-2xl bg-muted px-4 py-3 text-sm">
                <span className="text-muted-foreground">
                  {totalSeats - soldSeats} seats left of {totalSeats}
                </span>
                {event.status === 'published' ? (
                  <CheckCircle2 className="size-4 text-emerald-400" />
                ) : (
                  <XCircle className="size-4 text-amber-400" />
                )}
              </div>

              {event.status === 'published' ? (
                <div className="mt-5 space-y-2.5">
                  <Link
                    to={`/events/${event.slug}/seats`}
                    className="block w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/25 transition hover:brightness-110"
                  >
                    Choose your seats
                  </Link>
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 p-1.5">
                    <a
                      href={googleCalendarHref(event)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
                    >
                      <CalendarPlus className="size-3.5" /> Google
                    </a>
                    <button
                      onClick={async () => {
                        setIcsBusy(true);
                        try {
                          await downloadIcs(event._id, event.slug);
                        } finally {
                          setIcsBusy(false);
                        }
                      }}
                  disabled={icsBusy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-60"
                    >
                      {icsBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />} Apple / iCal
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  disabled
                  className="mt-5 w-full cursor-not-allowed rounded-xl bg-gradient-to-r from-primary/40 to-accent/40 py-3.5 text-sm font-semibold text-muted-foreground"
                >
                  Seat selection opens when published
                </button>
              )}

              {waitlists && waitlists.length > 0 && (
                <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-semibold tracking-wide text-primary uppercase">Waitlist</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    You&apos;re queued for{' '}
                    {waitlists.map((w, i) => `${i > 0 ? ' + ' : ''}${w.tierId}`).join('')} — we&apos;ll email you the moment a seat frees.
                  </p>
                </div>
              )}

              {event.status === 'published' && (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Pick seats on a live map — they lock for 8 minutes while you check out.
                </p>
              )}
            </div>
          </aside>
        </div>

        {related && related.length > 0 && (
          <section className="mt-16">              <h2 className="text-xl font-bold text-foreground">You may also like</h2>
            <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((event, i) => (
                <EventCard key={event._id} event={event} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
        {icon} {label}
      </p>
      <p className="mt-1.5 font-medium text-foreground">{value}</p>
      {sub && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
