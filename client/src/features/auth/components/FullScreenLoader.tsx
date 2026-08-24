import { Loader2 } from 'lucide-react';

export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <Loader2 className="size-8 animate-spin text-fuchsia-400" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
