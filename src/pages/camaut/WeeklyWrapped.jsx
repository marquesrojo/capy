import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import html2canvas from 'html2canvas'
import { supabaseStaff } from '../../lib/supabase'
import { StarIcon, PhoneIcon, ClockIcon } from '../../components/Icons'
import { getWeeklyWrappedData } from '../../lib/weeklyWrapped'

const DURATION = 6000
const SLIDES = 6

const BG = [
  'linear-gradient(160deg, #002d2d 0%, #008080 100%)',
  'linear-gradient(160deg, #BF360C 0%, #FF7043 100%)',
  'linear-gradient(160deg, #880E4F 0%, #E91E63 100%)',
  'linear-gradient(160deg, #1A237E 0%, #5C6BC0 100%)',
  'linear-gradient(160deg, #1B5E20 0%, #43A047 100%)',
  'linear-gradient(160deg, #003333 0%, #00695C 100%)',
]

export default function WeeklyWrapped({ staffId, staffAlias, staffName, staffAvatarUrl, venueNames = [], onClose, period = 'week' }) {
  const [slide, setSlide] = useState(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qrUrl, setQrUrl] = useState('')
  const [cachedBlob, setCachedBlob] = useState(null)

  const profileUrl = `${window.location.origin}/c/${staffAlias || staffId}`

  useEffect(() => {
    if (!staffId) { setLoading(false); return }
    Promise.all([
      getWeeklyWrappedData(supabaseStaff, staffId, period),
      QRCode.toDataURL(profileUrl, {
        width: 240, margin: 1,
        color: { dark: '#FFFFFF', light: '#00000000' },
      }),
    ]).then(([wrapped, qr]) => {
      setData(wrapped)
      setQrUrl(qr)
      setLoading(false)
    })
  }, [staffId, period])

  // Auto-advance
  useEffect(() => {
    if (loading) return
    const t = setTimeout(() => setSlide(s => Math.min(s + 1, SLIDES - 1)), DURATION)
    return () => clearTimeout(t)
  }, [slide, loading])

  // Pre-capture summary slide (slide 4) so the shared image shows all key stats
  useEffect(() => {
    if (slide !== 4 || loading) return
    let cancelled = false
    const t = setTimeout(async () => {
      const el = document.getElementById('wrapped-outer')
      if (!el || cancelled) return
      try {
        const canvas = await html2canvas(el, {
          scale: 2, useCORS: true, backgroundColor: null, logging: false,
          x: 0, y: 0, scrollX: 0, scrollY: 0,
          windowWidth: window.innerWidth, windowHeight: window.innerHeight,
          onclone: (doc) => {
            const clone = doc.getElementById('wrapped-outer')
            if (clone) {
              clone.style.position = 'absolute'
              clone.style.transition = 'none'
              clone.querySelectorAll('*').forEach(n => { n.style.animation = 'none' })
            }
          },
        })
        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'))
        if (!cancelled) setCachedBlob(blob)
      } catch (e) {
        console.error('pre-capture error', e)
      }
    }, 700)
    return () => { cancelled = true; clearTimeout(t) }
  }, [slide, loading])

  function handleTap(e) {
    if (e.target.closest('button')) return
    const mid = window.innerWidth / 2
    setSlide(s => e.clientX < mid ? Math.max(0, s - 1) : Math.min(SLIDES - 1, s + 1))
  }

  async function handleExport() {
    if (!cachedBlob) return
    const file = new File([cachedBlob], 'capy-wrapped.png', { type: 'image/png' })
    try {
      await navigator.share({ files: [file], title: 'Mi Wrapped de Capy', text: '¡Mirá mi Wrapped de Capy! 🔥' })
    } catch (e) {
      if (e?.name !== 'AbortError') {
        const url = URL.createObjectURL(cachedBlob)
        const a = document.createElement('a')
        a.href = url; a.download = 'capy-wrapped.png'
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: BG[0] }}>
        <div className="text-center">
          <p className="text-white text-2xl font-bold mb-2">⚡</p>
          <p className="text-white/70 text-sm">Calculando tu resumen...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      id="wrapped-outer"
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ background: BG[slide], transition: 'background 0.4s ease' }}
      onClick={handleTap}
    >
      {/* Progress bars */}
      <div className="absolute top-0 inset-x-0 flex gap-1 px-3 z-20 pointer-events-none" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 2.5rem)' }}>
        {Array.from({ length: SLIDES }).map((_, i) => (
          <div key={i} className="flex-1 h-[3px] rounded-full bg-white/25 overflow-hidden">
            <div
              key={`${slide}-${i}`}
              className="h-full bg-white rounded-full"
              style={{
                width: i < slide ? '100%' : '0%',
                animation: i === slide ? `wrappedFill ${DURATION}ms linear forwards` : 'none',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header — debajo del safe-area para que el botón cerrar no quede bajo el notch */}
      <div className="absolute inset-x-0 flex items-center justify-between px-4 z-30" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}>
        <span className="text-white/80 text-xs font-bold tracking-widest uppercase">⚡ Capy</span>
        <button
          onClick={(e) => { e.stopPropagation(); onClose() }}
          className="text-white/80 w-11 h-11 flex items-center justify-center text-2xl -mr-2"
          aria-label="Cerrar"
        >×</button>
      </div>

      {/* Card */}
      <div id="wrapped-card" className="absolute inset-0 flex flex-col items-center justify-center px-7 text-white text-center pointer-events-none">
        {slide === 0 && <IntroCard data={data} staffName={staffName} />}
        {slide === 1 && <OrdersCard data={data} />}
        {slide === 2 && <RatingsCard data={data} />}
        {slide === 3 && <ArchetypeCard data={data} />}
        {slide === 4 && <SummaryCard data={data} qrUrl={qrUrl} staffName={staffName} staffAvatarUrl={staffAvatarUrl} venueNames={venueNames} />}
        {slide === 5 && (
          <ShareCard
            qrUrl={qrUrl}
            profileUrl={profileUrl}
            onExport={handleExport}
            ready={!!cachedBlob}
          />
        )}

        {/* QR watermark on slides 0-3 */}
        {slide < 4 && qrUrl && (
          <div className="absolute bottom-10 right-5 flex flex-col items-center gap-1">
            <img src={qrUrl} className="w-10 h-10 opacity-50" style={{ imageRendering: 'pixelated' }} />
            <p className="text-white/30 text-[8px]">capyapp.co</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes wrappedFill { from { width: 0% } to { width: 100% } }
        @keyframes wrappedUp { from { opacity:0; transform:translateY(28px) } to { opacity:1; transform:translateY(0) } }
        @keyframes wrappedPop { from { opacity:0; transform:scale(0.7) } to { opacity:1; transform:scale(1) } }
        .wup { animation: wrappedUp 0.55s cubic-bezier(.22,1,.36,1) both }
        .wpop { animation: wrappedPop 0.5s cubic-bezier(.22,1,.36,1) both }
        .wup2 { animation: wrappedUp 0.55s 0.12s cubic-bezier(.22,1,.36,1) both }
        .wup3 { animation: wrappedUp 0.55s 0.24s cubic-bezier(.22,1,.36,1) both }
      `}</style>
    </div>
  )
}

function IntroCard({ data, staffName }) {
  const first = staffName?.split(' ')[0] || 'vos'
  return (
    <div className="space-y-8 wup">
      <p className="text-white/50 text-xs font-semibold uppercase tracking-[0.2em]">Tu resumen en Capy</p>
      <div>
        <p className="font-black leading-none" style={{ fontSize: 'clamp(3rem,14vw,5.5rem)' }}>
          El Resumen<br />de {first}
        </p>
      </div>
      <p className="text-white/60 text-base">{data.period}</p>
      <p className="text-white/35 text-xs mt-10">Tocá para ver tus logros →</p>
    </div>
  )
}

function OrdersCard({ data }) {
  const { orders } = data
  return (
    <div className="space-y-5">
      <p className="wup text-white/60 font-bold text-xs uppercase tracking-[0.2em]">El Correcaminos 🏃</p>
      <p className="wpop font-black text-white leading-none" style={{ fontSize: 'clamp(5rem,24vw,9rem)' }}>
        {orders.total}
      </p>
      <p className="wup2 text-white/80 text-xl font-semibold">
        {orders.total === 1 ? 'comanda este período' : 'comandas este período'}
      </p>
      {orders.bestDay && (
        <div className="wup3 bg-white/15 backdrop-blur-sm rounded-2xl px-6 py-4 mt-4">
          <p className="text-white/60 text-xs">Día estrella</p>
          <p className="text-white font-bold text-xl">{orders.bestDay.name}</p>
          <p className="text-white/60 text-sm">{orders.bestDay.count} pedidos ese día</p>
        </div>
      )}
    </div>
  )
}

function RatingsCard({ data }) {
  const { ratings } = data
  return (
    <div className="space-y-5">
      <p className="wup text-white/60 font-bold text-xs uppercase tracking-[0.2em]">Imán de Amor 💕</p>
      {ratings.total > 0 ? (
        <>
          <p className="wpop font-black leading-none" style={{ fontSize: 'clamp(4.5rem,22vw,8rem)' }}>
            {ratings.fiveStarPct}%
          </p>
          <p className="wup2 text-white/80 text-lg font-semibold flex items-center gap-1.5">cinco estrellas <StarIcon size={16} /></p>
          <p className="wup2 text-white/50 text-sm">{ratings.total} {ratings.total === 1 ? 'opinión' : 'opiniones'} este período</p>
          {ratings.bestComment && (
            <div className="wup3 bg-white/15 rounded-2xl px-5 py-4 mt-2 max-w-xs mx-auto">
              <p className="text-white/80 text-sm italic leading-relaxed">"{ratings.bestComment}"</p>
            </div>
          )}
        </>
      ) : (
        <div className="wup2 space-y-3">
          <p className="text-white/70 text-xl font-semibold">Sin calificaciones</p>
          <p className="text-white/40 text-sm">Pedile a tus clientes que te califiquen</p>
        </div>
      )}
    </div>
  )
}

function ArchetypeCard({ data }) {
  const { archetype } = data
  return (
    <div className="space-y-5">
      <p className="wup text-white/60 font-bold text-xs uppercase tracking-[0.2em]">Tu rol este período</p>
      <p className="wpop" style={{ fontSize: 'clamp(4rem,20vw,7rem)', lineHeight: 1 }}>{archetype.emoji}</p>
      <p className="wup2 font-black text-3xl leading-tight">{archetype.name}</p>
      <p className="wup3 text-white/65 text-base max-w-xs mx-auto leading-relaxed">{archetype.desc}</p>
    </div>
  )
}

function SummaryCard({ data, qrUrl, staffName, staffAvatarUrl, venueNames }) {
  const { orders, ratings, archetype } = data
  const first = staffName?.split(' ')[0] || ''
  return (
    <div className="w-full max-w-xs space-y-3">
      {/* Identity */}
      <div className="wup flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/40 overflow-hidden flex items-center justify-center flex-shrink-0">
          {staffAvatarUrl ? (
            <img src={staffAvatarUrl} alt={staffName} className="w-full h-full object-cover" crossOrigin="anonymous" />
          ) : (
            <span className="text-white font-bold text-lg">{staffName?.slice(0, 2).toUpperCase() || 'CA'}</span>
          )}
        </div>
        <div className="text-left">
          <p className="font-black text-lg leading-tight">{first || staffName}</p>
          {venueNames.length > 0 && (
            <p className="text-white/55 text-[10px] leading-relaxed">{venueNames.join(' · ')}</p>
          )}
          <p className="text-white/40 text-[10px]">{data.period}</p>
        </div>
      </div>

      {/* Archetype */}
      <div className="wpop flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3">
        <span style={{ fontSize: '2rem', lineHeight: 1 }}>{archetype.emoji}</span>
        <div className="text-left">
          <p className="font-black text-base leading-tight">{archetype.name}</p>
          <p className="text-white/55 text-[11px] leading-relaxed">{archetype.desc}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="wup2 grid grid-cols-2 gap-2">
        <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 text-left">
          <p className="text-white font-black leading-none" style={{ fontSize: 'clamp(1.8rem,9vw,2.8rem)' }}>{orders.total}</p>
          <p className="text-white/55 text-xs mt-1">{orders.total === 1 ? 'comanda' : 'comandas'}</p>
        </div>
        {ratings.total > 0 ? (
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 text-left">
            <p className="text-white font-black leading-none" style={{ fontSize: 'clamp(1.8rem,9vw,2.8rem)' }}>{ratings.fiveStarPct}%</p>
            <p className="text-white/55 text-xs mt-1 flex items-center gap-1">cinco <StarIcon size={10} /></p>
          </div>
        ) : (
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 text-left">
            <p className="text-white font-black text-3xl leading-none">—</p>
            <p className="text-white/55 text-xs mt-1">sin rating</p>
          </div>
        )}
      </div>

      {ratings.bestComment && (
        <div className="wup3 bg-white/10 rounded-2xl px-4 py-3 text-left">
          <p className="text-white/75 text-xs italic leading-relaxed">"{ratings.bestComment}"</p>
        </div>
      )}

      {qrUrl && (
        <div className="wup3 flex items-center gap-2">
          <img src={qrUrl} className="w-7 h-7 opacity-50" style={{ imageRendering: 'pixelated' }} />
          <p className="text-white/30 text-[9px]">capyapp.co</p>
        </div>
      )}
    </div>
  )
}

function ShareCard({ qrUrl, profileUrl, onExport, ready }) {
  return (
    <div className="space-y-5 w-full max-w-xs mx-auto">
      <div className="wup space-y-1">
        <p className="font-black text-3xl leading-tight">¡Compartí<br />tu Wrapped!</p>
        <p className="text-white/50 text-xs">Subilo a tus Stories y motivá a tu equipo</p>
      </div>
      {qrUrl && (
        <div className="wpop bg-white rounded-2xl p-4 w-32 h-32 mx-auto flex items-center justify-center">
          <img src={qrUrl} className="w-full h-full" style={{ imageRendering: 'pixelated', filter: 'invert(1) sepia(1) saturate(3) hue-rotate(120deg)' }} />
        </div>
      )}
      <p className="wup2 text-white/40 text-[10px] font-mono">{profileUrl}</p>
      <div className="wup3 pointer-events-auto">
        <button
          onClick={(e) => { e.stopPropagation(); onExport() }}
          disabled={!ready}
          className="w-full bg-white text-teal-900 font-bold py-4 rounded-2xl text-base active:scale-95 transition-transform disabled:opacity-40"
        >
          {ready ? <span className="flex items-center justify-center gap-2"><PhoneIcon size={16} /> Compartir / Guardar</span> : <ClockIcon size={20} />}
        </button>
      </div>
    </div>
  )
}
