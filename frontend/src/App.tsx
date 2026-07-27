/// <reference types="vite/client" />
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { apiClient } from '@/lib/api'
import { useAuthStore } from '@/lib/auth.store'

// ── Pages (lazy imports for code splitting) ───────────────────────────────────
import { lazy, Suspense } from 'react'

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'))
const DashboardPage = lazy(() => import('@/pages/company/DashboardPage'))
const AIConfigPage = lazy(() => import('@/pages/company/AIConfigPage'))
const KnowledgeBasePage = lazy(() => import('@/pages/company/KnowledgeBasePage'))
const ServicesPage = lazy(() => import('@/pages/company/ServicesPage'))
const CallHistoryPage = lazy(() => import('@/pages/company/CallHistoryPage'))
const ProfilePage = lazy(() => import('@/pages/company/ProfilePage'))
const PhoneStatusPage  = lazy(() => import('@/pages/company/PhoneStatusPage'))
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'))
const CompaniesPage = lazy(() => import('@/pages/admin/CompaniesPage'))

// ── Layout + Guards ────────────────────────────────────────────────────────────
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { AdminRoute } from '@/components/shared/AdminRoute'
import { PageLoader } from '@/components/shared/PageLoader'

// ── React Query Client ────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,      // 2 minutes
      gcTime: 1000 * 60 * 10,        // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error) => {
        console.error('Mutation error:', error)
      },
    },
  },
})

// ── Router ────────────────────────────────────────────────────────────────────
const router = createBrowserRouter([
  // Public routes
  { path: '/login', element: <Suspense fallback={<PageLoader />}><LoginPage /></Suspense> },
  { path: '/register', element: <Suspense fallback={<PageLoader />}><RegisterPage /></Suspense> },

  // Company routes (requires authentication + COMPANY role)
  {
    element: <ProtectedRoute><AppShell /></ProtectedRoute>,
    children: [
      { path: '/', element: <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense> },
      { path: '/ai-config', element: <Suspense fallback={<PageLoader />}><AIConfigPage /></Suspense> },
      { path: '/knowledge-base', element: <Suspense fallback={<PageLoader />}><KnowledgeBasePage /></Suspense> },
      { path: '/services', element: <Suspense fallback={<PageLoader />}><ServicesPage /></Suspense> },
      { path: '/calls', element: <Suspense fallback={<PageLoader />}><CallHistoryPage /></Suspense> },
      { path: '/profile', element: <Suspense fallback={<PageLoader />}><ProfilePage /></Suspense> },
      { path: '/phone-status', element: <Suspense fallback={<PageLoader />}><PhoneStatusPage /></Suspense> },
    ],
  },

  // Admin routes (requires authentication + ADMIN role)
  {
    element: <AdminRoute><AppShell isAdmin /></AdminRoute>,
    children: [
      { path: '/admin', element: <Suspense fallback={<PageLoader />}><AdminDashboardPage /></Suspense> },
      { path: '/admin/companies', element: <Suspense fallback={<PageLoader />}><CompaniesPage /></Suspense> },
    ],
  },
])

// ── App Root ──────────────────────────────────────────────────────────────────

function AuthInitializer() {
  const { setAuth, clearAuth, setReady } = useAuthStore()

  useEffect(() => {
    // On mount, verify the HttpOnly cookie session with the backend
    apiClient
      .get<{ user: import('@/lib/types').AuthUser; company: import('@/lib/types').AuthCompany | null }>('/auth/me')
      .then(({ data }) => {
        setAuth(data.user, data.company)
      })
      .catch(() => {
        clearAuth()
      })
      .finally(() => {
        setReady()
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer />
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
