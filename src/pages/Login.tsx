import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Lock, Sun, Moon, Disc3 } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useTheme } from '@/hooks/useTheme'

export default function Login() {
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const { toggleTheme, isDark } = useTheme()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const data = await authApi.login({ account, password })
      login(data.token, data.user)
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-brand-500/5 to-transparent dark:from-brand-500/10" />
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-purple-500/5 to-transparent dark:from-purple-500/10" />
      
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 btn-icon z-10"
        title={isDark ? '切换到浅色模式' : '切换到深色模式'}
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="relative z-10 w-full max-w-md mx-4">
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
          <p className="text-slate-500 dark:text-slate-400 text-sm">制谱系统</p>
        </div>

        <div className="card p-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold mb-1">欢迎回来</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">登录您的账户继续创作</p>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                用户名 / 邮箱
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="请输入用户名或邮箱"
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-2.5 shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  登录中...
                </span>
              ) : '登录'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              还没有账户？
              <Link
                to="/register"
                className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium ml-1"
              >
                邀请注册
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
