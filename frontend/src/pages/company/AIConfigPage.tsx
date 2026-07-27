import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bot, Save, Loader2, Mic, Globe, Sliders, Zap, BookOpen,
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

// ─── Slider Component ─────────────────────────────────────────────────────────
function SliderField({
  label, value, min, max, step, onChange, format, hint,
}: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; format: (v: number) => string; hint: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <span className="text-sm font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-track]:bg-secondary [&::-webkit-slider-track]:rounded-full
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg
          accent-primary"
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

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

  // ── Save ───────────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.patch('/ai-config', form)
      return data
    },
    onSuccess: () => {
      toast.success('AI configuration saved')
      qc.invalidateQueries({ queryKey: ['ai-config'] })
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

      {/* Voice + Engine */}
      <Card className="glass-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Mic size={16} className="text-primary" />
            Voice & Engine
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

          {/* Engine toggle */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">AI Engine</p>
            <div className="flex rounded-xl bg-secondary border border-border p-1 gap-1">
              {(['realtime', 'chat_tts'] as AiEngine[]).map((e) => (
                <button
                  key={e}
                  onClick={() => set('engine')(e)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    form.engine === e
                      ? 'bg-primary text-white shadow-lg'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Zap size={13} />
                  {e === 'realtime' ? 'Realtime (Production)' : 'Chat+TTS (Dev)'}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <strong className="text-foreground">Realtime</strong> — uses OpenAI Realtime API for live calls.{' '}
              <strong className="text-foreground">Chat+TTS</strong> — fallback for development testing.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Language + Advanced */}
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

      {/* Advanced Settings */}
      <Card className="glass-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Sliders size={16} className="text-primary" />
            Advanced Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <SliderField
            label="Temperature"
            value={form.temperature}
            min={0}
            max={1}
            step={0.05}
            onChange={set('temperature')}
            format={(v) => v.toFixed(2)}
            hint="Lower = more consistent and factual. Higher = more creative and varied responses."
          />
          <SliderField
            label="Max Tokens per Response"
            value={form.maxTokens}
            min={256}
            max={8192}
            step={256}
            onChange={(v) => set('maxTokens')(Math.round(v))}
            format={(v) => v.toLocaleString()}
            hint="Maximum tokens the AI generates per response turn. Higher = longer answers."
          />
          <SliderField
            label="Silence Detection (ms)"
            value={form.silenceMs}
            min={200}
            max={2000}
            step={100}
            onChange={(v) => set('silenceMs')(Math.round(v))}
            format={(v) => `${v}ms`}
            hint="How long to wait after caller stops speaking before AI responds. Shorter = snappier."
          />
          <div className="pt-2 border-t border-border">
            <Toggle
              label="Allow General Knowledge"
              hint="When enabled, the AI can answer off-topic questions using its general knowledge in addition to your company data."
              value={form.allowGeneral}
              onChange={set('allowGeneral')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Prompt Preview */}
      <Card className="glass-card border-border border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              What the AI receives
            </CardTitle>
            <Badge variant="outline" className="text-primary border-primary/30 text-xs">Preview</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-secondary/50 border border-border p-3 font-mono text-xs text-muted-foreground leading-relaxed space-y-1">
            <p className="text-foreground">{form.systemPrompt.slice(0, 200)}{form.systemPrompt.length > 200 ? '...' : ''}</p>
            <p className="text-primary/60">{'[Company Information injected here]'}</p>
            <p className="text-primary/60">{'[Services list injected here]'}</p>
            <p className="text-primary/60">{'[Knowledge Base / FAQ injected here]'}</p>
            <p className="text-primary/60">
              {form.allowGeneral
                ? '[General knowledge: allowed]'
                : '[General knowledge: restricted — company data only]'}
            </p>
            <p className="text-primary/60">
              {`[Language: ${form.language === 'auto' ? 'auto-detected from caller' : form.language}]`}
            </p>
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
