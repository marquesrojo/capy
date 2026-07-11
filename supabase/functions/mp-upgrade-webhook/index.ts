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

    if (!paymentId || (!topic.includes('payment') && !topic.includes('merchant_order'))) {
      return new Response('ignored', { status: 200, headers: corsHeaders })
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
      return new Response('no token', { status: 500, headers: corsHeaders })
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const payment = await mpRes.json()

    if (payment.status !== 'approved') {
      return new Response('not approved', { status: 200, headers: corsHeaders })
    }

    // external_reference format: "${venueId}:extra_photos"
    const [venueId, featureKey] = (payment.external_reference || '').split(':')
    if (!venueId || featureKey !== 'extra_photos') {
      return new Response('not extra_photos', { status: 200, headers: corsHeaders })
    }

    // Idempotency: check if this payment was already processed
    const { data: existing } = await supabase
      .from('photo_pack_purchases')
      .select('id')
      .eq('mp_payment_id', String(paymentId))
      .single()

    if (existing) {
      return new Response('already processed', { status: 200, headers: corsHeaders })
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

    return new Response('ok', { status: 200, headers: corsHeaders })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
