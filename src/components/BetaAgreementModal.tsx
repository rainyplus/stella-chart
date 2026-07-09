import { useState } from 'react'
import { Shield, AlertTriangle, Database, MessageSquare, Users, Copyright, Settings, Check, FileText } from 'lucide-react'

interface BetaAgreementModalProps {
  onAgree: () => void
  onDisagree: () => void
}

export default function BetaAgreementModal({ onAgree, onDisagree }: BetaAgreementModalProps) {
  const [agreed, setAgreed] = useState(false)

  const terms = [
    {
      icon: Shield,
      title: '一、测试性质',
      content: '本版本为 STELLA CHART 内部测试版本，不代表最终产品品质。测试版本可能存在功能不完善、性能不稳定、数据丢失等问题，敬请理解。我们会根据测试反馈持续优化产品体验。'
    },
    {
      icon: AlertTriangle,
      title: '二、保密义务',
      content: '作为内测用户，您有义务对测试内容严格保密。请勿向外界泄露测试版本的任何信息，包括但不限于：功能截图、录屏视频、界面设计、功能特性、数据内容等。未经授权不得在任何公开平台发布相关内容。'
    },
    {
      icon: Database,
      title: '三、数据风险',
      content: '测试期间所有数据仅用于测试目的，服务器数据可能随时被清空、重置或丢失。请您务必做好重要数据的备份工作，切勿在测试环境中存储不可替代的重要数据。因数据清空造成的损失，团队不承担责任。'
    },
    {
      icon: MessageSquare,
      title: '四、反馈渠道',
      content: '我们诚挚欢迎您提供各类反馈，包括但不限于：Bug 报告、功能建议、体验优化意见等。您的每一条反馈都是我们改进产品的宝贵动力。反馈可通过产品内反馈通道或指定联系方式提交。'
    },
    {
      icon: Users,
      title: '五、使用限制',
      content: '本测试版本仅限受邀测试人员使用，账号仅限本人使用，不得转借、转让、售卖予他人。团队有权随时终止违规用户的测试资格。请勿将测试账号用于任何商业用途或非法活动。'
    },
    {
      icon: Copyright,
      title: '六、知识产权',
      content: 'STELLA CHART 及其所有相关内容（包括但不限于代码、界面设计、图形素材、文字内容、音效等）的全部知识产权归 STELLA CHART 团队所有。未经授权，任何人不得复制、修改、传播或用于商业用途。'
    },
    {
      icon: Settings,
      title: '七、协议变更',
      content: 'STELLA CHART 团队有权根据实际情况随时修改、更新本协议内容。协议变更后将在产品内公布，继续使用即视为您同意变更后的协议。如有重大变更，我们会通过适当方式通知您。'
    }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col animate-scale-in">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-14 h-14 bg-brand-50 dark:bg-brand-900/20 rounded-2xl flex items-center justify-center">
              <FileText className="w-7 h-7 text-brand-500" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 text-center">
            STELLA CHART 内测服务协议
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center">
            请仔细阅读以下协议条款
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-700 dark:text-amber-400 font-medium mb-1">温馨提示</p>
                <p className="text-sm text-amber-600 dark:text-amber-300/80">
                  欢迎参与 STELLA CHART 内测！在使用前请仔细阅读本协议所有条款。勾选「我已阅读并同意」即表示您已充分理解并接受本协议的全部内容。
                </p>
              </div>
            </div>
          </div>

          {terms.map((term, index) => {
            const Icon = term.icon
            return (
              <div
                key={index}
                className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-brand-500" />
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {term.title}
                  </h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed pl-6">
                  {term.content}
                </p>
              </div>
            )
          })}

          <div className="pt-2">
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
              如有任何疑问，请通过官方渠道联系 STELLA CHART 团队
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center justify-between mb-5">
            <label className="flex items-center gap-3 cursor-pointer group select-none">
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                  agreed
                    ? 'bg-brand-500 border-brand-500'
                    : 'bg-transparent border-slate-300 dark:border-slate-600 group-hover:border-brand-400'
                }`}
                onClick={() => setAgreed(!agreed)}
              >
                {agreed && <Check className="w-3.5 h-3.5 text-white" />}
              </div>
              <span
                className={`text-sm transition-colors duration-200 ${
                  agreed
                    ? 'text-brand-600 dark:text-brand-400 font-medium'
                    : 'text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100'
                }`}
                onClick={() => setAgreed(!agreed)}
              >
                我已阅读并同意上述《STELLA CHART 内测服务协议》
              </span>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onDisagree}
              className="flex-1 py-2.5 font-medium rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
            >
              不同意
            </button>
            <button
              onClick={onAgree}
              disabled={!agreed}
              className="flex-1 py-2.5 font-medium rounded-xl bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              进入系统
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
