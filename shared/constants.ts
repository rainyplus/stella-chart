import type { JudgmentConfig, Rank } from './types.js'

/** Maximum total score used for Acc calculation */
export const MAX_SCORE = 1_500_000

/** Default judgment windows in seconds (± from hit time) per V1 document */
export const DEFAULT_JUDGMENT_CONFIG: JudgmentConfig = {
  windows: {
    'Perfect+': 0.025,
    'Perfect': 0.05,
    'Great': 0.1,
    'Good': 0.2,
    'Miss': Infinity,
  },
  scores: {
    'Perfect+': 1.0,
    'Perfect': 0.95,
    'Great': 0.8,
    'Good': 0.5,
    'Miss': 0,
  },
}

/** Hold judgment tolerance subtraction in seconds */
export const HOLD_TOLERANCE = 0.1

/** Approach time base in seconds; higher difficulty -> shorter time */
export const APPROACH_BASE = 1.5

/** Difficulty factor for approach time */
export const APPROACH_FACTOR = 0.08

/** Minimum approach time in seconds */
export const APPROACH_MIN = 0.4

/** Rank thresholds based on Acc percentage */
export const RANK_THRESHOLDS: ReadonlyArray<{ min: number; rank: Rank }> = [
  { min: 101, rank: 'SSS+' },
  { min: 100, rank: 'SSS' },
  { min: 99, rank: 'SS' },
  { min: 97, rank: 'S' },
  { min: 94, rank: 'A' },
  { min: 90, rank: 'B' },
  { min: 80, rank: 'C' },
  { min: 60, rank: 'D' },
  { min: 0, rank: 'Failed' },
]

/** Judgment order from best to worst */
export const JUDGMENT_ORDER: ReadonlyArray<import('./types.js').Judgment> = [
  'Perfect+',
  'Perfect',
  'Great',
  'Good',
  'Miss',
]

/** Arknights-style theme color palette */
export const THEME_COLORS = {
  primary: '#3B82F6',
  primaryDark: '#1E40AF',
  gold: '#F59E0B',
  goldDark: '#D97706',
  background: '#0F172A',
  backgroundLight: '#1E293B',
  border: '#334155',
  text: '#E2E8F0',
  textSecondary: '#94A3B8',
} as const

/** Difficulty level colors */
export const DIFFICULTY_COLORS = {
  easy: '#22C55E',
  normal: '#3B82F6',
  hard: '#A855F7',
  expert: '#EF4444',
  master: '#F59E0B',
} as const

/** Get difficulty color by level */
export function getDifficultyColor(level: number): string {
  if (level >= 13) return DIFFICULTY_COLORS.master
  if (level >= 10) return DIFFICULTY_COLORS.expert
  if (level >= 7) return DIFFICULTY_COLORS.hard
  if (level >= 4) return DIFFICULTY_COLORS.normal
  return DIFFICULTY_COLORS.easy
}
