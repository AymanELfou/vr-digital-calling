import { useQuery } from '@tanstack/react-query'
import {
  Phone, CheckCircle, AlertTriangle, Wifi, ExternalLink,
  Info, Copy, Check,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { apiClient } from '@/lib/api'
import { useState } from 'react'
import { toast } from 'sonner'

interface PhoneStatus {
  phoneNumber: string | null
  accountSidPrefix: string | null
  configured: boolean
  webhookVoiceUrl: string
  webhookStatusUrl: string
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition"
      title="Copy"
    >
      {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
    </button>
  )
}

export default function PhoneStatusPage() {
  const { data: status, isLoading } = useQuery<PhoneStatus>({
    queryKey: ['phone-status'],
    queryFn: async () => {
      const { data } = await apiClient.get('/company/phone-status')
      return data
    },
  })

  const baseUrl = window.location.hostname === 'localhost'
    ? 'https://your-ngrok-or-domain.com'
    : window.location.origin

  return (
    <div className="page-enter space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-foreground flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Phone className="w-5 h-5 text-primary" />
          </div>
          Phone Configuration
        </h1>
        <p className="text-muted-foreground mt-2">
          Your AI agent is connected to the platform's shared Twilio phone number.
          No configuration is required on your end.
        </p>
      </div>

      {/* Status Card */}
      <Card className="glass-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Wifi size={16} className="text-primary" />
            Platform Phone Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-6 w-1/3" />
            </div>
          ) : (
            <>
              {/* Phone Number */}
              <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-secondary/60 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Platform Phone Number</p>
                    <p className="font-mono font-bold text-foreground text-lg tracking-wide">
                      {status?.phoneNumber ?? '—'}
                    </p>
                  </div>
                </div>
                {status?.phoneNumber && (
                  <CopyButton value={status.phoneNumber} />
                )}
              </div>

              {/* Account SID (masked) */}
              {status?.accountSidPrefix && (
                <div className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-secondary/40">
                  <span className="text-sm text-muted-foreground">Twilio Account</span>
                  <code className="text-sm font-mono text-foreground">{status.accountSidPrefix}</code>
                </div>
              )}

              {/* Connection Status */}
              <div className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-secondary/40">
                <span className="text-sm text-muted-foreground">Connection Status</span>
                {status?.configured ? (
                  <Badge className="status-active gap-1.5 text-xs">
                    <CheckCircle size={11} />
                    Connected
                  </Badge>
                ) : (
                  <Badge className="status-error gap-1.5 text-xs">
                    <AlertTriangle size={11} />
                    Not configured
                  </Badge>
                )}
              </div>

              {/* Notice */}
              <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 text-sm">
                <Info size={15} className="text-primary shrink-0 mt-0.5" />
                <p className="text-muted-foreground leading-relaxed">
                  All customers calling <strong className="text-foreground">{status?.phoneNumber ?? 'this number'}</strong> are answered
                  by your AI voice agent automatically using your company profile,
                  services, and knowledge base.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="glass-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                step: '1',
                label: 'Customer calls the platform number',
                sub: status?.phoneNumber ?? 'Loading...',
              },
              {
                step: '2',
                label: 'Twilio forwards the call to our backend',
                sub: 'Automatic — no action needed',
              },
              {
                step: '3',
                label: 'Backend opens an OpenAI Realtime session',
                sub: 'Uses your system prompt, services, and knowledge base',
              },
              {
                step: '4',
                label: 'AI responds with voice in real time',
                sub: 'Bidirectional audio via Twilio Media Streams',
              },
            ].map(({ step, label, sub }) => (
              <div key={step} className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">
                  {step}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Webhook URLs (for developer reference) */}
      <Card className="glass-card border-border opacity-80">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <ExternalLink size={13} />
            Twilio Console — Webhook URLs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-muted-foreground">
          <p>Set these in your Twilio Console → Phone Numbers → Active Numbers → Voice Configuration:</p>
          <div className="space-y-2">
            <div>
              <p className="font-medium text-foreground mb-1">Voice Webhook (POST):</p>
              <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 border border-border">
                <code className="flex-1 font-mono text-primary break-all">
                  {baseUrl}/api/twilio/voice
                </code>
                <CopyButton value={`${baseUrl}/api/twilio/voice`} />
              </div>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Status Callback (POST):</p>
              <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 border border-border">
                <code className="flex-1 font-mono text-primary break-all">
                  {baseUrl}/api/twilio/status
                </code>
                <CopyButton value={`${baseUrl}/api/twilio/status`} />
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground/60 pt-1">
            For local testing, use ngrok: <code className="font-mono">ngrok http 4000</code> then replace the base URL above.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
