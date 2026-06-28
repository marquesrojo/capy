import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabaseCamaut, supabaseStaff } from '../../lib/supabase'

export default function CamautVincularPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState(searchParams.get('code') || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [venue, setVenue] = useState(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    // Si viene con code en la URL, buscar el venue automáticamente
    if (searchParams.get('code')) {
      handleSearch(searchParams.get('code'))
    }
  }, [])

  async function handleSearch(searchCode) {
    const c = (searchCode || code).trim().toUpperCase()
    if (!c) return
    setLoading(true)
    setError('')
    setVenue(null)

    const { data } = await supabaseStaff
      .from('venues')
      .select('id, name')
      .eq('invite_code', c)
      .single()

    if (!data) {
      setError('Código incorrecto. Pedile al encargado el código actualizado.')
    } else {
      setVenue(data)
    }
    setLoading(false)
  }

  async function handleVincular() {
    setConfirming(true)
    const { data: { session } } = await supabaseCamaut.auth.getSession()
    if (!session) { navigate('/camaut/login'); return }

    // Verificar si ya está vinculado
    const { data: existing } = await supabaseStaff
      .from('venue_staff')
      .select('id, status')
      .eq('venue_id', venue.id)
      .eq('staff_profile_id', session.user.id)
      .single()

    if (existing?.status === 'active') {
      setError('Ya estás vinculado a este restaurante.')
      setConfirming(false)
      return
    }

    if (existing) {
      // Reactivar vinculación
      await supabaseStaff
        .from('venue_staff')
        .update({ status: 'active', left_at: null })
        .eq('id', existing.id)
    } else {
      // Nueva vinculación
      await supabaseStaff
        .from('venue_staff')
        .insert({
          venue_id: venue.id,
          staff_profile_id: session.user.id,
          status: 'active'
        })
    }

    setConfirming(false)
    navigate('/camaut/app')
  }

  return (
    <div className="min-h-screen bg-carbon-950 px-5 py-10 flex flex-col">
      <button onClick={() => navigate('/camaut/app')} className="text-smoke-500 text-sm mb-8">← Volver</button>

      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-ember-500/10 border border-ember-500/20 flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E8772A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <h1 className="font-bold text-smoke-200 text-2xl mb-2">Vincularte a un restaurante</h1>
        <p className="text-smoke-500 text-sm">Ingresá el código que te dio el encargado del local</p>
      </div>

      {!venue ? (
        <div className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="Ej: A1B2C3D4"
            className="w-full bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-4 text-center font-mono text-smoke-200 text-2xl tracking-widest"
            maxLength={8}
          />
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button
            onClick={() => handleSearch()}
            disabled={loading || !code.trim()}
            className="w-full bg-ember-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base"
          >
            {loading ? 'Buscando...' : 'Buscar restaurante →'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-6 text-center">
            <p className="text-smoke-500 text-xs mb-2">Restaurante encontrado</p>
            <p className="text-smoke-200 font-bold text-xl">{venue.name}</p>
          </div>
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button
            onClick={handleVincular}
            disabled={confirming}
            className="w-full bg-ember-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base"
          >
            {confirming ? 'Vinculando...' : `Vincularme a ${venue.name} →`}
          </button>
          <button
            onClick={() => { setVenue(null); setCode(''); setError('') }}
            className="w-full border border-carbon-700 text-smoke-400 py-3 rounded-2xl text-sm"
          >
            Usar otro código
          </button>
        </div>
      )}
    </div>
  )
}
