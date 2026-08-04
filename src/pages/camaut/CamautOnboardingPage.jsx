import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { supabaseCamaut, supabaseStaff } from '../../lib/supabase'
import { ensureWaiterRecord } from '../../lib/camautSetup'

// El alias es parte de una URL: sin espacios ni acentos ni signos
function sanitizeAlias(v) {
  return v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '')
}

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase())
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || !!window.navigator.standalone

function InstallCard() {
  const [installPrompt, setInstallPrompt] = useState(window._pwaInstallPrompt || null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const onPrompt = e => { e.preventDefault(); window._pwaInstallPrompt = e; setInstallPrompt(e) }
    const onInstalled = () => { setInstalled(true); window._pwaInstallPrompt = null; setInstallPrompt(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setInstalled(true)
      window._pwaInstallPrompt = null
      setInstallPrompt(null)
    }
  }

  // Already installed or just installed this session
  if (isStandalone || installed) {
    return (
      <div className="flex items-center gap-3 bg-carbon-900 border border-emerald-500/40 rounded-2xl px-4 py-3.5">
        <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-400 text-xs flex items-center justify-center flex-shrink-0 font-bold">✓</div>
        <div className="flex-1 min-w-0">
          <p className="text-smoke-200 font-semibold text-sm leading-tight">App instalada</p>
          <p className="text-smoke-500 text-xs mt-0.5">Ya podés recibir notificaciones de pedidos</p>
        </div>
      </div>
    )
  }

  // iOS: manual instructions
  if (isIOS) {
    return (
      <div className="bg-carbon-900 border border-ember-500/30 rounded-2xl px-4 py-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-7 h-7 rounded-full bg-ember-500/15 text-ember-500 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
            </svg>
          </div>
          <div>
            <p className="text-smoke-200 font-semibold text-sm leading-tight">Instalá la app en tu iPhone</p>
            <p className="text-smoke-500 text-xs mt-0.5">Necesario para recibir notificaciones de pedidos</p>
          </div>
        </div>
        <div className="space-y-2 pl-10">
          <div className="flex items-center gap-2">
            <span className="text-ember-500 font-bold text-xs w-4 flex-shrink-0">1.</span>
            <span className="text-smoke-400 text-xs">
              Tocá el botón{' '}
              <span className="inline-flex items-center gap-1 text-smoke-200 font-semibold">
                Compartir
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
              </span>{' '}
              en la barra del navegador
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-ember-500 font-bold text-xs w-4 flex-shrink-0">2.</span>
            <span className="text-smoke-400 text-xs">
              Elegí <span className="text-smoke-200 font-semibold">"Agregar a inicio"</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-ember-500 font-bold text-xs w-4 flex-shrink-0">3.</span>
            <span className="text-smoke-400 text-xs">
              Tocá <span className="text-smoke-200 font-semibold">"Agregar"</span> para confirmar
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Android/Chrome with deferred prompt
  if (installPrompt) {
    return (
      <button
        onClick={handleInstall}
        className="w-full flex items-center gap-3 bg-carbon-900 border border-ember-500/30 rounded-2xl px-4 py-3.5 text-left"
      >
        <div className="w-7 h-7 rounded-full bg-ember-500/15 text-ember-500 text-xs flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-smoke-200 font-semibold text-sm leading-tight">Instalá la app</p>
          <p className="text-smoke-500 text-xs mt-0.5">Acceso directo y notificaciones de pedidos</p>
        </div>
        <span className="text-ember-500 font-bold text-sm flex-shrink-0">Instalar →</span>
      </button>
    )
  }

  return null
}

export default function CamautOnboardingPage({ staffName: initialName, venueId, onComplete }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [fullName, setFullName] = useState(initialName || '')
  const [saving, setSaving] = useState(false)
  // El cobro es lo primero que tiene que quedar listo: es a lo que vino
  const [alias, setAlias] = useState('')
  const [aliasBancario, setAliasBancario] = useState('')
  const [aliasError, setAliasError] = useState('')
  const [staffId, setStaffId] = useState(null)
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
      // La ficha se crea acá y no al final: el paso que sigue guarda el alias
      // encima de ella, y el último muestra el QR, que necesita su id
      try {
        await ensureWaiterRecord(session.user.id, fullName.trim())
        const { data } = await supabaseStaff
          .from('staff_names')
          .select('id, alias, alias_bancario')
          .eq('profile_id', session.user.id)
          .maybeSingle()
        if (data) {
          setStaffId(data.id)
          setAlias(data.alias || sanitizeAlias(fullName.trim().split(' ')[0]))
          if (data.alias_bancario) setAliasBancario(data.alias_bancario)
        }
      } catch (err) {
        alert('Error creando tu cuenta: ' + err.message)
        setSaving(false)
        return
      }
    }
    setSaving(false)
    setStep(2)
  }

  // Alias de usuario y alias bancario: lo que hace falta para poder cobrar
  async function saveCobro() {
    setAliasError('')
    const limpio = sanitizeAlias(alias)
    if (!limpio) { setAliasError('Elegí un alias para tu página.'); return }
    setSaving(true)
    const { error } = await supabaseStaff
      .from('staff_names')
      .update({ alias: limpio, alias_bancario: aliasBancario.trim() || null })
      .eq('id', staffId)
    setSaving(false)
    if (error) {
      setAliasError(error.code === '23505'
        ? 'Ese alias ya lo está usando otro camarero. Probá con otro.'
        : error.message)
      return
    }
    setAlias(limpio)
    setStep(3)
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
      if (!session) { alert('Se cerró la sesión. Volvé a entrar.'); setSaving(false); return }
      // Siempre, no solo sin venue: a este paso se llega por no tener FICHA, y
      // un venue de un intento anterior no la reemplaza. Salir de acá sin ficha
      // deja al camarero adentro de la app sin perfil que guardar, sin alias
      // para las propinas y sin XP. ensureWaiterRecord reusa lo que ya exista.
      const name = fullName.trim() || session.user.user_metadata?.full_name || 'Camarero/a'
      await ensureWaiterRecord(session.user.id, name)
      localStorage.setItem(`camaut-onboarded-${session.user.id}`, '1')
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
        {[1, 2, 3].map(i => (
          <div key={i} className={`flex-1 h-1 rounded-full ${i <= step ? 'bg-ember-500' : 'bg-carbon-700'}`} />
        ))}
      </div>

      {/* PASO 1 — Nombre */}
      {step === 1 && (
        <div className="flex-1 flex flex-col">
          <div className="mb-8">
            <p className="text-smoke-500 text-sm mb-1">Paso 1 de 3</p>
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

      {/* PASO 2 — Cobrar. Es a lo que vino: que quede listo antes que nada */}
      {step === 2 && (
        <div className="flex-1 flex flex-col">
          <div className="mb-6">
            <p className="text-smoke-500 text-sm mb-1">Paso 2 de 3</p>
            <h1 className="font-bold text-smoke-200 text-2xl mb-2">Cobrá tus propinas</h1>
            <p className="text-smoke-500 text-sm leading-relaxed">
              El cliente escanea tu QR, copia tu alias y te transfiere. Directo a tu cuenta, sin
              intermediarios ni comisiones.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-smoke-400 text-xs block mb-1.5">Tu alias bancario o CVU</label>
              <input
                type="text"
                value={aliasBancario}
                onChange={e => setAliasBancario(e.target.value)}
                placeholder="juan.perez.mp"
                className="w-full bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-4 text-smoke-200 text-base"
                autoFocus
              />
              <p className="text-smoke-600 text-[11px] mt-1.5">
                El mismo que usás para que te transfieran. Lo podés cambiar cuando quieras.
              </p>
            </div>

            <div>
              <label className="text-smoke-400 text-xs block mb-1.5">La dirección de tu página</label>
              <div className="flex items-center bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-4">
                <span className="text-smoke-600 text-sm flex-shrink-0">capyapp.co/c/</span>
                <input
                  type="text"
                  value={alias}
                  onChange={e => { setAlias(sanitizeAlias(e.target.value)); setAliasError('') }}
                  placeholder="tunombre"
                  className="flex-1 min-w-0 bg-transparent text-smoke-200 text-base outline-none"
                />
              </div>
              {aliasError && <p className="text-red-400 text-xs mt-1.5">{aliasError}</p>}
            </div>
          </div>

          <div className="mt-auto space-y-3 pt-6">
            <button
              onClick={saveCobro}
              disabled={saving}
              className="w-full bg-ember-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-sm"
            >
              {saving ? 'Guardando...' : 'Crear mi QR →'}
            </button>
            <button
              onClick={() => { setAliasBancario(''); saveCobro() }}
              className="w-full text-smoke-500 text-xs"
            >
              Cargar el alias bancario después
            </button>
          </div>
        </div>
      )}

      {/* PASO 3 — Tu QR, ya listo */}
      {step === 3 && !showVincular && (
        <div className="flex-1 flex flex-col">
          <div className="mb-6">
            <p className="text-smoke-500 text-sm mb-1">Paso 3 de 3</p>
            <h1 className="font-bold text-smoke-200 text-2xl mb-2">
              Este es tu QR, {fullName.split(' ')[0]}
            </h1>
            <p className="text-smoke-500 text-sm leading-relaxed">
              Mostralo o compartilo y ya podés cobrar. Lo tenés siempre a mano arriba en la app.
            </p>
          </div>

          <OnboardingQR staffId={staffId} alias={alias} nombre={fullName.split(' ')[0]} />

          <div className="space-y-2.5 mb-6 mt-5">
            <p className="text-smoke-500 text-xs">Después, cuando quieras:</p>
            {[
              {
                num: '1',
                label: 'Completá tu perfil',
                desc: 'Foto y presentación para tu página pública',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              },
              {
                num: '2',
                label: 'Cargá tu carta con IA',
                desc: 'Sacale una foto al menú y la IA lo sube en segundos',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
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

            <InstallCard />
          </div>

          <div className="mt-auto space-y-3">
            <button
              onClick={finishOnboarding}
              disabled={saving}
              className="w-full bg-ember-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-sm"
            >
              {saving ? 'Entrando...' : 'Empezar →'}
            </button>
            <button
              onClick={() => setShowVincular(true)}
              className="w-full bg-carbon-900 border border-carbon-700 text-smoke-400 font-semibold py-3.5 rounded-2xl text-sm"
            >
              Vincularme a un restaurante
            </button>
            <p className="text-smoke-600 text-xs text-center">
              También podés vincular un restaurante después desde <span className="text-ember-500">Mi CAPY</span>.
            </p>
          </div>
        </div>
      )}

      {/* PASO 3b — Vincular restaurante */}
      {step === 3 && showVincular && (
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

// El QR recién hecho, en el mismo momento del registro. Apunta al id y no al
// alias: el alias se puede cambiar y lo que ya se compartió tiene que seguir
// funcionando.
function OnboardingQR({ staffId, alias, nombre }) {
  const canvasRef = useRef(null)
  const [copiado, setCopiado] = useState(false)
  const urlLinda = `capyapp.co/c/${alias || staffId}`

  useEffect(() => {
    if (!canvasRef.current || !staffId) return
    QRCode.toCanvas(canvasRef.current, `https://capyapp.co/c/${staffId}`, {
      width: 200,
      margin: 2,
      color: { dark: '#1A2A3A', light: '#FFFFFF' },
    })
  }, [staffId])

  async function compartir() {
    const texto = `Dejame una propina o calificá cómo te atendí 🦫\nhttps://${urlLinda}`
    if (navigator.share) {
      try {
        await navigator.share({ title: nombre, text: texto })
        return
      } catch { /* canceló */ }
    }
    try {
      await navigator.clipboard.writeText(`https://${urlLinda}`)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch { /* queda a la vista */ }
  }

  if (!staffId) return null

  return (
    <div className="bg-carbon-900 border border-ember-500/30 rounded-2xl p-5 text-center">
      <div className="flex justify-center">
        <div className="bg-white p-3 rounded-2xl">
          <canvas ref={canvasRef} />
        </div>
      </div>
      <p className="text-smoke-500 font-mono text-xs mt-3 break-all">{urlLinda}</p>
      <button
        onClick={compartir}
        className="w-full mt-3 bg-carbon-800 border border-carbon-700 text-smoke-200 font-semibold py-3 rounded-xl text-sm"
      >
        {copiado ? '¡Link copiado!' : 'Compartir mi QR'}
      </button>
    </div>
  )
}
