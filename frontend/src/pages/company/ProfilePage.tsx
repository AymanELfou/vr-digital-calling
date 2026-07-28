import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Settings, Save, Loader2, Building2, Lock, Eye, EyeOff, CheckCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiClient, getErrorMessage } from '@/lib/api'
import { toast } from 'sonner'
import type { Company } from '@/lib/types'

export default function ProfilePage() {
  const qc = useQueryClient()

  // ── Company profile form ───────────────────────────────────────────────────
  const [profile, setProfile] = useState({
    name: '', description: '', address: '', website: '', email: '', phone: '',
  })

  const { data: company, isLoading } = useQuery<Company>({
    queryKey: ['company-profile'],
    queryFn: async () => {
      const { data } = await apiClient.get('/company/profile')
      return data
    },
  })

  useEffect(() => {
    if (company) {
      setProfile({
        name: company.name ?? '',
        description: company.description ?? '',
        address: company.address ?? '',
        website: company.website ?? '',
        email: company.email ?? '',
        phone: company.phone ?? '',
      })
    }
  }, [company])

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const moroccanPhoneRegex = /^(?:\+212|0)([567]\d{8})$/
      if (profile.phone && !moroccanPhoneRegex.test(profile.phone)) {
        throw new Error('Only Moroccan Phone Number accepted')
      }
      const { data } = await apiClient.put('/company/profile', profile)
      return data
    },
    onSuccess: () => {
      toast.success('Profile updated')
      qc.invalidateQueries({ queryKey: ['company-profile'] })
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  // ── Password form ──────────────────────────────────────────────────────────
  const [passwords, setPasswords] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  })
  const [showPw, setShowPw] = useState(false)

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (passwords.newPassword !== passwords.confirmPassword) {
        throw new Error('New passwords do not match')
      }
      if (passwords.newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters')
      }
      const { data } = await apiClient.put('/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      })
      return data
    },
    onSuccess: () => {
      toast.success('Password changed successfully')
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })



  if (isLoading) {
    return (
      <div className="page-enter flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="page-enter space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-foreground flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          Company Profile
        </h1>
        <p className="text-muted-foreground mt-2">
          Your business information. This is used by the AI to introduce your company to callers.
        </p>
      </div>

      {/* Business Info */}
      <Card className="glass-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Building2 size={16} className="text-primary" />
            Business Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            label="Company Name"
            value={profile.name}
            onChange={(v) => setProfile(p => ({ ...p, name: v }))}
            placeholder="Your Company Name"
            hint="Used by the AI when greeting callers"
          />
          <Field
            label="Description"
            value={profile.description}
            onChange={(v) => setProfile(p => ({ ...p, description: v }))}
            placeholder="Brief description of what your business does..."
            textarea
          />
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Business Email"
              value={profile.email}
              onChange={(v) => setProfile(p => ({ ...p, email: v }))}
              placeholder="contact@company.com"
              type="email"
            />
            <Field
              label="Website"
              value={profile.website}
              onChange={(v) => setProfile(p => ({ ...p, website: v }))}
              placeholder="https://www.company.com"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Address"
              value={profile.address}
              onChange={(v) => setProfile(p => ({ ...p, address: v }))}
              placeholder="123 Main Street, City, Country"
            />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Business Phone</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg select-none" title="Morocco">
                  <img src="/morocco.png" alt="Morocco" className="w-5 h-5" />
                </span>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+212634847654"
                  className="w-full rounded-lg bg-secondary border border-border pl-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition font-mono"
                />
              </div>
            </div>
          </div>
          <Button
            className="w-full bg-primary hover:bg-primary/90 btn-glow"
            onClick={() => updateProfileMutation.mutate()}
            disabled={!profile.name.trim() || updateProfileMutation.isPending}
          >
            {updateProfileMutation.isPending
              ? <><Loader2 size={15} className="animate-spin" /> Saving...</>
              : <><Save size={15} /> Save Profile</>}
          </Button>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card className="glass-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Lock size={16} className="text-primary" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((key) => (
            <div key={key} className="space-y-1.5">
              <label className="text-sm font-medium text-foreground capitalize">
                {key === 'currentPassword' ? 'Current Password' : key === 'newPassword' ? 'New Password' : 'Confirm New Password'}
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={passwords[key]}
                  onChange={(e) => setPasswords(p => ({ ...p, [key]: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition pr-10"
                />
                {key === 'newPassword' && (
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                )}
              </div>
              {key === 'confirmPassword' && passwords.newPassword && passwords.confirmPassword && (
                <p className={`text-xs flex items-center gap-1 ${
                  passwords.newPassword === passwords.confirmPassword ? 'text-green-400' : 'text-red-400'
                }`}>
                  <CheckCircle size={11} />
                  {passwords.newPassword === passwords.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                </p>
              )}
            </div>
          ))}
          <Button
            className="w-full bg-primary hover:bg-primary/90 btn-glow"
            onClick={() => changePasswordMutation.mutate()}
            disabled={
              !passwords.currentPassword ||
              !passwords.newPassword ||
              passwords.newPassword !== passwords.confirmPassword ||
              changePasswordMutation.isPending
            }
          >
            {changePasswordMutation.isPending
              ? <><Loader2 size={15} className="animate-spin" /> Changing...</>
              : <><Lock size={15} /> Change Password</>}
          </Button>
        </CardContent>
      </Card>

      {/* Account Info (read-only) */}
      {company && (
        <Card className="glass-card border-border opacity-80">
          <CardContent className="p-5 space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Account Info</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Company ID</p>
                <p className="font-mono text-foreground text-xs mt-0.5 truncate">{company.id}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Member Since</p>
                <p className="text-foreground text-xs mt-0.5">
                  {new Date(company.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  hint?: string
  textarea?: boolean
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  hint,
  textarea = false,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition resize-none"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
        />
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
