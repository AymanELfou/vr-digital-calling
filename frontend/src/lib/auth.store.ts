// ─────────────────────────────────────────────────────────────────────────────
// Auth Store — Zustand
// Stores ONLY authentication state (user, role, company).
// Server data is handled by React Query.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser, AuthCompany } from './types'

interface AuthState {
  user: AuthUser | null
  company: AuthCompany | null
  isAuthenticated: boolean
  isReady: boolean // true after initial auth check completes

  setAuth: (user: AuthUser, company: AuthCompany | null) => void
  clearAuth: () => void
  setReady: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      company: null,
      isAuthenticated: false,
      isReady: false,

      setAuth: (user, company) =>
        set({ user, company, isAuthenticated: true }),

      clearAuth: () =>
        set({ user: null, company: null, isAuthenticated: false }),

      setReady: () => set({ isReady: true }),
    }),
    {
      name: 'vr-auth', // localStorage key
      // Only persist user and company — isReady is always false on page load
      partialize: (state) => ({
        user: state.user,
        company: state.company,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)

// ── Selector hooks ────────────────────────────────────────────────────────────

export const useUser = () => useAuthStore((s) => s.user)
export const useCompany = () => useAuthStore((s) => s.company)
export const useIsAdmin = () => useAuthStore((s) => s.user?.role === 'ADMIN')
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated)
