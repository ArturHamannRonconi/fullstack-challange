import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'
import { useGameStore } from './store'

const MULTIPLIER_RATE = 0.00006

/**
 * Canvas-rendered curve of the live multiplier. Reads state from the Zustand
 * store on rAF ticks (no React re-renders). Visual curve is computed
 * continuously as `e^(0.00006 * elapsedMs)` so the growth actually feels
 * exponential on screen — the *authoritative* multiplier still comes from the
 * server via WS ticks and is rendered as the big number overlay.
 */
export function CrashChart({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const frozenElapsedRef = useRef<number | null>(null)
  const phase = useGameStore((s) => s.phase)
  const multiplier = useGameStore((s) => s.multiplier)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const draw = () => {
      const state = useGameStore.getState()
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height

      ctx.clearRect(0, 0, w, h)
      drawGrid(ctx, w, h)

      if (state.phase === 'running') {
        frozenElapsedRef.current = null
        const elapsed = state.gameStartTime != null ? performance.now() - state.gameStartTime : 0
        drawCurve(ctx, w, h, elapsed, state.multiplier, 'running')
      } else if (state.phase === 'crashed') {
        if (frozenElapsedRef.current === null) {
          frozenElapsedRef.current =
            state.gameStartTime != null
              ? performance.now() - state.gameStartTime
              : state.multiplier > 1
                ? Math.log(state.multiplier) / MULTIPLIER_RATE
                : 0
        }
        drawCurve(ctx, w, h, frozenElapsedRef.current, state.multiplier, 'crashed')
      } else {
        frozenElapsedRef.current = null
        drawIdle(ctx, w, h, state.phase)
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [])

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-background via-background to-background/80 p-4',
        className,
      )}
    >
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div
          className={cn(
            'text-6xl md:text-7xl font-heading font-bold tabular-nums drop-shadow-[0_0_20px_rgba(99,102,241,0.35)]',
            phase === 'crashed' ? 'text-rose-400' : phase === 'running' ? 'text-emerald-300' : 'text-primary',
          )}
          aria-live="polite"
        >
          {multiplier.toFixed(2)}x
        </div>
        <div className="mt-1 text-center text-xs uppercase tracking-widest text-muted-foreground">
          {labelForPhase(phase)}
        </div>
      </div>
      <canvas ref={canvasRef} className="h-[320px] w-full" />
    </div>
  )
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)'
  ctx.lineWidth = 1
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
  }
  for (let y = 0; y < h; y += 40) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
}

/**
 * Renders the curve as a continuous exponential y(t) = e^(rate * t) sampled
 * densely enough to look smooth. Y axis is linear, so large multipliers push
 * the tip towards the top of the canvas — the curve visibly bends upward
 * instead of flattening like on a log scale.
 */
function drawCurve(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  elapsedMs: number,
  currentMultiplier: number,
  state: 'running' | 'crashed',
) {
  const padding = 16
  const innerW = w - 2 * padding
  const innerH = h - 2 * padding

  const tipMultiplier = Math.max(1, currentMultiplier)
  // Extra headroom so the tip sits ~75% up and the bend has room to breathe.
  const maxM = Math.max(2, tipMultiplier * 1.3)
  const totalMs = Math.max(1, elapsedMs)

  const toX = (t: number) => padding + innerW * (t / totalMs)
  const toY = (m: number) => padding + innerH * (1 - (m - 1) / (maxM - 1))

  const steps = 160
  const points: Array<{ x: number; y: number }> = []
  for (let i = 0; i <= steps; i += 1) {
    const t = (elapsedMs * i) / steps
    const m = Math.exp(MULTIPLIER_RATE * t)
    points.push({ x: toX(t), y: toY(Math.min(m, tipMultiplier)) })
  }

  const accent =
    state === 'crashed'
      ? { r: 251, g: 113, b: 133 } // rose-400
      : { r: 52, g: 211, b: 153 } // emerald-400 — matches the multiplier text overlay
  const rgba = (a: number) => `rgba(${accent.r}, ${accent.g}, ${accent.b}, ${a})`

  // Filled area under the curve — three-stop gradient for deeper saturation near the top.
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, rgba(0.55))
  grad.addColorStop(0.5, rgba(0.22))
  grad.addColorStop(1, rgba(0))
  ctx.beginPath()
  ctx.moveTo(toX(0), h - padding)
  for (const p of points) ctx.lineTo(p.x, p.y)
  ctx.lineTo(points[points.length - 1].x, h - padding)
  ctx.closePath()
  ctx.fillStyle = grad
  ctx.fill()

  // Same smoothed path is rendered twice: a wide translucent halo for depth,
  // then the crisp neon stroke on top.
  const strokePath = () => {
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length - 1; i += 1) {
      const cpX = (points[i].x + points[i + 1].x) / 2
      const cpY = (points[i].y + points[i + 1].y) / 2
      ctx.quadraticCurveTo(points[i].x, points[i].y, cpX, cpY)
    }
    const last = points[points.length - 1]
    ctx.lineTo(last.x, last.y)
    ctx.stroke()
  }

  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  // Halo.
  ctx.strokeStyle = rgba(0.3)
  ctx.lineWidth = 10
  ctx.shadowBlur = 0
  strokePath()

  // Main neon stroke.
  ctx.strokeStyle = rgba(1)
  ctx.lineWidth = 4
  ctx.shadowColor = rgba(0.85)
  ctx.shadowBlur = state === 'running' ? 26 : 22
  strokePath()
  ctx.shadowBlur = 0

  // Tip dot — with an outer pulse ring while the round is live.
  const tail = points[points.length - 1]
  if (state === 'running') {
    ctx.beginPath()
    ctx.arc(tail.x, tail.y, 14, 0, Math.PI * 2)
    ctx.fillStyle = rgba(0.18)
    ctx.fill()
  }
  ctx.beginPath()
  ctx.arc(tail.x, tail.y, 7, 0, Math.PI * 2)
  ctx.fillStyle = rgba(1)
  ctx.shadowColor = rgba(0.9)
  ctx.shadowBlur = 18
  ctx.fill()
  ctx.shadowBlur = 0
}

function drawIdle(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  phase: 'idle' | 'preparing' | 'betting_open' | 'betting_closed' | 'running' | 'crashed',
) {
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)'
  ctx.lineWidth = 2
  ctx.setLineDash([6, 6])
  ctx.beginPath()
  ctx.moveTo(16, h - 16)
  ctx.lineTo(w - 16, h - 16)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = 'rgba(148, 163, 184, 0.6)'
  ctx.font = '12px sans-serif'
  ctx.fillText(`phase: ${phase}`, 16, 20)
}

function labelForPhase(phase: string): string {
  switch (phase) {
    case 'running':
      return 'Em jogo'
    case 'crashed':
      return 'Crash!'
    case 'betting_open':
      return 'Apostas abertas'
    case 'betting_closed':
      return 'Apostas fechadas'
    case 'preparing':
      return 'Preparando...'
    default:
      return 'Aguardando'
  }
}
