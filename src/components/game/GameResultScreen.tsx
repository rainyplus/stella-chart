import { useState, useEffect, useRef } from 'react'
import { RefreshCw, ArrowLeft, Star, Music, User, Pencil } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import type { Rank, Judgment } from '../../../shared/types.js'

interface GameResultScreenProps {
  songName: string
  artist: string
  charter: string
  difficulty: number
  rank: Rank
  accuracy: number
  rating: number
  score: number
  maxCombo: number
  judgmentCounts: Record<Judgment, number>
  characterImageUrl?: string
  onRetry: () => void
  onBack: () => void
}

function useCountUp(target: number, duration = 1500, delay = 0) {
  const [value, setValue] = useState(0)
  const startTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    setValue(0)
    startTimeRef.current = null

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp + delay
      }

      const elapsed = timestamp - startTimeRef.current

      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(animate)
        return
      }

      if (elapsed >= duration) {
        setValue(target)
        return
      }

      const progress = elapsed / duration
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setValue(Math.floor(easeOut * target))

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [target, duration, delay])

  return value
}

function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resize()
    window.addEventListener('resize', resize)

    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = []
    const particleCount = 60

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2,
      })
    }

    let animationId: number

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const gridSize = 50
      ctx.strokeStyle = 'rgba(79, 195, 247, 0.06)'
      ctx.lineWidth = 1

      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }

      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(79, 195, 247, ${p.alpha})`
        ctx.fill()
      })

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
}

function CharacterDisplay({ imageUrl }: { imageUrl?: string }) {
  if (imageUrl) {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <img
          src={imageUrl}
          alt="STELLA"
          className="max-h-full max-w-full object-contain drop-shadow-2xl"
        />
      </div>
    )
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="absolute w-72 h-72 rounded-full bg-gradient-to-br from-cyan-400/20 via-blue-500/20 to-indigo-500/20 blur-3xl" />

      <div className="relative w-64 h-80 flex flex-col items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-48 h-48 rounded-full bg-gradient-to-br from-cyan-300/30 to-blue-400/30 border border-endfield-accent-cyan/40" />
        </div>

        <div className="relative z-10 w-40 h-40 rounded-full bg-gradient-to-br from-cyan-400/40 via-blue-400/30 to-indigo-400/40 border border-endfield-accent-cyan/60 flex items-center justify-center shadow-endfield-glow">
          <Star className="w-20 h-20 text-endfield-gold/80" strokeWidth={1} />
        </div>

        <div className="absolute top-8 -left-2 w-16 h-16 border border-endfield-accent-cyan/40 rotate-45" />
        <div className="absolute top-8 -right-2 w-16 h-16 border border-endfield-accent-cyan/40 rotate-45" />
        <div className="absolute bottom-20 -left-6 w-8 h-8 bg-endfield-gold/30 rotate-12" />
        <div className="absolute bottom-24 -right-4 w-10 h-10 border border-endfield-gold/50 -rotate-12" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 flex justify-center">
        <div className="px-8 py-3 bg-gradient-to-r from-transparent via-endfield-bg-panel/90 to-transparent border-t border-endfield-accent-cyan/30">
          <span className="text-2xl font-light tracking-[0.3em] text-endfield-accent-cyan">STELLA</span>
        </div>
      </div>
    </div>
  )
}

function RankDisplay({ rank }: { rank: Rank }) {
  const [glow, setGlow] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setGlow(true), 800)
    return () => clearTimeout(timer)
  }, [])

  const rankStyles: Record<Rank, { text: string; glow: string }> = {
    'SSS+': {
      text: 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-yellow-300 to-amber-500',
      glow: 'drop-shadow-[0_0_30px_rgba(230,200,122,0.8)]',
    },
    SSS: {
      text: 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-yellow-300 to-amber-400',
      glow: 'drop-shadow-[0_0_25px_rgba(230,200,122,0.7)]',
    },
    SS: {
      text: 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-amber-400',
      glow: 'drop-shadow-[0_0_20px_rgba(230,200,122,0.6)]',
    },
    S: {
      text: 'text-transparent bg-clip-text bg-gradient-to-b from-orange-200 to-orange-400',
      glow: 'drop-shadow-[0_0_20px_rgba(251,146,60,0.6)]',
    },
    A: {
      text: 'text-transparent bg-clip-text bg-gradient-to-b from-emerald-200 to-emerald-400',
      glow: 'drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]',
    },
    B: {
      text: 'text-transparent bg-clip-text bg-gradient-to-b from-cyan-200 to-cyan-400',
      glow: 'drop-shadow-[0_0_15px_rgba(79,195,247,0.5)]',
    },
    C: {
      text: 'text-transparent bg-clip-text bg-gradient-to-b from-purple-200 to-purple-400',
      glow: 'drop-shadow-[0_0_15px_rgba(167,139,250,0.5)]',
    },
    D: {
      text: 'text-transparent bg-clip-text bg-gradient-to-b from-zinc-200 to-zinc-400',
      glow: 'drop-shadow-[0_0_10px_rgba(161,161,170,0.4)]',
    },
    Failed: {
      text: 'text-transparent bg-clip-text bg-gradient-to-b from-red-300 to-red-500',
      glow: 'drop-shadow-[0_0_20px_rgba(239,83,80,0.6)]',
    },
  }

  const style = rankStyles[rank] || rankStyles['D']

  return (
    <div
      className={cn(
        'transition-all duration-1000 ease-out',
        glow ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
      )}
    >
      <span
        className={cn(
          'text-8xl font-light tracking-wider',
          style.text,
          glow && style.glow
        )}
      >
        {rank}
      </span>
    </div>
  )
}

export default function GameResultScreen({
  songName,
  artist,
  charter,
  difficulty,
  rank,
  accuracy,
  rating,
  score,
  maxCombo,
  judgmentCounts,
  characterImageUrl,
  onRetry,
  onBack,
}: GameResultScreenProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const animatedScore = useCountUp(score, 2000, 300)
  const animatedAccuracy = useCountUp(Math.floor(accuracy * 100), 1800, 500)
  const animatedRating = useCountUp(Math.floor(rating * 100), 1800, 700)
  const animatedMaxCombo = useCountUp(maxCombo, 1800, 600)

  const judgmentLabels: { key: Judgment; label: string; color: string }[] = [
    { key: 'Perfect+', label: 'Perfect+', color: 'text-endfield-gold-light' },
    { key: 'Perfect', label: 'Perfect', color: 'text-endfield-gold' },
    { key: 'Great', label: 'Great', color: 'text-emerald-400' },
    { key: 'Good', label: 'Good', color: 'text-endfield-accent-cyan' },
    { key: 'Miss', label: 'Miss', color: 'text-red-400' },
  ]

  const animatedJudgments = {
    'Perfect+': useCountUp(judgmentCounts['Perfect+'], 1500, 900),
    'Perfect': useCountUp(judgmentCounts['Perfect'], 1500, 1000),
    'Great': useCountUp(judgmentCounts['Great'], 1500, 1100),
    'Good': useCountUp(judgmentCounts['Good'], 1500, 1200),
    'Miss': useCountUp(judgmentCounts['Miss'], 1500, 1300),
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-endfield-bg-primary overflow-hidden">
      <ParticleBackground />
      <div className="endfield-glow-bg" />

      <div
        className={cn(
          'relative z-10 w-full max-w-7xl h-[90vh] mx-8 transition-all duration-700 ease-out',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        )}
      >
        <div className="absolute -top-px left-0 w-32 h-px bg-gradient-to-r from-transparent to-endfield-accent-cyan" />
        <div className="absolute -top-px right-0 w-32 h-px bg-gradient-to-l from-transparent to-endfield-accent-cyan" />
        <div className="absolute -bottom-px left-0 w-32 h-px bg-gradient-to-r from-transparent to-endfield-gold" />
        <div className="absolute -bottom-px right-0 w-32 h-px bg-gradient-to-l from-transparent to-endfield-gold" />

        <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-endfield-accent-cyan" />
        <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-endfield-accent-cyan" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-endfield-gold" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-endfield-gold" />

        <div className="h-full flex">
          <div className="w-1/2 h-full relative flex items-center justify-center border-r border-endfield-accent-cyan/20">
            <div className="absolute inset-0 bg-gradient-to-r from-endfield-bg-secondary/50 to-transparent" />
            <CharacterDisplay imageUrl={characterImageUrl} />
          </div>

          <div className="w-1/2 h-full flex flex-col p-10">
            <div
              className={cn(
                'mb-6 transition-all duration-700 delay-200',
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              )}
            >
              <h2 className="text-3xl font-light text-endfield-text-primary mb-2 tracking-wider">
                {songName}
              </h2>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-endfield-text-secondary">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-endfield-accent-cyan" />
                  <span>{artist}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-endfield-accent-cyan" />
                  <span>{charter}</span>
                </div>
              </div>
            </div>

            <div
              className={cn(
                'mb-4 transition-all duration-700 delay-300',
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              )}
            >
              <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-endfield-accent-cyan/10 border border-endfield-accent-cyan/30">
                <Music className="w-4 h-4 text-endfield-accent-cyan" />
                <span className="text-sm text-endfield-text-secondary uppercase tracking-wider">DIFFICULTY</span>
                <span className="text-xl font-light font-mono text-endfield-accent-cyan">
                  {difficulty.toFixed(1)}
                </span>
              </div>
            </div>

            <div
              className={cn(
                'flex justify-center mb-6 transition-all duration-700 delay-400',
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              )}
            >
              <RankDisplay rank={rank} />
            </div>

            <div
              className={cn(
                'grid grid-cols-4 gap-3 mb-6 transition-all duration-700 delay-500',
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              )}
            >
              <div className="bg-endfield-bg-panel/80 border border-endfield-border p-3 text-center">
                <div className="text-xs text-endfield-text-muted mb-1 uppercase tracking-wider">SCORE</div>
                <div className="text-2xl font-light font-mono text-endfield-text-primary">
                  {formatNumber(animatedScore)}
                </div>
              </div>
              <div className="bg-endfield-bg-panel/80 border border-endfield-border p-3 text-center">
                <div className="text-xs text-endfield-text-muted mb-1 uppercase tracking-wider">ACCURACY</div>
                <div className="text-2xl font-light font-mono text-endfield-text-primary">
                  {(animatedAccuracy / 100).toFixed(2)}%
                </div>
              </div>
              <div className="bg-endfield-bg-panel/80 border border-endfield-border p-3 text-center">
                <div className="text-xs text-endfield-text-muted mb-1 uppercase tracking-wider">MAX COMBO</div>
                <div className="text-2xl font-light font-mono text-cyan-400">
                  {formatNumber(animatedMaxCombo)}
                </div>
              </div>
              <div className="bg-endfield-bg-panel/80 border border-endfield-border p-3 text-center">
                <div className="text-xs text-endfield-text-muted mb-1 uppercase tracking-wider">RATING</div>
                <div className="text-2xl font-light font-mono text-endfield-gold">
                  {(animatedRating / 100).toFixed(2)}
                </div>
              </div>
            </div>

            <div
              className={cn(
                'flex-1 bg-endfield-bg-panel/60 border border-endfield-border p-5 transition-all duration-700 delay-600',
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              )}
            >
              <div className="text-sm text-endfield-text-muted mb-4 uppercase tracking-wider">JUDGMENT</div>
              <div className="space-y-3">
                {judgmentLabels.map(({ key, label, color }) => (
                  <div key={key} className="flex items-center justify-between border-b border-endfield-border/30 pb-2 last:border-0 last:pb-0">
                    <span className={cn('text-sm font-medium', color)}>{label}</span>
                    <span className="font-mono text-lg text-endfield-text-primary">
                      {formatNumber(animatedJudgments[key])}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className={cn(
                'mt-6 flex gap-4 transition-all duration-700 delay-700',
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              )}
            >
              <button
                onClick={onRetry}
                className="flex-1 group relative overflow-hidden px-6 py-3 bg-endfield-accent-cyan hover:bg-endfield-accent-cyan-light text-endfield-bg-primary font-medium text-base transition-all duration-300 shadow-endfield-glow"
              >
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-endfield-bg-primary/50" />
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-endfield-bg-primary/50" />
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-endfield-bg-primary/50" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-endfield-bg-primary/50" />
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 transition-transform group-hover:rotate-180 duration-500" />
                  再来一次
                </span>
              </button>
              <button
                onClick={onBack}
                className="flex-1 group relative overflow-hidden px-6 py-3 bg-endfield-bg-panel hover:bg-endfield-bg-card border border-endfield-border hover:border-endfield-accent-cyan/50 text-endfield-text-primary font-medium text-base transition-all duration-300"
              >
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-endfield-accent-cyan/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-endfield-accent-cyan/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-endfield-accent-cyan/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-endfield-accent-cyan/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="flex items-center justify-center gap-2">
                  <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1 duration-300" />
                  返回
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
