import { useEffect, useState } from 'react'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { getLevel } from '../../lib/xpUtils'

export default function RankingMozos({ venueId, globalOnly }) {
  const { profile } = useAuth()
  const [tab, setTab] = useState(globalOnly ? 'global' : 'venue')
  const [ranking, setRanking] = useState([])
  const [myStaffId, setMyStaffId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    loadMyStaff()
  }, [profile])

  useEffect(() => {
    loadRanking()
  }, [tab])

  async function loadMyStaff() {
    const { data } = await supabaseStaff
      .from('staff_names')
      .select('id')
      .eq('venue_id', venueId)
      .ilike('full_name', profile.full_name?.trim() || '')
      .single()
    if (data) setMyStaffId(data.id)
  }

  async function loadRanking() {
    setLoading(true)
    let query = supabaseStaff
      .from('staff_names')
      .select('id, full_name, alias, xp, level, total_orders, streak_days')
      .eq('is_active', true)
      .order('xp', { ascending: false })
      .limit(50)

    if (tab === 'venue') {
      query = query.eq('venue_id', venueId)
    }

    const { data } = await query
    setRanking(data || [])
    setLoading(false)
  }

  const myPosition = ranking.findIndex(s => s.id === myStaffId) + 1
  const top3 = ranking.slice(0, 3)
  const rest = ranking.slice(3)

  const PODIUM_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']
  const PODIUM_SIZES = ['text-4xl', 'text-3xl', 'text-2xl']
  const PODIUM_ORDER = [1, 0, 2] // 2do, 1ro, 3ro visualmente

  return (
    <div className="bg-[#F0F4F8] min-h-screen pb-24">

      {/* Tabs */}
      <div className="px-5 pt-4 pb-2">
        {!globalOnly && (
          <div className="flex gap-2 bg-black/5 rounded-xl p-1 mb-0">
            <button
              onClick={() => setTab('venue')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold ${
                tab === 'venue' ? 'bg-white text-[#008080] shadow-sm' : 'text-[#8896A5]'
              }`}
            >
              Mi Local
            </button>
            <button
              onClick={() => setTab('global')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold ${
                tab === 'global' ? 'bg-white text-[#008080] shadow-sm' : 'text-[#8896A5]'
              }`}
            >
              Global
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-[#8896A5] text-sm">Cargando ranking...</p>
        </div>
      ) : (
        <>
          {/* Podio top 3 */}
          {top3.length > 0 && (
            <div className="px-5 pt-4 pb-6">
              <p className="text-[11px] font-semibold text-[#8896A5] uppercase tracking-wide mb-4 text-center">
                Top 3
              </p>
              <div className="flex items-end justify-center gap-3">
                {PODIUM_ORDER.map(idx => {
                  const waiter = top3[idx]
                  if (!waiter) return <div key={idx} className="w-24" />
                  const pos = idx + 1
                  const isMe = waiter.id === myStaffId
                  const level = getLevel(waiter.xp || 0)
                  return (
                    <div
                      key={waiter.id}
                      className={`flex flex-col items-center ${idx === 0 ? 'mt-4' : idx === 1 ? 'mt-0' : 'mt-8'}`}
                    >
                      <div
                        className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-base mb-2 ${
                          isMe ? 'ring-2 ring-[#008080] ring-offset-2 ring-offset-[#F0F4F8]' : ''
                        }`}
                        style={{ background: PODIUM_COLORS[idx] }}
                      >
                        {(waiter.alias || waiter.full_name)?.slice(0, 2).toUpperCase()}
                      </div>
                      <p className={`text-[11px] font-semibold text-[#1A2A3A] text-center max-w-[80px] truncate`}>
                        {waiter.alias ? `@${waiter.alias}` : waiter.full_name}
                      </p>
                      <p className="text-[10px] text-[#8896A5]">{(waiter.xp || 0).toLocaleString()} XP</p>
                      <div
                        className="mt-2 rounded-t-xl flex items-center justify-center"
                        style={{
                          background: PODIUM_COLORS[idx],
                          opacity: 0.2,
                          width: '56px',
                          height: idx === 1 ? '60px' : idx === 0 ? '40px' : '24px'
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Lista general */}
          <div className="px-5 space-y-2">
            {rest.map((waiter, i) => {
              const pos = i + 4
              const isMe = waiter.id === myStaffId
              const level = getLevel(waiter.xp || 0)
              return (
                <div
                  key={waiter.id}
                  className={`bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm border ${
                    isMe ? 'border-[#008080]/30' : 'border-black/5'
                  }`}
                >
                  <span className="text-[#8896A5] font-bold text-sm w-6 text-center">{pos}</span>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                    style={{ background: '#008080' }}
                  >
                    {(waiter.alias || waiter.full_name)?.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1A2A3A] truncate">
                      {waiter.alias ? `@${waiter.alias}` : waiter.full_name}
                      {isMe && <span className="ml-1 text-[#008080] text-xs">(vos)</span>}
                    </p>
                    <p className="text-[10px] text-[#8896A5]">{level.icon} {level.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#008080]">{(waiter.xp || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-[#8896A5]">XP</p>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Banner sticky: mi posición */}
      {myPosition > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#008080] px-5 py-4 shadow-lg">
          <div className="flex items-center justify-between max-w-sm mx-auto">
            <div>
              <p className="text-white font-bold text-base">Puesto #{myPosition}</p>
              {myPosition > 3 && ranking[myPosition - 2] && (
                <p className="text-white/70 text-xs">
                  A {(ranking[myPosition - 2].xp - (ranking[myPosition - 1]?.xp || 0)).toLocaleString()} XP del puesto #{myPosition - 1}
                </p>
              )}
              {myPosition <= 3 && <p className="text-white/70 text-xs">¡Estás en el podio! 🏆</p>}
            </div>
            <div className="text-right">
              <p className="text-white font-bold">{(ranking[myPosition - 1]?.xp || 0).toLocaleString()} XP</p>
              <p className="text-white/70 text-xs">{getLevel(ranking[myPosition - 1]?.xp || 0).name}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
