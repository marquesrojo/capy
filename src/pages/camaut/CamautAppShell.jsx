import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseCamaut, supabaseStaff } from '../../lib/supabase'
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
    id: 'turno', label: 'Turno',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
  },
  {
    id: 'micapy', label: 'Mi Capy',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  },
]

const MICAPY_ITEMS = [
  { id: 'perfil', label: 'Mi Perfil', desc: 'Nombre, foto, datos', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  { id: 'perfil_pro', label: 'Perfil Pro', desc: 'CV gastronómico', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  { id: 'carta', label: 'Mis Cartas', desc: 'Menúes y cartas propias', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
  { id: 'notas', label: 'Notas rápidas', desc: 'Chips para ítems', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
  { id: 'vincular', label: 'Vincular', desc: 'Conectar con restaurantes', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { id: 'ubicaciones', label: 'Ubicaciones', desc: 'Mapa de salones vinculados', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
  { id: 'carrera', label: 'Mi Carrera', desc: 'XP y logros', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
  { id: 'ranking', label: 'Ranking', desc: 'Top mozos globales', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg> },
]

export default function CamautAppShell({ venueId, staffName: initialName, staffXP: initialXP, linkedVenues = [], staffId }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState('tomar')
  const [micapyTab, setMicapyTab] = useState(null)
  const [staffName, setStaffName] = useState(initialName)
  const [staffXP, setStaffXP] = useState(initialXP || 0)

  useEffect(() => {
    if (!venueId) return
    supabaseStaff
      .from('staff_names')
      .select('full_name, xp')
      .eq('venue_id', venueId)
      .single()
      .then(({ data }) => {
        if (data?.full_name) setStaffName(data.full_name)
        if (data?.xp !== undefined) setStaffXP(data.xp)
      })
  }, [venueId])

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
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      {tab === 'tomar' && <WaiterOrderCamaut venueId={venueId} linkedVenues={linkedVenues} />}
      {tab === 'pedidos' && <CamautKanban venueId={venueId} linkedVenues={linkedVenues} staffId={staffId} />}
      {tab === 'turno' && <ShiftSummaryPage embedded venueId={venueId} />}

      {tab === 'micapy' && (
        <div className="bg-[#F0F4F8] min-h-screen">
          {!micapyTab ? (
            <div className="px-4 pt-5 pb-8">
              <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-4 px-1">Mi Capy</p>
              <div className="grid grid-cols-2 gap-3">
                {MICAPY_ITEMS.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setMicapyTab(item.id)}
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
              <div className="px-5 py-5">
                {micapyTab === 'carrera' && <MiCarrera venueId={venueId} />}
                {micapyTab === 'ranking' && <RankingMozos globalOnly />}
                {micapyTab === 'vincular' && <VincularTab />}
                {micapyTab === 'perfil_pro' && <PerfilProPage venueId={venueId} />}
                {micapyTab === 'carta' && <CamautConfigPage key="carta" embedded initialTab="carta" />}
                {micapyTab === 'notas' && <CamautConfigPage key="notas" embedded initialTab="notas" />}
                {micapyTab === 'perfil' && <CamautConfigPage key="perfil" embedded initialTab="perfil" />}
                {micapyTab === 'ubicaciones' && <UbicacionesViewer linkedVenues={linkedVenues} />}
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
