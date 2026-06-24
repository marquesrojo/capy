import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseCustomer, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { useCart } from '../../hooks/useCart'
import { useCustomer } from '../../hooks/useCustomer'
import { formatPrice } from '../../lib/utils'
import { isSpeechRecognitionSupported } from '../../lib/voiceOrderParser'
import BottomNav from '../../components/BottomNav'

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
  const [headerTextColor, setHeaderTextColor] = useState('#E8772A')
  const { items, addItem, updateQuantity, itemCount, subtotal } = useCart()

  function handleRemoveFromMenu(product) {
    const index = items.findIndex(i => i.product.id === product.id)
    if (index >= 0) updateQuantity(index, items[index].quantity - 1)
  }
  const { customer, forgetCustomer } = useCustomer()
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const [catRes, prodRes, venueRes] = await Promise.all([
        supabaseCustomer
          .from('categories')
          .select('*')
          .eq('venue_id', ACTIVE_VENUE_ID)
          .eq('is_active', true)
          .order('sort_order'),
        supabaseCustomer
          .from('products')
          .select('*')
          .eq('venue_id', ACTIVE_VENUE_ID)
          .order('sort_order'),
        supabaseCustomer
          .from('venues')
          .select('high_demand, name, logo_url, header_bg_color, header_text_color')
          .eq('id', ACTIVE_VENUE_ID)
          .single()
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

  const visibleProducts = search.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(search.toLowerCase())
      )
    : products.filter(p => p.category_id === activeCategory)

  if (loading) {
    return <CenteredMessage text="Cargando carta..." />
  }

  return (
    <div className="min-h-screen bg-carbon-950 pb-32">
      {highDemand && (
        <div className="bg-red-500/15 border-b border-red-500/30 px-5 py-3 text-center">
          <p className="text-red-700 text-sm font-medium">⏳ Alta demanda — puede haber demora en los pedidos. ¡Gracias por tu paciencia!</p>
        </div>
      )}
      <header
        className="sticky top-0 z-10 bg-carbon-950/95 backdrop-blur border-b border-carbon-700 px-5 pt-5 pb-3"
        style={headerBgColor ? { backgroundColor: headerBgColor } : undefined}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {venueLogo && (
              <img
                src={venueLogo}
                alt={venueName}
                className="w-10 h-10 rounded-lg object-cover border border-carbon-700 flex-shrink-0"
              />
            )}
            <div>
              <h1
                className="font-display text-3xl tracking-wide leading-none"
                style={{ color: headerTextColor }}
              >
                CARTA{venueName ? ` ${venueName.toUpperCase()}` : ''}
              </h1>
              {customer?.full_name && (
                <p className="text-smoke-500 text-xs mt-1">Hola, {customer.full_name}</p>
              )}
            </div>
          </div>
          <button onClick={async () => { await forgetCustomer(); navigate('/identificacion') }} className="text-smoke-500 text-xs underline flex-shrink-0">
            No soy yo
          </button>
        </div>
        {/* Pedido por voz: pospuesto, falta subir VoiceOrderPage y su ruta.
            Reactivar reemplazando "false &&" por la condicion real cuando
            se retome esa funcionalidad. */}
        {false && isSpeechRecognitionSupported() && (
          <button
            onClick={() => navigate('/carta/voz')}
            className="flex items-center gap-1.5 text-pucara-blue-500 text-xs font-medium mb-3"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="9" y="2" width="6" height="12" rx="3"/>
              <path d="M5 10a7 7 0 0 0 14 0M12 19v3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
            </svg>
            Pedir por voz
          </button>
        )}
        <div className="relative mb-2">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar en la carta..."
            className="input w-full pl-8 py-2 text-sm"
          />
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-smoke-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35" strokeLinecap="round"/>
          </svg>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-smoke-500 text-sm"
            >
              ✕
            </button>
          )}
        </div>
        {!search && (
          <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-pucara-blue-500 text-white border-pucara-blue-500'
                    : 'border-carbon-700 text-smoke-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="px-5 pt-4 space-y-3">
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
          onClick={() => navigate('/ubicacion')}
          className="fixed bottom-20 left-5 right-5 bg-pucara-blue-500 hover:bg-pucara-blue-600 text-white rounded-2xl py-4 px-5 flex items-center justify-between shadow-pucara font-semibold z-20"
        >
          <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
          <span>{formatPrice(subtotal)} · Continuar →</span>
        </button>
      )}

      <BottomNav />
    </div>
  )
}

function ProductCard({ product, onAdd, onRemove, qty }) {
  return (
    <div
      className={`bg-carbon-900 border rounded-2xl p-4 flex gap-4 transition-colors ${
        product.is_available ? 'border-carbon-700' : 'border-carbon-700 opacity-50'
      }`}
    >
      {product.image_url && (
        <img
          src={product.image_url}
          alt={product.name}
          className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-body font-semibold text-smoke-300">{product.name}</h3>
          <span className="font-mono text-pucara-blue-400 text-sm whitespace-nowrap">
            {formatPrice(product.price)}
          </span>
        </div>
        {product.description && (
          <p className="text-smoke-500 text-xs mt-1 line-clamp-2">{product.description}</p>
        )}

        <div className="mt-3">
          {!product.is_available ? (
            <span className="text-red-700 text-xs font-medium">Agotado</span>
          ) : qty === 0 ? (
            <button
              onClick={() => onAdd(product, 1)}
              className="min-w-[44px] min-h-[44px] text-xs font-semibold px-4 py-2 rounded-full bg-pucara-blue-500 text-white active:bg-pucara-blue-600"
            >
              Agregar
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onRemove(product)}
                className="w-11 h-11 rounded-full bg-carbon-700 text-smoke-300 flex items-center justify-center text-lg font-bold active:bg-carbon-600"
              >
                −
              </button>
              <span className="text-smoke-200 font-semibold w-6 text-center">{qty}</span>
              <button
                onClick={() => onAdd(product, 1)}
                className="w-11 h-11 rounded-full bg-pucara-blue-500 text-white flex items-center justify-center text-lg font-bold active:bg-pucara-blue-600"
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

function CenteredMessage({ text }) {
  return (
    <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
      <p className="text-smoke-400 text-sm">{text}</p>
    </div>
  )
}
