import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 0) return null
  if (digits.startsWith('54')) return digits
  if (digits.startsWith('0')) return '54' + digits.slice(1)
  if (digits.length === 10) return '54' + digits
  if (digits.length === 8) return '5411' + digits
  return digits
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { zone_id, venue_id, location_label } = await req.json()
    if (!venue_id) {
      return new Response(JSON.stringify({ error: 'venue_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Determine target phone: zone's assigned waiter first, then venue fallback
    let targetPhone: string | null = null

    if (zone_id) {
      const { data: zone } = await supabase
        .from('venue_zones')
        .select('current_waiter_id')
        .eq('id', zone_id)
        .single()

      if (zone?.current_waiter_id) {
        const { data: waiter } = await supabase
          .from('staff_names')
          .select('whatsapp_number')
          .eq('id', zone.current_waiter_id)
          .single()

        if (waiter?.whatsapp_number) targetPhone = waiter.whatsapp_number
      }
    }

    if (!targetPhone) {
      const { data: venue } = await supabase
        .from('venues')
        .select('waiter_alert_whatsapp')
        .eq('id', venue_id)
        .single()

      if (venue?.waiter_alert_whatsapp) targetPhone = venue.waiter_alert_whatsapp
    }

    if (!targetPhone) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no_target_phone' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: settings } = await supabase
      .from('capy_settings')
      .select('wa_phone_number_id, wa_access_token, wa_enabled')
      .eq('id', 1)
      .single()

    if (!settings?.wa_enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: 'wa_disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { wa_phone_number_id, wa_access_token } = settings
    if (!wa_phone_number_id || !wa_access_token) {
      return new Response(JSON.stringify({ error: 'WhatsApp not configured' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const toNorm = normalizePhone(targetPhone)
    if (!toNorm) {
      return new Response(JSON.stringify({ error: 'Invalid phone number' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const message = `🔔 Llamada al camarero\n📍 ${location_label || 'Ubicación no especificada'}`

    const res = await fetch(
      `https://graph.facebook.com/v20.0/${wa_phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${wa_access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: toNorm,
          type: 'text',
          text: { body: message },
        }),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      return new Response(JSON.stringify({ error: data }), {
        status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true, message_id: data.messages?.[0]?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
