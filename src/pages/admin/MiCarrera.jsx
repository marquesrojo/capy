import { useEffect, useState } from 'react'
import { supabaseStaff, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { LEVELS, BADGES, getLevel, getNextLevel, getXPProgress } from '../../lib/xpUtils'

const LEVEL_SVGS = {
  'Camarero Activo': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  'Mozo Veloz': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  'Mozo Experto': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  'Leyenda del Salón': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/></svg>,
}

const BADGE_SVGS = {
  first_order: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  streak_7: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  orders_100: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  gold_star: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
  first_invite: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
}

export default function MiCarrera({ venueId: propVenueId }) {
  const activeVenueId = propVenueId || ACTIVE_VENUE_ID
  const { profile } = useAuth()
  const [staff, setStaff] = useState(null)
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingAlias, setEditingAlias] = useState(false)
  const [alias, setAlias] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile) return
    loadCareer()
  }, [profile])

  async function loadCareer() {
    const { data: staffData } = await supabaseStaff
      .from('staff_names')
      .select('*')
      .eq('venue_id', activeVenueId)
      .single()

    if (staffData) {
      setStaff(staffData)
      setAlias(staffData.alias || '')
      setLinkedin(staffData.linkedin_url || '')

      const { data: badgeData } = await supabaseStaff
        .from('staff_badges')
        .select('badge_key, unlocked_at')
        .eq('staff_id', staffData.id)

      setBadges(badgeData || [])
    }
    setLoading(false)
  }

  async function saveProfile() {
    if (!staff) return
    setSaving(true)
    await supabaseStaff
      .from('staff_names')
      .update({
        alias: alias.trim() || null,
        linkedin_url: linkedin.trim() || null
      })
      .eq('id', staff.id)
    setSaving(false)
    setEditingAlias(false)
    setStaff(prev => ({ ...prev, alias: alias.trim(), linkedin_url: linkedin.trim() }))
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-[#8896A5] text-sm">Cargando carrera...</p>
    </div>
  )

  if (!staff) return (
    <div className="px-5 py-10 text-center">
      <p className="text-[#8896A5] text-sm">No encontramos tu perfil de camarero.</p>
    </div>
  )

  const xp = staff.xp || 0
  const currentLevel = getLevel(xp)
  const nextLevel = getNextLevel(xp)
  const progress = getXPProgress(xp)
  const unlockedKeys = new Set(badges.map(b => b.badge_key))

  return (
    <div className="bg-[#F0F4F8] min-h-screen px-5 py-6">

      {/* Header perfil */}
      <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-black/5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-[#008080] flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
            {staff.full_name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="font-bold text-[#1A2A3A] text-base">{staff.full_name}</p>
            {staff.alias ? (
              <p className="text-[#008080] text-sm font-medium">@{staff.alias}</p>
            ) : (
              <button
                onClick={() => setEditingAlias(true)}
                className="text-[#8896A5] text-xs underline"
              >
                + Elegir alias público
              </button>
            )}
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="text-[#008080]">{LEVEL_SVGS[currentLevel.name]}</div>
              <p className="text-[#008080] text-sm font-medium">{currentLevel.name}</p>
            </div>
          </div>
        </div>

        {/* Editar alias y LinkedIn */}
        {editingAlias && (
          <div className="space-y-2 mb-3">
            <input
              type="text"
              value={alias}
              onChange={e => setAlias(e.target.value)}
              placeholder="Tu alias público (ej: mozo_veloz)"
              className="w-full border border-black/10 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] text-[#1A2A3A]"
            />
            <input
              type="url"
              value={linkedin}
              onChange={e => setLinkedin(e.target.value)}
              placeholder="Tu LinkedIn (opcional)"
              className="w-full border border-black/10 rounded-xl px-4 py-2.5 text-sm bg-[#F8FAFC] text-[#1A2A3A]"
            />
            <div className="flex gap-2">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="flex-1 bg-[#008080] text-white font-semibold py-2 rounded-xl text-sm disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setEditingAlias(false)}
                className="flex-1 border border-black/10 text-[#8896A5] py-2 rounded-xl text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {!editingAlias && (staff.alias || staff.linkedin_url) && (
          <button
            onClick={() => setEditingAlias(true)}
            className="text-[#8896A5] text-xs underline"
          >
            Editar perfil
          </button>
        )}

        {/* Barra de progreso XP */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-semibold text-[#008080]">{xp.toLocaleString()} XP</span>
            {nextLevel && (
              <span className="text-xs text-[#8896A5]">
                {nextLevel.minXP.toLocaleString()} XP → {nextLevel.icon} {nextLevel.name}
              </span>
            )}
          </div>
          <div className="w-full bg-[#E8EDF2] rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full bg-[#008080] transition-all duration-500"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          {nextLevel && (
            <p className="text-[10px] text-[#8896A5] mt-1">
              Faltan {(nextLevel.minXP - xp).toLocaleString()} XP para {nextLevel.name}
            </p>
          )}
          {!nextLevel && (
            <p className="text-[10px] text-[#008080] mt-1 font-semibold">
              ¡Nivel máximo alcanzado! 👑
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5 text-center">
          <p className="text-2xl font-bold text-[#008080]">{staff.streak_days || 0}</p>
          <p className="text-[10px] text-[#8896A5] font-semibold uppercase tracking-wide mt-1">Racha</p>
          <p className="text-[10px] text-[#8896A5]">días</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5 text-center">
          <p className="text-2xl font-bold text-[#008080]">{staff.total_orders || 0}</p>
          <p className="text-[10px] text-[#8896A5] font-semibold uppercase tracking-wide mt-1">Comandas</p>
          <p className="text-[10px] text-[#8896A5]">totales</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5 text-center">
          <p className="text-2xl font-bold text-[#4DD0E1]">{xp.toLocaleString()}</p>
          <p className="text-[10px] text-[#8896A5] font-semibold uppercase tracking-wide mt-1">XP</p>
          <p className="text-[10px] text-[#8896A5]">total</p>
        </div>
      </div>

      {/* Niveles */}
      <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-black/5">
        <p className="text-[11px] font-semibold text-[#8896A5] uppercase tracking-wide mb-3">Camino al top</p>
        <div className="space-y-2">
          {LEVELS.map(level => {
            const reached = xp >= level.minXP
            const isCurrent = getLevel(xp).name === level.name
            return (
              <div
                key={level.name}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                  isCurrent ? 'bg-[#008080]/10 border border-[#008080]/20' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  reached ? 'bg-[#008080]/10 text-[#008080]' : 'bg-[#E8EDF2] text-[#B0BEC5]'
                }`}>
                  {LEVEL_SVGS[level.name]}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${reached ? 'text-[#1A2A3A]' : 'text-[#B0BEC5]'}`}>
                    {level.name}
                  </p>
                  <p className="text-[10px] text-[#8896A5]">{level.minXP.toLocaleString()} XP</p>
                </div>
                {reached && <span className="text-[#008080] text-xs font-bold">✓</span>}
                {isCurrent && <span className="text-[10px] bg-[#008080] text-white px-2 py-0.5 rounded-full">Actual</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Badges */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <p className="text-[11px] font-semibold text-[#8896A5] uppercase tracking-wide mb-3">Logros</p>
        <div className="grid grid-cols-2 gap-2">
          {BADGES.map(badge => {
            const unlocked = unlockedKeys.has(badge.key)
            return (
              <div
                key={badge.key}
                className={`flex items-center gap-3 p-3 rounded-xl border ${
                  unlocked
                    ? 'bg-[#F0FDF8] border-[#008080]/20'
                    : 'bg-[#F8FAFC] border-black/5 opacity-40'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  unlocked ? 'bg-[#008080]/10 text-[#008080]' : 'bg-[#E8EDF2] text-[#B0BEC5]'
                }`}>
                  {BADGE_SVGS[badge.key]}
                </div>
                <div>
                  <p className={`text-xs font-semibold ${unlocked ? 'text-[#1A2A3A]' : 'text-[#8896A5]'}`}>
                    {badge.label}
                  </p>
                  <p className="text-[10px] text-[#8896A5]">+{badge.xpBonus} XP</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
