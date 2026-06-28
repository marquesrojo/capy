import { Component, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabaseCamaut } from '../../lib/supabase'
import WaiterOrderPage from './WaiterOrderPage'
import WaiterTrackingPage from './WaiterTrackingPage'
import ShiftSummaryPage from './ShiftSummaryPage'
import MiCarrera from './MiCarrera'
import RankingMozos from './RankingMozos'
import CamautConfigPage from '../camaut/CamautConfigPage'

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

const BASE_TABS = [
  {
    id: 'tomar', label: 'Comanda',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
  },
  {
    id: 'seguimiento', label: 'Pedidos',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
  },
  {
    id: 'turno', label: 'Turno',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
  },
  {
    id: 'carrera', label: 'Carrera',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
  },
  {
    id: 'ranking', label: 'Ranking',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
  },
]

const CONFIG_TAB = {
  id: 'config', label: 'Config',
  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
}

export default function WaiterModePage({ venueId }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('tomar')
  const TABS = profile?.is_autonomous ? [...BASE_TABS, CONFIG_TAB] : BASE_TABS

  async function handleSignOut() {
    await supabaseCamaut.auth.signOut()
    await signOut()
    if (profile?.is_autonomous) {
      navigate('/camaut/login')
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      {/* Header */}
      <div className="bg-[#F0F4F8] border-b border-black/6 px-5 pt-4 pb-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#008080] flex items-center justify-center text-white font-bold text-sm">
              {profile?.full_name?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-[#1A2A3A] text-sm">{profile?.full_name}</p>
              <p className="text-[#008080] text-[10px] font-semibold uppercase tracking-wide">Camarero</p>
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
        {tab === 'tomar' && <WaiterOrderPage venueId={venueId} />}
        {tab === 'seguimiento' && <WaiterTrackingPage venueId={venueId} />}
        {tab === 'turno' && <ShiftSummaryPage embedded venueId={venueId} />}
        {tab === 'carrera' && <MiCarrera venueId={venueId} />}
        {tab === 'ranking' && <RankingMozos />}
        {tab === 'config' && <CamautConfigPage />}
      </ErrorBoundary>
    </div>
  )
}
