import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  KeyRound, Megaphone, Trash2, Wrench, Database, 
  Download, Upload, Clock, AlertTriangle, ArrowLeft,
  Sun, Moon, User, Users, Music, FileText, Shield
} from 'lucide-react'
import { adminApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useTheme } from '@/hooks/useTheme'
import type { Announcement, MaintenanceStatus } from '../../shared/types.js'

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const { toggleTheme, isDark } = useTheme()
  const [stats, setStats] = useState<Record<string, number> | null>(null)
  const [codes, setCodes] = useState<{ code: string; used: boolean; usedBy?: string; createdAt: string }[]>([])
  const [users, setUsers] = useState<{ id: string; username: string; email: string; role: string; disabled: boolean; createdAt: string }[]>([])
  const [charts, setCharts] = useState<{ id: string; songName: string; bpm: number; difficulty: number; createdBy?: string; createdAt?: string; sceneCount: number }[]>([])
  const [count, setCount] = useState(1)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [showPasswordPanel, setShowPasswordPanel] = useState(true)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementContent, setAnnouncementContent] = useState('')
  const [announcementSuccess, setAnnouncementSuccess] = useState('')
  const [announcementError, setAnnouncementError] = useState('')
  const [showAnnouncementPanel, setShowAnnouncementPanel] = useState(true)
  const [showMaintenancePanel, setShowMaintenancePanel] = useState(true)
  const [showBackupPanel, setShowBackupPanel] = useState(true)
  const [maintenance, setMaintenance] = useState<MaintenanceStatus | null>(null)
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [maintenanceOpenTime, setMaintenanceOpenTime] = useState('')
  const [maintenanceSuccess, setMaintenanceSuccess] = useState('')
  const [maintenanceError, setMaintenanceError] = useState('')
  const [backupLoading, setBackupLoading] = useState(false)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [restoreSuccess, setRestoreSuccess] = useState('')
  const [restoreError, setRestoreError] = useState('')

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/')
      return
    }
    loadAll()
  }, [user, navigate])

  const loadAll = async () => {
    const [s, c, u, ch, a, m] = await Promise.all([
      adminApi.stats(),
      adminApi.listInviteCodes(),
      adminApi.listUsers(),
      adminApi.listCharts(),
      adminApi.listAnnouncements(),
      adminApi.getMaintenance(),
    ])
    setStats(s.stats)
    setCodes(c.codes)
    setUsers(u.users)
    setCharts(ch.charts)
    setAnnouncements(a.announcements)
    const active = a.announcements.find((ann) => ann.isActive)
    if (active) {
      setAnnouncementTitle(active.title)
      setAnnouncementContent(active.content)
    }
    setMaintenance(m.maintenance)
    setMaintenanceMessage(m.maintenance.message)
    if (m.maintenance.scheduledOpenTime) {
      setMaintenanceOpenTime(m.maintenance.scheduledOpenTime.slice(0, 16))
    }
  }

  const generateCodes = async () => {
    await adminApi.generateInviteCodes(count)
    const c = await adminApi.listInviteCodes()
    setCodes(c.codes)
  }

  const revokeCode = async (code: string) => {
    await adminApi.revokeInviteCode(code)
    setCodes((prev) => prev.filter((c) => c.code !== code))
  }

  const toggleUser = async (id: string) => {
    const res = await adminApi.toggleUser(id)
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, disabled: res.user.disabled } : u)))
  }

  const deleteUser = async (id: string) => {
    await adminApi.deleteUser(id)
    setUsers((prev) => prev.filter((u) => u.id !== id))
  }

  const deleteChart = async (id: string) => {
    await adminApi.deleteChart(id)
    setCharts((prev) => prev.filter((c) => c.id !== id))
  }

  const publishAnnouncement = async () => {
    setAnnouncementError('')
    setAnnouncementSuccess('')
    if (!announcementTitle.trim() || !announcementContent.trim()) {
      setAnnouncementError('请填写公告标题和内容')
      return
    }
    try {
      await adminApi.createAnnouncement(announcementTitle.trim(), announcementContent.trim())
      setAnnouncementSuccess('公告发布成功！')
      const a = await adminApi.listAnnouncements()
      setAnnouncements(a.announcements)
      setTimeout(() => setAnnouncementSuccess(''), 3000)
    } catch (err: unknown) {
      setAnnouncementError(err instanceof Error ? err.message : '发布失败')
    }
  }

  const deleteAnnouncement = async (id: string) => {
    try {
      await adminApi.deleteAnnouncement(id)
      setAnnouncements((prev) => prev.filter((a) => a.id !== id))
    } catch (err: unknown) {
      console.error(err)
    }
  }

  const toggleMaintenance = async () => {
    setMaintenanceError('')
    setMaintenanceSuccess('')
    if (!maintenance) return
    
    const newIsMaintenance = !maintenance.isMaintenance
    try {
      const scheduledOpenTime = maintenanceOpenTime ? new Date(maintenanceOpenTime).toISOString() : undefined
      const res = await adminApi.updateMaintenance({
        isMaintenance: newIsMaintenance,
        message: maintenanceMessage || '服务器维护中，请稍后再试',
        scheduledOpenTime,
      })
      setMaintenance(res.maintenance)
      setMaintenanceSuccess(newIsMaintenance ? '维护模式已开启' : '维护模式已关闭')
      setTimeout(() => setMaintenanceSuccess(''), 3000)
    } catch (err: unknown) {
      setMaintenanceError(err instanceof Error ? err.message : '操作失败')
    }
  }

  const downloadBackup = async () => {
    setBackupLoading(true)
    setRestoreError('')
    setRestoreSuccess('')
    try {
      const blob = await adminApi.downloadBackup()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      a.download = `stella-backup-${timestamp}.stebak`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      setRestoreError(err instanceof Error ? err.message : '下载备份失败')
    } finally {
      setBackupLoading(false)
    }
  }

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setRestoreLoading(true)
    setRestoreError('')
    setRestoreSuccess('')
    
    try {
      const text = await file.text()
      const confirmed = window.confirm('确定要恢复数据吗？这将覆盖当前所有数据，服务器将自动重启。')
      if (!confirmed) {
        e.target.value = ''
        return
      }
      await adminApi.restoreBackup(text)
      setRestoreSuccess('数据恢复成功，服务器正在重启...')
    } catch (err: unknown) {
      setRestoreError(err instanceof Error ? err.message : '恢复备份失败')
    } finally {
      setRestoreLoading(false)
      e.target.value = ''
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('请填写所有密码字段')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('新密码长度至少为 6 位')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的新密码不一致')
      return
    }

    setPasswordLoading(true)
    try {
      await adminApi.changePassword(oldPassword, newPassword)
      setPasswordSuccess('密码修改成功！')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(''), 3000)
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : '密码修改失败')
    } finally {
      setPasswordLoading(false)
    }
  }

  const statIcons: Record<string, typeof Users> = {
    '用户数': Users,
    '谱面数': Music,
    '邀请码': KeyRound,
    '公告数': FileText,
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="btn-icon"
              title="返回主页"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <img
              src="/stella-logo.png"
              alt="STELLA"
              className="h-10 object-contain dark:brightness-110"
            />
            <div>
              <h1 className="text-lg font-bold tracking-wider text-slate-800 dark:text-slate-100">
                STELLA CHART
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">管理后台</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="btn-icon"
              title={isDark ? '切换到浅色模式' : '切换到深色模式'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
              <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-brand-500" />
              </div>
              <div>
                <span className="text-sm font-medium">{user?.username}</span>
                <span className="text-xs text-brand-500 block -mt-0.5">管理员</span>
              </div>
            </div>
          </div>
        </header>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-in-up">
            {Object.entries(stats).map(([k, v], index) => {
              const Icon = statIcons[k] || FileText
              return (
                <div
                  key={k}
                  className="card p-5"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-brand-500" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{k}</div>
                      <div className="text-xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">{v}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <section className="card p-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <button
              onClick={() => setShowPasswordPanel(!showPasswordPanel)}
              className="w-full flex items-center justify-between"
            >
              <h2 className="text-base font-semibold flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-brand-500" />
                </div>
                修改管理员密码
              </h2>
              <span className="text-slate-400 text-sm">
                {showPasswordPanel ? '收起' : '展开'}
              </span>
            </button>

            {showPasswordPanel && (
              <form onSubmit={handleChangePassword} className="space-y-4 mt-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">当前密码</label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="input"
                      placeholder="输入当前密码"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">新密码</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input"
                      placeholder="至少 6 位"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">确认新密码</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input"
                      placeholder="再次输入新密码"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="btn-primary"
                  >
                    {passwordLoading ? '修改中...' : '修改密码'}
                  </button>

                  {passwordError && (
                    <span className="text-sm text-red-500">{passwordError}</span>
                  )}
                  {passwordSuccess && (
                    <span className="text-sm text-emerald-500">{passwordSuccess}</span>
                  )}
                </div>
              </form>
            )}
          </section>

          <section className="card p-6 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <button
              onClick={() => setShowMaintenancePanel(!showMaintenancePanel)}
              className="w-full flex items-center justify-between"
            >
              <h2 className="text-base font-semibold flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                  <Wrench className="w-4 h-4 text-amber-500" />
                </div>
                服务器维护
              </h2>
              <span className="text-slate-400 text-sm">
                {showMaintenancePanel ? '收起' : '展开'}
              </span>
            </button>

            {showMaintenancePanel && maintenance && (
              <div className="space-y-4 mt-5">
                <div className={`p-4 rounded-xl border ${
                  maintenance.isMaintenance
                    ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50'
                    : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {maintenance.isMaintenance ? (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-emerald-500/30 flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      </span>
                    )}
                    <span className={`font-medium text-sm ${
                      maintenance.isMaintenance ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      当前状态：{maintenance.isMaintenance ? '维护中' : '正常运行'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    上次更新：{new Date(maintenance.updatedAt).toLocaleString()}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">维护提示消息</label>
                  <input
                    type="text"
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                    className="input"
                    placeholder="服务器维护中，请稍后再试"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    预计开服时间（可选）
                  </label>
                  <input
                    type="datetime-local"
                    value={maintenanceOpenTime}
                    onChange={(e) => setMaintenanceOpenTime(e.target.value)}
                    className="input"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    设置后用户端将显示开服倒计时
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={toggleMaintenance}
                    className={`px-4 py-2 font-medium transition-colors border rounded-xl ${
                      maintenance.isMaintenance
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
                    }`}
                  >
                    {maintenance.isMaintenance ? '解除维护' : '开启维护'}
                  </button>

                  {maintenanceError && (
                    <span className="text-sm text-red-500">{maintenanceError}</span>
                  )}
                  {maintenanceSuccess && (
                    <span className="text-sm text-emerald-500">{maintenanceSuccess}</span>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="card p-6 mb-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <button
            onClick={() => setShowBackupPanel(!showBackupPanel)}
            className="w-full flex items-center justify-between"
          >
            <h2 className="text-base font-semibold flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                <Database className="w-4 h-4 text-purple-500" />
              </div>
              数据备份与恢复
            </h2>
            <span className="text-slate-400 text-sm">
              {showBackupPanel ? '收起' : '展开'}
            </span>
          </button>

          {showBackupPanel && (
            <div className="space-y-5 mt-5">
              <div className="p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/50 rounded-xl">
                <p className="text-sm text-slate-700 dark:text-slate-200 mb-1">
                  💾 备份包含所有用户、谱面、邀请码、公告等数据，使用AES-256加密存储。
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  备份文件格式：.stebak （Stella Chart Backup）
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={downloadBackup}
                  disabled={backupLoading}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {backupLoading ? '打包中...' : '打包下载备份'}
                </button>

                <label className="btn-secondary cursor-pointer flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  {restoreLoading ? '恢复中...' : '上传恢复备份'}
                  <input
                    type="file"
                    accept=".stebak"
                    onChange={handleRestoreBackup}
                    disabled={restoreLoading}
                    className="hidden"
                  />
                </label>
              </div>

              {restoreError && (
                <div className="text-sm text-red-500 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl">
                  {restoreError}
                </div>
              )}
              {restoreSuccess && (
                <div className="text-sm text-emerald-500 p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
                  {restoreSuccess}
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">⚠️ 注意事项</h3>
                <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1 list-disc list-inside">
                  <li>恢复备份将覆盖当前所有数据，操作不可撤销</li>
                  <li>恢复成功后服务器将自动重启</li>
                  <li>请确保备份文件来自可信来源</li>
                  <li>建议在维护模式下进行数据恢复操作</li>
                </ul>
              </div>
            </div>
          )}
        </section>

        <section className="card p-6 mb-6 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
          <button
            onClick={() => setShowAnnouncementPanel(!showAnnouncementPanel)}
            className="w-full flex items-center justify-between"
          >
            <h2 className="text-base font-semibold flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                <Megaphone className="w-4 h-4 text-brand-500" />
              </div>
              公告管理
            </h2>
            <span className="text-slate-400 text-sm">
              {showAnnouncementPanel ? '收起' : '展开'}
            </span>
          </button>

          {showAnnouncementPanel && (
            <div className="space-y-5 mt-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">当前生效公告</label>
                {announcements.find((a) => a.isActive) ? (
                  <div className="p-4 bg-brand-50 dark:bg-brand-900/10 border border-brand-200 dark:border-brand-800/50 rounded-xl">
                    <div className="text-brand-600 dark:text-brand-400 font-medium mb-1">
                      {announcements.find((a) => a.isActive)?.title}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      发布于 {new Date(announcements.find((a) => a.isActive)!.createdAt).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 text-sm">
                    暂无生效公告
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">公告标题</label>
                <input
                  type="text"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  className="input"
                  placeholder="请输入公告标题"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">公告内容</label>
                <textarea
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  rows={4}
                  className="input resize-y"
                  placeholder="请输入公告内容"
                />
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={publishAnnouncement}
                  className="btn-primary"
                >
                  发布公告
                </button>

                {announcementError && (
                  <span className="text-sm text-red-500">{announcementError}</span>
                )}
                {announcementSuccess && (
                  <span className="text-sm text-emerald-500">{announcementSuccess}</span>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">历史公告</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {announcements.length === 0 ? (
                    <div className="text-slate-500 dark:text-slate-400 text-sm py-4 text-center">
                      暂无历史公告
                    </div>
                  ) : (
                    announcements.map((ann) => (
                      <div
                        key={ann.id}
                        className={`p-3 border rounded-xl flex items-start justify-between gap-3 ${
                          ann.isActive
                            ? 'bg-brand-50 dark:bg-brand-900/10 border-brand-200 dark:border-brand-800/50'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-slate-800 dark:text-slate-100 truncate">
                              {ann.title}
                            </span>
                            {ann.isActive && (
                              <span className="badge-brand flex-shrink-0">
                                当前生效
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                            {new Date(ann.createdAt).toLocaleString()}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                            {ann.content}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteAnnouncement(ann.id)}
                          className="text-red-500 hover:text-red-600 transition-colors flex-shrink-0 p-1"
                          title="删除公告"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="card p-6 mb-6 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-amber-500" />
            </div>
            邀请码管理
          </h2>
          <div className="flex gap-3 mb-4">
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-24 input"
            />
            <button
              onClick={generateCodes}
              className="btn-primary"
            >
              生成邀请码
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {codes.map((c) => (
              <div
                key={c.code}
                className={`px-3 py-1.5 border rounded-lg text-sm flex items-center gap-2 font-mono ${
                  c.used
                    ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                    : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                <span>{c.code}</span>
                {!c.used && (
                  <button
                    onClick={() => revokeCode(c.code)}
                    className="text-red-500 hover:text-red-600 transition-colors"
                    title="撤销"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6 mb-6 animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-brand-500" />
            </div>
            用户管理
          </h2>
          <div className="overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 font-medium pr-4">用户名</th>
                  <th className="font-medium pr-4">邮箱</th>
                  <th className="font-medium pr-4">角色</th>
                  <th className="font-medium pr-4">状态</th>
                  <th className="font-medium pr-4">注册时间</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className={`border-b border-slate-100 dark:border-slate-800 ${u.disabled ? 'opacity-60' : ''}`}
                  >
                    <td className="py-3 pr-4 font-medium text-slate-800 dark:text-slate-100">{u.username}</td>
                    <td className="pr-4 text-slate-600 dark:text-slate-300">{u.email}</td>
                    <td className="pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        u.role === 'admin'
                          ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>
                        {u.role === 'admin' ? '管理员' : '用户'}
                      </span>
                    </td>
                    <td className="pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        u.disabled
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                          : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {u.disabled ? '已禁用' : '正常'}
                      </span>
                    </td>
                    <td className="pr-4 text-slate-500 dark:text-slate-400 text-xs">
                      {new Date(u.createdAt).toLocaleString()}
                    </td>
                    <td className="flex gap-3">
                      {u.role !== 'admin' && (
                        <>
                          <button
                            onClick={() => toggleUser(u.id)}
                            className={
                              u.disabled
                                ? 'text-emerald-500 hover:text-emerald-600 transition-colors text-sm'
                                : 'text-amber-500 hover:text-amber-600 transition-colors text-sm'
                            }
                          >
                            {u.disabled ? '启用' : '禁用'}
                          </button>
                          <button
                            onClick={() => deleteUser(u.id)}
                            className="text-red-500 hover:text-red-600 transition-colors text-sm"
                          >
                            删除
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card p-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
              <Music className="w-4 h-4 text-purple-500" />
            </div>
            谱面管理
          </h2>
          <div className="overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 font-medium pr-4">曲名</th>
                  <th className="font-medium pr-4">BPM</th>
                  <th className="font-medium pr-4">难度</th>
                  <th className="font-medium pr-4">场景数</th>
                  <th className="font-medium pr-4">作者ID</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {charts.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-3 pr-4 font-medium text-slate-800 dark:text-slate-100">{c.songName}</td>
                    <td className="pr-4 text-slate-600 dark:text-slate-300">{c.bpm}</td>
                    <td className="pr-4 text-slate-600 dark:text-slate-300">{c.difficulty.toFixed(1)}</td>
                    <td className="pr-4 text-slate-600 dark:text-slate-300">{c.sceneCount}</td>
                    <td className="pr-4 text-slate-500 dark:text-slate-400 text-xs font-mono">{c.createdBy}</td>
                    <td>
                      <button
                        onClick={() => deleteChart(c.id)}
                        className="text-red-500 hover:text-red-600 transition-colors text-sm"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
          © STELLA CHART · 保留所有权利
        </div>
      </div>
    </div>
  )
}
