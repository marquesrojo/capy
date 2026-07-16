import { Link } from 'react-router-dom'
import { useEffect } from 'react'

const OWNER_FEATURES = [
  'Menú digital con fotos y QR',
  'Pedidos directo a cocina',
  'Mapa del salón en tiempo real',
  'Pagos integrados',
  'Gratis para empezar',
]

const WAITER_FEATURES = [
  'Kanban de pedidos en tiempo real',
  'Alertas por WhatsApp',
  'Historial de mesas y comandas',
  'Vista de cocina optimizada',
  'Tu perfil profesional',
]

const CLIENT_STEPS = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/>
        <rect x="3" y="16" width="5" height="5" rx="1"/>
        <path d="M21 16h-3v3"/><path d="M18 21v-2"/><path d="M16 18h2"/>
      </svg>
    ),
    label: 'Escanea el QR de la mesa',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    ),
    label: 'Ve el menú con fotos',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
      </svg>
    ),
    label: 'Pide sin esperar al mozo',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
    label: 'Paga cuando quiere',
  },
]

function CheckItem({ label }) {
  return (
    <li className="flex items-center gap-2.5 text-sm text-smoke-400">
      <span className="w-4 h-4 rounded-full bg-ember-500/10 flex items-center justify-center flex-shrink-0">
        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ember-500">
          <polyline points="2 6 5 9 10 3"/>
        </svg>
      </span>
      {label}
    </li>
  )
}

function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
    </svg>
  )
}

export default function HubPage() {
  // Supabase email confirmation puede caer en /# con el token en el hash
  useEffect(() => {
    const hash = window.location.hash
    if (hash && (hash.includes('access_token') || hash.includes('error'))) {
      window.location.href = '/auth/callback' + hash
    }
  }, [])

  return (
    <div className="min-h-screen bg-carbon-950 text-[#3C2A21]">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-20 bg-carbon-950/90 backdrop-blur-sm border-b border-carbon-800">
        <div className="max-w-5xl mx-auto px-5 md:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="https://ycgptakgpsvmstoftkdk.supabase.co/storage/v1/object/public/icons/icon-512.png"
              alt="Capy"
              className="w-8 h-8 rounded-lg"
            />
            <span className="font-display text-xl tracking-widest text-[#3C2A21]">CAPY</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <Link
              to="/camaut"
              className="text-xs md:text-sm font-semibold text-smoke-400 px-3 py-2 rounded-xl hover:text-ember-500 transition-colors"
            >
              Soy camarero
            </Link>
            <Link
              to="/admin/login"
              className="bg-ember-500 hover:bg-ember-600 text-white px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-colors"
            >
              Mi local
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 pt-14 md:pt-20 lg:pt-28 pb-10 md:pb-14 text-center">
        <span className="inline-block bg-ember-500/10 text-ember-500 text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest">
          Plataforma gastronómica
        </span>
        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl text-[#3C2A21] mt-5 tracking-wide leading-tight" style={{ textWrap: 'balance' }}>
          El sistema para tu local.
          {' '}La app para{' '}
          <span className="text-ember-500">tu equipo.</span>
        </h1>
        <p className="text-sm md:text-lg text-smoke-400 mt-4 md:mt-6 leading-relaxed max-w-xs md:max-w-lg mx-auto">
          Capy digitaliza los pedidos de tu restaurante y le da a cada camarero su herramienta profesional — todo en tiempo real, desde el celular.
        </p>
        <p className="text-[11px] text-smoke-500 mt-5 flex items-center justify-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          Sin descargas · Funciona desde el celular
        </p>
      </section>

      {/* ── LO QUE VE TU CLIENTE ── */}
      <section className="bg-carbon-900 border-y border-carbon-800 py-14 md:py-20">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">

            {/* Copy */}
            <div>
              <span className="inline-block bg-ember-500/10 text-ember-500 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-4">
                La experiencia del cliente
              </span>
              <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-[#3C2A21] tracking-wide leading-tight mb-4">
                Lo que ve tu cliente
              </h2>
              <p className="text-sm md:text-base text-smoke-400 leading-relaxed mb-8 max-w-sm">
                Desde su celular, sin descargar nada. Solo escanea el QR de la mesa y ya tiene el menú de tu local en la pantalla.
              </p>

              <div className="space-y-4">
                {CLIENT_STEPS.map((s, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-white border border-carbon-800 flex items-center justify-center text-ember-500 flex-shrink-0">
                      {s.icon}
                    </div>
                    <p className="text-sm font-semibold text-[#3C2A21]">{s.label}</p>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-smoke-500 mt-8 leading-relaxed">
                Ejemplo real: <span className="text-smoke-400 font-medium">Cortadito Cafetería</span> — uno de los locales que ya usa Capy.
              </p>
            </div>

            {/* Phone mockup */}
            <div className="flex justify-center md:justify-end">
              <div className="relative">
                {/* Glow */}
                <div className="absolute inset-0 -m-8 rounded-full bg-ember-500/10 blur-3xl pointer-events-none" />

                {/* Phone frame */}
                <div
                  className="relative w-[260px] md:w-[290px] rounded-[2.8rem] shadow-2xl"
                  style={{ background: '#111', padding: '10px', boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 32px 64px -16px rgba(0,0,0,0.5)' }}
                >
                  {/* Notch */}
                  <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-24 h-5 bg-[#111] rounded-b-2xl z-10" />

                  {/* Screen */}
                  <div
                    className="overflow-hidden bg-white"
                    style={{ borderRadius: '2.2rem', height: '540px' }}
                  >
                    <iframe
                      src="/r/cortadito-cafeteria"
                      title="Menú Cortadito Cafetería"
                      className="w-full h-full border-0"
                      style={{ pointerEvents: 'none' }}
                    />
                  </div>

                  {/* Home indicator */}
                  <div className="flex justify-center pt-2.5 pb-0.5">
                    <div className="w-20 h-1 bg-white/20 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── DOS CAMINOS ── */}
      <section className="max-w-4xl mx-auto px-5 md:px-8 py-14 md:py-20">
        <div className="text-center mb-8 md:mb-10">
          <h2 className="font-display text-3xl md:text-5xl text-[#3C2A21] tracking-wide leading-tight">
            ¿Cuál es tu camino?
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

          {/* Local */}
          <Link
            to="/admin/login"
            className="group bg-white border border-carbon-800 rounded-3xl p-6 md:p-8 flex flex-col hover:border-ember-400/50 hover:shadow-ember transition-all duration-200"
          >
            <div className="w-12 h-12 rounded-2xl bg-ember-500/10 flex items-center justify-center text-ember-500 mb-5 flex-shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-ember-500 mb-2">Para dueños</p>
            <h2 className="font-display text-3xl md:text-4xl text-[#3C2A21] tracking-wide leading-tight mb-3">
              Registrá tu local
            </h2>
            <p className="text-sm text-smoke-400 leading-relaxed">
              Menú digital con QR, pedidos en tiempo real, kanban de cocina y pagos integrados. Todo desde el celular.
            </p>
            <ul className="mt-5 space-y-2.5 flex-1">
              {OWNER_FEATURES.map(f => <CheckItem key={f} label={f} />)}
            </ul>
            <div className="mt-7 flex items-center gap-1.5 text-ember-500 font-bold text-sm group-hover:gap-2.5 transition-all duration-200">
              Empezar gratis <ArrowRight />
            </div>
          </Link>

          {/* Camaut */}
          <Link
            to="/camaut"
            className="group bg-white border border-carbon-800 rounded-3xl p-6 md:p-8 flex flex-col hover:border-ember-400/50 hover:shadow-ember transition-all duration-200"
          >
            <div className="w-12 h-12 rounded-2xl bg-ember-500/10 flex items-center justify-center text-ember-500 mb-5 flex-shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-ember-500 mb-2">Para camareros</p>
            <h2 className="font-display text-3xl md:text-4xl text-[#3C2A21] tracking-wide leading-tight mb-3">
              Camaut
            </h2>
            <p className="text-sm text-smoke-400 leading-relaxed">
              Tu herramienta profesional como camarero. Gestioná pedidos, seguí mesas y recibí alertas — todo en tu celular, en tiempo real.
            </p>
            <ul className="mt-5 space-y-2.5 flex-1">
              {WAITER_FEATURES.map(f => <CheckItem key={f} label={f} />)}
            </ul>
            <div className="mt-7 flex items-center gap-1.5 text-ember-500 font-bold text-sm group-hover:gap-2.5 transition-all duration-200">
              Conocer Camaut <ArrowRight />
            </div>
          </Link>

        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#3C2A21] text-white rounded-t-3xl">
        <div className="max-w-5xl mx-auto px-5 md:px-8 py-8 md:py-10 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <img
              src="https://ycgptakgpsvmstoftkdk.supabase.co/storage/v1/object/public/icons/icon-512.png"
              alt="Capy"
              className="w-8 h-8 rounded-lg"
            />
            <span className="font-display text-xl tracking-widest">CAPY</span>
          </div>
          <div className="flex items-center gap-4 md:gap-6 flex-wrap justify-center">
            <Link to="/admin/login" className="text-white/60 text-xs hover:text-white/90 transition-colors">Para locales</Link>
            <Link to="/camaut" className="text-white/60 text-xs hover:text-white/90 transition-colors">Camaut</Link>
            <Link to="/privacidad" className="text-white/60 text-xs hover:text-white/90 transition-colors">Privacidad</Link>
            <Link to="/terminos" className="text-white/60 text-xs hover:text-white/90 transition-colors">Términos</Link>
            <a href="mailto:hola@capyapp.co" className="text-white/60 text-xs hover:text-white/90 transition-colors">Contacto</a>
          </div>
          <span className="text-white/30 text-[11px]">capyapp.co © 2026</span>
        </div>
      </footer>

    </div>
  )
}
