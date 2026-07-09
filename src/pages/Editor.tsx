import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

function useFps(): number {
  const [fps, setFps] = useState(0)
  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const tick = () => {
      frameCountRef.current++
      const now = performance.now()
      const delta = now - lastTimeRef.current
      if (delta >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / delta))
        frameCountRef.current = 0
        lastTimeRef.current = now
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return fps
}
import {
  Play,
  Pause,
  Save,
  Download,
  Music,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  MousePointer2,
  Hand,
  Footprints,
  Timer,
  Sparkles,
  Eye,
  Network,
  X,
  ListVideo,
  HelpCircle,
  Camera,
  RotateCcw,
  RotateCw,
  Sun,
  Moon,
} from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { chartApi, exportApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useEditorStore, type Tool, type CameraMode } from '@/store/editorStore'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { useMetronome } from '@/hooks/useMetronome'
import { useAutoPlay } from '@/hooks/useAutoPlay'
import { useKeyboardShortcuts, SHORTCUT_LIST } from '@/hooks/useKeyboardShortcuts'
import { TOOL_DISPLAY_NAMES } from '@/constants/noteTypes'
import EditorCanvas from '@/components/editor/EditorCanvas'
import Inspector from '@/components/editor/Inspector'
import SceneMapEditor from '@/components/editor/SceneMapEditor'
import Timeline from '@/components/editor/Timeline'
import { rankFromAccuracy, ratingFromAccuracy } from '@/lib/chartUtils'

const TOOLS: { key: Tool; label: string; shortcut: string; icon: React.ReactNode }[] = [
  { key: 'select', label: TOOL_DISPLAY_NAMES.select, shortcut: '1/S', icon: <MousePointer2 className="w-5 h-5" /> },
  { key: 'tap', label: TOOL_DISPLAY_NAMES.tap, shortcut: '2/T', icon: <Hand className="w-5 h-5" /> },
  { key: 'catch', label: TOOL_DISPLAY_NAMES.catch, shortcut: '3/C', icon: <Sparkles className="w-5 h-5" /> },
  { key: 'kick', label: TOOL_DISPLAY_NAMES.kick, shortcut: '4/K', icon: <Footprints className="w-5 h-5" /> },
  { key: 'hold', label: TOOL_DISPLAY_NAMES.hold, shortcut: '5/H', icon: <Timer className="w-5 h-5" /> },
  { key: 'stalid', label: TOOL_DISPLAY_NAMES.stalid, shortcut: '6/D', icon: <Sparkles className="w-5 h-5" /> },
]

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

function formatTime(t: number): string {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  const ms = Math.floor((t % 1) * 100)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

interface WatermarkProps {
  userId: string
  userEmail: string
}

function Watermark({ userId, userEmail }: WatermarkProps) {
  const watermarkText = `${userId} | ${userEmail} | 测试版本 不代表最终成果`
  const patternId = 'watermark-pattern'

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id={patternId}
            width="400"
            height="200"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-30)"
          >
            <text
              x="200"
              y="100"
              textAnchor="middle"
              fill="currentColor"
              className="text-slate-400/10 dark:text-slate-500/10"
              fontSize="14"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="normal"
            >
              {watermarkText}
            </text>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  )
}

export default function Editor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { isDark, toggleTheme } = useTheme()
  const fps = useFps()

  const chart = useEditorStore((s) => s.chart)
  const currentSceneId = useEditorStore((s) => s.currentSceneId)
  const currentJudgeBoxId = useEditorStore((s) => s.currentJudgeBoxId)
  const tool = useEditorStore((s) => s.tool)
  const snap = useEditorStore((s) => s.snap)
  const viewMode = useEditorStore((s) => s.viewMode)
  const cameraMode = useEditorStore((s) => s.cameraMode)
  const cameraPreset = useEditorStore((s) => s.cameraPreset)
  const setCameraPreset = useEditorStore((s) => s.setCameraPreset)
  const rotateCamera = useEditorStore((s) => s.rotateCamera)
  const songTime = useEditorStore((s) => s.songTime)
  const isPlaying = useEditorStore((s) => s.isPlaying)
  const playbackSpeed = useEditorStore((s) => s.playbackSpeed)
  const selectedNoteIds = useEditorStore((s) => s.selectedNoteIds)
  const copiedNotes = useEditorStore((s) => s.copiedNotes)
  const accuracy = useEditorStore((s) => s.accuracy)
  const totalScore = useEditorStore((s) => s.totalScore)

  const loadChart = useEditorStore((s) => s.loadChart)
  const setCurrentScene = useEditorStore((s) => s.setCurrentScene)
  const addScene = useEditorStore((s) => s.addScene)
  const deleteScene = useEditorStore((s) => s.deleteScene)
  const renameScene = useEditorStore((s) => s.updateSceneName)
  const updateSceneStartTime = useEditorStore((s) => s.updateSceneStartTime)
  const setCurrentJudgeBox = useEditorStore((s) => s.setCurrentJudgeBox)
  const addJudgeBox = useEditorStore((s) => s.addJudgeBox)
  const setTool = useEditorStore((s) => s.setTool)
  const setSnap = useEditorStore((s) => s.setSnap)
  const setViewMode = useEditorStore((s) => s.setViewMode)
  const setCameraMode = useEditorStore((s) => s.setCameraMode)
  const triggerSaveCamera = useEditorStore((s) => s.triggerSaveCamera)
  const updateScene = useEditorStore((s) => s.updateScene)
  const setSongTime = useEditorStore((s) => s.setSongTime)
  const setIsPlaying = useEditorStore((s) => s.setIsPlaying)
  const setPlaybackSpeed = useEditorStore((s) => s.setPlaybackSpeed)
  const deleteNotes = useEditorStore((s) => s.deleteNotes)
  const copySelected = useEditorStore((s) => s.copySelected)
  const pasteCopied = useEditorStore((s) => s.pasteCopied)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const updateChart = useEditorStore((s) => s.updateChart)
  const resetPlaybackStats = useEditorStore((s) => s.resetPlaybackStats)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const [exportStatus, setExportStatus] = useState('')
  const [metronomeEnabled, setMetronomeEnabled] = useState(false)
  const [showSceneMap, setShowSceneMap] = useState(false)
  const [showDemoDisabled, setShowDemoDisabled] = useState(false)
  const [showTimeline, setShowTimeline] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const selectNotes = useEditorStore((s) => s.selectNotes)

  useEffect(() => {
    if (!id) {
      navigate('/')
      return
    }
    let cancelled = false
    chartApi
      .get(id)
      .then((data) => {
        if (!cancelled) loadChart(data.chart)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载谱面失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, navigate, loadChart])

  const scene = useMemo(
    () => chart?.scenes.find((s) => s.id === currentSceneId),
    [chart, currentSceneId],
  )

  const timeMax = useMemo(() => {
    if (!scene) return 300
    const last = scene.notes.reduce((max, n) => Math.max(max, n.hitTime), 0)
    return Math.max(60, last + 10)
  }, [scene])

  const audioEngine = useAudioEngine(chart?.audioUrl, {
    onTimeUpdate: (time) => setSongTime(time),
    onPlayStateChange: (playing) => {
      setIsPlaying(playing)
    },
    onEnded: () => {
      setIsPlaying(false)
    },
  })

  const songEndTime = useMemo(() => {
    if (!chart) return 0
    const last = chart.scenes.flatMap((s) => s.notes).reduce((max, n) => Math.max(max, n.hitTime), 0)
    const audioDuration = audioEngine.duration > 0 ? audioEngine.duration : 0
    return Math.max(audioDuration, last + 3, 10)
  }, [chart, audioEngine.duration])

  useMetronome(
    chart?.bpm ?? 120,
    chart?.offset ?? 0,
    metronomeEnabled,
    isPlaying,
    () => useEditorStore.getState().songTime,
  )
  useAutoPlay()

  useEffect(() => {
    if (!chart || !isPlaying) return
    const sortedScenes = [...chart.scenes].sort((a, b) => a.startTime - b.startTime)
    let activeSceneId = sortedScenes[0]?.id
    for (let i = sortedScenes.length - 1; i >= 0; i--) {
      if (songTime >= sortedScenes[i].startTime) {
        activeSceneId = sortedScenes[i].id
        break
      }
    }
    if (activeSceneId && activeSceneId !== currentSceneId) {
      setCurrentScene(activeSceneId)
    }
  }, [songTime, chart, isPlaying, currentSceneId, setCurrentScene])

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      if (audioEngine.hasAudio) audioEngine.pause()
      else setIsPlaying(false)
      return
    }
    resetPlaybackStats()
    if (audioEngine.hasAudio) {
      audioEngine.play()
    } else {
      setIsPlaying(true)
    }
  }, [isPlaying, audioEngine, setIsPlaying, resetPlaybackStats])

  const handleSeek = useCallback(
    (t: number) => {
      if (audioEngine.hasAudio) {
        audioEngine.seek(t)
      } else {
        setSongTime(t)
      }
    },
    [audioEngine, setSongTime],
  )

  const handleSpeedChange = useCallback(
    (speed: number) => {
      setPlaybackSpeed(speed)
      if (audioEngine.hasAudio) {
        audioEngine.setRate(speed)
      }
    },
    [audioEngine, setPlaybackSpeed],
  )

  const handleSave = useCallback(() => {
    if (!id || !chart) return
    setSaveStatus('保存中...')
    chartApi
      .update(id, chart)
      .then(() => {
        setSaveStatus('已保存')
        setTimeout(() => setSaveStatus(''), 2000)
      })
      .catch((err: unknown) => {
        setSaveStatus(err instanceof Error ? err.message : '保存失败')
      })
  }, [id, chart])

  const handleSelectAll = useCallback(() => {
    if (!scene) return
    const allNoteIds = scene.notes.map((n) => n.id)
    selectNotes(allNoteIds)
  }, [scene, selectNotes])

  const handleEscape = useCallback(() => {
    selectNotes([])
    if (tool === 'stalid') {
      useEditorStore.getState().cancelStalid()
    }
  }, [selectNotes, tool])

  useKeyboardShortcuts({
    onUndo: undo,
    onRedo: redo,
    onSave: handleSave,
    onDelete: () => deleteNotes(selectedNoteIds),
    onPlayPause: handlePlayPause,
    onSelectAll: handleSelectAll,
    onEscape: handleEscape,
    onToolChange: setTool,
    hasSelection: selectedNoteIds.length > 0,
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }
      const key = e.key.toLowerCase()

      if (e.ctrlKey || e.metaKey) {
        if (key === 'c') {
          e.preventDefault()
          copySelected()
          return
        }
        if (key === 'v') {
          e.preventDefault()
          if (copiedNotes.length > 0) {
            const earliest = Math.min(...copiedNotes.map((n) => n.hitTime))
            pasteCopied(Math.max(0, songTime - earliest))
          }
          return
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    copySelected,
    copiedNotes,
    pasteCopied,
    songTime,
  ])

  const hasAudio = Boolean(chart?.audioUrl)

  useEffect(() => {
    if (!isPlaying || songEndTime <= 0 || hasAudio) return
    if (songTime >= songEndTime) {
      setIsPlaying(false)
    }
  }, [isPlaying, songTime, songEndTime, hasAudio, setIsPlaying])

  useEffect(() => {
    if (hasAudio) return
    let raf = 0
    if (isPlaying) {
      let last = performance.now()
      const tick = (now: number) => {
        const dt = (now - last) / 1000
        last = now
        const state = useEditorStore.getState()
        state.setSongTime(state.songTime + dt * playbackSpeed)
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }
    return () => cancelAnimationFrame(raf)
  }, [isPlaying, playbackSpeed, hasAudio])

  const handleExport = async () => {
    if (!id || !chart) return
    setExportStatus('导出中...')
    try {
      const blob = await exportApi.exportChart(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${chart.songName || 'chart'}.selert`
      a.click()
      URL.revokeObjectURL(url)
      setExportStatus('已导出')
      setTimeout(() => setExportStatus(''), 2000)
    } catch (err: unknown) {
      setExportStatus(err instanceof Error ? err.message : '导出失败')
    }
  }

  const audioDisabled = hasAudio && !audioEngine.isReady
  const audioStatus = audioEngine.error ? (
    <span className="text-xs text-red-500 dark:text-red-400">音频错误：{audioEngine.error}</span>
  ) : audioDisabled ? (
    <span className="text-xs text-brand-600 dark:text-brand-400">音频解码中…</span>
  ) : null

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex items-center justify-center">
        <span className="text-slate-500 dark:text-slate-400">加载谱面…</span>
      </div>
    )
  }

  if (error || !chart || !scene) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 dark:text-red-400 mb-4">{error || '谱面数据无效'}</p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            返回主页
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden relative">
      {user && <Watermark userId={user.id} userEmail={user.email} />}

      <TopBar
        chart={chart}
        currentSceneId={currentSceneId}
        currentJudgeBoxId={currentJudgeBoxId}
        viewMode={viewMode}
        cameraMode={cameraMode}
        cameraPreset={cameraPreset}
        user={user?.username}
        saveStatus={saveStatus}
        exportStatus={exportStatus}
        showSceneMap={showSceneMap}
        isDark={isDark}
        onNavigateBack={() => navigate('/')}
        onUpdateChart={updateChart}
        onSetCurrentScene={setCurrentScene}
        onAddScene={addScene}
        onSetCurrentJudgeBox={setCurrentJudgeBox}
        onAddJudgeBox={() => addJudgeBox(currentSceneId)}
        onSetViewMode={setViewMode}
        onSetCameraMode={setCameraMode}
        onSetCameraPreset={setCameraPreset}
        onRotateCamera={rotateCamera}
        onTriggerSaveCamera={triggerSaveCamera}
        onUpdateScene={updateScene}
        onToggleSceneMap={() => setShowSceneMap(!showSceneMap)}
        onPlayDemo={() => setShowDemoDisabled(true)}
        onSave={handleSave}
        onExport={handleExport}
        onToggleShortcuts={() => setShowShortcuts(!showShortcuts)}
        onToggleTheme={toggleTheme}
      />

      <div className="flex-1 flex overflow-hidden">
        <LeftToolbar
          tool={tool}
          snap={snap}
          onSetTool={setTool}
          onSetSnap={setSnap}
        />

        <div className="flex-1 relative min-w-0">
          <EditorCanvas />
        </div>

        <div className="w-72 min-w-[18rem] border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 overflow-y-auto">
          <Inspector />
        </div>
      </div>

      {showSceneMap && currentSceneId && (
        <div className="modal-overlay">
          <div className="modal-content w-[900px] max-w-[90vw] h-[600px] max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-semibold">思维导图 / 场面地图</h3>
              <button
                onClick={() => setShowSceneMap(false)}
                className="btn-icon"
                title="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <SceneMapEditor
                chart={chart}
                currentSceneId={currentSceneId}
                onSelectScene={(sceneId) => {
                  setCurrentScene(sceneId)
                }}
                onAddScene={addScene}
                onDeleteScene={deleteScene}
                onRenameScene={renameScene}
                onUpdateSceneStartTime={updateSceneStartTime}
              />
            </div>
          </div>
        </div>
      )}

      {showTimeline && (
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 h-48">
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">时间轴</span>
            <button
              onClick={() => setShowTimeline(false)}
              className="btn-icon w-7 h-7"
              title="收起时间轴"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <Timeline
            onSeek={handleSeek}
            waveformPeaks={audioEngine.waveformPeaks}
            audioDuration={audioEngine.duration}
            bpm={chart?.bpm}
          />
        </div>
      )}

      {!showTimeline && (
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <button
            onClick={() => setShowTimeline(true)}
            className="w-full py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-center gap-1 transition-colors"
          >
            <ListVideo className="w-3.5 h-3.5" />
            展开时间轴
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <BottomBar
        isPlaying={isPlaying}
        songTime={songTime}
        duration={audioEngine.duration > 0 ? audioEngine.duration : timeMax}
        playbackSpeed={playbackSpeed}
        metronomeEnabled={metronomeEnabled}
        accuracy={accuracy}
        difficulty={chart.difficulty}
        audioDisabled={audioDisabled}
        audioStatus={audioStatus}
        onPlayPause={handlePlayPause}
        onSeek={handleSeek}
        onSpeedChange={handleSpeedChange}
        onToggleMetronome={() => setMetronomeEnabled(!metronomeEnabled)}
      />

      <div className="absolute bottom-28 right-4 z-20 pointer-events-none select-none">
        <div className="text-xs font-mono text-slate-400 dark:text-slate-500 tracking-wider">
          {fps} FPS
        </div>
      </div>

      {showDemoDisabled && (
        <div className="modal-overlay" onClick={() => setShowDemoDisabled(false)}>
          <div
            className="modal-content max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 flex items-center justify-center bg-brand-100 dark:bg-brand-900/30 rounded-xl">
                  <Play className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">功能暂不可用</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">敬请期待</p>
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                谱面演示系统有重大bug，暂时无法使用，敬请期待
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDemoDisabled(false)}
                  className="flex-1 btn-primary"
                >
                  我知道了
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showShortcuts && (
        <div className="modal-overlay" onClick={() => setShowShortcuts(false)}>
          <div
            className="modal-content w-[500px] max-w-[90vw] max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center bg-brand-100 dark:bg-brand-900/30 rounded-xl">
                  <HelpCircle className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                </div>
                <h3 className="text-base font-semibold">快捷键说明</h3>
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                className="btn-icon"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[60vh]">
              <div className="space-y-5">
                {SHORTCUT_LIST.map((category) => (
                  <div key={category.category} className="space-y-2">
                    <h4 className="text-sm font-semibold text-brand-600 dark:text-brand-400">{category.category}</h4>
                    <div className="space-y-1.5">
                      {category.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-300">{item.description}</span>
                          <div className="flex gap-1">
                            {item.keys.map((key, keyIdx) => (
                              <span key={keyIdx}>
                                {keyIdx > 0 && <span className="text-slate-400 dark:text-slate-500 mx-0.5">+</span>}
                                <kbd className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-200 font-mono">
                                  {key}
                                </kbd>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface TopBarProps {
  chart: {
    songName: string
    bpm: number
    difficulty: number
    offset: number
    scenes: Array<{
      id: string
      name: string
      judgeBoxes: Array<{ id: string; name: string }>
      camera?: { position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number }; fov?: number }
    }>
  }
  currentSceneId: string | null
  currentJudgeBoxId: string | null
  viewMode: 'perspective' | 'top'
  cameraMode: CameraMode
  cameraPreset: string
  user?: string
  saveStatus: string
  exportStatus: string
  showSceneMap: boolean
  isDark: boolean
  onNavigateBack: () => void
  onUpdateChart: (patch: Record<string, unknown>) => void
  onSetCurrentScene: (id: string) => void
  onAddScene: () => void
  onSetCurrentJudgeBox: (id: string) => void
  onAddJudgeBox: () => void
  onSetViewMode: (mode: 'perspective' | 'top') => void
  onSetCameraMode: (mode: CameraMode) => void
  onSetCameraPreset: (preset: string) => void
  onRotateCamera: (direction: 'cw' | 'ccw') => void
  onTriggerSaveCamera: () => void
  onUpdateScene: (id: string, patch: Record<string, unknown>) => void
  onToggleSceneMap: () => void
  onPlayDemo: () => void
  onSave: () => void
  onExport: () => void
  onToggleShortcuts: () => void
  onToggleTheme: () => void
}

function TopBar({
  chart,
  currentSceneId,
  currentJudgeBoxId,
  viewMode,
  cameraMode,
  cameraPreset,
  user,
  saveStatus,
  exportStatus,
  showSceneMap,
  isDark,
  onNavigateBack,
  onUpdateChart,
  onSetCurrentScene,
  onAddScene,
  onSetCurrentJudgeBox,
  onAddJudgeBox,
  onSetViewMode,
  onSetCameraMode,
  onSetCameraPreset,
  onRotateCamera,
  onTriggerSaveCamera,
  onUpdateScene,
  onToggleSceneMap,
  onPlayDemo,
  onSave,
  onExport,
  onToggleShortcuts,
  onToggleTheme,
}: TopBarProps) {
  const currentScene = chart.scenes.find((s) => s.id === currentSceneId)

  return (
    <div className="shrink-0 min-h-14 h-auto flex flex-wrap items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
      <button
        onClick={onNavigateBack}
        className="btn-secondary"
        title="返回主页"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="text-sm">返回</span>
      </button>

      <div className="flex items-center gap-2">
        <div className="w-1 h-5 bg-gradient-brand rounded-full" />
        <h1 className="text-sm font-bold">
          <span className="text-gradient">STELLA CHART</span>
        </h1>
      </div>

      <input
        value={chart.songName}
        onChange={(e) => onUpdateChart({ songName: e.target.value })}
        className="input-sm w-40"
        placeholder="歌曲名"
      />

      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-xs text-slate-500 dark:text-slate-400">BPM</span>
        <input
          type="number"
          value={chart.bpm}
          onChange={(e) => onUpdateChart({ bpm: Number(e.target.value) })}
          className="input-sm w-16"
        />
      </div>

      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-xs text-slate-500 dark:text-slate-400">难度</span>
        <input
          type="number"
          value={chart.difficulty}
          onChange={(e) => onUpdateChart({ difficulty: Number(e.target.value) })}
          className="input-sm w-16"
        />
      </div>

      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-xs text-slate-500 dark:text-slate-400">偏移</span>
        <input
          type="number"
          step="0.001"
          value={chart.offset}
          onChange={(e) => onUpdateChart({ offset: Number(e.target.value) })}
          className="input-sm w-20"
        />
      </div>

      <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

      <div className="flex items-center gap-1">
        <select
          value={currentSceneId || ''}
          onChange={(e) => onSetCurrentScene(e.target.value)}
          className="select input-sm text-xs"
        >
          {chart.scenes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          onClick={onAddScene}
          className="btn-secondary !px-2 !py-1.5 text-xs"
          title="添加场面"
        >
          + 场面
        </button>
      </div>

      <div className="flex items-center gap-1">
        <select
          value={currentJudgeBoxId || ''}
          onChange={(e) => onSetCurrentJudgeBox(e.target.value)}
          className="select input-sm text-xs"
        >
          {currentScene?.judgeBoxes.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <button
          onClick={onAddJudgeBox}
          className="btn-secondary !px-2 !py-1.5 text-xs"
          title="添加判定框"
        >
          + 判定框
        </button>
      </div>

      <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

      <button
        onClick={() => onSetViewMode(viewMode === 'perspective' ? 'top' : 'perspective')}
        className="btn-secondary !px-2 !py-1.5 text-xs"
        title="切换视角"
      >
        <Eye className="w-4 h-4" />
        {viewMode === 'perspective' ? '透视' : '顶视'}
      </button>

      <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        {[
          { id: 'top', label: '俯视' },
          { id: 'default', label: '45°' },
          { id: 'low', label: '低角' },
          { id: 'side', label: '侧面' },
          { id: 'free', label: '自由' },
        ].map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSetCameraPreset(preset.id)}
            className={`px-2.5 py-1.5 text-xs transition-colors focus:outline-none ${
              cameraPreset === preset.id
                ? 'bg-brand-500 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title={`${preset.label}视角`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="flex items-center">
        <button
          onClick={() => onRotateCamera('ccw')}
          className="btn-icon !w-8 !h-8 rounded-r-none !rounded-l-lg border border-slate-200 dark:border-slate-700"
          title="逆时针旋转90°"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={() => onRotateCamera('cw')}
          className="btn-icon !w-8 !h-8 rounded-l-none !rounded-r-lg border border-l-0 border-slate-200 dark:border-slate-700"
          title="顺时针旋转90°"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      <button
        onClick={() => onSetCameraMode(cameraMode === 'free' ? 'player' : 'free')}
        className={`btn-secondary !px-2 !py-1.5 text-xs ${
          cameraMode === 'player'
            ? '!bg-brand-50 !border-brand-300 !text-brand-700 dark:!bg-brand-900/30 dark:!border-brand-700 dark:!text-brand-300'
            : ''
        }`}
        title="切换摄像机模式"
      >
        <Camera className="w-4 h-4" />
        {cameraMode === 'free' ? '自由视角' : '玩家视角'}
      </button>

      {cameraMode === 'player' && currentSceneId && (
        <button
          onClick={onTriggerSaveCamera}
          className="btn-secondary !px-2 !py-1.5 text-xs !bg-amber-50 dark:!bg-amber-900/20 !border-amber-300 dark:!border-amber-700 !text-amber-700 dark:!text-amber-400"
          title="保存当前视角为玩家视角"
        >
          <Save className="w-4 h-4" />
          保存视角
        </button>
      )}

      <button
        onClick={onToggleSceneMap}
        className={`btn-secondary !px-2 !py-1.5 text-xs ${
          showSceneMap
            ? '!bg-brand-50 !border-brand-300 !text-brand-700 dark:!bg-brand-900/30 dark:!border-brand-700 dark:!text-brand-300'
            : ''
        }`}
        title="思维导图/场面地图"
      >
        <Network className="w-4 h-4" />
        思维导图
      </button>

      <div className="flex-1" />

      <button
        onClick={onToggleTheme}
        className="btn-icon"
        title={isDark ? '切换到浅色模式' : '切换到深色模式'}
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {user && <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:inline">{user}</span>}

      <button
        onClick={onPlayDemo}
        className="btn-secondary !bg-amber-50 dark:!bg-amber-900/20 !border-amber-300 dark:!border-amber-700 !text-amber-700 dark:!text-amber-400"
        title="进入演示模式"
      >
        <Play className="w-4 h-4 fill-current" />
        演示
      </button>

      <button
        onClick={onExport}
        className="btn-secondary"
        title="导出私有格式 .selert"
      >
        <Download className="w-4 h-4" />
        导出
      </button>
      {exportStatus && <span className="text-xs text-slate-500 dark:text-slate-400">{exportStatus}</span>}

      <button
        onClick={onSave}
        className="btn-primary"
        title="保存谱面"
      >
        <Save className="w-4 h-4" />
        保存
      </button>
      {saveStatus && <span className="text-xs text-slate-500 dark:text-slate-400">{saveStatus}</span>}

      <button
        onClick={onToggleShortcuts}
        className="btn-icon"
        title="快捷键说明"
      >
        <HelpCircle className="w-5 h-5" />
      </button>
    </div>
  )
}

interface LeftToolbarProps {
  tool: Tool
  snap: 4 | 8 | 16
  onSetTool: (tool: Tool) => void
  onSetSnap: (snap: 4 | 8 | 16) => void
}

function LeftToolbar({ tool, snap, onSetTool, onSetSnap }: LeftToolbarProps) {
  return (
    <div className="w-16 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col items-center py-3 gap-2 shrink-0 overflow-y-auto">
      {TOOLS.map((t) => (
        <button
          key={t.key}
          onClick={() => onSetTool(t.key)}
          title={`${t.label} (${t.shortcut})`}
          className={`w-12 h-12 flex flex-col items-center justify-center text-xs font-medium rounded-lg transition-all duration-200 ease-ui focus:outline-none focus:ring-2 focus:ring-brand-500/50 ${
            tool === t.key
              ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-700/50'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 border border-transparent'
          }`}
        >
          {t.icon}
          <span className="text-[10px] mt-0.5">{t.label}</span>
        </button>
      ))}
      <div className="flex-1" />
      <select
        value={snap}
        onChange={(e) => onSetSnap(Number(e.target.value) as 4 | 8 | 16)}
        className="w-12 text-center text-xs bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
        title="网格吸附"
      >
        <option value={4}>1/4</option>
        <option value={8}>1/8</option>
        <option value={16}>1/16</option>
      </select>
    </div>
  )
}

interface BottomBarProps {
  isPlaying: boolean
  songTime: number
  duration: number
  playbackSpeed: number
  metronomeEnabled: boolean
  accuracy: number
  difficulty: number
  audioDisabled: boolean
  audioStatus: React.ReactNode
  onPlayPause: () => void
  onSeek: (time: number) => void
  onSpeedChange: (speed: number) => void
  onToggleMetronome: () => void
}

function BottomBar({
  isPlaying,
  songTime,
  duration,
  playbackSpeed,
  metronomeEnabled,
  accuracy,
  difficulty,
  audioDisabled,
  audioStatus,
  onPlayPause,
  onSeek,
  onSpeedChange,
  onToggleMetronome,
}: BottomBarProps) {
  return (
    <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <div className="min-h-14 h-auto flex flex-wrap items-center gap-3 px-4 py-2">
        {audioStatus}

        <button
          onClick={onPlayPause}
          disabled={audioDisabled}
          title={isPlaying ? '暂停' : '播放'}
          className="w-9 h-9 btn-primary !p-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        <span className="text-sm font-mono w-20 text-center tabular-nums text-slate-700 dark:text-slate-200">
          {formatTime(songTime)}
        </span>

        <input
          type="range"
          min={0}
          max={duration}
          step={0.01}
          value={songTime}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="flex-1 min-w-[8rem] slider"
        />

        <div className="flex items-center gap-2 text-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400">速度</span>
          <select
            value={playbackSpeed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="select input-sm text-xs"
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}x
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onToggleMetronome}
          disabled={audioDisabled}
          title="节拍器"
          className={`btn-secondary !px-2.5 !py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
            metronomeEnabled
              ? '!bg-brand-50 dark:!bg-brand-900/30 !border-brand-300 dark:!border-brand-700 !text-brand-700 dark:!text-brand-400'
              : ''
          }`}
        >
          <Music className="w-4 h-4" />
          <span className="hidden sm:inline">节拍器</span>
        </button>

        <div className="text-xs text-slate-600 dark:text-slate-300 w-28 text-right tabular-nums">
          <div>Acc {accuracy.toFixed(2)}%</div>
          <div className="text-slate-500 dark:text-slate-400">
            {rankFromAccuracy(accuracy)} · Rt{' '}
            {ratingFromAccuracy(difficulty, accuracy).toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  )
}
