import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabaseCustomer, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { useCart } from '../../hooks/useCart'
import { useCustomer } from '../../hooks/useCustomer'
import { formatPrice } from '../../lib/utils'
import { isSpeechRecognitionSupported } from '../../lib/voiceOrderParser'
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

  function handleRemoveFromMenu(product) {
    const index = items.findIndex(i => i.product.id === product.id)
    if (index >= 0) updateQuantity(index, items[index].quantity - 1)
  }

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

  const visibleProducts = search.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(search.toLowerCase())
      )
    : products.filter(p => p.category_id === activeCategory)

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

        {/* Category tabs */}
        {!search && (
          <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-pucara-blue-500 text-white border-pucara-blue-500'
                    : 'bg-white border-black/10 text-smoke-300'
                }`}
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
            location.type === 'retiro'
              ? 'bg-amber-50 border-amber-300'
              : 'bg-white border-black/5'
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
              /* Sector selected: show only its mesas + back link */
              <div className="space-y-1.5">
                <button
                  onClick={() => setSelectedSector(null)}
                  className="text-pucara-blue-400 text-xs font-semibold flex items-center gap-1"
                >
                  ← {selectedSector.name}
                </button>
                <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 scrollbar-hide">
                  {filteredMesas.map(zone => (
                    <button
                      key={zone.id}
                      onClick={() => setLocation({ type: zone.type, zoneId: zone.id, label: zone.name })}
                      className="whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold border bg-white border-black/10 text-smoke-300 active:bg-pucara-blue-500 active:text-white active:border-pucara-blue-500"
                    >
                      {zone.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* No sector selected: sectors + direct zones in one row, then mesas if no sectors, then retiro */
              <div className="space-y-2">
                {(sectorZones.length > 0 || directZones.length > 0) && (
                  <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 scrollbar-hide">
                    {sectorZones.map(sector => (
                      <button
                        key={sector.id}
                        onClick={() => setSelectedSector(sector)}
                        className="whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold border bg-white border-black/10 text-smoke-300 active:bg-pucara-blue-500 active:text-white active:border-pucara-blue-500"
                      >
                        {sector.name}
                      </button>
                    ))}
                    {directZones.map(zone => (
                      <button
                        key={zone.id}
                        onClick={() => setLocation({ type: zone.type, zoneId: zone.id, label: zone.name })}
                        className="whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold border bg-white border-black/10 text-smoke-300 active:bg-pucara-blue-500 active:text-white active:border-pucara-blue-500"
                      >
                        {zone.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Mesas directas — solo si no hay sectores */}
                {sectorZones.length === 0 && mesaZones.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 scrollbar-hide">
                    {mesaZones.map(zone => (
                      <button
                        key={zone.id}
                        onClick={() => setLocation({ type: zone.type, zoneId: zone.id, label: zone.name })}
                        className="whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold border bg-white border-black/10 text-smoke-300 active:bg-pucara-blue-500 active:text-white active:border-pucara-blue-500"
                      >
                        {zone.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Retiro zones */}
                {retiroZones.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto -mx-5 px-5 pb-1 scrollbar-hide">
                    <span className="text-amber-600 text-xs font-semibold whitespace-nowrap flex-shrink-0">🛍 Retiro yo en:</span>
                    {retiroZones.map(zone => (
                        <button
                          key={zone.id}
                          onClick={() => setLocation({ type: zone.type, zoneId: zone.id, label: zone.name })}
                          className="whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold border bg-amber-50 border-amber-300 text-amber-700 active:bg-amber-500 active:text-white active:border-amber-500"
                        >
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
      <main className="px-5 pt-3 space-y-2">
        {visibleProducts.length === 0 && (
          <p className="text-smoke-500 text-sm text-center py-10">
            {search ? `No encontramos "${search}" en la carta.` : 'No hay productos en esta categoría.'}
          </p>
        )}
        {visibleProducts.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            onAdd={addItem}
            onRemove={handleRemoveFromMenu}
            qty={items.find(i => i.product.id === product.id)?.quantity || 0}
          />
        ))}
      </main>

      {itemCount > 0 && (
        <button
          onClick={() => navigate(location ? `${base}/pago` : `${base}/ubicacion`)}
          className="fixed bottom-20 left-5 right-5 bg-pucara-blue-500 hover:bg-pucara-blue-600 text-white rounded-2xl py-4 px-5 flex items-center justify-between shadow-pucara font-semibold z-20"
        >
          <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
          <span>{formatPrice(subtotal)} · {location ? 'Confirmar →' : 'Continuar →'}</span>
        </button>
      )}

      <BottomNav />
    </div>
  )
}

function ProductCard({ product, onAdd, onRemove, qty }) {
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
          <span className="font-mono text-pucara-blue-400 text-sm whitespace-nowrap flex-shrink-0">
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
              <span className={`font-semibold w-5 text-center text-sm ${qty > 0 ? 'text-pucara-blue-500' : 'text-smoke-400'}`}>{qty}</span>
              <button
                onClick={() => onAdd(product, 1)}
                className="w-8 h-8 rounded-lg bg-pucara-blue-500 text-white flex items-center justify-center font-bold text-base active:bg-pucara-blue-600"
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
