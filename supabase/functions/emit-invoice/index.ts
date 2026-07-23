import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Adaptador TusFacturasAPP (ARCA/AFIP): emite la factura de un pedido cobrado,
// o UNA factura consolidada de todos los pedidos cobrados de una mesa (sesión).
// Idempotente. Secrets: TUSFACTURAS_API_URL / _API_TOKEN / _API_KEY /
// _USER_TOKEN, CAPY_FISCAL_PUNTO_VENTA.

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

function parseTfResponse(resp: Record<string, unknown>) {
  const r = resp as Record<string, any>
  const cae = r.cae || r.CAE || r.comprobante?.cae || null
  const invoiceNumber =
    r.comprobante_nro || r.numero || r.comprobante?.numero || r.comprobante_numero || null
  const caeExpiry = r.vencimiento_cae || r.cae_vto || r.comprobante?.vencimiento_cae || null
  const pdfUrl =
    r.comprobante_ticket_url || r.comprobante_pdf_url_ticket || r.comprobante_pdf_url || r.pdf_url || null
  const hasError = r.error === 'S' || r.error === true
  const errorMessage = Array.isArray(r.errores) ? r.errores.join(' | ') : (r.errores || r.message || null)
  const success = !hasError && !!cae
  return { success, cae, invoiceNumber: invoiceNumber != null ? String(invoiceNumber) : null, caeExpiry, pdfUrl, errorMessage }
}

const STAFF_ROLES = ['superadmin', 'admin', 'propietario', 'camarero', 'cocina']
const ORDER_FIELDS = 'id, venue_id, total, subtotal, discount_amount, cash_discount_amount, daily_number, location_label, payment_status, order_items(product_name, quantity, unit_price, line_total), customers(full_name, whatsapp), venue:venues(name, fiscal_enabled, fiscal_condition)'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { orderId, orderIds, sessionId, invoiceType = 'B', client } = await req.json() as {
      orderId?: string
      orderIds?: string[]
      sessionId?: string
      invoiceType?: 'A' | 'B'
      client?: { cuit?: string; razonSocial?: string; domicilio?: string }
    }
    const idList = Array.isArray(orderIds) ? orderIds.filter(Boolean) : []
    if (!orderId && !sessionId && idList.length === 0) return json({ error: 'orderId, orderIds o sessionId requerido' }, 400)
    // Ancla para idempotencia/almacenamiento de la factura consolidada
    const anchorId = idList[0] || orderId || null
    const isConsolidated = idList.length > 1 || !!sessionId

    const isA = invoiceType === 'A'
    const cuitDigits = (client?.cuit || '').replace(/\D/g, '')
    if (isA) {
      if (cuitDigits.length !== 11) return json({ success: false, error: 'CUIT inválido: deben ser 11 dígitos' }, 200)
      if (!client?.razonSocial?.trim()) return json({ success: false, error: 'Falta la razón social del cliente' }, 200)
    }

    const apiUrl = Deno.env.get('TUSFACTURAS_API_URL') || 'https://www.tusfacturas.app/app/api/v2/facturacion/nuevo'
    const apiToken = Deno.env.get('TUSFACTURAS_API_TOKEN')
    const apiKey = Deno.env.get('TUSFACTURAS_API_KEY')
    const userToken = Deno.env.get('TUSFACTURAS_USER_TOKEN')
    const puntoVenta = Deno.env.get('CAPY_FISCAL_PUNTO_VENTA') || '00001'
    if (!apiToken || !apiKey || !userToken) {
      return json({ success: false, error: 'Fiscal no configurado (faltan secrets de TusFacturas)' }, 200)
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Solo staff autenticado
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: { user } = { user: null } } = await supabase.auth.getUser(jwt)
    if (!user) return json({ error: 'No autorizado' }, 401)
    const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!prof || !STAFF_ROLES.includes(prof.role)) return json({ error: 'Solo el staff puede facturar' }, 403)

    // Idempotencia: factura aprobada existente para el ancla (o la sesión)
    const existingQuery = sessionId
      ? supabase.from('fiscal_invoices').select('*').eq('session_id', sessionId).eq('status', 'approved').maybeSingle()
      : supabase.from('fiscal_invoices').select('*').eq('order_id', anchorId!).maybeSingle()
    const { data: existing } = await existingQuery
    if (existing?.status === 'approved') return json({ success: true, alreadyEmitted: true, invoice: existing })

    // Resolver los pedidos a facturar
    let orders: any[] = []
    if (idList.length) {
      const { data } = await supabase.from('orders').select(ORDER_FIELDS)
        .in('id', idList).eq('payment_status', 'aprobado')
        .order('created_at', { ascending: true })
      orders = data || []
      if (!orders.length) return json({ success: false, error: 'No hay pedidos cobrados para facturar' }, 200)
    } else if (sessionId) {
      const { data } = await supabase.from('orders').select(ORDER_FIELDS)
        .eq('session_id', sessionId).eq('payment_status', 'aprobado')
        .order('created_at', { ascending: true })
      orders = data || []
      if (!orders.length) return json({ success: false, error: 'La mesa no tiene pedidos cobrados para facturar' }, 200)
    } else {
      const { data: order, error } = await supabase.from('orders').select(ORDER_FIELDS).eq('id', orderId!).single()
      if (error || !order) return json({ error: 'Order not found' }, 404)
      if (order.payment_status !== 'aprobado') return json({ success: false, error: 'El pedido todavía no está cobrado' }, 200)
      orders = [order]
    }

    const venue = orders[0].venue || {}
    if (!venue.fiscal_enabled) return json({ success: false, error: 'Facturación desactivada para este local' }, 200)

    const isMono = (venue.fiscal_condition || 'responsable_inscripto') === 'monotributo'
    if (isA && isMono) return json({ success: false, error: 'Un monotributista no emite Factura A: emití Factura C' }, 200)
    const tipoComprobante = isMono ? 'FACTURA C' : isA ? 'FACTURA A' : 'FACTURA B'
    const invoiceTypeCode = isMono ? '11' : isA ? '1' : '6'

    const netUnit = (gross: number) => isMono ? gross : +(gross / 1.21).toFixed(6)
    const itemAlicuota = isMono ? '0' : '21'

    // Ítems de todos los pedidos, con bonificación por el descuento de cada uno
    const detalle: any[] = []
    let codigo = 0
    let totalGeneral = 0
    for (const ord of orders) {
      totalGeneral += Number(ord.total) || 0
      const discountTotal = (Number(ord.discount_amount) || 0) + (Number(ord.cash_discount_amount) || 0)
      const gross = (ord.order_items || []).reduce(
        (s: number, i: any) => s + (Number(i.line_total) || Number(i.quantity) * Number(i.unit_price)), 0)
      const discountPct = discountTotal > 0 && gross > 0 ? +((discountTotal / gross) * 100).toFixed(6) : 0
      for (const i of (ord.order_items || [])) {
        codigo += 1
        detalle.push({
          cantidad: String(i.quantity),
          afecta_stock: 'N',
          actualiza_precio: 'N',
          bonificacion_porcentaje: String(discountPct),
          producto: {
            descripcion: i.product_name,
            codigo,
            lista_precios: 'carta',
            leyenda: '',
            unidad_bulto: '1',
            alicuota: itemAlicuota,
            precio_unitario_sin_iva: netUnit(Number(i.unit_price)),
            rg5329: 'N',
          },
        })
      }
    }

    const nowAr = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
    const fecha = `${String(nowAr.getDate()).padStart(2, '0')}/${String(nowAr.getMonth() + 1).padStart(2, '0')}/${nowAr.getFullYear()}`

    const clienteBlock = isA
      ? {
          documento_tipo: 'CUIT', documento_nro: cuitDigits,
          razon_social: client!.razonSocial!.trim(), email: '',
          domicilio: (client?.domicilio || '').trim() || 'Venta en el local',
          provincia: '2', envia_por_mail: 'N', condicion_pago: '201', condicion_iva: 'RI', rg5329: 'N',
        }
      : {
          documento_tipo: 'OTRO', documento_nro: '0',
          razon_social: orders[0].customers?.full_name || 'Consumidor Final', email: '',
          domicilio: 'Venta en el local',
          provincia: '2', envia_por_mail: 'N', condicion_pago: '201', condicion_iva: 'CF', rg5329: 'N',
        }

    const payload = {
      apitoken: apiToken, apikey: apiKey, usertoken: userToken,
      cliente: clienteBlock,
      comprobante: {
        rubro: 'Gastronomía', tipo: tipoComprobante, operacion: 'V',
        numero: 0, punto_venta: puntoVenta, fecha, vencimiento: fecha,
        rubro_grupo_contable: 'Gastronomía', moneda: 'PES', cotizacion: 1,
        external_reference: sessionId || orderId,
        total: Number(totalGeneral), detalle,
      },
    }

    const baseRow = {
      venue_id: orders[0].venue_id,
      order_id: sessionId ? (orders[0].id || null) : (anchorId || null),
      session_id: sessionId || orders[0].session_id || null,
      covered_order_ids: isConsolidated ? orders.map((o: any) => o.id) : null,
      status: 'pending',
      invoice_type: invoiceTypeCode,
      punto_venta: puntoVenta,
      total: totalGeneral,
      request_payload: payload,
      updated_at: new Date().toISOString(),
    }
    const { data: invoiceRow } = existing
      ? await supabase.from('fiscal_invoices').update(baseRow).eq('id', existing.id).select().single()
      : await supabase.from('fiscal_invoices').insert(baseRow).select().single()

    let tfData: Record<string, unknown>
    try {
      const tfRes = await fetch(apiUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      tfData = await tfRes.json().catch(() => ({ error: 'S', errores: [`HTTP ${tfRes.status} sin JSON`] }))
    } catch (e) {
      tfData = { error: 'S', errores: [`Red: ${(e as Error).message}`] }
    }

    const parsed = parseTfResponse(tfData)
    const update = {
      status: parsed.success ? 'approved' : 'error',
      cae: parsed.cae, cae_expiry: parsed.caeExpiry,
      invoice_number: parsed.invoiceNumber, pdf_url: parsed.pdfUrl,
      error_message: parsed.success ? null : (parsed.errorMessage || 'Respuesta sin CAE'),
      response_payload: tfData, updated_at: new Date().toISOString(),
    }
    const { data: finalRow } = await supabase.from('fiscal_invoices').update(update).eq('id', invoiceRow!.id).select().single()

    const venueName = venue.name || 'el local'
    const phone = orders[0].customers?.whatsapp || null
    const waText = parsed.success && parsed.pdfUrl
      ? `🧾 Tu ticket digital de *${venueName}*: ${parsed.pdfUrl}`
      : null

    return json({
      success: parsed.success,
      invoice: finalRow,
      wa: waText ? { text: waText, phone } : null,
      error: parsed.success ? null : update.error_message,
    })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
