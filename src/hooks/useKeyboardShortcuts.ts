import { useEffect } from 'react'
import type { Tool } from '@/store/editorStore'

interface UseKeyboardShortcutsOptions {
  onUndo: () => void
  onRedo: () => void
  onSave: () => void
  onDelete: () => void
  onPlayPause: () => void
  onSelectAll: () => void
  onEscape: () => void
  onToolChange: (tool: Tool) => void
  hasSelection: boolean
}

const NUMBER_KEY_TOOL_MAP: Record<string, Tool> = {
  '1': 'select',
  '2': 'tap',
  '3': 'catch',
  '4': 'kick',
  '5': 'hold',
  '6': 'stalid',
}

const LETTER_KEY_TOOL_MAP: Record<string, Tool> = {
  s: 'select',
  t: 'tap',
  c: 'catch',
  k: 'kick',
  h: 'hold',
  d: 'stalid',
}

function isInputElement(target: EventTarget | null): boolean {
  if (!target) return false
  const el = target as HTMLElement
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
    return true
  }
  if (el.isContentEditable) {
    return true
  }
  return false
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions) {
  const {
    onUndo,
    onRedo,
    onSave,
    onDelete,
    onPlayPause,
    onSelectAll,
    onEscape,
    onToolChange,
    hasSelection,
  } = options

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isInputElement(e.target)) {
        return
      }

      const key = e.key.toLowerCase()
      const isCtrl = e.ctrlKey || e.metaKey
      const isShift = e.shiftKey

      if (key === ' ') {
        e.preventDefault()
        onPlayPause()
        return
      }

      if (key === 'escape') {
        e.preventDefault()
        onEscape()
        return
      }

      if (key === 'delete' || key === 'backspace') {
        if (hasSelection) {
          e.preventDefault()
          onDelete()
        }
        return
      }

      if (isCtrl) {
        if (key === 'z') {
          e.preventDefault()
          if (isShift) {
            onRedo()
          } else {
            onUndo()
          }
          return
        }
        if (key === 'y') {
          e.preventDefault()
          onRedo()
          return
        }
        if (key === 's') {
          e.preventDefault()
          onSave()
          return
        }
        if (key === 'a') {
          e.preventDefault()
          onSelectAll()
          return
        }
      }

      if (NUMBER_KEY_TOOL_MAP[key]) {
        e.preventDefault()
        onToolChange(NUMBER_KEY_TOOL_MAP[key])
        return
      }

      if (LETTER_KEY_TOOL_MAP[key]) {
        e.preventDefault()
        onToolChange(LETTER_KEY_TOOL_MAP[key])
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    onUndo,
    onRedo,
    onSave,
    onDelete,
    onPlayPause,
    onSelectAll,
    onEscape,
    onToolChange,
    hasSelection,
  ])
}

export const SHORTCUT_LIST = [
  { category: '编辑', items: [
    { keys: ['Ctrl', 'Z'], description: '撤销' },
    { keys: ['Ctrl', 'Y'], description: '重做' },
    { keys: ['Ctrl', 'Shift', 'Z'], description: '重做' },
    { keys: ['Ctrl', 'S'], description: '保存' },
    { keys: ['Ctrl', 'A'], description: '全选音符' },
    { keys: ['Delete', 'Backspace'], description: '删除选中音符' },
    { keys: ['Escape'], description: '取消选择/操作' },
  ]},
  { category: '播放', items: [
    { keys: ['Space'], description: '播放/暂停' },
  ]},
  { category: '工具切换', items: [
    { keys: ['1', 'S'], description: '选择工具' },
    { keys: ['2', 'T'], description: 'Tap 音符' },
    { keys: ['3', 'C'], description: 'Catch 音符' },
    { keys: ['4', 'K'], description: 'Flick 音符' },
    { keys: ['5', 'H'], description: 'Hold 音符' },
    { keys: ['6', 'D'], description: 'Stalid 音符' },
  ]},
]
