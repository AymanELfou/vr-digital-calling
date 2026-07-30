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
              <span className="text-xs font-mono font-semibold text-primary uppercase tracking-wider">{t.servicesPage.heroBadge}</span>
            </div>

            <h1 className="font-display font-bold text-4xl sm:text-6xl text-white leading-[1.08] tracking-tight">
              {t.servicesPage.heroTitle} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-primary to-purple-400">
                {t.servicesPage.heroTitleHighlight}
              </span>
            </h1>

            <p className="text-lg text-slate-200 leading-relaxed max-w-xl font-medium">
              {t.servicesPage.heroSubtitle}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button
                size="lg"
                onClick={() => navigate('/login')}
                className="bg-gradient-brand hover:opacity-90 text-white font-semibold rounded-full px-8 py-6 btn-glow text-base shadow-xl group"
              >
                {t.servicesPage.startTrialBtn}
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform rtl-flip" />
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
                {t.servicesPage.exploreServicesBtn}
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

      {/* Section 1: Core Services Grid */}
      <section className="py-20 px-6 max-w-7xl mx-auto space-y-12">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
            <Cpu size={24} />
          </div>
          <div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground">{t.servicesPage.titleCoreServices}</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              {t.servicesPage.subtitleCoreServices}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              title: t.servicesPage.srv1Title,
              desc: t.servicesPage.srv1Desc,
              icon: Cpu,
            },
            {
              title: t.servicesPage.srv2Title,
              desc: t.servicesPage.srv2Desc,
              icon: Database,
            },
            {
              title: t.servicesPage.srv3Title,
              desc: t.servicesPage.srv3Desc,
              icon: Network,
            },
            {
              title: t.servicesPage.srv4Title,
              desc: t.servicesPage.srv4Desc,
              icon: RefreshCw,
            },
            {
              title: t.servicesPage.srv5Title,
              desc: t.servicesPage.srv5Desc,
              icon: Lock,
            },
            {
              title: t.servicesPage.srv6Title,
              desc: t.servicesPage.srv6Desc,
              icon: ShieldCheck,
            },
          ].map((srv, idx) => (
            <div
              key={idx}
              className="glass-card p-8 rounded-3xl border border-white/10 hover:border-primary/40 transition-all duration-300 hover:-translate-y-1.5 group"
            >
              <div className="w-12 h-12 rounded-2xl border border-primary/20 bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <srv.icon className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-xl text-white mb-3">{srv.title}</h3>
              <p className="text-slate-300 text-sm leading-relaxed">{srv.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 2: Core Technology & Architecture */}
      <section id="core-technology" className="py-20 px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs font-mono font-bold text-primary tracking-widest uppercase">{t.servicesPage.archBadge}</span>
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-foreground">{t.servicesPage.archTitle}</h2>
          <p className="text-muted-foreground text-sm max-w-2xl mx-auto">{t.servicesPage.archDesc}</p>
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
              <h3 className="font-bold text-xl text-foreground">{t.servicesPage.archItem1Title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t.servicesPage.archItem1Desc}
              </p>
            </div>

            <div className="space-y-2 border-l-2 border-blue-400 pl-4">
              <h3 className="font-bold text-xl text-foreground">{t.servicesPage.archItem2Title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t.servicesPage.archItem2Desc}
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
              {t.servicesPage.ctaTitle}
            </h2>
            <p className="text-slate-200 text-base font-medium max-w-xl mx-auto">
              {t.servicesPage.ctaSubtitle}
            </p>

            <div className="flex flex-wrap justify-center gap-4 pt-2">
              <Button
                size="lg"
                onClick={() => navigate('/login')}
                className="bg-gradient-brand hover:opacity-90 text-white font-semibold rounded-full px-10 py-6 text-lg btn-glow shadow-xl"
              >
                {t.servicesPage.ctaBtn}
                <ArrowRight className="w-5 h-5 ml-2 rtl-flip" />
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
            <span className="font-bold text-foreground">VR Digital Calling</span>
            <span>{t.landing.footerRights}</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/#features" className="hover:text-foreground transition-colors">{t.landing.navFeatures}</Link>
            <Link to="/#how-it-works" className="hover:text-foreground transition-colors">{t.landing.navHowItWorks}</Link>
            <Link to="/#about" className="hover:text-foreground transition-colors">{t.landing.navAbout}</Link>
            <Link to="/login" className="hover:text-foreground transition-colors">{t.landing.navGetStarted}</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
