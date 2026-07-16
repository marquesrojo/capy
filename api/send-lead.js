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

  const html = `
    <div style="font-family:sans-serif;max-width:480px;color:#3C2A21">
      <h2 style="margin:0 0 16px;font-size:20px">🦫 Nuevo lead desde Capy</h2>
      <table style="border-collapse:collapse;font-size:15px;width:100%">
        <tr>
          <td style="padding:8px 16px 8px 0;color:#888;white-space:nowrap;vertical-align:top">Nombre</td>
          <td style="padding:8px 0"><strong>${name}</strong></td>
        </tr>
        <tr>
          <td style="padding:8px 16px 8px 0;color:#888;white-space:nowrap;vertical-align:top">Email</td>
          <td style="padding:8px 0"><a href="mailto:${email}" style="color:#E8772A">${email}</a></td>
        </tr>
        ${whatsapp ? `<tr><td style="padding:8px 16px 8px 0;color:#888;white-space:nowrap;vertical-align:top">WhatsApp</td><td style="padding:8px 0">${whatsapp}</td></tr>` : ''}
        <tr>
          <td style="padding:8px 16px 8px 0;color:#888;white-space:nowrap;vertical-align:top">Página</td>
          <td style="padding:8px 0">${pageLabel}</td>
        </tr>
        <tr>
          <td style="padding:8px 16px 8px 0;color:#888;white-space:nowrap;vertical-align:top">Fecha</td>
          <td style="padding:8px 0">${date}</td>
        </tr>
      </table>
    </div>
  `

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Requires capyapp.co verified in Resend dashboard
        from: 'Capy Leads <leads@capyapp.co>',
        to: 'capy@bravosm.com',
        reply_to: email,
        subject: `Nuevo lead: ${name}`,
        html,
      }),
    })

    if (!r.ok) {
      console.error('[send-lead] Resend', r.status, await r.text())
      return res.status(502).json({ error: 'email_error' })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[send-lead]', err)
    return res.status(500).json({ error: 'internal_error' })
  }
}
