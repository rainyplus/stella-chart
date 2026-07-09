import { useEffect, useState } from 'react'
import type { Rank } from '../../../shared/types.js'

interface ResultPanelProps {
  open: boolean
  onClose: () => void
  onReset: () => void
  accuracy: number
  rank: Rank
  rating: number
  score: number
}

export default function ResultPanel({ open, onClose, onReset, accuracy, rank, rating, score }: ResultPanelProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setIsVisible(true)
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200)
      return () => clearTimeout(timer)
    }
  }, [open])

  if (!open && !isVisible) return null

  const rankColors: Record<Rank, string> = {
    'SSS+': 'text-yellow-300',
    SSS: 'text-yellow-400',
    SS: 'text-yellow-500',
    S: 'text-orange-400',
    A: 'text-green-400',
    B: 'text-blue-400',
    C: 'text-purple-400',
    D: 'text-zinc-400',
    Failed: 'text-red-400',
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 transition-opacity duration-200 ${
        open ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`w-80 rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl transition-all duration-200 ${
          open ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-zinc-100 mb-5 text-center">结算</h2>

        <div className="space-y-4 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Acc</span>
            <span className="font-mono text-zinc-100 text-lg font-bold">{accuracy.toFixed(2)}%</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-zinc-400">评级</span>
            <span className={`font-bold text-2xl ${rankColors[rank] || 'text-zinc-100'}`}>{rank}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Rating</span>
            <span className="font-mono text-zinc-100 text-lg">{rating.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
            <span className="text-zinc-400">得分</span>
            <span className="font-mono text-zinc-100 text-lg font-bold">{score.toLocaleString()}</span>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm text-zinc-200 transition-colors"
          >
            关闭
          </button>
          <button
            onClick={onReset}
            className="flex-1 px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
          >
            重置
          </button>
        </div>
      </div>
    </div>
  )
}
