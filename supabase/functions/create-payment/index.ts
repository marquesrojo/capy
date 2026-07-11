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
    const { orderId, total, orderNumber, venueId } = await req.json()

    // Read the venue's MP token from DB using service role (bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: venue } = await supabase
      .from('venues')
      .select('mp_access_token, name')
      .eq('id', venueId)
      .single()

    // Fall back to env var for backwards compatibility
    const accessToken = venue?.mp_access_token || Deno.env.get('MP_ACCESS_TOKEN')

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'No MP access token configured for this venue' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const venueName = venue?.name || 'Capy'

    const preference = {
      items: [
        {
          id: orderId,
          title: `Pedido #${orderNumber} - ${venueName}`,
          quantity: 1,
          currency_id: 'ARS',
          unit_price: Number(total)
        }
      ],
      back_urls: {
        success: `https://capyapp.co/pedido-pagado?order=${orderId}&status=success`,
        failure: `https://capyapp.co/pedido-pagado?order=${orderId}&status=failure`,
        pending: `https://capyapp.co/pedido-pagado?order=${orderId}&status=pending`
      },
      auto_return: 'approved',
      external_reference: orderId,
      statement_descriptor: venueName.substring(0, 22).toUpperCase()
    }

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    })

    const data = await response.json()

    return new Response(
      JSON.stringify({
        init_point: data.init_point,
        sandbox_init_point: data.sandbox_init_point
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
