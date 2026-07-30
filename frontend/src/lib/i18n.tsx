// ─────────────────────────────────────────────────────────────────────────────
// i18n — Internationalization System
// Provides LanguageProvider, useTranslation hook, and useDirection hook
// Supports English (LTR) and Arabic (RTL) with localStorage persistence
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { en } from './translations/en'
import { ar } from './translations/ar'
import type { TranslationKeys } from './translations/en'

export type Language = 'en' | 'ar'
export type Direction = 'ltr' | 'rtl'

const STORAGE_KEY = 'vr-digital-lang'

const translations: Record<Language, TranslationKeys> = { en, ar }

// ─── Context ──────────────────────────────────────────────────────────────────

interface I18nContextValue {
  lang: Language
  dir: Direction
  setLang: (lang: Language) => void
  toggleLang: () => void
  t: TranslationKeys
}

const I18nContext = createContext<I18nContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

function getInitialLang(): Language {
  if (typeof window === 'undefined') return 'en'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'ar' || stored === 'en') return stored
  return 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(getInitialLang)

  const dir: Direction = lang === 'ar' ? 'rtl' : 'ltr'

  // Apply dir and lang attributes to <html> element
  useEffect(() => {
    const html = document.documentElement
    html.setAttribute('dir', dir)
    html.setAttribute('lang', lang)
    // Add/remove RTL class for CSS targeting
    if (dir === 'rtl') {
      html.classList.add('rtl')
    } else {
      html.classList.remove('rtl')
    }
  }, [lang, dir])

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang)
    localStorage.setItem(STORAGE_KEY, newLang)
  }, [])

  const toggleLang = useCallback(() => {
    setLang(lang === 'en' ? 'ar' : 'en')
  }, [lang, setLang])

  const t = translations[lang]

  return (
    <I18nContext.Provider value={{ lang, dir, setLang, toggleLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useTranslation() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useTranslation must be used within a LanguageProvider')
  return ctx
}

export function useDirection(): Direction {
  const ctx = useContext(I18nContext)
  if (!ctx) return 'ltr'
  return ctx.dir
}
