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

  async function getSession() {
    const { data: { session: s1 } } = await supabaseCamaut.auth.getSession()
    if (s1) return s1
    const { data: { session: s2 } } = await supabaseStaff.auth.getSession()
    return s2
  }

  async function saveNombre() {
    if (!fullName.trim()) return
    setSaving(true)
    const session = await getSession()
    if (session) {
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
    const session = await getSession()
    if (session) {
      await supabaseStaff.from('venue_staff').insert({
        venue_id: linkedVenue.id,
        staff_profile_id: session.user.id,
        status: 'active'
      })
      // Link staff_names record to this camaut auth user
      if (venueId) {
        await supabaseStaff
          .from('staff_names')
          .update({ profile_id: session.user.id })
          .eq('venue_id', venueId)
          .is('profile_id', null)
      }
    }
    setSaving(false)
    await finishOnboarding()
  }

  async function finishOnboarding() {
    setSaving(true)
    try {
      const session = await getSession()
      if (session && !venueId) {
        const userId = session.user.id
        const name = fullName.trim() || session.user.user_metadata?.full_name || 'Camarero'
        const slug = `camaut-${userId.replace(/-/g, '').slice(0, 12)}`

        // Create autonomous venue
        let { data: venue, error: venueError } = await supabaseStaff
          .from('venues')
          .insert({ name: `${name} — Capy`, slug, owner_id: userId, is_active: true })
          .select('id')
          .single()

        if (venueError) {
          if (venueError.code === '23505') {
            // Venue already exists (retry) — look it up
            const res = await supabaseStaff.from('venues').select('id').eq('slug', slug).maybeSingle()
            venue = res.data
          } else {
            alert('Error: ' + venueError.message)
            setSaving(false)
            return
          }
        }

        if (!venue?.id) {
          alert('Error: No se pudo crear tu cuenta')
          setSaving(false)
          return
        }

        // Update profile with autonomous venue (upsert handles missing profile row)
        const { error: profileError } = await supabaseStaff
          .from('profiles')
          .upsert({ id: userId, venue_id: venue.id, role: 'camarero', full_name: name, is_autonomous: true }, { onConflict: 'id' })

        if (profileError) {
          alert('Error: ' + profileError.message)
          setSaving(false)
          return
        }

        // Create staff_names record for the autonomous venue
        await supabaseStaff
          .from('staff_names')
          .insert({ venue_id: venue.id, full_name: name, profile_id: userId, xp: 0 })
      }
      onComplete()
    } catch (err) {
      alert('Error: ' + err.message)
    }
    setSaving(false)
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

      {/* PASO 2 — Primeros pasos */}
      {step === 2 && !showVincular && (
        <div className="flex-1 flex flex-col">
          <div className="mb-6">
            <p className="text-smoke-500 text-sm mb-1">Paso 2 de 2</p>
            <h1 className="font-bold text-smoke-200 text-2xl mb-2">
              ¡Listo, {fullName.split(' ')[0]}!
            </h1>
            <p className="text-smoke-500 text-sm leading-relaxed">
              Tu cuenta está lista. Te recomendamos estas tres acciones para arrancar:
            </p>
          </div>

          <div className="space-y-2.5 mb-8">
            {[
              {
                num: '1',
                label: 'Completá tu perfil',
                desc: 'Foto, alias y datos para tu página pública',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              },
              {
                num: '2',
                label: 'Cargá tu carta con IA',
                desc: 'Sacale una foto al menú y la IA lo sube en segundos',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              },
              {
                num: '3',
                label: 'Agregá ubicaciones',
                desc: 'Mesas, barras y salones de tu lugar de trabajo',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              },
            ].map(item => (
              <div key={item.num} className="flex items-center gap-3 bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-3.5">
                <div className="w-7 h-7 rounded-full bg-ember-500/15 text-ember-500 font-bold text-xs flex items-center justify-center flex-shrink-0">
                  {item.num}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-smoke-200 font-semibold text-sm leading-tight">{item.label}</p>
                  <p className="text-smoke-500 text-xs mt-0.5">{item.desc}</p>
                </div>
                <div className="text-smoke-600 flex-shrink-0">{item.icon}</div>
              </div>
            ))}
          </div>

          <div className="mt-auto space-y-3">
            <button
              onClick={finishOnboarding}
              disabled={saving}
              className="w-full bg-ember-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-sm"
            >
              {saving ? 'Creando tu cuenta...' : 'Empezar →'}
            </button>
            <button
              onClick={() => setShowVincular(true)}
              className="w-full bg-carbon-900 border border-carbon-700 text-smoke-400 font-semibold py-3.5 rounded-2xl text-sm"
            >
              Vincularme a un restaurante primero
            </button>
            <p className="text-smoke-600 text-xs text-center">
              También podés vincular un restaurante después desde <span className="text-ember-500">Mi Capy</span>.
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
