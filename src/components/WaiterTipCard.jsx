import { useState } from 'react'
import { supabaseCustomer } from '../lib/supabase'
import { StarIcon } from './Icons'

// Lo primero que ve quien escanea el QR de un camarero: cómo dejarle la
// propina. La reputación va abajo — es el respaldo, no el producto.
//
// No hay pasarela de pago: se copia el alias y se transfiere desde el homebanking
// o la billetera que la persona ya usa. Menos fricción para el camarero, que no
// tiene que conectar ninguna cuenta para empezar a cobrar.

const TAGS = [
  { id: 'amabilidad', label: 'Amable' },
  { id: 'rapidez', label: 'Rápido/a' },
  { id: 'recomendacion', label: 'Recomendó bien' },
]

// Un id de este teléfono, para que la misma persona no califique cien veces.
// Se borra el storage y vuelve a poder: no es una barrera, es un piso.
function deviceId() {
  try {
    let id = localStorage.getItem('capy-device-id')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('capy-device-id', id)
    }
    return id
  } catch {
    return null
  }
}

export default function WaiterTipCard({ staff, mostrarEncuesta = true }) {
  const nombre = staff.full_name?.split(' ')[0] || 'tu camarero/a'
  const [copiado, setCopiado] = useState(false)

  async function copiarAlias() {
    try {
      await navigator.clipboard.writeText(staff.alias_bancario)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch { /* sin portapapeles queda el alias a la vista para tipearlo */ }
  }

  return (
    <>
      {staff.alias_bancario && (
        <div className="bg-white rounded-2xl p-5 border-2 border-[#008080]/25 shadow-sm">
          <p className="text-[#1A2A3A] font-bold text-base leading-tight">
            Dejale una propina a {nombre}
          </p>
          <p className="text-[#8896A5] text-xs mt-1 leading-relaxed">
            Copiá el alias y transferí desde tu banco o billetera. Le llega directo, sin intermediarios.
          </p>

          <button
            onClick={copiarAlias}
            className="w-full mt-3 bg-[#E8F5F5] border border-[#008080]/20 rounded-xl px-4 py-3.5 text-left active:scale-[0.98] transition-transform"
          >
            <span className="block text-[#8896A5] text-[10px] font-semibold uppercase tracking-widest">
              Alias
            </span>
            <span className="block text-[#008080] font-mono font-bold text-lg leading-tight mt-0.5 break-all">
              {staff.alias_bancario}
            </span>
          </button>

          <button
            onClick={copiarAlias}
            className="w-full mt-2 bg-[#008080] hover:bg-[#006666] text-white font-bold py-3.5 rounded-xl text-sm active:scale-[0.98] transition-transform"
          >
            {copiado ? '¡Alias copiado!' : 'Copiar alias'}
          </button>
        </div>
      )}

      {mostrarEncuesta && <EncuestaCard staff={staff} nombre={nombre} />}
    </>
  )
}

// La encuesta va después de la propina: quien escaneó vino a dejar plata, y
// cobrarle una encuesta antes es ponerle un peaje.
function EncuestaCard({ staff, nombre }) {
  const [rating, setRating] = useState(0)
  const [tags, setTags] = useState([])
  const [notes, setNotes] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [listo, setListo] = useState(false)
  const [error, setError] = useState('')

  function toggleTag(id) {
    setTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  }

  async function enviar() {
    if (!rating) return
    setEnviando(true)
    setError('')
    const { error: insertError } = await supabaseCustomer.from('order_feedback').insert({
      staff_id: staff.id,
      venue_id: staff.venue_id || null,
      rating,
      tags: tags.length ? tags : null,
      notes: notes.trim() || null,
      device_id: deviceId(),
    })
    setEnviando(false)
    if (insertError) {
      // El índice único deja una sola calificación suelta por teléfono
      setError(insertError.code === '23505'
        ? `Ya calificaste a ${nombre} desde este teléfono.`
        : 'No se pudo enviar. Probá de nuevo.')
      return
    }
    setListo(true)
  }

  if (listo) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-sm text-center">
        <p className="text-[#008080] font-bold text-base">¡Gracias!</p>
        <p className="text-[#8896A5] text-xs mt-1">Tu opinión suma a la reputación de {nombre}.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-sm">
      <p className="text-[#1A2A3A] font-bold text-sm leading-tight">¿Cómo te atendió {nombre}?</p>

      <div className="flex justify-center gap-2 my-4">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => setRating(n)}
            aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
            className={`transition-transform active:scale-90 ${n <= rating ? 'text-[#F5A623]' : 'text-[#D8E0E8]'}`}
          >
            <StarIcon size={34} />
          </button>
        ))}
      </div>

      {rating > 0 && (
        <>
          <div className="flex flex-wrap justify-center gap-2 mb-3">
            {TAGS.map(t => (
              <button
                key={t.id}
                onClick={() => toggleTag(t.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  tags.includes(t.id)
                    ? 'bg-[#E8F5F5] border-[#008080]/40 text-[#008080]'
                    : 'border-black/10 text-[#8896A5]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Contá algo (opcional)"
            rows={2}
            className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm text-[#1A2A3A] placeholder:text-[#B0BEC5] outline-none focus:border-[#008080]/40 resize-none"
          />

          {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}

          <button
            onClick={enviar}
            disabled={enviando}
            className="w-full mt-3 bg-[#008080] disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm"
          >
            {enviando ? 'Enviando...' : 'Enviar'}
          </button>
        </>
      )}
    </div>
  )
}
