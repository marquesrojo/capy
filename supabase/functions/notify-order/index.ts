import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// event_type: 'created' | 'listo' | 'entregado' | 'rechazado' | 'reservation_created'
type EventType = 'created' | 'listo' | 'entregado' | 'rechazado' | 'reservation_created'

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR').format(n)
}

function buildClientMessage(event: EventType, data: {
  customerName: string
  orderNumber: number
  venueName: string
  total?: number
  locationLabel?: string
}): string | null {
  const { customerName, orderNumber, venueName, total, locationLabel } = data
  const firstName = customerName.split(' ')[0]

  switch (event) {
    case 'created':
      return `¡Hola ${firstName}! Tu pedido #${orderNumber} en *${venueName}* fue recibido ✅\n` +
        (locationLabel ? `📍 ${locationLabel}\n` : '') +
        (total ? `💰 Total: $${formatARS(total)}\n` : '') +
        `Te avisamos cuando esté listo.`

    case 'listo':
      return `¡Tu pedido #${orderNumber} en *${venueName}* está listo! 🎉\n` +
        (locationLabel ? `📍 Pasá por: ${locationLabel}` : `Ya podés pasarlo a buscar.`)

    case 'entregado':
      return `✅ Pedido #${orderNumber} entregado. ¡Gracias por tu pedido en *${venueName}*! 🙌`

    case 'rechazado':
      return `Lo sentimos, tu pedido #${orderNumber} en *${venueName}* no pudo ser procesado. Contactate con el local para más info.`

    default:
      return null
  }
}

function buildVenueMessage(event: EventType, data: {
  customerName: string
  orderNumber: number
  total?: number
  locationLabel?: string
  items?: { product_name: string; quantity: number }[]
}): string | null {
  const { customerName, orderNumber, total, locationLabel, items } = data

  switch (event) {
    case 'created': {
      const itemsList = items?.length
        ? '\n' + items.map(i => `  • ${i.quantity}x ${i.product_name}`).join('\n')
        : ''
      return `📦 *Nuevo pedido #${orderNumber}*\n` +
        `👤 ${customerName}` +
        (locationLabel ? `\n📍 ${locationLabel}` : '') +
        (total ? `\n💰 $${formatARS(total)}` : '') +
        itemsList
    }
    default:
      return null
  }
}

async function sendWA(supabaseUrl: string, serviceKey: string, to: string, message: string) {
  return fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ to, message }),
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const { order_id, reservation_id, event_type } = body as {
      order_id?: string
      reservation_id?: string
      event_type: EventType
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const sends: Promise<Response>[] = []

    if (event_type === 'reservation_created' && reservation_id) {
      const { data: res } = await supabase
        .from('reservations')
        .select('*, venue:venues(name, notify_whatsapp), customer:customers(full_name, whatsapp)')
        .eq('id', reservation_id)
        .single()

      if (!res) {
        return new Response(JSON.stringify({ error: 'Reservation not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const venueName = res.venue?.name || 'el local'
      const customerName = res.customer?.full_name || res.guest_name || 'Cliente'
      const date = new Date(res.reserved_at).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
      const time = new Date(res.reserved_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      const guests = res.guest_count || 1

      const clientPhone = res.customer?.whatsapp || res.guest_phone
      if (clientPhone) {
        sends.push(sendWA(supabaseUrl, serviceKey, clientPhone,
          `¡Reserva confirmada en *${venueName}*! 📅\n` +
          `📆 ${date} a las ${time}\n` +
          `👥 ${guests} ${guests === 1 ? 'persona' : 'personas'}\n` +
          (res.notes ? `📝 ${res.notes}\n` : '') +
          `¡Te esperamos!`
        ))
      }

      if (res.venue?.notify_whatsapp) {
        sends.push(sendWA(supabaseUrl, serviceKey, res.venue.notify_whatsapp,
          `📅 *Nueva reserva*\n` +
          `👤 ${customerName}` +
          (clientPhone ? ` — ${clientPhone}` : '') +
          `\n📆 ${date} ${time}\n` +
          `👥 ${guests} ${guests === 1 ? 'persona' : 'personas'}` +
          (res.notes ? `\n📝 ${res.notes}` : '')
        ))
      }

      await Promise.allSettled(sends)
      return new Response(JSON.stringify({ ok: true, sent: sends.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Order events
    if (!order_id) {
      return new Response(JSON.stringify({ error: 'order_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: order } = await supabase
      .from('orders')
      .select(`
        id, order_number, total, location_label, status,
        customer:customers(full_name, whatsapp),
        venue:venues(name, notify_whatsapp),
        order_items(product_name, quantity)
      `)
      .eq('id', order_id)
      .single()

    if (!order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const shared = {
      customerName: order.customer?.full_name || 'Cliente',
      orderNumber: order.order_number,
      venueName: order.venue?.name || 'el local',
      total: order.total,
      locationLabel: order.location_label,
    }

    const clientMsg = buildClientMessage(event_type, shared)
    const venueMsg = buildVenueMessage(event_type, { ...shared, items: order.order_items })

    if (clientMsg && order.customer?.whatsapp) {
      sends.push(sendWA(supabaseUrl, serviceKey, order.customer.whatsapp, clientMsg))
    }

    if (venueMsg && order.venue?.notify_whatsapp) {
      sends.push(sendWA(supabaseUrl, serviceKey, order.venue.notify_whatsapp, venueMsg))
    }

    await Promise.allSettled(sends)

    return new Response(JSON.stringify({ ok: true, sent: sends.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
