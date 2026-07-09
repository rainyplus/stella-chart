import { useMemo } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { History, ChevronUp, ChevronDown, Clock } from 'lucide-react'

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  const s = date.getSeconds().toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

export default function HistoryPanel() {
  const undoStack = useEditorStore((s) => s.undoStack)
  const redoStack = useEditorStore((s) => s.redoStack)
  const jumpToHistory = useEditorStore((s) => s.jumpToHistory)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)

  const allHistory = useMemo(() => {
    const history = [...undoStack.map((e, i) => ({ ...e, index: i, isCurrent: false }))]
    const currentIndex = undoStack.length
    history.push({
      chart: null as any,
      label: '当前状态',
      timestamp: Date.now(),
      index: currentIndex,
      isCurrent: true,
    })
    const reversedRedo = [...redoStack].reverse()
    reversedRedo.forEach((e, i) => {
      history.push({ ...e, index: currentIndex + 1 + i, isCurrent: false })
    })
    return history
  }, [undoStack, redoStack])

  const canUndo = undoStack.length > 0
  const canRedo = redoStack.length > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-endfield-accent-cyan" />
          <h3 className="text-sm font-medium text-zinc-300">历史记录</h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed ef-btn-hover"
            title="撤销"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed ef-btn-hover"
            title="重做"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="text-xs text-zinc-500">
        共 {allHistory.length} 条记录
      </div>

      <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
        {allHistory.slice().reverse().map((entry) => (
          <button
            key={entry.index}
            onClick={() => !entry.isCurrent && jumpToHistory(entry.index)}
            className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ef-btn-hover ${
              entry.isCurrent
                ? 'bg-endfield-accent-cyan/20 text-endfield-accent-cyan-light border border-endfield-accent-cyan/40'
                : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate">{entry.label}</span>
              <div className="flex items-center gap-1 text-xs text-zinc-500 shrink-0">
                <Clock className="w-3 h-3" />
                {formatTime(entry.timestamp)}
              </div>
            </div>
            {entry.isCurrent && (
              <div className="text-xs text-endfield-accent-cyan/70 mt-0.5">
                ● 当前位置
              </div>
            )}
          </button>
        ))}
        {allHistory.length === 0 && (
          <div className="text-xs text-zinc-600 text-center py-4">
            暂无历史记录
          </div>
        )}
      </div>
    </div>
  )
}
