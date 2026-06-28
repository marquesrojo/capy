import { useEffect, useState } from 'react'
import { supabaseStaff, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { LEVELS, BADGES, getLevel, getNextLevel, getXPProgress } from '../../lib/xpUtils'

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
            <p className="text-[#8896A5] text-xs mt-0.5">
              {currentLevel.icon} {currentLevel.name}
            </p>
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
                <span className="text-xl">{level.icon}</span>
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
                    : 'bg-[#F8FAFC] border-black/5 opacity-50'
                }`}
              >
                <span className="text-2xl">{badge.icon}</span>
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
