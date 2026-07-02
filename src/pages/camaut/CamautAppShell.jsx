import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseCamaut, supabaseStaff } from '../../lib/supabase'
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
  { id: 'perfil', label: 'Mi Perfil', desc: 'Nombre, foto, datos', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  { id: 'perfil_pro', label: 'Perfil Pro', desc: 'CV gastronómico', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  { id: 'carta', label: 'Mis Cartas', desc: 'Menúes y cartas propias', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
  { id: 'notas', label: 'Notas rápidas', desc: 'Chips para ítems', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
  { id: 'vincular', label: 'Vincular', desc: 'Conectar con restaurantes', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { id: 'ubicaciones', label: 'Ubicaciones', desc: 'Mapa de salones vinculados', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
  { id: 'carrera', label: 'Mi Carrera', desc: 'XP y logros', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
  { id: 'ranking', label: 'Ranking', desc: 'Top mozos globales', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg> },
  { id: 'indicadores', label: 'Indicadores', desc: 'KPIs de tu turno y mes', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { id: 'encuesta', label: 'Encuesta', desc: 'Opiniones de tus clientes', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  { id: 'mi_pagina', label: 'Mi Página', desc: 'Tu landing pública', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
  { id: 'wrapped', label: 'Wrapped', desc: 'Tu resumen semanal, mensual o anual', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
]

export default function CamautAppShell({ venueId, staffName: initialName, staffXP: initialXP, linkedVenues = [], staffId }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState('tomar')
  const [micapyTab, setMicapyTab] = useState(null)
  const [prefillLocation, setPrefillLocation] = useState(null)
  const [waiterCallCount, setWaiterCallCount] = useState(0)
  const [showWrapped, setShowWrapped] = useState(false)
  const [wrappedPeriod, setWrappedPeriod] = useState('week')
  const [showPeriodPicker, setShowPeriodPicker] = useState(false)
  const [wrappedReady, setWrappedReady] = useState(false)
  const [wrappedSeen, setWrappedSeen] = useState(() =>
    localStorage.getItem(`wrapped-seen-${getWeekKey()}`) === '1'
  )

  function handleNewOrderForTable(locationLabel) {
    setPrefillLocation(locationLabel)
    setTab('tomar')
  }
  const [staffName, setStaffName] = useState(initialName)
  const [staffXP, setStaffXP] = useState(initialXP || 0)
  const [staffAlias, setStaffAlias] = useState(null)
  const [staffAvatarUrl, setStaffAvatarUrl] = useState(null)

  useEffect(() => {
    if (!venueId) return
    supabaseStaff
      .from('staff_names')
      .select('full_name, xp, alias, avatar_url')
      .eq('venue_id', venueId)
      .single()
      .then(({ data }) => {
        if (data?.full_name) setStaffName(data.full_name)
        if (data?.xp !== undefined) setStaffXP(data.xp)
        if (data?.alias) setStaffAlias(data.alias.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, ''))
        if (data?.avatar_url) setStaffAvatarUrl(data.avatar_url)
      })
  }, [venueId])

  useEffect(() => {
    if (!venueId) return
    async function checkCalls() {
      const { count } = await supabaseStaff
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('venue_id', venueId)
        .not('waiter_called_at', 'is', null)
        .neq('status', 'entregado')
        .neq('status', 'cancelado')
      setWaiterCallCount(count || 0)
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
    localStorage.setItem(`wrapped-seen-${getWeekKey()}`, '1')
    setWrappedSeen(true)
  }

  const xp = staffXP || 0
  const level = getLevel(xp)
  const progress = getXPProgress(xp)

  async function handleSignOut() {
    await supabaseCamaut.auth.signOut()
    navigate('/camaut/login')
  }

  // Onboarding — camarero nuevo sin venue ni vinculación
  if (!venueId && linkedVenues.length === 0) {
    return (
      <CamautOnboardingPage
        staffName={staffName}
        venueId={venueId}
        onComplete={() => window.location.reload()}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      {/* Header */}
      <div className="bg-white border-b border-black/8 px-5 pt-4 pb-0 shadow-sm">
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
          <button onClick={handleSignOut} className="text-[#8896A5] text-xs underline">Salir</button>
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

      {/* Wrapped notification banner */}
      {wrappedReady && !wrappedSeen && !showWrapped && (
        <button
          onClick={openWrapped}
          className="w-full bg-amber-400 text-white text-xs font-bold py-2.5 px-4 flex items-center justify-between"
        >
          <span>⚡ Tu Weekly Wrapped está listo</span>
          <span className="text-white/80">Ver →</span>
        </button>
      )}

      {/* Contenido */}
      {tab === 'tomar' && <WaiterOrderCamaut venueId={venueId} linkedVenues={linkedVenues} prefillLocation={prefillLocation} onPrefillUsed={() => setPrefillLocation(null)} />}
      {tab === 'pedidos' && <CamautKanban venueId={venueId} linkedVenues={linkedVenues} staffId={staffId} onNewOrderForTable={handleNewOrderForTable} />}
      {tab === 'turno' && <ShiftSummaryPage embedded venueId={venueId} />}

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
              { id: 'week', label: '⚡ Esta semana', desc: 'Desde el lunes hasta hoy' },
              { id: 'month', label: '📅 Este mes', desc: new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }) },
              { id: 'year', label: '🗓️ Este año', desc: String(new Date().getFullYear()) },
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
                  <p className="font-bold text-[#1A2A3A] text-sm">{p.label}</p>
                  <p className="text-[#8896A5] text-xs mt-0.5">{p.desc}</p>
                </div>
                <span className="text-[#008080] font-bold">→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'micapy' && (
        <div className="bg-[#F0F4F8] min-h-screen">
          {!micapyTab ? (
            <div className="px-4 pt-5 pb-8">
              <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-4 px-1">Mi Capy</p>
              <div className="grid grid-cols-2 gap-3">
                {MICAPY_ITEMS.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'mi_pagina') {
                        navigate(`/c/${staffAlias || staffId}`)
                      } else if (item.id === 'wrapped') {
                        setShowPeriodPicker(true)
                      } else {
                        setMicapyTab(item.id)
                      }
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
              <div className="bg-white border-b border-black/8 px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button onClick={() => setMicapyTab(null)} className="text-[#008080] text-sm font-semibold">← Volver</button>
                  <p className="font-bold text-[#1A2A3A] text-sm">{MICAPY_ITEMS.find(i => i.id === micapyTab)?.label}</p>
                </div>
                {micapyTab === 'perfil_pro' && (
                  <button
                    onClick={() => navigate(`/cv/${staffAlias || staffId}`)}
                    className="text-xs font-semibold text-white bg-[#008080] rounded-full px-3 py-1.5 flex items-center gap-1.5"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                    Ver CV
                  </button>
                )}
              </div>
              <div className="px-5 py-5">
                {micapyTab === 'carrera' && <MiCarrera venueId={venueId} />}
                {micapyTab === 'ranking' && <RankingMozos globalOnly />}
                {micapyTab === 'vincular' && <VincularTab />}
                {micapyTab === 'perfil_pro' && <PerfilProPage venueId={venueId} />}
                {micapyTab === 'carta' && <CamautConfigPage key="carta" embedded initialTab="carta" />}
                {micapyTab === 'notas' && <CamautConfigPage key="notas" embedded initialTab="notas" />}
                {micapyTab === 'perfil' && <CamautConfigPage key="perfil" embedded initialTab="perfil" />}
                {micapyTab === 'ubicaciones' && <UbicacionesViewer linkedVenues={linkedVenues} />}
                {micapyTab === 'indicadores' && <IndicadoresTab venueId={venueId} staffId={staffId} />}
                {micapyTab === 'encuesta' && <EncuestaTab staffId={staffId} />}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function UbicacionesViewer({ linkedVenues }) {
  const [venueZones, setVenueZones] = useState({})

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

  if (!linkedVenues?.length) {
    return (
      <p className="text-[#8896A5] text-sm text-center py-8">
        No estás vinculado a ningún restaurante.
      </p>
    )
  }

  return (
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
}

function fmtDateShort(iso) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y.slice(2)}`
}

function IndicadoresTab({ venueId, staffId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const todayIso = new Date().toISOString().slice(0, 10)
  const monthStartIso = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  const [desde, setDesde] = useState(monthStartIso)
  const [hasta, setHasta] = useState(todayIso)

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
      <div className="flex gap-2">
        <div className="flex-1">
          <p className="text-[#8896A5] text-[10px] font-semibold uppercase tracking-wide mb-1">Desde</p>
          <input
            type="date"
            value={desde}
            max={hasta}
            onChange={e => e.target.value && setDesde(e.target.value)}
            className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-sm text-[#1A2A3A] font-semibold"
          />
        </div>
        <div className="flex-1">
          <p className="text-[#8896A5] text-[10px] font-semibold uppercase tracking-wide mb-1">Hasta</p>
          <input
            type="date"
            value={hasta}
            min={desde}
            max={todayIso}
            onChange={e => e.target.value && setHasta(e.target.value)}
            className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-sm text-[#1A2A3A] font-semibold"
          />
        </div>
      </div>

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

function EncuestaTab({ staffId }) {
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(true)

  const FACE_LABELS = ['', 'Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente']
  const FACE_COLORS = ['', 'text-red-700', 'text-orange-600', 'text-amber-600', 'text-[#4DD0E1]', 'text-emerald-500']

  useEffect(() => {
    if (!staffId) { setLoading(false); return }
    loadData()
  }, [staffId])

  async function loadData() {
    const since = new Date()
    since.setDate(since.getDate() - 30)
    const { data } = await supabaseStaff
      .from('order_feedback')
      .select('rating, notes, created_at')
      .eq('staff_id', staffId)
      .gte('created_at', since.toISOString())
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

function VincularTab() {
  const navigate = useNavigate()
  const [linkedVenues, setLinkedVenues] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLinked()
  }, [])

  async function loadLinked() {
    const { data: { session } } = await supabaseCamaut.auth.getSession()
    if (!session) return
    const { data } = await supabaseStaff
      .from('venue_staff')
      .select('id, status, venue:venues(id, name), joined_at')
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
