import { useState } from 'react'
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
  ChevronLeft,
  ChevronRight,
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
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'AI Configuration', to: '/ai-config', icon: Bot },
  { label: 'Phone Status', to: '/phone-status', icon: PhoneCall },
  { label: 'Knowledge Base', to: '/knowledge-base', icon: BookOpen },
  { label: 'Services', to: '/company-services', icon: Briefcase },
  { label: 'Call History', to: '/calls', icon: Phone },
  { label: 'Profile', to: '/profile', icon: Settings },
]

const adminNav: NavItem[] = [
  { label: 'Overview', to: '/admin', icon: LayoutDashboard },
  { label: 'Companies', to: '/admin/companies', icon: Building2 },
  { label: 'Platform Calls', to: '/admin/calls', icon: PhoneCall },
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

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('vr_sidebar_collapsed') === 'true'
  })

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('vr_sidebar_collapsed', String(next))
      return next
    })
  }

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout')
    } catch {
      // Ignore errors
    }
    clearAuth()
    navigate('/login')
    toast.success('Logged out successfully')
  }

  return (
    <>
      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full z-30 flex flex-col shrink-0',
          'bg-card/40 backdrop-blur-xl border-r border-border/30 shadow-xl',
          'transition-all duration-300 ease-in-out',
          'lg:translate-x-0 lg:static lg:flex',
          isCollapsed ? 'w-20' : 'w-64',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo Header + Toggle Arrow */}
        <div
          className={cn(
            'flex border-b border-border/20 py-4 transition-all duration-300',
            isCollapsed ? 'flex-col items-center gap-3 px-2 justify-center' : 'flex-row items-center justify-between px-4',
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/logo.jpeg"
              alt="VR Digital Calling"
              className="w-9 h-9 rounded-xl object-cover shadow-md border border-primary/30 shrink-0"
            />
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="font-display font-bold text-foreground text-base leading-tight truncate">VR Digital</p>
                <p className="text-[10px] text-primary font-semibold tracking-wider uppercase truncate">Calling Platform</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Desktop collapse arrow toggle button (placed underneath logo when collapsed) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapse}
              className="hidden lg:flex h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary/80 shrink-0"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            </Button>
            {/* Mobile close button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Company Name Widget */}
        {!isAdmin && company && (
          <div
            className={cn(
              'mx-3 my-2 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/25 shadow-sm flex items-center gap-3 transition-all',
              isCollapsed ? 'p-2 justify-center' : 'px-4 py-3',
            )}
            title={isCollapsed ? company.name : undefined}
          >
            <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30">
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground truncate">{company.name}</p>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/' || item.to === '/admin'}
              onClick={onClose}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'nav-item flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all',
                  isCollapsed && 'justify-center px-2',
                  isActive &&
                    'active bg-primary/10 text-primary border border-primary/20 font-semibold shadow-sm',
                )
              }
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section + logout */}
        <div className="p-3 border-t border-border/20">
          <button
            onClick={handleLogout}
            title={isCollapsed ? 'Sign Out' : undefined}
            className={cn(
              'nav-item w-full text-destructive hover:text-destructive hover:bg-destructive/10 flex items-center gap-3',
              isCollapsed && 'justify-center px-2',
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
