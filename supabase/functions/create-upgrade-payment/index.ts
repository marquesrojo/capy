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
    const { venueId, featureKey, featureName, price } = await req.json()

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
      return new Response(
        JSON.stringify({ error: 'No MP access token configured for upgrades' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: venue } = await supabase
      .from('venues')
      .select('name')
      .eq('id', venueId)
      .single()

    const venueName = venue?.name || 'Local'
    const externalRef = `${venueId}:${featureKey}`

    const preference = {
      items: [
        {
          title: featureName,
          description: `Upgrade para ${venueName}`,
          quantity: 1,
          currency_id: 'ARS',
          unit_price: Number(price),
        },
      ],
      back_urls: {
        success: `https://capyapp.co/admin/upgrade-success?feature=${featureKey}&venue=${venueId}`,
        failure: `https://capyapp.co/admin/upgrade-failed?feature=${featureKey}&venue=${venueId}`,
        pending: `https://capyapp.co/admin/upgrade-pending?feature=${featureKey}&venue=${venueId}`,
      },
      auto_return: 'approved',
      external_reference: externalRef,
      statement_descriptor: 'CAPY UPGRADES',
    }

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preference),
    })

    const data = await response.json()

    return new Response(
      JSON.stringify({
        init_point: data.init_point,
        sandbox_init_point: data.sandbox_init_point,
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
