import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabaseCustomer } from '../../lib/supabase'
import { StarIcon } from '../../components/Icons'
import WaiterTipCard from '../../components/WaiterTipCard'

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

    // Apagada por su dueño: para el que entra es como si no existiera
    if (error || !data || data.public_page_enabled === false) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setStaff(data)

    const promises = [
      supabaseCustomer.rpc('count_orders_by_staff', { p_staff_id: data.id }),
      // Por RPC y no leyendo la tabla: una reseña puede ser suya sin nombrarlo
      // —por el pedido que tenía asignado, o por ser de su local personal— y esa
      // regla vive en un solo lugar, compartida con el contador de Embajador
      supabaseCustomer.rpc('resenas_del_camarero', { p_staff_id: data.id }),
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
      // Una calificación con pedido detrás vale distinto que una suelta, y
      // quien mira la página tiene derecho a saber cuántas son de cada tipo
      verificadas: ratings.filter(r => r.verificada).length,
      fiveStarPct,
      tagCounts,
    })
    setLoading(false)
  }

  function handleBack() {
    if (window.history.length > 1) navigate(-1)
    else navigate('/camareroa')
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
        {/* Lo primero: cobrar. El currículum va abajo. */}
        <WaiterTipCard staff={staff} mostrarEncuesta={staff.public_ratings_enabled !== false} />

        {/* Bio */}
        {staff.bio && (
          <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm">
            <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-2">Sobre mí</p>
            <p className="text-[#3A4A5A] text-sm leading-relaxed">{staff.bio}</p>
          </div>
        )}

        {/* Cómo lo califican. Los pedidos atendidos y el nivel son cosas de
            currículum: acá lo único que aporta es qué opinan los que ya pasaron. */}
        {stats?.avgRating && staff.public_ratings_enabled !== false && (
          <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm flex items-center gap-4">
            <div className="text-center flex-shrink-0">
              <p className="font-bold text-[#008080] text-3xl leading-none">{stats.avgRating}</p>
              <div className="flex justify-center gap-0.5 mt-1 text-[#F5A623]">
                {[1, 2, 3, 4, 5].map(n => (
                  <span key={n} className={n <= Math.round(stats.avgRating) ? '' : 'opacity-25'}>
                    <StarIcon size={11} />
                  </span>
                ))}
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[#1A2A3A] text-sm font-semibold leading-tight">
                {stats.ratingCount} {stats.ratingCount === 1 ? 'opinión' : 'opiniones'}
              </p>
              {stats.verificadas > 0 && (
                <p className="text-[#8896A5] text-xs mt-0.5">
                  {stats.verificadas} con pedido verificado
                </p>
              )}
            </div>
          </div>
        )}

        {/* Reconocimientos */}
        {staff.public_ratings_enabled !== false && stats?.tagCounts && Object.values(stats.tagCounts).some(v => v > 0) && (
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
        {bestComment && staff.public_ratings_enabled !== false && (
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

        {/* El currículum completo —trayectoria, nivel, historial— vive en otra
            página. Acá va un link discreto: el que escaneó vino a dejar propina,
            no a leer un CV, pero si le interesa está a un toque. */}
        <div className="text-center pt-1">
          <button
            onClick={() => navigate(`/cv/${staff.alias || staff.id}`)}
            className="text-[#8896A5] text-xs underline"
          >
            Ver la trayectoria de {staff.full_name?.split(' ')[0]}
          </button>
        </div>

        <div className="text-center pt-2">
          <p className="text-[#B0BEC5] text-xs">
            Powered by <span className="font-semibold text-[#008080]">CAPY</span>
          </p>
        </div>
      </div>
    </div>
  )
}
