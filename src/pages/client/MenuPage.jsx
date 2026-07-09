import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabaseCustomer, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { useCart } from '../../hooks/useCart'
import { useCustomer } from '../../hooks/useCustomer'
import { formatPrice } from '../../lib/utils'
import BottomNav from '../../components/BottomNav'
import { useClientBase, useVenueOptional } from '../../hooks/useVenue'
import { PinIcon, SunIcon, ShoppingBagIcon, ClockIcon, XIcon, DIETARY_TAGS } from '../../components/Icons'
import RecommendModal from '../../components/RecommendModal'

export default function MenuPage() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState(null)
  const [showCategorySheet, setShowCategorySheet] = useState(false)
  const [showRecommend, setShowRecommend] = useState(false)
  const [search, setSearch] = useState('')
  const [highDemand, setHighDemand] = useState(false)
  const [venueName, setVenueName] = useState('')
  const [venueLogo, setVenueLogo] = useState('')
  const [headerBgColor, setHeaderBgColor] = useState('')
  const [headerTextColor, setHeaderTextColor] = useState('#FFFFFF')
  const { items, addItem, updateQuantity, itemCount, subtotal, location, setLocation, setSessionId } = useCart()
  const [searchParams] = useSearchParams()
  const { customer, isAnonymous, forgetCustomer, loginWithGoogle } = useCustomer()
  const navigate = useNavigate()
  const base = useClientBase()
  const venueCtx = useVenueOptional()
  const headerRef = useRef(null)

  // Si estamos en la ruta legacy /carta sin VenueProvider y hay un slug guardado,
  // redirigir a /r/slug/carta para cargar el venue correcto.
  useEffect(() => {
    if (!venueCtx) {
      const lastSlug = localStorage.getItem('capy-last-venue-slug')
      if (lastSlug) {
        navigate(`/r/${lastSlug}/carta`, { replace: true })
      }
    }
  }, [])

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

  // Color seguro para usar sobre fondos blancos (tarjetas, content area).
  // Si accentBg tiene ≥3:1 contraste sobre blanco lo usamos; si no, probamos
  // accentText; si tampoco, caemos a un gris oscuro neutro.
  function lumOf(hex) {
    try {
      const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255
      const lin = c => c <= 0.03928 ? c/12.92 : ((c+0.055)/1.055)**2.4
      return 0.2126*lin(r) + 0.7152*lin(g) + 0.0722*lin(b)
    } catch { return 1 }
  }
  function contrastOnWhite(hex) { return 1.05 / (lumOf(hex) + 0.05) }
  const contentAccent = contrastOnWhite(accentBg) >= 3 ? accentBg
    : contrastOnWhite(accentText) >= 3 ? accentText
    : '#1A2332'
  // Texto sobre contentAccent: blanco si es oscuro, oscuro si es claro
  const contentAccentText = lumOf(contentAccent) > 0.179 ? '#1A2332' : '#FFFFFF'

  const dailySpecials = products.filter(p => p.is_daily_special && p.is_available)

  const customerDietaryPrefs = customer?.dietary_prefs || []
  const paraVos = customerDietaryPrefs.length > 0
    ? products.filter(p => p.is_available && (p.dietary_tags || []).some(t => customerDietaryPrefs.includes(t)))
    : []

  const activeDietaryTag = DIETARY_TAGS.find(t => t.id === activeCategory)
  const visibleProducts = activeCategory
    ? (activeDietaryTag
        ? products.filter(p => p.is_available && (p.dietary_tags || []).includes(activeCategory))
        : products.filter(p => p.is_available && p.category_id === activeCategory)
      ).sort((a, b) => (b.image_url ? 1 : 0) - (a.image_url ? 1 : 0))
    : []

  const searchResults = search.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(search.toLowerCase())
      )
    : []

  function handleRecommendAdd(name) {
    const product = products.find(p => p.name === name && p.is_available)
    if (product) addItem(product, 1)
  }

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
          <p className="text-red-700 text-sm font-medium flex items-center justify-center gap-1.5"><ClockIcon size={14} /> Alta demanda — puede haber demora. ¡Gracias por tu paciencia!</p>
        </div>
      )}

      <header
        ref={headerRef}
        className="flex-shrink-0 px-4 pt-4 pb-3"
        style={headerBgColor ? { backgroundColor: headerBgColor } : { backgroundColor: accentBg }}
      >
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <div
              onClick={() => navigate(base || '/')}
              className="flex items-center gap-2 cursor-pointer active:opacity-70"
            >
              {venueLogo && (
                <img src={venueLogo} alt={venueName} className="w-9 h-9 rounded-xl object-cover border border-white/20 flex-shrink-0" />
              )}
              <h1 className="font-display text-2xl tracking-wide leading-none" style={{ color: accentText }}>
                {venueName ? venueName.toUpperCase() : 'CARTA'}
              </h1>
              {location?.label && (
                <button
                  onClick={() => setLocation(null)}
                  className="flex items-center gap-1.5 mt-1"
                  style={{ color: accentText }}
                >
                  <span className="text-xs font-bold flex items-center gap-1">
                    {location.type === 'retiro' ? <ShoppingBagIcon size={12} /> : <PinIcon size={12} />}
                    {location.label}
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border leading-none" style={{ borderColor: `${accentText}50`, opacity: 0.8 }}>cambiar</span>
                </button>
              )}
            </div>
          </div>
          {customer?.full_name ? (
            <div className="text-right shrink-0">
              <p className="text-[11px] font-semibold leading-none mb-0.5" style={{ color: accentText }}>
                {customer.full_name}
              </p>
              <button
                onClick={async () => { await forgetCustomer(); navigate(base || '/identificacion') }}
                className="text-[10px] opacity-50 leading-none"
                style={{ color: accentText }}
              >
                No soy yo
              </button>
            </div>
          ) : isAnonymous ? (
            <button
              onClick={() => loginWithGoogle(`${base}/carta`)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold shrink-0"
              style={{ borderColor: `${accentText}40`, color: accentText, backgroundColor: `${accentText}15` }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Iniciar sesión
            </button>
          ) : null}
        </div>

        {/* Search + Category filter */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategorySheet(true)}
            className="flex-shrink-0 flex items-center justify-center gap-1.5 h-9 w-[88px] rounded-xl text-[10px] font-bold leading-none"
            style={{ backgroundColor: `${accentText}20`, color: accentText }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="9" y1="18" x2="15" y2="18"/>
            </svg>
            <span className="truncate">{(activeDietaryTag?.label || categories.find(c => c.id === activeCategory)?.name || 'Categoría').slice(0, 8)}</span>
          </button>
          <div className="relative flex-1">
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar en la carta..."
              className="w-full border-0 rounded-xl px-9 py-2 text-sm bg-white/20 placeholder:text-white/50 outline-none focus:bg-white/30"
              style={{ color: accentText }}
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" style={{ color: accentText }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
            </svg>
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60" style={{ color: accentText }}><XIcon size={14} /></button>
            )}
          </div>
        </div>

        {/* Recommend button */}
        <button
          onClick={() => setShowRecommend(true)}
          className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
          style={{ backgroundColor: `${accentText}15`, color: accentText }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          ¿No sabés qué comer? Te recomendamos algo
        </button>
      </header>

      {search ? (
        /* Search results — full width scrollable */
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-36 space-y-2">
          {searchResults.length === 0 ? (
            <p className="text-smoke-500 text-sm text-center py-10">No encontramos "{search}" en la carta.</p>
          ) : searchResults.map(product => (
            <ProductCard key={product.id} product={product} onAdd={addItem} onRemove={handleRemoveFromMenu}
              qty={items.find(i => i.product.id === product.id)?.quantity || 0}
              accentBg={contentAccent} accentText={contentAccentText}
              customerPrefs={customerDietaryPrefs} />
          ))}
        </div>
      ) : (
        /* Full-width product list */
        <div className="flex-1 overflow-y-auto pt-2 pb-36 px-3 space-y-2">
          {dailySpecials.length > 0 && (
            <div className="mb-1">
              <div className="flex items-center gap-2 px-1 mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1" style={{ color: contentAccent }}><SunIcon size={13} /> Plato del día</span>
              </div>
              {dailySpecials.map(product => (
                <ProductCard key={product.id} product={product} onAdd={addItem} onRemove={handleRemoveFromMenu}
                  qty={items.find(i => i.product.id === product.id)?.quantity || 0}
                  accentBg={contentAccent} accentText={contentAccentText} isDaily
                  customerPrefs={customerDietaryPrefs} />
              ))}
              <div className="border-t border-black/[0.06] mt-3 mb-1" />
            </div>
          )}
          {paraVos.length > 0 && !activeCategory && (
            <div className="mb-1">
              <div className="flex items-center gap-2 px-1 mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1 text-emerald-600">
                  ✨ Para vos
                </span>
              </div>
              {paraVos.map(product => (
                <ProductCard key={product.id} product={product} onAdd={addItem} onRemove={handleRemoveFromMenu}
                  qty={items.find(i => i.product.id === product.id)?.quantity || 0}
                  accentBg={contentAccent} accentText={contentAccentText}
                  customerPrefs={customerDietaryPrefs} />
              ))}
              <div className="border-t border-black/[0.06] mt-3 mb-1" />
            </div>
          )}
          {visibleProducts.map(product => (
            <ProductCard key={product.id} product={product} onAdd={addItem} onRemove={handleRemoveFromMenu}
              qty={items.find(i => i.product.id === product.id)?.quantity || 0}
              accentBg={contentAccent} accentText={contentAccentText}
              customerPrefs={customerDietaryPrefs} />
          ))}
          {visibleProducts.length === 0 && dailySpecials.length === 0 && paraVos.length === 0 && (
            <p className="text-smoke-500 text-sm text-center py-10">
              {activeDietaryTag ? `Sin productos con preferencia "${activeDietaryTag.label}".` : 'Sin productos en esta categoría.'}
            </p>
          )}
        </div>
      )}

      {/* Category bottom sheet */}
      {showCategorySheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCategorySheet(false)} />
          <div className="relative bg-white rounded-t-3xl px-5 pt-5 pb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#1A2332] font-black text-xl uppercase">Categorías</h2>
              <button
                onClick={() => setShowCategorySheet(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F0F4F8] text-[#6B7A8D]"
              ><XIcon size={16} /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setShowCategorySheet(false) }}
                  className="py-3 px-2 rounded-xl text-sm font-semibold text-center border-2 transition-all leading-tight"
                  style={activeCategory === cat.id
                    ? { backgroundColor: contentAccent, borderColor: contentAccent, color: contentAccentText }
                    : { backgroundColor: '#F8FAFB', borderColor: '#E8EEF4', color: '#1A2332' }
                  }
                >
                  {cat.name}
                </button>
              ))}
            </div>
            {(() => {
              const tagsWithProducts = DIETARY_TAGS.filter(tag =>
                products.some(p => p.is_available && (p.dietary_tags || []).includes(tag.id))
              )
              if (!tagsWithProducts.length) return null
              return (
                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#C0CBDA] mb-2">Preferencias</p>
                  <div className="grid grid-cols-2 gap-2">
                    {tagsWithProducts.map(tag => {
                      const active = activeCategory === tag.id
                      return (
                        <button
                          key={tag.id}
                          onClick={() => { setActiveCategory(tag.id); setShowCategorySheet(false) }}
                          className="py-3 px-2 rounded-xl text-sm font-semibold text-center border-2 transition-all leading-tight flex items-center justify-center gap-1.5"
                          style={active
                            ? { backgroundColor: contentAccent, borderColor: contentAccent, color: contentAccentText }
                            : { backgroundColor: '#F8FAFB', borderColor: '#E8EEF4', color: '#1A2332' }
                          }
                        >
                          <tag.Icon size={14} />
                          {tag.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {itemCount > 0 && (
        <button
          onClick={() => navigate(location ? `${base}/pago` : `${base}/ubicacion`)}
          className="fixed bottom-20 left-4 right-4 rounded-2xl py-4 px-5 flex items-center justify-between shadow-lg font-semibold z-20 active:opacity-90"
          style={{ backgroundColor: contentAccent, color: contentAccentText }}
        >
          <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
          <span>{formatPrice(subtotal)} · {location ? 'Confirmar →' : 'Continuar →'}</span>
        </button>
      )}

      <BottomNav />

      {showRecommend && (
        <RecommendModal
          venueId={ACTIVE_VENUE_ID}
          accentColor={contentAccent}
          onAddToCart={handleRecommendAdd}
          onClose={() => setShowRecommend(false)}
        />
      )}
    </div>
  )
}

function ProductCard({ product, onAdd, onRemove, qty, accentBg = '#1A3A6B', accentText = '#FFFFFF', isDaily = false, customerPrefs = [] }) {
  const tags = (product.dietary_tags || []).map(id => DIETARY_TAGS.find(t => t.id === id)).filter(Boolean)
  const matchesPrefs = customerPrefs.length > 0 && tags.some(t => customerPrefs.includes(t.id))
  return (
    <div className={`bg-white rounded-xl flex gap-3 transition-colors ${
      product.is_available ? 'shadow-sm' : 'opacity-50'
    }`} style={{ border: matchesPrefs ? '1.5px solid #22c55e80' : isDaily ? `1.5px solid ${accentBg}40` : '1px solid rgba(0,0,0,0.05)' }}>
      {product.image_url && (
        <div className="relative flex-shrink-0">
          <img src={product.image_url} alt={product.name} className="w-24 h-24 rounded-l-xl object-cover" />
          {isDaily && (
            <span className="absolute top-1.5 left-1.5 text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none flex items-center gap-0.5" style={{ backgroundColor: accentBg, color: accentText }}>
              <SunIcon size={9} /> HOY
            </span>
          )}
        </div>
      )}
      <div className="flex-1 min-w-0 py-3 px-3">
        {isDaily && !product.image_url && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none mb-1.5" style={{ backgroundColor: accentBg, color: accentText }}>
            <SunIcon size={9} /> HOY
          </span>
        )}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-smoke-300 text-sm leading-tight">{product.name}</h3>
          <span className="font-mono text-sm whitespace-nowrap flex-shrink-0" style={{ color: accentBg }}>
            {formatPrice(product.price)}
          </span>
        </div>
        {product.description && (
          <p className="text-smoke-500 text-xs mt-1 line-clamp-3">{product.description}</p>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {tags.map(tag => (
              <span key={tag.id} className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                customerPrefs.includes(tag.id) ? 'bg-emerald-50 text-emerald-600' : 'bg-[#F0F4F8] text-smoke-500'
              }`}>
                <tag.Icon size={9} /> {tag.label}
              </span>
            ))}
          </div>
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
