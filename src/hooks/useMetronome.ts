import { useEffect, useRef } from 'react'

export function useMetronome(
  bpm: number,
  offset: number,
  enabled: boolean,
  isPlaying: boolean,
  getTime: () => number,
): void {
  const audioContextRef = useRef<AudioContext | null>(null)
  const nextBeatTimeRef = useRef<number | null>(null)
  const scheduledBeatsRef = useRef<Set<number>>(new Set())
  const animationFrameRef = useRef<number>(0)

  useEffect(() => {
    if (!enabled || !isPlaying || bpm <= 0) {
      nextBeatTimeRef.current = null
      scheduledBeatsRef.current.clear()
      return
    }

    const initAudioContext = (): AudioContext | null => {
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        if (!AudioContextClass) return null
        audioContextRef.current = new AudioContextClass()
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => undefined)
      }
      return audioContextRef.current
    }

    const playTick = (ctx: AudioContext, time: number, isDownbeat: boolean): void => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'square'
      osc.frequency.value = isDownbeat ? 1200 : 800

      gain.gain.setValueAtTime(0, time)
      gain.gain.linearRampToValueAtTime(0.08, time + 0.001)
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(time)
      osc.stop(time + 0.04)
    }

    const secondsPerBeat = 60 / bpm
    const lookahead = 0.1
    const songToAudioOffset = (() => {
      const ctx = initAudioContext()
      if (!ctx) return 0
      return ctx.currentTime - getTime()
    })()

    const scheduleBeats = () => {
      const ctx = initAudioContext()
      if (!ctx) return

      const currentSongTime = getTime()
      const currentAudioTime = ctx.currentTime

      if (nextBeatTimeRef.current === null) {
        const elapsed = currentSongTime - offset
        const beatIndex = Math.floor(elapsed / secondsPerBeat) + 1
        nextBeatTimeRef.current = offset + beatIndex * secondsPerBeat
      }

      while (nextBeatTimeRef.current !== null) {
        const songTime = nextBeatTimeRef.current
        const audioTime = songTime + songToAudioOffset

        if (audioTime > currentAudioTime + lookahead) {
          break
        }

        const beatKey = Math.round(songTime * 1000)
        if (!scheduledBeatsRef.current.has(beatKey)) {
          scheduledBeatsRef.current.add(beatKey)

          const beatIndex = Math.round((songTime - offset) / secondsPerBeat)
          const isDownbeat = beatIndex % 4 === 0

          const scheduleTime = Math.max(ctx.currentTime + 0.005, audioTime)
          playTick(ctx, scheduleTime, isDownbeat)
        }

        nextBeatTimeRef.current += secondsPerBeat
      }

      if (scheduledBeatsRef.current.size > 100) {
        const oldestToKeep = Math.round((currentSongTime - 2) * 1000)
        scheduledBeatsRef.current = new Set(
          [...scheduledBeatsRef.current].filter((t) => t > oldestToKeep)
        )
      }
    }

    const tick = () => {
      scheduleBeats()
      animationFrameRef.current = requestAnimationFrame(tick)
    }

    animationFrameRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
      nextBeatTimeRef.current = null
      scheduledBeatsRef.current.clear()
    }
  }, [bpm, offset, enabled, isPlaying, getTime])

  useEffect(() => {
    return () => {
      const ctx = audioContextRef.current
      if (ctx && ctx.state !== 'closed') {
        ctx.close().catch(() => undefined)
      }
    }
  }, [])
}
