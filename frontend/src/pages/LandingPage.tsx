import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  PhoneCall, Bot, BookOpen, Briefcase, History, BarChart3, ArrowRight,
  CheckCircle2, Sparkles, Shield, Zap, Play, Menu, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function LandingPage() {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [activeTab, setActiveTab] = useState<'features' | 'how-it-works' | 'about'>('features')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Shader animation effect
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
        vec3 color1 = vec3(0.12, 0.22, 0.55); // Deep Indigo
        vec3 color2 = vec3(0.32, 0.12, 0.45); // Deep Purple

        float wave1 = sin(uv.x * 2.5 + u_time * 0.4) * 0.5 + 0.5;
        float wave2 = cos(uv.y * 3.0 - u_time * 0.3) * 0.5 + 0.5;

        vec3 finalColor = mix(color1, color2, wave1 * wave2);
        finalColor *= 0.18;
        finalColor *= (1.0 - uv.y * 0.6);

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

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-[#07030E] text-foreground font-sans relative overflow-x-hidden selection:bg-primary/30">
      {/* Background WebGL Shader */}
      <div className="fixed inset-0 z-0 opacity-60 pointer-events-none">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Header Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#07030E]/80 backdrop-blur-xl border-b border-white/10 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img
              src="/logo.jpeg"
              alt="VR Digital Calling"
              className="w-10 h-10 rounded-xl object-cover shadow-lg border border-primary/30"
            />
            <div>
              <span className="font-display font-bold text-foreground text-lg leading-tight block">VR Digital</span>
              <span className="text-[10px] text-primary font-semibold tracking-wider uppercase block">Calling Platform</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <button
              onClick={() => { setActiveTab('features'); scrollToSection('features') }}
              className={`hover:text-white transition-colors ${activeTab === 'features' ? 'text-primary font-semibold' : ''}`}
            >
              Features
            </button>
            <button
              onClick={() => { setActiveTab('how-it-works'); scrollToSection('how-it-works') }}
              className={`hover:text-white transition-colors ${activeTab === 'how-it-works' ? 'text-primary font-semibold' : ''}`}
            >
              How It Works
            </button>
            <button
              onClick={() => { setActiveTab('about'); scrollToSection('about') }}
              className={`hover:text-white transition-colors ${activeTab === 'about' ? 'text-primary font-semibold' : ''}`}
            >
              About
            </button>
            <Link
              to="/services"
              className="hover:text-white transition-colors text-slate-300 font-medium"
            >
              Services
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden sm:inline-flex px-6 py-2.5 rounded-full bg-gradient-brand text-sm font-semibold text-white btn-glow transition-all">
              Get Started
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
            <button
              onClick={() => { setMobileMenuOpen(false); setActiveTab('features'); scrollToSection('features') }}
              className="block w-full text-left py-2 text-base font-semibold text-slate-200 hover:text-white transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); setActiveTab('how-it-works'); scrollToSection('how-it-works') }}
              className="block w-full text-left py-2 text-base font-semibold text-slate-200 hover:text-white transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); setActiveTab('about'); scrollToSection('about') }}
              className="block w-full text-left py-2 text-base font-semibold text-slate-200 hover:text-white transition-colors"
            >
              About
            </button>
            <Link
              to="/services"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left py-2 text-base font-semibold text-primary transition-colors"
            >
              Services
            </Link>
            <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 text-center rounded-full bg-gradient-brand text-sm font-semibold text-white btn-glow"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-screen flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Hero Left Content */}
          <div className="lg:col-span-6 space-y-6 z-10 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">AI Powered Voice Receptionist</span>
            </div>

            <h1 className="font-display font-bold text-4xl sm:text-6xl text-white leading-[1.1] tracking-tight">
              Your AI Agent <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-purple-400">Answers</span> Every Customer Call 24/7
            </h1>

            <p className="text-lg text-slate-200 leading-relaxed max-w-xl font-medium">
              Automate customer calls using OpenAI Realtime AI and Twilio Voice. Experience latency-free conversations that feel indistinguishable from human support.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button
                size="lg"
                onClick={() => navigate('/login')}
                className="bg-gradient-brand hover:opacity-90 text-white font-semibold rounded-full px-8 py-6 btn-glow text-base shadow-xl group"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => scrollToSection('how-it-works')}
                className="border-white/15 text-foreground hover:bg-white/10 rounded-full px-8 py-6 text-base"
              >
                <Play className="w-4 h-4 mr-2 text-primary" />
                How It Works
              </Button>
            </div>

            {/* Quick feature checklist */}
            <div className="pt-6 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-400" /> Instant Setup
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-400" /> Moroccan & Global Phone Numbers
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-400" /> OpenAI Realtime Engine
              </span>
            </div>
          </div>

          {/* Hero Right Visual Mockup */}
          <div className="lg:col-span-6 relative">
            <div className="relative w-full aspect-square flex items-center justify-center">
              {/* Glassmorphism Frame */}
              <div className="relative w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden p-2 transform lg:rotate-y-[-6deg] lg:rotate-x-[3deg] transition-all hover:rotate-0 duration-500">
                <img
                  src="/landing_hero_mockup.png"
                  alt="VR Digital AI Receptionist Dashboard"
                  className="w-full h-auto rounded-xl object-cover shadow-2xl"
                />
              </div>

              {/* Floating Status Cards */}
              <div className="absolute -top-4 -right-4 glass-card p-3.5 rounded-2xl border border-primary/30 flex items-center gap-3 shadow-2xl animate-float">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Incoming Call</p>
                  <p className="text-xs font-mono font-bold text-foreground">+212 634 847654</p>
                </div>
              </div>

              <div className="absolute -bottom-6 -left-4 glass-card p-3.5 rounded-2xl border border-green-400/30 flex items-center gap-3 shadow-2xl animate-float-slow">
                <div className="relative w-9 h-9 rounded-xl bg-green-400/20 flex items-center justify-center text-green-400">
                  <span className="absolute inset-0 rounded-xl bg-green-400/20 animate-ping" />
                  <Bot className="w-5 h-5 relative z-10" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">AI Answering</p>
                  <p className="text-xs font-bold text-green-400">Low Latency Stream Active</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs px-3 py-1">
            Core Platform Capabilities
          </Badge>
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-white">
            The Future of Voice Support
          </h2>
          <p className="text-slate-200 text-base sm:text-lg font-medium">
            Enterprise-grade infrastructure designed for modern companies that never sleep.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: Bot,
              title: 'AI Voice Agent',
              desc: 'Hyper-realistic neural voices powered by OpenAI Realtime low-latency response engine.',
              color: 'text-primary bg-primary/10 border-primary/20',
            },
            {
              icon: BookOpen,
              title: 'Knowledge Base',
              desc: 'Upload business FAQs and documentation so your AI agent speaks with 100% accuracy.',
              color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
            },
            {
              icon: Briefcase,
              title: 'Services Management',
              desc: 'Define company services, pricing, and appointment durations automatically injected into AI memory.',
              color: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
            },
            {
              icon: Zap,
              title: 'Realtime Calls',
              desc: 'Integrated Twilio Voice media streams allowing natural back-and-forth conversation interruptions.',
              color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
            },
            {
              icon: History,
              title: 'Call Transcripts',
              desc: 'Full turn-by-turn text transcripts and status history stored securely in PostgreSQL.',
              color: 'text-green-400 bg-green-400/10 border-green-400/20',
            },
            {
              icon: BarChart3,
              title: 'Control Tower Analytics',
              desc: 'Platform-wide telemetry, call duration metrics, and estimated OpenAI API cost tracking.',
              color: 'text-pink-400 bg-pink-400/10 border-pink-400/20',
            },
          ].map((feat, idx) => (
            <div
              key={idx}
              className="glass-card p-8 rounded-3xl border border-white/10 hover:border-primary/40 transition-all duration-300 hover:-translate-y-1.5 group"
            >
              <div className={`w-12 h-12 rounded-2xl border ${feat.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <feat.icon className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-xl text-white mb-3">{feat.title}</h3>
              <p className="text-slate-300 text-sm leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>

        {/* Feature Visual Banner */}
        <div className="mt-16 glass-card p-8 rounded-3xl border border-white/10 overflow-hidden relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <h3 className="font-display font-bold text-2xl sm:text-3xl text-foreground">
              Natural Conversations Powered by OpenAI Realtime
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Our WebSockets integration bridges Twilio g711_ulaw audio directly to OpenAI's Realtime API. No speech-to-text delay — the AI hears and speaks simultaneously.
            </p>
          </div>
          <div className="lg:col-span-5 relative">
            <img
              src="/landing_ai_agent.png"
              alt="AI Voice Receptionist Assistant"
              className="w-full h-auto rounded-2xl object-cover border border-primary/20 shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
            <Badge className="bg-blue-400/10 text-blue-400 border-blue-400/20 text-xs px-3 py-1">
              Simple 4-Step Setup
            </Badge>
            <h2 className="font-display font-bold text-3xl sm:text-5xl text-foreground">
              Set Up Your AI Agent in Minutes
            </h2>
            <p className="text-muted-foreground text-base">
              No complex code required. Connect your phone number and let AI handle your calls.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                title: 'Connect Number',
                desc: 'Link your Twilio account and Moroccan or global phone number.',
              },
              {
                step: '02',
                title: 'Educate AI',
                desc: 'Add company information, services, prices, and FAQ items.',
              },
              {
                step: '03',
                title: 'Customize Voice',
                desc: 'Select AI voice tone (Alloy, Echo, Nova) and language options.',
              },
              {
                step: '04',
                title: 'Go Live 24/7',
                desc: 'Your AI agent instantly answers incoming calls round-the-clock.',
              },
            ].map((st, i) => (
              <div key={i} className="glass-card p-8 rounded-3xl border border-white/10 relative group hover:border-primary/40 transition-all">
                <div className="w-14 h-14 rounded-2xl bg-gradient-brand text-white font-display font-bold text-xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
                  {st.step}
                </div>
                <h4 className="font-bold text-lg text-foreground mb-2">{st.title}</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 relative">
            <img
              src="/landing_about_team.png"
              alt="VR Digital Team"
              className="w-full h-auto rounded-3xl object-cover border border-white/10 shadow-2xl"
            />
          </div>
          <div className="lg:col-span-6 space-y-6">
            <Badge className="bg-purple-400/10 text-purple-400 border-purple-400/20 text-xs px-3 py-1">
              About VR Digital Calling
            </Badge>
            <h2 className="font-display font-bold text-3xl sm:text-5xl text-foreground leading-tight">
              Revolutionizing Business Telephony with AI
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              VR Digital Calling provides businesses with autonomous voice receptionists that understand context, speak naturally, and execute business instructions effortlessly.
            </p>

            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4">
                <Shield className="w-6 h-6 text-primary shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-foreground text-sm">Enterprise Security & Telemetry</h4>
                  <p className="text-xs text-muted-foreground mt-1">Full privacy controls, PostgreSQL storage, and real-time Control Tower status monitoring.</p>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4">
                <Zap className="w-6 h-6 text-yellow-400 shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-foreground text-sm">Zero Missed Opportunities</h4>
                  <p className="text-xs text-muted-foreground mt-1">Never lose a potential customer to busy signals or after-hours voicemails again.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call To Action Banner */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <div className="glass-card rounded-[40px] p-12 text-center relative overflow-hidden border border-primary/30">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 blur-[80px] rounded-full" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/20 blur-[80px] rounded-full" />

          <div className="relative z-10 space-y-6">
            <h2 className="font-display font-bold text-3xl sm:text-5xl text-foreground">
              Ready to Automate Your Customer Calls?
            </h2>
            <p className="text-muted-foreground text-base max-w-xl mx-auto">
              Join forward-thinking companies scaling their voice operations with VR Digital Calling.
            </p>
            <Button
              size="lg"
              onClick={() => navigate('/login')}
              className="bg-gradient-brand hover:opacity-90 text-white font-semibold rounded-full px-10 py-6 text-lg btn-glow shadow-xl"
            >
              Get Started Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-[#05020A] py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="Logo" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-bold text-foreground">VR Digital Calling</span>
            <span>© 2026 All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#about" className="hover:text-foreground transition-colors">About</a>
            <Link to="/login" className="hover:text-foreground transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
