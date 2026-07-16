import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import jsQR from 'jsqr'
import { supabaseCamaut, supabaseStaff } from '../../lib/supabase'

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase())
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || !!window.navigator.standalone

function InstallBanner() {
  const [prompt, setPrompt] = useState(window._pwaInstallPrompt || null)
  const [installed, setInstalled] = useState(false)
  const [showIOSSteps, setShowIOSSteps] = useState(false)

  useEffect(() => {
    const onPrompt = e => { e.preventDefault(); window._pwaInstallPrompt = e; setPrompt(e) }
    const onInstalled = () => { setInstalled(true); window._pwaInstallPrompt = null; setPrompt(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (isStandalone || installed) return (
    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-4 py-3 flex items-center gap-3 mb-6">
      <span className="text-emerald-600 font-bold text-sm">✓ App instalada</span>
      <span className="text-smoke-500 text-xs">Ya podés recibir notificaciones</span>
    </div>
  )

  if (isIOS) return (
    <div className="bg-carbon-900 border border-ember-500/30 rounded-2xl px-4 py-4 mb-6">
      <button onClick={() => setShowIOSSteps(s => !s)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-ember-500/10 flex items-center justify-center text-ember-500 flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4"/><path d="M8 12l4 4 4-4"/><rect x="3" y="18" width="18" height="3" rx="1.5"/>
            </svg>
          </div>
          <div className="text-left">
            <p className="text-smoke-200 font-semibold text-sm">Instalá Capy en tu iPhone</p>
            <p className="text-smoke-500 text-xs">Para recibir notificaciones de pedidos</p>
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`text-smoke-500 transition-transform ${showIOSSteps ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {showIOSSteps && (
        <div className="mt-3 space-y-2 pl-12">
          {[
            'Tocá el botón Compartir en Safari',
            'Deslizá y tocá "Agregar a pantalla de inicio"',
            'Confirmá tocando "Agregar"',
          ].map((step, i) => (
            <p key={i} className="text-smoke-400 text-xs">
              <span className="text-ember-500 font-bold mr-1">{i + 1}.</span>{step}
            </p>
          ))}
        </div>
      )}
    </div>
  )

  if (prompt) return (
    <button
      onClick={() => prompt.prompt()}
      className="w-full flex items-center gap-3 bg-carbon-900 border border-ember-500/30 rounded-2xl px-4 py-3.5 text-left mb-6"
    >
      <div className="w-9 h-9 rounded-xl bg-ember-500/10 flex items-center justify-center text-ember-500 flex-shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 16V4"/><path d="M8 12l4 4 4-4"/><rect x="3" y="18" width="18" height="3" rx="1.5"/>
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-smoke-200 font-semibold text-sm">Instalá Capy Camarero</p>
        <p className="text-smoke-500 text-xs">Acceso directo y notificaciones de pedidos</p>
      </div>
      <span className="text-ember-500 font-bold text-sm flex-shrink-0">Instalar →</span>
    </button>
  )

  return null
}

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
  const canvasRef = useRef(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (searchParams.get('code')) {
      handleSearch(searchParams.get('code'))
    }
    return () => stopScan()
  }, [])

  function processQRResult(raw) {
    const match = raw.match(/code=([A-Z0-9]{8})/i)
    const extracted = match ? match[1].toUpperCase() : raw.toUpperCase().slice(0, 8)
    stopScan()
    setCode(extracted)
    handleSearch(extracted)
  }

  async function startScan() {
    setScanning(true)
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream

      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        intervalRef.current = setInterval(async () => {
          if (!videoRef.current) { clearInterval(intervalRef.current); return }
          try {
            const barcodes = await detector.detect(videoRef.current)
            if (barcodes.length > 0) {
              clearInterval(intervalRef.current)
              processQRResult(barcodes[0].rawValue)
            }
          } catch {}
        }, 500)
      } else {
        // Fallback for iOS Safari: canvas-based jsQR scanning
        const canvas = document.createElement('canvas')
        canvasRef.current = canvas
        intervalRef.current = setInterval(() => {
          const video = videoRef.current
          if (!video || video.readyState < 2) return
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d')
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height)
          if (code?.data) {
            clearInterval(intervalRef.current)
            processQRResult(code.data)
          }
        }, 300)
      }
    } catch {
      setError('No se pudo acceder a la cámara.')
      setScanning(false)
    }
  }

  function stopScan() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
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
    if (!session) { navigate('/camareroa/login'); return }

    // Sincronizar sesión con supabaseStaff
    await supabaseStaff.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    })

    // Leer venue personal del camarero
    const { data: profileData } = await supabaseStaff
      .from('profiles')
      .select('venue_id')
      .eq('id', session.user.id)
      .single()
    const venuePersonal = profileData?.venue_id || null

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

    // Setear profile_id en el staff_names del venue personal del camarero
    if (venuePersonal) {
      await supabaseStaff
        .from('staff_names')
        .update({ profile_id: session.user.id })
        .eq('venue_id', venuePersonal)
        .is('profile_id', null)
    }

    // Copiar notas del local automáticamente al venue personal
    if (venuePersonal) {
      const { data: localNotas } = await supabaseStaff
        .from('quick_notes')
        .select('label')
        .eq('venue_id', venue.id)
        .eq('is_active', true)
      if (localNotas?.length) {
        const existing_labels = await supabaseStaff
          .from('quick_notes')
          .select('label')
          .eq('venue_id', venuePersonal)
        const existingLabels = new Set(existing_labels.data?.map(n => n.label) || [])
        const toInsert = localNotas
          .filter(n => !existingLabels.has(n.label))
          .map((n, i) => ({ venue_id: venuePersonal, label: n.label, is_active: true, sort_order: i }))
        if (toInsert.length) await supabaseStaff.from('quick_notes').insert(toInsert)
      }
    }

    setConfirming(false)
    navigate('/camareroa/app')
  }

  return (
    <div className="min-h-screen bg-carbon-950 px-5 py-10 flex flex-col">
      <button onClick={() => navigate('/camareroa/app')} className="text-smoke-500 text-sm mb-8">← Volver</button>

      <InstallBanner />

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
              <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-2xl" />
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
