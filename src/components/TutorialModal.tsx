import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Sparkles, MousePointer2, Hand, Timer, Music, Play, Save, Download, Camera, Eye, Settings, HelpCircle } from 'lucide-react'

interface TutorialStep {
  title: string
  description: string
  icon: React.ReactNode
  tips?: string[]
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: '欢迎使用 STELLA CHART',
    description: 'STELLA CHART 是一款专业的3D音游制谱器，支持多种音符类型和多场景编辑。让我们一起来了解它的核心功能吧！',
    icon: <Sparkles className="w-12 h-12 text-brand-500" />,
    tips: [
      '支持Tap、Catch、Kick、Hold、Stalid五种音符类型',
      '多场景编辑，自由切换不同场面',
      '实时预览谱面效果',
    ],
  },
  {
    title: '工具栏与音符类型',
    description: '左侧工具栏提供了多种音符编辑工具，点击选择后即可在3D场景中放置对应音符。',
    icon: <MousePointer2 className="w-12 h-12 text-brand-500" />,
    tips: [
      '选择工具：选择和移动已放置的音符',
      'Tap：基础点击音符',
      'Catch：金色收集音符',
      'Kick：带方向的滑动音符',
      'Hold：长按持续音符',
      'Stalid：滑动轨迹音符',
    ],
  },
  {
    title: '放置音符',
    description: '选择工具后，在3D场景中点击即可放置音符。音符会从生成线飞向判定框。',
    icon: <Hand className="w-12 h-12 text-brand-500" />,
    tips: [
      '音符会自动吸附到最近的生成线上',
      '按1-6数字键可快速切换工具',
      '按住Ctrl+拖拽可以框选多个音符',
      'Delete键可删除选中的音符',
    ],
  },
  {
    title: 'Hold长条音符',
    description: '选择Hold工具后，点击放置起点，拖动调整长度，松开完成放置。长条会朝着判定框方向延伸。',
    icon: <Timer className="w-12 h-12 text-brand-500" />,
    tips: [
      '长条长度以四分音符数为单位',
      '播放时长条会随着进入判定框逐渐消失',
      '选中后可以在右侧属性面板调整参数',
    ],
  },
  {
    title: '判定框与场景',
    description: '每个场景可以有多个判定框，你可以自由移动判定框的位置，音符会飞向对应的判定框。',
    icon: <Settings className="w-12 h-12 text-brand-500" />,
    tips: [
      '点击判定框可以选中并拖动',
      '支持Z轴调整，打造立体空间感',
      '使用思维导图功能管理多个场景',
    ],
  },
  {
    title: '播放与预览',
    description: '使用底部播放控制栏可以预览谱面效果，调整播放速度，配合节拍器辅助制谱。',
    icon: <Play className="w-12 h-12 text-brand-500" />,
    tips: [
      '空格键可快速播放/暂停',
      '支持0.5x - 2x倍速播放',
      '拖动进度条可快速跳转',
      '节拍器功能辅助找准节奏',
    ],
  },
  {
    title: '视角控制',
    description: '提供多种预设视角，也可以自由旋转视角，方便从不同角度查看和编辑谱面。',
    icon: <Camera className="w-12 h-12 text-brand-500" />,
    tips: [
      '鼠标左键拖拽旋转视角',
      '鼠标滚轮缩放视角',
      '顶部有俯视、45°、低角、侧面等预设',
      '支持玩家视角和自由视角切换',
    ],
  },
  {
    title: '属性面板',
    description: '右侧属性面板可以精确调整选中音符或判定框的各项参数。',
    icon: <Eye className="w-12 h-12 text-brand-500" />,
    tips: [
      '精确调整位置坐标',
      '修改音符类型和参数',
      '调整判定框生成距离',
      '设置背景文字和图片',
    ],
  },
  {
    title: '保存与导出',
    description: '制作完成后记得保存，支持导出.selert格式的私有谱面文件。',
    icon: <Save className="w-12 h-12 text-brand-500" />,
    tips: [
      'Ctrl+S 快速保存',
      '导出的.selert文件可分享给他人',
      '支持导入.selert文件继续编辑',
      '建议定期备份重要谱面',
    ],
  },
  {
    title: '快捷键一览',
    description: '熟练使用快捷键可以大幅提高制谱效率。',
    icon: <HelpCircle className="w-12 h-12 text-brand-500" />,
    tips: [
      'Ctrl+Z：撤销',
      'Ctrl+Y / Ctrl+Shift+Z：重做',
      'Ctrl+S：保存',
      'Ctrl+A：全选音符',
      'Ctrl+C / Ctrl+V：复制粘贴',
      'Delete / Backspace：删除选中',
      '空格：播放/暂停',
      '1-6：切换工具',
      'Esc：取消选择',
    ],
  },
]

interface TutorialModalProps {
  onClose: () => void
  onComplete?: () => void
  autoStart?: boolean
}

export default function TutorialModal({ onClose, onComplete, autoStart = false }: TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const step = TUTORIAL_STEPS[currentStep]
  const isLast = currentStep === TUTORIAL_STEPS.length - 1
  const isFirst = currentStep === 0

  const handleNext = () => {
    if (isLast) {
      onComplete?.()
      onClose()
    } else {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-scale-in">
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={handleSkip}
            className="btn-icon !w-8 !h-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            title="跳过教程"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 flex items-center justify-center bg-brand-50 dark:bg-brand-900/20 rounded-2xl mb-6">
              {step.icon}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
              {step.title}
            </h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-lg leading-relaxed">
              {step.description}
            </p>
          </div>

          {step.tips && step.tips.length > 0 && (
            <div className="mb-8 p-5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                💡 小贴士
              </h4>
              <ul className="space-y-2">
                {step.tips.map((tip, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
                  >
                    <span className="text-brand-500 mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 mb-6">
            {TUTORIAL_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                  idx === currentStep
                    ? 'bg-brand-500 w-6'
                    : idx < currentStep
                    ? 'bg-brand-300 dark:bg-brand-700'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
                aria-label={`跳转到第${idx + 1}步`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              跳过教程
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={handlePrev}
                disabled={isFirst}
                className="btn-secondary !px-4 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                上一步
              </button>
              <button
                onClick={handleNext}
                className="btn-primary !px-5"
              >
                {isLast ? '完成' : '下一步'}
                {!isLast && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="text-center mt-4 text-xs text-slate-400 dark:text-slate-500">
            {currentStep + 1} / {TUTORIAL_STEPS.length}
          </div>
        </div>
      </div>
    </div>
  )
}
