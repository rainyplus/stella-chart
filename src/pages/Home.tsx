import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, Upload, Download, Trash2, Music, Image as ImageIcon,
  LogOut, User, Play, Pencil, Shield, Check, Sun, Moon,
  Monitor, Smartphone, MessageSquare, HelpCircle, Disc3,
  Wrench, Clock
} from 'lucide-react'
import { chartApi, uploadApi, exportApi, announcementApi, systemApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useTheme } from '@/hooks/useTheme'
import BetaAgreementModal from '@/components/BetaAgreementModal'
import AnnouncementModal from '@/components/AnnouncementModal'
import TutorialModal from '@/components/TutorialModal'
import type { Announcement, MaintenanceStatus } from '../../shared/types.js'

interface ChartMeta {
  id: string
  songName: string
  artist: string
  charter: string
  bpm: number
  difficulty: number
  coverUrl?: string
  createdAt?: string
  updatedAt?: string
}

function getDifficultyColor(difficulty: number): string {
  if (difficulty >= 15) return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50'
  if (difficulty >= 12) return 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/50'
  if (difficulty >= 9) return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50'
  if (difficulty >= 6) return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
  if (difficulty >= 3) return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50'
  return 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/50'
}

export default function Home() {
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const { theme, toggleTheme, isDark } = useTheme()
  
  const [charts, setCharts] = useState<ChartMeta[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [showBetaAgreement, setShowBetaAgreement] = useState(false)
  const [showAnnouncement, setShowAnnouncement] = useState(false)
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null)
  const [showDeviceWarning, setShowDeviceWarning] = useState(false)
  const [showDemoDisabled, setShowDemoDisabled] = useState(false)
  const [showCopyrightModal, setShowCopyrightModal] = useState(false)
  const [pendingAudioFile, setPendingAudioFile] = useState<File | null>(null)
  const [modalCopyrightAgreed, setModalCopyrightAgreed] = useState(false)
  const [showImportProgress, setShowImportProgress] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importStep, setImportStep] = useState('')
  const [showTutorial, setShowTutorial] = useState(false)
  const [maintenanceStatus, setMaintenanceStatus] = useState<MaintenanceStatus | null>(null)
  const [checkingMaintenance, setCheckingMaintenance] = useState(true)
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false)
  const [maintenanceCountdown, setMaintenanceCountdown] = useState('')
  
  const [songName, setSongName] = useState('')
  const [artist, setArtist] = useState('')
  const [charter, setCharter] = useState('')
  const [bpm, setBpm] = useState(120)
  const [difficulty, setDifficulty] = useState(5)
  const [offset, setOffset] = useState(0)
  const [audioUrl, setAudioUrl] = useState('')
  const [audioMd5, setAudioMd5] = useState('')
  const [audioName, setAudioName] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [coverName, setCoverName] = useState('')
  const [createError, setCreateError] = useState('')
  const [copyrightAgreed, setCopyrightAgreed] = useState(false)
  
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      navigate('/login')
      return
    }
    checkMaintenance()
  }, [user, isLoading, navigate])

  const checkMaintenance = async () => {
    try {
      const res = await systemApi.getMaintenanceStatus()
      setMaintenanceStatus(res.maintenance)
      setCheckingMaintenance(false)
      checkDevice()
      const agreed = localStorage.getItem('stella-beta-agreed')
      if (!agreed) {
        setShowBetaAgreement(true)
      } else {
        checkAnnouncement()
        loadCharts()
      }
    } catch {
      setCheckingMaintenance(false)
      checkDevice()
      const agreed = localStorage.getItem('stella-beta-agreed')
      if (!agreed) {
        setShowBetaAgreement(true)
      } else {
        checkAnnouncement()
        loadCharts()
      }
    }
  }

  const checkDevice = () => {
    const ua = navigator.userAgent
    const isPhone = /iPhone|iPod|Android.*Mobile|Windows Phone|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)
    const isTablet = /iPad|Tablet|Android(?!.*Mobile)|PlayBook|Silk|Kindle/i.test(ua)
    const isDesktop = /Windows|Macintosh|Linux|X11|CrOS/i.test(ua)

    if (isPhone && !isTablet && !isDesktop) {
      const dismissed = localStorage.getItem('stella-device-warning-dismissed')
      if (!dismissed) {
        setShowDeviceWarning(true)
      }
    }
  }

  const handleDismissDeviceWarning = () => {
    localStorage.setItem('stella-device-warning-dismissed', 'true')
    setShowDeviceWarning(false)
  }

  const checkAnnouncement = async () => {
    try {
      const res = await announcementApi.getCurrent()
      if (res.announcement) {
        const confirmed = localStorage.getItem(`stella-announcement-confirmed-${res.announcement.id}`)
        if (!confirmed) {
          setCurrentAnnouncement(res.announcement)
          setShowAnnouncement(true)
        }
      }
    } catch (err) {
      console.error('Failed to check announcement:', err)
    }
  }

  const handleAgreeBeta = () => {
    localStorage.setItem('stella-beta-agreed', 'true')
    setShowBetaAgreement(false)
    checkAnnouncement()
    loadCharts()
  }

  const handleConfirmAnnouncement = () => {
    if (currentAnnouncement) {
      localStorage.setItem(`stella-announcement-confirmed-${currentAnnouncement.id}`, 'true')
    }
    setShowAnnouncement(false)
    setCurrentAnnouncement(null)
  }

  const handleDisagreeBeta = () => {
    logout()
    navigate('/login')
  }

  const loadCharts = async () => {
    try {
      const data = await chartApi.list()
      setCharts(data.charts as ChartMeta[])
    } catch (err: unknown) {
      console.error(err)
    }
  }

  const updateMaintenanceCountdown = useCallback(() => {
    if (!maintenanceStatus?.scheduledOpenTime) {
      setMaintenanceCountdown('')
      return
    }
    const openTime = new Date(maintenanceStatus.scheduledOpenTime).getTime()
    const now = Date.now()
    const diff = openTime - now
    if (diff <= 0) {
      setMaintenanceCountdown('即将开服')
      return
    }
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    if (hours > 0) {
      setMaintenanceCountdown(`${hours}小时${minutes}分${seconds}秒`)
    } else if (minutes > 0) {
      setMaintenanceCountdown(`${minutes}分${seconds}秒`)
    } else {
      setMaintenanceCountdown(`${seconds}秒`)
    }
  }, [maintenanceStatus?.scheduledOpenTime])

  useEffect(() => {
    if (!showMaintenanceModal) return
    updateMaintenanceCountdown()
    const interval = setInterval(updateMaintenanceCountdown, 1000)
    return () => clearInterval(interval)
  }, [showMaintenanceModal, updateMaintenanceCountdown])

  const checkCanEnterEditor = useCallback((): boolean => {
    if (maintenanceStatus?.isMaintenance && user?.role !== 'admin') {
      setShowMaintenanceModal(true)
      return false
    }
    return true
  }, [maintenanceStatus, user])

  const handleEnterEditor = useCallback((chartId: string) => {
    if (!checkCanEnterEditor()) return
    navigate(`/editor/${chartId}`)
  }, [checkCanEnterEditor, navigate])

  const handleCreateChart = useCallback(() => {
    if (!checkCanEnterEditor()) return
    setShowCreate(true)
  }, [checkCanEnterEditor])

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingAudioFile(file)
    setModalCopyrightAgreed(false)
    setShowCopyrightModal(true)
    e.target.value = ''
  }

  const confirmCopyrightAndUpload = async () => {
    if (!pendingAudioFile) return
    if (!modalCopyrightAgreed) return
    setShowCopyrightModal(false)
    setAudioName(pendingAudioFile.name)
    setCopyrightAgreed(true)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string
        const res = await uploadApi.audio(pendingAudioFile.name, dataUrl)
        setAudioUrl(res.url)
        setAudioMd5(res.md5)
      } catch (err: unknown) {
        setCreateError(err instanceof Error ? err.message : '音频上传失败')
      }
    }
    reader.readAsDataURL(pendingAudioFile)
    setPendingAudioFile(null)
  }

  const cancelCopyrightUpload = () => {
    setShowCopyrightModal(false)
    setPendingAudioFile(null)
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverName(file.name)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string
        const res = await uploadApi.cover(file.name, dataUrl)
        setCoverUrl(res.url)
      } catch (err: unknown) {
        setCreateError(err instanceof Error ? err.message : '封面上传失败')
      }
    }
    reader.readAsDataURL(file)
  }

  const createChart = async () => {
    setCreateError('')
    if (!songName.trim()) {
      setCreateError('请填写歌曲名')
      return
    }
    if (audioUrl && !copyrightAgreed) {
      setCreateError('请确认上传的音乐已获得合法授权')
      return
    }
    try {
      const { chart } = await chartApi.create({ songName, artist, charter, bpm, difficulty, offset, audioUrl, audioMd5, coverUrl })
      navigate(`/editor/${chart.id}`)
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : '创建失败')
    }
  }

  const deleteChart = async (id: string) => {
    try {
      await chartApi.delete(id)
      setCharts((prev) => prev.filter((c) => c.id !== id))
    } catch (err: unknown) {
      console.error(err)
    }
  }

  const exportChart = async (id: string, name: string) => {
    try {
      const blob = await exportApi.exportChart(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${name}.selert`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      console.error(err)
    }
  }

  const importChart = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setShowImportProgress(true)
    setImportProgress(0)
    setImportStep('读取文件中...')

    try {
      await new Promise((resolve) => setTimeout(resolve, 150))
      setImportProgress(20)

      const text = await file.text()
      setImportStep('解析数据中...')
      setImportProgress(40)

      await new Promise((resolve) => setTimeout(resolve, 150))
      setImportStep('验证数据中...')
      setImportProgress(60)

      const { chart } = await exportApi.importChart(text)
      setImportStep('加载音频中...')
      setImportProgress(80)

      await new Promise((resolve) => setTimeout(resolve, 150))
      setImportStep('初始化场景中...')
      setImportProgress(100)

      await new Promise((resolve) => setTimeout(resolve, 200))
      navigate(`/editor/${chart.id}`)
    } catch (err: unknown) {
      console.error(err)
      setShowImportProgress(false)
    }
  }

  if (isLoading || !user || checkingMaintenance) return null

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 relative">
      {showBetaAgreement && (
        <BetaAgreementModal
          onAgree={handleAgreeBeta}
          onDisagree={handleDisagreeBeta}
        />
      )}
      {showAnnouncement && currentAnnouncement && (
        <AnnouncementModal
          announcement={currentAnnouncement}
          onConfirm={handleConfirmAnnouncement}
        />
      )}

      {showTutorial && (
        <TutorialModal
          onClose={() => {
            setShowTutorial(false)
            localStorage.setItem('stella-tutorial-completed', 'true')
          }}
          onComplete={() => {
            localStorage.setItem('stella-tutorial-completed', 'true')
          }}
        />
      )}

      {showDeviceWarning && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                  <Smartphone className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">设备提示</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Device Notice</p>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                <p className="text-slate-700 dark:text-slate-200">请使用电脑或平板设备访问 STELLA CHART</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  为了获得最佳制谱体验，建议使用大屏幕设备。手机屏幕较小，可能会影响操作体验。
                </p>
              </div>
              <button
                onClick={handleDismissDeviceWarning}
                className="w-full btn-primary"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {showCopyrightModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-lg">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                  <Shield className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">版权声明</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Copyright Notice</p>
                </div>
              </div>

              <div className="space-y-3 mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  请确保您上传的音乐拥有合法版权或已获得授权
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  未经授权上传受版权保护的音乐可能导致法律纠纷。
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  STELLA CHART 仅用于个人学习和创作交流，请勿用于商业用途。
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  上传即表示您确认对该音乐拥有合法使用权，并承担由此产生的一切责任。
                </p>
              </div>

              <label className="flex items-start gap-3 mb-6 cursor-pointer group">
                <button
                  type="button"
                  onClick={() => setModalCopyrightAgreed(!modalCopyrightAgreed)}
                  className={`mt-0.5 w-5 h-5 flex-shrink-0 border-2 flex items-center justify-center rounded-md transition-all duration-200 ${
                    modalCopyrightAgreed
                      ? 'border-brand-500 bg-brand-500'
                      : 'border-slate-300 dark:border-slate-600 bg-transparent group-hover:border-brand-400'
                  }`}
                >
                  {modalCopyrightAgreed && <Check className="w-3 h-3 text-white" />}
                </button>
                <span className={`text-sm transition-colors duration-200 ${
                  modalCopyrightAgreed ? 'text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-200'
                }`}>
                  我确认上传的音乐已获得合法授权，且仅用于个人学习交流
                </span>
              </label>

              <div className="flex gap-3">
                <button
                  onClick={cancelCopyrightUpload}
                  className="flex-1 btn-secondary"
                >
                  取消
                </button>
                <button
                  onClick={confirmCopyrightAndUpload}
                  disabled={!modalCopyrightAgreed}
                  className="flex-1 btn-primary"
                >
                  确认并上传
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <img
              src="/stella-logo.png"
              alt="STELLA"
              className="h-10 object-contain dark:brightness-110"
            />
            <div>
              <h1 className="text-lg font-bold tracking-wider text-slate-800 dark:text-slate-100">
                STELLA CHART
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">制谱器</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTutorial(true)}
              className="btn-secondary"
              title="新手教程"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">新手教程</span>
            </button>
            
            <button
              onClick={() => window.open('https://wj.qq.com/s2/27273885/8c11/', '_blank')}
              className="btn-secondary"
              title="问卷反馈"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">问卷反馈</span>
            </button>
            
            <button
              onClick={toggleTheme}
              className="btn-icon"
              title={isDark ? '切换到浅色模式' : '切换到深色模式'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
              <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </div>
              <span className="text-sm font-medium">{user.username}</span>
            </div>
            
            {user.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="btn-secondary"
              >
                后台管理
              </button>
            )}
            
            <button
              onClick={logout}
              className="btn-icon text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              title="登出"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-3 mb-8">
          <button
            onClick={handleCreateChart}
            className="btn-primary shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40"
          >
            <Plus className="w-5 h-5" />
            创建谱面
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="btn-secondary"
          >
            <Upload className="w-4 h-4" />
            导入谱面
          </button>
          <input ref={importRef} type="file" accept=".selert" className="hidden" onChange={importChart} />
        </div>

        {showCreate && (
          <div className="modal-overlay">
            <div className="modal-content max-w-2xl">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">新建谱面</h2>
                  <button
                    onClick={() => setShowCreate(false)}
                    className="btn-icon -mr-2 -mt-2"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {createError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-sm rounded-lg">
                    {createError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">曲名</label>
                    <input
                      value={songName}
                      onChange={(e) => setSongName(e.target.value)}
                      placeholder="请输入歌曲名"
                      className="input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">曲师</label>
                      <input
                        value={artist}
                        onChange={(e) => setArtist(e.target.value)}
                        placeholder="请输入曲师名"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">谱师</label>
                      <input
                        value={charter}
                        onChange={(e) => setCharter(e.target.value)}
                        placeholder="请输入谱师名"
                        className="input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">BPM</label>
                      <input
                        type="number"
                        value={bpm}
                        onChange={(e) => setBpm(Number(e.target.value))}
                        placeholder="BPM"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">难度定数</label>
                      <input
                        type="number"
                        value={difficulty}
                        onChange={(e) => setDifficulty(Number(e.target.value))}
                        placeholder="难度"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">偏移 (s)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={offset}
                        onChange={(e) => setOffset(Number(e.target.value))}
                        placeholder="Offset"
                        className="input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">音频文件</label>
                      <label className={`flex items-center justify-center gap-2 px-3 py-4 border-2 border-dashed rounded-xl cursor-pointer text-sm transition-colors ${
                        audioUrl
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-brand-300 dark:hover:border-brand-600 hover:text-brand-500'
                      }`}>
                        <Music className="w-5 h-5" />
                        <span className="truncate flex-1 text-center">{audioName || '上传音频'}</span>
                        {audioUrl && <Check className="w-5 h-5" />}
                        <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">封面图片</label>
                      <label className={`flex items-center justify-center gap-2 px-3 py-4 border-2 border-dashed rounded-xl cursor-pointer text-sm transition-colors ${
                        coverUrl
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-brand-300 dark:hover:border-brand-600 hover:text-brand-500'
                      }`}>
                        <ImageIcon className="w-5 h-5" />
                        <span className="truncate flex-1 text-center">{coverName || '上传封面'}</span>
                        {coverUrl && <Check className="w-5 h-5" />}
                        <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                      </label>
                    </div>
                  </div>

                  {audioUrl && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-4 rounded-xl">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">版权声明</p>
                          <div className="text-xs text-amber-600 dark:text-amber-300/80 space-y-1">
                            <p>请确保您上传的音乐拥有合法版权或已获得授权。</p>
                            <p>未经授权上传受版权保护的音乐可能导致法律纠纷。</p>
                            <p>STELLA CHART 仅用于个人学习和创作交流。</p>
                          </div>
                        </div>
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div
                          className={`w-5 h-5 border-2 rounded-md flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                            copyrightAgreed
                              ? 'bg-brand-500 border-brand-500'
                              : 'bg-transparent border-slate-300 dark:border-slate-600 group-hover:border-brand-400'
                          }`}
                          onClick={() => setCopyrightAgreed(!copyrightAgreed)}
                        >
                          {copyrightAgreed && (
                            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <span
                          className={`text-sm transition-colors duration-200 ${
                            copyrightAgreed ? 'text-brand-600 dark:text-brand-400 font-medium' : 'text-slate-600 dark:text-slate-300'
                          }`}
                          onClick={() => setCopyrightAgreed(!copyrightAgreed)}
                        >
                          我确认上传的音乐已获得合法授权
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3 justify-end">
                <button
                  onClick={() => setShowCreate(false)}
                  className="btn-secondary"
                >
                  取消
                </button>
                <button
                  onClick={createChart}
                  disabled={audioUrl && !copyrightAgreed}
                  className="btn-primary"
                >
                  创建并编辑
                </button>
              </div>
            </div>
          </div>
        )}

        {charts.length === 0 ? (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
              <Disc3 className="w-10 h-10 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">暂无谱面</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">点击上方「创建谱面」按钮开始你的创作之旅</p>
            <div className="flex justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-500" />
                <span>支持多种音符类型</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>多场景编辑</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>实时预览</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-stagger">
            {charts.map((c) => (
              <div
                key={c.id}
                className="card-hover overflow-hidden"
              >
                <div
                  className="relative h-40 bg-slate-100 dark:bg-slate-700 overflow-hidden cursor-pointer"
                  onClick={() => handleEnterEditor(c.id)}
                >
                  {c.coverUrl ? (
                    <img src={c.coverUrl} alt="cover" className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-700 dark:to-slate-800">
                      <Disc3 className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  <div className={`absolute top-3 right-3 px-2 py-1 text-xs font-semibold rounded-md border ${getDifficultyColor(c.difficulty)}`}>
                    {c.difficulty.toFixed(1)}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold truncate mb-1">{c.songName}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                    曲师：{c.artist || '-'}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500 mb-4">
                    <span className="flex items-center gap-1">
                      <Music className="w-3.5 h-3.5" />
                      {c.bpm} BPM
                    </span>
                    <span className="truncate">
                      谱师：{c.charter || '-'}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <button
                      onClick={() => setShowDemoDisabled(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors font-medium"
                      title="演示模式"
                    >
                      <Play className="w-3.5 h-3.5" />
                      演示
                    </button>
                    <button
                      onClick={() => handleEnterEditor(c.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
                      title="编辑谱面"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      编辑
                    </button>
                    <button
                      onClick={() => exportChart(c.id, c.songName)}
                      className="flex items-center justify-center gap-1.5 text-xs px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      title="导出"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteChart(c.id)}
                      className="flex items-center justify-center gap-1.5 text-xs px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showDemoDisabled && (
        <div className="modal-overlay" onClick={() => setShowDemoDisabled(false)}>
          <div
            className="modal-content max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 flex items-center justify-center bg-brand-100 dark:bg-brand-900/30 rounded-xl">
                  <Play className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">功能暂不可用</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">敬请期待</p>
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                谱面演示系统有重大bug，暂时无法使用，敬请期待
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDemoDisabled(false)}
                  className="flex-1 btn-primary"
                >
                  我知道了
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showImportProgress && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 flex items-center justify-center bg-brand-100 dark:bg-brand-900/30 rounded-xl">
                  <Upload className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">导入谱面</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Importing Chart</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-300">{importStep}</span>
                  <span className="text-sm font-semibold text-brand-600 dark:text-brand-400 tabular-nums">
                    {Math.round(importProgress)}%
                  </span>
                </div>

                <div className="relative h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 transition-all duration-200 ease-out bg-gradient-brand"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: '读取', min: 0, max: 20 },
                    { label: '解析', min: 20, max: 40 },
                    { label: '验证', min: 40, max: 60 },
                    { label: '音频', min: 60, max: 80 },
                    { label: '完成', min: 80, max: 100 },
                  ].map((step, i) => {
                    const isActive = importProgress >= step.min
                    const isComplete = importProgress >= step.max
                    return (
                      <div key={i} className="flex flex-col items-center gap-1.5">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                            isComplete
                              ? 'bg-brand-500 text-white'
                              : isActive
                              ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {isComplete ? '✓' : i + 1}
                        </div>
                        <span
                          className={`text-[10px] transition-colors duration-300 ${
                          isActive ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'
                        }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMaintenanceModal && maintenanceStatus && (
        <div className="modal-overlay" onClick={() => setShowMaintenanceModal(false)}>
          <div
            className="modal-content max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-5 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
                <Wrench className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-800 dark:text-slate-100">
                服务器维护中
              </h3>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                {maintenanceStatus.message}
              </p>

              {maintenanceStatus.scheduledOpenTime && maintenanceCountdown && (
                <div className="mb-6 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">预计开服倒计时</span>
                  </div>
                  <div className="text-3xl font-bold text-amber-500 font-mono tracking-wider">
                    {maintenanceCountdown}
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowMaintenanceModal(false)}
                className="w-full btn-primary"
              >
                我知道了
              </button>

              <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
                最后更新：{new Date(maintenanceStatus.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
        <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">
          V20260710.2
        </span>
      </div>
    </div>
  )
}
