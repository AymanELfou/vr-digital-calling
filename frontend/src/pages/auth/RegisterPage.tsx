import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import { apiClient, getErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/lib/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AuthResponse } from '@/lib/types'

const schema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain one uppercase letter')
    .regex(/[0-9]/, 'Must contain one number'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^(?:\+212|0)([567]\d{8})$/, 'Only Moroccan Phone Number accepted'),
})

type FormValues = z.infer<typeof schema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setAuth, setReady } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values: FormValues) => {
    try {
      const { data } = await apiClient.post<AuthResponse>('/auth/register', {
        email: values.email,
        password: values.password,
        companyName: values.companyName,
        phone: values.phone,
      })
      setAuth(data.user, data.company)
      setReady()
      navigate('/')
      toast.success('Account created! Welcome to VR Digital Calling.')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center animate-glow">
            <span className="font-display font-bold text-white text-sm">VR</span>
          </div>
          <span className="font-display font-bold text-foreground">VR Digital Calling</span>
        </div>

        <div className="glass-card p-8 space-y-6">
          <div>
            <h1 className="font-display font-bold text-2xl text-foreground">Create your account</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Set up your AI voice agent in minutes
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company name</Label>
              <Input
                id="companyName"
                placeholder="Acme Inc."
                className="bg-secondary border-border"
                {...register('companyName')}
              />
              {errors.companyName && (
                <p className="text-destructive text-xs">{errors.companyName.message}</p>
              )}
            </div>

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
                  placeholder="Min. 8 chars, 1 uppercase, 1 number"
                  className="bg-secondary border-border pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-destructive text-xs">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base select-none" title="Morocco">
                  🇲🇦 <span className="text-muted-foreground ml-0.5 text-xs font-semibold">+212</span>
                </span>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0612345678"
                  className="bg-secondary border-border pl-16"
                  {...register('phone')}
                />
              </div>
              {errors.phone && (
                <p className="text-destructive text-xs">{errors.phone.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-brand btn-glow font-semibold mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
