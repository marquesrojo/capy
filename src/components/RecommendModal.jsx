import { useState } from 'react'
import { XIcon } from './Icons'

const HUNGER_OPTIONS = [
  { id: 'poco',   label: 'Poquito',   sub: 'Algo liviano' },
  { id: 'normal', label: 'Normal',    sub: 'Un plato estándar' },
  { id: 'mucho',  label: 'Muchísimo', sub: 'Algo abundante' },
]

const MOOD_OPTIONS = [
  { id: 'liviano',      label: 'Liviano y fresco' },
  { id: 'contundente',  label: 'Algo contundente' },
  { id: 'dulce',        label: 'Antojo dulce' },
  { id: 'sorprendeme',  label: 'Sorprendeme' },
]

export default function RecommendModal({ venueId, accentColor, onAddToCart, onClose }) {
  const [step, setStep] = useState('hunger') // 'hunger' | 'budget' | 'mood' | 'loading' | 'result' | 'error'
  const [hunger, setHunger] = useState(null)
  const [budgetEnabled, setBudgetEnabled] = useState(false)
  const [budget, setBudget] = useState('')
  const [mood, setMood] = useState(null)
  const [results, setResults] = useState([])
  const [restaurantPick, setRestaurantPick] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function fetchRecommendation(selectedMood) {
    setStep('loading')
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recommend-dish`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            venue_id: venueId,
            hunger,
            budget: budgetEnabled && budget ? parseInt(budget) : null,
            mood: selectedMood,
          }),
        }
      )
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || data.message || `HTTP ${res.status}`)
      setResults(data.recommendations || [])
      setRestaurantPick(data.restaurant_pick || null)
      setStep('result')
    } catch (e) {
      setErrorMsg(e.message || 'Error al obtener recomendación')
      setStep('error')
    }
  }

  function formatPrice(p) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(p)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl px-5 pt-5 pb-10 max-h-[85vh] overflow-y-scroll overscroll-y-contain">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[#1A2332] font-black text-xl uppercase">¿Qué como?</h2>
            <p className="text-[#9DAAB8] text-sm">Te recomendamos algo de la carta</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar recomendaciones"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#F0F4F8] text-[#6B7A8D]"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Step: hunger */}
        {step === 'hunger' && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#6B7A8D] mb-3">¿Cuánto hambre tenés?</p>
            <div className="space-y-2">
              {HUNGER_OPTIONS.map(o => (
                <button
                  key={o.id}
                  onClick={() => { setHunger(o.id); setStep('budget') }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all active:scale-[0.98]"
                  style={{ borderColor: `${accentColor}30`, backgroundColor: '#F8FAFB' }}
                >
                  <div className="flex-1">
                    <p className="font-black text-sm text-[#1A2332]">{o.label}</p>
                    <p className="text-xs text-[#9DAAB8] mt-0.5">{o.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: budget */}
        {step === 'budget' && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#6B7A8D] mb-3">¿Tenés un límite de presupuesto?</p>
            <div className="space-y-2 mb-4">
              <button
                onClick={() => { setBudgetEnabled(false); setStep('mood') }}
                className="w-full px-4 py-3.5 rounded-2xl border-2 text-left transition-all active:scale-[0.98]"
                style={{ borderColor: `${accentColor}30`, backgroundColor: '#F8FAFB' }}
              >
                <p className="font-black text-sm text-[#1A2332]">Sin límite</p>
                <p className="text-xs text-[#9DAAB8] mt-0.5">Mostrame lo mejor</p>
              </button>
              <button
                onClick={() => setBudgetEnabled(true)}
                className="w-full px-4 py-3.5 rounded-2xl border-2 text-left transition-all active:scale-[0.98]"
                style={budgetEnabled
                  ? { borderColor: accentColor, backgroundColor: `${accentColor}08` }
                  : { borderColor: `${accentColor}30`, backgroundColor: '#F8FAFB' }
                }
              >
                <p className="font-black text-sm text-[#1A2332]">Sí, tengo un máximo</p>
                <p className="text-xs text-[#9DAAB8] mt-0.5">Solo ver opciones dentro de mi budget</p>
              </button>
            </div>

            {budgetEnabled && (
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[#1A2332] font-bold text-sm">$</span>
                  <input
                    type="number"
                    value={budget}
                    onChange={e => setBudget(e.target.value)}
                    placeholder="Ej: 5000"
                    className="flex-1 bg-[#F0F4F8] text-[#1A2332] font-mono text-lg py-2.5 px-3 rounded-xl focus:outline-none border border-transparent focus:border-[#1A2332]/20"
                    min="1"
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => setStep('mood')}
                  disabled={!budget.trim()}
                  className="mt-3 w-full py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-40 transition-all"
                  style={{ backgroundColor: accentColor }}
                >
                  Continuar →
                </button>
              </div>
            )}

            <button onClick={() => setStep('hunger')} className="text-[#9DAAB8] text-xs underline w-full text-center mt-1">
              ← Volver
            </button>
          </div>
        )}

        {/* Step: mood */}
        {step === 'mood' && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#6B7A8D] mb-3">¿Qué te provoca?</p>
            <div className="grid grid-cols-2 gap-2">
              {MOOD_OPTIONS.map(o => (
                <button
                  key={o.id}
                  onClick={() => { setMood(o.id); fetchRecommendation(o.id) }}
                  className="px-4 py-4 rounded-2xl border-2 text-center transition-all active:scale-[0.97]"
                  style={{ borderColor: `${accentColor}40`, backgroundColor: `${accentColor}08` }}
                >
                  <p className="font-black text-sm" style={{ color: accentColor }}>{o.label}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setStep('budget')} className="text-[#9DAAB8] text-xs underline w-full text-center mt-4">
              ← Volver
            </button>
          </div>
        )}

        {/* Loading */}
        {step === 'loading' && (
          <div className="py-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: `${accentColor}30`, borderTopColor: accentColor }} />
            <p className="text-[#1A2332] font-bold text-sm">Analizando la carta...</p>
            <p className="text-[#9DAAB8] text-xs mt-1">Un momento</p>
          </div>
        )}

        {/* Results — empty */}
        {step === 'result' && results.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-[#1A2332] font-bold text-sm mb-1">No encontramos una recomendación</p>
            <p className="text-[#9DAAB8] text-xs mb-5">Intentá con otro perfil o sin límite de presupuesto.</p>
            <button
              onClick={() => { setStep('hunger'); setHunger(null); setMood(null); setBudget(''); setBudgetEnabled(false) }}
              className="text-sm font-bold py-2.5 px-6 rounded-xl text-white"
              style={{ backgroundColor: accentColor }}
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Results */}
        {step === 'result' && results.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#6B7A8D] mb-3">
              {results.length === 1 ? 'Nuestra recomendación' : 'Nuestras recomendaciones'}
            </p>
            <div className="space-y-3">
              {results.map((r, i) => (
                <div
                  key={i}
                  className="rounded-2xl border-2 p-4"
                  style={{ borderColor: `${accentColor}30`, backgroundColor: `${accentColor}06` }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-black text-base text-[#1A2332] leading-tight flex-1">{r.name}</p>
                    <p className="font-black text-base flex-shrink-0" style={{ color: accentColor }}>
                      {formatPrice(r.price)}
                    </p>
                  </div>
                  <p className="text-[#6B7A8D] text-sm mb-3 leading-snug">{r.reason}</p>
                  <button
                    onClick={() => { onAddToCart(r.name); onClose() }}
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white active:scale-[0.98] transition-transform"
                    style={{ backgroundColor: accentColor }}
                  >
                    Agregar al pedido
                  </button>
                </div>
              ))}
            </div>
            {restaurantPick && (
              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#6B7A8D] mb-2">Plato del día</p>
                <div className="rounded-2xl border-2 border-[#E8EEF4] bg-[#F8FAFB] p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <p className="font-black text-base text-[#1A2332] leading-tight flex-1">{restaurantPick.name}</p>
                    <p className="font-black text-base flex-shrink-0 text-[#6B7A8D]">{formatPrice(restaurantPick.price)}</p>
                  </div>
                  <button
                    onClick={() => { onAddToCart(restaurantPick.name); onClose() }}
                    className="w-full py-2.5 rounded-xl text-sm font-bold bg-[#F0F4F8] text-[#1A2332] active:scale-[0.98] transition-transform"
                  >
                    Agregar al pedido
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => { setStep('hunger'); setResults([]); setRestaurantPick(null); setHunger(null); setMood(null); setBudget(''); setBudgetEnabled(false) }}
              className="text-[#9DAAB8] text-xs underline w-full text-center mt-4"
            >
              Buscar otra opción
            </button>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="py-10 text-center">
            <p className="text-[#1A2332] font-bold text-sm mb-1">No pudimos obtener una recomendación</p>
            <p className="text-[#9DAAB8] text-xs mb-5">{errorMsg}</p>
            <button
              onClick={() => { setStep('hunger'); setResults([]); setHunger(null); setMood(null) }}
              className="text-sm font-bold py-2.5 px-6 rounded-xl text-white"
              style={{ backgroundColor: accentColor }}
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
