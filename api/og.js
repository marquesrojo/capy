function escape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export default async function handler(req, res) {
  const venueId = req.query.v
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY

  let venueName = 'CAPY'
  let logoUrl = ''

  if (venueId && supabaseUrl && anonKey) {
    try {
      const r = await fetch(
        `${supabaseUrl}/rest/v1/venues?id=eq.${venueId}&select=name,logo_url`,
        { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } }
      )
      const [venue] = await r.json()
      if (venue) {
        venueName = venue.name || venueName
        logoUrl = venue.logo_url || ''
      }
    } catch (_) {}
  }

  const title = escape(venueName)
  const image = logoUrl ? `<meta property="og:image" content="${escape(logoUrl)}" />` : ''

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate')
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="Nuevo pedido recibido" />
  ${image}
  <meta property="og:type" content="website" />
  <meta http-equiv="refresh" content="0;url=/admin" />
</head>
<body></body>
</html>`)
}
