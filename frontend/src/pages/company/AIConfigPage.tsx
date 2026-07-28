import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bot, Save, Loader2, Mic, Globe, BookOpen,
  Info, ChevronDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiClient, getErrorMessage } from '@/lib/api'
import { toast } from 'sonner'
import type { AiConfig, AiVoice, AiEngine } from '@/lib/types'

// ─── Voice Metadata ────────────────────────────────────────────────────────────
const VOICES: { id: AiVoice; name: string; desc: string; gender: string }[] = [
  { id: 'alloy', name: 'Alloy', desc: 'Neutral, balanced', gender: '⚪' },
  { id: 'echo', name: 'Echo', desc: 'Warm, clear male', gender: '🔵' },
  { id: 'fable', name: 'Fable', desc: 'Expressive, British', gender: '🔵' },
  { id: 'onyx', name: 'Onyx', desc: 'Deep, authoritative', gender: '🔵' },
  { id: 'nova', name: 'Nova', desc: 'Friendly, young', gender: '🔴' },
  { id: 'shimmer', name: 'Shimmer', desc: 'Soft, warm female', gender: '🔴' },
]

const LANGUAGES = [
  { code: 'auto', label: '🌐 Auto-detect (recommended)' },
  { code: 'fr', label: '🇫🇷 French' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'ar', label: '🇸🇦 Arabic' },
  { code: 'es', label: '🇪🇸 Spanish' },
  { code: 'de', label: '🇩🇪 German' },
  { code: 'it', label: '🇮🇹 Italian' },
  { code: 'pt', label: '🇵🇹 Portuguese' },
]



// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ label, hint, value, onChange }: {
  label: string; hint: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
          value ? 'bg-primary' : 'bg-secondary border border-border'
        }`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  )
}

export default function AIConfigPage() {
  const qc = useQueryClient()

  const [form, setForm] = useState({
    systemPrompt: '',
    voice: 'alloy' as AiVoice,
    allowGeneral: true,
    temperature: 0.6,
    engine: 'realtime' as AiEngine,
    language: 'auto',
    maxTokens: 4096,
    silenceMs: 500,
  })

  const [promptLength, setPromptLength] = useState(0)
  const MAX_PROMPT = 12000

  // ── Load existing config ───────────────────────────────────────────────────
  const { data: config, isLoading } = useQuery<AiConfig | null>({
    queryKey: ['ai-config'],
    queryFn: async () => {
      const { data } = await apiClient.get('/ai-config')
      return data
    },
  })

  useEffect(() => {
    if (config) {
      setForm({
        systemPrompt: config.systemPrompt,
        voice: config.voice,
        allowGeneral: config.allowGeneral,
        temperature: config.temperature,
        engine: config.engine,
        language: config.language,
        maxTokens: (config as AiConfig & { maxTokens?: number }).maxTokens ?? 4096,
        silenceMs: (config as AiConfig & { silenceMs?: number }).silenceMs ?? 500,
      })
      setPromptLength(config.systemPrompt.length)
    }
  }, [config])

  // ── Load live compiled prompt ──────────────────────────────────────────────
  const { data: compiledData } = useQuery({
    queryKey: ['ai-config-compiled'],
    queryFn: async () => {
      const { data } = await apiClient.get('/ai-config/compiled-prompt')
      return data as { compiledPrompt: string; servicesCount: number; kbCount: number }
    },
  })

  // ── Save ───────────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.patch('/ai-config', form)
      return data
    },
    onSuccess: () => {
      toast.success('AI configuration saved')
      qc.invalidateQueries({ queryKey: ['ai-config'] })
      qc.invalidateQueries({ queryKey: ['ai-config-compiled'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const set = <K extends keyof typeof form>(k: K) => (v: typeof form[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const promptColor =
    promptLength > MAX_PROMPT * 0.9 ? 'text-red-400' :
    promptLength > MAX_PROMPT * 0.7 ? 'text-orange-400' :
    'text-muted-foreground'

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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            AI Configuration
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure how your AI voice agent behaves during calls.
          </p>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || form.systemPrompt.length < 10}
          className="bg-primary hover:bg-primary/90 btn-glow shrink-0"
        >
          {saveMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save
        </Button>
      </div>

      {/* System Prompt */}
      <Card className="glass-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <BookOpen size={16} className="text-primary" />
            System Prompt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            These are the core instructions for your AI. The platform automatically appends your company info,
            services, and knowledge base to this prompt.
          </p>
          <textarea
            value={form.systemPrompt}
            onChange={(e) => { set('systemPrompt')(e.target.value); setPromptLength(e.target.value.length) }}
            rows={8}
            placeholder="You are a professional AI receptionist for [Company Name]. You answer calls politely, help customers with their questions, and take messages when needed..."
            className="w-full rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition resize-none font-mono leading-relaxed"
          />
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Info size={12} />
              <span>Company data + KB are added automatically</span>
            </div>
            <span className={promptColor}>
              {promptLength.toLocaleString()} / {MAX_PROMPT.toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Voice & Rules */}
      <Card className="glass-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Mic size={16} className="text-primary" />
            Voice & Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Voice selector grid */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">AI Voice</p>
            <div className="grid grid-cols-3 gap-2">
              {VOICES.map((v) => (
                <button
                  key={v.id}
                  onClick={() => set('voice')(v.id)}
                  className={`rounded-xl px-3 py-3 text-left transition-all border ${
                    form.voice === v.id
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-secondary hover:border-primary/40 text-muted-foreground'
                  }`}
                >
                  <span className="block text-base mb-1">{v.gender}</span>
                  <span className="block text-sm font-semibold">{v.name}</span>
                  <span className="block text-xs opacity-70">{v.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Allow General Knowledge Toggle */}
          <div className="pt-4 border-t border-border">
            <Toggle
              label="Allow General Knowledge"
              hint="When enabled, the AI can answer off-topic questions using its general knowledge in addition to your company data."
              value={form.allowGeneral}
              onChange={set('allowGeneral')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card className="glass-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Globe size={16} className="text-primary" />
            Language
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <select
              value={form.language}
              onChange={(e) => set('language')(e.target.value)}
              className="w-full rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition appearance-none pr-8"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            <strong className="text-foreground">Auto-detect</strong> — AI detects the caller's language and responds in the same language throughout the call.
          </p>
        </CardContent>
      </Card>

      {/* Prompt Preview */}
      <Card className="glass-card border-border border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                What the AI receives
              </CardTitle>
              {(compiledData?.servicesCount ?? 0) > 0 && (
                <Badge variant="outline" className="text-[11px] text-green-400 border-green-400/30 bg-green-400/10">
                  {compiledData?.servicesCount} Active Service(s)
                </Badge>
              )}
              {(compiledData?.kbCount ?? 0) > 0 && (
                <Badge variant="outline" className="text-[11px] text-primary border-primary/30 bg-primary/10">
                  {compiledData?.kbCount} FAQ Entry(s)
                </Badge>
              )}
            </div>
            <Badge variant="outline" className="text-primary border-primary/30 text-xs">Live System Prompt</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl bg-secondary/70 border border-border p-4 font-mono text-xs text-foreground leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto shadow-inner">
            {compiledData?.compiledPrompt || form.systemPrompt}
          </div>
        </CardContent>
      </Card>

      {/* Save Button (bottom) */}
      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || form.systemPrompt.length < 10}
        className="w-full bg-primary hover:bg-primary/90 btn-glow"
      >
        {saveMutation.isPending ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : <><Save size={15} /> Save AI Configuration</>}
      </Button>
    </div>
  )
}
