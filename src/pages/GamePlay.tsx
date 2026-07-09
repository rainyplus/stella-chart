import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { chartApi } from '@/lib/api'
import { rankFromAccuracy, ratingFromAccuracy } from '@/lib/chartUtils'
import GameLoadingScreen from '@/components/game/GameLoadingScreen'
import GamePlayScene from '@/components/game/GamePlayScene'
import GameResultScreen from '@/components/game/GameResultScreen'
import type { ChartData, Rank, Judgment } from '../../shared/types.js'

type GamePhase = 'loading' | 'playing' | 'result'

interface GameResult {
  accuracy: number
  score: number
  judgmentCounts: Record<Judgment, number>
  maxCombo: number
}

export default function GamePlay() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<GamePhase>('loading')
  const [chart, setChart] = useState<ChartData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [result, setResult] = useState<GameResult | null>(null)
  const [isPaused, setIsPaused] = useState(false)

  const noteCount = useMemo(() => {
    if (!chart) return 0
    return chart.scenes.reduce((sum, s) => sum + s.notes.length, 0)
  }, [chart])

  const firstSceneId = useMemo(() => {
    if (!chart || chart.scenes.length === 0) return ''
    return chart.scenes[0].id
  }, [chart])

  const resultRank: Rank = useMemo(() => {
    if (!result) return 'D'
    return rankFromAccuracy(result.accuracy)
  }, [result])

  const resultRating = useMemo(() => {
    if (!result || !chart) return 0
    return ratingFromAccuracy(chart.difficulty, result.accuracy)
  }, [result, chart])

  useEffect(() => {
    if (!id) {
      setLoadError('缺少谱面 ID')
      return
    }

    const loadChart = async () => {
      try {
        const data = await chartApi.get(id)
        setChart(data.chart)
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : '加载谱面失败')
      }
    }

    loadChart()
  }, [id])

  const handleStart = () => {
    setPhase('playing')
  }

  const handleClose = () => {
    navigate(-1)
  }

  const handleEnd = (gameResult: {
    accuracy: number
    score: number
    judgmentCounts: Record<string, number>
    maxCombo: number
  }) => {
    setResult({
      accuracy: gameResult.accuracy,
      score: gameResult.score,
      judgmentCounts: gameResult.judgmentCounts as Record<Judgment, number>,
      maxCombo: gameResult.maxCombo,
    })
    setPhase('result')
  }

  const handlePause = () => {
    setIsPaused(true)
  }

  const handleRetry = () => {
    setResult(null)
    setIsPaused(false)
    setPhase('loading')
    setTimeout(() => {
      setPhase('playing')
    }, 50)
  }

  const handleBack = () => {
    navigate(-1)
  }

  if (loadError) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-endfield-bg-primary text-endfield-text-primary">
        <div className="text-center">
          <div className="text-2xl font-light mb-4 text-red-400 tracking-wider">加载失败</div>
          <div className="text-endfield-text-secondary mb-6">{loadError}</div>
          <button
            onClick={handleBack}
            className="px-6 py-2 bg-endfield-accent-cyan hover:bg-endfield-accent-cyan-light text-endfield-bg-primary font-medium transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'loading' && chart) {
    return (
      <GameLoadingScreen
        songName={chart.songName}
        artist={chart.artist}
        charter={chart.charter}
        difficulty={chart.difficulty}
        bpm={chart.bpm}
        coverUrl={chart.coverUrl}
        audioUrl={chart.audioUrl}
        noteCount={noteCount}
        onStart={handleStart}
        onClose={handleClose}
      />
    )
  }

  if (phase === 'playing' && chart) {
    return (
      <div className="fixed inset-0 w-screen h-screen overflow-hidden">
        <GamePlayScene
          chart={chart}
          currentSceneId={firstSceneId}
          audioUrl={chart.audioUrl}
          onEnd={handleEnd}
          onPause={handlePause}
        />
        {isPaused && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in">
            <div className="bg-endfield-bg-secondary border border-endfield-border p-8 max-w-md w-full mx-4 relative shadow-endfield animate-slide-up">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-endfield-accent-cyan to-transparent" />
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-endfield-accent-cyan" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-endfield-accent-cyan" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-endfield-accent-cyan" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-endfield-accent-cyan" />
              <h2 className="text-2xl font-light text-endfield-text-primary mb-6 text-center tracking-wider">游戏暂停</h2>
              <div className="space-y-3">
                <button
                  onClick={() => setIsPaused(false)}
                  className="w-full py-3 bg-endfield-accent-cyan hover:bg-endfield-accent-cyan-light text-endfield-bg-primary font-medium transition-colors shadow-endfield-glow"
                >
                  继续游戏
                </button>
                <button
                  onClick={handleRetry}
                  className="w-full py-3 bg-endfield-accent-cyan/20 hover:bg-endfield-accent-cyan/30 border border-endfield-accent-cyan/50 text-endfield-text-primary font-medium transition-colors"
                >
                  重新开始
                </button>
                <button
                  onClick={handleBack}
                  className="w-full py-3 bg-endfield-bg-panel hover:bg-endfield-bg-card border border-endfield-border text-endfield-text-secondary hover:text-endfield-text-primary transition-colors"
                >
                  退出游戏
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (phase === 'result' && chart && result) {
    return (
      <GameResultScreen
        songName={chart.songName}
        artist={chart.artist}
        charter={chart.charter}
        difficulty={chart.difficulty}
        rank={resultRank}
        accuracy={result.accuracy}
        rating={resultRating}
        score={result.score}
        judgmentCounts={result.judgmentCounts}
        maxCombo={result.maxCombo}
        onRetry={handleRetry}
        onBack={handleBack}
      />
    )
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-endfield-bg-primary">
      <div className="text-endfield-text-muted">加载中...</div>
    </div>
  )
}
