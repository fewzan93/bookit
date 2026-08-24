import { ArrowRight, Ticket } from "lucide-react"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { formatDate, formatPrice, formatTime } from "@/lib/format"
import type { PublicEventSummary } from "@/features/events/api"

function hashBars(seed: string): number[] {
  let h = 2166136261
  const bars: number[] = []
  for (let i = 0; i < 26; i += 1) {
    h ^= seed.charCodeAt(i % seed.length) + i
    h = Math.imul(h, 16777619) >>> 0
    bars.push(1 + (h % 3))
  }
  return bars
}

function serialOf(slug: string): string {
  const code = slug.replace(/[^a-z0-9]/gi, "").slice(-4).toUpperCase()
  return `ET-${code || "0000"}`
}

export function StubBarcode({ seed, className }: { seed: string; className?: string }) {
  return (
    <div aria-hidden className={cn("flex h-8 items-stretch gap-[2px]", className)}>
      {hashBars(seed).map((w, i) => (
        <span key={`${i}-${w}`} className="bg-foreground/85" style={{ width: `${1 + w}px` }} />
      ))}
    </div>
  )
}

export function TicketStub({ event, index = 0 }: { event: PublicEventSummary; index?: number }) {
  return (
    <Link
      to={`/events/${event.slug}`}
      className="group block w-full max-w-sm rotate-[-1.2deg] rounded-lg border border-border bg-card shadow-2xl shadow-background/60 transition duration-300 hover:rotate-0 hover:border-signal/40 hover:shadow-signal/5"
    >
      <div className="flex items-center justify-between px-4 pt-3 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
        <span>Admit one</span>
        <span className="text-gold-dim">{serialOf(event.slug)}</span>
      </div>

      <div className="perfs mx-4 mt-2" />

      <div className="notch-tr relative m-4 mb-0 h-40 overflow-hidden rounded-md bg-muted">
        <img
          src={event.banner.url}
          alt={event.title}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card/70 to-transparent" />
        <Badge variant="outline" className="absolute top-2.5 left-2.5 bg-card/80 font-mono text-[10px] tracking-[0.18em] uppercase backdrop-blur">
          {event.category}
        </Badge>
        <span className="absolute right-3 bottom-3 rounded-md bg-gold px-2 py-1 font-mono text-xs font-bold text-ink">
          {formatPrice(event.priceFrom, event.currency)}
        </span>
      </div>

      <div className="px-5 pt-4 pb-5">
        <p className="font-mono text-[10px] tracking-[0.18em] text-gold-dim uppercase">
          {formatDate(event.startAt)} · {formatTime(event.startAt)}
        </p>
        <h3 className="mt-1.5 font-heading text-xl leading-snug font-semibold text-foreground transition group-hover:text-primary">
          {event.title}
        </h3>
        <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
          {event.venue?.name ?? "Venue TBA"}
          {event.city ? ` — ${event.city}` : ""}
        </p>
        <StubBarcode seed={event.slug} className="mt-4" />
        <div className="perfs -mx-5 mt-4" />
        <div className="flex items-center justify-between pt-3">
          <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
            Section · Row · Seat — on the live map
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-signal">
            {index > 0 ? `#${String(index + 1).padStart(2, "0")}` : "Next up"} <ArrowRight className="size-3" />
          </span>
        </div>
      </div>
    </Link>
  )
}

export function TicketStubSkeleton() {
  return (
    <div className="w-full max-w-sm rotate-[-1.2deg] rounded-lg border border-border bg-card p-4 shadow-2xl shadow-background/60">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-12" />
      </div>
      <div className="perfs mt-3" />
      <Skeleton className="mt-4 h-40 w-[calc(100%+2rem)] -translate-x-4" />
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="mt-5 flex items-center gap-1">
        {Array.from({ length: 14 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-[3px]" />
        ))}
      </div>
    </div>
  )
}

export function TicketIconFallback() {
  return (
    <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
      <Ticket className="size-8" />
    </div>
  )
}
