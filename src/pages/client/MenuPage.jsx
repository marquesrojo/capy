import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseCustomer, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { useCart } from '../../hooks/useCart'
import { useCustomer } from '../../hooks/useCustomer'
import { formatPrice } from '../../lib/utils'
import BottomNav from '../../components/BottomNav'

export default function MenuPage() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState(null)
  const { items, addItem, itemCount, subtotal } = useCart()
  const { customer, forgetCustomer } = useCustomer()
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const [catRes, prodRes] = await Promise.all([
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
          .order('sort_order')
      ])
      setCategories(catRes.data || [])
      setProducts(prodRes.data || [])
      if (catRes.data?.length) setActiveCategory(catRes.data[0].id)
      setLoading(false)
    }
    load()
  }, [])

  const visibleProducts = products.filter(p => p.category_id === activeCategory)

  if (loading) {
    return <CenteredMessage text="Cargando carta..." />
  }

  return (
    <div className="min-h-screen bg-carbon-950 pb-32">
      <header className="sticky top-0 z-10 bg-carbon-950/95 backdrop-blur border-b border-carbon-700 px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-3xl text-ember-500 tracking-wide">CARTA</h1>
            <p className="text-smoke-500 text-xs mt-0.5">Hola, {customer?.full_name}</p>
          </div>
          <button onClick={async () => { await forgetCustomer(); navigate('/identificacion') }} className="text-smoke-500 text-xs underline">
            No soy yo
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                activeCategory === cat.id
                  ? 'bg-ember-500 text-white border-ember-500'
                  : 'border-carbon-700 text-smoke-300'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      <main className="px-5 pt-4 space-y-3">
        {visibleProducts.length === 0 && (
          <p className="text-smoke-500 text-sm text-center py-10">No hay productos en esta categoría.</p>
        )}
        {visibleProducts.map(product => (
          <ProductCard key={product.id} product={product} onAdd={addItem} />
        ))}
      </main>

      {itemCount > 0 && (
        <button
          onClick={() => navigate('/ubicacion')}
          className="fixed bottom-20 left-5 right-5 bg-ember-500 hover:bg-ember-600 text-white rounded-2xl py-4 px-5 flex items-center justify-between shadow-ember font-semibold z-20"
        >
          <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
          <span>{formatPrice(subtotal)} · Continuar →</span>
        </button>
      )}

      <BottomNav />
    </div>
  )
}

function ProductCard({ product, onAdd }) {
  const [added, setAdded] = useState(false)

  function handleAdd() {
    onAdd(product, 1)
    setAdded(true)
    setTimeout(() => setAdded(false), 900)
  }

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
          <span className="font-mono text-ember-400 text-sm whitespace-nowrap">
            {formatPrice(product.price)}
          </span>
        </div>
        {product.description && (
          <p className="text-smoke-500 text-xs mt-1 line-clamp-2">{product.description}</p>
        )}

        <div className="mt-3">
          {!product.is_available ? (
            <span className="text-red-700 text-xs font-medium">Agotado</span>
          ) : (
            <button
              onClick={handleAdd}
              className={`text-xs font-semibold px-4 py-1.5 rounded-full transition-colors ${
                added ? 'bg-emerald-500 text-white' : 'bg-carbon-700 text-smoke-300 hover:bg-carbon-600'
              }`}
            >
              {added ? 'Agregado ✓' : 'Agregar'}
            </button>
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
