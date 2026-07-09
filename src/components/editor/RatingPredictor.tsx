import { useMemo, useState } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { ratingFromAccuracy } from '@/lib/chartUtils'

interface RatingPredictorProps {
  open: boolean
  onClose: () => void
}

interface ScoreEntry {
  id: string
  difficulty: number
  accuracy: number
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export default function RatingPredictor({ open, onClose }: RatingPredictorProps) {
  const chart = useEditorStore((s) => s.chart)
  const [scores, setScores] = useState<ScoreEntry[]>([])
  const [difficultyInput, setDifficultyInput] = useState('')
  const [accuracyInput, setAccuracyInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const currentDifficulty = chart?.difficulty || 0

  const computedScores = useMemo(() => {
    return scores.map((s) => ({
      ...s,
      rating: ratingFromAccuracy(s.difficulty, s.accuracy),
    }))
  }, [scores])

  const avgRating = useMemo(() => {
    if (computedScores.length === 0) return 0
    const sum = computedScores.reduce((acc, s) => acc + s.rating, 0)
    return sum / computedScores.length
  }, [computedScores])

  const bestRating = useMemo(() => {
    if (computedScores.length === 0) return 0
    return Math.max(...computedScores.map((s) => s.rating))
  }, [computedScores])

  const apPrediction = useMemo(() => {
    if (currentDifficulty <= 0) return 0
    return currentDifficulty * 1.01
  }, [currentDifficulty])

  const handleAdd = () => {
    setError(null)
    const difficulty = parseFloat(difficultyInput)
    const accuracy = parseFloat(accuracyInput)

    if (isNaN(difficulty) || difficulty < 0) {
      setError('请输入有效的难度值')
      return
    }
    if (isNaN(accuracy) || accuracy < 0 || accuracy > 200) {
      setError('请输入有效的 Acc 值（0-200）')
      return
    }

    const newEntry: ScoreEntry = {
      id: generateId(),
      difficulty,
      accuracy,
    }
    setScores([...scores, newEntry])
    setDifficultyInput('')
    setAccuracyInput('')
  }

  const handleDelete = (id: string) => {
    setScores(scores.filter((s) => s.id !== id))
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-[30rem] max-h-[85vh] rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-zinc-100">Rating 预测</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <p className="text-zinc-500 text-xs mb-1">平均 Rating</p>
              <p className="text-xl font-mono text-zinc-100">{avgRating.toFixed(2)}</p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <p className="text-zinc-500 text-xs mb-1">最佳 Rating</p>
              <p className="text-xl font-mono text-emerald-400">{bestRating.toFixed(2)}</p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <p className="text-zinc-500 text-xs mb-1">AP 预测</p>
              <p className="text-xl font-mono text-indigo-400">{apPrediction.toFixed(2)}</p>
            </div>
          </div>

          {currentDifficulty > 0 && (
            <p className="text-xs text-zinc-500 text-center">
              当前谱面难度：{currentDifficulty} → AP 预测：{currentDifficulty} × 1.01 = {apPrediction.toFixed(2)}
            </p>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-300">添加成绩</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-zinc-500">难度</label>
                <input
                  type="number"
                  step="0.1"
                  value={difficultyInput}
                  onChange={(e) => setDifficultyInput(e.target.value)}
                  placeholder="如 12.5"
                  className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-500">Acc (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={accuracyInput}
                  onChange={(e) => setAccuracyInput(e.target.value)}
                  placeholder="如 98.50"
                  className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              onClick={handleAdd}
              className="w-full px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
            >
              添加
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-zinc-300">
              成绩列表 ({scores.length})
            </h3>
            {computedScores.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500">
                暂无成绩记录
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {computedScores.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-3 py-2 rounded-md bg-zinc-800/50 border border-zinc-700/50 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-300 font-mono">D{s.difficulty.toFixed(1)}</span>
                      <span className="text-zinc-400 font-mono text-xs">{s.accuracy.toFixed(2)}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-mono font-medium">{s.rating.toFixed(2)}</span>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-zinc-500 hover:text-red-400 transition-colors text-xs"
                        title="删除"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-zinc-800 flex justify-end">
          <button
            onClick={() => setScores([])}
            className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm text-zinc-300 transition-colors"
          >
            清空
          </button>
        </div>
      </div>
    </div>
  )
}
