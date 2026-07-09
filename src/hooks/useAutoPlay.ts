import { useEffect, useRef } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { calculateScoreFromPairs } from '@/lib/chartUtils'
import type { NoteData, NoteJudgmentPair, Judgment } from '../../shared/types.js'

export function useAutoPlay(): void {
  const judgedNoteIdsRef = useRef<Set<string>>(new Set())
  const rafRef = useRef<number>(0)
  const isPlayingRef = useRef(false)

  useEffect(() => {
    const unsub = useEditorStore.subscribe((state) => {
      isPlayingRef.current = state.isPlaying
    })
    isPlayingRef.current = useEditorStore.getState().isPlaying
    return unsub
  }, [])

  useEffect(() => {
    const tick = () => {
      const state = useEditorStore.getState()
      const { chart, isPlaying, songTime, setJudgments, setTotalScore, setAccuracy, judgments } = state

      if (!chart || !isPlaying) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const allNotes: NoteData[] = []
      for (const scene of chart.scenes) {
        for (const note of scene.notes) {
          allNotes.push(note)
        }
      }

      if (allNotes.length === 0) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const currentJudgedIds = new Set(judgments.map((j) => j.noteId))
      judgedNoteIdsRef.current = currentJudgedIds

      let hasNewJudgments = false
      const newPairs: NoteJudgmentPair[] = []

      for (const note of allNotes) {
        if (currentJudgedIds.has(note.id)) continue
        if (songTime >= note.hitTime) {
          const judgment: Judgment = 'Perfect+'
          newPairs.push({
            note,
            judgment,
            delta: 0,
          })
          currentJudgedIds.add(note.id)
          hasNewJudgments = true
        }
      }

      if (hasNewJudgments) {
        const existingPairs: NoteJudgmentPair[] = judgments.map((j) => {
          const note = allNotes.find((n) => n.id === j.noteId)
          return {
            note: note || allNotes[0],
            judgment: j.judgment as Judgment,
            delta: 0,
          }
        }).filter((p) => p.note)

        const allPairs = [...existingPairs, ...newPairs]
        const result = calculateScoreFromPairs(allPairs)

        const newJudgments = [
          ...judgments,
          ...newPairs.map((p) => ({
            noteId: p.note.id,
            judgment: p.judgment,
            time: p.note.hitTime,
          })),
        ]

        setJudgments(newJudgments)
        setTotalScore(result.score)
        setAccuracy(result.accuracy)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  useEffect(() => {
    const unsub = useEditorStore.subscribe((state, prevState) => {
      if (!prevState.isPlaying && state.isPlaying && state.songTime === 0) {
        judgedNoteIdsRef.current.clear()
      }
      if (prevState.chart?.id !== state.chart?.id) {
        judgedNoteIdsRef.current.clear()
      }
    })
    return unsub
  }, [])
}
