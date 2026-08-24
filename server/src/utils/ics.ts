export interface IcsEvent {
  title: string;
  startAt: Date | string;
  endAt?: Date | string;
  description?: string;
  venueName?: string;
  city?: string;
  uid: string;
}

function dtFormat(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

export function buildIcs(event: IcsEvent): string {
  const start = new Date(event.startAt);
  const end = event.endAt ? new Date(event.endAt) : new Date(start.getTime() + 3 * 3600 * 1000);
  const location = [event.venueName, event.city].filter(Boolean).join(', ');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bookit//Events//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.uid}@bookit`,
    `DTSTAMP:${dtFormat(new Date())}`,
    `DTSTART:${dtFormat(start)}`,
    `DTEND:${dtFormat(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    event.description ? `DESCRIPTION:${escapeText(event.description)}` : null,
    location ? `LOCATION:${escapeText(location)}` : null,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter((l): l is string => l !== null);

  return lines.join('\r\n');
}
