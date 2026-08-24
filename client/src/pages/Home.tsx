import { Search, SlidersHorizontal } from "lucide-react"
import { useState, type FormEvent } from "react"
import { useSearchParams } from "react-router-dom"
import { MotionConfig } from "framer-motion"

import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { RotateCcw, Ticket } from "lucide-react"

import { SiteHeader } from "@/components/layout/SiteHeader"
import { TicketStub, TicketStubSkeleton } from "@/components/home/ticket-stub"
import { EVENT_CATEGORIES, useGetEventsQuery } from "@/features/events/api"
import { EventCard, EventCardSkeleton } from "@/features/events/components/EventCard"

const SORTS = [
  { value: "date", label: "Date" },
  { value: "price", label: "Price" },
  { value: "name", label: "A–Z" },
] as const

export default function HomePage() {
  const [params, setParams] = useSearchParams()
  const [near, setNear] = useState(params.get("lng") !== null)
  const [searchText, setSearchText] = useState(params.get("q") ?? "")

  const query = params.get("q") ?? ""
  const category = params.get("cat") ?? ""
  const sort = (params.get("sort") as "date" | "price" | "name") || "date"

  const filters = {
    query: query || undefined,
    category: category || undefined,
    sort,
    limit: 12,
    lng: near ? Number(params.get("lng")) : undefined,
    lat: near ? Number(params.get("lat")) : undefined,
    radiusKm: near ? Number(params.get("radiusKm") ?? 100) : undefined,
  }

  const { data, isFetching, isLoading, isError, refetch } = useGetEventsQuery(filters, {
    skip: near && (filters.lat === undefined || Number.isNaN(filters.lat)),
  })

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  function toggleNear() {
    if (near) {
      setNear(false)
      setParam("lng", "")
      setParam("lat", "")
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNear(true)
        setParam("lng", String(pos.coords.longitude))
        setParam("lat", String(pos.coords.latitude))
      },
      () => setNear(false),
      { timeout: 8000 },
    )
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    setParam("q", searchText.trim())
  }

  const nextUp = data?.events[0]

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />

        <section className="mx-auto max-w-6xl px-4 pt-14 pb-16 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_minmax(320px,400px)]">
            <div>
              <p className="font-mono text-[11px] tracking-[0.22em] text-gold-dim uppercase">
                {"//"} Live seat maps on every event
              </p>
              <h1 className="mt-4 font-heading text-5xl leading-[1.02] font-extrabold tracking-tight text-balance sm:text-6xl">
                One night.
                <br />
                One seat. <span className="text-signal">Yours.</span>
              </h1>
              <p className="mt-5 max-w-lg text-pretty text-muted-foreground">
                Find the night, hold your seat on the live map, and show your ticket at the door. Seats lock for 8
                minutes, then they go back on the board.
              </p>

              <form onSubmit={handleSearch} className="mt-8 flex max-w-lg gap-2">
                <Input
                  type="search"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search events, artists, tags…"
                  aria-label="Search events"
                  className="h-9 bg-card"
                />
                <Button type="submit" className="shrink-0">
                  <Search data-icon="inline-start" /> Find events
                </Button>
              </form>

              <p className="mt-6 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                Held seats release automatically — no queue, no waiting
              </p>
            </div>

            <div className="justify-self-center lg:justify-self-end">
              <p className="mb-3 text-right font-mono text-[11px] tracking-[0.22em] text-gold-dim uppercase">
                {"//"} Next up
              </p>
              {isLoading || !nextUp ? <TicketStubSkeleton /> : <TicketStub event={nextUp} />}
            </div>
          </div>
        </section>

        <Separator />

        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <ToggleGroup
              type="single"
              value={category}
              onValueChange={(v) => setParam("cat", v ?? "")}
              variant="outline"
              size="sm"
              spacing={0}
              className="font-mono text-[11px] tracking-[0.14em] uppercase"
            >
              <ToggleGroupItem value="" aria-label="All events">
                All
              </ToggleGroupItem>
              {EVENT_CATEGORIES.map((c) => (
                <ToggleGroupItem key={c.value} value={c.value} aria-label={`${c.label} events`}>
                  {c.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <div className="ml-auto flex flex-wrap items-center gap-3">
              <ToggleGroup
                type="single"
                value={sort}
                onValueChange={(v) => setParam("sort", v ?? "date")}
                variant="outline"
                size="sm"
                spacing={0}
                className="font-mono text-[11px] tracking-[0.14em] uppercase"
              >
                {SORTS.map((s) => (
                  <ToggleGroupItem key={s.value} value={s.value} aria-label={`Sort by ${s.label}`}>
                    {s.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleNear}
                className={near ? "border-signal/60 text-primary" : undefined}
                aria-pressed={near}
              >
                <SlidersHorizontal data-icon="inline-start" /> {near ? "Near me: on" : "Near me"}
              </Button>
            </div>
          </div>

          <div className="mt-8">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <EventCardSkeleton key={i} />
                ))}
              </div>
            ) : isError ? (
              <Alert variant="destructive" className="h-10 border-transparent">
                <AlertTitle>Can&apos;t reach the ticketing board</AlertTitle>
                <AlertDescription>The API on port 5000 didn&apos;t answer — is the server running?</AlertDescription>
                <AlertAction>
                  <Button variant="ghost" size="sm" onClick={() => refetch()}>
                    <RotateCcw data-icon="inline-start" /> Retry
                  </Button>
                </AlertAction>
              </Alert>
            ) : !data || data.events.length === 0 ? (
              <Empty className="py-16">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Ticket />
                  </EmptyMedia>
                  <EmptyTitle>Nothing on the board yet</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  <EmptyDescription>
                    Try another category or search — or be the first organizer to publish a night.
                  </EmptyDescription>
                </EmptyContent>
              </Empty>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {data.events.map((event, i) => (
                    <EventCard key={event._id} event={event} index={i} />
                  ))}
                </div>
                <div
                  className="mt-5 text-center font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase transition"
                  style={{ opacity: isFetching ? 1 : 0 }}
                >
                  Updating the board…
                </div>
              </>
            )}
          </div>
        </section>

        <Separator />

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="font-mono text-[11px] tracking-[0.22em] text-gold-dim uppercase">{"//"} How it works</p>
          <div className="mt-8 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {[
              ["Pick", "Choose a night, then tap seats on the live map. Every block is color-coded by tier."],
              ["Lock", "Your seats hold for 8 minutes. Everyone else sees them marked — no double booking."],
              ["Enter", "Show your QR ticket at the door. Organizers scan, you walk in."],
            ].map(([tag, copy]) => (
              <div key={tag}>
                <div className="perfs mb-3 w-full" style={{ width: "4rem" }} />
                <p className="font-mono text-[11px] tracking-[0.2em] text-signal uppercase">{tag}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-8 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase sm:px-6">
            <span>© 2026 Bookit — Addis Ababa</span>
            <span>Live seat maps · Checkout next</span>
          </div>
        </footer>
      </div>
    </MotionConfig>
  )
}
