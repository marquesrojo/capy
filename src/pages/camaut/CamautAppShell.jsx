import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseCamaut, supabaseStaff } from '../../lib/supabase'
import { getLevel, getXPProgress } from '../../lib/xpUtils'
import WaiterOrderCamaut from './WaiterOrderCamaut'
import WaiterTrackingPage from '../admin/WaiterTrackingPage'
import ShiftSummaryPage from '../admin/ShiftSummaryPage'
import MiCarrera from '../admin/MiCarrera'
import RankingMozos from '../admin/RankingMozos'
import CamautConfigPage from './CamautConfigPage'

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

const MICAPY_TABS = ['perfil', 'carta', 'ubicaciones', 'whatsapp', 'carrera', 'ranking']

export default function CamautAppShell({ venueId, staffName: initialName, staffXP: initialXP }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState('tomar')
  const [micapyTab, setMicapyTab] = useState('perfil')
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
      {tab === 'tomar' && <WaiterOrderCamaut venueId={venueId} />}
      {tab === 'pedidos' && <WaiterTrackingPage venueId={venueId} />}
      {tab === 'turno' && <ShiftSummaryPage embedded venueId={venueId} />}

      {tab === 'micapy' && (
        <div className="bg-[#F0F4F8] min-h-screen">
          <div className="bg-white border-b border-black/8 px-5 pt-3 pb-0">
            <div className="flex gap-4 overflow-x-auto">
              {MICAPY_TABS.map(t => (
                <button
                  key={t}
                  onClick={() => setMicapyTab(t)}
                  className={`whitespace-nowrap pb-2.5 text-xs font-semibold capitalize border-b-2 ${
                    micapyTab === t ? 'border-[#008080] text-[#008080]' : 'border-transparent text-[#8896A5]'
                  }`}
                >
                  {t === 'micapy' ? 'Mi Capy' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="px-5 py-5">
            {micapyTab === 'carrera' && <MiCarrera venueId={venueId} />}
            {micapyTab === 'ranking' && <RankingMozos />}
            {['perfil', 'carta', 'ubicaciones', 'whatsapp'].includes(micapyTab) && (
              <CamautConfigPage embedded initialTab={micapyTab} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
