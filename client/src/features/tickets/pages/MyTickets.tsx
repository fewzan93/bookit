import { AlertCircle, ChevronDown, Download, Loader2, RefreshCw, Ticket, Ticket as TicketIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'react-qr-code'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"

import { SiteHeader } from '@/components/layout/SiteHeader'
import { formatDateTime, formatPrice } from '@/lib/format'
import {
  downloadTicketPdf,
  useGetMyTicketsQuery,
  useGetTicketQrQuery,
  useRotateTicketMutation,
  type TicketDTO,
} from '@/features/tickets/api'

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  valid: { label: 'Valid', cls: 'text-emerald-400' },
  used: { label: 'Checked in', cls: 'text-amber-400' },
  cancelled: { label: 'Cancelled', cls: 'text-red-400' },
}

export default function MyTicketsPage() {
  const { data: tickets, isLoading } = useGetMyTicketsQuery()
  const [openRef, setOpenRef] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="font-heading text-2xl font-bold">My tickets</h1>
        <p className="mt-1 text-sm text-muted-foreground">Present the QR at the door — it refreshes after you check in.</p>

        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-md border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Spinner className="size-6 text-primary" />
          </div>
        ) : !tickets || tickets.length === 0 ? (
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TicketIcon />
              </EmptyMedia>
              <EmptyTitle>No tickets yet</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <EmptyDescription>Book seats on any event and your tickets land here.</EmptyDescription>
              <Link to="/">
                <Button>Browse events</Button>
              </Link>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket.ticketRef}
                ticket={ticket}
                open={openRef === ticket.ticketRef}
                onToggle={() => setOpenRef(openRef === ticket.ticketRef ? null : ticket.ticketRef)}
                onError={setError}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function TicketCard({ ticket, open, onToggle, onError }: { ticket: TicketDTO; open: boolean; onToggle: () => void; onError: (m: string | null) => void }) {
  const { data: qr, isLoading: qrLoading } = useGetTicketQrQuery(ticket.ticketRef, { skip: !open })
  const [rotate, { isLoading: rotating }] = useRotateTicketMutation()
  const [pdfBusy, setPdfBusy] = useState(false)
  const state = STATUS_LABEL[ticket.status] ?? STATUS_LABEL.valid

  async function handlePdf() {
    setPdfBusy(true)
    onError(null)
    try {
      await downloadTicketPdf(ticket.ticketRef)
    } catch {
      onError('Could not download the PDF — try again.')
    } finally {
      setPdfBusy(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="relative h-24">
        <img src={ticket.eventSnapshot.bannerUrl} alt="" className="size-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
        <Badge variant="outline" className="absolute top-2.5 left-2.5 bg-card/80 font-mono text-[10px] tracking-[0.16em] uppercase backdrop-blur">
          {ticket.eventSnapshot.slug.split('-')[0]}
        </Badge>
        <span className={`absolute top-2.5 right-2.5 font-mono text-[11px] font-bold uppercase ${state.cls}`}>
          {state.label}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
          <span>{ticket.ticketRef}</span>
          <span className="text-gold-dim">v{ticket.qrVersion}</span>
        </div>
        <p className="mt-1 font-heading font-semibold">{ticket.eventSnapshot.title}</p>
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          {formatDateTime(ticket.eventSnapshot.startAt)} · Seat {ticket.seatLabel ?? 'GA'} · {ticket.tierName} ·{' '}
          {formatPrice(ticket.price, ticket.currency)}
        </p>

        <button onClick={onToggle} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm transition hover:border-primary/40">
          <Ticket className="size-4" /> {open ? 'Hide QR' : 'Show QR'}
          <ChevronDown className={`size-4 transition ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="mt-3 flex flex-col items-center gap-3 rounded-md border border-border/70 bg-background p-4">
            {qrLoading ? (
              <Loader2 className="size-6 animate-spin text-primary" />
            ) : qr ? (
              <>
                <div className="rounded-md bg-white p-3">
                  <QRCode value={qr.qrRaw} size={160} />
                </div>
                <p className="max-w-full truncate font-mono text-[10px] text-muted-foreground">{qr.qrRaw}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">QR unavailable</p>
            )}
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={handlePdf} disabled={pdfBusy}>
            {pdfBusy ? <Spinner data-icon="inline-start" className="size-3.5" /> : <Download data-icon="inline-start" />} PDF
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => rotate(ticket.ticketRef)} disabled={rotating}>
            {rotating ? <Spinner data-icon="inline-start" className="size-3.5" /> : <RefreshCw data-icon="inline-start" />} Refresh
          </Button>
        </div>
      </div>
    </div>
  )
}
