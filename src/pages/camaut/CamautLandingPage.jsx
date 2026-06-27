import { Link } from 'react-router-dom'

export default function CamautLandingPage() {
  return (
    <div className="min-h-screen bg-[#F0F4F8] flex flex-col">

      {/* Header */}
      <div className="px-6 pt-10 pb-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#008080] flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </div>
        <h1 className="font-bold text-[#1A2A3A] text-3xl mb-2">Capy Camarero</h1>
        <p className="text-[#8896A5] text-base max-w-xs mx-auto">
          Tu herramienta profesional para tomar comandas, registrar propinas y construir tu carrera
        </p>
      </div>

      {/* Features */}
      <div className="px-6 space-y-3 mb-8">
        {[
          { icon: '🍽️', title: 'Tomá comandas rápido', desc: 'Carta digital, envío a cocina por WhatsApp' },
          { icon: '⭐', title: 'Acumulá experiencia', desc: 'Sistema de XP, niveles y badges profesionales' },
          { icon: '💰', title: 'Registrá tus propinas', desc: 'Llevá el control de tus ingresos del turno' },
          { icon: '📄', title: 'Tu certificado Capy', desc: 'Acreditá tu experiencia ante cualquier empleador' },
          { icon: '🏆', title: 'Competí en el ranking', desc: 'Medite con otros camareros de tu zona' },
        ].map((f, i) => (
          <div key={i} className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 border border-black/5 shadow-sm">
            <span className="text-2xl">{f.icon}</span>
            <div>
              <p className="font-semibold text-[#1A2A3A] text-sm">{f.title}</p>
              <p className="text-[#8896A5] text-xs">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="px-6 pb-10 mt-auto space-y-3">
        <Link
          to="/camaut/registro"
          className="block w-full bg-[#008080] text-white font-bold text-center py-4 rounded-2xl text-base"
        >
          Crear mi cuenta gratis
        </Link>
        <Link
          to="/camaut/login"
          className="block w-full border border-[#008080] text-[#008080] font-semibold text-center py-3.5 rounded-2xl text-base"
        >
          Ya tengo cuenta
        </Link>
        <p className="text-[#8896A5] text-xs text-center mt-2">
          ¿Tu restaurante ya usa Capy?{' '}
          <Link to="/admin" className="text-[#008080] underline">Entrá por acá</Link>
        </p>
      </div>

    </div>
  )
}
