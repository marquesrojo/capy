import { Link } from 'react-router-dom'
import LeadChat from '../../components/LeadChat'

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v2m0 8v2M9.5 9A3 3 0 0 1 12 8a3 3 0 0 1 0 6 3 3 0 0 0 0 2c1.5 0 2.5-.5 3-2" />
      </svg>
    ),
    title: 'Propinas al instante',
    desc: 'Cobrá directo a tu alias de Mercado Pago mesa por mesa. Sin perseguir efectivo ni esperar el cierre del turno.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    title: 'Reputación verificada',
    desc: 'Cada turno suma a tu certificado digital. Mostralo en una entrevista como prueba real de tu experiencia.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
    title: 'Vinculado al local',
    desc: 'Si el restaurante usa Capy, te asociás escaneando un QR. Tu app se conecta a las mesas asignadas en segundos.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        <path d="M12 6v4"/><path d="M10 8h4"/>
        <path d="M16 13l1-1 1 1-1 1z"/>
      </svg>
    ),
    title: 'Tu carta, con IA',
    desc: 'Cargá tu propia carta con ayuda de inteligencia artificial. No dependés de que el local use Capy para tener tu menú listo y tomar pedidos.',
  },
]

const CIRCLE = [
  {
    num: '01',
    title: 'Sin señas',
    desc: 'El cliente te llama desde el QR de la mesa. Recibís el aviso al instante en tu app.',
  },
  {
    num: '02',
    title: 'Clientes más tranquilos',
    desc: 'Ven el menú, siguen su pedido y pagan cuando quieren. Menos preguntas, menos apuros, más satisfacción en cada mesa.',
  },
  {
    num: '03',
    title: 'Propina privada',
    desc: 'El sistema ofrece la propina de manera fluida y discreta. Directo a tu alias, sin efectivo ni vergüenza.',
  },
]

const STEPS = [
  {
    num: '1',
    title: 'Registrate gratis',
    desc: 'Creás tu perfil en segundos con tu cuenta de Google. Sin formularios largos.',
  },
  {
    num: '2',
    title: 'Cargá tu alias',
    desc: 'Vinculás tu Mercado Pago y los clientes te transfieren las propinas al instante.',
  },
  {
    num: '3',
    title: '¡Listo para el turno!',
    desc: 'Ya podés usar la app en extras o vincularte a cualquier local del ecosistema Capy.',
  },
]

const METRICS = [
  { num: '+30%', label: 'Propinas promedio' },
  { num: '100%', label: 'Historial verificado' },
  { num: 'Gratis', label: 'Para empezar' },
]

export default function CamautLandingPage() {
  return (
    <div className="min-h-screen bg-carbon-950 text-[#3C2A21]">

      {/* Nav */}
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
          <div className="flex items-center gap-2 md:gap-4">
            <Link
              to="/camareroa/login"
              className="text-xs md:text-sm font-semibold text-smoke-400 px-3 py-2 rounded-xl hover:text-ember-500 transition-colors"
            >
              Entrar
            </Link>
            <Link
              to="/camareroa/registro"
              className="bg-ember-500 hover:bg-ember-600 text-white px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-colors"
            >
              Registrarme
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-5 md:px-8 pt-12 md:pt-20 lg:pt-28 pb-12 md:pb-16 text-center">
        <span className="inline-block bg-ember-500/10 text-ember-500 text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest">
          Para Camareros Independientes y Extras
        </span>

        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl text-[#3C2A21] mt-5 tracking-wide leading-tight">
          Tu talento.<br />Tu reputación.<br />
          <span className="text-ember-500">Tus propinas.</span>
        </h1>

        <p className="text-sm md:text-lg text-smoke-400 mt-4 md:mt-6 leading-relaxed max-w-xs md:max-w-xl mx-auto">
          La herramienta gratuita para cobrar al instante, construir reputación verificada y laburar más tranquilo en cada turno.
        </p>

        <div className="mt-7 md:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/camareroa/registro"
            className="block w-full sm:w-auto bg-ember-500 hover:bg-ember-600 text-white font-bold py-4 px-8 rounded-2xl text-base shadow-ember transition-colors text-center"
          >
            Crear mi cuenta gratis
          </Link>
          <Link
            to="/camareroa/login"
            className="block w-full sm:w-auto border border-carbon-700 text-smoke-400 font-semibold py-4 px-8 rounded-2xl text-sm text-center hover:border-carbon-600 transition-colors"
          >
            Ya tengo cuenta
          </Link>
        </div>

        <p className="text-[11px] text-smoke-500 mt-4 flex items-center justify-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          Sin descargas · 100% gratis · Funciona en Chrome y Safari
        </p>
      </section>

      {/* Metrics */}
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

      {/* App screenshots */}
      <section className="pb-12 md:pb-16">
        <div className="max-w-6xl mx-auto px-5 md:px-8 mb-5 md:mb-7">
          <p className="text-[10px] font-bold uppercase tracking-widest text-smoke-500 mb-1">La app en acción</p>
          <h2 className="font-display text-3xl md:text-5xl text-[#3C2A21] tracking-wide leading-tight">
            Así se ve en tu celular
          </h2>
        </div>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 px-5 md:px-8" style={{ width: 'max-content' }}>
            {[
              { src: '/camaut-comanda.png', label: 'Comanda' },
              { src: '/camaut-pedidos.png', label: 'Pedidos' },
              { src: '/camaut-mapa.png',    label: 'Mapa del salón' },
              { src: '/camaut-voz.png',     label: 'Pedido por voz IA' },
              { src: '/camaut-perfil.png',  label: 'Mi Capy' },
            ].map(({ src, label }) => (
              <div key={src} className="flex-shrink-0 flex flex-col items-center gap-2">
                <div className="w-[180px] md:w-[210px] rounded-[2rem] overflow-hidden border border-carbon-800 shadow-lg bg-white">
                  <img src={src} alt={label} className="w-full block" />
                </div>
                <span className="text-xs text-smoke-500 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-12 md:pb-16">
        <h2 className="font-display text-3xl md:text-5xl text-[#3C2A21] tracking-wide mb-5 md:mb-8">
          Diseñada para tus turnos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div key={i} className="bg-white border border-carbon-800 rounded-2xl p-5 md:p-6 flex gap-4 items-start">
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
      </section>

      {/* El Círculo Virtuoso */}
      <section className="bg-carbon-900 border-y border-carbon-800 py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="text-center mb-8 md:mb-10">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ember-500 mx-auto mb-3">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <path d="M12 8v4l3 3" />
            </svg>
            <h2 className="font-display text-3xl md:text-5xl text-[#3C2A21] tracking-wide leading-tight">
              Paz para el cliente<br />= mejores propinas para vos
            </h2>
            <p className="text-xs md:text-sm text-smoke-400 mt-3 leading-relaxed max-w-xs md:max-w-lg mx-auto">
              Eliminamos los estresores tradicionales de una mesa para que la experiencia fluya y los clientes lo valoren.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CIRCLE.map((c) => (
              <div key={c.num} className="bg-white/60 border border-carbon-800 rounded-2xl p-5 md:p-6">
                <span className="font-display text-3xl md:text-4xl text-ember-500 tracking-wide leading-none block mb-3">{c.num}</span>
                <p className="font-bold text-[#3C2A21] text-sm md:text-base">{c.title}</p>
                <p className="text-xs md:text-sm text-smoke-400 mt-1.5 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lo que ve el cliente */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-smoke-500 mb-2">Desde el celular del cliente</p>
            <h2 className="font-display text-3xl md:text-5xl text-[#3C2A21] tracking-wide leading-tight mb-4">
              Lo que ve<br />en su mesa
            </h2>
            <p className="text-sm text-smoke-400 leading-relaxed max-w-sm mb-6">
              Sin tener que llamarte, el cliente sigue su pedido, elige propina y paga — todo desde el QR de la mesa. Vos lo recibís directo en tu Mercado Pago.
            </p>
            <ul className="space-y-2.5">
              {[
                'Estado del pedido en tiempo real',
                'Propina sugerida con porcentajes',
                'Transferencia directo a tu alias',
                'División de la cuenta entre comensales',
                'Calificación de la experiencia al final',
              ].map(item => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-smoke-400">
                  <span className="w-4 h-4 rounded-full bg-ember-500/10 flex items-center justify-center flex-shrink-0">
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ember-500">
                      <polyline points="2 6 5 9 10 3"/>
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-center md:justify-end gap-4">
            {[
              { src: '/cliente-propina.png', label: 'Pedido y propina' },
              { src: '/cliente-pago.png',    label: 'Pago y calificación' },
            ].map(({ src, label }) => (
              <div key={src} className="flex flex-col items-center gap-2">
                <div className="w-[155px] md:w-[175px] rounded-[2rem] overflow-hidden border border-carbon-800 shadow-lg bg-white">
                  <img src={src} alt={label} className="w-full block" />
                </div>
                <span className="text-xs text-smoke-500 font-medium">{label}</span>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* PWA Promo */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-12 md:py-16">
        <div className="bg-white border-2 border-dashed border-carbon-700 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center md:gap-12">
          <div className="md:flex-1 mb-5 md:mb-0">
            <div className="w-11 h-11 rounded-xl bg-ember-500/10 flex items-center justify-center text-ember-500 mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <path d="M12 18h.01" />
              </svg>
            </div>
            <p className="font-bold text-[#3C2A21] text-base md:text-xl mb-2">Sin ocupar espacio en tu celu</p>
            <p className="text-xs md:text-sm text-smoke-400 leading-relaxed">
              Capy es una web app. No se descarga de ninguna tienda. Abrila en Chrome o Safari y guardala como acceso directo en tu pantalla de inicio.
            </p>
          </div>
          <div className="md:flex-1 space-y-2">
            {[
              { label: 'Abrila en tu navegador', icon: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /> },
              { label: 'Tocá "Agregar a inicio"', icon: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/></> },
              { label: 'Lista en tu pantalla de inicio', icon: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /> },
            ].map(({ label, icon }, i) => (
              <div key={i} className="bg-carbon-950 rounded-xl px-4 py-3 flex items-center gap-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ember-500 flex-shrink-0">
                  {icon}
                </svg>
                <p className="text-xs md:text-sm font-semibold text-[#3C2A21]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-12 md:pb-16">
        <h2 className="font-display text-3xl md:text-5xl text-[#3C2A21] tracking-wide mb-5 md:mb-8">
          Empezá en 3 pasos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STEPS.map((s, i) => (
            <div key={i} className="bg-white border border-carbon-800 rounded-2xl p-5 md:p-6 flex gap-4 items-start">
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
      </section>

      {/* Footer CTA */}
      <footer className="bg-[#3C2A21] text-white rounded-t-3xl">
        <div className="max-w-2xl mx-auto px-5 md:px-8 pt-12 pb-12 md:pt-16 md:pb-14 text-center">
          <img
            src="https://ycgptakgpsvmstoftkdk.supabase.co/storage/v1/object/public/icons/icon-512.png"
            alt="Capy"
            className="w-14 h-14 md:w-16 md:h-16 rounded-2xl mx-auto mb-6 shadow-lg"
          />
          <h2 className="font-display text-4xl md:text-5xl tracking-wide leading-tight">
            Hacé tus turnos<br />más ágiles y tranquilos
          </h2>
          <p className="text-sm text-white/60 mt-4 leading-relaxed max-w-sm mx-auto">
            Sumate gratis a la plataforma que cuida tu experiencia de trabajo y valora tu reputación.
          </p>

          <div className="mt-8 space-y-3">
            <Link
              to="/camareroa/registro"
              className="block w-full bg-ember-500 hover:bg-ember-600 text-white font-bold py-4 rounded-2xl text-base text-center transition-colors"
            >
              Crear mi cuenta gratis
            </Link>
            <Link
              to="/camareroa/login"
              className="block w-full border border-white/20 text-white/70 font-semibold py-3.5 rounded-2xl text-sm text-center hover:border-white/40 transition-colors"
            >
              Ya tengo cuenta
            </Link>
          </div>

          <p className="text-white/40 text-[11px] mt-6">
            ¿Tu restaurante ya usa Capy?{' '}
            <Link to="/admin" className="text-ember-400 underline">Entrá por acá</Link>
          </p>

          <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-white/10">
            <Link to="/privacidad" className="text-white/40 text-[11px] hover:text-white/60 transition-colors">Privacidad</Link>
            <span className="text-white/20 text-[11px]">·</span>
            <Link to="/terminos" className="text-white/40 text-[11px] hover:text-white/60 transition-colors">Términos</Link>
            <span className="text-white/20 text-[11px]">·</span>
            <a href="mailto:hola@capyapp.co" className="text-white/40 text-[11px] hover:text-white/60 transition-colors">Contacto</a>
          </div>
        </div>
      </footer>

      <LeadChat page="camareroa" />
    </div>
  )
}
