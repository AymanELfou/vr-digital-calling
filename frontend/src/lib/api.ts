/// <reference types="vite/client" />
// ─────────────────────────────────────────────────────────────────────────────
// API Client — Axios instance with interceptors
// All API calls go through this instance.
// ─────────────────────────────────────────────────────────────────────────────

import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Sends HttpOnly cookies automatically
  headers: {
    'Content-Type': 'application/json',
  },
})

// Response interceptor — handle 401 globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth state and redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

// Helper to extract error message from API response
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error ?? error.message
  }
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred'
}
