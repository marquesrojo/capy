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
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState(null)
  const [search, setSearch] = useState('')
  const [highDemand, setHighDemand] = useState(false)
  const [venueName, setVenueName] = useState('')
  const [venueLogo, setVenueLogo] = useState('')
  const [headerBgColor, setHeaderBgColor] = useState('')
  const [headerTextColor, setHeaderTextColor] = useState('#FFFFFF')
  const { items, addItem, updateQuantity, itemCount, subtotal, location, setLocation, setSessionId } = useCart()
  const [searchParams] = useSearchParams()
  const { customer, forgetCustomer } = useCustomer()
  const navigate = useNavigate()
  const base = useClientBase()
  const headerRef = useRef(null)

  useEffect(() => {
    const sid = searchParams.get('session_id')
    const zoneId = searchParams.get('zone_id')
    const locationLabel = searchParams.get('location_label')
    const locationType = searchParams.get('location_type')
    if (locationLabel) {
      if (sid) setSessionId(sid)
      setLocation({ type: locationType || 'zona', zoneId: zoneId || null, label: locationLabel })
    }
  }, [])

  useEffect(() => {
    async function load() {
      const [catRes, prodRes, venueRes] = await Promise.all([
        supabaseCustomer.from('categories').select('*').eq('venue_id', ACTIVE_VENUE_ID).eq('is_active', true).order('sort_order'),
        supabaseCustomer.from('products').select('*').eq('venue_id', ACTIVE_VENUE_ID).order('sort_order'),
        supabaseCustomer.from('venues').select('high_demand, name, logo_url, header_bg_color, header_text_color').eq('id', ACTIVE_VENUE_ID).single(),
      ])
      setCategories(catRes.data || [])
      setProducts(prodRes.data || [])
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

  function handleRemoveFromMenu(product) {
    const index = items.findIndex(i => i.product.id === product.id)
    if (index >= 0) updateQuantity(index, items[index].quantity - 1)
  }

  const accentBg = headerBgColor || '#1A3A6B'
  const accentText = headerTextColor || '#FFFFFF'

  const visibleProducts = activeCategory
    ? products
        .filter(p => p.category_id === activeCategory)
        .sort((a, b) => (b.image_url ? 1 : 0) - (a.image_url ? 1 : 0))
    : []

  const searchResults = search.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(search.toLowerCase())
      )
    : []

  if (loading) {
    return (
      <div className="h-screen bg-[#F0F4F8] flex items-center justify-center">
        <p className="text-smoke-400 text-sm">Cargando carta...</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-[#F0F4F8] overflow-hidden">
      {highDemand && (
        <div className="flex-shrink-0 bg-red-500/15 border-b border-red-500/30 px-5 py-2 text-center">
          <p className="text-red-700 text-sm font-medium">⏳ Alta demanda — puede haber demora. ¡Gracias por tu paciencia!</p>
        </div>
      )}

      <header
        ref={headerRef}
        className="flex-shrink-0 px-4 pt-4 pb-3"
        style={headerBgColor ? { backgroundColor: headerBgColor } : { backgroundColor: accentBg }}
      >
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            {venueLogo && (
              <img src={venueLogo} alt={venueName} className="w-9 h-9 rounded-xl object-cover border border-white/20 flex-shrink-0" />
            )}
            <div>
              <h1 className="font-display text-2xl tracking-wide leading-none" style={{ color: accentText }}>
                {venueName ? venueName.toUpperCase() : 'CARTA'}
              </h1>
              {location?.label && (
                <button
                  onClick={() => setLocation(null)}
                  className="flex items-center gap-1 mt-0.5"
                  style={{ color: `${accentText}99` }}
                >
                  <span className="text-[10px]">{location.type === 'retiro' ? '🛍' : '📍'}</span>
                  <span className="text-[10px] font-semibold">{location.label}</span>
                  <span className="text-[10px] opacity-60">· cambiar</span>
                </button>
              )}
            </div>
          </div>
          {customer?.full_name && (
            <button
              onClick={async () => { await forgetCustomer(); navigate(base || '/identificacion') }}
              className="text-[10px] font-semibold opacity-60"
              style={{ color: accentText }}
            >
              No soy yo
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar en la carta..."
            className="w-full border-0 rounded-xl px-9 py-2 text-sm bg-white/20 text-white placeholder:text-white/50 outline-none focus:bg-white/30"
            style={{ color: accentText }}
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" style={{ color: accentText }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
          </svg>
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm opacity-60" style={{ color: accentText }}>✕</button>
          )}
        </div>
      </header>

      {search ? (
        /* Search results — full width scrollable */
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-36 space-y-2">
          {searchResults.length === 0 ? (
            <p className="text-smoke-500 text-sm text-center py-10">No encontramos "{search}" en la carta.</p>
          ) : searchResults.map(product => (
            <ProductCard key={product.id} product={product} onAdd={addItem} onRemove={handleRemoveFromMenu}
              qty={items.find(i => i.product.id === product.id)?.quantity || 0}
              accentBg={accentBg} accentText={accentText} />
          ))}
        </div>
      ) : (
        /* Sidebar + products */
        <div className="flex-1 overflow-hidden flex">
          {/* Category sidebar */}
          <div className="w-[84px] flex-shrink-0 overflow-y-auto scrollbar-hide pb-16"
            style={{ backgroundColor: `${accentBg}18` }}>
            {categories.map(cat => {
              const active = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="w-full py-1.5 pl-0 pr-1.5 flex justify-end"
                >
                  <div
                    className="w-[74px] py-3 px-2 rounded-r-xl flex flex-col items-center gap-0.5 text-center border-l-[3px] transition-all"
                    style={active
                      ? { borderColor: accentBg, backgroundColor: 'white' }
                      : { borderColor: 'transparent' }
                    }
                  >
                    <span
                      className="text-[11px] font-semibold leading-tight break-words w-full"
                      style={{ color: active ? accentBg : '#374151' }}
                    >
                      {cat.name}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Product list */}
          <div className="flex-1 overflow-y-auto pt-2 pb-36 px-2.5 space-y-2">
            {visibleProducts.map(product => (
              <ProductCard key={product.id} product={product} onAdd={addItem} onRemove={handleRemoveFromMenu}
                qty={items.find(i => i.product.id === product.id)?.quantity || 0}
                accentBg={accentBg} accentText={accentText} />
            ))}
            {visibleProducts.length === 0 && (
              <p className="text-smoke-500 text-sm text-center py-10">Sin productos en esta categoría.</p>
            )}
          </div>
        </div>
      )}

      {itemCount > 0 && (
        <button
          onClick={() => navigate(location ? `${base}/pago` : `${base}/ubicacion`)}
          className="fixed bottom-20 left-4 right-4 rounded-2xl py-4 px-5 flex items-center justify-between shadow-lg font-semibold z-20 active:opacity-90"
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
      <div className="flex-1 min-w-0 py-3 px-3">
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
