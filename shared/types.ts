/**
 * Shared types for STELLA CHART online editor.
 * Used by both frontend and backend.
 */

export type NoteType = 'Tap' | 'Hold' | 'Kick' | 'Catch' | 'Stalid'

export interface Vector3 {
  x: number
  y: number
  z: number
}

export interface Vector2 {
  x: number
  y: number
}

export interface BaseNoteData {
  id: string
  type: NoteType
  /** Scene this note belongs to */
  sceneId?: string
  /** JudgeBox this note targets */
  judgeBoxId?: string
  /** Time (seconds) when the note spawns at the start line */
  spawnTime: number
  /** Time (seconds) when the note should reach the judge box center */
  hitTime: number
  /** Spawn position at the start line (which side / 3D coordinate) */
  position: Vector3
  /** Optional per-note approach time override */
  approachTime?: number
}

export interface TapNote extends BaseNoteData {
  type: 'Tap'
}

export interface CatchNote extends BaseNoteData {
  type: 'Catch'
  /** Whether the note should only be caught, not tapped */
  catchOnly?: boolean
}

export interface KickNote extends BaseNoteData {
  type: 'Kick'
  /** Slide direction in the XZ plane */
  direction: Vector2
}

export interface HoldNote extends BaseNoteData {
  type: 'Hold'
  /** Duration in seconds (judgment tolerance subtracts 100ms per doc) */
  holdDuration: number
}

export interface StalidNote extends BaseNoteData {
  type: 'Stalid'
  /** Path nodes the note travels through */
  pathNodes: Vector3[]
  /** Movement speed controlled by charter */
  moveSpeed: number
}

export type NoteData = TapNote | CatchNote | KickNote | HoldNote | StalidNote

export interface JudgeBox {
  id: string
  name: string
  /** Center position of the judge box */
  position: Vector3
  /** Distance from center to the spawn start line */
  spawnDistance: number
}

export interface SceneCamera {
  position: Vector3
  target: Vector3
  fov?: number
}

export interface Scene {
  id: string
  name: string
  /** Judge boxes in this scene */
  judgeBoxes: JudgeBox[]
  /** Notes placed in this scene */
  notes: NoteData[]
  /** IDs of scenes that come after this one (for mind map style navigation) */
  sceneLinks?: string[]
  /** Background color/theme for this scene */
  sceneTheme?: string
  /** Start time of the scene in seconds (for timeline-based scene switching) */
  startTime: number
  /** Player camera settings for this scene */
  camera?: SceneCamera
}

export type BackgroundAnimationType = 'none' | 'fade' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'zoom'

export interface BackgroundLayer {
  id: string
  name: string
  type: 'text' | 'image'
  startTime: number
  endTime: number
  x: number
  y: number
  z: number
  text?: string
  fontSize?: number
  fontFamily?: string
  fontWeight?: string
  color?: string
  opacity?: number
  imageUrl?: string
  scale?: number
  animationIn?: BackgroundAnimationType
  animationOut?: BackgroundAnimationType
  animationDuration?: number
}

export interface ChartData {
  id: string
  songName: string
  /** Artist / composer of the song */
  artist: string
  /** Charter who created the chart */
  charter: string
  bpm: number
  /** Difficulty constant D */
  difficulty: number
  /** Global audio offset in seconds */
  offset: number
  /** Multiple scenes, each with its own judge boxes and notes */
  scenes: Scene[]
  /** Background text (optional, legacy) */
  backgroundText?: string
  /** Background layers */
  backgroundLayers?: BackgroundLayer[]
  /** Cover image data URL / path */
  coverUrl?: string
  /** MD5 of the referenced audio file (used for integrity) */
  audioMd5?: string
  /** URL/path to the referenced audio file */
  audioUrl?: string
  /** User id of the charter */
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

export type UserRole = 'user' | 'admin'

export interface User {
  id: string
  username: string
  email: string
  passwordHash: string
  role: UserRole
  disabled: boolean
  createdAt: string
}

export interface PublicUser {
  id: string
  username: string
  email: string
  role: UserRole
  disabled: boolean
  createdAt: string
}

export interface InviteCode {
  code: string
  used: boolean
  usedBy?: string
  createdAt: string
  expiresAt?: string
}

export interface VerificationSession {
  id: string
  captchaPassed: boolean
  captchaAnswer: string
  sliderPassed: boolean
  createdAt: number
}

export interface JwtPayload {
  userId: string
  username: string
  role: UserRole
}

export interface ScoreRecord {
  chartId: string
  chartDifficulty: number
  accuracy: number
  rating: number
  playedAt: string
}

/** Asset uploaded by user (audio / cover) */
export interface UploadedAsset {
  id: string
  name: string
  mimeType: string
  size: number
  /** base64 data URL */
  dataUrl: string
  md5: string
}

/** Judgment result according to V1 document */
export type Judgment = 'Perfect+' | 'Perfect' | 'Great' | 'Good' | 'Miss'

export interface JudgmentConfig {
  windows: Record<Judgment, number>
  scores: Record<Judgment, number>
}

export type Rank = 'SSS+' | 'SSS' | 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'Failed'

export interface ScoreResult {
  score: number
  accuracy: number
  maxScore: number
  judgmentCounts: Record<Judgment, number>
}

export interface ChartValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface NoteJudgmentPair {
  note: NoteData
  judgment: Judgment
  delta: number
}

export interface Announcement {
  id: string
  title: string
  content: string
  createdAt: string
  createdBy: string
  isActive: boolean
}

export interface MaintenanceStatus {
  isMaintenance: boolean
  message: string
  scheduledOpenTime?: string
  updatedAt: string
  updatedBy: string
}
