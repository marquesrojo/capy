import { useEffect, useRef, useState } from 'react'
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
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    if (searchParams.get('code')) {
      handleSearch(searchParams.get('code'))
    }
    return () => stopScan()
  }, [])

  async function startScan() {
    setScanning(true)
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream

      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        const interval = setInterval(async () => {
          if (!videoRef.current) { clearInterval(interval); return }
          try {
            const barcodes = await detector.detect(videoRef.current)
            if (barcodes.length > 0) {
              clearInterval(interval)
              const raw = barcodes[0].rawValue
              // Extraer código del URL o usar directamente
              const match = raw.match(/code=([A-Z0-9]{8})/i)
              const extracted = match ? match[1].toUpperCase() : raw.toUpperCase().slice(0, 8)
              stopScan()
              setCode(extracted)
              handleSearch(extracted)
            }
          } catch {}
        }, 500)
      } else {
        setError('Tu navegador no soporta escaneo. Ingresá el código manualmente.')
        stopScan()
      }
    } catch {
      setError('No se pudo acceder a la cámara.')
      setScanning(false)
    }
  }

  function stopScan() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setScanning(false)
  }

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
    setError('')

    const { data: { session } } = await supabaseCamaut.auth.getSession()
    if (!session) { navigate('/camaut/login'); return }

    // Sincronizar sesión con supabaseStaff
    await supabaseStaff.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    })

    // Verificar si ya está vinculado
    const { data: existing } = await supabaseStaff
      .from('venue_staff')
      .select('id, status')
      .eq('venue_id', venue.id)
      .eq('staff_profile_id', session.user.id)
      .maybeSingle()

    if (existing?.status === 'active') {
      setError('Ya estás vinculado a este restaurante.')
      setConfirming(false)
      return
    }

    if (existing) {
      await supabaseStaff
        .from('venue_staff')
        .update({ status: 'active', left_at: null })
        .eq('id', existing.id)
    } else {
      const { error: insertError } = await supabaseStaff
        .from('venue_staff')
        .insert({
          venue_id: venue.id,
          staff_profile_id: session.user.id,
          status: 'active'
        })
      if (insertError) {
        setError('Error al vincular: ' + insertError.message)
        setConfirming(false)
        return
      }
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
          {/* Escáner QR */}
          {scanning ? (
            <div className="relative">
              <video ref={videoRef} autoPlay playsInline className="w-full rounded-2xl" />
              <div className="absolute inset-0 border-4 border-ember-500/50 rounded-2xl pointer-events-none" />
              <button
                onClick={stopScan}
                className="absolute top-3 right-3 bg-black/50 text-white text-xs px-3 py-1.5 rounded-full"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={startScan}
              className="w-full border-2 border-dashed border-carbon-700 text-smoke-400 py-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/>
                <rect x="3" y="16" width="5" height="5"/>
                <path d="M21 16h-3a2 2 0 0 0-2 2v3M21 21v.01M12 7v3a2 2 0 0 1-2 2H7M3 12h.01M12 3h.01M7 17H4a1 1 0 0 1-1-1v-3"/>
              </svg>
              Escanear QR del local
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-carbon-700" />
            <span className="text-smoke-600 text-xs">o ingresá el código</span>
            <div className="flex-1 h-px bg-carbon-700" />
          </div>

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
            {loading ? 'Buscando...' : 'Buscar local →'}
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
