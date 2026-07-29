import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Phone, Bot, Sparkles, ArrowLeft, X, Mail, Copy } from 'lucide-react'
import { apiClient, getErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/lib/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AuthResponse } from '@/lib/types'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth, setReady } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [showAdminContactModal, setShowAdminContactModal] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values: FormValues) => {
    try {
      const { data } = await apiClient.post<AuthResponse>('/auth/login', values)
      setAuth(data.user, data.company)
      setReady()
      navigate(data.user.role === 'ADMIN' ? '/admin' : '/dashboard')
      toast.success(`Welcome back!`)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — Branding panel */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-between p-12 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent border-r border-border">
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpeg"
            alt="VR Digital Calling"
            className="w-10 h-10 rounded-xl object-cover shadow-md border border-primary/30 shrink-0"
          />
          <div>
            <span className="font-display font-bold text-foreground text-lg leading-tight block">VR Digital</span>
            <span className="text-xs text-primary font-semibold tracking-wider uppercase block">Calling Platform</span>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="font-display font-bold text-4xl text-foreground leading-tight mb-4">
              Your AI receptionist,<br />
              <span className="text-primary">always available.</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Let AI handle your incoming calls 24/7 with perfect knowledge of your business.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: Phone, text: 'Answers every call instantly' },
              { icon: Bot, text: 'Powered by OpenAI Realtime API' },
              { icon: Sparkles, text: 'Trained on your business data' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-muted-foreground">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-muted-foreground text-xs">© 2026 VR Digital. All rights reserved.</p>
      </div>

      {/* Right — Login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Back button */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <img
              src="/logo.jpeg"
              alt="VR Digital Calling"
              className="w-9 h-9 rounded-xl object-cover shadow-md border border-primary/30 shrink-0"
            />
            <div>
              <span className="font-display font-bold text-foreground text-base leading-tight block">VR Digital</span>
              <span className="text-[10px] text-primary font-semibold tracking-wider uppercase block">Calling Platform</span>
            </div>
          </div>

          <div>
            <h2 className="font-display font-bold text-2xl text-foreground">Sign in</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Enter your credentials to access your dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                className="bg-secondary border-border"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-destructive text-xs">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="bg-secondary border-border pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-destructive text-xs">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-brand btn-glow font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Need an account?{' '}
            <button
              type="button"
              onClick={() => setShowAdminContactModal(true)}
              className="text-primary hover:underline font-semibold transition-colors"
            >
              Please contact the administrator.
            </button>
          </p>
        </div>
      </div>

      {/* Admin Contact Modal */}
      {showAdminContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="glass-card w-full max-w-md p-6 rounded-3xl border border-white/20 shadow-2xl relative space-y-5 bg-[#15121a]">
            <button
              onClick={() => setShowAdminContactModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-border/40 pb-4">
              <img src="/logo.jpeg" alt="VR Digital" className="w-10 h-10 rounded-xl object-cover border border-primary/30 shrink-0" />
              <div>
                <h3 className="font-display font-bold text-foreground text-lg leading-tight">VR Digital Calling</h3>
                <p className="text-xs text-primary font-semibold uppercase tracking-wider">Account Creation Request</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-slate-200 leading-relaxed font-medium">
                To request a company account on the VR Digital Calling platform, please contact our system administration team. We will generate and set up your workspace credentials immediately.
              </p>

              <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 space-y-2">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider block">
                  Required Info to Include:
                </span>
                <ul className="text-xs text-slate-200 space-y-1.5 font-medium">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span><strong className="text-white">Company Name</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span><strong className="text-white">Business Phone</strong></span>
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-secondary/60 border border-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <Mail className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm font-mono font-bold text-foreground truncate">admin@vrdigital.com</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText('admin@vrdigital.com')
                    toast.success('Admin email copied to clipboard!')
                  }}
                  className="shrink-0 text-xs gap-1.5 border-white/10 hover:bg-white/10"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => setShowAdminContactModal(false)}
                className="bg-gradient-brand text-white text-xs px-6 rounded-full btn-glow"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
