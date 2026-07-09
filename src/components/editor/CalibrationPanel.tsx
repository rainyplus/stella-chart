import { useRef, useState } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { validateChart, judgeHit } from '@/lib/chartUtils'
import { DEFAULT_JUDGMENT_CONFIG } from '../../../shared/constants.js'
import type { ChartValidationResult } from '../../../shared/types.js'

export default function CalibrationPanel() {
  const chart = useEditorStore((s) => s.chart)
  const [calibrationResult, setCalibrationResult] = useState<string | null>(null)
  const [validationResult, setValidationResult] = useState<ChartValidationResult | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const playTestTone = (frequency: number, duration: number, startTime?: number) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    const ctx = audioCtxRef.current
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => undefined)
    }

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = frequency

    const now = startTime || ctx.currentTime
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.3, now + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + duration + 0.02)
  }

  const handleVerifyWindow = () => {
    if (!chart) return

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => undefined)
      }

      const baseFreq = 880
      const now = ctx.currentTime + 0.1

      const perfectPlusWindow = DEFAULT_JUDGMENT_CONFIG.windows['Perfect+'] * 1000
      const perfectWindow = DEFAULT_JUDGMENT_CONFIG.windows['Perfect'] * 1000
      const greatWindow = DEFAULT_JUDGMENT_CONFIG.windows['Great'] * 1000
      const goodWindow = DEFAULT_JUDGMENT_CONFIG.windows['Good'] * 1000

      playTestTone(baseFreq, 0.05, now)
      playTestTone(baseFreq * 1.25, 0.05, now + 0.3)
      playTestTone(baseFreq * 1.5, 0.05, now + 0.6)
      playTestTone(baseFreq * 0.75, 0.05, now + 0.9)

      const testCases = [
        { name: 'Perfect+ 中心', deltaMs: 0, expected: 'Perfect+' as const },
        { name: 'Perfect+ 边界', deltaMs: perfectPlusWindow, expected: 'Perfect+' as const },
        { name: 'Perfect 边界', deltaMs: perfectWindow, expected: 'Perfect' as const },
        { name: 'Great 边界', deltaMs: greatWindow, expected: 'Great' as const },
        { name: 'Good 边界', deltaMs: goodWindow, expected: 'Good' as const },
      ]

      const results = testCases.map((tc) => {
        const judgment = judgeHit(tc.deltaMs / 1000)
        return {
          ...tc,
          actual: judgment,
          pass: judgment === tc.expected,
        }
      })

      const allPass = results.every((r) => r.pass)

      const lines = results.map((r) => {
        const status = r.pass ? '✓' : '✗'
        return `  ${r.name} (Δ${r.deltaMs.toFixed(0)}ms) → ${r.actual} ${status}`
      })

      const conclusion = allPass ? '通过 ✓' : '存在偏差 ✗'
      const resultText = `判定窗口验证：\n${lines.join('\n')}\n结论：${conclusion}\n\n（已播放测试音，参考音高从高到低）`
      setCalibrationResult(resultText)
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误'
      setCalibrationResult(`验证失败：${message}`)
    }
  }

  const handleValidateChart = () => {
    if (!chart) {
      setValidationResult({ valid: false, errors: ['未加载谱面'], warnings: [] })
      return
    }
    const result = validateChart(chart)
    setValidationResult(result)
  }

  return (
    <div className="border-t border-zinc-800 pt-4 mt-4 space-y-3">
      <h3 className="text-sm font-medium text-zinc-300">校准与校验</h3>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleVerifyWindow}
          className="px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium text-zinc-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          title="播放测试音并验证判定窗口配置"
        >
          验证判定窗口
        </button>
        <button
          type="button"
          onClick={handleValidateChart}
          className="px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium text-zinc-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          title="扫描谱面并报告数据错误和警告"
        >
          谱面校验
        </button>
      </div>

      {calibrationResult && (
        <pre className="text-xs whitespace-pre-wrap font-mono rounded-md bg-zinc-950/60 border border-zinc-800 p-2.5 text-zinc-300">
          {calibrationResult}
        </pre>
      )}

      {validationResult && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {validationResult.valid ? (
              <span className="text-xs text-emerald-400 font-medium">✓ 谱面有效</span>
            ) : (
              <span className="text-xs text-red-400 font-medium">✗ 谱面存在错误</span>
            )}
            {validationResult.warnings.length > 0 && (
              <span className="text-xs text-yellow-400">⚠ {validationResult.warnings.length} 个警告</span>
            )}
          </div>

          {(validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
            <ul
              className={`text-xs rounded-md border p-2.5 space-y-1 max-h-48 overflow-y-auto ${
                validationResult.valid
                  ? 'bg-yellow-950/20 border-yellow-800/40 text-yellow-300'
                  : 'bg-red-950/20 border-red-800/40 text-red-300'
              }`}
            >
              {validationResult.errors.map((msg, idx) => (
                <li key={`err-${idx}`} className="leading-relaxed">
                  <span className="text-red-400">✗ </span>
                  {msg}
                </li>
              ))}
              {validationResult.warnings.map((msg, idx) => (
                <li key={`warn-${idx}`} className="leading-relaxed">
                  <span className="text-yellow-400">⚠ </span>
                  {msg}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
