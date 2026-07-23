import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Phone, Bot, Sparkles } from 'lucide-react'
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

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values: FormValues) => {
    try {
      const { data } = await apiClient.post<AuthResponse>('/auth/login', values)
      setAuth(data.user, data.company)
      setReady()
      navigate(data.user.role === 'ADMIN' ? '/admin' : '/')
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
          <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center animate-glow">
            <span className="font-display font-bold text-white">VR</span>
          </div>
          <span className="font-display font-bold text-xl text-foreground">VR Digital Calling</span>
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

        <p className="text-muted-foreground text-xs">© 2025 VR Digital. All rights reserved.</p>
      </div>

      {/* Right — Login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
              <span className="font-display font-bold text-white text-sm">VR</span>
            </div>
            <span className="font-display font-bold text-foreground">VR Digital Calling</span>
          </div>

          <div>
            <h2 className="font-display font-bold text-2xl text-foreground">Sign in</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Enter your credentials to access your dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Create one for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
