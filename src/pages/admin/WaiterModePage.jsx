import { Component, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabaseCamaut } from '../../lib/supabase'
import { getLevel, getXPProgress } from '../../lib/xpUtils'
import WaiterOrderPage from './WaiterOrderPage'
import WaiterTrackingPage from './WaiterTrackingPage'
import ShiftSummaryPage from './ShiftSummaryPage'
import MiCarrera from './MiCarrera'
import RankingMozos from './RankingMozos'
import CamautConfigPage from '../camaut/CamautConfigPage'
import WaiterOrderCamaut from '../camaut/WaiterOrderCamaut'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) {
      return (
        <div className="px-5 py-10">
          <p className="text-red-700 text-sm font-medium mb-2">Error al cargar</p>
          <p className="text-smoke-400 text-xs break-all">{this.state.error?.message || String(this.state.error)}</p>
        </div>
      )
    }
    return this.props.children
  }
}

// Tabs para camarero integrado (5 tabs)
const STAFF_TABS = [
  {
    id: 'tomar', label: 'Comanda',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
  },
  {
    id: 'seguimiento', label: 'Pedidos',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
  },
  {
    id: 'turno', label: 'Turno',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
  },
  {
    id: 'carrera', label: 'Carrera',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
  },
  {
    id: 'ranking', label: 'Ranking',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
  },
]

// Tabs para camarero autónomo (4 tabs — Carrera y Ranking dentro de Mi Capy)
const CAMAUT_TABS = [
  {
    id: 'tomar', label: 'Comanda',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
  },
  {
    id: 'seguimiento', label: 'Pedidos',
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

export default function WaiterModePage({ venueId, staffName, staffXP }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('tomar')
  const [micapyTab, setMicapyTab] = useState('perfil')

  const isAutonomous = profile?.is_autonomous
  const TABS = isAutonomous ? CAMAUT_TABS : STAFF_TABS
  const displayName = staffName || profile?.full_name

  const xp = staffXP || 0
  const level = getLevel(xp)
  const progress = getXPProgress(xp)

  async function handleSignOut() {
    await supabaseCamaut.auth.signOut()
    await signOut()
    if (isAutonomous) navigate('/camaut/login')
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      {/* Header */}
      <div className="bg-white border-b border-black/8 px-5 pt-4 pb-0 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#008080] flex items-center justify-center text-white font-bold text-base flex-shrink-0">
              {displayName?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-[#1A2A3A] text-sm leading-tight">{displayName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px]">{level.icon}</span>
                <span className="text-[10px] text-[#008080] font-semibold">{level.name}</span>
                <span className="text-[10px] text-[#B0BEC5]">· {xp.toLocaleString()} XP</span>
              </div>
              {/* Barra de XP mini */}
              <div className="w-24 h-1 bg-[#E8EDF2] rounded-full mt-1">
                <div className="h-1 bg-[#008080] rounded-full" style={{ width: `${progress.percent}%` }} />
              </div>
            </div>
          </div>
          <button onClick={handleSignOut} className="text-[#8896A5] text-xs underline">Salir</button>
        </div>

        {/* Nav tabs */}
        <div className="flex">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 border-b-2 text-[9px] font-semibold uppercase tracking-wide transition-colors ${
                tab === t.id
                  ? 'border-[#008080] text-[#008080]'
                  : 'border-transparent text-[#8896A5]'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <ErrorBoundary>
        {tab === 'tomar' && (isAutonomous
          ? <WaiterOrderCamaut venueId={venueId} />
          : <WaiterOrderPage venueId={venueId} />
        )}
        {tab === 'seguimiento' && <WaiterTrackingPage venueId={venueId} />}
        {tab === 'turno' && <ShiftSummaryPage embedded venueId={venueId} />}
        {tab === 'carrera' && <MiCarrera venueId={venueId} />}
        {tab === 'ranking' && <RankingMozos />}

        {/* Mi Capy — solo para autónomos */}
        {tab === 'micapy' && (
          <MiCapyPage
            venueId={venueId}
            profile={profile}
            micapyTab={micapyTab}
            setMicapyTab={setMicapyTab}
          />
        )}
      </ErrorBoundary>
    </div>
  )
}

function MiCapyPage({ venueId, profile, micapyTab, setMicapyTab }) {
  const MICAPY_TABS = [
    { id: 'perfil', label: 'Perfil' },
    { id: 'carta', label: 'Carta' },
    { id: 'ubicaciones', label: 'Ubicaciones' },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'carrera', label: 'Carrera' },
    { id: 'ranking', label: 'Ranking' },
  ]

  return (
    <div className="bg-[#F0F4F8] min-h-screen">
      <div className="bg-white border-b border-black/8 px-5 pt-3 pb-0">
        <div className="flex gap-3 overflow-x-auto pb-0">
          {MICAPY_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setMicapyTab(t.id)}
              className={`whitespace-nowrap pb-2.5 text-xs font-semibold border-b-2 ${
                micapyTab === t.id ? 'border-[#008080] text-[#008080]' : 'border-transparent text-[#8896A5]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-5 py-5">
        {micapyTab === 'carrera' && <MiCarrera venueId={venueId} />}
        {micapyTab === 'ranking' && <RankingMozos />}
        {(micapyTab === 'perfil' || micapyTab === 'carta' || micapyTab === 'ubicaciones' || micapyTab === 'whatsapp') && (
          <CamautConfigPage embedded initialTab={micapyTab} />
        )}
      </div>
    </div>
  )
}
