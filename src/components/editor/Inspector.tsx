import { useState } from 'react'
import { useEditorStore } from '@/store/editorStore'
import CalibrationPanel from './CalibrationPanel'
import BackgroundLayersPanel from './BackgroundLayersPanel'
import HistoryPanel from './HistoryPanel'
import { NOTE_DISPLAY_NAMES } from '@/constants/noteTypes'
import type { NoteData, Vector3, SceneCamera, ChartData } from '../../../shared/types.js'

function TextInput({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  label: string
  placeholder?: string
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-slate-500 dark:text-slate-400 w-16 shrink-0 text-xs">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-sm flex-1 min-w-0"
      />
    </div>
  )
}

function TextAreaInput({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  label: string
  placeholder?: string
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all duration-200 ease-ui resize-none"
      />
    </div>
  )
}

function NumberInput({
  value,
  onChange,
  step = 1,
  label,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  label: string
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-slate-500 dark:text-slate-400 w-16 shrink-0 text-xs">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input-sm flex-1 min-w-0 tabular-nums"
      />
    </div>
  )
}

function VectorInput({ value, onChange, label }: { value: Vector3; onChange: (v: Vector3) => void; label: string }) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <div className="grid grid-cols-3 gap-2">
        <input
          type="number"
          step={0.1}
          value={value.x}
          onChange={(e) => onChange({ ...value, x: Number(e.target.value) })}
          className="input-sm text-xs tabular-nums text-center"
          placeholder="x"
        />
        <input
          type="number"
          step={0.1}
          value={value.y}
          onChange={(e) => onChange({ ...value, y: Number(e.target.value) })}
          className="input-sm text-xs tabular-nums text-center"
          placeholder="y"
        />
        <input
          type="number"
          step={0.1}
          value={value.z}
          onChange={(e) => onChange({ ...value, z: Number(e.target.value) })}
          className="input-sm text-xs tabular-nums text-center"
          placeholder="z"
        />
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{children}</h3>
}

export default function Inspector() {
  const chart = useEditorStore((s) => s.chart)
  const currentSceneId = useEditorStore((s) => s.currentSceneId)
  const currentJudgeBoxId = useEditorStore((s) => s.currentJudgeBoxId)
  const selectedNoteIds = useEditorStore((s) => s.selectedNoteIds)
  const updateNote = useEditorStore((s) => s.updateNote)
  const updateJudgeBox = useEditorStore((s) => s.updateJudgeBox)
  const deleteJudgeBox = useEditorStore((s) => s.deleteJudgeBox)
  const setCurrentJudgeBox = useEditorStore((s) => s.setCurrentJudgeBox)
  const addJudgeBox = useEditorStore((s) => s.addJudgeBox)
  const updateSceneName = useEditorStore((s) => s.updateSceneName)
  const updateSceneStartTime = useEditorStore((s) => s.updateSceneStartTime)
  const updateScene = useEditorStore((s) => s.updateScene)
  const cameraMode = useEditorStore((s) => s.cameraMode)
  const setCameraMode = useEditorStore((s) => s.setCameraMode)
  const triggerSaveCamera = useEditorStore((s) => s.triggerSaveCamera)
  const deleteNotes = useEditorStore((s) => s.deleteNotes)
  const updateChart = useEditorStore((s) => s.updateChart)

  if (!chart || !currentSceneId) {
    return (
      <div className="p-4 flex items-center justify-center h-full text-slate-500 dark:text-slate-400 text-sm">
        未加载谱面
      </div>
    )
  }

  const scene = chart.scenes.find((s) => s.id === currentSceneId)
  const judgeBox = scene?.judgeBoxes.find((b) => b.id === currentJudgeBoxId)
  const selectedNotes = scene?.notes.filter((n) => selectedNoteIds.includes(n.id)) || []
  const totalNotes = chart.scenes.reduce((sum, s) => sum + s.notes.length, 0)

  return (
    <div className="h-full overflow-y-auto p-4 space-y-5">
      {selectedNotes.length === 1 && (
        <NoteInspector
          note={selectedNotes[0]}
          chart={chart}
          onUpdate={(patch) => updateNote(selectedNotes[0].id, patch)}
          onDelete={() => deleteNotes([selectedNotes[0].id])}
        />
      )}

      {selectedNotes.length > 1 && (
        <BatchOffsetInspector notes={selectedNotes} onUpdate={updateNote} />
      )}

      {selectedNotes.length === 0 && (
        <>
          <div className="space-y-3">
            <SectionTitle>场景</SectionTitle>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 dark:text-slate-400 w-16 shrink-0 text-xs">名称</span>
              <input
                value={scene?.name || ''}
                onChange={(e) => scene && updateSceneName(scene.id, e.target.value)}
                className="input-sm flex-1 min-w-0"
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 dark:text-slate-400 w-16 shrink-0 text-xs">开始时间</span>
              <input
                type="number"
                step="0.01"
                value={scene?.startTime ?? 0}
                onChange={(e) => scene && updateSceneStartTime(scene.id, Math.max(0, Number(e.target.value)))}
                className="input-sm flex-1 min-w-0 tabular-nums font-mono"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionTitle>玩家视角</SectionTitle>
              <button
                onClick={() => setCameraMode(cameraMode === 'free' ? 'player' : 'free')}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors duration-200 ease-ui ${
                  cameraMode === 'player'
                    ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-700/50'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {cameraMode === 'free' ? '自由' : '玩家'}
              </button>
            </div>
            {scene?.camera ? (
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <VectorInput
                  label="位置"
                  value={scene.camera.position}
                  onChange={(position) => updateScene(scene.id, { camera: { ...scene.camera!, position } })}
                />
                <VectorInput
                  label="目标点"
                  value={scene.camera.target}
                  onChange={(target) => updateScene(scene.id, { camera: { ...scene.camera!, target } })}
                />
                {scene.camera.fov !== undefined && (
                  <NumberInput
                    label="视场角"
                    value={scene.camera.fov}
                    step={1}
                    onChange={(fov) => updateScene(scene.id, { camera: { ...scene.camera!, fov } })}
                  />
                )}
                <div className="flex gap-2">
                  <button
                    onClick={triggerSaveCamera}
                    className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 transition-colors duration-200 ease-ui"
                  >
                    保存当前视角
                  </button>
                  <button
                    onClick={() => updateScene(scene.id, { camera: undefined })}
                    className="text-xs px-2 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-700/50 transition-colors duration-200 ease-ui"
                  >
                    重置
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">当前场景未设置玩家视角</p>
                <button
                  onClick={triggerSaveCamera}
                  className="w-full text-xs px-2 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/30 border border-brand-200 dark:border-brand-700/50 transition-colors duration-200 ease-ui"
                >
                  使用当前视角
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionTitle>判定框</SectionTitle>
              <button
                onClick={() => currentSceneId && addJudgeBox(currentSceneId)}
                className="text-xs px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/30 border border-brand-200 dark:border-brand-700/50 transition-colors duration-200 ease-ui"
              >
                + 添加
              </button>
            </div>
            <div className="space-y-1.5">
              {scene?.judgeBoxes.map((box) => (
                <button
                  key={box.id}
                  onClick={() => setCurrentJudgeBox(box.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors duration-200 ease-ui ${
                    box.id === currentJudgeBoxId
                      ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-700/50'
                      : 'bg-white/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {box.name}
                </button>
              ))}
            </div>
            {judgeBox && (
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500 dark:text-slate-400 w-16 shrink-0 text-xs">名称</span>
                  <input
                    value={judgeBox.name}
                    onChange={(e) => updateJudgeBox(judgeBox.id, { name: e.target.value })}
                    className="input-sm flex-1 min-w-0"
                  />
                </div>
                <VectorInput
                  label="位置"
                  value={judgeBox.position}
                  onChange={(position) => updateJudgeBox(judgeBox.id, { position })}
                />
                <NumberInput
                  label="生成距"
                  value={judgeBox.spawnDistance}
                  step={0.5}
                  onChange={(spawnDistance) => updateJudgeBox(judgeBox.id, { spawnDistance })}
                />
                <button
                  onClick={() => deleteJudgeBox(judgeBox.id)}
                  disabled={!scene || scene.judgeBoxes.length <= 1}
                  className="w-full text-xs px-2 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-700/50 transition-colors duration-200 ease-ui disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  删除判定框
                </button>
              </div>
            )}
          </div>

          <BackgroundLayersPanel />

          <HistoryPanel />

          <div className="space-y-3">
            <SectionTitle>谱面信息</SectionTitle>
            <div className="space-y-2.5">
              <TextInput
                label="曲师"
                value={chart.artist || ''}
                onChange={(v) => updateChart({ artist: v })}
                placeholder="艺术家/作曲家"
              />
              <TextInput
                label="谱师"
                value={chart.charter || ''}
                onChange={(v) => updateChart({ charter: v })}
                placeholder="谱面作者"
              />
            </div>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">场面数</span>
                  <span className="text-slate-700 dark:text-slate-200 font-mono tabular-nums text-xs">{chart.scenes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">总音符</span>
                  <span className="text-slate-700 dark:text-slate-200 font-mono tabular-nums text-xs">{totalNotes}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <CalibrationPanel />
    </div>
  )
}

function NoteInspector({ note, chart, onUpdate, onDelete }: { note: NoteData; chart: ChartData; onUpdate: (patch: Partial<NoteData>) => void; onDelete: () => void }) {
  const updatePosition = (position: Vector3) => onUpdate({ position })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{NOTE_DISPLAY_NAMES[note.type]} 音符</h3>
        <button
          onClick={onDelete}
          className="text-xs px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-700/50 transition-colors duration-200 ease-ui"
        >
          删除
        </button>
      </div>

      <NumberInput label="HitTime" value={note.hitTime} step={0.01} onChange={(hitTime) => onUpdate({ hitTime })} />
      <NumberInput label="SpawnTime" value={note.spawnTime} step={0.01} onChange={(spawnTime) => onUpdate({ spawnTime })} />
      <VectorInput label="位置" value={note.position} onChange={updatePosition} />

      {note.type === 'Catch' && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={!!note.catchOnly}
            onChange={(e) => onUpdate({ catchOnly: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-brand-500 focus:ring-brand-500 focus:ring-offset-0"
          />
          <span className="text-slate-700 dark:text-slate-200 text-xs">仅接住 (catchOnly)</span>
        </label>
      )}

      {note.type === 'Kick' && (
        <div className="space-y-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">滑动方向</span>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step={0.01}
              value={note.direction.x}
              onChange={(e) => onUpdate({ direction: { ...note.direction, x: Number(e.target.value) } })}
              className="input-sm text-xs tabular-nums text-center"
              placeholder="x"
            />
            <input
              type="number"
              step={0.01}
              value={note.direction.y}
              onChange={(e) => onUpdate({ direction: { ...note.direction, y: Number(e.target.value) } })}
              className="input-sm text-xs tabular-nums text-center"
              placeholder="y"
            />
          </div>
        </div>
      )}

      {note.type === 'Hold' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">持续时间</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{(note.holdDuration * chart.bpm / 60).toFixed(2)} 四分音符</span>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              step={0.25}
              value={+(note.holdDuration * chart.bpm / 60).toFixed(3)}
              onChange={(e) => {
                const beats = Number(e.target.value) || 0
                const duration = (beats * 60) / chart.bpm
                onUpdate({ holdDuration: Math.max(0, duration) })
              }}
              className="input-sm flex-1 min-w-0 text-xs tabular-nums"
            />
            <span className="text-xs text-slate-500 dark:text-slate-400 self-center">拍</span>
          </div>
        </div>
      )}

      {note.type === 'Stalid' && (
        <div className="space-y-3">
          <NumberInput label="移动速度" value={note.moveSpeed} step={0.1} onChange={(moveSpeed) => onUpdate({ moveSpeed })} />
          <div className="space-y-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">路径节点</span>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {note.pathNodes.map((node, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">节点 {idx + 1}</span>
                    <button
                      onClick={() => {
                        const next = note.pathNodes.filter((_, i) => i !== idx)
                        if (next.length >= 2) onUpdate({ pathNodes: next })
                      }}
                      className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                    >
                      删除
                    </button>
                  </div>
                  <VectorInput
                    label=""
                    value={node}
                    onChange={(v) => {
                      const next = [...note.pathNodes]
                      next[idx] = v
                      onUpdate({ pathNodes: next })
                    }}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => onUpdate({ pathNodes: [...note.pathNodes, { ...note.pathNodes[note.pathNodes.length - 1] }] })}
              className="w-full text-xs px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors duration-200 ease-ui"
            >
              + 添加节点
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function BatchOffsetInspector({ notes, onUpdate }: { notes: NoteData[]; onUpdate: (id: string, patch: Partial<NoteData>) => void }) {
  const [offset, setOffset] = useState(0)

  const apply = () => {
    for (const note of notes) {
      onUpdate(note.id, {
        hitTime: note.hitTime + offset,
        spawnTime: note.spawnTime + offset,
      })
    }
  }

  return (
    <div className="space-y-3">
      <SectionTitle>批量编辑</SectionTitle>
      <p className="text-xs text-slate-500 dark:text-slate-400">已选中 {notes.length} 个音符</p>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500 dark:text-slate-400 w-20 shrink-0 text-xs">整体时间偏移</span>
        <input
          type="number"
          step={0.01}
          value={offset}
          onChange={(e) => setOffset(Number(e.target.value))}
          className="input-sm flex-1 min-w-0 tabular-nums"
        />
        <button
          onClick={apply}
          className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-sm font-medium text-white transition-colors duration-200 ease-ui"
        >
          应用
        </button>
      </div>
    </div>
  )
}
