import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Sparkles, ArrowRight, ShieldCheck, Cpu, Database, Network,
  Lock, RefreshCw, Globe, Menu, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LanguageToggle } from '@/components/shared/LanguageToggle'
import { useTranslation } from '@/lib/i18n'

export default function OurServicesPage() {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { t } = useTranslation()

  // Shader ambient background
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) return

    let animationFrameId: number

    const vs = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `
    const fs = `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec3 color1 = vec3(0.08, 0.14, 0.38); // Deep Blue
        vec3 color2 = vec3(0.24, 0.08, 0.32); // Deep Purple

        float wave1 = sin(uv.x * 2.0 + u_time * 0.4) * 0.5 + 0.5;
        float wave2 = cos(uv.y * 2.5 - u_time * 0.3) * 0.5 + 0.5;

        vec3 finalColor = mix(color1, color2, wave1 * wave2);
        finalColor *= 0.22;
        finalColor *= (1.0 - uv.y * 0.5);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `

    function createShader(type: number, source: string) {
      const shader = gl!.createShader(type)
      if (!shader) return null
      gl!.shaderSource(shader, source)
      gl!.compileShader(shader)
      return shader
    }

    const vertShader = createShader(gl.VERTEX_SHADER, vs)
    const fragShader = createShader(gl.FRAGMENT_SHADER, fs)
    if (!vertShader || !fragShader) return

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vertShader)
    gl.attachShader(program, fragShader)
    gl.linkProgram(program)
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)

    const pos = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(pos)
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)

    const uTime = gl.getUniformLocation(program, 'u_time')
    const uRes = gl.getUniformLocation(program, 'u_resolution')

    function resize() {
      if (!canvas) return
      const w = canvas.parentElement?.clientWidth || window.innerWidth
      const h = canvas.parentElement?.clientHeight || window.innerHeight
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl!.viewport(0, 0, w, h)
      }
    }

    resize()
    window.addEventListener('resize', resize)

    function render(t: number) {
      if (!gl) return
      gl.uniform1f(uTime, t * 0.001)
      gl.uniform2f(uRes, canvas!.width, canvas!.height)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      animationFrameId = requestAnimationFrame(render)
    }

    render(0)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#07030E] text-foreground font-sans relative overflow-x-hidden selection:bg-primary/30">
      {/* Background WebGL Shader */}
      <div className="fixed inset-0 z-0 opacity-60 pointer-events-none">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Glass Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#07030E]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/logo.jpeg"
              alt="VR Digital Calling"
              className="w-10 h-10 rounded-xl object-cover shadow-lg border border-primary/30"
            />
            <div>
              <span className="font-display font-bold text-foreground text-lg leading-tight block">VR Digital</span>
              <span className="text-[10px] text-primary font-semibold tracking-wider uppercase block">Calling Platform</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <Link to="/#features" className="hover:text-white transition-colors">{t.landing.navFeatures}</Link>
            <Link to="/#how-it-works" className="hover:text-white transition-colors">{t.landing.navHowItWorks}</Link>
            <Link to="/#about" className="hover:text-white transition-colors">{t.landing.navAbout}</Link>
            <Link to="/services" className="text-primary font-semibold transition-colors">{t.landing.navServices}</Link>
          </nav>

          <div className="flex items-center gap-3">
            {/* Language Toggle Button */}
            <LanguageToggle
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
            />

            <Link to="/login" className="hidden sm:inline-flex px-6 py-2.5 rounded-full bg-gradient-brand text-sm font-semibold text-white btn-glow transition-all">
              {t.landing.navGetStarted}
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle Mobile Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#15121a]/95 backdrop-blur-2xl border-b border-white/10 px-6 py-6 space-y-4 animate-fade-in">
            <Link
              to="/#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left py-2 text-base font-semibold text-slate-200 hover:text-white transition-colors"
            >
              {t.landing.navFeatures}
            </Link>
            <Link
              to="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left py-2 text-base font-semibold text-slate-200 hover:text-white transition-colors"
            >
              {t.landing.navHowItWorks}
            </Link>
            <Link
              to="/#about"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left py-2 text-base font-semibold text-slate-200 hover:text-white transition-colors"
            >
              {t.landing.navAbout}
            </Link>
            <Link
              to="/services"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left py-2 text-base font-semibold text-primary transition-colors"
            >
              {t.landing.navServices}
            </Link>
            <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
              <LanguageToggle
                variant="outline"
                size="sm"
                className="w-full justify-center border-white/20 text-white hover:bg-white/10"
              />
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 text-center rounded-full bg-gradient-brand text-sm font-semibold text-white btn-glow"
              >
                {t.landing.navGetStarted}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-[85vh] flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 z-10 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-xs font-mono font-semibold text-primary uppercase tracking-wider">NEURAL VOICE ARCHITECTURE</span>
            </div>

            <h1 className="font-display font-bold text-4xl sm:text-6xl text-white leading-[1.08] tracking-tight">
              Spatial Communication <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-primary to-purple-400">
                Redefined by Intelligence
              </span>
            </h1>

            <p className="text-lg text-slate-200 leading-relaxed max-w-xl font-medium">
              Beyond simple VoIP. We integrate neural voice synthesis, dynamic knowledge mapping, and low-latency spatial audio into a single cohesive ecosystem for global teams.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button
                size="lg"
                onClick={() => navigate('/login')}
                className="bg-gradient-brand hover:opacity-90 text-white font-semibold rounded-full px-8 py-6 btn-glow text-base shadow-xl group"
              >
                Explore Ecosystem
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  const el = document.getElementById('core-technology')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="border-white/15 text-white hover:bg-white/10 rounded-full px-8 py-6 text-base"
              >
                Technical Specs
              </Button>
            </div>
          </div>

          {/* Hero Soundwave Sphere Animated Widget */}
          <div className="lg:col-span-5 flex items-center justify-center relative">
            <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-secondary/30 border border-primary/30 backdrop-blur-2xl flex items-center justify-center shadow-[0_0_60px_rgba(176,198,255,0.25)] relative animate-pulse">
              {/* Equalizer bars animation */}
              <div className="flex items-center gap-1.5 h-20">
                {[...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    style={{ animationDelay: `${i * 0.15}s` }}
                    className="w-2 rounded-full bg-gradient-to-t from-primary via-blue-400 to-purple-400 animate-bounce h-16"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1: Neural Voice Agents */}
      <section className="py-20 px-6 max-w-7xl mx-auto space-y-12">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
            <Cpu size={24} />
          </div>
          <div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground">Neural Voice Agents</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Our proprietary LLM-driven voice architecture doesn't just speak; it understands intent, sentiment, and spatial context. Every interaction is rendered with human-like prosody and sub-150ms latency.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Cards */}
          <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
            <div className="glass-card p-8 rounded-3xl border border-white/10 hover:border-primary/40 transition-all">
              <h3 className="font-bold text-xl text-foreground mb-3">Multimodal Sentiment Analysis</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Real-time tone detection adjusts the agent's response style—from empathetic support to professional urgency—based on the caller's emotional state.
              </p>
            </div>

            <div className="glass-card p-8 rounded-3xl border border-white/10 hover:border-primary/40 transition-all">
              <h3 className="font-bold text-xl text-foreground mb-3">Adaptive Vocal Cloning</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Deploy consistent brand voices across 40+ languages, maintaining identical tonal characteristics and brand personality globally.
              </p>
            </div>
          </div>

          {/* Right Visual & Stats */}
          <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
            <div className="glass-card p-4 rounded-3xl border border-white/10 relative overflow-hidden group">
              <img
                src="/services_live_engine.png"
                alt="Synthesizing Voice Engine"
                className="w-full h-56 object-cover rounded-2xl border border-white/10"
              />
              <div className="absolute top-8 left-8 flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="text-[11px] font-mono font-bold text-white uppercase">LIVE ENGINE — Synthesizing Voice</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="glass-card p-6 rounded-3xl border border-white/10 text-center">
                <p className="font-display font-bold text-4xl text-primary">142<span className="text-xl">ms</span></p>
                <p className="text-xs text-muted-foreground font-mono mt-1 uppercase tracking-wider">AVG. LATENCY</p>
              </div>
              <div className="glass-card p-6 rounded-3xl border border-white/10 text-center">
                <p className="font-display font-bold text-4xl text-purple-400">98.4<span className="text-xl">%</span></p>
                <p className="text-xs text-muted-foreground font-mono mt-1 uppercase tracking-wider">INTENT ACCURACY</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Cognitive Knowledge Mapping */}
      <section className="py-20 px-6 max-w-7xl mx-auto space-y-12">
        <div>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground">Cognitive Knowledge Mapping</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Seamlessly tether your enterprise data to every conversation. Our AI scans docs, spreadsheets, and databases to provide instant, cited answers.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Large Card */}
          <div className="lg:col-span-6 glass-card p-8 rounded-3xl border border-white/10 flex flex-col justify-between space-y-6">
            <div>
              <span className="inline-block text-[10px] font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full uppercase mb-4">
                REAL-TIME RETRIEVAL
              </span>
              <h3 className="font-display font-bold text-2xl text-foreground mb-3">Semantic Graph Search</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Unlike keyword search, our engine understands the relationship between concepts, allowing for complex queries like "How does the Q3 budget affect the new VR project?" during live calls.
              </p>
            </div>
            {/* Spatial Knowledge Graph Diagram */}
            <div className="h-44 rounded-2xl bg-[#100d15]/90 border border-white/10 relative overflow-hidden flex items-center justify-center p-4">
              <div className="relative w-full max-w-sm flex items-center justify-between z-10 px-2">
                {/* Node 1: User Query */}
                <div className="flex flex-col items-center gap-1.5 animate-pulse">
                  <div className="w-11 h-11 rounded-2xl bg-blue-500/20 border border-blue-400/60 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.4)]">
                    <Sparkles size={18} />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-300">User Query</span>
                </div>

                {/* Stream Pulse 1 */}
                <div className="flex-1 h-0.5 bg-gradient-to-r from-blue-400 via-primary to-purple-400 mx-2 relative">
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary animate-ping" />
                </div>

                {/* Node 2: Knowledge Graph Engine */}
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-14 h-14 rounded-2xl bg-primary/20 border-2 border-primary flex items-center justify-center text-primary shadow-[0_0_25px_rgba(176,198,255,0.5)]">
                    <Network size={22} />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-primary uppercase">Knowledge Graph</span>
                </div>

                {/* Stream Pulse 2 */}
                <div className="flex-1 h-0.5 bg-gradient-to-r from-primary via-purple-400 to-pink-400 mx-2 relative">
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                </div>

                {/* Node 3: Realtime AI Response */}
                <div className="flex flex-col items-center gap-1.5 animate-pulse">
                  <div className="w-11 h-11 rounded-2xl bg-purple-500/20 border border-purple-400/60 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(192,132,252,0.4)]">
                    <Cpu size={18} />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-300">AI Response</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Cards */}
          <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
            <div className="glass-card p-8 rounded-3xl border border-white/10 flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-blue-400/10 border border-blue-400/20 text-blue-400 shrink-0">
                <Database size={24} />
              </div>
              <div>
                <h4 className="font-bold text-lg text-foreground mb-2">Universal Data Connectors</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Native integration with Notion, Salesforce, Google Drive, and custom SQL endpoints.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-2">
                <Lock className="w-5 h-5 text-primary mb-2" />
                <h5 className="font-bold text-sm text-foreground uppercase tracking-wider">Zero Knowledge Encryption</h5>
                <p className="text-xs text-muted-foreground">Raw data is encrypted in transit and at rest using 256-bit AES.</p>
              </div>
              <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-2">
                <RefreshCw className="w-5 h-5 text-purple-400 mb-2" />
                <h5 className="font-bold text-sm text-foreground uppercase tracking-wider">Auto-HSM Sync</h5>
                <p className="text-xs text-muted-foreground">New documents are parsed, tagged, and ready for retrieval in under <strong className="text-foreground">3s</strong>.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Core Technology — The Low-Latency Spatial Engine */}
      <section id="core-technology" className="py-20 px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs font-mono font-bold text-primary tracking-widest uppercase">CORE TECHNOLOGY</span>
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-foreground">The Low-Latency Spatial Engine</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Server Rack Image */}
          <div className="lg:col-span-6 relative">
            <img
              src="/services_server_engine.png"
              alt="Low Latency Spatial Engine"
              className="w-full h-auto rounded-3xl object-cover border border-white/10 shadow-2xl"
            />
          </div>

          {/* Right Features List */}
          <div className="lg:col-span-6 space-y-8">
            <div className="space-y-2 border-l-2 border-primary pl-4">
              <h3 className="font-bold text-xl text-foreground">Binaural Spatial Audio</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Process voices in a 3D soundstage. Identify who is speaking instantly by their position in the virtual room, reducing cognitive load during large group calls.
              </p>
            </div>

            <div className="space-y-2 border-l-2 border-blue-400 pl-4">
              <h3 className="font-bold text-xl text-foreground">Dynamic Jitter Buffering</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Advanced ML algorithms predict network fluctuations and adjust buffering in real-time, ensuring crystal clear audio even on 4G/LTE connections.
              </p>
            </div>

            <div className="space-y-2 border-l-2 border-purple-400 pl-4">
              <h3 className="font-bold text-xl text-foreground">Instantaneous Transcription</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Words appear as they are spoken. Our system generates a live, searchable transcript with speaker diarization and key-point highlighting.
              </p>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-3 pt-4">
              <span className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-foreground flex items-center gap-2">
                <Network size={14} className="text-primary" /> 100Gbps Backbone
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-foreground flex items-center gap-2">
                <Globe size={14} className="text-blue-400" /> 24 Global POPs
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-foreground flex items-center gap-2">
                <ShieldCheck size={14} className="text-green-400" /> HIPAA/GDPR Compliant
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <div className="glass-card rounded-[40px] p-12 text-center relative overflow-hidden border border-primary/30">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 blur-[80px] rounded-full" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/20 blur-[80px] rounded-full" />

          <div className="relative z-10 space-y-6">
            <h2 className="font-display font-bold text-3xl sm:text-5xl text-white">
              Ready to enter the spatial era?
            </h2>
            <p className="text-slate-200 text-base font-medium max-w-xl mx-auto">
              Join 500+ forward-thinking enterprises scaling their communication with VR Digital.
            </p>

            <div className="flex flex-wrap justify-center gap-4 pt-2">
              <Button
                size="lg"
                onClick={() => navigate('/login')}
                className="bg-gradient-brand hover:opacity-90 text-white font-semibold rounded-full px-10 py-6 text-lg btn-glow shadow-xl"
              >
                Schedule a Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-[#05020A] py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="Logo" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-bold text-foreground">VR Digital</span>
            <span>© 2026 All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 font-mono text-[11px]">
            <Link to="/landing#privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/landing#terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link to="/services" className="hover:text-foreground transition-colors">Contact Us</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
