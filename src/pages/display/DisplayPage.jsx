import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'

const supabasePublic = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
)

export default function DisplayPage() {
  const { venueId } = useParams()
  const [orders, setOrders] = useState([])
  const [venueName, setVenueName] = useState('')
  const [loading, setLoading] = useState(true)
  const [clock, setClock] = useState(new Date())

  const preparando = orders.filter(o => o.status === 'recibido' || o.status === 'en_preparacion')
  const listo = orders.filter(o => o.status === 'listo')

  const fetchOrders = useCallback(async () => {
    const { data } = await supabasePublic.rpc('get_display_orders', { p_venue_id: venueId })
    if (data) setOrders(data)
    setLoading(false)
  }, [venueId])

  useEffect(() => {
    if (!venueId) return
    supabasePublic
      .from('venues')
      .select('name')
      .eq('id', venueId)
      .single()
      .then(({ data }) => { if (data) setVenueName(data.name) })
    fetchOrders()
    const interval = setInterval(fetchOrders, 5000)
    return () => clearInterval(interval)
  }, [venueId, fetchOrders])

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

  return (
    <div className="h-screen bg-[#060606] flex flex-col overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/[0.07] flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-white font-bold text-2xl tracking-widest uppercase">{venueName}</span>
          <span className="text-white/20 text-xl">·</span>
          <span className="text-white/40 tracking-widest uppercase text-lg">Pedidos Retiro</span>
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

  return (
    <div className={`rounded-2xl border ${bgColor} ${borderColor} px-7 py-5`}>
      <p className={`font-mono font-bold leading-none mb-2 ${numColor}`} style={{ fontSize: 'clamp(2.5rem, 5vw, 5rem)' }}>
        #{num}
      </p>
      <p className="text-white/80 font-medium truncate" style={{ fontSize: 'clamp(1.1rem, 2vw, 1.75rem)' }}>
        {order.customer_name}
      </p>
    </div>
  )
}
