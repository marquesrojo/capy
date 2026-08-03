import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'

// Sesión propia y persistida: los pedidos solo se pueden escuchar en vivo con
// una sesión, y guardarla evita crear un usuario nuevo cada vez que la tele se
// reinicia. Lo que se lee sigue viniendo de la función pública.
const supabasePublic = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'sb-display-auth', detectSessionInUrl: false } }
)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// El tablero que se cuelga en una tele. Sin login: la URL es la llave, y lo
// único que muestra es número, nombre de pila y dónde. La dirección puede venir
// por id o por slug — /pantalla/mi-local se tipea en un control remoto, un uuid
// no.
export default function DisplayPage() {
  const { ref } = useParams()
  const [venue, setVenue] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [clock, setClock] = useState(new Date())
  const [enVivo, setEnVivo] = useState(false)

  // Sesión anónima al entrar. Si falla, la pantalla igual anda: los pedidos se
  // leen por la función pública y el refresco periódico la mantiene al día.
  useEffect(() => {
    let vivo = true
    supabasePublic.auth.getSession().then(async ({ data }) => {
      if (!data.session) await supabasePublic.auth.signInAnonymously().catch(() => {})
      const { data: after } = await supabasePublic.auth.getSession()
      if (vivo) setEnVivo(!!after.session)
    })
    return () => { vivo = false }
  }, [])

  const preparando = orders.filter(o => o.status === 'recibido' || o.status === 'en_preparacion')
  const listo = orders.filter(o => o.status === 'listo')

  useEffect(() => {
    if (!ref) return
    const q = supabasePublic.from('venues').select('id, name')
    ;(UUID_RE.test(ref) ? q.eq('id', ref) : q.eq('slug', ref))
      .maybeSingle()
      .then(({ data }) => {
        setVenue(data || null)
        if (!data) setLoading(false)
      })
  }, [ref])

  const venueId = venue?.id
  const fetchOrders = useCallback(async () => {
    if (!venueId) return
    const { data } = await supabasePublic.rpc('get_display_orders', { p_venue_id: venueId })
    if (data) setOrders(data)
    setLoading(false)
  }, [venueId])

  useEffect(() => {
    if (!venueId) return
    fetchOrders()

    // En vivo con el tablero: cuando alguien mueve un pedido de columna, o le
    // cambia la mesa, la pantalla lo refleja sin esperar al próximo refresco.
    let channel = null
    if (enVivo) {
      channel = supabasePublic
        .channel(`display-${venueId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `venue_id=eq.${venueId}` }, fetchOrders)
        .subscribe()
    }

    // Red de una tele: si el socket se cae nadie lo va a notar mirando la
    // pantalla, así que igual se refresca cada tanto. Sin sesión, esto es lo
    // único que la mantiene al día, y entonces va más seguido.
    const interval = setInterval(fetchOrders, enVivo ? 20000 : 5000)
    return () => {
      if (channel) supabasePublic.removeChannel(channel)
      clearInterval(interval)
    }
  }, [venueId, enVivo, fetchOrders])

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const timeStr = clock.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/30 text-xl">Cargando...</p>
      </div>
    )
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-8 text-center">
        <p className="text-white/40 text-xl">No encontramos este local. Revisá el link.</p>
      </div>
    )
  }

  return (
    <div className="h-screen bg-[#060606] flex flex-col overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/[0.07] flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-white font-bold text-2xl tracking-widest uppercase">{venue.name}</span>
          <span className="text-white/20 text-xl">·</span>
          <span className="text-white/40 tracking-widest uppercase text-lg">Pedidos para retirar</span>
        </div>
        <span className="font-mono text-white/30 text-2xl tabular-nums">{timeStr}</span>
      </div>

      {/* Columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* PREPARANDO */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-white/[0.07]">
          <div className="px-8 py-5 flex-shrink-0 border-b border-white/[0.05]">
            <div className="flex items-center gap-3">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="text-amber-400 font-bold text-xl tracking-widest uppercase">Preparando</h2>
              {preparando.length > 0 && (
                <span className="text-amber-400/40 text-lg font-mono ml-1">{preparando.length}</span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {preparando.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-white/15 text-xl">—</p>
              </div>
            ) : (
              preparando.map(order => (
                <OrderCard key={order.id} order={order} accent="amber" />
              ))
            )}
          </div>
        </div>

        {/* LISTO */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-8 py-5 flex-shrink-0 border-b border-white/[0.05]">
            <div className="flex items-center gap-3">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${listo.length > 0 ? 'bg-emerald-400' : 'bg-white/15'}`} />
              <h2 className={`font-bold text-xl tracking-widest uppercase ${listo.length > 0 ? 'text-emerald-400' : 'text-white/25'}`}>
                Listo
              </h2>
              {listo.length > 0 && (
                <span className="text-emerald-400/40 text-lg font-mono ml-1">{listo.length}</span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {listo.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-white/15 text-xl">—</p>
              </div>
            ) : (
              listo.map(order => (
                <OrderCard key={order.id} order={order} accent="emerald" />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function OrderCard({ order, accent }) {
  const numColor = accent === 'amber' ? 'text-amber-400' : 'text-emerald-400'
  const borderColor = accent === 'amber' ? 'border-amber-500/25' : 'border-emerald-500/40'
  const bgColor = accent === 'amber' ? 'bg-amber-500/[0.06]' : 'bg-emerald-500/10'
  const num = order.daily_number || order.id.slice(0, 4).toUpperCase()
  // Acá todo es retiro, así que aclararlo sobraría. Lo que sí sirve es el
  // punto de entrega cuando el local tiene más de uno; el que pidió de afuera
  // no tiene ninguno asignado y no necesita nada.
  const donde = order.location_type === 'retiro' ? order.location_label : null

  return (
    <div className={`rounded-2xl border ${bgColor} ${borderColor} px-7 py-5`}>
      {/* Sin nombre cargado no va nada, ni el renglón: el número es lo que la
          persona busca, y un "Cliente" de relleno no le dice a nadie */}
      <p className={`font-mono font-bold leading-none ${numColor} ${order.customer_name || donde ? 'mb-2' : ''}`} style={{ fontSize: 'clamp(2.5rem, 5vw, 5rem)' }}>
        #{num}
      </p>
      {(order.customer_name || donde) && (
        <div className="flex items-baseline gap-3 min-w-0">
          {order.customer_name && (
            <p className="text-white/80 font-medium truncate" style={{ fontSize: 'clamp(1.1rem, 2vw, 1.75rem)' }}>
              {order.customer_name}
            </p>
          )}
          {donde && (
            <span
              className="text-white/40 font-medium truncate flex-shrink-0"
              style={{ fontSize: 'clamp(0.85rem, 1.3vw, 1.15rem)' }}
            >
              {donde}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
