import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Loader2,
  ShoppingCart,
  Timer,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { useAuth } from '../../auth/hooks';
import { formatDate, formatPrice } from '../../../lib/format';
import { getSocket, type SeatStateEvent } from '../../../lib/socket';
import { cn } from '../../../lib/utils';
import { useGetEventQuery, useGetSeatMapQuery, type EventTierDTO, type SeatDTO } from '../../events/api';
import { lockAccepted, lockReleased, mapError, mapLoaded, seatChanges, selectionCleared } from '../seatSlice';
import { SeatMapView, tierColor } from '../components/SeatMapView';

const MAX_SEATS = 6;
const HEARTBEAT_MS = 60_000;

export default function SeatSelectionPage() {
  const { slug = '' } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: event } = useGetEventQuery(slug, { skip: !user });
  const eventId = event?._id;

  const { data: seatMap, isLoading: mapLoading, refetch } = useGetSeatMapQuery(eventId ?? '', { skip: !eventId });
  const seatsById = useAppSelector((s) => s.seatMap.seats);
  const selected = useAppSelector((s) => s.seatMap.selected);
  const expiresAt = useAppSelector((s) => s.seatMap.expiresAt);
  const mapErrorMsg = useAppSelector((s) => s.seatMap.error);

  const [now, setNow] = useState(Date.now());
  const [notice, setNotice] = useState<string | null>(null);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const selectedRef = useRef<string[]>([]);
  const lastHeartbeatRef = useRef(0);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const tierPrice = useMemo(() => {
    const map = new Map<string, EventTierDTO>();
    for (const t of seatMap?.tiers ?? []) map.set(t.tierId, t);
    return map;
  }, [seatMap]);

  /* boot: load map state into slice */
  useEffect(() => {
    if (!eventId || !seatMap) return;
    const seats: Record<string, { status: 'available' | 'locked' | 'booked' | 'disabled'; tierId: string }> = {};
    for (const section of seatMap.sections) {
      for (const seat of section.seats) seats[seat.id] = { status: seat.status as never, tierId: seat.tierId };
    }
    dispatch(mapLoaded({ eventId, seats }));
  }, [eventId, seatMap, dispatch]);

  /* socket lifecycle */
  useEffect(() => {
    if (!user || !eventId) return;
    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => socket.emit('seatmap:join', { eventId });
    const onState = (payload: SeatStateEvent) => {
      if (payload.eventId !== eventId) return;
      dispatch(
        seatChanges({
          changes: payload.changes.map((c) => ({ seatId: c.seatId, status: c.status as never })),
        }),
      );
    };
    const onDisconnect = () => setNotice('Live connection lost — trying to reconnect…');

    socket.on('connect', onConnect);
    socket.on('seats:state', onState);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('seats:state', onState);
      socket.off('disconnect', onDisconnect);
      socket.emit('seatmap:leave', { eventId });
    };
  }, [user, eventId, dispatch]);

  /* countdown + expiry + heartbeat */
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!expiresAt || selected.length === 0) return;
    if (now >= expiresAt) {
      dispatch(selectionCleared());
      setNotice('Seat lock expired — select your seats again.');
      void refetch();
      return;
    }
    if (expiresAt - now < 4 * 60_000 && now - lastHeartbeatRef.current > HEARTBEAT_MS) {
      const socket = socketRef.current;
      if (socket?.connected) {
        lastHeartbeatRef.current = now;
        socket.emit('seat:heartbeat', { eventId, seatIds: selected }, (ack: { ok?: boolean; timeoutSec?: number }) => {
          if (ack?.ok && ack.timeoutSec) dispatch(lockAccepted({ seatIds: selected, timeoutSec: ack.timeoutSec }));
        });
      }
    }
  }, [now, expiresAt, selected.length, dispatch, eventId, refetch]);

  const remainingSec = expiresAt ? Math.max(Math.floor((expiresAt - now) / 1000), 0) : null;
  const mm = remainingSec !== null ? Math.floor(remainingSec / 60).toString().padStart(2, '0') : '00';
  const ss = remainingSec !== null ? (remainingSec % 60).toString().padStart(2, '0') : '00';

  function totalPrice(): number {
    let total = 0;
    for (const seatId of selected) {
      const cell = seatsById[seatId];
      total += tierPrice.get(cell?.tierId ?? '')?.price ?? 0;
    }
    return total;
  }

  async function handleSeatClick(seat: SeatDTO) {
    if (!user) return;
    const cell = seatsById[seat.id];
    if (!cell || cell.status === 'booked' || cell.status === 'disabled') return;

    const socket = socketRef.current;
    if (!socket?.connected) {
      setNotice('Connecting to live seat board… try again in a second.');
      return;
    }

    const isMine = selected.includes(seat.id);

    if (isMine) {
      const remaining = selected.filter((id) => id !== seat.id);
      socket.emit('seat:release', { eventId, seatIds: [seat.id] }, (ack: { ok?: boolean }) => {
        if (ack?.ok) dispatch(lockReleased([seat.id]));
      });
      if (remaining.length === 0) dispatch(selectionCleared());
      return;
    }

    if (cell.status === 'locked') {
      setNotice('That seat is locked by someone else — it frees up soon.');
      return;
    }

    const next = [...selected, seat.id];
    if (next.length > MAX_SEATS) {
      setNotice(`You can select up to ${MAX_SEATS} seats at once.`);
      return;
    }

    socket.emit(
      'seat:lock',
      { eventId, seatIds: [seat.id] },
      (ack: { ok?: boolean; conflicts?: string[]; timeoutSec?: number }) => {
        if (ack?.ok && ack.timeoutSec) {
          dispatch(lockAccepted({ seatIds: next, timeoutSec: ack.timeoutSec }));
          setNotice(null);
        } else {
          dispatch(mapError('A seat you tried was just taken — pick another.'));
          dispatch(lockReleased(ack?.conflicts ?? [seat.id]));
          void refetch();
        }
      },
    );
  }

  function releaseAll() {
    const socket = socketRef.current;
    if (selected.length > 0 && socket?.connected) {
      socket.emit('seat:release', { eventId, seatIds: selected }, () => undefined);
    }
    dispatch(selectionCleared());
  }

  useEffect(() => {
    return () => {
      const socket = socketRef.current;
      // Don't release when moving straight into checkout — the seats stay held for payment.
      if (window.location.pathname.includes('/checkout')) return;
      if (socket?.connected && selectedRef.current.length > 0) {
        socket.emit('seat:release', { eventId, seatIds: selectedRef.current }, () => undefined);
      }
      dispatch(selectionCleared());
    };
  }, [eventId, dispatch]);

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="size-8 animate-spin text-fuchsia-400" />
      </div>
    );
  }

  const noSections = (seatMap?.sections.length ?? 0) === 0;

  return (
    <div className="min-h-screen bg-zinc-950 pb-36">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-zinc-950/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to={`/events/${event.slug}`} className="inline-flex items-center gap-1.5 text-sm text-zinc-300 transition hover:text-white">
            <ArrowLeft className="size-4" /> {event.title}
          </Link>
          <span className="flex items-center gap-1.5 text-xs text-zinc-400">
            <CalendarDays className="size-3.5" /> {formatDate(event.startAt)}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-zinc-300">
            <span className="size-2.5 rounded" style={{ backgroundColor: tierColor('', []) }} /> Available
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-amber-300">
            <span className="size-2.5 rounded bg-amber-500" /> Locked by others
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-zinc-300">
            <span className="size-2.5 rounded bg-zinc-700" /> Booked
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-zinc-500">
            <span className="size-2.5 rounded bg-zinc-900" /> Disabled
          </span>
          <span className="ml-auto hidden text-zinc-500 sm:inline">Seats auto-lock for 8 minutes</span>
        </div>

        {(notice || mapErrorMsg) && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{mapErrorMsg ?? notice}</span>
            <button onClick={() => setNotice(null)} className="ml-auto text-amber-300 hover:text-amber-100" aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </div>
        )}

        {!user ? (
          <div className="rounded-3xl border border-dashed border-white/10 px-6 py-20 text-center">
            <p className="text-lg font-semibold text-white">Sign in to pick seats</p>
            <p className="mt-1 text-sm text-zinc-500">Seats are locked to your account the moment you tap one.</p>
            <Link to="/login" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/25 transition hover:brightness-110">
              Sign in to continue
            </Link>
          </div>
        ) : mapLoading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="size-6 animate-spin text-fuchsia-400" />
          </div>
        ) : noSections ? (
          <div className="rounded-3xl border border-dashed border-white/10 px-6 py-20 text-center">
            <ShoppingCart className="mx-auto size-10 text-zinc-700" />
            <p className="mt-3 text-lg font-semibold text-white">No seated layout yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
              The organizer hasn&apos;t added seat sections for this venue. General-admission tickets will open with checkout in Phase 4.
            </p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="mb-8 rounded-2xl border border-white/5 bg-white/[0.02] py-5 text-center text-xs font-semibold tracking-[0.35em] text-zinc-500 uppercase">
              Stage
            </div>
            <SeatMapView
              sections={seatMap?.sections ?? []}
              tiers={seatMap?.tiers ?? []}
              seatsById={seatsById}
              selected={selected}
              soldOutTierIds={seatMap?.soldOutTierIds ?? []}
              onSeatClick={handleSeatClick}
            />
          </motion.div>
        )}
      </main>

      {user && selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-zinc-950/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              {selected.map((seatId) => {
                const cell = seatsById[seatId];
                const tier = tierPrice.get(cell?.tierId ?? '');
                return (
                  <span
                    key={seatId}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white"
                  >
                    <span className="size-2 rounded" style={{ backgroundColor: tier ? tierColor(tier.tierId, seatMap?.tiers ?? []) : '#fff' }} />
                    Seat {selected.indexOf(seatId) + 1}
                    <span className="text-zinc-500">{tier ? formatPrice(tier.price, tier.currency) : ''}</span>
                  </span>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <span className={cn('inline-flex items-center gap-1.5 rounded-xl px-3 py-2 font-mono text-sm', remainingSec !== null && remainingSec < 60 ? 'bg-red-500/10 text-red-300' : 'bg-white/[0.04] text-white')}>
                <Timer className="size-4" />
                {mm}:{ss}
              </span>
              <button onClick={releaseAll} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition hover:border-red-400/40 hover:text-red-300">
                Release
              </button>
              <button
                onClick={() => navigate(`/events/${event.slug}/checkout?seats=${selected.join(',')}`)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/25 transition hover:brightness-110"
              >
                Total: {formatPrice(totalPrice(), 'USD')} · Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {user && selected.length === 0 && (
        <p className="pointer-events-none fixed right-6 bottom-4 z-40 flex items-center gap-1.5 text-xs text-zinc-600">
          <CheckCircle2 className="size-3.5 text-emerald-500/60" /> Live availability
        </p>
      )}
    </div>
  );
}
