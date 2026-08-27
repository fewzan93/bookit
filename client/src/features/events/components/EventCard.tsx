import { MapPin } from "lucide-react"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatPrice } from "@/lib/format"
import type { PublicEventSummary } from "@/features/events/api"

export function EventCard({ event, index = 0 }: { event: PublicEventSummary; index?: number }) {
  const stub = `Nº ${String(index + 1).padStart(2, "0")}`

  return (
    <Link
      to={`/events/${event.slug}`}
      className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-3 transition duration-200 hover:-translate-y-0.5 hover:border-primary/50"
    >
      <div className="notch-tr relative h-36 overflow-hidden rounded-md bg-muted">
        <img
          src={event.banner.url}
          alt={event.title}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <Badge
          variant="outline"
          className="absolute top-2 left-2 bg-card/80 font-mono text-[9px] tracking-[0.16em] uppercase backdrop-blur"
        >
          {event.category}
        </Badge>
        <span className="absolute right-2 bottom-2 rounded-md bg-gold px-2 py-0.5 font-mono text-xs font-bold text-ink">
          {formatPrice(event.priceFrom, event.currency)}
        </span>
      </div>

      <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.16em] uppercase">
        <span className="text-muted-foreground">{formatDate(event.startAt)}</span>
        <span className="text-card-foreground/40">{stub}</span>
      </div>

      <div>
        <h3 className="font-heading text-base leading-snug font-semibold text-foreground transition group-hover:text-primary">
          {event.title}
        </h3>
        <p className="mt-1 flex items-center gap-1 truncate font-mono text-[11px] text-muted-foreground">
          <MapPin className="size-3" />
          <span className="truncate">
            {event.venue?.name ?? "Venue TBA"}
            {event.city ? ` · ${event.city}` : ""}
          </span>
        </p>
      </div>

      <div className="perfs -mx-3 mt-auto h-2" />
    </Link>
  )
}

export function EventCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
      <Skeleton className="notch-tr h-36 w-full" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-8" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="perfs -mx-3 mt-auto h-2" />
    </div>
  )
}
