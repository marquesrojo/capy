import { useState } from 'react'
import { formatPrice } from '../lib/utils'

// Carta de precio fijo: el menú ejecutivo, el de los jugadores del club. Se
// arma por pasos —entrada, principal, postre, café— y sale un precio único,
// elija lo que elija.
//
// Las opciones son productos reales de la carta, así que lo que la cocina marcó
// agotado no se puede elegir acá tampoco.
export default function FixedMenuBuilder({ menu, products, accent = '#1A3A6B', accentText = '#FFFFFF', onAdd, disabled, readOnly = false, forPickup = false }) {
  // { [stepId]: [productId] }
  const [picked, setPicked] = useState({})
  const [added, setAdded] = useState(false)

  const byId = new Map(products.map(p => [p.id, p]))
  const steps = (menu.venue_menu_steps || [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)

  function toggle(step, productId) {
    setAdded(false)
    setPicked(prev => {
      const current = prev[step.id] || []
      if (current.includes(productId)) {
        return { ...prev, [step.id]: current.filter(id => id !== productId) }
      }
      // Con max 1 elegir otra opción reemplaza, no suma: es lo que espera
      // alguien que toca el postre después de haber tocado otro
      if (step.max_choices <= 1) return { ...prev, [step.id]: [productId] }
      if (current.length >= step.max_choices) return prev
      return { ...prev, [step.id]: [...current, productId] }
    })
  }

  const faltan = steps.filter(s => (picked[s.id] || []).length < s.min_choices)
  const completo = faltan.length === 0

  function confirmar() {
    if (!completo || disabled) return
    const selections = steps.flatMap(step =>
      (picked[step.id] || []).map(productId => ({
        step: step.name,
        product_id: productId,
        name: byId.get(productId)?.name || '',
      }))
    )
    onAdd(selections)
    setPicked({})
    setAdded(true)
  }

  return (
    <div className="px-4 pt-3 pb-40 space-y-4">
      <div className="bg-white rounded-2xl p-4 border border-black/[0.05] shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[#1A2332] font-black text-lg leading-tight">{menu.name}</p>
            {menu.description && (
              <p className="text-[#6B7A8D] text-xs mt-1 leading-snug">{menu.description}</p>
            )}
          </div>
          <p className="font-black text-lg flex-shrink-0" style={{ color: accent }}>
            {formatPrice(menu.price || 0)}
          </p>
        </div>
        <p className="text-[#9DAAB8] text-xs mt-2 leading-snug">
          Elegí una opción de cada paso. El precio es el mismo, elijas lo que elijas.
        </p>
      </div>

      {steps.map(step => {
        const chosen = picked[step.id] || []
        const opciones = (step.venue_menu_step_options || [])
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(o => byId.get(o.product_id))
          .filter(Boolean)
        // Además de lo agotado, lo que no corresponde a cómo se recibe el
        // pedido: solo salón cuando se lleva, solo retiro cuando es a la mesa
        const disponibles = opciones.filter(p => {
          if (p.is_available === false) return false
          const modo = p.service_mode || 'ambos'
          if (modo === 'ambos') return true
          return forPickup ? modo === 'retiro' : modo === 'salon'
        })

        if (disponibles.length === 0) return null

        return (
          <div key={step.id}>
            <div className="flex items-baseline justify-between gap-3 mb-2 px-1">
              <p className="text-[#1A2332] text-sm font-black uppercase tracking-wide">{step.name}</p>
              <p className="text-[#9DAAB8] text-[11px] flex-shrink-0">
                {step.min_choices === 0
                  ? 'opcional'
                  : step.max_choices > 1
                    ? `elegí hasta ${step.max_choices}`
                    : 'elegí 1'}
              </p>
            </div>
            <div className="space-y-2">
              {disponibles.map(p => {
                const isChosen = chosen.includes(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(step, p.id)}
                    className="w-full flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all active:scale-[0.99]"
                    style={isChosen
                      ? { borderColor: accent, backgroundColor: `${accent}0F` }
                      : { borderColor: '#E4EAF1', backgroundColor: '#FFFFFF' }}
                  >
                    <span
                      className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                      style={{ borderColor: isChosen ? accent : '#C0CBDA' }}
                    >
                      {isChosen && <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accent }} />}
                    </span>
                    <span className="text-[#1A2332] text-sm font-semibold leading-snug flex-1">{p.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {added && (
        <p className="text-center text-xs font-semibold" style={{ color: accent }}>
          Listo, lo sumamos a tu pedido. Podés armar otro.
        </p>
      )}

      <div className="sticky bottom-24 pt-1">
        <button
          onClick={confirmar}
          disabled={!completo || disabled}
          className="w-full font-black py-4 rounded-2xl text-sm disabled:opacity-40 shadow-lg transition-transform active:scale-[0.99]"
          style={{ backgroundColor: accent, color: accentText }}
        >
          {readOnly
            ? 'Estás mirando la carta'
            : disabled
            ? 'Pedidos suspendidos'
            : completo
              ? `Agregar al pedido — ${formatPrice(menu.price || 0)}`
              : `Elegí ${faltan[0].name.toLowerCase()}`}
        </button>
      </div>
    </div>
  )
}
