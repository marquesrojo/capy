import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// El endpoint ahora también lo usan clientes del local (botón "Enviar una
// sugerencia" en la home), así que el mensaje llega desde afuera y se escapa
// antes de meterlo en el HTML del mail.
function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { staff_id, staff_name, message, source, venue_id, venue_name } = await req.json()
  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: 'message required' }), { status: 400, headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Extraer email del usuario desde el token JWT
  let staffEmail: string | null = null
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token)
    staffEmail = user?.email || null
  }

  // 'camaut' (default) = camarero desde la app; 'cliente' = sugerencia desde
  // la home del local. Se guardan separados para que el soporte de camareros
  // no quede sepultado bajo las sugerencias.
  const ticketSource = source === 'cliente' ? 'cliente' : 'camaut'
  const isCliente = ticketSource === 'cliente'
  const body = message.trim().slice(0, 2000)

  await supabase.from('support_tickets').insert({
    // staff_id referencia staff_names: en las sugerencias de clientes va null
    staff_id: isCliente ? null : (staff_id || null),
    staff_name: staff_name || null,
    staff_email: staffEmail,
    message: body,
    source: ticketSource,
    venue_id: venue_id || null,
  })

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (resendKey) {
    const who = staff_name || (isCliente ? 'Cliente' : 'Camarero')
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'soporte@capyapp.co',
        to: 'matias@bravosm.com',
        subject: isCliente
          ? `[Sugerencia CAPY] ${venue_name || 'Cliente'}`
          : `[Soporte CAPY] Mensaje de ${who}`,
        html: `
          <h2>${isCliente ? 'Nueva sugerencia de un cliente' : 'Nuevo ticket de soporte'}</h2>
          <p><b>De:</b> ${escapeHtml(who)}</p>
          ${staffEmail ? `<p><b>Email:</b> ${escapeHtml(staffEmail)}</p>` : ''}
          ${venue_name ? `<p><b>Local:</b> ${escapeHtml(venue_name)}</p>` : ''}
          <p><b>Mensaje:</b></p>
          <p>${escapeHtml(body).replace(/\n/g, '<br>')}</p>
        `,
      }),
    }).catch(() => {})
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
