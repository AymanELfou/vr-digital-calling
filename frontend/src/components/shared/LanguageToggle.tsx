// ─────────────────────────────────────────────────────────────────────────────
// Language Toggle Button — Switch between English and Arabic
// ─────────────────────────────────────────────────────────────────────────────

import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/i18n'

interface LanguageToggleProps {
  variant?: 'default' | 'ghost' | 'outline' | 'secondary'
  size?: 'sm' | 'default' | 'lg' | 'icon'
  className?: string
  showIcon?: boolean
}

export function LanguageToggle({
  variant = 'ghost',
  size = 'sm',
  className = '',
  showIcon = true,
}: LanguageToggleProps) {
  const { toggleLang, t } = useTranslation()

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleLang}
      className={`gap-1.5 font-medium ${className}`}
      title={`Switch to ${t.language.switchTo}`}
    >
      {showIcon && <Globe className="w-4 h-4" />}
      <span>{t.language.switchTo}</span>
    </Button>
  )
}
