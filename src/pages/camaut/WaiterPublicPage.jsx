import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabaseCustomer } from '../../lib/supabase'
import { getLevel, getXPProgress } from '../../lib/xpUtils'

const LEVEL_ICONS = {
  'Camarero Activo': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  'Mozo Veloz': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  'Mozo Experto': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  'Leyenda del Salón': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>,
}

const ARCHETYPE_ICONS = {
  'Flash del Salón': <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  'Encantador de Dulces': <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  'Tanque de la Barra': <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  'Imán de Estrellas': <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  'En Ascenso': <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
}

function calcArchetype(orderCount, fiveStarPct, ratingCount) {
  if (orderCount >= 400)
    return { name: 'Flash del Salón', desc: 'Velocidad pura. Ningún pedido lo para.' }
  if (fiveStarPct === 100 && ratingCount >= 50)
    return { name: 'Encantador de Dulces', desc: 'Efectividad perfecta. Sus clientes lo aman.' }
  if (orderCount >= 200)
    return { name: 'Tanque de la Barra', desc: 'Sólido y confiable. El salón lo necesita.' }
  if (fiveStarPct >= 80 && ratingCount >= 20)
    return { name: 'Imán de Estrellas', desc: 'Sus clientes no paran de felicitarlo.' }
  return { name: 'En Ascenso', desc: 'Cada día suma experiencia y crecimiento.' }
}

export default function WaiterPublicPage() {
  const { alias } = useParams()
  const navigate = useNavigate()
  const [staff, setStaff] = useState(null)
  const [venue, setVenue] = useState(null)
  const [stats, setStats] = useState(null)
  const [bestComment, setBestComment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

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
      setNotFound(true)
      setLoading(false)
      return
    }
    setStaff(data)

    const promises = [
      supabaseCustomer.rpc('count_orders_by_staff', { p_staff_id: data.id }),
      supabaseCustomer.from('order_feedback').select('rating, notes, tags').eq('staff_id', data.id),
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
    const fiveStars = ratings.filter(r => r.rating === 5)
    const fiveStarPct = ratings.length ? Math.round((fiveStars.length / ratings.length) * 100) : 0
    const avgRating = ratings.length
      ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
      : null

    const comment = fiveStars
      .filter(r => r.notes?.trim().length > 10)
      .sort((a, b) => b.notes.length - a.notes.length)[0]?.notes || null

    const allTags = ratings.flatMap(r => r.tags || [])
    const tagCounts = {
      amabilidad: allTags.filter(t => t === 'amabilidad').length,
      rapidez: allTags.filter(t => t === 'rapidez').length,
      recomendacion: allTags.filter(t => t === 'recomendacion').length,
    }

    setBestComment(comment)
    setStats({
      orders: ordersRes.data || 0,
      avgRating,
      ratingCount: ratings.length,
      fiveStarPct,
      tagCounts,
      archetype: calcArchetype(ordersRes.data || 0, fiveStarPct, ratings.length),
    })
    setLoading(false)
  }

  function handleBack() {
    if (window.history.length > 1) navigate(-1)
    else navigate('/camaut')
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
      </div>
    )
  }

  const xp = staff.xp || 0
  const level = getLevel(xp)
  const progress = getXPProgress(xp)

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      {/* Safe-area bar + back button */}
      <div className="bg-[#008080]" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="px-4 py-3">
          <button
            onClick={handleBack}
            className="text-white/80 text-sm font-semibold flex items-center gap-1 active:opacity-60"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            Volver
          </button>
        </div>
      </div>

      {/* Profile header */}
      <div className="bg-[#008080] px-5 pt-2 pb-10 text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-white/20 border-4 border-white/40 overflow-hidden flex items-center justify-center">
          {staff.avatar_url ? (
            <img src={staff.avatar_url} alt={staff.full_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-bold text-2xl">
              {staff.full_name?.slice(0, 2).toUpperCase() || 'CA'}
            </span>
          )}
        </div>
        <h1 className="text-white font-bold text-xl mt-2 leading-tight">{staff.full_name}</h1>
        {staff.alias && <p className="text-white/70 text-sm mt-0.5">@{staff.alias}</p>}
        {venue && <p className="text-white/55 text-xs mt-1">{venue.name.replace(' — Capy', '').replace(' - Capy', '')}</p>}
      </div>

      <div className="px-4 -mt-5 pb-10 space-y-3">
        {/* Bio */}
        {staff.bio && (
          <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm">
            <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-2">Sobre mí</p>
            <p className="text-[#3A4A5A] text-sm leading-relaxed">{staff.bio}</p>
          </div>
        )}

        {/* Archetype */}
        {stats?.archetype && (
          <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm flex items-center gap-4">
            <div className="flex-shrink-0 text-[#008080]">
              {ARCHETYPE_ICONS[stats.archetype.name]}
            </div>
            <div>
              <p className="font-bold text-[#1A2A3A] text-base leading-tight">{stats.archetype.name}</p>
              <p className="text-[#8896A5] text-xs mt-0.5 leading-relaxed">{stats.archetype.desc}</p>
            </div>
          </div>
        )}

        {/* Level */}
        <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2.5">
              <span className="text-[#008080]">{LEVEL_ICONS[level.name]}</span>
              <div>
                <p className="font-bold text-[#1A2A3A] text-sm leading-tight">{level.name}</p>
                <p className="text-[#8896A5] text-xs">{xp.toLocaleString()} XP acumulados</p>
              </div>
            </div>
            <span className="bg-[#E8F5F5] text-[#008080] text-xs font-bold px-3 py-1 rounded-full">
              Nivel {level.name}
            </span>
          </div>
          <div className="w-full h-2 bg-[#F0F4F8] rounded-full overflow-hidden">
            <div className="h-2 bg-[#008080] rounded-full transition-all" style={{ width: `${progress.percent}%` }} />
          </div>
          <p className="text-[#B0BEC5] text-[10px] mt-1.5">
            {progress.current.toLocaleString()} / {progress.needed.toLocaleString()} XP para el siguiente nivel
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm text-center">
              <p className="font-bold text-[#1A2A3A] text-3xl">{stats.orders.toLocaleString()}</p>
              <p className="text-[#8896A5] text-xs mt-1">Pedidos atendidos</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm text-center">
              {stats.avgRating ? (
                <>
                  <p className="font-bold text-[#008080] text-3xl">{stats.avgRating}</p>
                  <p className="text-[#8896A5] text-xs mt-1">{stats.ratingCount} opiniones ⭐</p>
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

        {/* Reconocimientos */}
        {stats?.tagCounts && Object.values(stats.tagCounts).some(v => v > 0) && (
          <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm">
            <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-3">Reconocimientos</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'amabilidad', label: 'Amabilidad', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
                { id: 'rapidez', label: 'Rapidez', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
                { id: 'recomendacion', label: 'Recomendó la carta', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
              ].filter(t => stats.tagCounts[t.id] > 0).map(t => (
                <div key={t.id} className="flex items-center gap-1.5 bg-[#E8F5F5] px-3 py-1.5 rounded-full text-[#008080]">
                  {t.icon}
                  <span className="text-xs font-semibold">{t.label}</span>
                  <span className="text-xs font-bold opacity-60">{stats.tagCounts[t.id]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mejor comentario */}
        {bestComment && (
          <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm">
            <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-2">Lo que dicen sus clientes</p>
            <p className="text-[#1A2A3A] text-sm italic leading-relaxed">"{bestComment}"</p>
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
