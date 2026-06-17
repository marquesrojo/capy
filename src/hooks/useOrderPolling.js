import { useEffect, useRef, useState } from 'react'
import { supabaseCustomer } from '../lib/supabase'

const POLL_INTERVAL_MS = 6000

// Sigue el estado de un pedido reconsultando cada pocos segundos.
// No usamos Supabase Realtime aca porque las conexiones WebSocket no
// propagan el header 'x-device-token' (bug conocido de Supabase), y las
// policies de RLS del cliente dependen de ese header.
export function useOrderPolling(orderId) {
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function fetchOrder() {
      const { data: orderData } = await supabaseCustomer
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()
      if (cancelled) return
      setOrder(orderData)
    }

    async function fetchItemsOnce() {
      const { data: itemsData } = await supabaseCustomer
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
      if (cancelled) return
      setItems(itemsData || [])
    }

    async function init() {
      await Promise.all([fetchOrder(), fetchItemsOnce()])
      setLoading(false)
    }

    init()
    intervalRef.current = setInterval(fetchOrder, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(intervalRef.current)
    }
  }, [orderId])

  return { order, items, loading }
}
