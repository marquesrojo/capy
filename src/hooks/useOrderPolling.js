import { useEffect, useState } from 'react'
import { supabaseCustomer } from '../lib/supabase'

const ORDER_SELECT = '*, assigned_staff:staff_names!orders_assigned_staff_id_fkey(id, full_name, alias_bancario)'

// Sigue el estado de un pedido en tiempo real via Supabase Realtime.
// Esto funciona porque el cliente ahora usa una sesion real de Supabase
// Auth (anonima), con Authorization Bearer normal - ya no depende de
// headers custom, que es lo que rompia Realtime en el diseño anterior.
export function useOrderPolling(orderId) {
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function fetchOnce({ silent } = {}) {
    if (!silent) setRefreshing(true)
    const [{ data: orderData }, { data: itemsData }] = await Promise.all([
      supabaseCustomer.from('orders').select(ORDER_SELECT).eq('id', orderId).single(),
      supabaseCustomer.from('order_items').select('*').eq('order_id', orderId)
    ])
    setOrder(orderData)
    setItems(itemsData || [])
    setLoading(false)
    if (!silent) setRefreshing(false)
  }

  useEffect(() => {
    let cancelled = false

    async function initialFetch() {
      const [{ data: orderData }, { data: itemsData }] = await Promise.all([
        supabaseCustomer.from('orders').select(ORDER_SELECT).eq('id', orderId).single(),
        supabaseCustomer.from('order_items').select('*').eq('order_id', orderId)
      ])
      if (cancelled) return
      setOrder(orderData)
      setItems(itemsData || [])
      setLoading(false)
    }

    initialFetch()

    const channel = supabaseCustomer
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        payload => {
          // Realtime solo manda columnas planas de "orders", no la relacion
          // con "profiles". Si cambio quien esta asignado, recargamos ese
          // dato puntual; si no, conservamos el que ya teniamos.
          setOrder(prev => {
            const merged = { ...prev, ...payload.new }
            if (prev && prev.assigned_staff_id === payload.new.assigned_staff_id) {
              merged.assigned_staff = prev.assigned_staff
            } else {
              merged.assigned_staff = null
              supabaseCustomer
                .from('orders')
                .select(ORDER_SELECT)
                .eq('id', orderId)
                .single()
                .then(({ data }) => data && setOrder(data))
            }
            return merged
          })
        }
      )
      .subscribe()

    // Respaldo silencioso por si el canal de Realtime se desconecta sin avisar
    const intervalId = setInterval(() => {
      if (!cancelled) fetchOnce({ silent: true })
    }, 30000)

    return () => {
      cancelled = true
      clearInterval(intervalId)
      supabaseCustomer.removeChannel(channel)
    }
  }, [orderId])

  return { order, items, loading, refreshing, setOrder, refetch: () => fetchOnce({ silent: false }) }
}
