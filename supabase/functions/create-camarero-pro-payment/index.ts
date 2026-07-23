import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Pago único del Pack Pro del camarero (ARS 9.000) o recarga de cartas.
// Espejo de create-upgrade-payment. La activación real ocurre en el webhook
// mp-upgrade-webhook cuando MP confirma el pago (idempotente).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PRO_PRICE_ARS = 9000

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const { kind = 'pro' } = await req.json().catch(() => ({ kind: 'pro' }))

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Identificar al camarero por su JWT
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: { user } = { user: null } } = await supabase.auth.getUser(jwt)
    if (!user) return json({ error: 'No autorizado' }, 401)

    const { data: settings } = await supabase
      .from('capy_settings')
      .select('mp_access_token')
      .eq('id', 1)
      .single()

    const accessToken = settings?.mp_access_token || Deno.env.get('MP_ACCESS_TOKEN')
    if (!accessToken) return json({ error: 'MP no configurado' }, 400)

    const isRecarga = kind === 'recarga_cartas'
    const title = isRecarga ? 'Recarga de cartas (Capy Camarero)' : 'Capy Pro (Camarero)'
    const price = isRecarga ? Number(Deno.env.get('CAPY_RECARGA_CARTAS_ARS') || 0) : PRO_PRICE_ARS
    if (!price) return json({ error: 'Precio no configurado' }, 400)

    // external_reference: "${staffId}:pro_camarero" | "${staffId}:recarga_cartas"
    const featureKey = isRecarga ? 'recarga_cartas' : 'pro_camarero'
    const externalRef = `${user.id}:${featureKey}`

    const preference = {
      items: [{ title, description: title, quantity: 1, currency_id: 'ARS', unit_price: price }],
      back_urls: {
        success: `https://capyapp.co/camareroa/app?upgrade=success&feature=${featureKey}`,
        failure: `https://capyapp.co/camareroa/app?upgrade=failed&feature=${featureKey}`,
        pending: `https://capyapp.co/camareroa/app?upgrade=pending&feature=${featureKey}`,
      },
      auto_return: 'approved',
      external_reference: externalRef,
      statement_descriptor: 'CAPY PRO',
    }

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(preference),
    })
    const data = await response.json()

    return json({ init_point: data.init_point, sandbox_init_point: data.sandbox_init_point })
  } catch (error) {
    return json({ error: (error as Error).message }, 500)
  }
})
