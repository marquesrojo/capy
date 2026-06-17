import { useEffect, useState } from 'react'
import { supabaseCustomer } from '../lib/supabase'
import { useCustomer } from '../hooks/useCustomer'

const FACES = [
  { value: 1, emoji: '😞', label: 'Muy mala' },
  { value: 2, emoji: '🙁', label: 'Mala' },
  { value: 3, emoji: '😐', label: 'Regular' },
  { value: 4, emoji: '🙂', label: 'Buena' },
  { value: 5, emoji: '😄', label: 'Excelente' }
]

export default function OrderFeedback({ orderId }) {
  const { customer } = useCustomer()
  const [existing, setExisting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabaseCustomer
        .from('order_feedback')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle()
      setExisting(data)
      setLoading(false)
    }
    load()
  }, [orderId])

  async function handleSubmit() {
    if (!rating) {
      setError('Elegí una carita antes de enviar.')
      return
    }
    setSubmitting(true)
    setError('')

    const { data, error: insertError } = await supabaseCustomer
      .from('order_feedback')
      .insert({
        order_id: orderId,
        customer_id: customer.id,
        rating,
        notes: notes.trim() || null
      })
      .select()
      .single()

    setSubmitting(false)

    if (insertError) {
      setError('No pudimos guardar tu calificación. Intentá de nuevo.')
      return
    }
    setExisting(data)
  }

  if (loading) return null

  if (existing) {
    const face = FACES.find(f => f.value === existing.rating)
    return (
      <div className="mt-6 bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
        <p className="text-smoke-400 text-xs font-semibold uppercase tracking-wide mb-3">
          Tu calificación
        </p>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{face?.emoji}</span>
          <span className="text-smoke-300 text-sm">{face?.label}</span>
        </div>
        {existing.notes && (
          <p className="text-smoke-400 text-sm mt-3 italic">"{existing.notes}"</p>
        )}
        <p className="text-smoke-500 text-xs mt-3">¡Gracias por tu opinión!</p>
      </div>
    )
  }

  return (
    <div className="mt-6 bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
      <p className="text-smoke-300 font-medium text-sm mb-3">¿Cómo fue tu experiencia?</p>

      <div className="flex justify-between mb-4">
        {FACES.map(face => (
          <button
            key={face.value}
            type="button"
            onClick={() => setRating(face.value)}
            className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-colors ${
              rating === face.value ? 'bg-ember-500/15 border border-ember-500' : ''
            }`}
          >
            <span className="text-2xl">{face.emoji}</span>
            <span className="text-[10px] text-smoke-500">{face.label}</span>
          </button>
        ))}
      </div>

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
        className="w-full bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm"
      >
        {submitting ? 'Enviando...' : 'Enviar calificación'}
      </button>
    </div>
  )
}
