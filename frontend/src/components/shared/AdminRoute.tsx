import { Navigate } from 'react-router-dom'
import { useAuthStore, useIsAdmin } from '@/lib/auth.store'
import { PageLoader } from './PageLoader'

interface AdminRouteProps {
  children: React.ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, isReady } = useAuthStore()
  const isAdmin = useIsAdmin()

  if (!isReady) return <PageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />

  return <>{children}</>
}
