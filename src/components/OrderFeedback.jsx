import { useEffect, useState } from 'react'
import { supabaseCustomer, ACTIVE_VENUE_ID } from '../lib/supabase'
import { useCustomer } from '../hooks/useCustomer'

const CAPY_FACES = [
  {
    value: 1,
    label: 'Muy mala',
    svg: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M12 16.5c-3.1 0-5.7-1.8-6.9-4.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M7 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0M14 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0" fill="currentColor"/>
      </svg>
    )
  },
  {
    value: 2,
    label: 'Mala',
    svg: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M16 16.5l-8-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="8.5" cy="10" r="1.5" fill="currentColor"/>
        <circle cx="15.5" cy="10" r="1.5" fill="currentColor"/>
      </svg>
    )
  },
  {
    value: 3,
    label: 'Regular',
    svg: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 15.5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="8.5" cy="10" r="1.5" fill="currentColor"/>
        <circle cx="15.5" cy="10" r="1.5" fill="currentColor"/>
      </svg>
    )
  },
  {
    value: 4,
    label: 'Buena',
    svg: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M16 15.5c-1.3 1.3-3 2-4 2s-2.7-.7-4-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="8.5" cy="10" r="1.5" fill="currentColor"/>
        <circle cx="15.5" cy="10" r="1.5" fill="currentColor"/>
      </svg>
    )
  },
  {
    value: 5,
    label: 'Excelente',
    svg: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M7 15s1.5 3 5 3 5-3 5-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M16.5 9.5c.3.3.7.3 1 0 .6-.6 1.3-.9 2-.9.7 0 1.4.3 2 .9a.7.7 0 0 0 1 0c.3-.3.3-.7 0-1-.8-.8-1.9-1.3-3-1.3-1.1 0-2.2.5-3 1.3a.7.7 0 0 0 0 1ZM3 9.5c.3.3.7.3 1 0 .6-.6 1.3-.9 2-.9.7 0 1.4.3 2 .9a.7.7 0 0 0 1 0c.3-.3.3-.7 0-1-.8-.8-1.9-1.3-3-1.3-1.1 0-2.2.5-3 1.3a.7.7 0 0 0 0 1Z" fill="currentColor"/>
      </svg>
    )
  }
]

const RECOGNITION_TAGS = [
  {
    id: 'amabilidad', label: 'Amabilidad',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
  },
  {
    id: 'rapidez', label: 'Rapidez',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
  },
  {
    id: 'recomendacion', label: 'Recomendó la carta',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
  },
]

export default function OrderFeedback({ orderId, staffId }) {
  const { customer } = useCustomer()
  const [existing, setExisting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(null)
  const [notes, setNotes] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [kitchenAlias, setKitchenAlias] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const [feedbackRes, venueRes] = await Promise.all([
        supabaseCustomer.from('order_feedback').select('*').eq('order_id', orderId).maybeSingle(),
        supabaseCustomer.from('venues').select('kitchen_alias').eq('id', ACTIVE_VENUE_ID).single()
      ])
      setExisting(feedbackRes.data)
      setKitchenAlias(venueRes.data?.kitchen_alias || null)
      setLoading(false)
    }
    load()
  }, [orderId])

  async function handleSubmit() {
    if (!rating) {
      setError('Elegí una opción antes de enviar.')
      return
    }
    setSubmitting(true)
    setError('')

    // Registered customers have a customers row; anonymous visitors don't.
    // Null is allowed by the INSERT policy for unregistered users.
    const customerId = customer?.id || null

    const { error: insertError } = await supabaseCustomer
      .from('order_feedback')
      .insert({
        order_id: orderId,
        customer_id: customerId,
        rating,
        notes: notes.trim() || null,
        staff_id: staffId || null,
        tags: selectedTags.length > 0 ? selectedTags : null,
      })

    setSubmitting(false)

    if (insertError) {
      setError('No pudimos guardar tu calificación. Intentá de nuevo.')
      return
    }

    if (rating === 5 && staffId) {
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ staff_id: staffId, title: '¡5 estrellas!', body: 'Un cliente te calificó con 5 estrellas.' }),
      }).catch(() => {})
    }

    // Construct local state from inputs — avoids needing SELECT policy on null customer_id
    setExisting({ order_id: orderId, customer_id: customerId, rating, notes: notes.trim() || null })
  }

  function handleCopyAlias() {
    navigator.clipboard.writeText(kitchenAlias)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return null

  if (existing) {
    const face = CAPY_FACES.find(f => f.value === existing.rating)
    const showKitchenTip = existing.rating >= 4 && kitchenAlias
    return (
      <div className="mt-6 space-y-3">
        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
          <p className="text-smoke-400 text-xs font-semibold uppercase tracking-wide mb-3">
            Tu calificación
          </p>
          <div className="flex items-center gap-3">
            <span className="text-pucara-blue-500">{face?.svg}</span>
            <span className="text-smoke-300 text-sm">{face?.label}</span>
          </div>
          {existing.notes && (
            <p className="text-smoke-400 text-sm mt-3 italic">"{existing.notes}"</p>
          )}
          <p className="text-smoke-500 text-xs mt-3">¡Gracias por tu opinión!</p>
        </div>

        {showKitchenTip && (
          <div className="bg-carbon-900 border border-amber-500/30 rounded-2xl p-5">
            <p className="text-amber-600 text-sm font-medium mb-1">
              ¿Te gustó la comida?
            </p>
            <p className="text-smoke-400 text-xs mb-3">
              El equipo de cocina también agradece tu apoyo
            </p>
            <div className="flex items-center gap-2 bg-carbon-800 rounded-xl px-4 py-3">
              <span className="font-mono text-smoke-200 text-sm flex-1">{kitchenAlias}</span>
              <button
                onClick={handleCopyAlias}
                className="text-xs font-semibold text-amber-600 border border-amber-500/40 rounded-full px-3 py-1"
              >
                {copied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mt-6 bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
      <p className="text-smoke-300 font-medium text-sm mb-4">¿Cómo fue tu experiencia?</p>

      <div className="flex justify-between mb-5">
        {CAPY_FACES.map(face => (
          <button
            key={face.value}
            type="button"
            onClick={() => { setRating(face.value); setSelectedTags([]) }}
            style={{
              transition: 'all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
              transform: rating === face.value
                ? 'scale(1.25)'
                : rating !== null ? 'scale(0.9)' : 'scale(1)',
              opacity: rating !== null && rating !== face.value ? 0.25 : 1,
              color: rating === face.value ? '#001C44' : '#002F6C',
              WebkitTapHighlightColor: 'transparent'
            }}
            className="flex flex-col items-center gap-1.5 p-1"
          >
            {face.svg}
            <span className="text-[10px] text-smoke-500">{face.label}</span>
          </button>
        ))}
      </div>

      {rating >= 4 && (
        <div className="mb-4">
          <p className="text-smoke-400 text-xs mb-2">¿Qué destacás?</p>
          <div className="flex flex-wrap gap-2">
            {RECOGNITION_TAGS.map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => setSelectedTags(prev =>
                  prev.includes(tag.id) ? prev.filter(t => t !== tag.id) : [...prev, tag.id]
                )}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  selectedTags.includes(tag.id)
                    ? 'bg-pucara-blue-500 border-pucara-blue-500 text-white'
                    : 'bg-carbon-800 border-carbon-600 text-smoke-400'
                }`}
              >
                {tag.icon}
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Contanos algo más (opcional)"
        className="input resize-none mb-3"
        rows={2}
      />

      {error && <p className="text-red-700 text-xs mb-2">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full bg-pucara-blue-500 hover:bg-pucara-blue-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm"
      >
        {submitting ? 'Enviando...' : 'Enviar calificación'}
      </button>
    </div>
  )
}
