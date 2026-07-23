import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/lib/auth.store'
import { PageLoader } from './PageLoader'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isReady } = useAuthStore()

  // Wait for the auth check (/me) to complete before rendering
  if (!isReady) return <PageLoader />

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return <>{children}</>
}
