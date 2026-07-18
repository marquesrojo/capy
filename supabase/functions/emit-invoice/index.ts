import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Adaptador TusFacturasAPP (ARCA/AFIP): emite la factura de un pedido cobrado.
// Idempotente: si el pedido ya tiene factura aprobada, devuelve la existente.
// Secrets requeridos (supabase secrets set ...):
//   TUSFACTURAS_API_URL    (default https://www.tusfacturas.app/app/api/v2/facturacion/nuevo)
//   TUSFACTURAS_API_TOKEN  (apitoken)
//   TUSFACTURAS_API_KEY    (apikey)
//   TUSFACTURAS_USER_TOKEN (usertoken)
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
    const { orderId, invoiceType = 'B', client } = await req.json() as {
      orderId?: string
      invoiceType?: 'A' | 'B'
      client?: { cuit?: string; razonSocial?: string; domicilio?: string }
    }
    if (!orderId) return json({ error: 'orderId required' }, 400)

    // Factura A: requiere CUIT y razón social del cliente (Responsable Inscripto)
    const isA = invoiceType === 'A'
    const cuitDigits = (client?.cuit || '').replace(/\D/g, '')
    if (isA) {
      if (cuitDigits.length !== 11) {
        return json({ success: false, error: 'CUIT inválido: deben ser 11 dígitos' }, 200)
      }
      if (!client?.razonSocial?.trim()) {
        return json({ success: false, error: 'Falta la razón social del cliente' }, 200)
      }
    }

    const apiUrl = Deno.env.get('TUSFACTURAS_API_URL') || 'https://www.tusfacturas.app/app/api/v2/facturacion/nuevo'
    const apiToken = Deno.env.get('TUSFACTURAS_API_TOKEN')
    const apiKey = Deno.env.get('TUSFACTURAS_API_KEY')
    const userToken = Deno.env.get('TUSFACTURAS_USER_TOKEN')
    const puntoVenta = Deno.env.get('CAPY_FISCAL_PUNTO_VENTA') || '00001'
    if (!apiToken || !apiKey || !userToken) {
      return json({ success: false, error: 'Fiscal no configurado (faltan secrets de TusFacturas: apitoken/apikey/usertoken)' }, 200)
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
      .select('id, venue_id, total, subtotal, discount_amount, cash_discount_amount, daily_number, location_label, payment_status, order_items(product_name, quantity, unit_price, line_total), customers(full_name, whatsapp), venue:venues(name, address, street_address, fiscal_enabled, fiscal_condition)')
      .eq('id', orderId)
      .single()
    if (orderError || !order) return json({ error: 'Order not found' }, 404)

    if (!(order as any).venue?.fiscal_enabled) {
      return json({ success: false, error: 'Facturación desactivada para este local' }, 200)
    }
    if (order.payment_status !== 'aprobado') {
      return json({ success: false, error: 'El pedido todavía no está cobrado' }, 200)
    }

    // Condición fiscal del emisor: RI emite A/B, monotributista emite C
    const isMono = ((order as any).venue?.fiscal_condition || 'responsable_inscripto') === 'monotributo'
    if (isA && isMono) {
      return json({ success: false, error: 'Un monotributista no emite Factura A: emití Factura C (botón Facturar)' }, 200)
    }
    const tipoComprobante = isMono ? 'FACTURA C' : isA ? 'FACTURA A' : 'FACTURA B'
    const invoiceTypeCode = isMono ? '11' : isA ? '1' : '6'   // cod. AFIP: 1=A, 6=B, 11=C

    // Descuentos (código o efectivo) se aplican como bonificación porcentual
    // por ítem: la suma de ítems bonificados tiene que cerrar con el total.
    const discountTotal = (Number(order.discount_amount) || 0) + (Number(order.cash_discount_amount) || 0)
    const itemsGross = (order.order_items || []).reduce(
      (s: number, i: any) => s + (Number(i.line_total) || Number(i.quantity) * Number(i.unit_price)), 0)
    const discountPct = discountTotal > 0 && itemsGross > 0
      ? +((discountTotal / itemsGross) * 100).toFixed(6)
      : 0

    // Precios de Capy son finales (IVA incluido). Para A/B TusFacturas pide el
    // neto; en Factura C (monotributo) no hay IVA: va el precio final tal cual.
    const netUnit = (gross: number) => isMono ? gross : +(gross / 1.21).toFixed(6)
    const itemAlicuota = isMono ? '0' : '21'

    // Fecha dd/mm/yyyy en horario argentino
    const nowAr = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
    const fecha = `${String(nowAr.getDate()).padStart(2, '0')}/${String(nowAr.getMonth() + 1).padStart(2, '0')}/${nowAr.getFullYear()}`

    // Payload API v2 de TusFacturasAPP (facturacion/nuevo)
    const payload = {
      apitoken: apiToken,
      apikey: apiKey,
      usertoken: userToken,
      cliente: isA
        ? {
            // Factura A: Responsable Inscripto identificado con CUIT
            documento_tipo: 'CUIT',
            documento_nro: cuitDigits,
            razon_social: client!.razonSocial!.trim(),
            email: '',
            domicilio: (client?.domicilio || '').trim() || 'Venta en el local',
            provincia: '2',
            envia_por_mail: 'N',
            condicion_pago: '201',    // contado
            condicion_iva: 'RI',
            rg5329: 'N',
          }
        : {
            documento_tipo: 'OTRO',   // consumidor final
            documento_nro: '0',
            razon_social: order.customers?.full_name || 'Consumidor Final',
            email: '',
            // Obligatorio para TusFacturas pero informativo para consumidor final:
            // genérico fijo, así no se repite la dirección del emisor en la factura.
            domicilio: 'Venta en el local',
            provincia: '2',
            envia_por_mail: 'N',
            condicion_pago: '201',    // contado
            condicion_iva: 'CF',
            rg5329: 'N',
          },
      comprobante: {
        rubro: 'Gastronomía',
        tipo: tipoComprobante,
        operacion: 'V',
        numero: 0,                    // autonumerado por TusFacturas
        punto_venta: puntoVenta,
        fecha,
        vencimiento: fecha,
        rubro_grupo_contable: 'Gastronomía',
        moneda: 'PES',
        cotizacion: 1,
        external_reference: order.id,
        total: Number(order.total),
        detalle: (order.order_items || []).map((i: any, idx: number) => ({
          cantidad: String(i.quantity),
          afecta_stock: 'N',
          actualiza_precio: 'N',
          bonificacion_porcentaje: String(discountPct),
          producto: {
            descripcion: i.product_name,
            codigo: idx + 1,
            lista_precios: 'carta',
            leyenda: '',
            unidad_bulto: '1',
            alicuota: itemAlicuota,
            precio_unitario_sin_iva: netUnit(Number(i.unit_price)),
            rg5329: 'N',
          },
        })),
      },
    }

    // Upsert del registro en pending antes de llamar (queda rastro si falla)
    const baseRow = {
      venue_id: order.venue_id,
      order_id: order.id,
      status: 'pending',
      invoice_type: invoiceTypeCode,
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
