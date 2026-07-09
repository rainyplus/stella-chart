import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { ChartData, Scene, JudgeBox, NoteData, Vector3, BackgroundLayer } from '../../shared/types.js'
import { NOTE_DISPLAY_NAMES } from '@/constants/noteTypes'

export type Tool = 'select' | 'tap' | 'catch' | 'kick' | 'hold' | 'stalid'
export type ViewMode = 'perspective' | 'top'
export type CameraMode = 'free' | 'player'
export type CameraPreset = 'top' | 'default' | 'low' | 'side' | 'free'

export const CAMERA_PRESETS: { id: CameraPreset; label: string }[] = [
  { id: 'top', label: '俯视' },
  { id: 'default', label: '45°' },
  { id: 'low', label: '低视角' },
  { id: 'side', label: '侧面' },
  { id: 'free', label: '自由' },
]
export type SnapDivision = 4 | 8 | 16

export interface HistoryEntry {
  chart: ChartData
  label: string
  timestamp: number
}

export interface EditorState {
  chart: ChartData | null
  currentSceneId: string | null
  currentJudgeBoxId: string | null
  tool: Tool
  snap: SnapDivision
  viewMode: ViewMode
  cameraMode: CameraMode
  cameraPreset: CameraPreset
  cameraRotationY: number
  songTime: number
  isPlaying: boolean
  playbackSpeed: number
  selectedNoteIds: string[]
  copiedNotes: NoteData[]
  holdStartNoteId: string | null
  stalidDraft: Vector3[] | null
  judgments: { noteId: string; judgment: string; time: number }[]
  totalScore: number
  accuracy: number
  result: { accuracy: number; rank: string; rating: number } | null
  undoStack: HistoryEntry[]
  redoStack: HistoryEntry[]
  loadChart: (chart: ChartData) => void
  setChart: (chart: ChartData) => void
  saveState: (label?: string) => void
  undo: () => void
  redo: () => void
  jumpToHistory: (index: number) => void
  setCurrentScene: (id: string) => void
  addScene: () => void
  setCurrentJudgeBox: (id: string) => void
  addJudgeBox: (sceneId: string) => void
  updateJudgeBox: (id: string, patch: Partial<JudgeBox>) => void
  updateScene: (id: string, patch: Partial<Scene>) => void
  updateSceneName: (id: string, name: string) => void
  updateSceneStartTime: (id: string, startTime: number) => void
  deleteScene: (sceneId: string) => void
  deleteJudgeBox: (id: string) => void
  addSceneLink: (fromSceneId: string, toSceneId: string) => void
  removeSceneLink: (fromSceneId: string, toSceneId: string) => void
  updateChart: (patch: Partial<ChartData>) => void
  setTool: (tool: Tool) => void
  setSnap: (snap: SnapDivision) => void
  setViewMode: (mode: ViewMode) => void
  setCameraMode: (mode: CameraMode) => void
  setCameraPreset: (preset: CameraPreset) => void
  rotateCamera: (direction: 'cw' | 'ccw') => void
  saveCameraTrigger: number
  triggerSaveCamera: () => void
  setSongTime: (time: number) => void
  setIsPlaying: (playing: boolean) => void
  setPlaybackSpeed: (speed: number) => void
  selectNotes: (ids: string[]) => void
  addNote: (note: NoteData) => void
  updateNote: (id: string, patch: Partial<NoteData>) => void
  deleteNotes: (ids: string[]) => void
  copySelected: () => void
  pasteCopied: (offsetTime?: number) => void
  moveSelectedNotes: (delta: { x: number; y: number; z: number }) => void
  startHold: (note: NoteData) => void
  updateHoldDuration: (noteId: string, duration: number) => void
  finishHold: () => void
  addStalidNode: (point: Vector3) => void
  finishStalid: () => NoteData | null
  cancelStalid: () => void
  setJudgments: (judgments: { noteId: string; judgment: string; time: number }[]) => void
  setTotalScore: (score: number) => void
  setAccuracy: (accuracy: number) => void
  setResult: (result: { accuracy: number; rank: string; rating: number } | null) => void
  resetPlaybackStats: () => void
  selectedBackgroundLayerId: string | null
  setSelectedBackgroundLayer: (id: string | null) => void
  addBackgroundLayer: (layer: Omit<BackgroundLayer, 'id'>) => void
  updateBackgroundLayer: (id: string, patch: Partial<BackgroundLayer>) => void
  deleteBackgroundLayer: (id: string) => void
  moveBackgroundLayer: (id: string, direction: 'up' | 'down') => void
}

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export const useEditorStore = create<EditorState>((set, get) => ({
  chart: null,
  currentSceneId: null,
  currentJudgeBoxId: null,
  tool: 'select',
  snap: 4,
  viewMode: 'perspective',
  cameraMode: 'free',
  cameraPreset: 'default',
  cameraRotationY: 0,
  saveCameraTrigger: 0,
  songTime: 0,
  isPlaying: false,
  playbackSpeed: 1,
  selectedNoteIds: [],
  copiedNotes: [],
  holdStartNoteId: null,
  stalidDraft: null,
  judgments: [],
  totalScore: 0,
  accuracy: 0,
  result: null,
  undoStack: [],
  redoStack: [],
  selectedBackgroundLayerId: null,

  loadChart: (chart) => {
    const cloned = clone(chart)
    let maxEndTime = 0
    cloned.scenes.forEach((scene, index) => {
      if (scene.startTime === undefined) {
        const sceneMaxNoteTime = scene.notes.reduce((max, n) => Math.max(max, n.hitTime + (n.type === 'Hold' ? n.holdDuration : 0)), 0)
        scene.startTime = index === 0 ? 0 : maxEndTime
        maxEndTime = Math.max(maxEndTime, sceneMaxNoteTime + 5)
      } else {
        const sceneMaxNoteTime = scene.notes.reduce((max, n) => Math.max(max, n.hitTime + (n.type === 'Hold' ? n.holdDuration : 0)), 0)
        maxEndTime = Math.max(maxEndTime, scene.startTime + sceneMaxNoteTime + 5)
      }
    })
    if (cloned.backgroundText && !cloned.backgroundLayers) {
      cloned.backgroundLayers = [
        {
          id: uuidv4(),
          name: '背景文字',
          type: 'text',
          startTime: 0,
          endTime: maxEndTime,
          x: 0.5,
          y: 0.3,
          z: -15,
          text: cloned.backgroundText,
          fontSize: 60,
          fontFamily: 'sans-serif',
          fontWeight: 'bold',
          color: '#3b82f6',
          opacity: 0.15,
          animationIn: 'fade',
          animationOut: 'fade',
          animationDuration: 0.5,
        },
      ]
    }
    if (!cloned.backgroundLayers) {
      cloned.backgroundLayers = []
    }
    cloned.backgroundLayers.forEach((layer, index) => {
      if (!layer.name) {
        layer.name = layer.type === 'text' ? `文字层 ${index + 1}` : `图片层 ${index + 1}`
      }
      if (layer.z === undefined) {
        layer.z = -15
      }
      if (layer.animationIn === undefined) {
        layer.animationIn = 'none'
      }
      if (layer.animationOut === undefined) {
        layer.animationOut = 'none'
      }
      if (layer.animationDuration === undefined) {
        layer.animationDuration = 0.5
      }
    })
    const sceneId = cloned.scenes[0]?.id || ''
    const judgeBoxId = cloned.scenes[0]?.judgeBoxes[0]?.id || ''
    set({ chart: cloned, currentSceneId: sceneId, currentJudgeBoxId: judgeBoxId, undoStack: [], redoStack: [], selectedBackgroundLayerId: null })
  },

  setChart: (chart) => set({ chart }),

  saveState: (label = '操作') => {
    const { chart, undoStack } = get()
    if (!chart) return
    const entry: HistoryEntry = {
      chart: clone(chart),
      label,
      timestamp: Date.now(),
    }
    set({ undoStack: [...undoStack, entry], redoStack: [] })
  },

  undo: () => {
    const { chart, undoStack, redoStack } = get()
    if (!chart || undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    const currentEntry: HistoryEntry = {
      chart: clone(chart),
      label: '当前状态',
      timestamp: Date.now(),
    }
    set({
      chart: clone(prev.chart),
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, currentEntry],
    })
  },

  redo: () => {
    const { chart, undoStack, redoStack } = get()
    if (!chart || redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    const currentEntry: HistoryEntry = {
      chart: clone(chart),
      label: '当前状态',
      timestamp: Date.now(),
    }
    set({
      chart: clone(next.chart),
      undoStack: [...undoStack, currentEntry],
      redoStack: redoStack.slice(0, -1),
    })
  },

  jumpToHistory: (index) => {
    const { chart, undoStack, redoStack } = get()
    if (!chart) return
    const allHistory = [...undoStack, { chart: clone(chart), label: '当前状态', timestamp: Date.now() }, ...redoStack.reverse()]
    if (index < 0 || index >= allHistory.length) return
    const target = allHistory[index]
    const newUndoStack = allHistory.slice(0, index)
    const newRedoStack = allHistory.slice(index + 1).reverse()
    set({
      chart: clone(target.chart),
      undoStack: newUndoStack,
      redoStack: newRedoStack,
    })
  },

  setCurrentScene: (id) => {
    const chart = get().chart
    const scene = chart?.scenes.find((s) => s.id === id)
    set({ currentSceneId: id, currentJudgeBoxId: scene?.judgeBoxes[0]?.id || null, selectedNoteIds: [] })
  },

  addScene: () => {
    const { chart, saveState } = get()
    if (!chart) return
    saveState('添加场景')
    const sortedScenes = [...chart.scenes].sort((a, b) => a.startTime - b.startTime)
    const lastScene = sortedScenes[sortedScenes.length - 1]
    const lastSceneMaxNoteTime = lastScene?.notes.reduce((max, n) => Math.max(max, n.hitTime + (n.type === 'Hold' ? n.holdDuration : 0)), 0) || 0
    const defaultStartTime = lastScene ? lastScene.startTime + lastSceneMaxNoteTime + 10 : 0
    const newScene: Scene = {
      id: uuidv4(),
      name: `Scene ${chart.scenes.length + 1}`,
      judgeBoxes: [{ id: uuidv4(), name: 'Center', position: { x: 0, y: 0, z: 0 }, spawnDistance: 10 }],
      notes: [],
      sceneLinks: [],
      startTime: defaultStartTime,
    }
    const updated = { ...chart, scenes: [...chart.scenes, newScene] }
    set({ chart: updated, currentSceneId: newScene.id, currentJudgeBoxId: newScene.judgeBoxes[0].id })
  },

  setCurrentJudgeBox: (id) => set({ currentJudgeBoxId: id }),

  addJudgeBox: (sceneId) => {
    const { chart, saveState } = get()
    if (!chart) return
    saveState('添加判定框')
    const scene = chart.scenes.find((s) => s.id === sceneId)
    const count = scene?.judgeBoxes.length || 0
    const newBox: JudgeBox = {
      id: uuidv4(),
      name: `Box ${count + 1}`,
      position: { x: count * 3, y: 0, z: 0 },
      spawnDistance: 10,
    }
    const updated = {
      ...chart,
      scenes: chart.scenes.map((s) => (s.id === sceneId ? { ...s, judgeBoxes: [...s.judgeBoxes, newBox] } : s)),
    }
    set({ chart: updated, currentJudgeBoxId: newBox.id })
  },

  updateJudgeBox: (id, patch) => {
    const { chart, currentSceneId, saveState } = get()
    if (!chart || !currentSceneId) return
    const scene = chart.scenes.find((s) => s.id === currentSceneId)
    if (!scene) return
    const oldBox = scene.judgeBoxes.find((b) => b.id === id)
    if (!oldBox) return
    const posChanged = patch.position !== undefined && (
      patch.position.x !== oldBox.position.x ||
      patch.position.y !== oldBox.position.y ||
      patch.position.z !== oldBox.position.z
    )
    const newPos = patch.position || oldBox.position
    const dx = newPos.x - oldBox.position.x
    const dy = newPos.y - oldBox.position.y
    const dz = newPos.z - oldBox.position.z
    saveState('更新判定框')
    const updated = {
      ...chart,
      scenes: chart.scenes.map((s) =>
        s.id === currentSceneId
          ? {
              ...s,
              judgeBoxes: s.judgeBoxes.map((b) => (b.id === id ? { ...b, ...patch } as JudgeBox : b)),
              notes: posChanged
                ? s.notes.map((n) =>
                    n.judgeBoxId === id
                      ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy, z: n.position.z + dz } }
                      : n
                  )
                : s.notes,
            }
          : s
      ),
    }
    set({ chart: updated })
  },

  deleteJudgeBox: (id) => {
    const { chart, currentSceneId, saveState } = get()
    if (!chart || !currentSceneId) return
    const scene = chart.scenes.find((s) => s.id === currentSceneId)
    if (!scene || scene.judgeBoxes.length <= 1) return
    saveState('删除判定框')
    const updated = {
      ...chart,
      scenes: chart.scenes.map((s) =>
        s.id === currentSceneId
          ? {
              ...s,
              judgeBoxes: s.judgeBoxes.filter((b) => b.id !== id),
              notes: s.notes.map((n) => (n.judgeBoxId === id ? { ...n, judgeBoxId: undefined } : n)),
            }
          : s
      ),
    }
    const newScene = updated.scenes.find((s) => s.id === currentSceneId)
    const newJudgeBoxId = newScene?.judgeBoxes[0]?.id || null
    set({ chart: updated, currentJudgeBoxId: newJudgeBoxId, selectedNoteIds: [] })
  },

  updateScene: (id, patch) => {
    const { chart, saveState } = get()
    if (!chart) return
    saveState('更新场景')
    const updated = {
      ...chart,
      scenes: chart.scenes.map((s) => (s.id === id ? { ...s, ...patch } as Scene : s)),
    }
    set({ chart: updated })
  },

  updateSceneName: (id, name) => {
    const { chart, saveState } = get()
    if (!chart) return
    saveState('重命名场景')
    const updated = {
      ...chart,
      scenes: chart.scenes.map((s) => (s.id === id ? { ...s, name } : s)),
    }
    set({ chart: updated })
  },

  updateSceneStartTime: (id, startTime) => {
    const { chart, saveState } = get()
    if (!chart) return
    saveState('更新场景开始时间')
    const updated = {
      ...chart,
      scenes: chart.scenes.map((s) => (s.id === id ? { ...s, startTime: Math.max(0, startTime) } : s)),
    }
    set({ chart: updated })
  },

  deleteScene: (sceneId) => {
    const { chart, saveState } = get()
    if (!chart || chart.scenes.length <= 1) return
    saveState('删除场景')
    const updatedScenes = chart.scenes.filter((s) => s.id !== sceneId)
    const cleanedScenes = updatedScenes.map((s) => ({
      ...s,
      sceneLinks: s.sceneLinks?.filter((id) => id !== sceneId),
    }))
    const firstSceneId = cleanedScenes[0]?.id || null
    const firstJudgeBoxId = cleanedScenes[0]?.judgeBoxes[0]?.id || null
    set({
      chart: { ...chart, scenes: cleanedScenes },
      currentSceneId: firstSceneId,
      currentJudgeBoxId: firstJudgeBoxId,
      selectedNoteIds: [],
    })
  },

  addSceneLink: (fromSceneId, toSceneId) => {
    const { chart, saveState } = get()
    if (!chart) return
    saveState('添加场景链接')
    const updated = {
      ...chart,
      scenes: chart.scenes.map((s) => {
        if (s.id !== fromSceneId) return s
        const links = s.sceneLinks || []
        if (links.includes(toSceneId)) return s
        return { ...s, sceneLinks: [...links, toSceneId] }
      }),
    }
    set({ chart: updated })
  },

  removeSceneLink: (fromSceneId, toSceneId) => {
    const { chart, saveState } = get()
    if (!chart) return
    saveState('移除场景链接')
    const updated = {
      ...chart,
      scenes: chart.scenes.map((s) => {
        if (s.id !== fromSceneId) return s
        if (!s.sceneLinks) return s
        return { ...s, sceneLinks: s.sceneLinks.filter((id) => id !== toSceneId) }
      }),
    }
    set({ chart: updated })
  },

  updateChart: (patch) => {
    const { chart, saveState } = get()
    if (!chart) return
    saveState('更新谱面信息')
    set({ chart: { ...chart, ...patch } })
  },

  setTool: (tool) => set({ tool, selectedNoteIds: [], stalidDraft: tool === 'stalid' ? [] : null }),

  setSnap: (snap) => set({ snap }),

  setViewMode: (mode) => set({ viewMode: mode }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setCameraPreset: (preset) => set({ cameraPreset: preset }),
  rotateCamera: (direction) => set((state) => {
    const step = Math.PI / 2
    const delta = direction === 'cw' ? step : -step
    return { cameraRotationY: state.cameraRotationY + delta, cameraPreset: 'free' }
  }),
  triggerSaveCamera: () => set((state) => ({ saveCameraTrigger: state.saveCameraTrigger + 1 })),

  setSongTime: (time) => set({ songTime: Math.max(0, time) }),

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  selectNotes: (ids) => set({ selectedNoteIds: ids }),

  addNote: (note) => {
    const { chart, currentSceneId, saveState } = get()
    if (!chart || !currentSceneId) return
    const scene = chart.scenes.find((s) => s.id === currentSceneId)
    if (!scene) return
    const TIME_THRESHOLD = 0.01
    const POS_THRESHOLD = 0.1
    const isDuplicate = scene.notes.some((n) => {
      if (n.type !== note.type) return false
      if (n.judgeBoxId !== note.judgeBoxId) return false
      if (Math.abs(n.hitTime - note.hitTime) > TIME_THRESHOLD) return false
      const dx = n.position.x - note.position.x
      const dy = n.position.y - note.position.y
      const dz = n.position.z - note.position.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      return dist < POS_THRESHOLD
    })
    if (isDuplicate) return
    saveState(`添加${NOTE_DISPLAY_NAMES[note.type]}音符`)
    const updated = {
      ...chart,
      scenes: chart.scenes.map((s) => (s.id === currentSceneId ? { ...s, notes: [...s.notes, note] } : s)),
    }
    set({ chart: updated, selectedNoteIds: [note.id] })
  },

  updateNote: (id, patch) => {
    const { chart, currentSceneId, saveState } = get()
    if (!chart || !currentSceneId) return
    saveState('更新音符')
    const updated = {
      ...chart,
      scenes: chart.scenes.map((s) =>
        s.id === currentSceneId ? { ...s, notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch } as NoteData : n)) } : s
      ),
    }
    set({ chart: updated })
  },

  deleteNotes: (ids) => {
    const { chart, currentSceneId, saveState } = get()
    if (!chart || !currentSceneId) return
    saveState(`删除${ids.length}个音符`)
    const updated = {
      ...chart,
      scenes: chart.scenes.map((s) =>
        s.id === currentSceneId ? { ...s, notes: s.notes.filter((n) => !ids.includes(n.id)) } : s
      ),
    }
    set({ chart: updated, selectedNoteIds: [] })
  },

  copySelected: () => {
    const { chart, currentSceneId, selectedNoteIds } = get()
    if (!chart || !currentSceneId) return
    const notes = chart.scenes.find((s) => s.id === currentSceneId)?.notes.filter((n) => selectedNoteIds.includes(n.id)) || []
    set({ copiedNotes: clone(notes) })
  },

  pasteCopied: (offsetTime = 0) => {
    const { chart, currentSceneId, copiedNotes, saveState } = get()
    if (!chart || !currentSceneId || copiedNotes.length === 0) return
    saveState(`粘贴${copiedNotes.length}个音符`)
    const newNotes = copiedNotes.map((n) => ({ ...clone(n), id: uuidv4(), hitTime: n.hitTime + offsetTime, spawnTime: n.spawnTime + offsetTime }))
    const updated = {
      ...chart,
      scenes: chart.scenes.map((s) => (s.id === currentSceneId ? { ...s, notes: [...s.notes, ...newNotes] } : s)),
    }
    set({ chart: updated, selectedNoteIds: newNotes.map((n) => n.id) })
  },

  moveSelectedNotes: (delta) => {
    const { chart, currentSceneId, selectedNoteIds, saveState } = get()
    if (!chart || !currentSceneId || selectedNoteIds.length === 0) return
    saveState(`移动${selectedNoteIds.length}个音符`)
    const updated = {
      ...chart,
      scenes: chart.scenes.map((s) =>
        s.id === currentSceneId
          ? {
              ...s,
              notes: s.notes.map((n) =>
                selectedNoteIds.includes(n.id)
                  ? { ...n, position: { x: n.position.x + delta.x, y: n.position.y + delta.y, z: n.position.z + delta.z } }
                  : n
              ),
            }
          : s
      ),
    }
    set({ chart: updated })
  },

  startHold: (note) => {
    const { currentSceneId, addNote } = get()
    if (!currentSceneId) return
    addNote(note)
    set({ holdStartNoteId: note.id })
  },

  updateHoldDuration: (noteId, duration) => {
    const { chart, currentSceneId } = get()
    if (!chart || !currentSceneId) return
    const updated = {
      ...chart,
      scenes: chart.scenes.map((s) =>
        s.id === currentSceneId
          ? { ...s, notes: s.notes.map((n) => (n.id === noteId && n.type === 'Hold' ? { ...n, holdDuration: duration } : n)) }
          : s
      ),
    }
    set({ chart: updated })
  },

  finishHold: () => set({ holdStartNoteId: null }),

  addStalidNode: (point) => {
    set((state) => ({ stalidDraft: [...(state.stalidDraft || []), point] }))
  },

  finishStalid: () => {
    const { stalidDraft, currentSceneId, currentJudgeBoxId, songTime, chart, saveState } = get()
    if (!stalidDraft || stalidDraft.length < 2 || !currentSceneId || !chart) return null
    saveState('添加Stalid音符')
    const note: NoteData = {
      id: uuidv4(),
      type: 'Stalid',
      sceneId: currentSceneId,
      judgeBoxId: currentJudgeBoxId || undefined,
      spawnTime: songTime,
      hitTime: songTime + 1,
      position: stalidDraft[0],
      pathNodes: stalidDraft,
      moveSpeed: 1,
    }
    const updated = {
      ...chart,
      scenes: chart.scenes.map((s) => (s.id === currentSceneId ? { ...s, notes: [...s.notes, note] } : s)),
    }
    set({ chart: updated, stalidDraft: null, selectedNoteIds: [note.id] })
    return note
  },

  cancelStalid: () => set({ stalidDraft: null, tool: 'select' }),

  setJudgments: (judgments) => set({ judgments }),

  setTotalScore: (score) => set({ totalScore: score }),

  setAccuracy: (accuracy) => set({ accuracy }),

  setResult: (result) => set({ result }),

  resetPlaybackStats: () => set({ judgments: [], totalScore: 0, accuracy: 0, result: null }),

  setSelectedBackgroundLayer: (id) => set({ selectedBackgroundLayerId: id }),

  addBackgroundLayer: (layer) => {
    const { chart, saveState } = get()
    if (!chart) return
    saveState('添加背景层')
    const newLayer: BackgroundLayer = { ...layer, id: uuidv4() }
    const layers = chart.backgroundLayers || []
    const updated = { ...chart, backgroundLayers: [...layers, newLayer] }
    set({ chart: updated, selectedBackgroundLayerId: newLayer.id })
  },

  updateBackgroundLayer: (id, patch) => {
    const { chart, saveState } = get()
    if (!chart || !chart.backgroundLayers) return
    saveState('更新背景层')
    const updated = {
      ...chart,
      backgroundLayers: chart.backgroundLayers.map((l) =>
        l.id === id ? { ...l, ...patch } : l
      ),
    }
    set({ chart: updated })
  },

  deleteBackgroundLayer: (id) => {
    const { chart, saveState, selectedBackgroundLayerId } = get()
    if (!chart || !chart.backgroundLayers) return
    saveState('删除背景层')
    const updated = {
      ...chart,
      backgroundLayers: chart.backgroundLayers.filter((l) => l.id !== id),
    }
    set({
      chart: updated,
      selectedBackgroundLayerId: selectedBackgroundLayerId === id ? null : selectedBackgroundLayerId,
    })
  },

  moveBackgroundLayer: (id, direction) => {
    const { chart, saveState } = get()
    if (!chart || !chart.backgroundLayers) return
    const layers = [...chart.backgroundLayers]
    const index = layers.findIndex((l) => l.id === id)
    if (index === -1) return
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= layers.length) return
    saveState('移动背景层')
    ;[layers[index], layers[newIndex]] = [layers[newIndex], layers[index]]
    set({ chart: { ...chart, backgroundLayers: layers } })
  },
}))
