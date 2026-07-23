import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Bot,
  BookOpen,
  Briefcase,
  Phone,
  Settings,
  Building2,
  PhoneCall,
  LogOut,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore, useCompany } from '@/lib/auth.store'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface NavItem {
  label: string
  to: string
  icon: React.ElementType
}

const companyNav: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'AI Configuration', to: '/ai-config', icon: Bot },
  { label: 'Knowledge Base', to: '/knowledge-base', icon: BookOpen },
  { label: 'Services', to: '/services', icon: Briefcase },
  { label: 'Call History', to: '/calls', icon: Phone },
  { label: 'Twilio Setup', to: '/twilio-config', icon: PhoneCall },
  { label: 'Profile', to: '/profile', icon: Settings },
]

const adminNav: NavItem[] = [
  { label: 'Overview', to: '/admin', icon: LayoutDashboard },
  { label: 'Companies', to: '/admin/companies', icon: Building2 },
]

interface SidebarProps {
  isAdmin?: boolean
  open: boolean
  onClose: () => void
}

export function Sidebar({ isAdmin = false, open, onClose }: SidebarProps) {
  const navigate = useNavigate()
  const { clearAuth } = useAuthStore()
  const company = useCompany()
  const navItems = isAdmin ? adminNav : companyNav

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout')
    } catch {
      // Ignore errors — we clear the state regardless
    }
    clearAuth()
    navigate('/login')
    toast.success('Logged out successfully')
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-64 z-30 flex flex-col',
          'bg-card border-r border-border',
          'transition-transform duration-300 ease-in-out',
          'lg:translate-x-0 lg:static lg:flex',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center animate-glow">
              <span className="font-display font-bold text-white text-sm">VR</span>
            </div>
            <div>
              <p className="font-display font-semibold text-foreground text-sm">VR Digital</p>
              <p className="text-xs text-muted-foreground">Calling</p>
            </div>
          </div>
          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Company name */}
        {!isAdmin && company && (
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
              Company
            </p>
            <p className="text-sm font-medium text-foreground truncate">{company.name}</p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/' || item.to === '/admin'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'nav-item',
                  isActive &&
                    'active bg-primary/10 text-primary border border-primary/20',
                )
              }
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User section + logout */}
        <div className="border-t border-border p-3">
          <button
            onClick={handleLogout}
            className="nav-item w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
