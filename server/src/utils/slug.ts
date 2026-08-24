export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function uniqueSlug(title: string): string {
  const base = slugify(title).slice(0, 50);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || 'event'}-${suffix}`;
}

export function randomId(len = 8): string {
  return Math.random().toString(36).slice(2, 2 + len).padEnd(len, '0');
}
