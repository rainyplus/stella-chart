import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, restore } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    restore()
  }, [])

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login')
    }
  }, [user, isLoading, navigate])

  if (isLoading || !user) return null
  return <>{children}</>
}
