import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import html2canvas from 'html2canvas'
import { supabaseStaff } from '../../lib/supabase'
import { getWeeklyWrappedData } from '../../lib/weeklyWrapped'

const DURATION = 6000
const SLIDES = 5

const BG = [
  'linear-gradient(160deg, #002d2d 0%, #008080 100%)',
  'linear-gradient(160deg, #BF360C 0%, #FF7043 100%)',
  'linear-gradient(160deg, #880E4F 0%, #E91E63 100%)',
  'linear-gradient(160deg, #1A237E 0%, #5C6BC0 100%)',
  'linear-gradient(160deg, #003333 0%, #00695C 100%)',
]

export default function WeeklyWrapped({ staffId, staffAlias, staffName, onClose }) {
  const [slide, setSlide] = useState(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qrUrl, setQrUrl] = useState('')
  const [cachedBlob, setCachedBlob] = useState(null)
  const [toast, setToast] = useState('')

  const profileUrl = `${window.location.origin}/c/${staffAlias || staffId}`

  useEffect(() => {
    if (!staffId) { setLoading(false); return }
    Promise.all([
      getWeeklyWrappedData(supabaseStaff, staffId),
      QRCode.toDataURL(profileUrl, {
        width: 240, margin: 1,
        color: { dark: '#FFFFFF', light: '#00000000' },
      }),
    ]).then(([wrapped, qr]) => {
      setData(wrapped)
      setQrUrl(qr)
      setLoading(false)
    })
  }, [staffId])

  // Auto-advance
  useEffect(() => {
    if (loading) return
    const t = setTimeout(() => setSlide(s => Math.min(s + 1, SLIDES - 1)), DURATION)
    return () => clearTimeout(t)
  }, [slide, loading])

  // Pre-capture image when share slide is reached
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

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function handleTap(e) {
    if (e.target.closest('button')) return
    const mid = window.innerWidth / 2
    setSlide(s => e.clientX < mid ? Math.max(0, s - 1) : Math.min(SLIDES - 1, s + 1))
  }

  // Called immediately in click handler — no prior await, so iOS Safari allows it
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

  async function handleShareWA() {
    if (!cachedBlob) return
    const file = new File([cachedBlob], 'capy-wrapped.png', { type: 'image/png' })
    try {
      await navigator.share({ files: [file], title: 'Mi Wrapped de Capy', text: `¡Mirá mi Wrapped de Capy! 🔥 ${profileUrl}` })
    } catch (e) {
      if (e?.name !== 'AbortError') {
        const url = URL.createObjectURL(cachedBlob)
        const a = document.createElement('a')
        a.href = url; a.download = 'capy-wrapped.png'
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        showToast('Imagen guardada — adjuntala en WhatsApp')
      }
    }
  }

  async function handleShareIG() {
    if (!cachedBlob) return
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': cachedBlob })])
      showToast('Imagen copiada — pegala en Stories')
    } catch {
      const url = URL.createObjectURL(cachedBlob)
      const a = document.createElement('a')
      a.href = url; a.download = 'capy-wrapped.png'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      showToast('Imagen guardada — abrila en Stories')
    }
    window.location.href = 'instagram://story-camera'
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: BG[0] }}>
        <div className="text-center">
          <p className="text-white text-2xl font-bold mb-2">⚡</p>
          <p className="text-white/70 text-sm">Calculando tu semana...</p>
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
      <div className="absolute top-0 inset-x-0 flex gap-1 px-3 pt-12 z-20 pointer-events-none">
        {Array.from({ length: SLIDES }).map((_, i) => (
          <div key={i} className="flex-1 h-[3px] rounded-full bg-white/25 overflow-hidden">
            <div
              key={`${slide}-${i}`}
              className="h-full bg-white rounded-full"
              style={{
                width: i < slide ? '100%' : '0%',
                animation: i === slide && !exporting ? `wrappedFill ${DURATION}ms linear forwards` : 'none',
              }}
            />
          </div>
        ))}
      </div>

      {/* Toast */}
      {toast ? (
        <div className="absolute top-16 inset-x-4 z-30 bg-black/70 text-white text-xs font-semibold text-center py-2.5 px-4 rounded-xl pointer-events-none">
          {toast}
        </div>
      ) : null}

      {/* Header */}
      <div className="absolute top-3 inset-x-0 flex items-center justify-between px-4 z-20">
        <span className="text-white/80 text-xs font-bold tracking-widest uppercase">⚡ Capy</span>
        <button
          onClick={(e) => { e.stopPropagation(); onClose() }}
          className="text-white/60 w-8 h-8 flex items-center justify-center text-lg"
        >×</button>
      </div>

      {/* Card */}
      <div id="wrapped-card" className="absolute inset-0 flex flex-col items-center justify-center px-7 text-white text-center pointer-events-none">
        {slide === 0 && <IntroCard data={data} staffName={staffName} />}
        {slide === 1 && <OrdersCard data={data} />}
        {slide === 2 && <RatingsCard data={data} />}
        {slide === 3 && <ArchetypeCard data={data} />}
        {slide === 4 && (
          <ShareCard
            data={data}
            qrUrl={qrUrl}
            profileUrl={profileUrl}
            onExport={handleExport}
            onShareIG={handleShareIG}
            onShareWA={handleShareWA}
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
      <p className="text-white/50 text-xs font-semibold uppercase tracking-[0.2em]">Tu semana en Capy</p>
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
        {orders.total === 1 ? 'comanda esta semana' : 'comandas esta semana'}
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
          <p className="wup2 text-white/80 text-lg font-semibold">cinco estrellas ⭐</p>
          <p className="wup2 text-white/50 text-sm">{ratings.total} {ratings.total === 1 ? 'opinión' : 'opiniones'} esta semana</p>
          {ratings.bestComment && (
            <div className="wup3 bg-white/15 rounded-2xl px-5 py-4 mt-2 max-w-xs mx-auto">
              <p className="text-white/80 text-sm italic leading-relaxed">"{ratings.bestComment}"</p>
            </div>
          )}
        </>
      ) : (
        <div className="wup2 space-y-3">
          <p className="text-white/70 text-xl font-semibold">Sin calificaciones</p>
          <p className="text-white/40 text-sm">Pedile a tus clientes que te califiquen esta semana</p>
        </div>
      )}
    </div>
  )
}

function ArchetypeCard({ data }) {
  const { archetype } = data
  return (
    <div className="space-y-5">
      <p className="wup text-white/60 font-bold text-xs uppercase tracking-[0.2em]">Tu rol esta semana</p>
      <p className="wpop" style={{ fontSize: 'clamp(4rem,20vw,7rem)', lineHeight: 1 }}>{archetype.emoji}</p>
      <p className="wup2 font-black text-3xl leading-tight">{archetype.name}</p>
      <p className="wup3 text-white/65 text-base max-w-xs mx-auto leading-relaxed">{archetype.desc}</p>
    </div>
  )
}

function ShareCard({ data, qrUrl, profileUrl, onExport, onShareIG, onShareWA, ready }) {
  const label = ready ? null : '⏳'
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
      <div className="wup3 pointer-events-auto space-y-2">
        <button
          onClick={(e) => { e.stopPropagation(); onShareIG() }}
          disabled={!ready}
          className="w-full bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white font-bold py-3 rounded-2xl text-sm active:scale-95 transition-transform disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          {label || 'IG Stories'}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onShareWA() }}
          disabled={!ready}
          className="w-full bg-[#25D366] text-white font-bold py-3 rounded-2xl text-sm active:scale-95 transition-transform disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          {label || 'WhatsApp'}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onExport() }}
          disabled={!ready}
          className="w-full bg-white/20 backdrop-blur-sm text-white font-bold py-3 rounded-2xl text-sm active:scale-95 transition-transform disabled:opacity-40"
        >
          {label || '📲 Compartir / Guardar'}
        </button>
      </div>
    </div>
  )
}
