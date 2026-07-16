const PAGE_LABELS = {
  main:      'Inicio — capyapp.co',
  admin:     'Para locales — /admin/login',
  camareroa: 'Capy Camarero/a — /camareroa',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { name, email, whatsapp, page } = req.body || {}
  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({ error: 'Faltan datos' })
  }

  const pageLabel = PAGE_LABELS[page] || page || 'desconocida'
  const date = new Date().toLocaleString('es-AR', { timeZone: 'America/Buenos_Aires' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const resendKey   = process.env.RESEND_API_KEY

  let savedToSupabase = false
  let sentEmail       = false

  // 1. Save lead to Supabase (leads table must exist — see README)
  if (supabaseUrl && supabaseKey) {
    try {
      const r = await fetch(`${supabaseUrl}/rest/v1/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          name:     name.trim(),
          email:    email.trim(),
          whatsapp: whatsapp?.trim() || null,
          page:     pageLabel,
        }),
      })
      savedToSupabase = r.ok
      if (!r.ok) console.warn('[send-lead] Supabase insert', r.status, await r.text())
    } catch (err) {
      console.warn('[send-lead] Supabase error:', err.message)
    }
  }

  // 2. Send email via Resend (optional — set RESEND_API_KEY in Vercel)
  if (resendKey) {
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
    try {
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
      sentEmail = r.ok
      if (!r.ok) console.warn('[send-lead] Resend', r.status, await r.text())
    } catch (err) {
      console.warn('[send-lead] Resend error:', err.message)
    }
  }

  // At least one channel worked → success
  if (savedToSupabase || sentEmail) {
    return res.status(200).json({ ok: true, savedToSupabase, sentEmail })
  }

  // Nothing worked — log prominently so it's visible in Vercel logs
  console.error('[send-lead] LEAD LOST — no storage configured. Data:', { name, email, whatsapp, page: pageLabel, date })
  return res.status(503).json({ error: 'not_configured' })
}
