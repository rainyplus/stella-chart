import {
  APPROACH_BASE,
  APPROACH_FACTOR,
  APPROACH_MIN,
  DEFAULT_JUDGMENT_CONFIG,
  MAX_SCORE,
  RANK_THRESHOLDS,
  HOLD_TOLERANCE,
} from '../../shared/constants.js'
import type {
  ChartData,
  ChartValidationResult,
  Judgment,
  NoteData,
  NoteJudgmentPair,
  Rank,
  ScoreResult,
  StalidNote,
  HoldNote,
} from '../../shared/types.js'

export function beatToTime(beat: number, bpm: number, offset = 0): number {
  if (bpm <= 0) throw new Error('BPM must be positive')
  return (beat * 60) / bpm + offset
}

export function timeToBeat(time: number, bpm: number, offset = 0): number {
  if (bpm <= 0) throw new Error('BPM must be positive')
  return ((time - offset) * bpm) / 60
}

export function snapTimeToBeat(
  time: number,
  bpm: number,
  offset = 0,
  division = 4
): number {
  if (division <= 0) throw new Error('Division must be positive')
  const beat = timeToBeat(time, bpm, offset)
  const snapped = Math.round(beat * division) / division
  return beatToTime(snapped, bpm, offset)
}

export function approachTime(difficulty: number, override?: number): number {
  if (override !== undefined) return Math.max(APPROACH_MIN, override)
  return Math.max(APPROACH_MIN, APPROACH_BASE - difficulty * APPROACH_FACTOR)
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t))
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export function judgeHit(delta: number): Judgment {
  const abs = Math.abs(delta)
  const { windows } = DEFAULT_JUDGMENT_CONFIG
  if (abs <= windows['Perfect+']) return 'Perfect+'
  if (abs <= windows['Perfect']) return 'Perfect'
  if (abs <= windows['Great']) return 'Great'
  if (abs <= windows['Good']) return 'Good'
  return 'Miss'
}

export function scoreForJudgment(judgment: Judgment): number {
  return DEFAULT_JUDGMENT_CONFIG.scores[judgment]
}

export function rankFromAccuracy(accuracy: number): Rank {
  for (const t of RANK_THRESHOLDS) {
    if (accuracy >= t.min) return t.rank
  }
  return 'Failed'
}

export function ratingFromAccuracy(difficulty: number, accuracy: number): number {
  if (accuracy >= 101) return difficulty
  return difficulty * (accuracy / 100)
}

export function flattenNotes(chart: ChartData): NoteData[] {
  return chart.scenes.flatMap((s) => s.notes)
}

export function computeScoreAndAccuracy(chart: ChartData): {
  score: number
  accuracy: number
} {
  const totalNotes = chart.scenes.reduce((sum, s) => sum + s.notes.length, 0)
  if (totalNotes === 0) return { score: 0, accuracy: 0 }
  const base = MAX_SCORE / totalNotes
  let score = 0
  for (const scene of chart.scenes) {
    for (const note of scene.notes) {
      score += base * scoreForJudgment('Perfect+')
    }
  }
  const accuracy = (score / MAX_SCORE) * 100
  return { score: Math.round(score), accuracy }
}

function initJudgmentCounts(): Record<Judgment, number> {
  return {
    'Perfect+': 0,
    Perfect: 0,
    Great: 0,
    Good: 0,
    Miss: 0,
  }
}

export function calculateScore(
  notes: NoteData[],
  judgments: Judgment[]
): ScoreResult {
  if (notes.length !== judgments.length) {
    throw new Error('Notes and judgments length mismatch')
  }
  const totalNotes = notes.length
  if (totalNotes === 0) {
    return {
      score: 0,
      accuracy: 0,
      maxScore: MAX_SCORE,
      judgmentCounts: initJudgmentCounts(),
    }
  }
  const baseScorePerNote = MAX_SCORE / totalNotes
  let totalScore = 0
  const judgmentCounts = initJudgmentCounts()
  for (let i = 0; i < totalNotes; i++) {
    const judgment = judgments[i]
    judgmentCounts[judgment]++
    totalScore += baseScorePerNote * scoreForJudgment(judgment)
  }
  const accuracy = (totalScore / MAX_SCORE) * 100
  return {
    score: Math.round(totalScore),
    accuracy,
    maxScore: MAX_SCORE,
    judgmentCounts,
  }
}

export function calculateScoreFromPairs(
  pairs: NoteJudgmentPair[]
): ScoreResult {
  const notes = pairs.map((p) => p.note)
  const judgments = pairs.map((p) => p.judgment)
  return calculateScore(notes, judgments)
}

export function validateChart(chart: ChartData): ChartValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!chart.id) {
    errors.push('Chart is missing id')
  }
  if (!chart.songName || chart.songName.trim().length === 0) {
    warnings.push('Chart song name is empty')
  }
  if (chart.bpm <= 0) {
    errors.push(`Chart BPM must be positive, got ${chart.bpm}`)
  }
  if (chart.difficulty < 0) {
    errors.push(`Chart difficulty must be non-negative, got ${chart.difficulty}`)
  }
  if (!chart.scenes || chart.scenes.length === 0) {
    errors.push('Chart has no scenes')
  } else {
    const seenSceneIds = new Set<string>()
    for (const scene of chart.scenes) {
      if (!scene.id) {
        errors.push('Scene is missing id')
      } else if (seenSceneIds.has(scene.id)) {
        errors.push(`Duplicate scene id: ${scene.id}`)
      } else {
        seenSceneIds.add(scene.id)
      }
      if (!scene.judgeBoxes || scene.judgeBoxes.length === 0) {
        warnings.push(`Scene "${scene.name || scene.id}" has no judge boxes`)
      }
      if (scene.notes) {
        const seenNoteIds = new Set<string>()
        for (const note of scene.notes) {
          if (!note.id) {
            errors.push('Note is missing id')
          } else if (seenNoteIds.has(note.id)) {
            errors.push(`Duplicate note id: ${note.id}`)
          } else {
            seenNoteIds.add(note.id)
          }
          if (note.hitTime < 0) {
            errors.push(`Note ${note.id} has negative hitTime`)
          }
          if (note.spawnTime < 0) {
            errors.push(`Note ${note.id} has negative spawnTime`)
          }
          if (note.type === 'Stalid') {
            const stalidNote = note as StalidNote
            if (!stalidNote.pathNodes || stalidNote.pathNodes.length < 2) {
              errors.push(
                `Stalid note ${note.id} has fewer than 2 path nodes (${stalidNote.pathNodes?.length || 0})`
              )
            }
            if (stalidNote.moveSpeed <= 0) {
              errors.push(
                `Stalid note ${note.id} has non-positive moveSpeed`
              )
            }
          }
          if (note.type === 'Hold') {
            const holdNote = note as HoldNote
            if (holdNote.holdDuration < 0) {
              errors.push(
                `Hold note ${note.id} has negative holdDuration (${holdNote.holdDuration})`
              )
            }
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

export function validateChartSimple(chart: ChartData): string | null {
  const result = validateChart(chart)
  return result.valid ? null : result.errors[0]
}

export function judgeHold(
  hitDelta: number,
  releaseDelta: number,
  holdDuration: number
): Judgment {
  const hitJudgment = judgeHit(hitDelta)
  const releaseJudgment = judgeHit(releaseDelta)
  if (holdDuration < HOLD_TOLERANCE) {
    return 'Miss'
  }
  const judgmentRank: Record<Judgment, number> = {
    'Perfect+': 4,
    Perfect: 3,
    Great: 2,
    Good: 1,
    Miss: 0,
  }
  const hitRank = judgmentRank[hitJudgment]
  const releaseRank = judgmentRank[releaseJudgment]
  const worseRank = Math.min(hitRank, releaseRank)
  const entries = Object.entries(judgmentRank) as [Judgment, number][]
  for (const [judgment, rank] of entries) {
    if (rank === worseRank) return judgment
  }
  return 'Miss'
}
