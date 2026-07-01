import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const FACES = [
  {
    value: 1, label: 'Muy mala',
    svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/><path d="M12 16.5c-3.1 0-5.7-1.8-6.9-4.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M7 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0M14 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0" fill="currentColor"/></svg>
  },
  {
    value: 2, label: 'Mala',
    svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/><path d="M16 16.5l-8-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8.5" cy="10" r="1.5" fill="currentColor"/><circle cx="15.5" cy="10" r="1.5" fill="currentColor"/></svg>
  },
  {
    value: 3, label: 'Regular',
    svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/><path d="M8 15.5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8.5" cy="10" r="1.5" fill="currentColor"/><circle cx="15.5" cy="10" r="1.5" fill="currentColor"/></svg>
  },
  {
    value: 4, label: 'Buena',
    svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/><path d="M16 15.5c-1.3 1.3-3 2-4 2s-2.7-.7-4-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8.5" cy="10" r="1.5" fill="currentColor"/><circle cx="15.5" cy="10" r="1.5" fill="currentColor"/></svg>
  },
  {
    value: 5, label: 'Excelente',
    svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/><path d="M7 15s1.5 3 5 3 5-3 5-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M16.5 9.5c.3.3.7.3 1 0 .6-.6 1.3-.9 2-.9.7 0 1.4.3 2 .9a.7.7 0 0 0 1 0c.3-.3.3-.7 0-1-.8-.8-1.9-1.3-3-1.3-1.1 0-2.2.5-3 1.3a.7.7 0 0 0 0 1ZM3 9.5c.3.3.7.3 1 0 .6-.6 1.3-.9 2-.9.7 0 1.4.3 2 .9a.7.7 0 0 0 1 0c.3-.3.3-.7 0-1-.8-.8-1.9-1.3-3-1.3-1.1 0-2.2.5-3 1.3a.7.7 0 0 0 0 1Z" fill="currentColor"/></svg>
  }
]

const PERIODS = [
  { id: '7d', label: 'Últimos 7 días', days: 7 },
  { id: '30d', label: 'Último mes', days: 30 },
  { id: '90d', label: 'Últimos 3 meses', days: 90 },
  { id: 'all', label: 'Todo', days: null }
]

export default function FeedbackPage() {
  const { venueId } = useAuth()
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')

  useEffect(() => {
    if (!venueId) return
    async function load() {
      // Traemos feedback junto con el pedido para poder filtrar por venue
      const { data } = await supabaseStaff
        .from('order_feedback')
        .select('*, orders!inner(venue_id)')
        .eq('orders.venue_id', venueId)
        .order('created_at', { ascending: false })
      setFeedback(data || [])
      setLoading(false)
    }
    load()
  }, [venueId])

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
                    <span className="text-ember-500 w-7 flex-shrink-0">{d.svg}</span>
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
                          <span className="text-ember-500">{face?.svg}</span>
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
