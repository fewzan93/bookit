import { CalendarDays, Loader2, MapPin, Pencil, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { formatDate } from '../../../lib/format';
import { useDeleteEventMutation, useGetMineQuery, useUpdateEventMutation, type EventMineDTO } from '../api';

const STATUS_STYLES: Record<string, string> = {
  draft: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  published: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
  cancelled: 'border-red-400/40 bg-red-500/10 text-red-200',
  ended: 'border-zinc-400/40 bg-zinc-500/10 text-zinc-300',
};

export default function EventsList() {
  const { data: events, isLoading, isError, refetch } = useGetMineQuery();
  const [deleteEvent, { isLoading: deleting }] = useDeleteEventMutation();
  const [toggleStatus, { isLoading: toggling }] = useUpdateEventMutation();
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(event: EventMineDTO) {
    if (!window.confirm(`Delete "${event.title}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await deleteEvent(event._id).unwrap();
    } catch {
      setError('Failed to delete the event, please try again.');
    }
  }

  async function handleToggle(event: EventMineDTO) {
    setError(null);
    try {
      const next = event.status === 'published' ? 'draft' : 'published';
      await toggleStatus({ id: event._id, body: { status: next } }).unwrap();
    } catch {
      setError('Failed to update status, please try again.');
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Your events</h1>
          <p className="text-sm text-zinc-500">Create, publish and manage everything in one place.</p>
        </div>
        <Link
          to="/dashboard/new"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/20 transition hover:brightness-110"
        >
          <Plus className="size-4" /> New event
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-fuchsia-400" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-12 text-center">
          <p className="text-zinc-300">Couldn&apos;t load your events.</p>
          <button
            onClick={() => refetch()}
            className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-sm text-white transition hover:border-fuchsia-400/50"
          >
            Retry
          </button>
        </div>
      ) : !events || events.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center">
          <p className="text-lg font-semibold text-white">No events yet</p>
          <p className="mt-1 text-sm text-zinc-500">Create your first event and start selling tickets.</p>
          <Link
            to="/dashboard/new"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <Plus className="size-4" /> Create event
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const totalSeats = event.tiers.reduce((s, t) => s + t.capacity, 0);
            const sold = event.tiers.reduce((s, t) => s + t.sold, 0);
            return (
              <div
                key={event._id}
                className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition hover:border-white/15 sm:flex-row sm:items-center"
              >
                <img
                  src={event.banner.url}
                  alt={event.title}
                  className="h-20 w-full rounded-xl object-cover sm:w-32"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase', STATUS_STYLES[event.status])}>
                      {event.status}
                    </span>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-zinc-400 uppercase">{event.category}</span>
                  </div>
                  <Link to={`/events/${event.slug}`} className="mt-1.5 block truncate font-semibold text-white hover:text-fuchsia-300">
                    {event.title}
                  </Link>
                  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5" /> {formatDate(event.startAt)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" /> {event.venue?.name ?? 'TBA'}
                    </span>
                    <span>
                      {sold}/{totalSeats} seats sold
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => handleToggle(event)}
                    disabled={toggling}
                    title={event.status === 'published' ? 'Unpublish' : 'Publish'}
                    className="inline-flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 transition hover:border-emerald-400/50 hover:text-emerald-300 disabled:opacity-50"
                  >
                    {event.status === 'published' ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                  <Link
                    to={`/dashboard/${event._id}/edit`}
                    title="Edit"
                    className="inline-flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 transition hover:border-fuchsia-400/50 hover:text-fuchsia-300"
                  >
                    <Pencil className="size-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(event)}
                    disabled={deleting}
                    title="Delete"
                    className="inline-flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 transition hover:border-red-400/50 hover:text-red-300 disabled:opacity-50"
                  >
                    {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
