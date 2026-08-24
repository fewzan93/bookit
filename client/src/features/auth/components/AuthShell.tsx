import { motion } from 'framer-motion';
import { CalendarHeart } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 size-96 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-violet-500/20 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative w-full max-w-md"
      >
        <Link to="/" className="mb-8 flex items-center justify-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-fuchsia-500/15 text-fuchsia-400">
            <CalendarHeart className="size-6" />
          </span>
          <span className="text-2xl font-bold tracking-tight text-white">Bookit</span>
        </Link>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl shadow-black/40 backdrop-blur">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
