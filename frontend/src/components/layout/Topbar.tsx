import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUser, useCompany } from '@/lib/auth.store'

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const user = useUser()
  const company = useCompany()

  const displayName = company?.name || user?.email || 'User'

  return (
    <header className="h-14 bg-card/30 backdrop-blur-md flex items-center justify-between px-4 flex-shrink-0">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Desktop: empty left side (sidebar takes the logo) */}
      <div className="hidden lg:block" />

      {/* Right side */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/80 border border-border/40 shadow-sm">
          <div className="w-6 h-6 rounded-full bg-gradient-brand flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {displayName?.[0]?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <span className="text-sm font-medium text-foreground hidden sm:block max-w-36 truncate">
            {displayName}
          </span>
        </div>
      </div>
    </header>
  )
}
