import { useState } from 'react'
import { useEditorStore } from '@/store/editorStore'
import type { BackgroundLayer } from '../../../shared/types.js'
import { ChevronUp, ChevronDown, Trash2, Type, Image, Edit3, Check, X } from 'lucide-react'

const FONT_OPTIONS = [
  { value: 'sans-serif', label: '无衬线体 (sans-serif)' },
  { value: 'serif', label: '衬线体 (serif)' },
  { value: 'monospace', label: '等宽体 (monospace)' },
  { value: 'cursive', label: '手写体 (cursive)' },
  { value: 'fantasy', label: '艺术体 (fantasy)' },
  { value: '"Microsoft YaHei", sans-serif', label: '微软雅黑' },
  { value: '"SimHei", sans-serif', label: '黑体' },
  { value: '"SimSun", serif', label: '宋体' },
  { value: '"KaiTi", serif', label: '楷体' },
]

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-medium text-zinc-300">{children}</h3>
}

function NumberInput({
  value,
  onChange,
  step = 1,
  label,
  min,
  max,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  label: string
  min?: number
  max?: number
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-zinc-500 w-16 shrink-0">{label}</span>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 min-w-0 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ef-input-focus"
      />
    </div>
  )
}

function TextInput({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  label: string
  placeholder?: string
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-zinc-500 w-16 shrink-0">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ef-input-focus"
      />
    </div>
  )
}

function SelectInput({
  value,
  onChange,
  label,
  options,
}: {
  value: string
  onChange: (v: string) => void
  label: string
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-zinc-500 w-16 shrink-0">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ef-input-focus"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function ColorInput({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (v: string) => void
  label: string
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-zinc-500 w-16 shrink-0">{label}</span>
      <div className="flex-1 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded bg-zinc-800 border border-zinc-700 cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ef-input-focus font-mono"
        />
      </div>
    </div>
  )
}

function SliderInput({
  value,
  onChange,
  step = 0.01,
  label,
  min,
  max,
  unit = '',
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  label: string
  min: number
  max: number
  unit?: string
}) {
  const displayValue = step >= 1 ? value.toFixed(0) : value.toFixed(2)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-500">{label}</span>
        <span className="text-zinc-400 font-mono">{displayValue}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-indigo-500"
      />
    </div>
  )
}

function LayerNameEditor({
  layer,
  onRename,
}: {
  layer: BackgroundLayer
  onRename: (name: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(layer.name)

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditValue(layer.name)
    setIsEditing(true)
  }

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (editValue.trim()) {
      onRename(editValue.trim())
    }
    setIsEditing(false)
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      if (editValue.trim()) {
        onRename(editValue.trim())
      }
      setIsEditing(false)
    } else if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <div className="flex-1 flex items-center gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          className="flex-1 min-w-0 px-1.5 py-0.5 text-xs rounded bg-zinc-900 border border-indigo-500 text-zinc-200 focus:outline-none"
        />
        <button
          onClick={handleConfirm}
          className="p-0.5 hover:bg-green-600/30 text-green-400 rounded"
        >
          <Check className="w-3 h-3" />
        </button>
        <button
          onClick={handleCancel}
          className="p-0.5 hover:bg-zinc-700 text-zinc-400 rounded"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center gap-1 min-w-0">
      <span className="truncate text-xs">{layer.name}</span>
      <button
        onClick={handleStartEdit}
        className="p-0.5 opacity-0 hover:opacity-100 hover:bg-zinc-700 rounded transition-opacity"
        title="重命名"
      >
        <Edit3 className="w-3 h-3" />
      </button>
    </div>
  )
}

export default function BackgroundLayersPanel() {
  const chart = useEditorStore((s) => s.chart)
  const selectedBackgroundLayerId = useEditorStore((s) => s.selectedBackgroundLayerId)
  const setSelectedBackgroundLayer = useEditorStore((s) => s.setSelectedBackgroundLayer)
  const addBackgroundLayer = useEditorStore((s) => s.addBackgroundLayer)
  const updateBackgroundLayer = useEditorStore((s) => s.updateBackgroundLayer)
  const deleteBackgroundLayer = useEditorStore((s) => s.deleteBackgroundLayer)
  const moveBackgroundLayer = useEditorStore((s) => s.moveBackgroundLayer)
  const songTime = useEditorStore((s) => s.songTime)

  const layers = chart?.backgroundLayers || []
  const selectedLayer = layers.find((l) => l.id === selectedBackgroundLayerId)

  const handleAddTextLayer = () => {
    const textCount = layers.filter((l) => l.type === 'text').length + 1
    addBackgroundLayer({
      name: `文字层 ${textCount}`,
      type: 'text',
      startTime: Math.floor(songTime),
      endTime: Math.floor(songTime) + 10,
      x: 0.5,
      y: 0.5,
      z: -15,
      text: '文字',
      fontSize: 48,
      fontFamily: 'sans-serif',
      fontWeight: 'bold',
      color: '#ffffff',
      opacity: 0.8,
      animationIn: 'none',
      animationOut: 'none',
      animationDuration: 0.5,
    })
  }

  const handleAddImageLayer = () => {
    const imageCount = layers.filter((l) => l.type === 'image').length + 1
    addBackgroundLayer({
      name: `图片层 ${imageCount}`,
      type: 'image',
      startTime: Math.floor(songTime),
      endTime: Math.floor(songTime) + 10,
      x: 0.5,
      y: 0.5,
      z: -15,
      imageUrl: '',
      scale: 1,
      opacity: 1,
      animationIn: 'none',
      animationOut: 'none',
      animationDuration: 0.5,
    })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedLayer) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      updateBackgroundLayer(selectedLayer.id, { imageUrl: dataUrl })
    }
    reader.readAsDataURL(file)
  }

  const handleRenameLayer = (id: string, name: string) => {
    updateBackgroundLayer(id, { name })
  }

  if (!chart) return null

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionTitle>背景层</SectionTitle>
          <div className="flex gap-1">
            <button
              onClick={handleAddTextLayer}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-600/30 ef-btn-hover"
              title="添加文字层"
            >
              <Type className="w-3 h-3" />
              文字
            </button>
            <button
              onClick={handleAddImageLayer}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-600/30 ef-btn-hover"
              title="添加图片层"
            >
              <Image className="w-3 h-3" />
              图片
            </button>
          </div>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {layers.length === 0 && (
            <div className="text-xs text-zinc-600 text-center py-4">
              暂无背景层
            </div>
          )}
          {layers.map((layer, index) => (
            <div
              key={layer.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer border ef-btn-hover group ${
                layer.id === selectedBackgroundLayerId
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50 hover:bg-zinc-800'
              }`}
              onClick={() => setSelectedBackgroundLayer(layer.id)}
            >
              <span className="text-xs text-zinc-500 w-5 shrink-0">{index + 1}</span>
              {layer.type === 'text' ? (
                <Type className="w-4 h-4 shrink-0" />
              ) : (
                <Image className="w-4 h-4 shrink-0" />
              )}
              <LayerNameEditor
                layer={layer}
                onRename={(name) => handleRenameLayer(layer.id, name)}
              />
              <span className="text-xs text-zinc-500 font-mono shrink-0">
                {layer.startTime.toFixed(1)}s
              </span>
              <div className="flex gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => moveBackgroundLayer(layer.id, 'up')}
                  disabled={index === 0}
                  className="p-0.5 hover:bg-zinc-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  title="上移"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => moveBackgroundLayer(layer.id, 'down')}
                  disabled={index === layers.length - 1}
                  className="p-0.5 hover:bg-zinc-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  title="下移"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
                <button
                  onClick={() => deleteBackgroundLayer(layer.id)}
                  className="p-0.5 hover:bg-red-600/30 text-red-400 rounded"
                  title="删除"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedLayer && (
        <div className="space-y-3 pt-3 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <SectionTitle>
              {selectedLayer.type === 'text' ? '文字层属性' : '图片层属性'}
            </SectionTitle>
          </div>

          <TextInput
            label="名称"
            value={selectedLayer.name}
            onChange={(v) => updateBackgroundLayer(selectedLayer.id, { name: v })}
            placeholder="图层名称"
          />

          <div className="grid grid-cols-2 gap-2">
            <NumberInput
              label="开始"
              value={selectedLayer.startTime}
              step={0.1}
              onChange={(v) => updateBackgroundLayer(selectedLayer.id, { startTime: Math.max(0, v) })}
            />
            <NumberInput
              label="结束"
              value={selectedLayer.endTime}
              step={0.1}
              onChange={(v) => updateBackgroundLayer(selectedLayer.id, { endTime: Math.max(selectedLayer.startTime + 0.1, v) })}
            />
          </div>

          <SliderInput
            label="水平位置 X"
            value={selectedLayer.x}
            min={0}
            max={1}
            onChange={(v) => updateBackgroundLayer(selectedLayer.id, { x: v })}
          />
          <SliderInput
            label="垂直位置 Y"
            value={selectedLayer.y}
            min={0}
            max={1}
            onChange={(v) => updateBackgroundLayer(selectedLayer.id, { y: v })}
          />
          <SliderInput
            label="深度 Z"
            value={selectedLayer.z}
            min={-50}
            max={0}
            step={0.5}
            unit=""
            onChange={(v) => updateBackgroundLayer(selectedLayer.id, { z: v })}
          />

          {selectedLayer.type === 'text' && (
            <>
              <TextInput
                label="文字"
                value={selectedLayer.text || ''}
                onChange={(v) => updateBackgroundLayer(selectedLayer.id, { text: v })}
                placeholder="输入文字..."
              />
              <SliderInput
                label="字号"
                value={selectedLayer.fontSize || 48}
                step={1}
                min={8}
                max={200}
                unit="px"
                onChange={(v) => updateBackgroundLayer(selectedLayer.id, { fontSize: v })}
              />
              <SelectInput
                label="字体"
                value={selectedLayer.fontFamily || 'sans-serif'}
                onChange={(v) => updateBackgroundLayer(selectedLayer.id, { fontFamily: v })}
                options={FONT_OPTIONS}
              />
              <SelectInput
                label="字重"
                value={selectedLayer.fontWeight || 'normal'}
                onChange={(v) => updateBackgroundLayer(selectedLayer.id, { fontWeight: v })}
                options={[
                  { value: 'lighter', label: '细 (Lighter)' },
                  { value: 'normal', label: '正常 (Normal)' },
                  { value: 'bold', label: '粗 (Bold)' },
                  { value: 'bolder', label: '特粗 (Bolder)' },
                ]}
              />
              <ColorInput
                label="颜色"
                value={selectedLayer.color || '#ffffff'}
                onChange={(v) => updateBackgroundLayer(selectedLayer.id, { color: v })}
              />
            </>
          )}

          {selectedLayer.type === 'image' && (
            <>
              <div className="space-y-1">
                <span className="text-xs text-zinc-500">图片</span>
                <label className="block w-full px-3 py-2 text-center text-xs border border-dashed border-zinc-700 rounded cursor-pointer hover:border-indigo-500 hover:bg-indigo-500/10 text-zinc-400 hover:text-zinc-300 transition-colors">
                  {selectedLayer.imageUrl ? '更换图片' : '点击上传图片'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                {selectedLayer.imageUrl && (
                  <div className="mt-2 flex justify-center">
                    <img
                      src={selectedLayer.imageUrl}
                      alt="preview"
                      className="max-h-20 rounded border border-zinc-700"
                    />
                  </div>
                )}
              </div>
              <SliderInput
                label="缩放"
                value={selectedLayer.scale || 1}
                step={0.05}
                min={0.1}
                max={5}
                unit="x"
                onChange={(v) => updateBackgroundLayer(selectedLayer.id, { scale: v })}
              />
            </>
          )}

          <SelectInput
            label="入场动画"
            value={selectedLayer.animationIn || 'none'}
            onChange={(v) => updateBackgroundLayer(selectedLayer.id, { animationIn: v as any })}
            options={[
              { value: 'none', label: '无' },
              { value: 'fade', label: '淡入' },
              { value: 'slideUp', label: '从下滑入' },
              { value: 'slideDown', label: '从上滑入' },
              { value: 'slideLeft', label: '从右滑入' },
              { value: 'slideRight', label: '从左滑入' },
              { value: 'zoom', label: '缩放进入' },
            ]}
          />
          <SelectInput
            label="出场动画"
            value={selectedLayer.animationOut || 'none'}
            onChange={(v) => updateBackgroundLayer(selectedLayer.id, { animationOut: v as any })}
            options={[
              { value: 'none', label: '无' },
              { value: 'fade', label: '淡出' },
              { value: 'slideUp', label: '向上滑出' },
              { value: 'slideDown', label: '向下滑出' },
              { value: 'slideLeft', label: '向左滑出' },
              { value: 'slideRight', label: '向右滑出' },
              { value: 'zoom', label: '缩放退出' },
            ]}
          />
          <SliderInput
            label="动画时长"
            value={selectedLayer.animationDuration || 0.5}
            min={0.1}
            max={3}
            step={0.1}
            unit="s"
            onChange={(v) => updateBackgroundLayer(selectedLayer.id, { animationDuration: v })}
          />
          <SliderInput
            label="透明度"
            value={selectedLayer.opacity ?? 1}
            min={0}
            max={1}
            onChange={(v) => updateBackgroundLayer(selectedLayer.id, { opacity: v })}
          />
        </div>
      )}
    </div>
  )
}
