const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PAGE_LABELS: Record<string, string> = {
  main:      'Inicio — capyapp.co',
  admin:     'Para locales — /admin/login',
  camareroa: 'Capy Camarero/a — /camareroa',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { name, email, whatsapp, page } = await req.json()
  if (!name?.trim() || !email?.trim()) {
    return new Response(JSON.stringify({ error: 'Faltan datos' }), { status: 400, headers: corsHeaders })
  }

  const pageLabel = PAGE_LABELS[page] || page || 'desconocida'
  const date = new Date().toLocaleString('es-AR', { timeZone: 'America/Buenos_Aires' })

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.error('[send-lead-email] RESEND_API_KEY not set')
    return new Response(JSON.stringify({ error: 'not_configured' }), { status: 503, headers: corsHeaders })
  }

  const html = `
    <div style="font-family:sans-serif;max-width:480px;color:#3C2A21">
      <h2 style="margin:0 0 16px;font-size:20px">🦫 Nuevo lead desde Capy</h2>
      <table style="border-collapse:collapse;font-size:15px;width:100%">
        <tr><td style="padding:8px 16px 8px 0;color:#888">Nombre</td><td><strong>${name}</strong></td></tr>
        <tr><td style="padding:8px 16px 8px 0;color:#888">Email</td><td><a href="mailto:${email}" style="color:#E8772A">${email}</a></td></tr>
        ${whatsapp ? `<tr><td style="padding:8px 16px 8px 0;color:#888">WhatsApp</td><td>${whatsapp}</td></tr>` : ''}
        <tr><td style="padding:8px 16px 8px 0;color:#888">Página</td><td>${pageLabel}</td></tr>
        <tr><td style="padding:8px 16px 8px 0;color:#888">Fecha</td><td>${date}</td></tr>
      </table>
    </div>
  `

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Capy <noreply@capyapp.co>',
      to: 'capy@bravosm.com',
      reply_to: email,
      subject: `Nuevo lead: ${name}`,
      html,
    }),
  })

  if (!r.ok) {
    const body = await r.text()
    console.error('[send-lead-email] Resend error', r.status, body)
    return new Response(JSON.stringify({ error: 'email_failed' }), { status: 502, headers: corsHeaders })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
