import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Webhook de Mercado Pago. Recibe las notificaciones de la cuenta y las rutea:
// - external_reference "staffId:image_pack" → acredita el pack de imágenes con
//   IA del camarero (CAPY Camarero).
// - external_reference = orderId (UUID) → marca el pedido como pagado.
// Verifica con MP_ACCESS_TOKEN (la cuenta recaudadora, la misma que las
// imágenes IA del venue).

serve(async (req) => {
  try {
    const body = await req.json()

    // Solo procesar notificaciones de pagos
    if (body.type !== 'payment') {
      return new Response('ok', { status: 200 })
    }

    const paymentId = body.data?.id
    if (!paymentId) return new Response('ok', { status: 200 })

    // Consultar el pago a MP para verificar el estado
    const accessToken = Deno.env.get('MP_ACCESS_TOKEN')
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    const payment = await mpRes.json()

    if (payment.status !== 'approved') {
      return new Response('ok', { status: 200 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const externalRef = payment.external_reference || ''

    // ── Pack de imágenes con IA del camarero (CAPY Camarero) ──
    if (externalRef.includes(':image_pack')) {
      const staffId = externalRef.split(':')[0]
      const pid = String(paymentId)
      if (staffId) {
        const { data: dupImg } = await supabase
          .from('camarero_image_purchases')
          .select('id')
          .eq('mp_payment_id', pid)
          .maybeSingle()
        if (!dupImg) {
          const packImages = Number(Deno.env.get('CAPY_IMAGE_PACK_SIZE') || 10)
          await supabase.from('camarero_image_purchases').insert({
            staff_id: staffId,
            mp_payment_id: pid,
            amount_ars: payment.transaction_amount,
            images: packImages,
            status: 'approved',
            approved_at: new Date().toISOString(),
          })
          await supabase.rpc('add_camarero_images', { p_staff: staffId, p_images: packImages })
        }
      }
      return new Response('ok', { status: 200 })
    }

    // ── Orden normal (pago de cliente) ──
    const orderId = externalRef
    if (!orderId) return new Response('ok', { status: 200 })

    await supabase
      .from('orders')
      .update({
        payment_status: 'aprobado',
        payment_method: 'Mercado Pago',
        payment_confirmed_at: new Date().toISOString()
      })
      .eq('id', orderId)

    return new Response('ok', { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
