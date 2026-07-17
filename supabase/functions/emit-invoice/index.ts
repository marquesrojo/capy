import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Adaptador TusFacturasAPP (ARCA/AFIP): emite la factura de un pedido cobrado.
// Idempotente: si el pedido ya tiene factura aprobada, devuelve la existente.
// Secrets requeridos (supabase secrets set ...):
//   TUSFACTURAS_API_URL   (sandbox: https://www.tusfacturas.app/api/v1/facturacion/emitir)
//   TUSFACTURAS_API_KEY
//   TUSFACTURAS_USER_TOKEN
//   CAPY_FISCAL_PUNTO_VENTA (default 00001)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Extrae los datos del comprobante tolerando variantes de la respuesta de TusFacturas
function parseTfResponse(resp: Record<string, unknown>) {
  const r = resp as Record<string, any>
  const cae = r.cae || r.CAE || r.comprobante?.cae || null
  const invoiceNumber =
    r.comprobante_nro || r.numero || r.comprobante?.numero || r.comprobante_numero || null
  const caeExpiry = r.vencimiento_cae || r.cae_vto || r.comprobante?.vencimiento_cae || null
  const pdfUrl =
    r.comprobante_ticket_url ||       // ticket 80mm
    r.comprobante_pdf_url_ticket ||
    r.comprobante_pdf_url ||
    r.pdf_url ||
    null
  const hasError = r.error === 'S' || r.error === true
  const errorMessage = Array.isArray(r.errores) ? r.errores.join(' | ') : (r.errores || r.message || null)
  const success = !hasError && !!cae
  return { success, cae, invoiceNumber: invoiceNumber != null ? String(invoiceNumber) : null, caeExpiry, pdfUrl, errorMessage }
}

const STAFF_ROLES = ['admin', 'propietario', 'camarero', 'cocina']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { orderId } = await req.json() as { orderId?: string }
    if (!orderId) return json({ error: 'orderId required' }, 400)

    const apiUrl = Deno.env.get('TUSFACTURAS_API_URL')
    const apiKey = Deno.env.get('TUSFACTURAS_API_KEY')
    const userToken = Deno.env.get('TUSFACTURAS_USER_TOKEN')
    const puntoVenta = Deno.env.get('CAPY_FISCAL_PUNTO_VENTA') || '00001'
    if (!apiUrl || !apiKey || !userToken) {
      return json({ success: false, error: 'Fiscal no configurado (faltan secrets de TusFacturas)' }, 200)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Emisión solo explícita por staff autenticado: se valida el JWT del
    // cajero/admin que apretó el botón, nunca el anon key.
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: { user } = { user: null } } = await supabase.auth.getUser(jwt)
    if (!user) return json({ error: 'No autorizado' }, 401)
    const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!prof || !STAFF_ROLES.includes(prof.role)) {
      return json({ error: 'Solo el staff puede facturar' }, 403)
    }

    // Idempotencia: factura aprobada existente se devuelve tal cual
    const { data: existing } = await supabase
      .from('fiscal_invoices')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle()
    if (existing?.status === 'approved') {
      return json({ success: true, alreadyEmitted: true, invoice: existing })
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, venue_id, total, subtotal, discount_amount, cash_discount_amount, daily_number, location_label, payment_status, order_items(product_name, quantity, unit_price, line_total), customers(full_name, whatsapp), venue:venues(name, fiscal_enabled)')
      .eq('id', orderId)
      .single()
    if (orderError || !order) return json({ error: 'Order not found' }, 404)

    if (!(order as any).venue?.fiscal_enabled) {
      return json({ success: false, error: 'Facturación desactivada para este local' }, 200)
    }
    if (order.payment_status !== 'aprobado') {
      return json({ success: false, error: 'El pedido todavía no está cobrado' }, 200)
    }

    // Descuentos (código o efectivo) van como bonificación: la suma de ítems
    // menos la bonificación tiene que cerrar con el total, o AFIP rechaza.
    const discountTotal = (Number(order.discount_amount) || 0) + (Number(order.cash_discount_amount) || 0)

    // Payload según la especificación del Sandbox de TusFacturasAPP
    const payload = {
      usertoken: userToken,
      apikey: apiKey,
      comprobante: {
        tipo: '6',                    // Factura B
        punto_venta: puntoVenta,
        condicion_pago: '0',          // contado
        concepto: '1',                // productos
        documento_tipo: '99',         // consumidor final
        documento_numero: '0',
        cliente_nombre: order.customers?.full_name || 'Consumidor Final',
        fecha: new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
        total: order.total,
        bonificacion: discountTotal > 0 ? discountTotal : 0,
        items: (order.order_items || []).map((i: any) => ({
          descripcion: i.product_name,
          cantidad: i.quantity,
          precio_unitario: i.unit_price,
          importe: i.line_total ?? i.quantity * i.unit_price,
          alicuota: '21',
        })),
      },
    }

    // Upsert del registro en pending antes de llamar (queda rastro si falla)
    const baseRow = {
      venue_id: order.venue_id,
      order_id: order.id,
      status: 'pending',
      invoice_type: '6',
      punto_venta: puntoVenta,
      total: order.total,
      request_payload: payload,
      updated_at: new Date().toISOString(),
    }
    const { data: invoiceRow } = existing
      ? await supabase.from('fiscal_invoices').update(baseRow).eq('id', existing.id).select().single()
      : await supabase.from('fiscal_invoices').insert(baseRow).select().single()

    let tfData: Record<string, unknown>
    try {
      const tfRes = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      tfData = await tfRes.json().catch(() => ({ error: 'S', errores: [`HTTP ${tfRes.status} sin JSON`] }))
    } catch (e) {
      tfData = { error: 'S', errores: [`Red: ${(e as Error).message}`] }
    }

    const parsed = parseTfResponse(tfData)
    const update = {
      status: parsed.success ? 'approved' : 'error',
      cae: parsed.cae,
      cae_expiry: parsed.caeExpiry,
      invoice_number: parsed.invoiceNumber,
      pdf_url: parsed.pdfUrl,
      error_message: parsed.success ? null : (parsed.errorMessage || 'Respuesta sin CAE'),
      response_payload: tfData,
      updated_at: new Date().toISOString(),
    }
    const { data: finalRow } = await supabase
      .from('fiscal_invoices')
      .update(update)
      .eq('id', invoiceRow!.id)
      .select()
      .single()

    // Datos listos para el link de refuerzo de WhatsApp (wa.me)
    const venueName = (order as any).venue?.name || 'el local'
    const waText = parsed.success && parsed.pdfUrl
      ? `🧾 Tu ticket digital de *${venueName}*${order.daily_number ? ` (pedido #${order.daily_number})` : ''}: ${parsed.pdfUrl}`
      : null

    return json({
      success: parsed.success,
      invoice: finalRow,
      wa: waText ? { text: waText, phone: order.customers?.whatsapp || null } : null,
      error: parsed.success ? null : update.error_message,
    })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
