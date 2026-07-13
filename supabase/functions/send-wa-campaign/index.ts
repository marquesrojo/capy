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
    const { venue_id, message, dry_run } = await req.json()

    if (!venue_id || !message) {
      return new Response(JSON.stringify({ error: 'venue_id and message are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Get WA settings
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

    if (!settings.wa_phone_number_id || !settings.wa_access_token) {
      return new Response(JSON.stringify({ error: 'WhatsApp not configured' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get unique customers with whatsapp who ordered at this venue
    const { data: rows } = await supabase
      .from('orders')
      .select('customer:customers(id, full_name, whatsapp)')
      .eq('venue_id', venue_id)
      .not('customer_id', 'is', null)

    // Deduplicate by whatsapp number
    const seen = new Set<string>()
    const recipients: { name: string; phone: string }[] = []
    for (const row of rows ?? []) {
      const c = row.customer as { id: string; full_name: string; whatsapp: string } | null
      if (!c?.whatsapp) continue
      const norm = normalizePhone(c.whatsapp)
      if (!norm || seen.has(norm)) continue
      seen.add(norm)
      recipients.push({ name: c.full_name || 'Cliente', phone: norm })
    }

    if (dry_run) {
      return new Response(JSON.stringify({ ok: true, total: recipients.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, failed: 0, total: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const phoneNumberId = settings.wa_phone_number_id
    const accessToken = settings.wa_access_token

    let sent = 0
    let failed = 0

    // Send sequentially to respect Meta rate limits
    for (const r of recipients) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: r.phone,
              type: 'text',
              text: { body: message },
            }),
          }
        )
        if (res.ok) sent++
        else failed++
      } catch {
        failed++
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, failed, total: recipients.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
