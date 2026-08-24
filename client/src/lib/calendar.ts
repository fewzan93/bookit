import { API_BASE_URL } from './config';

export interface CalendarLikeEvent {
  title: string;
  slug: string;
  startAt: string;
  endAt?: string;
  description?: string;
  venueName?: string;
  city?: string;
}

function dt(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function googleCalendarHref(event: CalendarLikeEvent): string {
  const start = new Date(event.startAt);
  const end = event.endAt ? new Date(event.endAt) : new Date(start.getTime() + 3 * 3600 * 1000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${dt(start)}/${dt(end)}`,
    details: `${event.title}${event.venueName ? ` @ ${event.venueName}` : ''}`,
    location: [event.venueName, event.city].filter(Boolean).join(', '),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export async function downloadIcs(eventId: string, slug: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/events/${eventId}/ics`, { credentials: 'include' });
  if (!res.ok) throw new Error('Could not generate calendar file');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
