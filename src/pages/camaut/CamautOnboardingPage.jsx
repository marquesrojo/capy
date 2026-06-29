import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseCamaut, supabaseStaff } from '../../lib/supabase'

export default function CamautOnboardingPage({ staffName: initialName, venueId, onComplete }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [fullName, setFullName] = useState(initialName || '')
  const [saving, setSaving] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [linkedVenue, setLinkedVenue] = useState(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [aliasBancario, setAliasBancario] = useState('')

  async function saveNombre() {
    if (!fullName.trim()) return
    setSaving(true)
    const { data: { user } } = await supabaseCamaut.auth.getUser()
    if (user && venueId) {
      await supabaseStaff
        .from('staff_names')
        .update({ full_name: fullName.trim() })
        .eq('venue_id', venueId)
      await supabaseStaff
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', user.id)
    }
    setSaving(false)
    setStep(2)
  }

  async function searchVenue() {
    const code = inviteCode.trim().toUpperCase()
    if (!code) return
    setSearching(true)
    setSearchError('')
    const { data } = await supabaseStaff
      .from('venues')
      .select('id, name')
      .eq('invite_code', code)
      .single()
    if (!data) {
      setSearchError('Código incorrecto')
    } else {
      setLinkedVenue(data)
    }
    setSearching(false)
  }

  async function vincular() {
    if (!linkedVenue) return
    setSaving(true)
    const { data: { session } } = await supabaseCamaut.auth.getSession()
    if (session) {
      await supabaseStaff.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      })
      await supabaseStaff.from('venue_staff').insert({
        venue_id: linkedVenue.id,
        staff_profile_id: session.user.id,
        status: 'active'
      })
    }
    setSaving(false)
    setStep(3)
  }

  async function saveAlias() {
    setSaving(true)
    if (venueId && aliasBancario.trim()) {
      await supabaseStaff
        .from('staff_names')
        .update({ alias_bancario: aliasBancario.trim() })
        .eq('venue_id', venueId)
    }
    setSaving(false)
    setStep(4)
  }

  const TOTAL_STEPS = 4

  return (
    <div className="min-h-screen bg-carbon-950 flex flex-col px-6 py-10">

      {/* Progress */}
      <div className="flex gap-1.5 mb-8">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} className={`flex-1 h-1 rounded-full ${i < step ? 'bg-ember-500' : 'bg-carbon-700'}`} />
        ))}
      </div>

      {/* PASO 1 — Nombre */}
      {step === 1 && (
        <div className="flex-1 flex flex-col">
          <div className="mb-8">
            <p className="text-smoke-500 text-sm mb-1">Paso 1 de {TOTAL_STEPS}</p>
            <h1 className="font-bold text-smoke-200 text-2xl mb-2">¿Cómo te llamás?</h1>
            <p className="text-smoke-500 text-sm">Tu nombre aparece en el ranking, el certificado y en los pedidos.</p>
          </div>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Tu nombre completo"
            className="w-full bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-4 text-smoke-200 text-base mb-4"
            autoFocus
          />
          <button
            onClick={saveNombre}
            disabled={saving || !fullName.trim()}
            className="w-full bg-ember-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base mt-auto"
          >
            {saving ? 'Guardando...' : 'Continuar →'}
          </button>
        </div>
      )}

      {/* PASO 2 — Vincular restaurante */}
      {step === 2 && (
        <div className="flex-1 flex flex-col">
          <div className="mb-8">
            <p className="text-smoke-500 text-sm mb-1">Paso 2 de {TOTAL_STEPS}</p>
            <h1 className="font-bold text-smoke-200 text-2xl mb-2">¿Trabajás en un restaurante que usa Capy?</h1>
            <p className="text-smoke-500 text-sm">Pedile al encargado el código de invitación.</p>
          </div>

          {!linkedVenue ? (
            <>
              <input
                type="text"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Código de invitación"
                className="w-full bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-4 text-smoke-200 text-base font-mono tracking-widest mb-2"
                maxLength={8}
              />
              {searchError && <p className="text-red-400 text-xs mb-2">{searchError}</p>}
              <button
                onClick={searchVenue}
                disabled={searching || !inviteCode.trim()}
                className="w-full bg-carbon-800 border border-carbon-600 disabled:opacity-50 text-smoke-300 font-semibold py-3.5 rounded-2xl text-sm mb-4"
              >
                {searching ? 'Buscando...' : 'Buscar restaurante'}
              </button>
            </>
          ) : (
            <div className="bg-carbon-900 border border-ember-500/30 rounded-2xl p-5 mb-4 text-center">
              <p className="text-smoke-500 text-xs mb-1">Restaurante encontrado</p>
              <p className="text-smoke-200 font-bold text-lg">{linkedVenue.name}</p>
              <button
                onClick={vincular}
                disabled={saving}
                className="w-full bg-ember-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl text-sm mt-4"
              >
                {saving ? 'Vinculando...' : `Vincularme a ${linkedVenue.name} →`}
              </button>
              <button onClick={() => { setLinkedVenue(null); setInviteCode('') }} className="text-smoke-500 text-xs mt-2 underline">
                Usar otro código
              </button>
            </div>
          )}

          <button
            onClick={() => setStep(3)}
            className="text-smoke-500 text-sm text-center underline mt-auto"
          >
            No tengo código, saltear
          </button>
        </div>
      )}

      {/* PASO 3 — Alias bancario */}
      {step === 3 && (
        <div className="flex-1 flex flex-col">
          <div className="mb-8">
            <p className="text-smoke-500 text-sm mb-1">Paso 3 de {TOTAL_STEPS}</p>
            <h1 className="font-bold text-smoke-200 text-2xl mb-2">¿Tu alias para propinas?</h1>
            <p className="text-smoke-500 text-sm">Aparece en el QR del pedido para que el cliente te pueda transferir la propina.</p>
          </div>
          <input
            type="text"
            value={aliasBancario}
            onChange={e => setAliasBancario(e.target.value)}
            placeholder="Ej: nombre.apellido.mp"
            className="w-full bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-4 text-smoke-200 text-base mb-4"
          />
          <button
            onClick={saveAlias}
            disabled={saving}
            className="w-full bg-ember-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base"
          >
            {saving ? 'Guardando...' : 'Continuar →'}
          </button>
          <button onClick={() => setStep(4)} className="text-smoke-500 text-sm text-center underline mt-3">
            Saltear por ahora
          </button>
        </div>
      )}

      {/* PASO 4 — ¡Listo! */}
      {step === 4 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-ember-500/10 border border-ember-500/30 flex items-center justify-center mx-auto mb-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#E8772A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h1 className="font-bold text-smoke-200 text-2xl mb-2">¡Todo listo, {fullName.split(' ')[0]}!</h1>
          <p className="text-smoke-500 text-sm mb-2 leading-relaxed">
            Ya podés empezar a tomar pedidos. Cuando confirmes un pedido, los productos y ubicaciones que ingreses a mano quedan guardados en tu carta.
          </p>
          <p className="text-smoke-600 text-xs mb-8">
            Podés completar tu perfil, carta y más desde <span className="text-ember-500">Mi Capy</span>.
          </p>

          <div className="w-full space-y-3">
            <button
              onClick={onComplete}
              className="w-full bg-ember-500 text-white font-bold py-4 rounded-2xl text-base"
            >
              Empezar a tomar pedidos
            </button>
            <button
              onClick={() => { onComplete(); setTimeout(() => {}, 100) }}
              className="w-full bg-carbon-900 border border-carbon-700 text-smoke-300 font-semibold py-3.5 rounded-2xl text-sm"
            >
              Ir a Mi Capy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
