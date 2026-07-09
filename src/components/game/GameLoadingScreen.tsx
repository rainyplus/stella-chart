import { useState, useEffect, useMemo } from 'react'
import { X, Play, Music, Mic2, Hash, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GameLoadingScreenProps {
  songName: string
  artist: string
  charter: string
  difficulty: number
  bpm: number
  coverUrl?: string
  audioUrl?: string
  noteCount: number
  onStart: () => void
  onClose: () => void
}

function getDifficultyColor(difficulty: number): string {
  if (difficulty >= 15) return 'text-red-400'
  if (difficulty >= 12) return 'text-orange-400'
  if (difficulty >= 9) return 'text-endfield-gold'
  if (difficulty >= 6) return 'text-emerald-400'
  return 'text-endfield-accent-cyan'
}

function getDifficultyBgColor(difficulty: number): string {
  if (difficulty >= 15) return 'bg-red-500/10 border-red-500/40'
  if (difficulty >= 12) return 'bg-orange-500/10 border-orange-500/40'
  if (difficulty >= 9) return 'bg-endfield-gold/10 border-endfield-gold/40'
  if (difficulty >= 6) return 'bg-emerald-500/10 border-emerald-500/40'
  return 'bg-endfield-accent-cyan/10 border-endfield-accent-cyan/40'
}

function getDifficultyLabel(difficulty: number): string {
  if (difficulty >= 15) return 'MAJESTIC'
  if (difficulty >= 12) return 'CHAOS'
  if (difficulty >= 9) return 'HARD'
  if (difficulty >= 6) return 'NORMAL'
  return 'EASY'
}

export default function GameLoadingScreen({
  songName,
  artist,
  charter,
  difficulty,
  bpm,
  coverUrl,
  audioUrl,
  noteCount,
  onStart,
  onClose,
}: GameLoadingScreenProps) {
  const [progress, setProgress] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [audioLoaded, setAudioLoaded] = useState(!audioUrl)

  const difficultyColor = useMemo(() => getDifficultyColor(difficulty), [difficulty])
  const difficultyBgColor = useMemo(() => getDifficultyBgColor(difficulty), [difficulty])
  const difficultyLabel = useMemo(() => getDifficultyLabel(difficulty), [difficulty])

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (audioUrl) {
      const audio = new Audio()
      audio.src = audioUrl

      const handleCanPlayThrough = () => {
        setAudioLoaded(true)
      }

      const handleError = () => {
        setAudioLoaded(true)
      }

      audio.addEventListener('canplaythrough', handleCanPlayThrough)
      audio.addEventListener('error', handleError)
      audio.load()

      return () => {
        audio.removeEventListener('canplaythrough', handleCanPlayThrough)
        audio.removeEventListener('error', handleError)
      }
    }
  }, [audioUrl])

  useEffect(() => {
    const duration = audioUrl ? 3000 : 2000
    const startTime = Date.now()
    let animationId: number

    const animate = () => {
      const elapsed = Date.now() - startTime
      const rawProgress = Math.min((elapsed / duration) * 100, 100)
      
      if (audioLoaded && rawProgress >= 100) {
        setProgress(100)
        setIsReady(true)
      } else if (!audioLoaded && rawProgress >= 90) {
        setProgress(90)
      } else {
        setProgress(rawProgress)
        animationId = requestAnimationFrame(animate)
      }
    }

    animationId = requestAnimationFrame(animate)

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [audioUrl, audioLoaded])

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-endfield-bg-primary transition-opacity duration-500 overflow-hidden',
        isVisible ? 'opacity-100' : 'opacity-0'
      )}
    >
      <div className="endfield-glow-bg" />
      <div className="endfield-grid-bg" />

      <div className="absolute top-20 left-20 w-32 h-px bg-gradient-to-r from-endfield-accent-cyan/40 to-transparent deco-box-breathe" style={{ animationDelay: '0s' }} />
      <div className="absolute top-20 left-20 w-px h-32 bg-gradient-to-b from-endfield-accent-cyan/40 to-transparent deco-box-breathe" style={{ animationDelay: '0.5s' }} />
      <div className="absolute bottom-20 right-20 w-32 h-px bg-gradient-to-l from-endfield-gold/40 to-transparent deco-box-breathe" style={{ animationDelay: '1.5s' }} />
      <div className="absolute bottom-20 right-20 w-px h-32 bg-gradient-to-t from-endfield-gold/40 to-transparent deco-box-breathe" style={{ animationDelay: '2s' }} />

      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-10 p-2 text-endfield-text-muted hover:text-endfield-text-primary transition-colors duration-200"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-8">
        <div className="flex flex-col lg:flex-row gap-12 items-center">
          <div className="relative flex-shrink-0">
            <div className="absolute -inset-1 bg-gradient-to-br from-endfield-gold/30 via-transparent to-endfield-accent-cyan/30" />
            <div className="relative w-72 h-72 lg:w-80 lg:h-80 bg-endfield-bg-secondary border border-endfield-border overflow-hidden">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={songName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-endfield-bg-card">
                  <Music className="w-20 h-20 text-endfield-text-muted/30" />
                </div>
              )}
              
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-endfield-gold via-endfield-gold/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-l from-endfield-accent-cyan via-endfield-accent-cyan/50 to-transparent" />
              
              <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-endfield-gold" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-endfield-gold/50" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-endfield-accent-cyan/50" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-endfield-accent-cyan" />
            </div>
          </div>

          <div className="flex-1 w-full">
            <div className="mb-8">
              <h1 className="text-4xl lg:text-5xl font-light text-endfield-text-primary mb-3 tracking-wider">
                {songName}
              </h1>
              <div className="h-px w-24 bg-gradient-to-r from-endfield-accent-cyan to-transparent mb-4" />
              
              <div className="space-y-2 text-endfield-text-secondary">
                <div className="flex items-center gap-3">
                  <Mic2 className="w-4 h-4 text-endfield-gold/70" />
                  <span className="text-sm uppercase tracking-wider">ARTIST</span>
                  <span className="text-endfield-text-primary font-medium">{artist}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Hash className="w-4 h-4 text-endfield-accent-cyan/70" />
                  <span className="text-sm uppercase tracking-wider">CHARTER</span>
                  <span className="text-endfield-text-primary font-medium">{charter}</span>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-end gap-4 mb-4">
                <div className={cn(
                  'px-3 py-1 border text-xs font-medium tracking-[0.2em]',
                  difficultyBgColor,
                  difficultyColor
                )}>
                  {difficultyLabel}
                </div>
                <div className={cn('text-6xl font-light font-mono', difficultyColor)}>
                  {difficulty.toFixed(1)}
                </div>
              </div>
              
              <div className="flex gap-6 text-sm text-endfield-text-muted">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>BPM: <span className="text-endfield-text-primary font-mono">{bpm}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  <span>NOTES: <span className="text-endfield-text-primary font-mono">{noteCount}</span></span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="h-0.5 bg-endfield-border/30 relative overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-100 ease-out',
                    isReady 
                      ? 'bg-gradient-to-r from-endfield-gold to-endfield-gold-light' 
                      : 'bg-gradient-to-r from-endfield-accent-cyan to-endfield-accent-cyan-light'
                  )}
                  style={{ width: `${progress}%` }}
                />
                <div 
                  className="absolute top-0 h-full w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  style={{ 
                    left: `${Math.max(0, progress - 10)}%`,
                    opacity: isReady ? 0 : 1,
                    transition: 'opacity 0.3s'
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className={cn(
                  'text-sm font-medium tracking-wider transition-colors duration-300',
                  isReady ? 'text-endfield-gold' : 'text-endfield-text-secondary'
                )}>
                  {isReady ? 'READY' : 'LOADING...'}
                </span>
                <span className="text-sm text-endfield-text-muted font-mono">
                  {Math.floor(progress)}%
                </span>
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={onStart}
                disabled={!isReady}
                className={cn(
                  'relative group w-full py-4 text-lg font-medium tracking-[0.3em] transition-all duration-300 overflow-hidden uppercase',
                  isReady 
                    ? 'text-endfield-bg-primary bg-endfield-accent-cyan hover:bg-endfield-accent-cyan-light shadow-endfield-glow' 
                    : 'text-endfield-text-muted bg-endfield-bg-card border border-endfield-border cursor-not-allowed'
                )}
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  <Play className="w-5 h-5" />
                  START
                </span>
                {isReady && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                )}
                
                {isReady && (
                  <>
                    <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-endfield-bg-primary" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-endfield-bg-primary" />
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-endfield-bg-primary" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-endfield-bg-primary" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-endfield-border to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-endfield-border to-transparent" />
    </div>
  )
}
