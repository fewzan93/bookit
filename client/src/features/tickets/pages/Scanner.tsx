import { CheckCircle2, QrCode, ScanLine, XCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

import { SiteHeader } from '@/components/layout/SiteHeader'
import { cn } from '@/lib/utils'
import { useScanTicketMutation, type ScanResultDTO } from '@/features/tickets/api'

const READER_ID = 'bookit-scanner'

interface ScanRecord {
  id: number
  ticketRef: string | null
  status: string
  message: string
}

export default function ScannerPage() {
  const [scan, { isLoading: scanning }] = useScanTicketMutation()
  const [result, setResult] = useState<ScanResultDTO | null>(null)
  const [records, setRecords] = useState<ScanRecord[]>([])
  const [manual, setManual] = useState('')
  const [camState, setCamState] = useState<'idle' | 'starting' | 'on' | 'error'>('idle')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const runningRef = useRef(false)
  const busyRef = useRef(false)

  const handleDecoded = useCallback(
    async (raw: string) => {
      if (busyRef.current || raw.length < 10) return
      busyRef.current = true
      try {
        const r = await scan({ payload: raw }).unwrap()
        setResult(r)
        setRecords((prev) =>
          [{ id: Date.now(), ticketRef: r.ticket?.ticketRef ?? null, status: r.status, message: r.message }, ...prev].slice(0, 8),
        )
      } catch {
        setResult({ status: 'invalid', message: 'Scan failed — try again.' })
      } finally {
        busyRef.current = false
      }
    },
    [scan],
  )

  async function stopCamera() {
    const scanner = scannerRef.current
    scannerRef.current = null
    const wasRunning = runningRef.current
    runningRef.current = false
    if (scanner && wasRunning) {
      try {
        await scanner.stop()
      } catch {
        void 0
      }
      try {
        scanner.clear()
      } catch {
        void 0
      }
    }
    setCamState('idle')
  }

  async function startCamera() {
    setCamState('starting')
    try {
      await stopCamera()
    } catch {
      void 0
    }
    const scanner = new Html5Qrcode(READER_ID)
    scannerRef.current = scanner
    try {
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (w, h) => {
            const size = Math.max(Math.min(w, h, 260), 50)
            return { width: size, height: size }
          },
        },
        (text) => void handleDecoded(text),
        () => undefined,
      )
      runningRef.current = true
      setCamState('on')
    } catch {
      runningRef.current = false
      scannerRef.current = null
      setCamState('error')
    }
  }

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current
      const wasRunning = runningRef.current
      runningRef.current = false
      if (scanner && wasRunning) {
        void scanner.stop().catch(() => undefined)
      }
    }
  }, [])

  async function handleManual(e: FormEvent) {
    e.preventDefault()
    if (!manual.trim()) return
    await handleDecoded(manual.trim())
    setManual('')
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="font-heading text-2xl font-bold">Check-in scanner</h1>
        <p className="mt-1 text-sm text-muted-foreground">Scan the attendee&apos;s QR at the door — first scan approves, repeated scans warn.</p>

        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
              <ScanLine className="size-4" /> Camera
            </span>
            {camState === 'on' && (
              <Button variant="outline" size="sm" onClick={() => void stopCamera()}>
                Stop camera
              </Button>
            )}
          </div>

          <div className="relative">
            <div id={READER_ID} className="min-h-[260px]" />
            {camState === 'starting' && (
              <div className="absolute inset-0 flex items-center justify-center bg-card">
                <Spinner className="size-6 text-primary" />
              </div>
            )}
            {camState === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card px-6 text-center">
                <p className="text-sm text-destructive">Camera is unavailable here — use manual entry below.</p>
                <Button variant="outline" onClick={() => void startCamera()}>
                  Try again
                </Button>
              </div>
            )}
            {camState === 'idle' && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card">
                <QrCode className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Camera off — start it to begin scanning.</p>
                <Button className="pointer-events-auto" onClick={() => void startCamera()}>
                  <ScanLine data-icon="inline-start" /> Start camera
                </Button>
              </div>
            )}
          </div>

          {result && (
            <div
              className={cn(
                'flex items-center gap-3 border-t px-4 py-3',
                result.status === 'valid' ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-red-400/30 bg-red-500/10',
              )}
              role="status"
            >
              {result.status === 'valid' ? (
                <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
              ) : (
                <XCircle className="size-5 shrink-0 text-red-400" />
              )}
              <div className="min-w-0">
                <p className={cn('text-sm font-medium', result.status === 'valid' ? 'text-emerald-300' : 'text-red-300')}>
                  {result.message}
                </p>
                {result.ticket && (
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {result.ticket.ticketRef} · Seat {result.ticket.seatLabel ?? 'GA'} · {result.ticket.eventSnapshot.title}
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleManual} className="flex gap-2 border-t px-4 py-3">
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Or paste a QR payload manually"
              className="h-8 bg-muted/50 font-mono text-xs"
              disabled={scanning}
            />
            <Button type="submit" size="sm" variant="outline" disabled={scanning || !manual.trim()}>
              {scanning ? <Spinner className="size-3.5" data-icon="inline-start" /> : null} Check
            </Button>
          </form>
        </div>

        <h2 className="mt-8 font-heading text-lg font-bold">Recent scans</h2>
        {records.length === 0 ? (
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <QrCode />
              </EmptyMedia>
              <EmptyTitle>Nothing scanned yet</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <EmptyDescription>Approved and rejected tickets will appear here while the camera runs.</EmptyDescription>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="mt-3 space-y-2">
            {records.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-md border border-border bg-card px-3.5 py-2.5 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-mono text-xs">{r.ticketRef ?? '—'}</span>
                  <span className="ml-2 text-muted-foreground">{r.message}</span>
                </span>
                <span className={cn('ml-3 shrink-0 font-mono text-[10px] uppercase', r.status === 'valid' ? 'text-emerald-400' : 'text-red-400')}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
