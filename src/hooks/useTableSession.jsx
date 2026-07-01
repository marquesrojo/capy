import { useEffect, useState } from 'react'
import { supabaseCustomer } from '../lib/supabase'

export function useTableSession(sessionId) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    load()
  }, [sessionId])

  async function load() {
    setLoading(true)
    const { data } = await supabaseCustomer
      .from('orders')
      .select('*, order_items(*)')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
    setOrders(data || [])
    setLoading(false)
  }

  const total_spent = orders.reduce((sum, o) => sum + (o.total || 0), 0)

  // Ítems de comandas ya entregadas (consumiendo)
  const consumedItems = orders
    .filter(o => o.status === 'entregado')
    .flatMap(o => (o.order_items || []).map(i => ({ ...i, _order_id: o.id })))

  // Ítems de comandas aún activas (en preparación / recibido / listo)
  const activeItems = orders
    .filter(o => !['entregado', 'cancelado'].includes(o.status))
    .flatMap(o => (o.order_items || []).map(i => ({ ...i, _order_id: o.id })))

  // Historial ordenado (una entrada por comanda)
  const order_history = orders

  return { orders, total_spent, consumedItems, activeItems, order_history, loading, refetch: load }
}
