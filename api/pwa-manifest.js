export default async function handler(req, res) {
  const referer = req.headers.referer || req.headers.referrer || ''
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY

  const icons = [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
  ]

  let manifest

  if (referer.includes('/admin')) {
    manifest = {
      name: 'Capy Admin',
      short_name: 'Capy Admin',
      start_url: '/admin',
      scope: '/admin/',
      display: 'standalone',
      background_color: '#0F1923',
      theme_color: '#008080',
      icons,
    }
  } else if (referer.includes('/camaut')) {
    manifest = {
      name: 'Capy Camarero',
      short_name: 'Capy Camarero',
      start_url: '/camaut/app',
      scope: '/camaut/',
      display: 'standalone',
      background_color: '#0F1923',
      theme_color: '#008080',
      icons,
    }
  } else {
    const slug = req.query.slug || referer.match(/\/r\/([^/?#]+)/)?.[1]
    if (slug && supabaseUrl && anonKey) {
      try {
        const r = await fetch(
          `${supabaseUrl}/rest/v1/venues?slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&select=name,logo_url,header_bg_color`,
          { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } }
        )
        const rows = await r.json().catch(() => [])
        const venue = rows[0] || null
        const name = venue?.name || 'Capy'
        const iconUrl = venue?.logo_url
        manifest = {
          name,
          short_name: name,
          start_url: `/r/${slug}/?go=true`,
          scope: `/r/${slug}/`,
          display: 'standalone',
          background_color: venue?.header_bg_color || '#0F1923',
          theme_color: venue?.header_bg_color || '#008080',
          icons: iconUrl ? [{ src: iconUrl, sizes: 'any', type: 'image/png' }] : icons,
        }
      } catch {
        manifest = {
          name: 'Capy',
          short_name: 'Capy',
          start_url: `/r/${slug}/?go=true`,
          scope: `/r/${slug}/`,
          display: 'standalone',
          background_color: '#0F1923',
          theme_color: '#008080',
          icons,
        }
      }
    } else {
      manifest = {
        name: 'Capy',
        short_name: 'Capy',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0F1923',
        theme_color: '#008080',
        icons,
      }
    }
  }

  res.setHeader('Content-Type', 'application/manifest+json')
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json(manifest)
}
