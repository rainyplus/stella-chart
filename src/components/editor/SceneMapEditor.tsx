import { useState, useMemo, useRef, useEffect } from 'react'
import { Plus, Trash2, Edit3, Clock, Check, X, Music, Target, AlertTriangle } from 'lucide-react'
import type { ChartData, Scene } from '../../../shared/types.js'
import { cn } from '@/lib/utils'

export interface SceneMapEditorProps {
  chart: ChartData
  currentSceneId: string
  onSelectScene: (sceneId: string) => void
  onAddScene: () => void
  onDeleteScene: (sceneId: string) => void
  onRenameScene: (sceneId: string, name: string) => void
  onUpdateSceneStartTime: (sceneId: string, startTime: number) => void
}

const CARD_WIDTH = 200
const CARD_HEIGHT = 130
const PADDING_LEFT = 80
const PADDING_RIGHT = 40
const PADDING_TOP = 60
const PADDING_BOTTOM = 40
const PIXELS_PER_SECOND = 30
const ROW_HEIGHT = 160

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

function getDifficultyLabel(difficulty: number): { label: string; color: string } {
  if (difficulty >= 15) return { label: 'MAX', color: 'text-red-400 bg-red-900/30 border-red-500/50' }
  if (difficulty >= 12) return { label: 'EXPERT', color: 'text-purple-400 bg-purple-900/30 border-purple-500/50' }
  if (difficulty >= 9) return { label: 'HARD', color: 'text-orange-400 bg-orange-900/30 border-orange-500/50' }
  if (difficulty >= 6) return { label: 'NORMAL', color: 'text-blue-400 bg-blue-900/30 border-blue-500/50' }
  return { label: 'EASY', color: 'text-green-400 bg-green-900/30 border-green-500/50' }
}

interface SceneCardProps {
  scene: Scene
  isSelected: boolean
  x: number
  y: number
  difficulty: number
  onSelect: () => void
  onDelete: () => void
  onRename: (name: string) => void
  onStartTimeChange: (time: number) => void
}

function SceneCard({
  scene,
  isSelected,
  x,
  y,
  difficulty,
  onSelect,
  onDelete,
  onRename,
  onStartTimeChange,
}: SceneCardProps) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingTime, setIsEditingTime] = useState(false)
  const [editName, setEditName] = useState(scene.name)
  const [editTime, setEditTime] = useState(scene.startTime.toString())
  const nameInputRef = useRef<HTMLInputElement>(null)
  const timeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [isEditingName])

  useEffect(() => {
    if (isEditingTime && timeInputRef.current) {
      timeInputRef.current.focus()
      timeInputRef.current.select()
    }
  }, [isEditingTime])

  const handleRenameSubmit = () => {
    if (editName.trim()) {
      onRename(editName.trim())
    }
    setIsEditingName(false)
  }

  const handleRenameCancel = () => {
    setEditName(scene.name)
    setIsEditingName(false)
  }

  const handleTimeSubmit = () => {
    const time = parseFloat(editTime)
    if (!isNaN(time) && time >= 0) {
      onStartTimeChange(time)
    } else {
      setEditTime(scene.startTime.toString())
    }
    setIsEditingTime(false)
  }

  const handleTimeCancel = () => {
    setEditTime(scene.startTime.toString())
    setIsEditingTime(false)
  }

  const diffInfo = getDifficultyLabel(difficulty)
  const noteCount = scene.notes.length
  const judgeBoxCount = scene.judgeBoxes.length

  return (
    <div
      className={cn(
        'absolute transition-all duration-200 select-none',
        isSelected && 'z-10'
      )}
      style={{
        left: x,
        top: y,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
      }}
    >
      <div
        className={cn(
          'relative w-full h-full cursor-pointer overflow-hidden',
          'border-2 transition-all duration-200',
          isSelected
            ? 'border-arknights-accent-blue shadow-arknights-glow bg-arknights-bg-panel'
            : 'border-arknights-border bg-arknights-bg-card hover:border-arknights-border-light',
        )}
        onClick={(e) => {
          if (!isEditingName && !isEditingTime) {
            e.stopPropagation()
            onSelect()
          }
        }}
        style={{
          clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
        }}
      >
        <div
          className={cn(
            'absolute top-0 right-0 w-3 h-3',
            isSelected ? 'bg-arknights-accent-blue' : 'bg-arknights-border'
          )}
          style={{
            clipPath: 'polygon(0 0, 100% 0, 100% 100%)',
          }}
        />
        <div
          className={cn(
            'absolute bottom-0 left-0 w-3 h-3',
            isSelected ? 'bg-arknights-accent-blue' : 'bg-arknights-border'
          )}
          style={{
            clipPath: 'polygon(0 0, 0 100%, 100% 100%)',
          }}
        />

        <div className="p-3 h-full flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-2">
            {isEditingName ? (
              <div className="flex-1 flex items-center gap-1">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSubmit()
                    if (e.key === 'Escape') handleRenameCancel()
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={handleRenameSubmit}
                  className="flex-1 min-w-0 px-1.5 py-0.5 text-sm bg-arknights-bg-primary border border-arknights-accent-blue text-arknights-text-primary focus:outline-none rounded-sm"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRenameSubmit()
                  }}
                  className="p-1 text-green-400 hover:text-green-300 transition-colors"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRenameCancel()
                  }}
                  className="p-1 text-red-400 hover:text-red-300 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <h3 className="text-sm font-semibold text-arknights-text-primary truncate flex-1">
                {scene.name}
              </h3>
            )}
            <div className={cn(
              'text-[10px] px-1.5 py-0.5 border font-bold tracking-wider shrink-0',
              diffInfo.color
            )}>
              {diffInfo.label}
            </div>
          </div>

          <div className="flex items-center gap-1.5 mb-2">
            <Clock size={12} className="text-arknights-gold shrink-0" />
            {isEditingTime ? (
              <div className="flex-1 flex items-center gap-1">
                <input
                  ref={timeInputRef}
                  type="number"
                  step="0.01"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTimeSubmit()
                    if (e.key === 'Escape') handleTimeCancel()
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={handleTimeSubmit}
                  className="flex-1 min-w-0 px-1.5 py-0.5 text-xs bg-arknights-bg-primary border border-arknights-gold text-arknights-text-primary focus:outline-none rounded-sm font-mono"
                />
              </div>
            ) : (
              <span
                className="text-xs text-arknights-text-secondary font-mono cursor-pointer hover:text-arknights-gold transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  setEditTime(scene.startTime.toString())
                  setIsEditingTime(true)
                }}
              >
                {formatTime(scene.startTime)}
              </span>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-center gap-1.5">
            <div className="flex items-center gap-2 text-xs text-arknights-text-secondary">
              <Music size={12} className="text-arknights-accent-blue-light shrink-0" />
              <span>{noteCount} 音符</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-arknights-text-secondary">
              <Target size={12} className="text-arknights-gold shrink-0" />
              <span>{judgeBoxCount} 判定框</span>
            </div>
          </div>

          <div className="flex items-center gap-1 pt-1 border-t border-arknights-border/50">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsEditingName(true)
              }}
              className="flex-1 flex items-center justify-center gap-1 py-1 text-[11px] text-arknights-text-muted hover:text-arknights-text-secondary transition-colors"
              title="重命名"
            >
              <Edit3 size={12} />
              重命名
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditTime(scene.startTime.toString())
                setIsEditingTime(true)
              }}
              className="flex-1 flex items-center justify-center gap-1 py-1 text-[11px] text-arknights-text-muted hover:text-arknights-gold transition-colors"
              title="调整时间"
            >
              <Clock size={12} />
              时间
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="flex-1 flex items-center justify-center gap-1 py-1 text-[11px] text-arknights-text-muted hover:text-red-400 transition-colors"
              title="删除场面"
            >
              <Trash2 size={12} />
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface DeleteConfirmModalProps {
  sceneName: string
  onConfirm: () => void
  onCancel: () => void
}

function DeleteConfirmModal({ sceneName, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <div
        className="bg-arknights-bg-panel border-2 border-arknights-border p-5 w-80"
        onClick={(e) => e.stopPropagation()}
        style={{
          clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 flex items-center justify-center bg-red-900/30 border border-red-500/50">
            <AlertTriangle size={20} className="text-red-400" />
          </div>
          <h3 className="text-base font-semibold text-arknights-text-primary">确认删除</h3>
        </div>
        <p className="text-sm text-arknights-text-secondary mb-5">
          确定要删除场面 <span className="text-arknights-text-primary font-medium">"{sceneName}"</span> 吗？
          <br />
          该操作无法撤销。
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 text-sm border border-arknights-border text-arknights-text-secondary hover:bg-arknights-bg-card hover:text-arknights-text-primary transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 text-sm bg-red-600/80 border border-red-500/60 text-white hover:bg-red-500 transition-colors"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SceneMapEditor({
  chart,
  currentSceneId,
  onSelectScene,
  onAddScene,
  onDeleteScene,
  onRenameScene,
  onUpdateSceneStartTime,
}: SceneMapEditorProps) {
  const [deleteSceneId, setDeleteSceneId] = useState<string | null>(null)

  const sortedScenes = useMemo(() => {
    return [...chart.scenes].sort((a, b) => a.startTime - b.startTime)
  }, [chart.scenes])

  const { totalWidth, totalHeight, timeMarkers } = useMemo(() => {
    if (sortedScenes.length === 0) {
      return { totalWidth: 600, totalHeight: 300, timeMarkers: [] }
    }

    const maxStartTime = sortedScenes[sortedScenes.length - 1].startTime
    const lastScene = sortedScenes[sortedScenes.length - 1]
    const lastSceneMaxNoteTime = lastScene.notes.reduce((max, n) => Math.max(max, n.hitTime + (n.type === 'Hold' ? n.holdDuration : 0)), 0)
    const maxTime = Math.max(maxStartTime + lastSceneMaxNoteTime + 10, maxStartTime + 30)

    const totalWidth = PADDING_LEFT + Math.ceil(maxTime) * PIXELS_PER_SECOND + PADDING_RIGHT
    const totalHeight = PADDING_TOP + ROW_HEIGHT + PADDING_BOTTOM

    const markers: { time: number; x: number; label: string; major: boolean }[] = []
    const interval = 5
    for (let t = 0; t <= maxTime; t += interval) {
      const x = PADDING_LEFT + t * PIXELS_PER_SECOND
      markers.push({
        time: t,
        x,
        label: formatTime(t),
        major: t % 30 === 0,
      })
    }

    return { totalWidth, totalHeight, timeMarkers: markers }
  }, [sortedScenes])

  const getSceneX = (scene: Scene) => {
    return PADDING_LEFT + scene.startTime * PIXELS_PER_SECOND
  }

  const deleteScene = chart.scenes.find((s) => s.id === deleteSceneId)

  if (chart.scenes.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-arknights-bg-primary border border-arknights-border">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center border-2 border-arknights-border bg-arknights-bg-card">
            <Target size={28} className="text-arknights-text-muted" />
          </div>
          <p className="text-arknights-text-muted text-sm mb-4">暂无场面</p>
          <button
            onClick={onAddScene}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-arknights-text-primary bg-arknights-accent-blue/20 border border-arknights-accent-blue/50 hover:bg-arknights-accent-blue/30 transition-colors"
          >
            <Plus size={16} />
            添加第一个场面
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col bg-arknights-bg-primary border border-arknights-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-arknights-border bg-arknights-bg-panel/50">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-arknights-gold" />
          <h2 className="text-sm font-semibold text-arknights-text-primary tracking-wide">时间轴场面地图</h2>
          <span className="text-xs text-arknights-text-muted">({chart.scenes.length} 个场面)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onAddScene}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-arknights-text-primary bg-arknights-accent-blue/20 border border-arknights-accent-blue/50 hover:bg-arknights-accent-blue/30 transition-colors"
          >
            <Plus size={14} />
            添加场面
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto relative">
        <div
          className="relative"
          style={{
            width: Math.max(totalWidth, 600),
            height: Math.max(totalHeight, 400),
            minWidth: '100%',
            minHeight: '100%',
          }}
        >
          <svg
            className="absolute inset-0 pointer-events-none"
            width={Math.max(totalWidth, 600)}
            height={Math.max(totalHeight, 400)}
          >
            {timeMarkers.map((marker) => (
              <g key={marker.time}>
                <line
                  x1={marker.x}
                  y1={PADDING_TOP - 20}
                  x2={marker.x}
                  y2={PADDING_TOP + ROW_HEIGHT + 20}
                  stroke={marker.major ? 'rgba(107, 114, 128, 0.4)' : 'rgba(107, 114, 128, 0.15)'}
                  strokeWidth={marker.major ? 1 : 0.5}
                />
                <text
                  x={marker.x}
                  y={PADDING_TOP - 28}
                  textAnchor="middle"
                  fill={marker.major ? '#9ca3af' : '#6b7280'}
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {marker.label}
                </text>
              </g>
            ))}

            <line
              x1={PADDING_LEFT}
              y1={PADDING_TOP + ROW_HEIGHT / 2}
              x2={Math.max(totalWidth, 600) - PADDING_RIGHT}
              y2={PADDING_TOP + ROW_HEIGHT / 2}
              stroke="rgba(107, 114, 128, 0.5)"
              strokeWidth={2}
            />

            {sortedScenes.map((scene, index) => {
              const nextScene = sortedScenes[index + 1]
              if (!nextScene) return null

              const fromX = getSceneX(scene) + CARD_WIDTH
              const fromY = PADDING_TOP + ROW_HEIGHT / 2
              const toX = getSceneX(nextScene)
              const toY = PADDING_TOP + ROW_HEIGHT / 2

              return (
                <g key={`connector-${scene.id}-${nextScene.id}`}>
                  <line
                    x1={fromX}
                    y1={fromY}
                    x2={toX}
                    y2={toY}
                    stroke="#6b7280"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                  <polygon
                    points={`${toX - 8},${toY - 5} ${toX},${toY} ${toX - 8},${toY + 5}`}
                    fill="#6b7280"
                  />
                </g>
              )
            })}
          </svg>

          {sortedScenes.map((scene) => {
            const x = getSceneX(scene)
            const y = PADDING_TOP + (ROW_HEIGHT - CARD_HEIGHT) / 2
            return (
              <SceneCard
                key={scene.id}
                scene={scene}
                isSelected={scene.id === currentSceneId}
                x={x}
                y={y}
                difficulty={chart.difficulty}
                onSelect={() => onSelectScene(scene.id)}
                onDelete={() => setDeleteSceneId(scene.id)}
                onRename={(name) => onRenameScene(scene.id, name)}
                onStartTimeChange={(time) => onUpdateSceneStartTime(scene.id, time)}
              />
            )
          })}
        </div>
      </div>

      <div className="px-4 py-2 border-t border-arknights-border bg-arknights-bg-panel/50">
        <div className="flex items-center gap-4 text-xs text-arknights-text-muted">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-arknights-accent-blue rounded-sm" />
            <span>当前选中</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={12} />
            <span>点击时间可编辑开始时间</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>场景按时间从左到右排列</span>
          </div>
        </div>
      </div>

      {deleteSceneId && deleteScene && (
        <DeleteConfirmModal
          sceneName={deleteScene.name}
          onConfirm={() => {
            onDeleteScene(deleteSceneId)
            setDeleteSceneId(null)
          }}
          onCancel={() => setDeleteSceneId(null)}
        />
      )}
    </div>
  )
}
