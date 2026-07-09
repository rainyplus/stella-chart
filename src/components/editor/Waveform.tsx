import { useEffect, useRef, useCallback } from 'react'

interface WaveformProps {
  peaks: number[]
  currentTime: number
  duration: number
  isLoading: boolean
  error: string | null
  onSeek: (time: number) => void
}

export default function Waveform({ peaks, currentTime, duration, isLoading, error, onSeek }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const peaksRef = useRef<number[]>([])
  const currentTimeRef = useRef(currentTime)
  const durationRef = useRef(duration)
  const animationRef = useRef<number>(0)

  peaksRef.current = peaks
  currentTimeRef.current = currentTime
  durationRef.current = duration

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()
    const width = Math.max(1, rect.width)
    const height = Math.max(1, rect.height)

    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, width, height)

    const currentPeaks = peaksRef.current
    if (currentPeaks.length === 0) return

    const barWidth = 2
    const gap = 1
    const totalBars = Math.max(1, Math.floor(width / (barWidth + gap)))
    const samplesPerBar = Math.max(1, Math.floor(currentPeaks.length / totalBars))

    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, 'rgba(79, 195, 247, 0.9)')
    gradient.addColorStop(0.5, 'rgba(79, 195, 247, 0.6)')
    gradient.addColorStop(1, 'rgba(79, 195, 247, 0.9)')
    ctx.fillStyle = gradient

    for (let i = 0; i < totalBars; i++) {
      const start = i * samplesPerBar
      const end = Math.min(start + samplesPerBar, currentPeaks.length)
      let max = 0
      for (let j = start; j < end; j++) {
        if (Math.abs(currentPeaks[j]) > max) {
          max = Math.abs(currentPeaks[j])
        }
      }
      const barHeight = Math.max(1, max * height * 0.85)
      const x = i * (barWidth + gap)
      const y = (height - barHeight) / 2
      ctx.fillRect(x, y, barWidth, barHeight)
    }

    const totalDur = durationRef.current
    if (totalDur > 0) {
      const progress = Math.min(1, Math.max(0, currentTimeRef.current / totalDur))
      const playheadX = width * progress

      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, playheadX, height)
      ctx.clip()

      const playedGradient = ctx.createLinearGradient(0, 0, 0, height)
      playedGradient.addColorStop(0, 'rgba(230, 200, 122, 0.95)')
      playedGradient.addColorStop(0.5, 'rgba(230, 200, 122, 0.7)')
      playedGradient.addColorStop(1, 'rgba(230, 200, 122, 0.95)')
      ctx.fillStyle = playedGradient

      for (let i = 0; i < totalBars; i++) {
        const start = i * samplesPerBar
        const end = Math.min(start + samplesPerBar, currentPeaks.length)
        let max = 0
        for (let j = start; j < end; j++) {
          if (Math.abs(currentPeaks[j]) > max) {
            max = Math.abs(currentPeaks[j])
          }
        }
        const barHeight = Math.max(1, max * height * 0.85)
        const x = i * (barWidth + gap)
        const y = (height - barHeight) / 2
        ctx.fillRect(x, y, barWidth, barHeight)
      }
      ctx.restore()

      ctx.fillStyle = 'rgba(230, 200, 122, 1)'
      ctx.fillRect(playheadX - 1, 0, 2, height)

      ctx.fillStyle = 'rgba(230, 200, 122, 0.15)'
      ctx.fillRect(0, 0, playheadX, height)
    }
  }, [])

  const animate = useCallback(() => {
    drawWaveform()
    animationRef.current = requestAnimationFrame(animate)
  }, [drawWaveform])

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationRef.current)
  }, [animate])

  useEffect(() => {
    const handleResize = () => drawWaveform()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [drawWaveform])

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(() => {
      drawWaveform()
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [drawWaveform])

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = x / rect.width
    const totalDur = duration
    if (totalDur > 0) {
      onSeek(Math.max(0, Math.min(totalDur, ratio * totalDur)))
    }
  }

  if (peaks.length === 0 && !isLoading && !error) {
    return (
      <div className="h-24 border-t border-zinc-800 bg-zinc-900/30 flex items-center justify-center text-xs text-zinc-500">
        未导入音频
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-24 border-t border-zinc-800 bg-zinc-900/30 relative cursor-pointer select-none"
      onClick={handleClick}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400 pointer-events-none bg-zinc-900/50">
          加载波形...
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-red-400 pointer-events-none bg-zinc-900/50">
          {error}
        </div>
      )}
    </div>
  )
}
