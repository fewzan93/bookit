export interface SharedEvent {
  title: string;
  slug: string;
}

function eventUrl(slug: string): string {
  return `${window.location.origin}/events/${slug}`;
}

function shareText(title: string): string {
  return `Join me: ${title} — tickets on Bookit`;
}

export function telegramShareUrl(event: SharedEvent): string {
  const url = eventUrl(event.slug);
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText(event.title))}`;
}

export function whatsappShareUrl(event: SharedEvent): string {
  return `https://wa.me/?text=${encodeURIComponent(`${shareText(event.title)} ${eventUrl(event.slug)}`)}`;
}

export function xShareUrl(event: SharedEvent): string {
  const params = new URLSearchParams({
    url: eventUrl(event.slug),
    text: shareText(event.title),
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function linkedinShareUrl(event: SharedEvent): string {
  const params = new URLSearchParams({
    url: eventUrl(event.slug),
    title: event.title,
    summary: shareText(event.title),
  });
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
}

const OG_KEYS = [
  'og:title',
  'og:description',
  'og:image',
  'og:type',
  'og:url',
  'twitter:card',
  'twitter:title',
  'twitter:description',
] as const;

export function setSocialMeta(tags: { title: string; description: string; image?: string; url: string }): void {
  const values: Record<(typeof OG_KEYS)[number], string> = {
    'og:title': tags.title,
    'og:description': tags.description,
    'og:image': tags.image ?? '',
    'og:type': 'website',
    'og:url': tags.url,
    'twitter:card': 'summary_large_image',
    'twitter:title': tags.title,
    'twitter:description': tags.description,
  };

  for (const key of OG_KEYS) {
    let el = document.head.querySelector<HTMLMetaElement>(`meta[property="${key}"], meta[name="${key}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(key.startsWith('og:') ? 'property' : 'name', key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', values[key]);
  }
  document.title = tags.title;
}
