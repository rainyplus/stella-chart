import { Megaphone, Check } from 'lucide-react'
import type { Announcement } from '../../shared/types.js'

interface AnnouncementModalProps {
  announcement: Announcement
  onConfirm: () => void
}

export default function AnnouncementModal({ announcement, onConfirm }: AnnouncementModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl max-h-[80vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col animate-scale-in">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-14 h-14 bg-brand-50 dark:bg-brand-900/20 rounded-2xl flex items-center justify-center">
              <Megaphone className="w-7 h-7 text-brand-500" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 text-center">
            系统公告
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 p-4 mb-4 rounded-xl">
            <div className="flex items-start gap-3">
              <Megaphone className="w-5 h-5 text-brand-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-base text-slate-900 dark:text-slate-100 font-semibold mb-1">
                  {announcement.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  发布于 {new Date(announcement.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4 rounded-xl">
            <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {announcement.content}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
          <button
            onClick={onConfirm}
            className="w-full py-2.5 font-medium rounded-xl bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            我已知晓
          </button>
        </div>
      </div>
    </div>
  )
}
