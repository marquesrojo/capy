import { Link } from 'react-router-dom'

const VALUE_BLOCKS = [
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    title: 'Más propinas, sin esfuerzo extra',
    desc: 'Cobrá por Mercado Pago o alias al instante, mesa por mesa, sin perseguir efectivo ni esperar el cierre de turno.'
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13l2 2 4-4"/></svg>,
    title: 'Reputación que te abre puertas',
    desc: 'Cada turno suma a tu certificado verificado. Mostralo en una entrevista como prueba real de tu experiencia.'
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>,
    title: 'Sabé dónde estás parado',
    desc: 'Comparate con otros camareros de tu zona: velocidad, propinas y nivel. Subí de ranking turno a turno.'
  }
]

export default function CamautLandingPage() {
  return (
    <div className="min-h-screen bg-carbon-950 flex flex-col relative overflow-hidden">

      {/* Glow cálido de fondo */}
      <div className="pointer-events-none absolute -top-20 -left-20 w-80 h-80 rounded-full bg-ember-400/15 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -right-24 w-72 h-72 rounded-full bg-ember-600/10 blur-3xl" />

      {/* Header */}
      <div className="px-6 pt-12 pb-8 text-center relative">
        <img
          src="https://ycgptakgpsvmstoftkdk.supabase.co/storage/v1/object/public/icons/icon-512.png"
          alt="Capy"
          className="w-16 h-16 mx-auto mb-4 rounded-2xl shadow-ember"
        />
        <p className="text-smoke-500 text-xs font-semibold tracking-widest uppercase mb-2">Para camareros</p>
        <h1 className="font-display text-3xl text-smoke-300 tracking-wide leading-tight">
          Construí tu carrera<br />en gastronomía
        </h1>
        <p className="text-smoke-500 text-sm max-w-xs mx-auto leading-relaxed mt-3">
          La app que te ayuda a cobrar mejores propinas, construir reputación y demostrar tu experiencia.
        </p>
      </div>

      {/* Social proof */}
      <div className="px-6 mb-8">
        <div className="bg-ember-500/10 border border-ember-500/20 rounded-2xl px-4 py-3 flex items-center justify-around text-center">
          <div>
            <p className="font-display text-xl text-ember-600">+30%</p>
            <p className="text-smoke-500 text-[10px] uppercase tracking-wide mt-0.5">Propinas promedio</p>
          </div>
          <div className="w-px h-8 bg-ember-500/20" />
          <div>
            <p className="font-display text-xl text-ember-600">100%</p>
            <p className="text-smoke-500 text-[10px] uppercase tracking-wide mt-0.5">Verificado</p>
          </div>
          <div className="w-px h-8 bg-ember-500/20" />
          <div>
            <p className="font-display text-xl text-ember-600">Gratis</p>
            <p className="text-smoke-500 text-[10px] uppercase tracking-wide mt-0.5">Para empezar</p>
          </div>
        </div>
      </div>

      {/* Value blocks */}
      <div className="px-5 space-y-3 mb-8">
        {VALUE_BLOCKS.map((b, i) => (
          <div key={i} className="bg-carbon-900/70 border border-carbon-700 rounded-2xl px-4 py-4 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-ember-500/10 border border-ember-500/20 flex items-center justify-center text-ember-600 flex-shrink-0">
              {b.icon}
            </div>
            <div>
              <p className="font-semibold text-smoke-300 text-sm">{b.title}</p>
              <p className="text-smoke-500 text-xs mt-1 leading-relaxed">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="px-5 pb-10 mt-auto space-y-3 relative">
        <Link
          to="/camaut/registro"
          className="block w-full bg-ember-500 hover:bg-ember-600 text-white font-bold text-center py-4 rounded-2xl text-base shadow-ember"
        >
          Crear mi cuenta gratis
        </Link>
        <Link
          to="/camaut/login"
          className="block w-full border border-carbon-700 text-smoke-400 font-semibold text-center py-3.5 rounded-2xl text-base"
        >
          Ya tengo cuenta
        </Link>
        <p className="text-smoke-600 text-xs text-center mt-2">
          ¿Tu restaurante ya usa Capy?{' '}
          <Link to="/admin" className="text-ember-600 underline">Entrá por acá</Link>
        </p>
        <div className="flex items-center justify-center gap-3 mt-4">
          <Link to="/privacidad" className="text-smoke-600 text-[11px] hover:text-smoke-500">Privacidad</Link>
          <span className="text-smoke-700 text-[11px]">·</span>
          <Link to="/terminos" className="text-smoke-600 text-[11px] hover:text-smoke-500">Términos</Link>
          <span className="text-smoke-700 text-[11px]">·</span>
          <a href="mailto:hola@capyapp.co" className="text-smoke-600 text-[11px] hover:text-smoke-500">Contacto</a>
        </div>
      </div>

    </div>
  )
}
