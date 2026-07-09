import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import AdminDashboard from '@/pages/AdminDashboard'
import Editor from '@/pages/Editor'
import GamePlay from '@/pages/GamePlay'
import AuthGuard from '@/components/AuthGuard'

function AppInitializer({ children }: { children: React.ReactNode }) {
  const restore = useAuthStore((s) => s.restore)
  useEffect(() => {
    restore()
  }, [restore])
  return <>{children}</>
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}

export default function App() {
  return (
    <Router>
      <AppInitializer>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/play/:id" element={<GamePlay />} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/editor/:id" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppInitializer>
    </Router>
  )
}
