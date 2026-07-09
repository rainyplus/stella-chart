import { useCallback, useEffect, useRef, useState } from 'react'

export type AudioLoadStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface AudioEngine {
  play: () => void
  pause: () => void
  seek: (time: number) => void
  setRate: (rate: number) => void
  duration: number
  currentTime: number
  isReady: boolean
  isLoading: boolean
  error: string | null
  hasAudio: boolean
  status: AudioLoadStatus
  waveformPeaks: number[]
}

interface UseAudioEngineOptions {
  onTimeUpdate?: (time: number) => void
  onPlayStateChange?: (playing: boolean) => void
  onEnded?: () => void
}

const DECODE_TIMEOUT = 30000
const MIN_RATE = 0.5
const MAX_RATE = 2.0
const WAVEFORM_SAMPLES = 2000

function generateWaveformPeaks(audioBuffer: AudioBuffer): number[] {
  const channelData = audioBuffer.getChannelData(0)
  const blockSize = Math.max(1, Math.floor(channelData.length / WAVEFORM_SAMPLES))
  const peaks: number[] = []

  for (let i = 0; i < WAVEFORM_SAMPLES; i++) {
    const start = i * blockSize
    let max = 0
    for (let j = 0; j < blockSize; j++) {
      const val = Math.abs(channelData[start + j] || 0)
      if (val > max) max = val
    }
    peaks.push(max)
  }

  return peaks
}

export function useAudioEngine(
  audioUrl: string | undefined,
  options: UseAudioEngineOptions = {},
): AudioEngine {
  const onTimeUpdateRef = useRef<((time: number) => void) | undefined>(options.onTimeUpdate)
  const onPlayStateChangeRef = useRef<((playing: boolean) => void) | undefined>(options.onPlayStateChange)
  const onEndedRef = useRef<(() => void) | undefined>(options.onEnded)

  useEffect(() => {
    onTimeUpdateRef.current = options.onTimeUpdate
  }, [options.onTimeUpdate])

  useEffect(() => {
    onPlayStateChangeRef.current = options.onPlayStateChange
  }, [options.onPlayStateChange])

  useEffect(() => {
    onEndedRef.current = options.onEnded
  }, [options.onEnded])

  const audioContextRef = useRef<AudioContext | null>(null)
  const bufferRef = useRef<AudioBuffer | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)

  const isPlayingRef = useRef(false)
  const startContextTimeRef = useRef(0)
  const seekOffsetRef = useRef(0)
  const playbackRateRef = useRef(1)
  const rafRef = useRef<number>(0)
  const decodeAbortRef = useRef<{ cancelled: boolean } | null>(null)

  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [status, setStatus] = useState<AudioLoadStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([])

  const hasAudio = Boolean(audioUrl)
  const isReady = status === 'ready'
  const isLoading = status === 'loading'

  const ensureAudioContext = useCallback((): AudioContext | null => {
    if (!audioContextRef.current) {
      const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioContextCtor) return null
      audioContextRef.current = new AudioContextCtor()
    }
    return audioContextRef.current
  }, [])

  const stopSource = useCallback(() => {
    const source = sourceRef.current
    if (source) {
      try {
        source.onended = null
        source.stop()
      } catch {
        // ignore already stopped
      }
      try {
        source.disconnect()
      } catch {
        // ignore
      }
      sourceRef.current = null
    }
  }, [])

  const getAudioTime = useCallback(() => {
    const ctx = audioContextRef.current
    if (!ctx || !isPlayingRef.current) return seekOffsetRef.current
    const elapsed = (ctx.currentTime - startContextTimeRef.current) * playbackRateRef.current
    const time = seekOffsetRef.current + elapsed
    return Math.max(0, Math.min(duration, time))
  }, [duration])

  const updateTime = useCallback(() => {
    const t = getAudioTime()
    setCurrentTime(t)
    onTimeUpdateRef.current?.(t)
    if (duration > 0 && t >= duration) {
      isPlayingRef.current = false
      onPlayStateChangeRef.current?.(false)
      stopSource()
      onEndedRef.current?.()
    }
  }, [duration, getAudioTime, stopSource])

  const startTick = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    const tick = () => {
      if (!isPlayingRef.current) return
      updateTime()
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [updateTime])

  const playPendingRef = useRef(false)

  const play = useCallback(async () => {
    if (!hasAudio) return
    if (isPlayingRef.current) return

    const ctx = ensureAudioContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch {
        // ignore
      }
    }

    const buffer = bufferRef.current
    if (!buffer) {
      playPendingRef.current = true
      return
    }

    playPendingRef.current = false
    stopSource()

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = playbackRateRef.current

    const gain = gainRef.current ?? ctx.createGain()
    gain.gain.value = 1
    source.connect(gain)
    gain.connect(ctx.destination)
    gainRef.current = gain

    source.onended = () => {
      if (isPlayingRef.current) {
        isPlayingRef.current = false
        onPlayStateChangeRef.current?.(false)
        updateTime()
      }
    }

    sourceRef.current = source
    startContextTimeRef.current = ctx.currentTime
    source.start(0, seekOffsetRef.current)
    isPlayingRef.current = true
    onPlayStateChangeRef.current?.(true)
    startTick()
  }, [hasAudio, ensureAudioContext, startTick, stopSource, updateTime])

  const pause = useCallback(() => {
    if (!isPlayingRef.current) return
    const t = getAudioTime()
    seekOffsetRef.current = t
    setCurrentTime(t)
    onTimeUpdateRef.current?.(t)
    isPlayingRef.current = false
    stopSource()
    onPlayStateChangeRef.current?.(false)
    cancelAnimationFrame(rafRef.current)
  }, [getAudioTime, stopSource])

  const seek = useCallback(
    (time: number) => {
      const t = Math.max(0, Math.min(duration || Infinity, time))
      seekOffsetRef.current = t
      setCurrentTime(t)
      onTimeUpdateRef.current?.(t)
      if (isPlayingRef.current) {
        stopSource()
        isPlayingRef.current = false
        play()
      }
    },
    [duration, play, stopSource],
  )

  const setRate = useCallback(
    (rate: number) => {
      const clamped = Math.max(MIN_RATE, Math.min(MAX_RATE, rate))
      if (playbackRateRef.current === clamped) return
      if (isPlayingRef.current) {
        const t = getAudioTime()
        seekOffsetRef.current = t
      }
      playbackRateRef.current = clamped
      if (sourceRef.current) {
        sourceRef.current.playbackRate.value = clamped
      }
      if (isPlayingRef.current) {
        play()
      }
    },
    [getAudioTime, play],
  )

  const decodeAudioWithTimeout = useCallback(
    async (ctx: AudioContext, arrayBuffer: ArrayBuffer, signal: { cancelled: boolean }): Promise<AudioBuffer> => {
      return await new Promise<AudioBuffer>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('音频解码超时，请转码为MP3'))
        }, DECODE_TIMEOUT)

        ctx.decodeAudioData(arrayBuffer)
          .then((buffer) => {
            clearTimeout(timeoutId)
            if (signal.cancelled) {
              reject(new Error('Cancelled'))
              return
            }
            resolve(buffer)
          })
          .catch((err) => {
            clearTimeout(timeoutId)
            reject(err)
          })
      })
    },
    [],
  )

  useEffect(() => {
    if (!audioUrl) {
      setStatus('idle')
      setDuration(0)
      setCurrentTime(0)
      setError(null)
      setWaveformPeaks([])
      stopSource()
      bufferRef.current = null
      seekOffsetRef.current = 0
      isPlayingRef.current = false
      return
    }

    const abortSignal = { cancelled: false }
    decodeAbortRef.current = abortSignal
    setError(null)
    setStatus('loading')
    setDuration(0)
    setCurrentTime(0)
    bufferRef.current = null
    seekOffsetRef.current = 0

    const load = async () => {
      try {
        const ctx = ensureAudioContext()
        if (!ctx) {
          throw new Error('当前浏览器不支持 Web Audio API')
        }
        if (ctx.state === 'suspended') {
          await ctx.resume()
        }

        let response: Response
        try {
          response = await fetch(audioUrl)
        } catch {
          throw new Error('网络错误，无法加载音频文件')
        }

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('音频文件不存在（404）')
          }
          throw new Error(`音频加载失败（HTTP ${response.status}）`)
        }

        let arrayBuffer: ArrayBuffer
        try {
          arrayBuffer = await response.arrayBuffer()
        } catch {
          throw new Error('读取音频数据失败')
        }

        if (arrayBuffer.byteLength === 0) {
          throw new Error('音频文件为空文件')
        }

        const decoded = await decodeAudioWithTimeout(ctx, arrayBuffer, abortSignal)

        if (abortSignal.cancelled) return

        bufferRef.current = decoded
        setDuration(decoded.duration)

        const peaks = generateWaveformPeaks(decoded)
        setWaveformPeaks(peaks)

        setStatus('ready')
      } catch (err) {
        if (abortSignal.cancelled) return
        const message = err instanceof Error ? err.message : '音频加载失败'
        setError(message)
        setStatus('error')
      }
    }

    load()

    return () => {
      abortSignal.cancelled = true
      if (decodeAbortRef.current === abortSignal) {
        decodeAbortRef.current = null
      }
    }
  }, [audioUrl, decodeAudioWithTimeout, ensureAudioContext, stopSource])

  const playRef = useRef(play)
  useEffect(() => {
    playRef.current = play
  }, [play])

  useEffect(() => {
    if (status === 'ready' && playPendingRef.current) {
      playPendingRef.current = false
      playRef.current?.()
    }
  }, [status])

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      stopSource()
      const ctx = audioContextRef.current
      if (ctx && ctx.state !== 'closed') {
        ctx.close().catch(() => undefined)
      }
      audioContextRef.current = null
      bufferRef.current = null
      gainRef.current = null
    }
  }, [stopSource])

  return {
    play,
    pause,
    seek,
    setRate,
    duration,
    currentTime,
    isReady,
    isLoading,
    error,
    hasAudio,
    status,
    waveformPeaks,
  }
}
