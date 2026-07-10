import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { NOTE_DISPLAY_NAMES } from '@/constants/noteTypes'
import type { NoteType, BackgroundLayer, NoteData } from '../../../shared/types.js'
import { Type, Image, ChevronUp, ChevronDown, Magnet } from 'lucide-react'

const NOTE_COLORS: Record<NoteType, string> = {
  Tap: '#3b82f6',
  Catch: '#facc15',
  Kick: '#ef4444',
  Hold: '#22c55e',
  Stalid: '#a855f7',
}

const TRACK_HEIGHT = 28
const ROW_GAP = 2
const LEFT_PANEL_WIDTH = 120
const TIMELINE_HEADER_HEIGHT = 48
const WAVEFORM_HEIGHT = 36

interface TimelineProps {
  onSeek?: (time: number) => void
  waveformPeaks?: number[]
  audioDuration?: number
  bpm?: number
}

export default function Timeline({ onSeek, waveformPeaks = [], audioDuration = 0, bpm = 120 }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null)

  const chart = useEditorStore((s) => s.chart)
  const currentSceneId = useEditorStore((s) => s.currentSceneId)
  const songTime = useEditorStore((s) => s.songTime)
  const selectedNoteIds = useEditorStore((s) => s.selectedNoteIds)
  const selectedBackgroundLayerId = useEditorStore((s) => s.selectedBackgroundLayerId)
  const selectNotes = useEditorStore((s) => s.selectNotes)
  const setSelectedBackgroundLayer = useEditorStore((s) => s.setSelectedBackgroundLayer)
  const updateNote = useEditorStore((s) => s.updateNote)
  const updateBackgroundLayer = useEditorStore((s) => s.updateBackgroundLayer)
  const setSongTime = useEditorStore((s) => s.setSongTime)

  const [zoom, setZoom] = useState(50)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [dragging, setDragging] = useState<{
    type: 'note' | 'bg-start' | 'bg-end' | 'bg-move' | 'playhead'
    id: string
    startX: number
    startTime: number
    startEndTime?: number
  } | null>(null)

  const scene = chart?.scenes.find((s) => s.id === currentSceneId)
  const notes = scene?.notes || []
  const backgroundLayers = chart?.backgroundLayers || []

  const chartBpm = bpm || chart?.bpm || 120

  const duration = useMemo(() => {
    if (!scene) return 60
    const lastNote = scene.notes.reduce((max, n) => {
      const end = n.hitTime + (n.type === 'Hold' ? n.holdDuration : 0)
      return Math.max(max, end)
    }, 0)
    const lastBg = backgroundLayers.reduce((max, l) => Math.max(max, l.endTime), 0)
    const audioDur = audioDuration || 0
    return Math.max(60, lastNote, lastBg, audioDur) + 10
  }, [scene, backgroundLayers, audioDuration])

  const pixelsPerSecond = zoom
  const totalWidth = duration * pixelsPerSecond

  const beatDuration = 60 / chartBpm
  const measureDuration = beatDuration * 4

  const snapToBeat = useCallback((time: number): number => {
    if (!snapEnabled) return time
    const snapUnit = beatDuration / 4
    return Math.round(time / snapUnit) * snapUnit
  }, [snapEnabled, beatDuration])

  const measureMarks = useMemo(() => {
    const marks: { time: number; label: string; type: 'measure' | 'beat' | 'eighth' }[] = []
    const eighthDuration = beatDuration / 2
    const totalBeats = Math.ceil(duration / beatDuration)
    const totalEighths = Math.ceil(duration / eighthDuration)

    const showEighths = zoom >= 100
    const showBeats = zoom >= 30

    if (showEighths) {
      for (let i = 0; i <= totalEighths; i++) {
        const t = i * eighthDuration
        if (t > duration) break
        marks.push({ time: t, label: '', type: 'eighth' })
      }
    }

    if (showBeats) {
      for (let i = 0; i <= totalBeats; i++) {
        const t = i * beatDuration
        if (t > duration) break
        const beatInMeasure = i % 4
        marks.push({
          time: t,
          label: beatInMeasure === 0 ? `${Math.floor(i / 4) + 1}` : '',
          type: beatInMeasure === 0 ? 'measure' : 'beat',
        })
      }
    } else {
      const totalMeasures = Math.ceil(duration / measureDuration)
      for (let i = 0; i <= totalMeasures; i++) {
        const t = i * measureDuration
        if (t > duration) break
        marks.push({ time: t, label: `${i + 1}`, type: 'measure' })
      }
    }

    return marks
  }, [duration, zoom, beatDuration, measureDuration])

  useEffect(() => {
    const canvas = waveformCanvasRef.current
    if (!canvas || waveformPeaks.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const displayWidth = totalWidth
    const displayHeight = WAVEFORM_HEIGHT

    canvas.width = displayWidth * dpr
    canvas.height = displayHeight * dpr
    canvas.style.width = `${displayWidth}px`
    canvas.style.height = `${displayHeight}px`

    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, displayWidth, displayHeight)

    const grad = ctx.createLinearGradient(0, 0, 0, displayHeight)
    grad.addColorStop(0, 'rgba(99, 102, 241, 0.6)')
    grad.addColorStop(0.5, 'rgba(99, 102, 241, 0.8)')
    grad.addColorStop(1, 'rgba(99, 102, 241, 0.6)')
    ctx.fillStyle = grad

    const samples = waveformPeaks.length
    const barWidth = Math.max(1, displayWidth / samples)

    for (let i = 0; i < samples; i++) {
      const peak = waveformPeaks[i]
      const barHeight = Math.max(1, peak * displayHeight * 0.9)
      const x = (i / samples) * displayWidth
      const y = (displayHeight - barHeight) / 2
      ctx.fillRect(x, y, barWidth, barHeight)
    }
  }, [waveformPeaks, totalWidth])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      setZoom((z) => Math.max(10, Math.min(300, z * delta)))
    } else {
      setScrollLeft((s) => Math.max(0, Math.min(totalWidth - 800, s + e.deltaY)))
    }
  }, [totalWidth])

  const handleSeek = useCallback((time: number) => {
    const clamped = Math.max(0, Math.min(duration, time))
    if (onSeek) {
      onSeek(clamped)
    } else {
      setSongTime(clamped)
    }
  }, [duration, onSeek, setSongTime])

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (dragging) return
    const rect = contentRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left + scrollLeft
    const time = x / pixelsPerSecond
    handleSeek(snapToBeat(time))
  }, [dragging, scrollLeft, pixelsPerSecond, handleSeek, snapToBeat])

  const handlePlayheadMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setDragging({
      type: 'playhead',
      id: 'playhead',
      startX: e.clientX,
      startTime: songTime,
    })
  }, [songTime])

  const handleNoteMouseDown = useCallback((e: React.MouseEvent, note: NoteData) => {
    e.stopPropagation()
    selectNotes([note.id])
    setDragging({
      type: 'note',
      id: note.id,
      startX: e.clientX,
      startTime: note.hitTime,
    })
  }, [selectNotes])

  const handleBgStartMouseDown = useCallback((e: React.MouseEvent, layer: BackgroundLayer) => {
    e.stopPropagation()
    setSelectedBackgroundLayer(layer.id)
    setDragging({
      type: 'bg-start',
      id: layer.id,
      startX: e.clientX,
      startTime: layer.startTime,
      startEndTime: layer.endTime,
    })
  }, [setSelectedBackgroundLayer])

  const handleBgEndMouseDown = useCallback((e: React.MouseEvent, layer: BackgroundLayer) => {
    e.stopPropagation()
    setSelectedBackgroundLayer(layer.id)
    setDragging({
      type: 'bg-end',
      id: layer.id,
      startX: e.clientX,
      startTime: layer.endTime,
    })
  }, [setSelectedBackgroundLayer])

  const handleBgMoveMouseDown = useCallback((e: React.MouseEvent, layer: BackgroundLayer) => {
    e.stopPropagation()
    setSelectedBackgroundLayer(layer.id)
    setDragging({
      type: 'bg-move',
      id: layer.id,
      startX: e.clientX,
      startTime: layer.startTime,
      startEndTime: layer.endTime,
    })
  }, [setSelectedBackgroundLayer])

  useEffect(() => {
    if (!dragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragging.startX
      const dt = dx / pixelsPerSecond

      if (dragging.type === 'playhead') {
        const newTime = Math.max(0, Math.min(duration, dragging.startTime + dt))
        handleSeek(snapEnabled ? snapToBeat(newTime) : newTime)
      } else if (dragging.type === 'note') {
        const note = notes.find((n) => n.id === dragging.id)
        if (!note) return
        let newHitTime = Math.max(0, dragging.startTime + dt)
        if (snapEnabled) {
          newHitTime = snapToBeat(newHitTime)
        }
        const ap = note.approachTime ?? 2
        updateNote(note.id, { hitTime: newHitTime, spawnTime: newHitTime - ap })
      } else if (dragging.type === 'bg-start') {
        let newStart = Math.max(0, dragging.startTime + dt)
        if (snapEnabled) newStart = snapToBeat(newStart)
        updateBackgroundLayer(dragging.id, { startTime: Math.min(newStart, (dragging.startEndTime || 0) - 0.1) })
      } else if (dragging.type === 'bg-end') {
        const layer = backgroundLayers.find((l) => l.id === dragging.id)
        if (!layer) return
        let newEnd = Math.max(layer.startTime + 0.1, dragging.startTime + dt)
        if (snapEnabled) newEnd = snapToBeat(newEnd)
        updateBackgroundLayer(dragging.id, { endTime: newEnd })
      } else if (dragging.type === 'bg-move') {
        const layer = backgroundLayers.find((l) => l.id === dragging.id)
        if (!layer) return
        const dur = (dragging.startEndTime || 0) - dragging.startTime
        let newStart = Math.max(0, dragging.startTime + dt)
        if (snapEnabled) newStart = snapToBeat(newStart)
        updateBackgroundLayer(dragging.id, { startTime: newStart, endTime: newStart + dur })
      }
    }

    const handleMouseUp = () => {
      setDragging(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, pixelsPerSecond, duration, handleSeek, notes, backgroundLayers, updateNote, updateBackgroundLayer, snapEnabled, snapToBeat])

  const trackCount = 1 + backgroundLayers.length
  const tracksHeight = trackCount * TRACK_HEIGHT + (trackCount - 1) * ROW_GAP

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-endfield-bg-primary border-t border-endfield-border overflow-hidden flex flex-col"
      onWheel={handleWheel}
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-endfield-border bg-endfield-bg-panel/80">
        <div className="flex items-center gap-3">
          <span className="text-xs text-endfield-text-muted">BPM: {chartBpm.toFixed(0)}</span>
          <span className="text-xs text-endfield-text-muted">缩放: {zoom.toFixed(0)}px/s</span>
        </div>
        <button
          onClick={() => setSnapEnabled((s) => !s)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
            snapEnabled
              ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
              : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
          }`}
          title={snapEnabled ? '吸附已开启 (1/4拍)' : '吸附已关闭'}
        >
          <Magnet className="w-3 h-3" />
          吸附
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          className="shrink-0 bg-endfield-bg-panel/80 border-r border-endfield-border flex flex-col"
          style={{ width: LEFT_PANEL_WIDTH }}
        >
          <div
            className="border-b border-endfield-border bg-endfield-bg-secondary/50 flex items-center px-3"
            style={{ height: TIMELINE_HEADER_HEIGHT }}
          >
            <span className="text-xs text-endfield-text-muted">波形 / 节拍</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center px-3 text-xs text-endfield-text-secondary" style={{ height: TRACK_HEIGHT }}>
              <MusicIcon className="w-3.5 h-3.5 mr-2 text-endfield-accent-cyan" />
              音符
            </div>
            {backgroundLayers.map((layer, i) => (
              <div
                key={layer.id}
                className={`flex items-center px-3 text-xs cursor-pointer ${
                  layer.id === selectedBackgroundLayerId
                    ? 'bg-indigo-600/20 text-indigo-300'
                    : 'text-endfield-text-secondary hover:bg-endfield-bg-card'
                }`}
                style={{ height: TRACK_HEIGHT, marginTop: i === 0 ? ROW_GAP : 0 }}
                onClick={() => setSelectedBackgroundLayer(layer.id)}
              >
                {layer.type === 'text' ? (
                  <Type className="w-3.5 h-3.5 mr-2 text-amber-400" />
                ) : (
                  <Image className="w-3.5 h-3.5 mr-2 text-emerald-400" />
                )}
                <span className="truncate flex-1">
                  {layer.type === 'text' ? layer.text || '文字' : '图片'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative" ref={contentRef}>
          <div
            className="absolute top-0 left-0 border-b border-endfield-border bg-endfield-bg-secondary/50"
            style={{ width: totalWidth, height: TIMELINE_HEADER_HEIGHT }}
          >
            <div className="relative w-full h-full">
              {waveformPeaks.length > 0 && (
                <div
                  className="absolute left-0 right-0 top-0 overflow-hidden"
                  style={{ height: WAVEFORM_HEIGHT }}
                >
                  <canvas ref={waveformCanvasRef} className="absolute top-0 left-0" />
                </div>
              )}
              {waveformPeaks.length === 0 && (
                <div
                  className="absolute left-0 right-0 top-0 flex items-center justify-center"
                  style={{ height: WAVEFORM_HEIGHT }}
                >
                  <span className="text-[10px] text-zinc-600">暂无音频波形</span>
                </div>
              )}
              <div
                className="absolute left-0 right-0 border-t border-endfield-border/50"
                style={{ top: WAVEFORM_HEIGHT }}
              />
              {measureMarks.map((mark) => (
                <div
                  key={`${mark.time}-${mark.type}`}
                  className="absolute bottom-0 flex flex-col justify-end items-start"
                  style={{ left: mark.time * pixelsPerSecond, height: TIMELINE_HEADER_HEIGHT - WAVEFORM_HEIGHT }}
                >
                  <div
                    className={`w-px ${
                      mark.type === 'measure'
                        ? 'h-3 bg-indigo-400/70'
                        : mark.type === 'beat'
                        ? 'h-2 bg-zinc-500/60'
                        : 'h-1.5 bg-zinc-600/40'
                    }`}
                  />
                  {mark.label && (
                    <span
                      className={`text-[10px] font-mono ml-1 -translate-y-0.5 select-none pointer-events-none ${
                        mark.type === 'measure' ? 'text-indigo-300' : 'text-zinc-500'
                      }`}
                    >
                      {mark.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div
            className="absolute cursor-pointer"
            style={{ top: TIMELINE_HEADER_HEIGHT, left: 0, width: totalWidth, height: tracksHeight }}
            onClick={handleTimelineClick}
          >
            {measureMarks.filter((m) => m.type === 'measure').map((mark) => (
              <div
                key={`v-${mark.time}`}
                className="absolute top-0 bottom-0 w-px bg-indigo-500/10"
                style={{ left: mark.time * pixelsPerSecond }}
              />
            ))}

            <div
              className="absolute left-0 right-0 border-b border-endfield-border/50"
              style={{ top: TRACK_HEIGHT + ROW_GAP - ROW_GAP }}
            />

            <div className="absolute left-0 right-0" style={{ top: 0, height: TRACK_HEIGHT }}>
              {notes.map((note) => {
                const left = note.hitTime * pixelsPerSecond
                const width = note.type === 'Hold' ? note.holdDuration * pixelsPerSecond : 8
                const isSelected = selectedNoteIds.includes(note.id)
                return (
                  <div
                    key={note.id}
                    className={`absolute top-1/2 -translate-y-1/2 rounded cursor-pointer transition-shadow ${
                      isSelected ? 'ring-2 ring-white/60 shadow-lg' : 'hover:brightness-110'
                    }`}
                    style={{
                      left: left - width / 2,
                      width: Math.max(8, width),
                      height: 18,
                      backgroundColor: NOTE_COLORS[note.type],
                      opacity: 0.9,
                      boxShadow: isSelected ? `0 0 10px ${NOTE_COLORS[note.type]}80` : 'none',
                    }}
                    onMouseDown={(e) => handleNoteMouseDown(e, note)}
                    title={`${NOTE_DISPLAY_NAMES[note.type]} ${note.hitTime.toFixed(2)}s`}
                  />
                )
              })}
            </div>

            {backgroundLayers.map((layer, i) => {
              const left = layer.startTime * pixelsPerSecond
              const width = (layer.endTime - layer.startTime) * pixelsPerSecond
              const isSelected = layer.id === selectedBackgroundLayerId
              const top = TRACK_HEIGHT + ROW_GAP + i * (TRACK_HEIGHT + ROW_GAP)
              return (
                <div
                  key={layer.id}
                  className={`absolute rounded cursor-move transition-shadow ${
                    isSelected
                      ? 'ring-2 ring-indigo-400/80'
                      : 'hover:brightness-110'
                  }`}
                  style={{
                    left,
                    top,
                    width: Math.max(20, width),
                    height: TRACK_HEIGHT - 4,
                    backgroundColor: layer.type === 'text' ? '#f59e0b' : '#10b981',
                    opacity: 0.7,
                    background: layer.type === 'text'
                      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  }}
                  onMouseDown={(e) => handleBgMoveMouseDown(e, layer)}
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/30 rounded-l"
                    onMouseDown={(e) => handleBgStartMouseDown(e, layer)}
                  />
                  <div className="absolute inset-0 flex items-center px-2 text-xs text-white/90 font-medium truncate">
                    {layer.type === 'text' ? layer.text : '图片层'}
                  </div>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/30 rounded-r"
                    onMouseDown={(e) => handleBgEndMouseDown(e, layer)}
                  />
                </div>
              )
            })}
          </div>

          <div
            className="absolute top-0 bottom-0 w-1 bg-red-500 z-10 cursor-ew-resize"
            style={{ left: songTime * pixelsPerSecond - 2, boxShadow: '0 0 8px rgba(239,68,68,0.6)' }}
            onMouseDown={handlePlayheadMouseDown}
          >
            <div className="absolute -top-0.5 -left-2 w-5 h-5 bg-red-500 rotate-45 cursor-grab active:cursor-grabbing" />
          </div>
        </div>
      </div>
    </div>
  )
}

function MusicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}
