import { useEffect, useState } from 'react'
import { supabaseCustomer } from '../lib/supabase'

// ¿El cliente está en el medio de un consumo en este local?
//
// Se usa para no cortarle el pedido a alguien que ya está sentado cuando el
// local pausa los pedidos: la pausa es para que no entren mesas nuevas, no
// para dejar a medias a quien ya pidió la entrada y quiere el postre.
//
// Abierto es todo lo que no esté cerrado ni cancelado —"entregado" sigue
// siendo una mesa en curso: comió, todavía no pagó— dentro de una ventana de
// horas, para que un pedido de ayer que quedó sin cerrar no habilite a nadie.
const OPEN_WINDOW_HOURS = 8

export function useOpenOrder(venueId, customerId) {
  const [hasOpenOrder, setHasOpenOrder] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!venueId || !customerId) {
      setHasOpenOrder(false)
      setChecked(true)
      return
    }
    let cancelled = false
    const since = new Date(Date.now() - OPEN_WINDOW_HOURS * 3600 * 1000).toISOString()
    supabaseCustomer
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', venueId)
      .eq('customer_id', customerId)
      .gte('created_at', since)
      .not('status', 'in', '(cerrado,cancelado)')
      .then(({ count }) => {
        if (cancelled) return
        setHasOpenOrder((count || 0) > 0)
        setChecked(true)
      })
    return () => { cancelled = true }
  }, [venueId, customerId])

  return { hasOpenOrder, checked }
}
