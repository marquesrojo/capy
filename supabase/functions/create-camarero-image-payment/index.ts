import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Compra de un pack de imágenes con IA para el camarero, cuando supera las 10
// imágenes gratis. Usa la MISMA cuenta recaudadora de Mercado Pago que las
// imágenes IA del venue (capy_settings.mp_access_token).
// La suma de imágenes ocurre en mp-upgrade-webhook al confirmarse el pago.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Pack por defecto: 10 imágenes. El precio sale de capy_settings
// (camarero_image_pack_price, editable por el superadmin); si no está, cae al
// secret CAPY_IMAGE_PACK_ARS o a $8.000.
const PACK_IMAGES = Number(Deno.env.get('CAPY_IMAGE_PACK_SIZE') || 10)

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
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
      .select('mp_access_token, camarero_image_pack_price')
      .eq('id', 1)
      .single()

    const price = Number(settings?.camarero_image_pack_price || Deno.env.get('CAPY_IMAGE_PACK_ARS') || 8000)
    if (!price) return json({ error: 'Precio del pack no configurado' }, 400)

    const accessToken = settings?.mp_access_token || Deno.env.get('MP_ACCESS_TOKEN')
    if (!accessToken) return json({ error: 'MP no configurado' }, 400)

    // external_reference: "${staffId}:image_pack"
    const externalRef = `${user.id}:image_pack`

    const preference = {
      items: [{
        title: `Pack de ${PACK_IMAGES} imágenes con IA (Capy Camarero)`,
        description: `Sumá ${PACK_IMAGES} imágenes para subir cartas con inteligencia artificial`,
        quantity: 1,
        currency_id: 'ARS',
        unit_price: price,
      }],
      back_urls: {
        success: `https://capyapp.co/camareroa/app?image_pack=success`,
        failure: `https://capyapp.co/camareroa/app?image_pack=failed`,
        pending: `https://capyapp.co/camareroa/app?image_pack=pending`,
      },
      auto_return: 'approved',
      external_reference: externalRef,
      statement_descriptor: 'CAPY IMAGENES',
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
