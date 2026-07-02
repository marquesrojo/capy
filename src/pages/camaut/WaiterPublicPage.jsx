import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabaseCustomer } from '../../lib/supabase'
import { getLevel, getXPProgress } from '../../lib/xpUtils'

export default function WaiterPublicPage() {
  const { alias } = useParams()
  const [staff, setStaff] = useState(null)
  const [venue, setVenue] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [debugInfo, setDebugInfo] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [alias])

  async function loadProfile() {
    const { data: { session } } = await supabaseCustomer.auth.getSession()
    if (!session) await supabaseCustomer.auth.signInAnonymously()

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(alias)
    let query = supabaseCustomer.from('staff_names').select('*')
    query = isUUID ? query.eq('id', alias) : query.eq('alias', alias)
    const { data, error } = await query.maybeSingle()

    if (error || !data) {
      setDebugInfo(JSON.stringify({ error: error?.message, code: error?.code, alias }, null, 2))
      setNotFound(true)
      setLoading(false)
      return
    }
    setStaff(data)

    const promises = [
      supabaseCustomer.from('orders').select('id', { count: 'exact', head: true }).eq('assigned_staff_id', data.id),
      supabaseCustomer.from('order_feedback').select('rating').eq('staff_id', data.id),
    ]
    if (data.venue_id) {
      promises.push(
        supabaseCustomer.from('venues').select('name, logo_url').eq('id', data.venue_id).single()
      )
    }

    const results = await Promise.all(promises)
    const [ordersRes, ratingsRes, venueRes] = results

    if (venueRes?.data) setVenue(venueRes.data)

    const ratings = ratingsRes.data || []
    setStats({
      orders: ordersRes.count || 0,
      avgRating: ratings.length
        ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
        : null,
      ratingCount: ratings.length,
    })
    setLoading(false)
  }

  async function copyAlias() {
    if (!staff?.alias_bancario) return
    await navigator.clipboard?.writeText(staff.alias_bancario)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center">
        <p className="text-[#8896A5] text-sm">Cargando...</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex flex-col items-center justify-center px-5 text-center">
        <p className="text-[#1A2A3A] font-semibold mb-2">Camarero no encontrado</p>
        <p className="text-[#8896A5] text-sm">Este perfil no existe o no está disponible.</p>
        {debugInfo && <pre className="mt-4 text-left text-[10px] text-red-500 bg-white p-3 rounded-xl border border-red-200 max-w-xs overflow-auto">{debugInfo}</pre>}
      </div>
    )
  }

  const xp = staff.xp || 0
  const level = getLevel(xp)
  const progress = getXPProgress(xp)

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      {/* Header */}
      <div className="bg-[#008080] px-5 pt-12 pb-16 text-center">
        <div className="w-24 h-24 mx-auto rounded-full bg-white/20 border-4 border-white/40 overflow-hidden flex items-center justify-center">
          {staff.avatar_url ? (
            <img src={staff.avatar_url} alt={staff.full_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-bold text-3xl">
              {staff.full_name?.slice(0, 2).toUpperCase() || 'CA'}
            </span>
          )}
        </div>
        <h1 className="text-white font-bold text-2xl mt-4 leading-tight">{staff.full_name}</h1>
        {staff.alias && <p className="text-white/70 text-sm mt-1">@{staff.alias}</p>}
        {venue && <p className="text-white/60 text-xs mt-2">{venue.name}</p>}
      </div>

      <div className="px-4 -mt-8 pb-10 space-y-4">
        {/* Level */}
        <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{level.icon}</span>
              <div>
                <p className="font-bold text-[#1A2A3A] leading-tight">{level.name}</p>
                <p className="text-[#8896A5] text-xs">{xp.toLocaleString()} XP</p>
              </div>
            </div>
            <span className="bg-[#E8F5F5] text-[#008080] text-xs font-bold px-3 py-1 rounded-full">
              {level.name}
            </span>
          </div>
          <div className="w-full h-2 bg-[#F0F4F8] rounded-full overflow-hidden">
            <div className="h-2 bg-[#008080] rounded-full" style={{ width: `${progress.percent}%` }} />
          </div>
          <p className="text-[#B0BEC5] text-[10px] mt-1.5">
            {progress.current.toLocaleString()} / {progress.needed.toLocaleString()} XP para el siguiente nivel
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm text-center">
              <p className="font-bold text-[#1A2A3A] text-3xl">{stats.orders}</p>
              <p className="text-[#8896A5] text-xs mt-1">Pedidos atendidos</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm text-center">
              {stats.avgRating ? (
                <>
                  <p className="font-bold text-[#008080] text-3xl">{stats.avgRating}</p>
                  <p className="text-[#8896A5] text-xs mt-1">{stats.ratingCount} opiniones</p>
                </>
              ) : (
                <>
                  <p className="font-bold text-[#B0BEC5] text-3xl">—</p>
                  <p className="text-[#8896A5] text-xs mt-1">Sin calificaciones</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Propina */}
        {staff.alias_bancario && (
          <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm">
            <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-3">Dejar propina</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-[#1A2A3A] text-sm bg-[#F8FAFC] px-3 py-2.5 rounded-xl border border-black/10 truncate">
                {staff.alias_bancario}
              </div>
              <button
                onClick={copyAlias}
                className="bg-[#008080] text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex-shrink-0"
              >
                {copied ? '✓' : 'Copiar'}
              </button>
            </div>
          </div>
        )}

        {/* LinkedIn */}
        {staff.linkedin_url && (
          <a
            href={staff.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-black/5 shadow-sm"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                <rect x="2" y="9" width="4" height="12"/>
                <circle cx="4" cy="4" r="2"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-[#1A2A3A] text-sm">Ver perfil en LinkedIn</p>
              <p className="text-[#8896A5] text-xs">Historial profesional</p>
            </div>
            <svg className="ml-auto text-[#8896A5]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        )}

        <div className="text-center pt-2">
          <p className="text-[#B0BEC5] text-xs">
            Powered by <span className="font-semibold text-[#008080]">Capy</span>
          </p>
        </div>
      </div>
    </div>
  )
}
