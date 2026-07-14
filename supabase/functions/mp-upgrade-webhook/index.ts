import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()

    // MP sends either { topic, id } or { action, data: { id } }
    const paymentId = body?.data?.id || body?.id
    const topic = body?.topic || body?.action || ''

    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    if (!paymentId || (!topic.includes('payment') && !topic.includes('merchant_order'))) {
      return json({ ok: false, reason: 'ignored' })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: settings } = await supabase
      .from('capy_settings')
      .select('mp_access_token')
      .eq('id', 1)
      .single()

    const accessToken = settings?.mp_access_token || Deno.env.get('MP_ACCESS_TOKEN')
    if (!accessToken) {
      return json({ ok: false, reason: 'no_token' }, 500)
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const payment = await mpRes.json()

    if (payment.status !== 'approved') {
      return json({ ok: false, reason: 'not_approved', status: payment.status })
    }

    // external_reference format: "${venueId}:extra_photos"
    const [venueId, featureKey] = (payment.external_reference || '').split(':')
    if (!venueId || featureKey !== 'extra_photos') {
      return json({ ok: false, reason: 'not_extra_photos' })
    }

    // Idempotency: check if this payment was already processed
    const { data: existing } = await supabase
      .from('photo_pack_purchases')
      .select('id')
      .eq('mp_payment_id', String(paymentId))
      .single()

    if (existing) {
      return json({ ok: true, already: true })
    }

    // Record the purchase
    await supabase.from('photo_pack_purchases').insert({
      venue_id: venueId,
      mp_payment_id: String(paymentId),
      amount_ars: payment.transaction_amount,
      credits: 25,
      status: 'approved',
      approved_at: new Date().toISOString(),
    })

    // Add 25 credits to the venue
    const { data: venue } = await supabase
      .from('venues')
      .select('extra_image_credits')
      .eq('id', venueId)
      .single()

    const current = venue?.extra_image_credits || 0
    await supabase
      .from('venues')
      .update({ extra_image_credits: current + 25 })
      .eq('id', venueId)

    return json({ ok: true })
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
