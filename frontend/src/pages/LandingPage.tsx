import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  PhoneCall, Bot, BookOpen, Briefcase, History, BarChart3, ArrowRight,
  CheckCircle2, Sparkles, Shield, Zap, Play, Menu, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LanguageToggle } from '@/components/shared/LanguageToggle'
import { useTranslation } from '@/lib/i18n'

export default function LandingPage() {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [activeTab, setActiveTab] = useState<'features' | 'how-it-works' | 'about'>('features')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { t } = useTranslation()

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
              {t.landing.navFeatures}
            </button>
            <button
              onClick={() => { setActiveTab('how-it-works'); scrollToSection('how-it-works') }}
              className={`hover:text-white transition-colors ${activeTab === 'how-it-works' ? 'text-primary font-semibold' : ''}`}
            >
              {t.landing.navHowItWorks}
            </button>
            <button
              onClick={() => { setActiveTab('about'); scrollToSection('about') }}
              className={`hover:text-white transition-colors ${activeTab === 'about' ? 'text-primary font-semibold' : ''}`}
            >
              {t.landing.navAbout}
            </button>
            <Link
              to="/services"
              className="hover:text-white transition-colors text-slate-300 font-medium"
            >
              {t.landing.navServices}
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {/* Language Toggle in Header NavBar */}
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
            <button
              onClick={() => { setMobileMenuOpen(false); setActiveTab('features'); scrollToSection('features') }}
              className="block w-full text-left py-2 text-base font-semibold text-slate-200 hover:text-white transition-colors"
            >
              {t.landing.navFeatures}
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); setActiveTab('how-it-works'); scrollToSection('how-it-works') }}
              className="block w-full text-left py-2 text-base font-semibold text-slate-200 hover:text-white transition-colors"
            >
              {t.landing.navHowItWorks}
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); setActiveTab('about'); scrollToSection('about') }}
              className="block w-full text-left py-2 text-base font-semibold text-slate-200 hover:text-white transition-colors"
            >
              {t.landing.navAbout}
            </button>
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
      <section className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-screen flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Hero Left Content */}
          <div className="lg:col-span-6 space-y-6 z-10 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">{t.landing.heroBadge}</span>
            </div>

            <h1 className="font-display font-bold text-4xl sm:text-6xl text-white leading-[1.1] tracking-tight">
              {t.landing.heroTitlePrefix} <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-purple-400">{t.landing.heroTitleHighlight}</span> {t.landing.heroTitleSuffix}
            </h1>

            <p className="text-lg text-slate-200 leading-relaxed max-w-xl font-medium">
              {t.landing.heroSubtitle}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button
                size="lg"
                onClick={() => navigate('/login')}
                className="bg-gradient-brand hover:opacity-90 text-white font-semibold rounded-full px-8 py-6 btn-glow text-base shadow-xl group"
              >
                {t.landing.startTrial}
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform rtl-flip" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => scrollToSection('how-it-works')}
                className="border-white/15 text-foreground hover:bg-white/10 rounded-full px-8 py-6 text-base"
              >
                <Play className="w-4 h-4 mr-2 text-primary" />
                {t.landing.howItWorksBtn}
              </Button>
            </div>

            {/* Quick feature checklist */}
            <div className="pt-6 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-400" /> {t.landing.checkInstantSetup}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-400" /> {t.landing.checkMoroccanGlobal}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-400" /> {t.landing.checkOpenAI}
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
                  <p className="text-[11px] text-muted-foreground font-medium">{t.landing.cardIncomingCall}</p>
                  <p className="text-xs font-mono font-bold text-foreground">+212 634 847654</p>
                </div>
              </div>

              <div className="absolute -bottom-6 -left-4 glass-card p-3.5 rounded-2xl border border-green-400/30 flex items-center gap-3 shadow-2xl animate-float-slow">
                <div className="relative w-9 h-9 rounded-xl bg-green-400/20 flex items-center justify-center text-green-400">
                  <span className="absolute inset-0 rounded-xl bg-green-400/20 animate-ping" />
                  <Bot className="w-5 h-5 relative z-10" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">{t.landing.cardAIAnswering}</p>
                  <p className="text-xs font-bold text-green-400">{t.landing.cardLowLatency}</p>
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
            {t.landing.featuresBadge}
          </Badge>
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-white">
            {t.landing.featuresTitle}
          </h2>
          <p className="text-slate-200 text-base sm:text-lg font-medium">
            {t.landing.featuresSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: Bot,
              title: t.landing.feat1Title,
              desc: t.landing.feat1Desc,
              color: 'text-primary bg-primary/10 border-primary/20',
            },
            {
              icon: BookOpen,
              title: t.landing.feat2Title,
              desc: t.landing.feat2Desc,
              color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
            },
            {
              icon: Briefcase,
              title: t.landing.feat3Title,
              desc: t.landing.feat3Desc,
              color: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
            },
            {
              icon: Zap,
              title: t.landing.feat4Title,
              desc: t.landing.feat4Desc,
              color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
            },
            {
              icon: History,
              title: t.landing.feat5Title,
              desc: t.landing.feat5Desc,
              color: 'text-green-400 bg-green-400/10 border-green-400/20',
            },
            {
              icon: BarChart3,
              title: t.landing.feat6Title,
              desc: t.landing.feat6Desc,
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
              {t.landing.bannerTitle}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t.landing.bannerDesc}
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
              {t.landing.howBadge}
            </Badge>
            <h2 className="font-display font-bold text-3xl sm:text-5xl text-foreground">
              {t.landing.howTitle}
            </h2>
            <p className="text-muted-foreground text-base">
              {t.landing.howSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: t.landing.step1Number,
                title: t.landing.step1Title,
                desc: t.landing.step1Desc,
              },
              {
                step: t.landing.step2Number,
                title: t.landing.step2Title,
                desc: t.landing.step2Desc,
              },
              {
                step: t.landing.step3Number,
                title: t.landing.step3Title,
                desc: t.landing.step3Desc,
              },
              {
                step: t.landing.step4Number,
                title: t.landing.step4Title,
                desc: t.landing.step4Desc,
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
              {t.landing.aboutBadge}
            </Badge>
            <h2 className="font-display font-bold text-3xl sm:text-5xl text-foreground leading-tight">
              {t.landing.aboutTitle}
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              {t.landing.aboutDesc}
            </p>

            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4">
                <Shield className="w-6 h-6 text-primary shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-foreground text-sm">{t.landing.aboutSec1Title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{t.landing.aboutSec1Desc}</p>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4">
                <Zap className="w-6 h-6 text-yellow-400 shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-foreground text-sm">{t.landing.aboutSec2Title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{t.landing.aboutSec2Desc}</p>
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
              {t.landing.ctaTitle}
            </h2>
            <p className="text-muted-foreground text-base max-w-xl mx-auto">
              {t.landing.ctaSubtitle}
            </p>
            <Button
              size="lg"
              onClick={() => navigate('/login')}
              className="bg-gradient-brand hover:opacity-90 text-white font-semibold rounded-full px-10 py-6 text-lg btn-glow shadow-xl"
            >
              {t.landing.ctaButton}
              <ArrowRight className="w-5 h-5 ml-2 rtl-flip" />
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
            <span>{t.landing.footerRights}</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-foreground transition-colors">{t.landing.navFeatures}</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">{t.landing.navHowItWorks}</a>
            <a href="#about" className="hover:text-foreground transition-colors">{t.landing.navAbout}</a>
            <Link to="/login" className="hover:text-foreground transition-colors">{t.landing.navGetStarted}</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
