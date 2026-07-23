import { Menu, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUser } from '@/lib/auth.store'

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const user = useUser()

  return (
    <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 flex-shrink-0">
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
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-secondary border border-border">
          <div className="w-6 h-6 rounded-full bg-gradient-brand flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {user?.email?.[0]?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <span className="text-sm text-foreground hidden sm:block max-w-32 truncate">
            {user?.email}
          </span>
        </div>
      </div>
    </header>
  )
}
