import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Mail, Lock, KeyRound, Shield, MoveRight, Check, Sun, Moon, Disc3 } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useTheme } from '@/hooks/useTheme'

export default function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [captchaSvg, setCaptchaSvg] = useState('')
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [sliderToken, setSliderToken] = useState('')
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { toggleTheme, isDark } = useTheme()

  const sliderRef = useRef<HTMLDivElement>(null)
  const [sliderX, setSliderX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [sliderVerified, setSliderVerified] = useState(false)
  const [sliderStatus, setSliderStatus] = useState<'idle' | 'success' | 'fail'>('idle')

  useEffect(() => {
    authApi.getCaptcha().then((d) => {
      setSessionId(d.sessionId)
      setCaptchaSvg(d.svg)
    })
  }, [])

  const refreshCaptcha = async () => {
    try {
      const d = await authApi.getCaptcha()
      setSessionId(d.sessionId)
      setCaptchaSvg(d.svg)
      setCaptchaAnswer('')
    } catch {
      // ignore
    }
  }

  const verifyCaptcha = async () => {
    setError('')
    setIsLoading(true)
    try {
      await authApi.verifyCaptcha(sessionId, captchaAnswer)
      setStep(2)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '验证失败')
      refreshCaptcha()
    } finally {
      setIsLoading(false)
    }
  }

  const handleSliderStart = useCallback((clientX: number) => {
    if (sliderVerified) return
    setIsDragging(true)
    setSliderStatus('idle')
    const rect = sliderRef.current?.getBoundingClientRect()
    if (rect) {
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width - 48))
      setSliderX(x)
    }
  }, [sliderVerified])

  const handleSliderMove = useCallback((clientX: number) => {
    if (!isDragging || sliderVerified) return
    const rect = sliderRef.current?.getBoundingClientRect()
    if (rect) {
      const maxX = rect.width - 48
      const x = Math.max(0, Math.min(clientX - rect.left, maxX))
      setSliderX(x)
    }
  }, [isDragging, sliderVerified])

  const handleSliderEnd = useCallback(() => {
    if (!isDragging || sliderVerified) return
    setIsDragging(false)
    const rect = sliderRef.current?.getBoundingClientRect()
    if (rect) {
      const maxX = rect.width - 48
      if (sliderX >= maxX - 5) {
        setSliderX(maxX)
        setSliderVerified(true)
        setSliderStatus('success')
        setSliderToken('passed')
      } else {
        setSliderX(0)
        setSliderStatus('fail')
        setTimeout(() => setSliderStatus('idle'), 500)
      }
    }
  }, [isDragging, sliderVerified, sliderX])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleSliderMove(e.clientX)
    const handleMouseUp = () => handleSliderEnd()
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleSliderMove(e.touches[0].clientX)
      }
    }
    const handleTouchEnd = () => handleSliderEnd()

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDragging, handleSliderMove, handleSliderEnd])

  const verifySlider = async () => {
    setError('')
    if (!sliderVerified) {
      setError('请完成滑块验证')
      return
    }
    setIsLoading(true)
    try {
      await authApi.verifySlider(sessionId, sliderToken)
      setStep(3)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '验证失败')
      setSliderVerified(false)
      setSliderX(0)
      setSliderToken('')
      setSliderStatus('idle')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await authApi.register({ username, email, password, inviteCode, sessionId })
      navigate('/login')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '注册失败')
    } finally {
      setIsLoading(false)
    }
  }

  const stepItems = [
    { num: 1, label: '图形验证', icon: Shield },
    { num: 2, label: '滑块验证', icon: MoveRight },
    { num: 3, label: '填写信息', icon: User },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 relative overflow-hidden py-8">
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-brand-500/5 to-transparent dark:from-brand-500/10" />
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-purple-500/5 to-transparent dark:from-purple-500/10" />
      
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 btn-icon z-10"
        title={isDark ? '切换到浅色模式' : '切换到深色模式'}
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="relative z-10 w-full max-w-md mx-4 mt-8">
        <div className="text-center mb-8 animate-fade-in-down">
          <div className="flex items-center justify-center mb-4">
            <img
              src="/stella-logo.png"
              alt="STELLA"
              className="h-16 object-contain dark:brightness-110"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-wider mb-2 text-slate-800 dark:text-slate-100">
            STELLA CHART
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">邀请注册</p>
        </div>

        <div className="card p-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold mb-1">创建账户</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">完成验证步骤以注册账户</p>
          </div>

          <div className="flex items-center justify-between mb-8 px-2">
            {stepItems.map((item, index) => {
              const Icon = item.icon
              const isActive = step >= item.num
              const isCurrent = step === item.num
              return (
                <div key={item.num} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`relative w-10 h-10 flex items-center justify-center rounded-xl border-2 transition-all duration-300 ${
                      isActive
                        ? 'bg-brand-500 border-brand-500 text-white shadow-lg shadow-brand-500/25'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                    }`}>
                      {isActive && step > item.num ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <span className={`text-xs mt-2 font-medium transition-colors duration-300 ${
                      isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      {item.label}
                    </span>
                  </div>
                  {index < stepItems.length - 1 && (
                    <div className={`w-16 h-0.5 mx-2 -mt-6 transition-colors duration-300 ${
                      step > item.num ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            {step === 1 && (
              <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4 text-brand-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">第一步：图形验证码</span>
                </div>
                <div className="flex gap-3 items-center mb-4">
                  <div
                    className="border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg cursor-pointer hover:border-brand-300 dark:hover:border-brand-600 transition-colors overflow-hidden"
                    onClick={refreshCaptcha}
                    title="点击刷新"
                  >
                    {captchaSvg && <div dangerouslySetInnerHTML={{ __html: captchaSvg }} />}
                  </div>
                  <div className="flex-1">
                    <input
                      value={captchaAnswer}
                      onChange={(e) => setCaptchaAnswer(e.target.value)}
                      placeholder="输入验证码"
                      className="input"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          verifyCaptcha()
                        }
                      }}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">点击图片可刷新验证码</p>
                <button
                  type="button"
                  onClick={verifyCaptcha}
                  disabled={isLoading || !captchaAnswer}
                  className="w-full btn-primary"
                >
                  {isLoading ? '验证中...' : '下一步'}
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                  <MoveRight className="w-4 h-4 text-brand-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">第二步：滑块验证</span>
                </div>
                <div className="mb-4">
                  <div
                    ref={sliderRef}
                    className={`relative h-11 bg-white dark:bg-slate-900 border rounded-lg overflow-hidden select-none transition-colors duration-300 ${
                      sliderStatus === 'success'
                        ? 'border-emerald-300 dark:border-emerald-700'
                        : sliderStatus === 'fail'
                        ? 'border-red-300 dark:border-red-700'
                        : 'border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    <div
                      className={`absolute left-0 top-0 bottom-0 transition-all duration-100 ${
                        sliderStatus === 'success'
                          ? 'bg-emerald-500/10'
                          : sliderStatus === 'fail'
                          ? 'bg-red-500/10'
                          : 'bg-brand-500/10'
                      }`}
                      style={{ width: sliderX + 48 }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 pointer-events-none">
                      {sliderVerified ? '验证成功' : '按住滑块，拖动到最右边'}
                    </div>
                    <div
                      className={`absolute top-0 bottom-0 w-12 flex items-center justify-center cursor-pointer transition-colors duration-200 rounded-lg ${
                        sliderStatus === 'success'
                          ? 'bg-emerald-500'
                          : sliderStatus === 'fail'
                          ? 'bg-red-500'
                          : isDragging
                          ? 'bg-brand-400'
                          : 'bg-brand-500 hover:bg-brand-600'
                      }`}
                      style={{
                        left: sliderX,
                        transition: isDragging ? 'none' : 'all 0.3s ease',
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        handleSliderStart(e.clientX)
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault()
                        if (e.touches.length > 0) {
                          handleSliderStart(e.touches[0].clientX)
                        }
                      }}
                    >
                      {sliderVerified ? (
                        <Check className="w-5 h-5 text-white" />
                      ) : (
                        <MoveRight className="w-5 h-5 text-white" />
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">拖动滑块到最右侧完成验证</p>
                <button
                  type="button"
                  onClick={verifySlider}
                  disabled={isLoading || !sliderVerified}
                  className="w-full btn-primary"
                >
                  {isLoading ? '验证中...' : '下一步'}
                </button>
              </div>
            )}

            {step === 3 && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    用户名
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="请输入用户名"
                      className="input pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    邮箱
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="请输入邮箱地址"
                      className="input pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    密码
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="请输入密码"
                      className="input pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    邀请码
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="请输入一次性邀请码"
                      className="input pl-10"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary py-2.5 shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 mt-2"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      注册中...
                    </span>
                  ) : '完成注册'}
                </button>
              </form>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              已有账户？
              <Link
                to="/login"
                className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium ml-1"
              >
                立即登录
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-8">
          © STELLA CHART · 保留所有权利
        </p>
      </div>
    </div>
  )
}
