import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { useNavigate } from 'react-router-dom'
import { supabaseCamaut, supabaseStaff } from '../../lib/supabase'
import { PinIcon, BoltIcon, CalendarIcon } from '../../components/Icons'
import { formatPrice } from '../../lib/utils'
import FloorPlanViewer from '../../components/FloorPlanViewer'
import { getLevel, getXPProgress } from '../../lib/xpUtils'
import WaiterOrderCamaut from './WaiterOrderCamaut'
import WaiterTrackingPage from '../admin/WaiterTrackingPage'
import ShiftSummaryPage from '../admin/ShiftSummaryPage'
import MiCarrera from '../admin/MiCarrera'
import RankingMozos from '../admin/RankingMozos'
import CamautConfigPage from './CamautConfigPage'
import PerfilProPage from './PerfilProPage'
import CamautKanban from './CamautKanban'
import CamautOnboardingPage from './CamautOnboardingPage'
import WeeklyWrapped from './WeeklyWrapped'

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase())
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || !!window.navigator.standalone

const TABS = [
  {
    id: 'tomar', label: 'Comanda',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
  },
  {
    id: 'pedidos', label: 'Pedidos',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
  },
  {
    id: 'turno', label: 'Propinas',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
  },
  {
    id: 'micapy', label: 'Mi Capy',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  },
]

function getWeekKey() {
  const d = new Date()
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return monday.toISOString().slice(0, 10)
}

const MICAPY_ITEMS = [
  { id: 'invitar', label: 'Invitar', desc: 'Sumá colegas o locales', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg> },
  { id: 'perfil', label: 'Perfil', desc: 'Datos personales y CV Pro', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  { id: 'carta', label: 'Mis Cartas', desc: 'Carta y notas propias', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
  { id: 'vincular', label: 'Vincular', desc: 'Conectar con restaurantes', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { id: 'ubicaciones', label: 'Ubicaciones', desc: 'Mapa de salones vinculados', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
  { id: 'progreso', label: 'Progreso', desc: 'Carrera, XP y ranking', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
  { id: 'estadisticas', label: 'Estadísticas', desc: 'KPIs, encuestas e historial', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { id: 'social', label: 'Social', desc: 'Tu página y Wrapped', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> },
  { id: 'soporte', label: 'Soporte', desc: 'Envianos un mensaje', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
]

export default function CamautAppShell({ venueId, staffName: initialName, staffXP: initialXP, linkedVenues = [], staffId }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState('tomar')
  const [micapyTab, setMicapyTab] = useState(null)
  const [micapySubTab, setMicapySubTab] = useState(null)
  const [prefillLocation, setPrefillLocation] = useState(null)
  const [waiterCallCount, setWaiterCallCount] = useState(0)
  const [showWrapped, setShowWrapped] = useState(false)
  const [wrappedPeriod, setWrappedPeriod] = useState('week')
  const [showPeriodPicker, setShowPeriodPicker] = useState(false)
  const [wrappedReady, setWrappedReady] = useState(false)
  const [statsDesde, setStatsDesde] = useState(() =>
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  )
  const [statsHasta, setStatsHasta] = useState(() => new Date().toISOString().slice(0, 10))
  const [wrappedSeen, setWrappedSeen] = useState(() =>
    localStorage.getItem(`wrapped-seen-${getWeekKey()}`) === '1'
  )

  useEffect(() => {
    supabaseStaff.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.user_metadata?.wrapped_seen_week === getWeekKey()) {
        setWrappedSeen(true)
      }
    })
  }, [])

  const [installPrompt, setInstallPrompt] = useState(window._pwaInstallPrompt || null)
  const [appInstalled, setAppInstalled] = useState(false)
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [installBannerDismissed, setInstallBannerDismissed] = useState(
    () => localStorage.getItem('camaut-install-dismissed') === '1'
  )

  useEffect(() => {
    const onPrompt = e => { e.preventDefault(); window._pwaInstallPrompt = e; setInstallPrompt(e) }
    const onInstalled = () => { setAppInstalled(true); window._pwaInstallPrompt = null; setInstallPrompt(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  function dismissInstallBanner() {
    localStorage.setItem('camaut-install-dismissed', '1')
    setInstallBannerDismissed(true)
  }

  const showInstallBanner = !isStandalone && !appInstalled && !installBannerDismissed

  const [gsState, setGsState] = useState(() => {
    const saved = localStorage.getItem('camaut-getting-started')
    return saved ? JSON.parse(saved) : { dismissed: false, perfil: false, carta: false, ubicaciones: false }
  })

  function updateGs(updates) {
    setGsState(prev => {
      const next = { ...prev, ...updates }
      localStorage.setItem('camaut-getting-started', JSON.stringify(next))
      return next
    })
  }

  function goToSection(id) {
    updateGs({ [id]: true })
    setTab('micapy')
    if (id === 'perfil') { setMicapyTab('perfil'); setMicapySubTab('datos') }
    else if (id === 'carta') { setMicapyTab('carta') }
    else if (id === 'ubicaciones') { setMicapyTab('ubicaciones') }
  }

  function handleNewOrderForTable(locationLabel) {
    setPrefillLocation(locationLabel)
    setTab('tomar')
  }
  const [staffName, setStaffName] = useState(initialName)
  const [staffXP, setStaffXP] = useState(initialXP || 0)
  const [staffAlias, setStaffAlias] = useState(null)
  const [staffAvatarUrl, setStaffAvatarUrl] = useState(null)
  const [staffLoaded, setStaffLoaded] = useState(false)

  useEffect(() => {
    if (!venueId) { setStaffLoaded(true); return }
    supabaseStaff
      .from('staff_names')
      .select('full_name, xp, alias, avatar_url')
      .eq('venue_id', venueId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setStaffName(data.full_name)
        if (data?.xp !== undefined) setStaffXP(data.xp)
        if (data?.alias) setStaffAlias(data.alias.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, ''))
        if (data?.avatar_url) setStaffAvatarUrl(data.avatar_url)
        setStaffLoaded(true)
      })
  }, [venueId])

  useEffect(() => {
    if (!venueId) return
    async function checkCalls() {
      const [{ count: orderCount }, { count: anonCount }] = await Promise.all([
        supabaseStaff
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('venue_id', venueId)
          .not('waiter_called_at', 'is', null)
          .neq('status', 'entregado')
          .neq('status', 'cancelado'),
        supabaseStaff
          .from('waiter_calls')
          .select('id', { count: 'exact', head: true })
          .eq('venue_id', venueId)
          .is('resolved_at', null),
      ])
      setWaiterCallCount((orderCount || 0) + (anonCount || 0))
    }
    checkCalls()
    const t = setInterval(checkCalls, 8000)
    return () => clearInterval(t)
  }, [venueId])

  useEffect(() => {
    if (!staffId) return
    const weekStart = new Date()
    const day = weekStart.getDay()
    weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1))
    weekStart.setHours(0, 0, 0, 0)
    supabaseStaff
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_staff_id', staffId)
      .gte('created_at', weekStart.toISOString())
      .neq('status', 'cancelado')
      .then(({ count }) => setWrappedReady((count || 0) > 0))
  }, [staffId])

  function openWrapped() {
    setShowWrapped(true)
    const weekKey = getWeekKey()
    localStorage.setItem(`wrapped-seen-${weekKey}`, '1')
    setWrappedSeen(true)
    supabaseStaff.auth.updateUser({ data: { wrapped_seen_week: weekKey } }).catch(() => {})
  }

  const xp = staffXP || 0
  const level = getLevel(xp)
  const progress = getXPProgress(xp)
  const showGettingStarted = staffLoaded && xp === 0 && !gsState.dismissed && !(gsState.perfil && gsState.carta && gsState.ubicaciones)

  async function handleSignOut() {
    await supabaseCamaut.auth.signOut()
    navigate('/camaut/login')
  }

  let alreadyOnboarded = false
  try {
    const raw = localStorage.getItem('sb-camaut-auth') || localStorage.getItem('sb-staff-auth')
    const uid = raw ? JSON.parse(raw)?.user?.id : null
    if (uid) alreadyOnboarded = localStorage.getItem(`camaut-onboarded-${uid}`) === '1'
  } catch { /* ignore */ }

  if (!venueId && linkedVenues.length === 0 && !alreadyOnboarded) {
    return (
      <CamautOnboardingPage
        staffName={staffName}
        venueId={venueId}
        onComplete={() => window.location.reload()}
      />
    )
  }

  return (
    <div className="flex flex-col bg-[#F0F4F8]" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="bg-white border-b border-black/8 px-5 pb-0 shadow-sm flex-shrink-0" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#008080] flex items-center justify-center text-white font-bold text-base flex-shrink-0">
              {staffName?.slice(0, 2).toUpperCase() || 'CA'}
            </div>
            <div>
              <p className="font-bold text-[#1A2A3A] text-sm leading-tight">{staffName || 'Camarero'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px]">{level.icon}</span>
                <span className="text-[10px] text-[#008080] font-semibold">{level.name}</span>
                <span className="text-[10px] text-[#B0BEC5]">· {xp.toLocaleString()} XP</span>
              </div>
              <div className="w-24 h-1 bg-[#E8EDF2] rounded-full mt-1">
                <div className="h-1 bg-[#008080] rounded-full" style={{ width: `${progress.percent}%` }} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => window.location.reload()} className="text-[#8896A5]" title="Actualizar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
              </svg>
            </button>
            <button onClick={handleSignOut} className="text-[#8896A5] text-xs underline">Salir</button>
          </div>
        </div>

        <div className="flex">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 border-b-2 text-[9px] font-semibold uppercase tracking-wide transition-colors ${
                tab === t.id ? 'border-[#008080] text-[#008080]' : 'border-transparent text-[#8896A5]'
              }`}
            >
              <div className="relative">
                {t.icon}
                {t.id === 'pedidos' && waiterCallCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[8px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5 leading-none">
                    {waiterCallCount}
                  </span>
                )}
                {t.id === 'micapy' && wrappedReady && !wrappedSeen && (
                  <span className="absolute -top-1.5 -right-2.5 bg-amber-400 w-3.5 h-3.5 rounded-full" />
                )}
              </div>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col">
      {/* Wrapped notification banner */}
      {wrappedReady && !wrappedSeen && !showWrapped && (
        <button
          onClick={openWrapped}
          className="w-full bg-amber-400 text-white text-xs font-bold py-2.5 px-4 flex items-center justify-between"
        >
          <span className="flex items-center gap-1.5"><BoltIcon size={12} /> Tu Weekly Wrapped está listo</span>
          <span className="text-white/80">Ver →</span>
        </button>
      )}

      {/* Install reminder — dismissible permanently via localStorage */}
      {showInstallBanner && (
        <div className="mx-3 mt-3 bg-[#E8F5F5] border border-[#008080]/20 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#008080]/15 flex items-center justify-center flex-shrink-0 text-[#008080]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4"/><path d="M8 12l4 4 4-4"/><rect x="3" y="18" width="18" height="3" rx="1.5"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#1A2A3A] font-semibold text-sm leading-tight">Instalá la app</p>
            <p className="text-[#5A8A8A] text-xs mt-0.5">Recibí notificaciones de pedidos en tu celu</p>
          </div>
          {isIOS ? (
            <button
              onClick={() => setShowInstallModal(true)}
              className="text-[#008080] text-xs font-bold flex-shrink-0 bg-white px-3 py-1.5 rounded-lg border border-[#008080]/20"
            >
              Cómo →
            </button>
          ) : installPrompt ? (
            <button
              onClick={() => installPrompt.prompt()}
              className="text-[#008080] text-xs font-bold flex-shrink-0 bg-white px-3 py-1.5 rounded-lg border border-[#008080]/20"
            >
              Instalar →
            </button>
          ) : null}
          <button onClick={dismissInstallBanner} className="text-[#A0B4B4] text-xl leading-none flex-shrink-0 ml-1">×</button>
        </div>
      )}

      {/* Primeros pasos */}
      {tab === 'tomar' && showGettingStarted && (
        <div className="mx-4 mt-4 bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
            <div>
              <p className="font-bold text-[#1A2A3A] text-sm">Primeros pasos</p>
              <p className="text-[#8896A5] text-xs mt-0.5">Completá estas acciones para sacar el máximo provecho</p>
            </div>
            <button onClick={() => updateGs({ dismissed: true })} className="text-[#B0BEC5] text-xl leading-none flex-shrink-0 mt-0.5">×</button>
          </div>
          <div className="divide-y divide-black/5">
            {[
              {
                id: 'perfil',
                label: 'Completá tu perfil',
                desc: 'Foto, alias y datos para tu página pública',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              },
              {
                id: 'carta',
                label: 'Cargá tu carta con IA',
                desc: 'Sacale una foto al menú y la IA lo sube en segundos',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              },
              {
                id: 'ubicaciones',
                label: 'Agregá ubicaciones',
                desc: 'Mesas, barras y salones de tu lugar de trabajo',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => goToSection(item.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-[#F0F4F8] transition-colors"
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${gsState[item.id] ? 'bg-[#008080] border-[#008080]' : 'border-[#B0BEC5]'}`}>
                  {gsState[item.id] && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold leading-tight ${gsState[item.id] ? 'text-[#8896A5] line-through' : 'text-[#1A2A3A]'}`}>{item.label}</p>
                  <p className="text-[#8896A5] text-xs mt-0.5">{item.desc}</p>
                </div>
                <div className={`flex-shrink-0 ${gsState[item.id] ? 'text-[#008080]' : 'text-[#B0BEC5]'}`}>{item.icon}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contenido */}
      {tab === 'tomar' && <WaiterOrderCamaut venueId={venueId} linkedVenues={linkedVenues} prefillLocation={prefillLocation} onPrefillUsed={() => setPrefillLocation(null)} onXPUpdate={xp => setStaffXP(xp)} />}
      {tab === 'pedidos' && <CamautKanban venueId={venueId} linkedVenues={linkedVenues} staffId={staffId} onNewOrderForTable={handleNewOrderForTable} />}
      {tab === 'turno' && <ShiftSummaryPage embedded venueId={venueId} staffId={staffId} />}

      {showWrapped && (
        <WeeklyWrapped
          staffId={staffId}
          staffAlias={staffAlias}
          staffName={staffName}
          staffAvatarUrl={staffAvatarUrl}
          venueNames={linkedVenues.map(v => v.name.replace(' — Capy', '').replace(' - Capy', ''))}
          period={wrappedPeriod}
          onClose={() => setShowWrapped(false)}
        />
      )}

      {showPeriodPicker && (
        <div
          className="fixed inset-0 z-40 bg-black/40 flex items-end"
          onClick={() => setShowPeriodPicker(false)}
        >
          <div
            className="w-full bg-white rounded-t-3xl px-5 pt-5 pb-10 space-y-2"
            onClick={e => e.stopPropagation()}
          >
            <p className="font-bold text-[#1A2A3A] text-base mb-4">Elegí tu Wrapped</p>
            {[
              { id: 'week', Icon: BoltIcon, label: 'Esta semana', desc: 'Desde el lunes hasta hoy' },
              { id: 'month', Icon: CalendarIcon, label: 'Este mes', desc: new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }) },
              { id: 'year', Icon: CalendarIcon, label: 'Este año', desc: String(new Date().getFullYear()) },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => {
                  setWrappedPeriod(p.id)
                  setShowPeriodPicker(false)
                  openWrapped()
                }}
                className="w-full bg-[#F0F4F8] rounded-2xl px-4 py-3.5 text-left flex items-center justify-between active:scale-95 transition-transform"
              >
                <div>
                  <p className="font-bold text-[#1A2A3A] text-sm flex items-center gap-1.5"><p.Icon size={13} /> {p.label}</p>
                  <p className="text-[#8896A5] text-xs mt-0.5">{p.desc}</p>
                </div>
                <span className="text-[#008080] font-bold">→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showInstallModal && (
        <div
          className="fixed inset-0 z-40 bg-black/40 flex items-end"
          onClick={() => setShowInstallModal(false)}
        >
          <div
            className="w-full bg-white rounded-t-3xl px-5 pt-5 pb-10"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <p className="font-bold text-[#1A2A3A] text-base">Agregá al escritorio</p>
              <button onClick={() => setShowInstallModal(false)} className="text-[#B0BEC5] text-xl leading-none">×</button>
            </div>
            <div className="space-y-4">
              {[
                {
                  n: '1',
                  text: 'Tocá el botón Compartir en Safari',
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#008080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                },
                {
                  n: '2',
                  text: 'Deslizá y tocá "Agregar a pantalla de inicio"',
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#008080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                },
                {
                  n: '3',
                  text: 'Confirmá tocando "Agregar"',
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#008080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                },
              ].map(step => (
                <div key={step.n} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#E8F5F5] flex items-center justify-center flex-shrink-0 text-[#008080] font-bold text-sm">
                    {step.n}
                  </div>
                  <div className="flex-1 flex items-center justify-between gap-3">
                    <p className="text-[#1A2A3A] text-sm">{step.text}</p>
                    <div className="flex-shrink-0">{step.icon}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[#8896A5] text-xs text-center mt-5">Solo funciona desde Safari en iPhone/iPad</p>
          </div>
        </div>
      )}

      {tab === 'micapy' && (
        <div className="bg-[#F0F4F8]">
          {!micapyTab ? (
            <div className="px-4 pt-5 pb-8">
              <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-4 px-1">Mi Capy</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ...MICAPY_ITEMS,
                  ...(!isStandalone && !appInstalled ? [{
                    id: 'instalar',
                    label: 'Instalar app',
                    desc: 'Agregá al escritorio',
                    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4"/><path d="M8 12l4 4 4-4"/><rect x="3" y="18" width="18" height="3" rx="1.5"/></svg>
                  }] : [])
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'instalar') {
                        if (isIOS) { setShowInstallModal(true) }
                        else if (installPrompt) { installPrompt.prompt() }
                      } else if (item.id === 'perfil') { setMicapyTab('perfil'); setMicapySubTab('datos') }
                      else if (item.id === 'progreso') { setMicapyTab('progreso'); setMicapySubTab('carrera') }
                      else if (item.id === 'estadisticas') { setMicapyTab('estadisticas'); setMicapySubTab('indicadores') }
                      else if (item.id === 'social') { setMicapyTab('social'); setMicapySubTab('pagina') }
                      else if (item.id === 'carta') { setMicapyTab('carta'); setMicapySubTab('menu') }
                      else { setMicapyTab(item.id) }
                    }}
                    className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm text-left flex flex-col gap-2 active:scale-95 transition-transform"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#E8F5F5] flex items-center justify-center text-[#008080]">
                      {item.icon}
                    </div>
                    <div>
                      <p className="font-bold text-[#1A2A3A] text-sm leading-tight">{item.label}</p>
                      <p className="text-[#8896A5] text-[11px] mt-0.5 leading-tight">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white border-b border-black/8 px-4 py-3 flex items-center gap-3">
                <button onClick={() => setMicapyTab(null)} className="text-[#008080] text-sm font-semibold">← Volver</button>
                <p className="font-bold text-[#1A2A3A] text-sm">{MICAPY_ITEMS.find(i => i.id === micapyTab)?.label}</p>
              </div>

              {/* Sub-tabs para ítems fusionados */}
              {['perfil', 'progreso', 'estadisticas', 'social', 'carta'].includes(micapyTab) && (
                <div className="bg-white border-b border-black/8 px-4 flex gap-1 pb-0">
                  {micapyTab === 'perfil' && [
                    { id: 'datos', label: 'Mis Datos' },
                    { id: 'pro', label: 'CV Pro' },
                  ].map(s => (
                    <button key={s.id} onClick={() => setMicapySubTab(s.id)}
                      className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${micapySubTab === s.id ? 'border-[#008080] text-[#008080]' : 'border-transparent text-[#8896A5]'}`}>
                      {s.label}
                    </button>
                  ))}
                  {micapyTab === 'progreso' && [
                    { id: 'carrera', label: 'Mi Carrera' },
                    { id: 'ranking', label: 'Ranking' },
                  ].map(s => (
                    <button key={s.id} onClick={() => setMicapySubTab(s.id)}
                      className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${micapySubTab === s.id ? 'border-[#008080] text-[#008080]' : 'border-transparent text-[#8896A5]'}`}>
                      {s.label}
                    </button>
                  ))}
                  {micapyTab === 'estadisticas' && [
                    { id: 'indicadores', label: 'Indicadores' },
                    { id: 'encuesta', label: 'Encuesta' },
                    { id: 'historial', label: 'Historial' },
                  ].map(s => (
                    <button key={s.id} onClick={() => setMicapySubTab(s.id)}
                      className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${micapySubTab === s.id ? 'border-[#008080] text-[#008080]' : 'border-transparent text-[#8896A5]'}`}>
                      {s.label}
                    </button>
                  ))}
                  {micapyTab === 'social' && [
                    { id: 'pagina', label: 'Mi Página' },
                    { id: 'wrapped', label: 'Wrapped' },
                  ].map(s => (
                    <button key={s.id} onClick={() => setMicapySubTab(s.id)}
                      className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${micapySubTab === s.id ? 'border-[#008080] text-[#008080]' : 'border-transparent text-[#8896A5]'}`}>
                      {s.label}
                    </button>
                  ))}
                  {micapyTab === 'carta' && [
                    { id: 'menu', label: 'Carta' },
                    { id: 'notas', label: 'Notas' },
                  ].map(s => (
                    <button key={s.id} onClick={() => setMicapySubTab(s.id)}
                      className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${micapySubTab === s.id ? 'border-[#008080] text-[#008080]' : 'border-transparent text-[#8896A5]'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="px-5 py-5">
                {micapyTab === 'progreso' && micapySubTab === 'carrera' && <MiCarrera venueId={venueId} />}
                {micapyTab === 'progreso' && micapySubTab === 'ranking' && <RankingMozos globalOnly />}
                {micapyTab === 'estadisticas' && ['indicadores', 'encuesta'].includes(micapySubTab) && (
                  <div className="flex gap-2 mb-4">
                    <div className="flex-1">
                      <p className="text-[#8896A5] text-[10px] font-semibold uppercase tracking-wide mb-1">Desde</p>
                      <input type="date" value={statsDesde} max={statsHasta}
                        onChange={e => e.target.value && setStatsDesde(e.target.value)}
                        className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-sm text-[#1A2A3A] font-semibold" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[#8896A5] text-[10px] font-semibold uppercase tracking-wide mb-1">Hasta</p>
                      <input type="date" value={statsHasta} min={statsDesde} max={new Date().toISOString().slice(0, 10)}
                        onChange={e => e.target.value && setStatsHasta(e.target.value)}
                        className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-sm text-[#1A2A3A] font-semibold" />
                    </div>
                  </div>
                )}
                {micapyTab === 'estadisticas' && micapySubTab === 'indicadores' && <IndicadoresTab venueId={venueId} staffId={staffId} desde={statsDesde} hasta={statsHasta} />}
                {micapyTab === 'estadisticas' && micapySubTab === 'encuesta' && <EncuestaTab staffId={staffId} desde={statsDesde} hasta={statsHasta} />}
                {micapyTab === 'estadisticas' && micapySubTab === 'historial' && <HistorialTab staffId={staffId} venueId={venueId} />}
                {micapyTab === 'social' && micapySubTab === 'pagina' && (
                  <div className="space-y-3">
                    <button
                      onClick={() => navigate(`/c/${staffAlias || staffId}`)}
                      className="w-full rounded-2xl overflow-hidden text-left active:scale-[0.98] transition-transform"
                      style={{ background: 'linear-gradient(135deg, #006666 0%, #008080 100%)' }}
                    >
                      <div className="px-5 py-5 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-0.5">Tu perfil público</p>
                          <p className="text-white font-bold text-base leading-tight">Ver mi página</p>
                          <p className="text-white/70 text-xs mt-1">capyapp.co/c/{staffAlias || staffId?.slice(0,8)}</p>
                        </div>
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                          </svg>
                        </div>
                      </div>
                    </button>
                  </div>
                )}
                {micapyTab === 'social' && micapySubTab === 'wrapped' && (
                  <div className="space-y-3">
                    {[
                      { id: 'week', Icon: BoltIcon, label: 'Esta semana', desc: 'Desde el lunes hasta hoy' },
                      { id: 'month', Icon: CalendarIcon, label: 'Este mes', desc: new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }) },
                      { id: 'year', Icon: CalendarIcon, label: 'Este año', desc: String(new Date().getFullYear()) },
                    ].map(p => (
                      <button key={p.id} onClick={() => { setWrappedPeriod(p.id); openWrapped() }}
                        className="w-full bg-white rounded-2xl px-4 py-3.5 text-left flex items-center justify-between border border-black/5 shadow-sm active:scale-95 transition-transform">
                        <div>
                          <p className="font-bold text-[#1A2A3A] text-sm flex items-center gap-1.5"><p.Icon size={13} /> {p.label}</p>
                          <p className="text-[#8896A5] text-xs mt-0.5">{p.desc}</p>
                        </div>
                        <span className="text-[#008080] font-bold">→</span>
                      </button>
                    ))}
                  </div>
                )}
                {micapyTab === 'vincular' && <VincularTab />}
                {micapyTab === 'perfil' && micapySubTab === 'datos' && <CamautConfigPage key="perfil" embedded initialTab="perfil" />}
                {micapyTab === 'perfil' && micapySubTab === 'pro' && (
                  <>
                    <button
                      onClick={() => navigate(`/cv/${staffAlias || staffId}`)}
                      className="w-full mb-4 rounded-2xl overflow-hidden text-left active:scale-[0.98] transition-transform"
                      style={{ background: 'linear-gradient(135deg, #006666 0%, #008080 60%, #00A3A3 100%)' }}
                    >
                      <div className="px-5 py-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-0.5">Capy Pro</p>
                          <p className="text-white font-bold text-base leading-tight">Tu carrera profesional</p>
                          <p className="text-white/70 text-xs mt-1">CV certificado · PDF descargable · QR verificado</p>
                        </div>
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                          </svg>
                        </div>
                      </div>
                    </button>
                    <PerfilProPage venueId={venueId} />
                  </>
                )}
                {micapyTab === 'carta' && micapySubTab === 'menu' && <CamautConfigPage key="carta" embedded initialTab="carta" />}
                {micapyTab === 'carta' && micapySubTab === 'notas' && <CamautConfigPage key="notas-en-carta" embedded initialTab="notas" />}
                {micapyTab === 'ubicaciones' && <UbicacionesViewer linkedVenues={linkedVenues} venueId={venueId} />}
                {micapyTab === 'soporte' && <SoporteTab staffId={staffId} staffName={staffName} />}
                {micapyTab === 'invitar' && <InvitarTab staffName={staffName} />}
              </div>
            </>
          )}
        </div>
      )}
      </div>
    </div>
  )
}

function UbicacionesViewer({ linkedVenues, venueId }) {
  const [subTab, setSubTab] = useState('salones')
  const [venueZones, setVenueZones] = useState({})
  const [ownZones, setOwnZones] = useState(null)

  useEffect(() => {
    if (!linkedVenues?.length) return
    linkedVenues.forEach(async venue => {
      const { data } = await supabaseStaff
        .from('venue_zones')
        .select('*')
        .eq('venue_id', venue.id)
        .eq('is_active', true)
        .order('sort_order')
      setVenueZones(prev => ({ ...prev, [venue.id]: data || [] }))
    })
  }, [linkedVenues])

  useEffect(() => {
    if (!venueId || linkedVenues?.length) return
    supabaseStaff
      .from('venue_zones')
      .select('*')
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setOwnZones(data || []))
  }, [venueId, linkedVenues])

  if (!linkedVenues?.length && !venueId) {
    return (
      <p className="text-[#8896A5] text-sm text-center py-8">
        No estás vinculado a ningún restaurante.
      </p>
    )
  }

  const showTabs = !!venueId

  return (
    <div>
      {showTabs && (
        <div className="flex gap-1 bg-[#F0F4F8] rounded-2xl p-1 mb-4">
          {[
            { id: 'salones', label: 'Salones' },
            { id: 'cartas', label: 'Por Carta' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${subTab === t.id ? 'bg-white text-[#008080] shadow-sm' : 'text-[#8896A5]'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {subTab === 'salones' && (
        !linkedVenues?.length ? (
          <div>
            <FloorPlanViewer
              zones={ownZones || []}
              venueId={venueId}
              supabaseClient={supabaseStaff}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {linkedVenues.map(venue => {
              const zones = venueZones[venue.id] || []
              return (
                <div key={venue.id}>
                  <p className="font-semibold text-[#1A2A3A] text-sm mb-3">
                    {venue.name.replace(' — Capy', '')}
                  </p>
                  <FloorPlanViewer
                    zones={zones}
                    venueId={venue.id}
                    supabaseClient={supabaseStaff}
                  />
                </div>
              )
            })}
          </div>
        )
      )}

      {subTab === 'cartas' && venueId && (
        <MenuZonasTab venueId={venueId} />
      )}
    </div>
  )
}

function MenuZonasTab({ venueId }) {
  const [menus, setMenus] = useState([])
  const [selectedMenuId, setSelectedMenuId] = useState(null)
  const [zones, setZones] = useState([])
  const [loadingMenus, setLoadingMenus] = useState(true)
  const [loadingZones, setLoadingZones] = useState(false)
  const [newZoneName, setNewZoneName] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    supabaseStaff
      .from('staff_menus')
      .select('id, name')
      .eq('venue_id', venueId)
      .order('created_at')
      .then(({ data }) => {
        setMenus(data || [])
        setLoadingMenus(false)
      })
  }, [venueId])

  useEffect(() => {
    if (loadingMenus) return
    setLoadingZones(true)
    let query = supabaseStaff
      .from('venue_zones')
      .select('*')
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .order('sort_order')
    if (selectedMenuId) {
      query = query.eq('menu_id', selectedMenuId)
    } else {
      query = query.is('menu_id', null)
    }
    query.then(({ data }) => {
      setZones(data || [])
      setLoadingZones(false)
    })
  }, [selectedMenuId, venueId, loadingMenus])

  async function addZone() {
    const name = newZoneName.trim()
    if (!name) return
    setAdding(true)
    const { data } = await supabaseStaff
      .from('venue_zones')
      .insert({ venue_id: venueId, name, type: 'mesa', is_active: true, menu_id: selectedMenuId || null, sort_order: zones.length })
      .select()
      .single()
    if (data) setZones(prev => [...prev, data])
    setNewZoneName('')
    setAdding(false)
  }

  async function removeZone(id) {
    await supabaseStaff.from('venue_zones').update({ is_active: false }).eq('id', id)
    setZones(prev => prev.filter(z => z.id !== id))
  }

  if (loadingMenus) return <p className="text-[#8896A5] text-sm text-center py-8">Cargando cartas...</p>

  const selectedMenu = menus.find(m => m.id === selectedMenuId)
  const selectedLabel = selectedMenu ? selectedMenu.name : 'General'

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[#8896A5] text-[10px] font-semibold uppercase tracking-wide mb-2">Carta</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedMenuId(null)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              selectedMenuId === null ? 'bg-[#008080] text-white border-[#008080]' : 'bg-white text-[#8896A5] border-black/10'
            }`}
          >
            General
          </button>
          {menus.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedMenuId(m.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                selectedMenuId === m.id ? 'bg-[#008080] text-white border-[#008080]' : 'bg-white text-[#8896A5] border-black/10'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
        {menus.length === 0 && (
          <p className="text-[#B0BEC5] text-xs mt-2">No tenés cartas creadas. Creá una desde Mis Cartas.</p>
        )}
      </div>

      <div>
        <p className="text-[#8896A5] text-[10px] font-semibold uppercase tracking-wide mb-2">
          Mesas · {selectedLabel}
        </p>
        {loadingZones ? (
          <p className="text-[#8896A5] text-sm text-center py-4">Cargando...</p>
        ) : zones.length === 0 ? (
          <p className="text-[#B0BEC5] text-sm text-center py-4">Sin mesas para esta carta.</p>
        ) : (
          <div className="space-y-2">
            {zones.map(zone => (
              <div key={zone.id} className="bg-white rounded-2xl px-4 py-3 border border-black/5 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#1A2A3A] text-sm">{zone.name}</p>
                  <p className="text-[#B0BEC5] text-xs capitalize">{zone.type}</p>
                </div>
                <button
                  onClick={() => removeZone(zone.id)}
                  className="text-red-400 text-xs underline flex-shrink-0"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-[#8896A5] text-[10px] font-semibold uppercase tracking-wide mb-2">Agregar mesa</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newZoneName}
            onChange={e => setNewZoneName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !adding && newZoneName.trim() && addZone()}
            placeholder={`Ej: Mesa 1, Barra, VIP…`}
            className="flex-1 bg-white border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#1A2A3A] focus:outline-none focus:border-[#008080]"
          />
          <button
            onClick={addZone}
            disabled={adding || !newZoneName.trim()}
            className="bg-[#008080] disabled:opacity-50 text-white font-bold px-5 rounded-2xl text-sm flex-shrink-0"
          >
            {adding ? '…' : '+'}
          </button>
        </div>
      </div>
    </div>
  )
}

function fmtDateShort(iso) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y.slice(2)}`
}

function IndicadoresTab({ venueId, staffId, desde, hasta }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!staffId) { setLoading(false); return }
    loadData()
  }, [staffId, desde, hasta])

  async function loadData() {
    setLoading(true)
    const start = new Date(desde); start.setHours(0, 0, 0, 0)
    const end = new Date(hasta); end.setHours(23, 59, 59, 999)

    const [ordersRes, tipsRes, ratingsRes] = await Promise.all([
      supabaseStaff.from('orders').select('total, created_at').eq('venue_id', venueId).eq('assigned_staff_id', staffId)
        .gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
      supabaseStaff.from('waiter_tips').select('amount, created_at').eq('staff_id', staffId)
        .gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
      supabaseStaff.from('order_feedback').select('rating').eq('staff_id', staffId)
        .gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
    ])

    const orders = ordersRes.data || []
    const tips = tipsRes.data || []
    const ratings = ratingsRes.data || []
    const totalVendido = orders.reduce((s, o) => s + (o.total || 0), 0)

    setData({
      pedidos: orders.length,
      propinas: tips.reduce((s, t) => s + (t.amount || 0), 0),
      ticketPromedio: orders.length ? totalVendido / orders.length : 0,
      totalVendido,
      calificacion: ratings.length ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1) : null,
      calificacionCount: ratings.length,
    })
    setLoading(false)
  }

  const rangeLabel = `${fmtDateShort(desde)} – ${fmtDateShort(hasta)}`

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="text-[#8896A5] text-sm text-center py-8">Cargando...</p>
      ) : !staffId || !data ? (
        <p className="text-[#8896A5] text-sm text-center py-8">No se encontró tu perfil.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Pedidos', value: String(data.pedidos), sub: rangeLabel, mono: false },
            { label: 'Propinas', value: formatPrice(data.propinas), sub: rangeLabel, mono: true },
            { label: 'Total vendido', value: formatPrice(data.totalVendido), sub: rangeLabel, mono: true, full: true },
            { label: 'Ticket promedio', value: formatPrice(data.ticketPromedio), sub: rangeLabel, mono: true },
            { label: 'Calificación', value: data.calificacion ? `${data.calificacion}/5` : '—', sub: data.calificacion ? `${data.calificacionCount} opiniones` : 'Sin datos', mono: false },
          ].map(kpi => (
            <div key={kpi.label} className={`bg-white rounded-2xl p-4 border border-black/5 shadow-sm ${kpi.full ? 'col-span-2' : ''}`}>
              <p className="text-[#8896A5] text-xs mb-1">{kpi.label}</p>
              <p className={`font-bold text-[#1A2A3A] text-xl leading-tight ${kpi.mono ? 'font-mono' : ''}`}>{kpi.value}</p>
              <p className="text-[#B0BEC5] text-[10px] mt-0.5">{kpi.sub}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EncuestaTab({ staffId, desde, hasta }) {
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(true)

  const FACE_LABELS = ['', 'Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente']
  const FACE_COLORS = ['', 'text-red-700', 'text-orange-600', 'text-amber-600', 'text-[#4DD0E1]', 'text-emerald-500']

  useEffect(() => {
    if (!staffId) { setLoading(false); return }
    loadData()
  }, [staffId, desde, hasta])

  async function loadData() {
    const start = new Date(desde); start.setHours(0, 0, 0, 0)
    const end = new Date(hasta); end.setHours(23, 59, 59, 999)
    const { data } = await supabaseStaff
      .from('order_feedback')
      .select('rating, notes, created_at')
      .eq('staff_id', staffId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false })
    setFeedback(data || [])
    setLoading(false)
  }

  if (loading) return <p className="text-[#8896A5] text-sm text-center py-8">Cargando...</p>
  if (!staffId) return <p className="text-[#8896A5] text-sm text-center py-8">No se encontró tu perfil.</p>
  if (!feedback?.length) return <p className="text-[#8896A5] text-sm text-center py-8">Sin encuestas en los últimos 30 días.</p>

  const avg = (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1)
  const dist = [5, 4, 3, 2, 1].map(r => ({ rating: r, count: feedback.filter(f => f.rating === r).length }))
  const withNotes = feedback.filter(f => f.notes)

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm text-center">
        <p className="text-[#8896A5] text-xs mb-1">Promedio últimos 30 días</p>
        <p className="font-mono font-bold text-[#008080] text-4xl">{avg}</p>
        <p className="text-[#8896A5] text-xs mt-1">{feedback.length} opiniones</p>
      </div>
      <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm space-y-2">
        {dist.map(({ rating, count }) => (
          <div key={rating} className="flex items-center gap-2">
            <span className={`text-xs font-semibold w-16 flex-shrink-0 ${FACE_COLORS[rating]}`}>{FACE_LABELS[rating]}</span>
            <div className="flex-1 h-2 bg-[#F0F4F8] rounded-full overflow-hidden">
              <div
                className="h-2 bg-[#4DD0E1] rounded-full"
                style={{ width: feedback.length ? `${(count / feedback.length) * 100}%` : '0%' }}
              />
            </div>
            <span className="text-[#8896A5] text-xs w-4 text-right flex-shrink-0">{count}</span>
          </div>
        ))}
      </div>
      {withNotes.length > 0 && (
        <div>
          <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-2">Comentarios</p>
          <div className="space-y-2">
            {withNotes.map((f, i) => (
              <div key={i} className="bg-white rounded-xl px-4 py-3 border border-black/5 shadow-sm">
                <span className={`text-xs font-semibold ${FACE_COLORS[f.rating]}`}>{FACE_LABELS[f.rating]}</span>
                <p className="text-[#8896A5] text-sm italic mt-1">"{f.notes}"</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SoporteTab({ staffId, staffName }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [tickets, setTickets] = useState([])

  useEffect(() => {
    if (!staffId) return
    supabaseStaff
      .from('support_tickets')
      .select('id, message, status, response, created_at')
      .eq('staff_id', staffId)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setTickets(data || []))
  }, [staffId, sent])

  async function handleSend() {
    if (!message.trim()) return
    setSending(true)
    setError('')
    try {
      const { data: { session } } = await supabaseCamaut.auth.getSession()
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ staff_id: staffId, staff_name: staffName, message }),
      })
      if (!res.ok) {
        const text = await res.text()
        console.error('support-ticket error:', res.status, text)
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Error')
      setSent(true)
    } catch (err) {
      console.error('support-ticket:', err)
      setError('No pudimos enviar tu mensaje. Intentá de nuevo.')
    }
    setSending(false)
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-[#E8F5F5] flex items-center justify-center text-[#008080] text-2xl">✓</div>
        <p className="font-bold text-[#1A2A3A] text-base">Mensaje enviado</p>
        <p className="text-[#8896A5] text-sm">El equipo de Capy lo va a revisar pronto.</p>
        <button onClick={() => { setSent(false); setMessage('') }} className="text-[#008080] text-sm underline mt-2">Enviar otro mensaje</button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {tickets.length > 0 && (
        <div className="space-y-2">
          <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide">Mis mensajes anteriores</p>
          {tickets.map(t => {
            const elapsed = Math.round((Date.now() - new Date(t.created_at).getTime()) / 60000)
            const timeLabel = elapsed < 60 ? `${elapsed}m` : elapsed < 1440 ? `${Math.round(elapsed / 60)}h` : `${Math.round(elapsed / 1440)}d`
            return (
              <div key={t.id} className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    t.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {t.status === 'resolved' ? 'Respondido' : 'Pendiente'}
                  </span>
                  <span className="text-[#B0BEC5] text-xs">{timeLabel}</span>
                </div>
                <p className="text-[#8896A5] text-sm mt-1">{t.message}</p>
                {t.response && (
                  <div className="mt-2 bg-[#E8F5F5] rounded-xl px-3 py-2">
                    <p className="text-[#008080] text-[10px] font-bold uppercase mb-0.5">Respuesta de Capy</p>
                    <p className="text-[#1A2A3A] text-sm">{t.response}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide">Nuevo mensaje</p>
      <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm">
        <p className="text-[#8896A5] text-xs mb-1">De</p>
        <p className="font-semibold text-[#1A2A3A] text-sm">{staffName || 'Camarero'}</p>
      </div>
      <div>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Contanos en qué podemos ayudarte..."
          rows={5}
          className="w-full bg-white border border-black/10 rounded-2xl px-4 py-3 text-sm text-[#1A2A3A] resize-none focus:outline-none focus:border-[#008080]"
        />
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <button
        onClick={handleSend}
        disabled={sending || !message.trim()}
        className="w-full bg-[#008080] disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl text-sm"
      >
        {sending ? 'Enviando...' : 'Enviar mensaje →'}
      </button>
    </div>
  )
}

function InvitarTab({ staffName }) {
  const [inviteType, setInviteType] = useState('camaut')

  const INVITE_CONFIG = {
    camaut: {
      label: 'Camaut',
      message: `${staffName ? `${staffName} te invita a` : 'Unite a'} Camaut, la app para camareros 🍽️\n\nhttps://capyapp.co`,
    },
    local: {
      label: 'Capy',
      message: `${staffName ? `${staffName} te recomienda` : 'Conocé'} Capy, el sistema de pedidos para restaurantes 🚀\n\nhttps://capyapp.co`,
    },
  }

  async function handleShare() {
    const text = INVITE_CONFIG[inviteType].message
    if (navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch { /* user cancelled or not supported */ }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-4">
      <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide">¿Qué querés invitar?</p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { id: 'camaut', label: 'Camarero', desc: 'Se suma a Camaut' },
          { id: 'local', label: 'Local', desc: 'Registra su restaurante' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setInviteType(t.id)}
            className={`bg-white rounded-2xl p-4 border text-left transition-all ${
              inviteType === t.id ? 'border-[#008080]' : 'border-black/5'
            } shadow-sm`}
          >
            <p className={`font-bold text-sm ${inviteType === t.id ? 'text-[#008080]' : 'text-[#1A2A3A]'}`}>{t.label}</p>
            <p className="text-[#8896A5] text-xs mt-0.5">{t.desc}</p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl px-4 py-3 border border-black/5 shadow-sm">
        <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-2">Vista previa del mensaje</p>
        <p className="text-[#1A2A3A] text-sm whitespace-pre-line">{INVITE_CONFIG[inviteType].message}</p>
      </div>

      <button
        onClick={handleShare}
        className="w-full bg-[#008080] text-white font-bold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        Compartir invitación
      </button>

      <p className="text-[#B0BEC5] text-xs text-center">
        Se abre el menú de compartir para elegir WhatsApp u otra app.
      </p>
    </div>
  )
}

function VincularTab() {
  const navigate = useNavigate()
  const [linkedVenues, setLinkedVenues] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLinked()
  }, [])

  async function loadLinked() {
    let { data: { session } } = await supabaseCamaut.auth.getSession()
    if (!session) {
      const result = await supabaseStaff.auth.getSession()
      session = result.data.session
    }
    if (!session) { setLoading(false); return }
    const { data } = await supabaseStaff
      .from('venue_staff')
      .select('id, status, venue:venues(id, name, slug), joined_at')
      .eq('staff_profile_id', session.user.id)
      .eq('status', 'active')
    setLinkedVenues(data || [])
    setLoading(false)
  }

  async function handleDesvincular(id) {
    await supabaseStaff
      .from('venue_staff')
      .update({ status: 'inactive', left_at: new Date().toISOString() })
      .eq('id', id)
    setLinkedVenues(prev => prev.filter(v => v.id !== id))
  }

  if (loading) return <p className="text-[#8896A5] text-sm text-center py-8">Cargando...</p>

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate('/camaut/vincular')}
        className="w-full bg-[#008080] text-white font-bold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        Vincularme a un restaurante
      </button>

      {linkedVenues.length > 0 && (
        <div>
          <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-2">Restaurantes vinculados</p>
          <div className="space-y-2">
            {linkedVenues.map(v => (
              <div key={v.id} className="bg-white rounded-2xl px-4 py-3 border border-black/5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#1A2A3A] text-sm">{v.venue?.name}</p>
                  <p className="text-[#8896A5] text-xs">Vinculado desde {new Date(v.joined_at).toLocaleDateString('es-AR')}</p>
                </div>
                <button
                  onClick={() => handleDesvincular(v.id)}
                  className="text-red-400 text-xs underline"
                >
                  Desvincular
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {linkedVenues.length === 0 && (
        <p className="text-[#8896A5] text-sm text-center py-4">No estás vinculado a ningún restaurante todavía.</p>
      )}
    </div>
  )
}

function HistorialTab({ staffId, venueId }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [queryError, setQueryError] = useState(null)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    if (!venueId && !staffId) { setLoading(false); return }
    setLoading(true)
    setQueryError(null)

    let orFilter = null
    if (venueId && staffId) {
      orFilter = `venue_id.eq.${venueId},assigned_staff_id.eq.${staffId}`
    }

    let query = supabaseCamaut
      .from('orders')
      .select('id, daily_number, location_label, total, status, created_at, order_items(product_name, quantity, unit_price, item_notes)')
      .neq('status', 'cancelado')
      .order('created_at', { ascending: false })
      .limit(60)

    if (orFilter) {
      query = query.or(orFilter)
    } else if (venueId) {
      query = query.eq('venue_id', venueId)
    } else {
      query = query.eq('assigned_staff_id', staffId)
    }

    query.then(({ data, error }) => {
      if (error) {
        console.error('[HistorialTab] query error:', error.message)
        setQueryError(error.message)
      }
      setOrders(data || [])
      setLoading(false)
    })
  }, [staffId, venueId])

  const STATUS_LABEL = {
    recibido: 'Recibido',
    pendiente_aprobacion: 'Pendiente',
    en_preparacion: 'En preparación',
    listo: 'Listo',
    entregado: 'Entregado',
    cancelado: 'Cancelado',
  }

  function fmtDate(iso) {
    const d = new Date(iso)
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) return <p className="text-[#8896A5] text-sm text-center py-8">Cargando...</p>
  if (queryError) return <p className="text-red-500 text-xs text-center py-8">Error: {queryError}</p>
  if (!orders.length) return <p className="text-[#8896A5] text-sm text-center py-8">Sin pedidos registrados.</p>

  return (
    <div className="space-y-2">
      <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-3">Últimos {orders.length} pedidos</p>
      {orders.map(order => {
        const isExpanded = expanded === order.id
        const items = order.order_items || []
        return (
          <button
            key={order.id}
            onClick={() => setExpanded(prev => prev === order.id ? null : order.id)}
            className="w-full bg-white rounded-2xl px-4 py-3.5 border border-black/5 shadow-sm text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[#008080] font-bold text-sm">#{order.daily_number || order.id.slice(0, 4)}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  order.status === 'entregado' ? 'bg-emerald-100 text-emerald-700' :
                  order.status === 'en_preparacion' || order.status === 'listo' ? 'bg-[#E8F5F5] text-[#008080]' :
                  'bg-[#F0F4F8] text-[#8896A5]'
                }`}>{STATUS_LABEL[order.status] || order.status}</span>
              </div>
              <span className="font-mono font-bold text-[#1A2A3A] text-sm">{formatPrice(order.total)}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[#8896A5] text-xs flex items-center gap-1"><PinIcon size={11} /> {order.location_label}</p>
              <p className="text-[#B0BEC5] text-xs">{fmtDate(order.created_at)}</p>
            </div>
            {isExpanded && items.length > 0 && (
              <div className="mt-2 pt-2 border-t border-black/5 space-y-0.5">
                {items.map((item, i) => (
                  <p key={i} className="text-[#8896A5] text-xs">{item.quantity}× {item.product_name}</p>
                ))}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
