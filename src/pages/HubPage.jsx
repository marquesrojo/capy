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
              to="/camareroa"
              className="text-xs md:text-sm font-semibold text-smoke-400 px-3 py-2 rounded-xl hover:text-ember-500 transition-colors"
            >
              Soy camarero/a
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
        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl text-[#3C2A21] mt-5 tracking-wide leading-tight">
          Para el local.<br />
          Para el equipo.<br />
          <span className="text-ember-500">Para el cliente.</span>
        </h1>
        <p className="text-sm md:text-lg text-smoke-400 mt-4 md:mt-6 leading-relaxed max-w-xs md:max-w-lg mx-auto">
          Capy conecta las tres partes de tu local: el dueño gestiona todo desde el panel, el camarero/a recibe pedidos en tiempo real, y el cliente pide desde su celular sin descargar nada.
        </p>
        <p className="text-[11px] text-smoke-500 mt-5 flex items-center justify-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          Sin descargas · Funciona desde el celular
        </p>
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
            to="/camareroa"
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
              Capy Camarero/a
            </h2>
            <p className="text-sm text-smoke-400 leading-relaxed">
              Tu herramienta profesional como camarero. Gestioná pedidos, seguí mesas y recibí alertas — todo en tu celular, en tiempo real.
            </p>
            <ul className="mt-5 space-y-2.5 flex-1">
              {WAITER_FEATURES.map(f => <CheckItem key={f} label={f} />)}
            </ul>
            <div className="mt-7 flex items-center gap-1.5 text-ember-500 font-bold text-sm group-hover:gap-2.5 transition-all duration-200">
              Conocer Capy Camarero/a <ArrowRight />
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
            <Link to="/camareroa" className="text-white/60 text-xs hover:text-white/90 transition-colors">Capy Camarero/a</Link>
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
