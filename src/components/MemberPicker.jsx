import { useState } from 'react'

// La misma lista para grupos de clientes y para categorías de descuento: son
// dos listas distintas de gente, pero se eligen igual.
export default function MemberPicker({ candidates, onPick, emptyText = 'No hay a quién agregar.' }) {
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()
  const list = candidates
    .filter(r => !term
      || r.name.toLowerCase().includes(term)
      || r.email.toLowerCase().includes(term)
      || r.whatsapp.includes(term)
      || (r.staffRole || '').toLowerCase().includes(term))
    .slice(0, 40)

  return (
    <div className="bg-carbon-800 rounded-xl p-3 space-y-2">
      <input
        className="input"
        placeholder="Buscar por nombre, email o WhatsApp"
        value={q}
        onChange={e => setQ(e.target.value)}
      />
      {candidates.length === 0 ? (
        <p className="text-smoke-600 text-xs text-center py-2">{emptyText}</p>
      ) : list.length === 0 ? (
        <p className="text-smoke-600 text-xs text-center py-2">Nadie coincide con la búsqueda.</p>
      ) : (
        <div className="space-y-1">
          {list.map(r => (
            <button
              key={r.id}
              onClick={() => onPick(r)}
              className="w-full flex items-center justify-between gap-3 bg-carbon-900 rounded-lg px-3 py-2 text-left"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-smoke-300 text-xs truncate">{r.name}</p>
                  <PersonRole person={r} />
                </div>
                <p className="text-smoke-600 text-[10px] font-mono truncate">
                  {[r.email, r.whatsapp].filter(Boolean).join(' · ') || 'sin contacto'}
                </p>
                <p className="text-smoke-600 text-[10px]">
                  {r.orders} {r.orders === 1 ? 'pedido' : 'pedidos'}
                </p>
              </div>
              <span className="text-ember-400 text-[11px] font-semibold flex-shrink-0">Agregar</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Quién es del local, para no confundir a un camarero con un cliente que se
// llama parecido
export function PersonRole({ person }) {
  if (!person.staffRole) return null
  return (
    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 leading-none flex-shrink-0 whitespace-nowrap">
      {person.staffRole}{person.linked ? ' vinculado' : ''}
    </span>
  )
}
