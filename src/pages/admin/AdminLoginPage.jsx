import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabaseStaff } from '../../lib/supabase'

async function signInWithGoogle() {
  await supabaseStaff.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  })
}

// ── Feature data ─────────────────────────────────────────────────────────────

const CLIENT_FEATURES = [
  {
    title: 'Acceso por QR de mesa',
    desc: 'El cliente escanea el QR y el sistema lo ubica solo. Sin app, sin registro previo.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/>
        <rect x="3" y="16" width="5" height="5" rx="1"/>
        <path d="M21 16h-3v3"/><path d="M18 21v-2"/><path d="M16 18h2"/>
      </svg>
    ),
  },
  {
    title: 'Menú digital con fotos',
    desc: 'Navegá por categorías, fotos y descripción de cada plato. Se actualiza al instante.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        <line x1="8" y1="8" x2="14" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
  },
  {
    title: 'Pedido directo a cocina',
    desc: 'Agrega ítems al carrito y envía. Sin esperar al mozo, sin errores de transcripción.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
      </svg>
    ),
  },
  {
    title: 'Pago integrado',
    desc: 'Efectivo, tarjeta o transferencia con comprobante. El cliente paga cuando quiere.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2"/>
        <line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
  },
]

const STAFF_FEATURES = [
  {
    title: 'Kanban de pedidos',
    desc: 'Vista en columnas: recibido → en preparación → listo → entregado. Todo el equipo sincronizado.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M9 3v18"/><path d="M15 3v18"/>
      </svg>
    ),
  },
  {
    title: 'Mapa del salón',
    desc: 'Ves qué mesas están ocupadas. Tocás una y ves todos sus pedidos activos al instante.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    title: 'Alertas por WhatsApp',
    desc: 'El staff recibe notificaciones al instante cuando entra un pedido o el cliente pide atención.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    title: 'Control de stock',
    desc: 'Alertas de stock bajo. Un clic para ocultar un plato del menú. Sin interrupciones al cliente.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
]

const STEPS = [
  {
    num: '1',
    title: 'Cargás tu menú',
    desc: 'Fotos, precios, categorías. Setup completo en menos de una hora.',
  },
  {
    num: '2',
    title: 'Imprimís los QR',
    desc: 'Capy genera un QR único por mesa. Lo pegás y ya está funcionando.',
  },
  {
    num: '3',
    title: 'Los pedidos llegan solos',
    desc: 'El cliente pide, cocina recibe, el staff entrega. Sin papel, sin errores.',
  },
]

const METRICS = [
  { num: 'Sin papel', label: 'Comandas 100% digitales' },
  { num: 'Tiempo real', label: 'Estado de cada pedido' },
  { num: 'Gratis', label: 'Para empezar hoy' },
]

// ── Google button (shared) ───────────────────────────────────────────────────
const GoogleBtn = ({ dark }) => (
  <button
    type="button"
    onClick={signInWithGoogle}
    className={`w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl text-sm transition-colors ${
      dark
        ? 'border border-white/20 text-white/80 hover:border-white/40 hover:bg-white/5'
        : 'border border-carbon-800 bg-carbon-950 hover:bg-carbon-900 text-smoke-400'
    }`}
  >
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
    Continuar con Google
  </button>
)

const Divider = ({ dark }) => (
  <div className="flex items-center gap-3">
    <div className={`flex-1 h-px ${dark ? 'bg-white/10' : 'bg-carbon-800'}`} />
    <span className={`text-xs ${dark ? 'text-white/40' : 'text-smoke-500'}`}>o con email</span>
    <div className={`flex-1 h-px ${dark ? 'bg-white/10' : 'bg-carbon-800'}`} />
  </div>
)

// ── Main component ───────────────────────────────────────────────────────────
export default function AdminLoginPage() {
  const { signInWithEmail } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState('register')

  function scrollTo(t = 'register') {
    setTab(t)
    setTimeout(() => document.getElementById('lp-form')?.scrollIntoView({ behavior: 'smooth' }), 0)
  }

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [showRecovery, setShowRecovery] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoverySent, setRecoverySent] = useState(false)
  const [recoveryLoading, setRecoveryLoading] = useState(false)

  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [regSent, setRegSent] = useState(false)

  async function handleRecovery(e) {
    e.preventDefault()
    const target = recoveryEmail.trim() || email.trim()
    if (!target) return
    setRecoveryLoading(true)
    try {
      await supabaseStaff.auth.resetPasswordForEmail(target, {
        redirectTo: `${window.location.origin}/auth/callback`,
      })
    } catch (_) {}
    setRecoveryLoading(false)
    setRecoverySent(true)
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    const { data, error } = await signInWithEmail(email, password)
    setLoginLoading(false)
    if (error) {
      setLoginError('Email o contraseña incorrectos.')
      return
    }
    const userId = data?.user?.id || data?.session?.user?.id
    if (userId) {
      const { data: profile } = await supabaseStaff
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      if (profile?.role === 'camarero') {
        navigate('/admin/tomar')
        return
      }
    }
    navigate('/admin')
  }

  async function handleRegister(e) {
    e.preventDefault()
    setRegError('')
    setRegLoading(true)
    const { data, error } = await supabaseStaff.auth.signUp({
      email: regEmail.trim(),
      password: regPassword,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setRegLoading(false)
    if (error) {
      setRegError(error.message)
      return
    }
    if (data.session) {
      navigate('/admin/onboarding')
    } else {
      setRegSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-carbon-950 text-[#3C2A21]">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-20 bg-carbon-950/90 backdrop-blur-sm border-b border-carbon-800">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src="https://ycgptakgpsvmstoftkdk.supabase.co/storage/v1/object/public/icons/icon-512.png"
              alt="Capy"
              className="w-8 h-8 rounded-lg"
            />
            <span className="font-display text-xl tracking-widest text-[#3C2A21]">CAPY</span>
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => scrollTo('login')}
              className="text-xs md:text-sm font-semibold text-smoke-400 px-3 py-2 rounded-xl hover:text-ember-500 transition-colors"
            >
              Entrar
            </button>
            <button
              onClick={() => scrollTo('register')}
              className="bg-ember-500 hover:bg-ember-600 text-white px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-colors"
            >
              Registrarme
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="max-w-4xl mx-auto px-5 md:px-8 pt-12 md:pt-20 lg:pt-28 pb-12 md:pb-16 text-center">
        <span className="inline-block bg-ember-500/10 text-ember-500 text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest">
          Para dueños de locales gastronómicos
        </span>

        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl text-[#3C2A21] mt-5 tracking-wide leading-tight">
          Tu local.<br />
          Tu equipo.<br />
          <span className="text-ember-500">Sin caos.</span>
        </h1>

        <p className="text-sm md:text-lg text-smoke-400 mt-4 md:mt-6 leading-relaxed max-w-xs md:max-w-xl mx-auto">
          CAPY digitaliza el proceso de pedidos de tu local: desde que el cliente escanea el QR de la mesa hasta que paga y se va. Sin papel, sin malentendidos, sin esperas innecesarias.
        </p>

        <div className="mt-7 md:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => scrollTo('register')}
            className="block w-full sm:w-auto bg-ember-500 hover:bg-ember-600 text-white font-bold py-4 px-8 rounded-2xl text-base shadow-ember transition-colors text-center"
          >
            Registrar mi Local
          </button>
          <button
            onClick={() => scrollTo('login')}
            className="block w-full sm:w-auto border border-carbon-700 text-smoke-400 font-semibold py-4 px-8 rounded-2xl text-sm text-center hover:border-carbon-600 transition-colors"
          >
            Ya tengo cuenta
          </button>
        </div>

        <p className="text-[11px] text-smoke-500 mt-4 flex items-center justify-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          Sin descargas · Funciona desde el celular · Sin app
        </p>
      </section>

      {/* ── METRICS ── */}
      <section className="max-w-4xl mx-auto px-5 md:px-8 pb-12 md:pb-16">
        <div className="bg-white border border-carbon-800 rounded-2xl grid grid-cols-3 divide-x divide-carbon-800">
          {METRICS.map(({ num, label }) => (
            <div key={label} className="py-5 md:py-7 text-center">
              <p className="font-display text-2xl md:text-4xl text-ember-500 tracking-wide">{num}</p>
              <p className="text-[10px] md:text-xs text-smoke-500 font-semibold mt-0.5 leading-tight px-2">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SCREENSHOTS ── */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-12 md:pb-16">
        <div className="text-center mb-8 md:mb-10">
          <h2 className="font-display text-3xl md:text-5xl text-[#3C2A21] tracking-wide leading-tight">
            Tu panel, en tiempo real
          </h2>
          <p className="text-sm text-smoke-400 mt-3 max-w-md mx-auto leading-relaxed">
            Kanban de pedidos, mapa del salón y detalle de cada mesa. Todo desde el celular o la tablet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Screenshot 1: Pedidos */}
          <div className="rounded-2xl overflow-hidden border border-carbon-800 shadow-lg">
            <div className="bg-carbon-800 px-4 py-2.5 flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
              </div>
              <span className="text-[11px] text-smoke-500 font-mono ml-2">capyapp.co/admin — Pedidos</span>
            </div>
            <img
              src="/screenshot-pedidos.jpg"
              alt="Panel de pedidos — vista Kanban con columnas Recibido, Preparación y Entregado"
              className="w-full block"
            />
          </div>

          {/* Screenshot 2: Mapa */}
          <div className="rounded-2xl overflow-hidden border border-carbon-800 shadow-lg">
            <div className="bg-carbon-800 px-4 py-2.5 flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
              </div>
              <span className="text-[11px] text-smoke-500 font-mono ml-2">capyapp.co/admin — Mapa</span>
            </div>
            <img
              src="/screenshot-mapa.jpg"
              alt="Vista de mapa del salón con mesas y panel lateral de detalle"
              className="w-full block"
            />
          </div>
        </div>
      </section>

      {/* ── LO QUE VE TU CLIENTE ── */}
      <section className="bg-carbon-900 border-y border-carbon-800 py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">

            {/* Copy */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl bg-ember-500/10 flex items-center justify-center text-ember-500 flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <h2 className="font-display text-3xl md:text-5xl text-[#3C2A21] tracking-wide leading-none">
                  Lo que ve tu cliente
                </h2>
              </div>
              <p className="text-sm text-smoke-400 leading-relaxed mb-8 max-w-sm">
                Desde su celular, sin descargar nada. Solo escanea el QR de la mesa y ya tiene el menú de tu local en la pantalla.
              </p>
              <div className="space-y-4">
                {CLIENT_FEATURES.map((f, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-white border border-carbon-800 flex items-center justify-center text-ember-500 flex-shrink-0">
                      {f.icon}
                    </div>
                    <p className="text-sm font-semibold text-[#3C2A21]">{f.title}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Phone mockup */}
            <div className="flex justify-center md:justify-end">
              <div className="relative">
                <div className="absolute inset-0 -m-8 rounded-full bg-ember-500/10 blur-3xl pointer-events-none" />
                <div
                  className="relative w-[240px] md:w-[270px] rounded-[2.8rem] shadow-2xl"
                  style={{ background: '#111', padding: '10px', boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 32px 64px -16px rgba(0,0,0,0.4)' }}
                >
                  <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-24 h-5 bg-[#111] rounded-b-2xl z-10" />
                  <div className="overflow-hidden bg-white" style={{ borderRadius: '2.2rem', height: '500px' }}>
                    <iframe
                      src="/r/cortadito-cafeteria"
                      title="Menú del local"
                      className="w-full h-full border-0"
                      style={{ pointerEvents: 'none' }}
                    />
                  </div>
                  <div className="flex justify-center pt-2.5 pb-0.5">
                    <div className="w-20 h-1 bg-white/20 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── FEATURES (staff) ── */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-12 md:py-16">

        {/* Staff features */}
        <div>
          <div className="flex items-center gap-3 mb-5 md:mb-6">
            <div className="w-8 h-8 rounded-xl bg-ember-500/10 flex items-center justify-center text-ember-500 flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8m-4-4v4"/>
              </svg>
            </div>
            <h2 className="font-display text-3xl md:text-5xl text-[#3C2A21] tracking-wide leading-none">
              Lo que tiene tu equipo
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {STAFF_FEATURES.map((f, i) => (
              <div key={i} className="bg-white border border-carbon-800 rounded-2xl p-5 flex gap-4 items-start">
                <div className="w-11 h-11 rounded-xl bg-ember-500/10 flex items-center justify-center text-ember-500 flex-shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="font-bold text-[#3C2A21] text-sm md:text-base">{f.title}</p>
                  <p className="text-xs md:text-sm text-smoke-400 mt-1 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-carbon-900 border-y border-carbon-800 py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="text-center mb-8 md:mb-10">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ember-500 mx-auto mb-3">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
              <path d="M12 8v4l3 3"/>
            </svg>
            <h2 className="font-display text-3xl md:text-5xl text-[#3C2A21] tracking-wide leading-tight">
              De cero a tu local digital<br className="hidden md:block" /> en un día
            </h2>
            <p className="text-xs md:text-sm text-smoke-400 mt-3 leading-relaxed max-w-xs md:max-w-lg mx-auto">
              No necesitás saber de tecnología. Si sabés usar WhatsApp, sabés usar Capy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS.map((s) => (
              <div key={s.num} className="bg-white border border-carbon-800 rounded-2xl p-5 md:p-6 flex gap-4 items-start">
                <div className="w-9 h-9 rounded-xl bg-ember-500 flex items-center justify-center text-white flex-shrink-0">
                  <span className="font-display text-xl tracking-wide leading-none">{s.num}</span>
                </div>
                <div>
                  <p className="font-bold text-[#3C2A21] text-sm md:text-base">{s.title}</p>
                  <p className="text-xs md:text-sm text-smoke-400 mt-1 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FORM ── */}
      <footer id="lp-form" className="bg-[#3C2A21] text-white rounded-t-3xl">
        <div className="max-w-2xl mx-auto px-5 md:px-8 pt-12 pb-12 md:pt-16 md:pb-14">

          <div className="text-center mb-8 md:mb-10">
            <img
              src="https://ycgptakgpsvmstoftkdk.supabase.co/storage/v1/object/public/icons/icon-512.png"
              alt="Capy"
              className="w-14 h-14 md:w-16 md:h-16 rounded-2xl mx-auto mb-5 shadow-lg"
            />
            <h2 className="font-display text-4xl md:text-5xl tracking-wide leading-tight">
              Empezá hoy.<br />
              <span className="text-ember-400">Gratis.</span>
            </h2>
            <p className="text-sm text-white/60 mt-3 leading-relaxed max-w-sm mx-auto">
              Registrá tu local o ingresá a tu cuenta para empezar a recibir pedidos.
            </p>
          </div>

          {/* Tab switcher */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">

            {/* Tabs */}
            <div className="relative flex border-b border-white/10">
              {[['register', 'Registrarme'], ['login', 'Ingresar']].map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                    tab === t ? 'text-white' : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  {label}
                </button>
              ))}
              <span
                className={`absolute bottom-0 h-0.5 w-1/2 bg-ember-500 transition-transform duration-200 ${
                  tab === 'login' ? 'translate-x-full' : 'translate-x-0'
                }`}
              />
            </div>

            {/* Form body */}
            <div className="p-5 space-y-3">
              {tab === 'register' ? (
                regSent ? (
                  <div className="bg-ember-500/10 border border-ember-500/30 rounded-xl p-4 text-center">
                    <p className="text-white text-sm font-medium mb-1">Revisá tu email</p>
                    <p className="text-white/60 text-xs">Te mandamos un link para confirmar tu cuenta y continuar.</p>
                  </div>
                ) : (
                  <>
                    <GoogleBtn dark />
                    <Divider dark />
                    <form onSubmit={handleRegister} className="space-y-3">
                      <label className="block">
                        <span className="text-white/50 text-xs mb-1 block">Email</span>
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={e => setRegEmail(e.target.value)}
                          className="w-full bg-white/8 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-ember-500/60 transition-colors"
                        />
                      </label>
                      <label className="block">
                        <span className="text-white/50 text-xs mb-1 block">Contraseña</span>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={regPassword}
                          onChange={e => setRegPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="w-full bg-white/8 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-ember-500/60 transition-colors"
                        />
                      </label>
                      {regError && <p className="text-red-400 text-xs">{regError}</p>}
                      <button
                        type="submit"
                        disabled={regLoading}
                        className="w-full bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-colors"
                      >
                        {regLoading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
                      </button>
                    </form>
                  </>
                )
              ) : (
                <>
                  <GoogleBtn dark />
                  <Divider dark />
                  <form onSubmit={handleLogin} className="space-y-3">
                    <label className="block">
                      <span className="text-white/50 text-xs mb-1 block">Email</span>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-white/8 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-ember-500/60 transition-colors"
                      />
                    </label>
                    <label className="block">
                      <span className="text-white/50 text-xs mb-1 block">Contraseña</span>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-white/8 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-ember-500/60 transition-colors"
                      />
                    </label>
                    {loginError && <p className="text-red-400 text-xs">{loginError}</p>}
                    <button
                      type="submit"
                      disabled={loginLoading}
                      className="w-full border border-white/20 text-white/80 hover:bg-white/5 disabled:opacity-50 font-semibold py-3 rounded-xl text-sm transition-colors"
                    >
                      {loginLoading ? 'Cargando...' : 'Ingresar'}
                    </button>
                  </form>

                  {!showRecovery && (
                    <button
                      type="button"
                      onClick={() => setShowRecovery(true)}
                      className="w-full text-white/40 text-xs underline pt-1 hover:text-white/60 transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                  {showRecovery && (
                    <div className="pt-1">
                      {recoverySent ? (
                        <p className="text-white/50 text-xs text-center">
                          Si el email existe, te mandamos el link de recuperación.
                        </p>
                      ) : (
                        <form onSubmit={handleRecovery} className="space-y-2">
                          {!email.trim() && (
                            <input
                              type="email"
                              required
                              value={recoveryEmail}
                              onChange={e => setRecoveryEmail(e.target.value)}
                              placeholder="Tu email"
                              className="w-full bg-white/8 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-ember-500/60 transition-colors"
                            />
                          )}
                          <button
                            type="submit"
                            disabled={recoveryLoading || (!email.trim() && !recoveryEmail.trim())}
                            className="w-full border border-white/15 text-white/50 text-xs font-medium py-2 rounded-xl disabled:opacity-50 hover:border-white/25 transition-colors"
                          >
                            {recoveryLoading
                              ? 'Enviando...'
                              : `Enviar link a ${email.trim() || recoveryEmail.trim() || 'mi email'}`}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

          </div>

          <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-white/10">
            <a href="mailto:hola@capyapp.co" className="text-white/40 text-[11px] hover:text-white/60 transition-colors">Contacto</a>
            <span className="text-white/20 text-[11px]">·</span>
            <span className="text-white/40 text-[11px]">capyapp.co © 2026</span>
          </div>

        </div>
      </footer>

    </div>
  )
}
