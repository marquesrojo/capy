import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff, ACTIVE_VENUE_ID } from '../../lib/supabase'

const FACES = [
  { value: 1, emoji: '😞', label: 'Muy mala' },
  { value: 2, emoji: '🙁', label: 'Mala' },
  { value: 3, emoji: '😐', label: 'Regular' },
  { value: 4, emoji: '🙂', label: 'Buena' },
  { value: 5, emoji: '😄', label: 'Excelente' }
]

const PERIODS = [
  { id: '7d', label: 'Últimos 7 días', days: 7 },
  { id: '30d', label: 'Último mes', days: 30 },
  { id: '90d', label: 'Últimos 3 meses', days: 90 },
  { id: 'all', label: 'Todo', days: null }
]

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')

  useEffect(() => {
    async function load() {
      const { data } = await supabaseStaff
        .from('order_feedback')
        .select('*, orders!inner(venue_id)')
        .eq('orders.venue_id', ACTIVE_VENUE_ID)
        .order('created_at', { ascending: false })
      setFeedback(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const selectedPeriod = PERIODS.find(p => p.id === period)
  const filtered = feedback.filter(f => {
    if (!selectedPeriod.days) return true
    const cutoff = Date.now() - selectedPeriod.days * 24 * 60 * 60 * 1000
    return new Date(f.created_at).getTime() >= cutoff
  })

  const total = filtered.length
  const average = total > 0 ? filtered.reduce((sum, f) => sum + f.rating, 0) / total : 0
  const distribution = FACES.map(face => ({
    ...face,
    count: filtered.filter(f => f.rating === face.value).length
  }))
  const maxCount = Math.max(1, ...distribution.map(d => d.count))

  const withNotes = filtered.filter(f => f.notes)

  if (loading) {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
        <p className="text-smoke-400 text-sm">Cargando encuestas...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-carbon-950 pb-10">
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">ENCUESTAS</h1>
          <Link to="/admin" className="text-smoke-400 text-xs underline">
            ← Volver
          </Link>
        </div>
        <div className="flex gap-2 overflow-x-auto mt-3 -mx-5 px-5 pb-1 scrollbar-hide">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                period === p.id
                  ? 'bg-ember-500 text-white border-ember-500'
                  : 'border-carbon-700 text-smoke-400'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-5 mt-4 space-y-6">
        {total === 0 ? (
          <p className="text-smoke-500 text-sm text-center py-10">
            No hay encuestas respondidas en este período.
          </p>
        ) : (
          <>
            <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-smoke-400 text-xs uppercase tracking-wide mb-1">Promedio</p>
                <p className="font-display text-4xl text-ember-500">{average.toFixed(1)}</p>
                <p className="text-smoke-500 text-xs mt-1">sobre 5</p>
              </div>
              <div className="text-right">
                <p className="text-smoke-400 text-xs uppercase tracking-wide mb-1">Respuestas</p>
                <p className="font-display text-4xl text-smoke-300">{total}</p>
              </div>
            </div>

            <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
              <p className="text-smoke-400 text-xs font-semibold uppercase tracking-wide mb-4">
                Distribución
              </p>
              <div className="space-y-3">
                {distribution.map(d => (
                  <div key={d.value} className="flex items-center gap-3">
                    <span className="text-xl w-7">{d.emoji}</span>
                    <div className="flex-1 bg-carbon-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-ember-500 h-full rounded-full"
                        style={{ width: `${(d.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-smoke-400 text-xs w-8 text-right">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {withNotes.length > 0 && (
              <div>
                <p className="text-smoke-400 text-xs font-semibold uppercase tracking-wide mb-2">
                  Comentarios · {withNotes.length}
                </p>
                <div className="space-y-2">
                  {withNotes.map(f => {
                    const face = FACES.find(face => face.value === f.rating)
                    return (
                      <div
                        key={f.id}
                        className="bg-carbon-900 border border-carbon-700 rounded-xl p-3"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-base">{face?.emoji}</span>
                          <span className="text-smoke-500 text-xs">
                            {new Date(f.created_at).toLocaleDateString('es-AR')}
                          </span>
                        </div>
                        <p className="text-smoke-300 text-sm italic">"{f.notes}"</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
