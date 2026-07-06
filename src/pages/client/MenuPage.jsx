import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabaseCustomer, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { useCart } from '../../hooks/useCart'
import { useCustomer } from '../../hooks/useCustomer'
import { formatPrice } from '../../lib/utils'
import BottomNav from '../../components/BottomNav'
import { useClientBase } from '../../hooks/useVenue'

export default function MenuPage() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [zones, setZones] = useState([])
  const [selectedSector, setSelectedSector] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState(null)
  const [search, setSearch] = useState('')
  const [highDemand, setHighDemand] = useState(false)
  const [venueName, setVenueName] = useState('')
  const [venueLogo, setVenueLogo] = useState('')
  const [headerBgColor, setHeaderBgColor] = useState('')
  const [headerTextColor, setHeaderTextColor] = useState('#E8772A')
  const { items, addItem, updateQuantity, itemCount, subtotal, location, setLocation, setSessionId } = useCart()
  const [searchParams] = useSearchParams()
  const { customer, forgetCustomer } = useCustomer()
  const navigate = useNavigate()
  const base = useClientBase()

  const sectionRefs = useRef({})
  const chipRefs = useRef({})
  const chipsBarRef = useRef(null)
  const headerRef = useRef(null)
  const isClickScrolling = useRef(false)

  useEffect(() => {
    const sid = searchParams.get('session_id')
    const zoneId = searchParams.get('zone_id')
    const locationLabel = searchParams.get('location_label')
    const locationType = searchParams.get('location_type')
    if (locationLabel) {
      if (sid) setSessionId(sid)
      setLocation({ type: locationType || 'zona', zoneId: zoneId || null, mapX: null, mapY: null, label: locationLabel })
    }
  }, [])

  useEffect(() => {
    async function load() {
      const [catRes, prodRes, venueRes, zoneRes] = await Promise.all([
        supabaseCustomer.from('categories').select('*').eq('venue_id', ACTIVE_VENUE_ID).eq('is_active', true).order('sort_order'),
        supabaseCustomer.from('products').select('*').eq('venue_id', ACTIVE_VENUE_ID).order('sort_order'),
        supabaseCustomer.from('venues').select('high_demand, name, logo_url, header_bg_color, header_text_color').eq('id', ACTIVE_VENUE_ID).single(),
        supabaseCustomer.from('venue_zones').select('*').eq('venue_id', ACTIVE_VENUE_ID).eq('is_active', true).order('sort_order')
      ])
      setCategories(catRes.data || [])
      setProducts(prodRes.data || [])
      setZones(zoneRes.data || [])
      if (catRes.data?.length) setActiveCategory(catRes.data[0].id)
      if (venueRes.data) {
        setHighDemand(venueRes.data.high_demand)
        setVenueName(venueRes.data.name)
        setVenueLogo(venueRes.data.logo_url)
        if (venueRes.data.header_bg_color) setHeaderBgColor(venueRes.data.header_bg_color)
        if (venueRes.data.header_text_color) setHeaderTextColor(venueRes.data.header_text_color)
      }
      setLoading(false)
    }
    load()
  }, [])

  // Auto-highlight chip as user scrolls through category sections
  useEffect(() => {
    if (search || categories.length === 0) return

    const observer = new IntersectionObserver(entries => {
      if (isClickScrolling.current) return
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const catId = entry.target.dataset.catId
          if (!catId) return
          setActiveCategory(catId)
          // Auto-center the matching chip in the scrollable bar
          const chip = chipRefs.current[catId]
          const bar = chipsBarRef.current
          if (chip && bar) {
            bar.scrollTo({
              left: chip.offsetLeft - bar.offsetWidth / 2 + chip.offsetWidth / 2,
              behavior: 'smooth',
            })
          }
        }
      })
    }, {
      rootMargin: '-100px 0px -55% 0px',
      threshold: 0,
    })

    Object.values(sectionRefs.current).forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [categories, search])

  function scrollToCategory(catId) {
    setActiveCategory(catId)
    isClickScrolling.current = true
    const el = sectionRefs.current[catId]
    const headerHeight = headerRef.current?.offsetHeight || 130
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - 8
      window.scrollTo({ top, behavior: 'smooth' })
    }
    setTimeout(() => { isClickScrolling.current = false }, 1000)
  }

  function handleRemoveFromMenu(product) {
    const index = items.findIndex(i => i.product.id === product.id)
    if (index >= 0) updateQuantity(index, items[index].quantity - 1)
  }

  // Use venue header colors as accent; fall back to a neutral blue
  const accentBg = headerBgColor || '#1A3A6B'
  const accentText = headerTextColor || '#FFFFFF'

  const productsByCategory = categories
    .map(cat => ({ ...cat, products: products.filter(p => p.category_id === cat.id) }))
    .filter(cat => cat.products.length > 0)

  const searchResults = search.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(search.toLowerCase())
      )
    : []

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center">
        <p className="text-smoke-400 text-sm">Cargando carta...</p>
      </div>
    )
  }

  const mesaZones = zones.filter(z => z.type === 'mesa')
  const parentIds = new Set(mesaZones.map(z => z.parent_zone_id).filter(Boolean))
  const sectorZones = zones.filter(z => parentIds.has(z.id))
  const directZones = zones.filter(z => z.type !== 'mesa' && !parentIds.has(z.id) && z.type !== 'retiro')
  const retiroZones = zones.filter(z => z.type === 'retiro')
  const filteredMesas = selectedSector
    ? mesaZones.filter(z => z.parent_zone_id === selectedSector.id)
    : mesaZones

  return (
    <div className="min-h-screen bg-[#F0F4F8] pb-32">
      {highDemand && (
        <div className="bg-red-500/15 border-b border-red-500/30 px-5 py-3 text-center">
          <p className="text-red-700 text-sm font-medium">⏳ Alta demanda — puede haber demora en los pedidos. ¡Gracias por tu paciencia!</p>
        </div>
      )}

      <header
        ref={headerRef}
        className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-black/8 px-5 pt-5 pb-3"
        style={headerBgColor ? { backgroundColor: headerBgColor } : undefined}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {venueLogo && (
              <img src={venueLogo} alt={venueName} className="w-10 h-10 rounded-xl object-cover border border-black/10 flex-shrink-0" />
            )}
            <div>
              <h1 className="font-display text-3xl tracking-wide leading-none" style={{ color: headerTextColor }}>
                CARTA{venueName ? ` ${venueName.toUpperCase()}` : ''}
              </h1>
              {customer?.full_name && (
                <p className="text-smoke-500 text-xs mt-1">Hola, {customer.full_name}</p>
              )}
            </div>
          </div>
          <button
            onClick={async () => { await forgetCustomer(); navigate(base || '/identificacion') }}
            className="text-smoke-500 text-xs underline flex-shrink-0"
          >
            No soy yo
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar en la carta..."
            className="w-full border border-black/10 rounded-xl px-9 py-2.5 text-sm bg-[#F0F4F8] text-smoke-300 placeholder:text-smoke-500 outline-none focus:border-pucara-blue-500/50"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-smoke-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
          </svg>
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-smoke-500 text-sm">✕</button>
          )}
        </div>

        {/* Category chips — sticky, auto-highlights on scroll */}
        {!search && (
          <div ref={chipsBarRef} className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat.id}
                ref={el => { chipRefs.current[cat.id] = el }}
                onClick={() => scrollToCategory(cat.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold border transition-colors flex-shrink-0 ${
                  activeCategory === cat.id
                    ? 'border-transparent'
                    : 'bg-white border-black/10 text-smoke-300'
                }`}
                style={activeCategory === cat.id
                  ? { backgroundColor: accentBg, color: accentText }
                  : undefined
                }
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Location selector */}
      <div className="px-5 pt-4 pb-1 space-y-2">
        {location?.label ? (
          <div className={`flex items-center justify-between rounded-xl px-4 py-2.5 border shadow-sm ${
            location.type === 'retiro' ? 'bg-amber-50 border-amber-300' : 'bg-white border-black/5'
          }`}>
            <div className="flex items-center gap-2">
              <span>{location.type === 'retiro' ? '🛍' : '📍'}</span>
              <p className={`font-semibold text-sm ${location.type === 'retiro' ? 'text-amber-700' : 'text-smoke-300'}`}>
                {location.label}
              </p>
            </div>
            <button
              onClick={() => { setLocation(null); setSelectedSector(null) }}
              className={`text-xs font-semibold ${location.type === 'retiro' ? 'text-amber-600' : 'text-pucara-blue-400'}`}
            >
              Cambiar
            </button>
          </div>
        ) : zones.length > 0 ? (
          <>
            <p className="text-smoke-500 text-xs font-semibold uppercase tracking-wide">¿Dónde estás?</p>
            {selectedSector ? (
              <div className="space-y-1.5">
                <button onClick={() => setSelectedSector(null)} className="text-pucara-blue-400 text-xs font-semibold flex items-center gap-1">
                  ← {selectedSector.name}
                </button>
                <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 scrollbar-hide">
                  {filteredMesas.map(zone => (
                    <button key={zone.id} onClick={() => setLocation({ type: zone.type, zoneId: zone.id, label: zone.name })}
                      className="whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold border bg-white border-black/10 text-smoke-300 active:bg-pucara-blue-500 active:text-white active:border-pucara-blue-500">
                      {zone.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {(sectorZones.length > 0 || directZones.length > 0) && (
                  <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 scrollbar-hide">
                    {sectorZones.map(sector => (
                      <button key={sector.id} onClick={() => setSelectedSector(sector)}
                        className="whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold border bg-white border-black/10 text-smoke-300 active:bg-pucara-blue-500 active:text-white">
                        {sector.name}
                      </button>
                    ))}
                    {directZones.map(zone => (
                      <button key={zone.id} onClick={() => setLocation({ type: zone.type, zoneId: zone.id, label: zone.name })}
                        className="whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold border bg-white border-black/10 text-smoke-300 active:bg-pucara-blue-500 active:text-white">
                        {zone.name}
                      </button>
                    ))}
                  </div>
                )}
                {sectorZones.length === 0 && mesaZones.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 scrollbar-hide">
                    {mesaZones.map(zone => (
                      <button key={zone.id} onClick={() => setLocation({ type: zone.type, zoneId: zone.id, label: zone.name })}
                        className="whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold border bg-white border-black/10 text-smoke-300 active:bg-pucara-blue-500 active:text-white">
                        {zone.name}
                      </button>
                    ))}
                  </div>
                )}
                {retiroZones.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto -mx-5 px-5 pb-1 scrollbar-hide">
                    <span className="text-amber-600 text-xs font-semibold whitespace-nowrap flex-shrink-0">🛍 Retiro yo en:</span>
                    {retiroZones.map(zone => (
                      <button key={zone.id} onClick={() => setLocation({ type: zone.type, zoneId: zone.id, label: zone.name })}
                        className="whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold border bg-amber-50 border-amber-300 text-amber-700 active:bg-amber-500 active:text-white active:border-amber-500">
                        {zone.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Products */}
      <main className="px-5 pt-3">
        {search ? (
          <div className="space-y-2">
            {searchResults.length === 0 ? (
              <p className="text-smoke-500 text-sm text-center py-10">No encontramos "{search}" en la carta.</p>
            ) : searchResults.map(product => (
              <ProductCard key={product.id} product={product} onAdd={addItem} onRemove={handleRemoveFromMenu}
                qty={items.find(i => i.product.id === product.id)?.quantity || 0}
                accentBg={accentBg} accentText={accentText} />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {productsByCategory.map(cat => (
              <section
                key={cat.id}
                ref={el => { sectionRefs.current[cat.id] = el }}
                data-cat-id={cat.id}
              >
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-smoke-400 mb-3">{cat.name}</h2>
                <div className="space-y-2">
                  {cat.products.map(product => (
                    <ProductCard key={product.id} product={product} onAdd={addItem} onRemove={handleRemoveFromMenu}
                      qty={items.find(i => i.product.id === product.id)?.quantity || 0}
                      accentBg={accentBg} accentText={accentText} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {itemCount > 0 && (
        <button
          onClick={() => navigate(location ? `${base}/pago` : `${base}/ubicacion`)}
          className="fixed bottom-20 left-5 right-5 rounded-2xl py-4 px-5 flex items-center justify-between shadow-lg font-semibold z-20 active:opacity-90"
          style={{ backgroundColor: accentBg, color: accentText }}
        >
          <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
          <span>{formatPrice(subtotal)} · {location ? 'Confirmar →' : 'Continuar →'}</span>
        </button>
      )}

      <BottomNav />
    </div>
  )
}

function ProductCard({ product, onAdd, onRemove, qty, accentBg = '#1A3A6B', accentText = '#FFFFFF' }) {
  return (
    <div className={`bg-white border rounded-xl flex gap-3 transition-colors ${
      product.is_available ? 'border-black/5 shadow-sm' : 'border-black/5 opacity-50'
    }`}>
      {product.image_url && (
        <img src={product.image_url} alt={product.name} className="w-20 h-20 rounded-l-xl object-cover flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0 py-3 pr-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-smoke-300 text-sm leading-tight">{product.name}</h3>
          <span className="font-mono text-sm whitespace-nowrap flex-shrink-0" style={{ color: accentBg }}>
            {formatPrice(product.price)}
          </span>
        </div>
        {product.description && (
          <p className="text-smoke-500 text-xs mt-1 line-clamp-2">{product.description}</p>
        )}
        <div className="mt-2.5">
          {!product.is_available ? (
            <span className="text-red-700 text-xs font-medium">Agotado</span>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onRemove(product)}
                disabled={qty === 0}
                className="w-8 h-8 rounded-lg border border-black/10 bg-[#F0F4F8] text-smoke-300 flex items-center justify-center font-bold text-base disabled:opacity-30"
              >
                −
              </button>
              <span className="font-semibold w-5 text-center text-sm" style={{ color: qty > 0 ? accentBg : '#9CA3AF' }}>{qty}</span>
              <button
                onClick={() => onAdd(product, 1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base active:opacity-80"
                style={{ backgroundColor: accentBg, color: accentText }}
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
