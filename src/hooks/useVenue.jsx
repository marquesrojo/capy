import { createContext, useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabaseCustomer, setActiveVenueId } from '../lib/supabase'

const VenueContext = createContext(null)

export function VenueProvider({ children }) {
  const { slug } = useParams()
  const [venue, setVenue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setNotFound(false)

    supabaseCustomer
      .from('venues')
      .select('id, name, logo_url, header_bg_color, header_text_color, slug, landing_self_color, landing_waiter_color, banner_url')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true)
        } else {
          setVenue(data)
          setActiveVenueId(data.id)
          localStorage.setItem('capy-last-venue-slug', data.slug)

          // PWA manifest dinámico por venue
          const manifestLink = document.querySelector('link[rel="manifest"]')
          if (manifestLink) manifestLink.href = `/api/pwa-manifest?slug=${data.slug}`
          const themeColor = document.querySelector('meta[name="theme-color"]')
          if (themeColor && data.header_bg_color) themeColor.content = data.header_bg_color
          const appTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]')
          if (appTitle && data.name) appTitle.content = data.name
          document.title = data.name || 'CAPY'
        }
        setLoading(false)
      })
  }, [slug])

  return (
    <VenueContext.Provider value={{ venue, loading, notFound }}>
      {children}
    </VenueContext.Provider>
  )
}

export function useVenue() {
  const ctx = useContext(VenueContext)
  if (!ctx) throw new Error('useVenue debe usarse dentro de VenueProvider')
  return ctx
}

export function useVenueOptional() {
  return useContext(VenueContext)
}

export function useClientBase() {
  const ctx = useContext(VenueContext)
  if (ctx?.venue?.slug) return `/r/${ctx.venue.slug}`
  // Fallback for flat routes (/pedido/:id, etc.) outside VenueLayout
  const lastSlug = localStorage.getItem('capy-last-venue-slug')
  return lastSlug ? `/r/${lastSlug}` : ''
}
