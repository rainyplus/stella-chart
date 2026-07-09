import type { NoteType } from '../../shared/types.js'
import type { Tool } from '@/store/editorStore'

export const NOTE_DISPLAY_NAMES: Record<NoteType, string> = {
  Tap: 'Tap',
  Catch: 'Catch',
  Kick: 'Flick',
  Hold: 'Hold',
  Stalid: 'Stalid',
}

export const NOTE_DESCRIPTIONS: Record<NoteType, string> = {
  Tap: '点击音符',
  Catch: '承接音符',
  Kick: '滑动音符',
  Hold: '长按音符',
  Stalid: '轨迹音符',
}

export const TOOL_DISPLAY_NAMES: Record<Tool, string> = {
  select: '选择',
  tap: 'Tap',
  catch: 'Catch',
  kick: 'Flick',
  hold: 'Hold',
  stalid: 'Stalid',
}

export const TOOL_DESCRIPTIONS: Record<Tool, string> = {
  select: '选择工具',
  tap: '添加 Tap 音符',
  catch: '添加 Catch 音符',
  kick: '添加 Flick 音符',
  hold: '添加 Hold 音符',
  stalid: '添加 Stalid 音符',
}
