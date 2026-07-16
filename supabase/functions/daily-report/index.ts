import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Rango del día en hora Argentina (UTC-3)
  const now = new Date()
  const offset = -3 * 60 // ART = UTC-3
  const localNow = new Date(now.getTime() + offset * 60 * 1000)
  const dayStart = new Date(localNow)
  dayStart.setUTCHours(0, 0, 0, 0)
  const dayEnd = new Date(localNow)
  dayEnd.setUTCHours(23, 59, 59, 999)

  // Convertir de vuelta a UTC para la query
  const startUTC = new Date(dayStart.getTime() - offset * 60 * 1000).toISOString()
  const endUTC   = new Date(dayEnd.getTime()   - offset * 60 * 1000).toISOString()

  const weekStartUTC = new Date(new Date(startUTC).getTime() - 6 * 24 * 60 * 60 * 1000).toISOString()

  const [ordersRes, venuesRes, camautRes, ticketsRes, weekOrdersRes, newVenuesRes] = await Promise.all([
    // Pedidos del día (excluye cancelados)
    supabase
      .from('orders')
      .select('id, total, payment_status, status, venue_id, created_at')
      .gte('created_at', startUTC)
      .lte('created_at', endUTC)
      .neq('status', 'cancelado'),

    // Todos los locales activos (no camaut)
    supabase
      .from('venues')
      .select('id, name, slug')
      .not('slug', 'like', 'camaut-%'),

    // Usuarios Camaut con cuenta
    supabase
      .from('staff_names')
      .select('id', { count: 'exact', head: true })
      .not('profile_id', 'is', null),

    // Tickets de soporte abiertos
    supabase
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),

    // Pedidos de los últimos 7 días (para comparativa)
    supabase
      .from('orders')
      .select('total, payment_status')
      .gte('created_at', weekStartUTC)
      .lte('created_at', endUTC)
      .neq('status', 'cancelado'),

    // Locales registrados hoy
    supabase
      .from('venues')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startUTC)
      .not('slug', 'like', 'camaut-%'),
  ])

  const orders     = ordersRes.data  || []
  const venues     = venuesRes.data  || []
  const weekOrders = weekOrdersRes.data || []

  const totalOrders   = orders.length
  const paidOrders    = orders.filter(o => o.payment_status === 'aprobado')
  const revenueHoy    = paidOrders.reduce((s, o) => s + (o.total || 0), 0)

  const weekPaid     = weekOrders.filter(o => o.payment_status === 'aprobado')
  const revenueWeek  = weekPaid.reduce((s, o) => s + (o.total || 0), 0)

  // Desglose por local
  const venueMap: Record<string, string> = {}
  for (const v of venues) venueMap[v.id] = v.name

  const byVenue: Record<string, { name: string; orders: number; revenue: number }> = {}
  for (const o of orders) {
    const name = venueMap[o.venue_id] || o.venue_id
    if (!byVenue[o.venue_id]) byVenue[o.venue_id] = { name, orders: 0, revenue: 0 }
    byVenue[o.venue_id].orders++
    if (o.payment_status === 'aprobado') byVenue[o.venue_id].revenue += o.total || 0
  }

  const venueRows = Object.values(byVenue)
    .sort((a, b) => b.orders - a.orders)
    .filter(v => v.orders > 0)

  const fmt = (n: number) =>
    '$ ' + Math.round(n).toLocaleString('es-AR')

  const dateLabel = localNow.toLocaleDateString('es-AR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const venueTableRows = venueRows.length
    ? venueRows.map(v => `
        <tr>
          <td style="padding:6px 12px 6px 0;color:#3C2A21">${v.name}</td>
          <td style="padding:6px 12px 6px 0;text-align:center;font-weight:600">${v.orders}</td>
          <td style="padding:6px 0;text-align:right;color:#E8772A;font-weight:600">${v.revenue > 0 ? fmt(v.revenue) : '—'}</td>
        </tr>`).join('')
    : '<tr><td colspan="3" style="color:#999;padding:8px 0">Sin pedidos hoy</td></tr>'

  const html = `
  <div style="font-family:sans-serif;max-width:540px;color:#3C2A21;background:#fff;padding:24px;border-radius:12px">
    <h2 style="margin:0 0 4px;font-size:22px">🦫 Reporte diario Capy</h2>
    <p style="margin:0 0 20px;color:#888;font-size:14px">${dateLabel}</p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr>
        <td style="padding:12px;background:#FFF8F4;border-radius:10px;text-align:center;width:25%">
          <div style="font-size:26px;font-weight:700;color:#E8772A">${totalOrders}</div>
          <div style="font-size:11px;color:#888;margin-top:2px">Pedidos hoy</div>
        </td>
        <td style="width:8px"></td>
        <td style="padding:12px;background:#FFF8F4;border-radius:10px;text-align:center;width:37%">
          <div style="font-size:22px;font-weight:700;color:#E8772A">${fmt(revenueHoy)}</div>
          <div style="font-size:11px;color:#888;margin-top:2px">Facturación hoy (pagado)</div>
        </td>
        <td style="width:8px"></td>
        <td style="padding:12px;background:#FFF8F4;border-radius:10px;text-align:center;width:30%">
          <div style="font-size:22px;font-weight:700;color:#3C2A21">${fmt(revenueWeek)}</div>
          <div style="font-size:11px;color:#888;margin-top:2px">Últ. 7 días</div>
        </td>
      </tr>
    </table>

    <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#888;margin:0 0 8px">Por local</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
      <thead>
        <tr style="border-bottom:1px solid #eee">
          <th style="text-align:left;padding:4px 12px 4px 0;font-weight:600;color:#888;font-size:11px">LOCAL</th>
          <th style="text-align:center;padding:4px 12px 4px 0;font-weight:600;color:#888;font-size:11px">PEDIDOS</th>
          <th style="text-align:right;padding:4px 0;font-weight:600;color:#888;font-size:11px">FACTURADO</th>
        </tr>
      </thead>
      <tbody>${venueTableRows}</tbody>
    </table>

    <table style="width:100%;border-collapse:collapse;font-size:13px;color:#555">
      <tr>
        <td style="padding:6px 0">Locales activos</td>
        <td style="text-align:right;font-weight:600;color:#3C2A21">${venues.length}</td>
      </tr>
      <tr>
        <td style="padding:6px 0">Camareros con cuenta</td>
        <td style="text-align:right;font-weight:600;color:#3C2A21">${camautRes.count ?? 0}</td>
      </tr>
      ${(newVenuesRes.count ?? 0) > 0 ? `
      <tr>
        <td style="padding:6px 0">Nuevos locales hoy</td>
        <td style="text-align:right;font-weight:600;color:#E8772A">+${newVenuesRes.count}</td>
      </tr>` : ''}
      ${(ticketsRes.count ?? 0) > 0 ? `
      <tr>
        <td style="padding:6px 0">Tickets de soporte abiertos</td>
        <td style="text-align:right;font-weight:600;color:#E8772A">${ticketsRes.count}</td>
      </tr>` : ''}
    </table>

    <p style="margin:20px 0 0;font-size:11px;color:#bbb">
      Generado automáticamente por Capy · ${now.toISOString()}
    </p>
  </div>`

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    return new Response(JSON.stringify({ error: 'no_resend_key' }), { status: 503, headers: corsHeaders })
  }

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Capy <noreply@capyapp.co>',
      to: 'matias@bravosm.com',
      subject: `Capy · Reporte del ${dateLabel}`,
      html,
    }),
  })

  const body = await r.json()
  return new Response(JSON.stringify({ ok: r.ok, totalOrders, revenueHoy, ...body }), {
    status: r.ok ? 200 : 502,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
