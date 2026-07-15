import { Link } from 'react-router-dom'

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
]

const CIRCLE = [
  {
    num: '01',
    title: 'Sin chistidos',
    desc: 'El cliente te llama desde el QR de la mesa. Recibís el aviso al instante en tu app.',
  },
  {
    num: '02',
    title: 'Pago express',
    desc: 'Piden la cuenta y pagan con Mercado Pago desde el celular. Menos vueltas, más mesas.',
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
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    num: '2',
    title: 'Cargá tu alias',
    desc: 'Vinculás tu Mercado Pago y los clientes te transfieren las propinas al instante.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </svg>
    ),
  },
  {
    num: '3',
    title: '¡Listo para el turno!',
    desc: 'Ya podés usar la app en extras o vincularte a cualquier local del ecosistema Capy.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="m9 11 3 3L22 4" />
      </svg>
    ),
  },
]

export default function CamautLandingPage() {
  return (
    <div className="min-h-screen bg-carbon-950 text-[#3C2A21]">

      {/* Nav */}
      <nav className="sticky top-0 z-20 bg-carbon-950/90 backdrop-blur-sm border-b border-carbon-800 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="https://ycgptakgpsvmstoftkdk.supabase.co/storage/v1/object/public/icons/icon-512.png"
            alt="Capy"
            className="w-8 h-8 rounded-lg"
          />
          <span className="font-display text-xl tracking-widest text-[#3C2A21]">CAPY</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/camaut/login"
            className="text-xs font-semibold text-smoke-400 px-3 py-2 rounded-xl"
          >
            Entrar
          </Link>
          <Link
            to="/camaut/registro"
            className="bg-ember-500 text-white px-4 py-2 rounded-xl text-xs font-bold"
          >
            Registrarme
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-5 pt-10 pb-12 text-center">
        <span className="inline-block bg-ember-500/10 text-ember-500 text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest">
          Para Camareros Independientes
        </span>

        <h1 className="font-display text-5xl text-[#3C2A21] mt-5 tracking-wide leading-tight">
          Tu talento.<br />Tu reputación.<br />
          <span className="text-ember-500">Tus propinas.</span>
        </h1>

        <p className="text-sm text-smoke-400 mt-4 leading-relaxed max-w-xs mx-auto">
          La herramienta gratuita para cobrar al instante, construir reputación verificada y laburar más tranquilo.
        </p>

        <Link
          to="/camaut/registro"
          className="block w-full mt-7 bg-ember-500 hover:bg-ember-600 text-white font-bold py-4 rounded-2xl text-base shadow-ember transition-colors"
        >
          Crear mi cuenta gratis
        </Link>

        <p className="text-[11px] text-smoke-500 mt-3 flex items-center justify-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          Sin descargas · 100% gratis · Funciona en Chrome y Safari
        </p>
      </section>

      {/* Metrics */}
      <section className="mx-5 mb-10">
        <div className="bg-white border border-carbon-800 rounded-2xl grid grid-cols-3 divide-x divide-carbon-800">
          {[
            { num: '+30%', label: 'Propinas promedio' },
            { num: '100%', label: 'Verificado' },
            { num: 'Gratis', label: 'Para empezar' },
          ].map(({ num, label }) => (
            <div key={label} className="py-4 text-center">
              <p className="font-display text-2xl text-ember-500 tracking-wide">{num}</p>
              <p className="text-[10px] text-smoke-500 font-semibold mt-0.5 leading-tight px-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-5 pb-10">
        <h2 className="font-display text-3xl text-[#3C2A21] tracking-wide mb-5">
          Diseñada para tus turnos
        </h2>
        <div className="space-y-3">
          {FEATURES.map((f, i) => (
            <div key={i} className="bg-white border border-carbon-800 rounded-2xl p-5 flex gap-4 items-start">
              <div className="w-11 h-11 rounded-xl bg-ember-500/10 flex items-center justify-center text-ember-500 flex-shrink-0">
                {f.icon}
              </div>
              <div>
                <p className="font-bold text-[#3C2A21] text-sm">{f.title}</p>
                <p className="text-xs text-smoke-400 mt-1 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* El Círculo Virtuoso */}
      <section className="bg-carbon-900 border-y border-carbon-800 px-5 py-10 mb-0">
        <div className="text-center mb-7">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ember-500 mx-auto mb-3">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="M12 8v4l3 3" />
          </svg>
          <h2 className="font-display text-3xl text-[#3C2A21] tracking-wide leading-tight">
            Paz para el cliente<br />= mejores propinas para vos
          </h2>
          <p className="text-xs text-smoke-400 mt-3 leading-relaxed max-w-xs mx-auto">
            Eliminamos los estresores tradicionales de una mesa para que la experiencia fluya y los clientes lo valoren.
          </p>
        </div>

        <div className="space-y-3">
          {CIRCLE.map((c) => (
            <div key={c.num} className="bg-white/60 border border-carbon-800 rounded-2xl p-5 flex gap-4 items-start">
              <span className="font-display text-2xl text-ember-500 tracking-wide leading-none flex-shrink-0 pt-0.5">{c.num}</span>
              <div>
                <p className="font-bold text-[#3C2A21] text-sm">{c.title}</p>
                <p className="text-xs text-smoke-400 mt-1 leading-relaxed">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PWA Promo */}
      <section className="px-5 py-10">
        <div className="bg-white border-2 border-dashed border-carbon-700 rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-11 h-11 rounded-xl bg-ember-500/10 flex items-center justify-center text-ember-500 flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <path d="M12 18h.01" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-[#3C2A21] text-sm">Sin ocupar espacio en tu celu</p>
              <p className="text-xs text-smoke-400 mt-1 leading-relaxed">
                Capy es una web app. No se descarga de ninguna tienda. Abrila en Chrome o Safari y guardala como acceso directo en tu pantalla de inicio.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { icon: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />, label: 'Abrila en tu navegador' },
              { icon: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" /></>, label: 'Tocá "Agregar a inicio"' },
              { icon: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />, label: 'Lista en tu pantalla' },
            ].map(({ icon, label }, i) => (
              <div key={i} className="bg-carbon-950 rounded-xl px-4 py-2.5 flex items-center gap-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ember-500 flex-shrink-0">
                  {icon}
                </svg>
                <p className="text-xs font-semibold text-[#3C2A21]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="px-5 pb-10">
        <h2 className="font-display text-3xl text-[#3C2A21] tracking-wide mb-5">
          Empezá en 3 pasos
        </h2>
        <div className="space-y-3">
          {STEPS.map((s, i) => (
            <div key={i} className="bg-white border border-carbon-800 rounded-2xl p-5 flex gap-4 items-start">
              <div className="w-9 h-9 rounded-xl bg-ember-500 flex items-center justify-center text-white flex-shrink-0">
                <span className="font-display text-xl tracking-wide leading-none">{s.num}</span>
              </div>
              <div>
                <p className="font-bold text-[#3C2A21] text-sm">{s.title}</p>
                <p className="text-xs text-smoke-400 mt-1 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="bg-[#3C2A21] text-white px-5 pt-10 pb-12 rounded-t-3xl">
        <img
          src="https://ycgptakgpsvmstoftkdk.supabase.co/storage/v1/object/public/icons/icon-512.png"
          alt="Capy"
          className="w-14 h-14 rounded-2xl mx-auto mb-5 shadow-lg"
        />
        <h2 className="font-display text-4xl tracking-wide text-center leading-tight">
          Hacé tus turnos<br />más ágiles y tranquilos
        </h2>
        <p className="text-sm text-white/60 text-center mt-3 leading-relaxed max-w-xs mx-auto">
          Sumate gratis a la plataforma que cuida tu experiencia de trabajo.
        </p>

        <Link
          to="/camaut/registro"
          className="block w-full mt-7 bg-ember-500 hover:bg-ember-600 text-white font-bold py-4 rounded-2xl text-base text-center transition-colors"
        >
          Crear mi cuenta gratis
        </Link>
        <Link
          to="/camaut/login"
          className="block w-full mt-3 border border-white/20 text-white/70 font-semibold py-3.5 rounded-2xl text-sm text-center"
        >
          Ya tengo cuenta
        </Link>

        <p className="text-white/40 text-[11px] text-center mt-6">
          ¿Tu restaurante ya usa Capy?{' '}
          <Link to="/admin" className="text-ember-400 underline">Entrá por acá</Link>
        </p>

        <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-white/10">
          <Link to="/privacidad" className="text-white/40 text-[11px] hover:text-white/60">Privacidad</Link>
          <span className="text-white/20 text-[11px]">·</span>
          <Link to="/terminos" className="text-white/40 text-[11px] hover:text-white/60">Términos</Link>
          <span className="text-white/20 text-[11px]">·</span>
          <a href="mailto:hola@capyapp.co" className="text-white/40 text-[11px] hover:text-white/60">Contacto</a>
        </div>
      </footer>

    </div>
  )
}
