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
import { LanguageToggle } from '@/components/shared/LanguageToggle'
import { useTranslation } from '@/lib/i18n'
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
  const { t, dir } = useTranslation()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values: FormValues) => {
    try {
      const { data } = await apiClient.post<AuthResponse>('/auth/login', values)
      setAuth(data.user, data.company)
      setReady()
      navigate(data.user.role === 'ADMIN' ? '/admin' : '/dashboard')
      toast.success(t.auth.welcomeBack)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Language toggle — top corner */}
      <div className={`fixed top-4 z-50 ${dir === 'rtl' ? 'left-4' : 'right-4'}`}>
        <LanguageToggle variant="outline" size="sm" />
      </div>

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
              {t.landing.heroTitle}<br />
              <span className="text-primary">{t.landing.heroTitleHighlight}.</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              {t.landing.heroSubtitle}
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: Phone, textKey: 'feature1Title' as const },
              { icon: Bot, textKey: 'feature2Title' as const },
              { icon: Sparkles, textKey: 'feature3Title' as const },
            ].map(({ icon: Icon, textKey }) => (
              <div key={textKey} className="flex items-center gap-3 text-muted-foreground">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm">{t.landing[textKey]}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-muted-foreground text-xs">{t.landing.footer}</p>
      </div>

      {/* Right — Login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Back button */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform rtl-flip" />
            {t.auth.backToHome}
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
            <h2 className="font-display font-bold text-2xl text-foreground">{t.auth.signIn}</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {t.auth.signInSubtitle}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t.auth.emailLabel}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t.auth.emailPlaceholder}
                autoComplete="email"
                className="bg-secondary border-border"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-destructive text-xs">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t.auth.passwordLabel}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`bg-secondary border-border ${dir === 'rtl' ? 'pl-10' : 'pr-10'}`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors ${dir === 'rtl' ? 'left-3' : 'right-3'}`}
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
              {isSubmitting ? t.auth.signingIn : t.auth.signIn}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {t.auth.needAccount}{' '}
            <button
              type="button"
              onClick={() => setShowAdminContactModal(true)}
              className="text-primary hover:underline font-semibold transition-colors"
            >
              {t.auth.contactAdmin}
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
              className={`absolute top-4 text-muted-foreground hover:text-foreground p-1 rounded-lg bg-white/5 transition-colors ${dir === 'rtl' ? 'left-4' : 'right-4'}`}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-border/40 pb-4">
              <img src="/logo.jpeg" alt="VR Digital" className="w-10 h-10 rounded-xl object-cover border border-primary/30 shrink-0" />
              <div>
                <h3 className="font-display font-bold text-foreground text-lg leading-tight">VR Digital Calling</h3>
                <p className="text-xs text-primary font-semibold uppercase tracking-wider">{t.auth.contactAdminTitle}</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-slate-200 leading-relaxed font-medium">
                {t.auth.contactAdminText}
              </p>

              <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 space-y-2">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider block">
                  {t.auth.requiredInfo}
                </span>
                <ul className="text-xs text-slate-200 space-y-1.5 font-medium">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span><strong className="text-white">{t.auth.companyName}</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span><strong className="text-white">{t.auth.businessPhone}</strong></span>
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
                    toast.success(t.common.copied)
                  }}
                  className="shrink-0 text-xs gap-1.5 border-white/10 hover:bg-white/10"
                >
                  <Copy className="w-3.5 h-3.5" /> {t.common.copyToClipboard}
                </Button>
              </div>
            </div>

            <div className={`flex pt-2 ${dir === 'rtl' ? 'justify-start' : 'justify-end'}`}>
              <Button
                onClick={() => setShowAdminContactModal(false)}
                className="bg-gradient-brand text-white text-xs px-6 rounded-full btn-glow"
              >
                {t.common.close}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
