import { useState, useEffect } from 'react'
import { Wrench, Clock } from 'lucide-react'
import { systemApi } from '@/lib/api'
import type { MaintenanceStatus } from '../../shared/types.js'

interface MaintenancePageProps {
  isAdmin?: boolean
}

export default function MaintenancePage({ isAdmin = false }: MaintenancePageProps) {
  const [maintenance, setMaintenance] = useState<MaintenanceStatus | null>(null)
  const [countdown, setCountdown] = useState<string>('')

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const res = await systemApi.getMaintenanceStatus()
        setMaintenance(res.maintenance)
      } catch {
        // ignore
      }
    }
    loadStatus()
    const interval = setInterval(loadStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!maintenance?.scheduledOpenTime) {
      setCountdown('')
      return
    }

    const updateCountdown = () => {
      const openTime = new Date(maintenance.scheduledOpenTime!).getTime()
      const now = Date.now()
      const diff = openTime - now

      if (diff <= 0) {
        setCountdown('即将开服')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (hours > 0) {
        setCountdown(`${hours}小时${minutes}分${seconds}秒`)
      } else if (minutes > 0) {
        setCountdown(`${minutes}分${seconds}秒`)
      } else {
        setCountdown(`${seconds}秒`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [maintenance?.scheduledOpenTime])

  if (!maintenance) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center animate-fade-in">
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-6 bg-amber-100 dark:bg-amber-900/30 rounded-3xl flex items-center justify-center animate-float-soft">
            <Wrench className="w-12 h-12 text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            服务器维护中
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
            {maintenance.message}
          </p>
        </div>

        {maintenance.scheduledOpenTime && countdown && (
          <div className="mb-8 p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="flex items-center justify-center gap-2 mb-3 text-slate-500 dark:text-slate-400">
              <Clock className="w-5 h-5" />
              <span className="text-sm font-medium">预计开服倒计时</span>
            </div>
            <div className="text-4xl font-bold text-amber-500 font-mono tracking-wider animate-pulse-soft">
              {countdown}
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl mb-6">
            <p className="text-emerald-700 dark:text-emerald-400 text-sm">
              🔐 您是管理员，不受维护模式限制，可以正常访问系统
            </p>
          </div>
        )}

        <div className="text-sm text-slate-400 dark:text-slate-500">
          <p>感谢您的耐心等待，我们会尽快完成维护</p>
          <p className="mt-2">
            最后更新：{new Date(maintenance.updatedAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}
