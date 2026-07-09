import { create } from 'zustand'
import { authApi } from '@/lib/api'

interface AuthState {
  token: string | null
  user: { id: string; username: string; email: string; role: string } | null
  isLoading: boolean
  setToken: (token: string | null) => void
  setUser: (user: { id: string; username: string; email: string; role: string } | null) => void
  login: (token: string, user: { id: string; username: string; email: string; role: string }) => void
  logout: () => void
  restore: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('meldchart_token'),
  user: null,
  isLoading: true,
  setToken: (token) => {
    if (token) localStorage.setItem('meldchart_token', token)
    else localStorage.removeItem('meldchart_token')
    set({ token })
  },
  setUser: (user) => set({ user }),
  login: (token, user) => {
    localStorage.setItem('meldchart_token', token)
    set({ token, user, isLoading: false })
  },
  logout: () => {
    localStorage.removeItem('meldchart_token')
    set({ token: null, user: null, isLoading: false })
  },
  restore: async () => {
    const token = localStorage.getItem('meldchart_token')
    if (!token) {
      set({ isLoading: false })
      return
    }
    try {
      const data = await authApi.me()
      set({ token, user: data.user, isLoading: false })
    } catch {
      localStorage.removeItem('meldchart_token')
      set({ token: null, user: null, isLoading: false })
    }
  },
}))
