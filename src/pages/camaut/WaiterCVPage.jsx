import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { supabaseCustomer } from '../../lib/supabase'
import { getLevel } from '../../lib/xpUtils'

const LEVEL_ICONS_SM = {
  'Camarero Activo': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  'Mozo Veloz': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  'Mozo Experto': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  'Leyenda del Salón': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>,
}

const ARCHETYPE_ICONS_SM = {
  'Flash del Salón': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  'Encantador de Mesas': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  'Tanque de la Barra': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  'Imán de Estrellas': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  'En Ascenso': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
}

function calcArchetype(orderCount, fiveStarPct, ratingCount) {
  if (orderCount >= 400) return { name: 'Flash del Salón' }
  if (fiveStarPct === 100 && ratingCount >= 50) return { name: 'Encantador de Mesas' }
  if (orderCount >= 200) return { name: 'Tanque de la Barra' }
  if (fiveStarPct >= 80 && ratingCount >= 20) return { name: 'Imán de Estrellas' }
  return { name: 'En Ascenso' }
}

function fmtPeriod(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + '-01')
  return d.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })
}

export default function WaiterCVPage() {
  const { alias } = useParams()
  const navigate = useNavigate()
  const [staff, setStaff] = useState(null)
  const [experience, setExperience] = useState([])
  const [ratings, setRatings] = useState([])
  const [orderCount, setOrderCount] = useState(0)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const printRef = useRef()

  useEffect(() => {
    load()
  }, [alias])

  async function load() {
    const { data: { session } } = await supabaseCustomer.auth.getSession()
    if (!session) await supabaseCustomer.auth.signInAnonymously()

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(alias)
    let q = supabaseCustomer.from('staff_names').select('id, full_name, alias, avatar_url, xp, linkedin_url, venue_id, bio')
    q = isUUID ? q.eq('id', alias) : q.eq('alias', alias)
    const { data: staffData } = await q.maybeSingle()

    if (!staffData) { setNotFound(true); setLoading(false); return }
    setStaff(staffData)

    const profileUrl = `${window.location.origin}/c/${staffData.alias || staffData.id}`

    const [expRes, ratingsRes, countRes, qrDataUrl] = await Promise.all([
      supabaseCustomer.from('staff_experience').select('*').eq('staff_id', staffData.id).order('date_from', { ascending: false }),
      supabaseCustomer.from('order_feedback').select('rating, notes, created_at, tags').eq('staff_id', staffData.id).order('created_at', { ascending: false }),
      supabaseCustomer.rpc('count_orders_by_staff', { p_staff_id: staffData.id }),
      QRCode.toDataURL(profileUrl, { width: 160, margin: 1, color: { dark: '#1A2A3A', light: '#FFFFFF' } }),
    ])

    setExperience(expRes.data || [])
    setRatings(ratingsRes.data || [])
    setOrderCount(countRes.data || 0)
    setQrDataUrl(qrDataUrl)
    setLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
      <p className="text-[#8896A5] text-sm">Cargando perfil...</p>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center px-5 text-center">
      <p className="text-[#1A2A3A] font-semibold mb-2">Perfil no encontrado</p>
      <p className="text-[#8896A5] text-sm">Este CV no existe o no está disponible.</p>
    </div>
  )

  const xp = staff.xp || 0
  const level = getLevel(xp)
  const fiveStars = ratings.filter(r => r.rating === 5)
  const fiveStarPct = ratings.length ? Math.round((fiveStars.length / ratings.length) * 100) : 0
  const avgRating = ratings.length ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1) : null
  const archetype = calcArchetype(orderCount, fiveStarPct, ratings.length)
  const topReviews = fiveStars.filter(r => r.notes?.trim().length > 10).slice(0, 3)

  const allTags = ratings.flatMap(r => r.tags || [])
  const tagCounts = [
    { id: 'amabilidad', label: 'Amabilidad', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>, count: allTags.filter(t => t === 'amabilidad').length },
    { id: 'rapidez', label: 'Rapidez', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>, count: allTags.filter(t => t === 'rapidez').length },
    { id: 'recomendacion', label: 'Recomendó la carta', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>, count: allTags.filter(t => t === 'recomendacion').length },
  ].filter(t => t.count > 0)

  const trabajos = experience.filter(e => e.type === 'trabajo')
  const estudios = experience.filter(e => e.type === 'estudio')
  const honores = experience.filter(e => e.type === 'honor')

  const profileUrl = `${window.location.origin}/c/${staff.alias || staff.id}`
  const today = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <>
      {/* Screen-only toolbar */}
      <div className="print:hidden bg-white border-b border-black/8 px-5 py-3 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="text-[#008080] text-sm font-semibold flex items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          Volver
        </button>
        <div className="flex gap-2">
          <a
            href={`/c/${staff.alias || staff.id}`}
            className="text-xs font-semibold text-[#3A4A5A] border border-black/10 rounded-full px-3 py-1.5"
          >
            Ver perfil social
          </a>
          <button
            onClick={() => window.print()}
            className="text-xs font-semibold text-white bg-[#008080] rounded-full px-4 py-1.5 flex items-center gap-1.5"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
            </svg>
            Descargar PDF
          </button>
        </div>
      </div>

      {/* CV Document */}
      <div ref={printRef} className="min-h-screen bg-[#FAF9F6] py-10 px-5 print:py-0 print:px-0 print:bg-white">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-black/6 overflow-hidden print:shadow-none print:border-none print:rounded-none">

          {/* Verified badge */}
          <div className="bg-[#008080] px-6 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
              <span className="text-white text-xs font-semibold tracking-wide">Perfil Certificado · Datos Auditados por Capy</span>
            </div>
            <span className="text-white/70 text-[10px]">capyapp.co</span>
          </div>

          {/* Header */}
          <div className="px-8 pt-8 pb-6 flex items-start gap-6 border-b border-black/8">
            <div className="flex-shrink-0">
              {staff.avatar_url ? (
                <img src={staff.avatar_url} alt={staff.full_name} className="w-20 h-20 rounded-full object-cover border-2 border-black/10" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-[#008080]/10 border-2 border-[#008080]/20 flex items-center justify-center">
                  <span className="text-[#008080] font-bold text-2xl">{staff.full_name?.slice(0, 2).toUpperCase()}</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[#1A2A3A] font-bold text-2xl leading-tight">{staff.full_name}</h1>
              <div className="flex items-center gap-1.5 text-[#008080] text-sm font-medium mt-0.5">
                {LEVEL_ICONS_SM[level.name]}
                <span>{level.name}</span>
                <span className="text-[#008080]/40">·</span>
                {ARCHETYPE_ICONS_SM[archetype.name]}
                <span>{archetype.name}</span>
              </div>
              {staff.alias && <p className="text-[#8896A5] text-xs mt-1">@{staff.alias}</p>}
              {staff.bio && (
                <p className="text-[#3A4A5A] text-sm mt-2 leading-relaxed">{staff.bio}</p>
              )}
              {staff.linkedin_url && (
                <a href={staff.linkedin_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#2563EB] text-xs mt-2 hover:underline print:no-underline">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
                  </svg>
                  LinkedIn
                </a>
              )}
            </div>
            <div className="flex-shrink-0 print:block hidden">
              {qrDataUrl && <img src={qrDataUrl} alt="QR" className="w-16 h-16" />}
            </div>
          </div>

          {/* KPI Stats */}
          <div className="px-8 py-6 border-b border-black/8">
            <p className="text-[#8896A5] text-[10px] font-bold uppercase tracking-widest mb-4">Métricas de Desempeño</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-[#1A2A3A] font-bold text-3xl">{orderCount.toLocaleString('es-AR')}</p>
                <p className="text-[#8896A5] text-[11px] mt-0.5">Comandas procesadas</p>
              </div>
              <div className="text-center border-x border-black/8">
                {avgRating ? (
                  <>
                    <p className="text-[#008080] font-bold text-3xl">{avgRating}</p>
                    <p className="text-[#8896A5] text-[11px] mt-0.5">Satisfacción media / 5</p>
                  </>
                ) : (
                  <>
                    <p className="text-[#B0BEC5] font-bold text-3xl">—</p>
                    <p className="text-[#8896A5] text-[11px] mt-0.5">Sin calificaciones</p>
                  </>
                )}
              </div>
              <div className="text-center">
                <p className="text-[#1A2A3A] font-bold text-3xl">{ratings.length > 0 ? `${fiveStarPct}%` : '—'}</p>
                <p className="text-[#8896A5] text-[11px] mt-0.5">Puntuaciones perfectas</p>
              </div>
            </div>
            {ratings.length > 0 && (
              <p className="text-center text-[#B0BEC5] text-[10px] mt-3">{ratings.length} opiniones verificadas de clientes reales</p>
            )}
          </div>

          {/* Recognition tags */}
          {tagCounts.length > 0 && (
            <div className="px-8 py-5 border-b border-black/8">
              <p className="text-[#8896A5] text-[10px] font-bold uppercase tracking-widest mb-3">Reconocimientos de clientes</p>
              <div className="flex flex-wrap gap-2">
                {tagCounts.map(t => (
                  <div key={t.id} className="flex items-center gap-1.5 bg-[#E8F5F5] border border-[#008080]/15 px-3 py-1.5 rounded-full text-[#006666]">
                    {t.icon}
                    <span className="text-xs font-semibold">{t.label}</span>
                    <span className="text-[#008080] text-xs font-bold ml-0.5">{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Experience */}
          {trabajos.length > 0 && (
            <div className="px-8 py-6 border-b border-black/8">
              <p className="text-[#8896A5] text-[10px] font-bold uppercase tracking-widest mb-4">Experiencia Laboral</p>
              <div className="space-y-4">
                {trabajos.map((item, i) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="flex flex-col items-center pt-1">
                      <div className="w-2 h-2 rounded-full bg-[#008080] flex-shrink-0" />
                      {i < trabajos.length - 1 && <div className="w-px flex-1 bg-black/10 mt-1" />}
                    </div>
                    <div className="flex-1 pb-2">
                      <p className="font-semibold text-[#1A2A3A] text-sm">{item.title}</p>
                      {item.role && <p className="text-[#008080] text-xs">{item.role}</p>}
                      {(item.date_from || item.current) && (
                        <p className="text-[#B0BEC5] text-[11px] mt-0.5">
                          {fmtPeriod(item.date_from)}
                          {item.current ? ' · Actualidad' : item.date_to ? ` → ${fmtPeriod(item.date_to)}` : ''}
                        </p>
                      )}
                      {item.description && <p className="text-[#8896A5] text-xs mt-1">{item.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {estudios.length > 0 && (
            <div className="px-8 py-6 border-b border-black/8">
              <p className="text-[#8896A5] text-[10px] font-bold uppercase tracking-widest mb-4">Formación</p>
              <div className="space-y-3">
                {estudios.map(item => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#E8F5F5] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#008080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-[#1A2A3A] text-sm">{item.title}</p>
                      {item.institution && <p className="text-[#8896A5] text-xs">{item.institution}</p>}
                      {(item.date_from || item.current) && (
                        <p className="text-[#B0BEC5] text-[11px]">
                          {fmtPeriod(item.date_from)}
                          {item.current ? ' · En curso' : item.date_to ? ` → ${fmtPeriod(item.date_to)}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Honors */}
          {honores.length > 0 && (
            <div className="px-8 py-6 border-b border-black/8">
              <p className="text-[#8896A5] text-[10px] font-bold uppercase tracking-widest mb-4">Reconocimientos</p>
              <div className="space-y-2">
                {honores.map(item => (
                  <div key={item.id} className="flex items-start gap-3">
                    <span className="text-amber-500 mt-0.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </span>
                    <div>
                      <p className="font-semibold text-[#1A2A3A] text-sm">{item.title}</p>
                      {item.institution && <p className="text-[#8896A5] text-xs">{item.institution}</p>}
                      {item.description && <p className="text-[#8896A5] text-xs">{item.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top reviews */}
          {topReviews.length > 0 && (
            <div className="px-8 py-6 border-b border-black/8">
              <p className="text-[#8896A5] text-[10px] font-bold uppercase tracking-widest mb-4">Lo que dicen sus clientes</p>
              <div className="space-y-3">
                {topReviews.map((r, i) => (
                  <div key={i} className="bg-[#FAF9F6] rounded-xl px-4 py-3 border border-black/6">
                    <div className="flex gap-0.5 mb-1.5">
                      {[1,2,3,4,5].map(s => (
                        <svg key={s} width="11" height="11" viewBox="0 0 24 24" fill={s <= r.rating ? '#008080' : '#E5E7EB'}>
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      ))}
                    </div>
                    <p className="text-[#3A4A5A] text-xs italic leading-relaxed">"{r.notes}"</p>
                    <p className="text-[#B0BEC5] text-[10px] mt-1">{new Date(r.created_at).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer / QR verification */}
          <div className="px-8 py-6 flex items-center justify-between gap-6">
            <div className="flex-1">
              <p className="text-[#1A2A3A] text-xs font-semibold mb-1">Verificar autenticidad</p>
              <p className="text-[#8896A5] text-[11px] leading-relaxed">
                Escaneá el código QR para confirmar que este CV es auténtico y ver el perfil en tiempo real.
              </p>
              <p className="text-[#B0BEC5] text-[10px] mt-2">{profileUrl}</p>
              <p className="text-[#B0BEC5] text-[10px] mt-3">Generado el {today} · Capy Platforms</p>
            </div>
            {qrDataUrl && (
              <div className="flex-shrink-0 text-center">
                <img src={qrDataUrl} alt="QR de verificación" className="w-24 h-24 border border-black/10 rounded-xl" />
                <p className="text-[#B0BEC5] text-[9px] mt-1">Verificar</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: A4; margin: 1.5cm 1.5cm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </>
  )
}
