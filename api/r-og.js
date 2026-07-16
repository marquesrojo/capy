function escape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const CRAWLERS = /WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot/i

export default async function handler(req, res) {
  const slug = req.query.slug
  const ua = req.headers['user-agent'] || ''
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY

  // Regular users: skip the OG step entirely, forwarding zone params
  if (!CRAWLERS.test(ua)) {
    const subpath = req.query.subpath ? `/${req.query.subpath}` : ''
    const fwd = new URLSearchParams({ go: '1' })
    if (req.query.zone_id) fwd.set('zone_id', req.query.zone_id)
    if (req.query.location_label) fwd.set('location_label', req.query.location_label)
    if (req.query.location_type) fwd.set('location_type', req.query.location_type)
    res.writeHead(302, {
      Location: `/r/${slug}${subpath}?${fwd.toString()}`,
      'Cache-Control': 'no-store',
    })
    res.end()
    return
  }

  let venueName = 'CAPY'
  let logoUrl = ''

  if (slug && supabaseUrl && anonKey) {
    try {
      const r = await fetch(
        `${supabaseUrl}/rest/v1/venues?slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&select=name,logo_url`,
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
  res.setHeader('Vary', 'User-Agent')
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="Pedí desde tu mesa con Capy" />
  ${image}
  <meta property="og:type" content="website" />
</head>
<body></body>
</html>`)
}
