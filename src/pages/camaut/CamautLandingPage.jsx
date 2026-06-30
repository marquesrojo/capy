import { Link } from 'react-router-dom'

const FEATURES = [
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    title: 'Tomá comandas rápido',
    desc: 'Carta digital, envío a cocina por WhatsApp'
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
    title: 'Acumulá experiencia',
    desc: 'Sistema de XP, niveles y badges profesionales'
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h2M10 15h4"/></svg>,
    title: 'Registrá tus propinas',
    desc: 'Llevá el control de tus ingresos del turno'
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></svg>,
    title: 'Tu certificado Capy',
    desc: 'Acreditá tu experiencia ante cualquier empleador'
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>,
    title: 'Competí en el ranking',
    desc: 'Medite con otros camareros de tu zona'
  },
]

export default function CamautLandingPage() {
  return (
    <div className="min-h-screen bg-carbon-950 flex flex-col">

      {/* Header */}
      <div className="px-6 pt-12 pb-8 text-center">
        <img
          src="https://ycgptakgpsvmstoftkdk.supabase.co/storage/v1/object/public/icons/icon-512.png"
          alt="Capy"
          className="w-20 h-20 mx-auto mb-4 rounded-2xl"
        />
        <p className="font-display text-4xl text-ember-500 tracking-wide">CAPY</p>
        <p className="text-smoke-400 text-sm font-medium tracking-widest uppercase mt-1 mb-4">Camarero</p>
        <p className="text-smoke-400 text-base max-w-xs mx-auto leading-relaxed">
          Tu herramienta profesional para tomar comandas, registrar propinas y construir tu carrera
        </p>
      </div>

      {/* Features */}
      <div className="px-5 space-y-2 mb-8">
        {FEATURES.map((f, i) => (
          <div key={i} className="bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-3.5 flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-ember-500/10 border border-ember-500/20 flex items-center justify-center text-ember-500 flex-shrink-0">
              {f.icon}
            </div>
            <div>
              <p className="font-semibold text-smoke-200 text-sm">{f.title}</p>
              <p className="text-smoke-500 text-xs mt-0.5">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="px-5 pb-10 mt-auto space-y-3">
        <Link
          to="/camaut/registro"
          className="block w-full bg-ember-500 hover:bg-ember-600 text-white font-bold text-center py-4 rounded-2xl text-base"
        >
          Crear mi cuenta gratis
        </Link>
        <Link
          to="/camaut/login"
          className="block w-full border border-carbon-700 text-smoke-300 font-semibold text-center py-3.5 rounded-2xl text-base"
        >
          Ya tengo cuenta
        </Link>
        <p className="text-smoke-600 text-xs text-center mt-2">
          ¿Tu restaurante ya usa Capy?{' '}
          <Link to="/admin" className="text-ember-500 underline">Entrá por acá</Link>
        </p>
        <div className="flex items-center justify-center gap-3 mt-4">
          <Link to="/privacidad" className="text-smoke-700 text-[11px] hover:text-smoke-500">Privacidad</Link>
          <span className="text-smoke-800 text-[11px]">·</span>
          <Link to="/terminos" className="text-smoke-700 text-[11px] hover:text-smoke-500">Términos</Link>
          <span className="text-smoke-800 text-[11px]">·</span>
          <a href="mailto:hola@capyapp.co" className="text-smoke-700 text-[11px] hover:text-smoke-500">Contacto</a>
        </div>
      </div>

    </div>
  )
}
