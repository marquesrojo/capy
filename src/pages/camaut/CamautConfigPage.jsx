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
  const [showVincular, setShowVincular] = useState(false)

  async function saveNombre() {
    if (!fullName.trim()) return
    setSaving(true)
    const { data: { session } } = await supabaseCamaut.auth.getSession()
    if (session) {
      await supabaseStaff.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      })
      if (venueId) {
        await supabaseStaff.from('staff_names').update({ full_name: fullName.trim() }).eq('venue_id', venueId)
        await supabaseStaff.from('profiles').update({ full_name: fullName.trim() }).eq('id', session.user.id)
      }
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
    await finishOnboarding()
  }

  async function finishOnboarding() {
    setSaving(true)
    const { data: { session } } = await supabaseCamaut.auth.getSession()
    if (session) {
      await supabaseStaff.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      })
      await supabaseStaff
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', session.user.id)
    }
    setSaving(false)
    onComplete()
  }

  return (
    <div className="min-h-screen bg-carbon-950 flex flex-col px-6 py-10">

      {/* Progress */}
      <div className="flex gap-1.5 mb-8">
        {[1, 2].map(i => (
          <div key={i} className={`flex-1 h-1 rounded-full ${i <= step ? 'bg-ember-500' : 'bg-carbon-700'}`} />
        ))}
      </div>

      {/* PASO 1 — Nombre */}
      {step === 1 && (
        <div className="flex-1 flex flex-col">
          <div className="mb-8">
            <p className="text-smoke-500 text-sm mb-1">Paso 1 de 2</p>
            <h1 className="font-bold text-smoke-200 text-2xl mb-2">¿Cómo te llamás?</h1>
            <p className="text-smoke-500 text-sm">Tu nombre aparece en el ranking, el certificado y en los pedidos.</p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !saving && fullName.trim() && saveNombre()}
              placeholder="Tu nombre completo"
              className="flex-1 bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-4 text-smoke-200 text-base"
              autoFocus
            />
            <button
              onClick={saveNombre}
              disabled={saving || !fullName.trim()}
              className="bg-ember-500 disabled:opacity-50 text-white font-bold px-5 rounded-2xl text-sm flex-shrink-0"
            >
              →
            </button>
          </div>
        </div>
      )}

      {/* PASO 2 — Acción */}
      {step === 2 && !showVincular && (
        <div className="flex-1 flex flex-col">
          <div className="mb-8">
            <p className="text-smoke-500 text-sm mb-1">Paso 2 de 2</p>
            <h1 className="font-bold text-smoke-200 text-2xl mb-2">
              ¡Listo, {fullName.split(' ')[0]}!
            </h1>
            <p className="text-smoke-500 text-sm leading-relaxed">
              Podés tomar pedidos ahora mismo. Cuando confirmes un pedido, los productos y ubicaciones que ingreses a mano quedan guardados en <span className="text-ember-500">Mi Carta</span> para la próxima vez.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={finishOnboarding}
                disabled={saving}
                className="flex flex-col items-center justify-center gap-3 bg-ember-500 disabled:opacity-50 text-white font-bold py-8 rounded-2xl"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                <span className="text-sm leading-tight text-center">Tomar mi primer pedido</span>
              </button>

              <button
                onClick={() => setShowVincular(true)}
                className="flex flex-col items-center justify-center gap-3 bg-carbon-900 border border-carbon-700 text-smoke-300 font-bold py-8 rounded-2xl"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span className="text-sm leading-tight text-center">Vincularme a un Local</span>
              </button>
            </div>

            <p className="text-smoke-600 text-xs text-center">
              Podés vincular un restaurante y completar tu perfil después desde <span className="text-ember-500">Mi Capy</span>.
            </p>
          </div>
        </div>
      )}

      {/* PASO 2b — Vincular restaurante */}
      {step === 2 && showVincular && (
        <div className="flex-1 flex flex-col">
          <button onClick={() => { setShowVincular(false); setLinkedVenue(null); setInviteCode('') }}
            className="text-smoke-500 text-sm mb-6">← Volver</button>

          <div className="mb-6">
            <h1 className="font-bold text-smoke-200 text-2xl mb-2">Vincularme a un restaurante</h1>
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
                className="w-full bg-ember-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl text-sm mb-3"
              >
                {searching ? 'Buscando...' : 'Vincularse →'}
              </button>
              <button
                onClick={finishOnboarding}
                disabled={saving}
                className="w-full bg-carbon-900 border border-carbon-700 text-smoke-400 font-semibold py-3.5 rounded-2xl text-sm"
              >
                Empezar sin local
              </button>
            </>
          ) : (
            <div className="bg-carbon-900 border border-ember-500/30 rounded-2xl p-5 mb-4 text-center">
              <p className="text-smoke-500 text-xs mb-1">Restaurante encontrado</p>
              <p className="text-smoke-200 font-bold text-lg mb-4">{linkedVenue.name}</p>
              <button
                onClick={vincular}
                disabled={saving}
                className="w-full bg-ember-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl text-sm"
              >
                {saving ? 'Vinculando...' : `Vincularme a ${linkedVenue.name} →`}
              </button>
              <button onClick={() => { setLinkedVenue(null); setInviteCode('') }}
                className="text-smoke-500 text-xs mt-2 underline block">
                Usar otro código
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
