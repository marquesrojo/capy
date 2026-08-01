import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { IngredientsPanel } from './MenuEditorPage'

// Insumos: qué lleva cada plato.
//
// Vivía adentro del editor de carta, un botón por producto. Ahí molestaba dos
// veces: le agregaba una decisión más a la pantalla donde se cargan precios y
// fotos, y escondía la receta detrás de encontrar el plato en la lista. Acá es
// lo único que se hace, y de esto salen el inventario y el consumo por día.
export default function InsumosPage() {
  const { venueId } = useAuth()
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [recipeCounts, setRecipeCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState(null)
  const [search, setSearch] = useState('')
  const [soloSinReceta, setSoloSinReceta] = useState(false)

  useEffect(() => { if (venueId) load() }, [venueId])

  async function load() {
    const [catRes, prodRes] = await Promise.all([
      supabaseStaff.from('categories').select('id, name').eq('venue_id', venueId).order('sort_order'),
      supabaseStaff
        .from('products')
        .select('id, name, description, category_id, image_url, is_ingredient_only')
        .eq('venue_id', venueId)
        .order('sort_order'),
    ])
    const cats = catRes.data || []
    // Los insumos en sí no llevan receta: son el final de la cadena
    const platos = (prodRes.data || []).filter(p => !p.is_ingredient_only)
    setCategories(cats)
    setProducts(platos)

    if (platos.length) {
      const { data: rows } = await supabaseStaff
        .from('product_ingredients')
        .select('product_id')
        .in('product_id', platos.map(p => p.id))
        .not('ingredient_name', 'is', null)
      const counts = {}
      for (const r of rows || []) counts[r.product_id] = (counts[r.product_id] || 0) + 1
      setRecipeCounts(counts)
    } else {
      setRecipeCounts({})
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
        <p className="text-smoke-400 text-sm">Cargando...</p>
      </div>
    )
  }

  const term = search.trim().toLowerCase()
  const catName = Object.fromEntries(categories.map(c => [c.id, c.name]))
  const visibles = products.filter(p => {
    if (soloSinReceta && (recipeCounts[p.id] || 0) > 0) return false
    if (!term) return true
    return `${p.name} ${catName[p.category_id] || ''}`.toLowerCase().includes(term)
  })
  const sinReceta = products.filter(p => !recipeCounts[p.id]).length

  return (
    <div className="min-h-screen bg-carbon-950 pb-16">
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">INSUMOS</h1>
          <Link to="/admin/configuracion" className="text-smoke-400 text-xs underline">← Volver</Link>
        </div>
        <p className="text-smoke-500 text-xs mt-1 max-w-3xl mx-auto">
          Qué lleva cada plato. De acá salen el stock del inventario y el consumo por día.
        </p>
      </header>

      <main className="px-5 mt-4 space-y-3 max-w-3xl mx-auto">
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Buscar un plato..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {sinReceta > 0 && (
          <button
            onClick={() => setSoloSinReceta(v => !v)}
            className={`text-xs font-semibold px-3 py-2 rounded-xl border ${
              soloSinReceta
                ? 'border-ember-500 bg-ember-500/10 text-ember-400'
                : 'border-carbon-700 text-smoke-500'
            }`}
          >
            {soloSinReceta ? 'Viendo los que no tienen receta' : `${sinReceta} sin receta cargada`}
          </button>
        )}

        {visibles.length === 0 ? (
          <p className="text-smoke-500 text-sm text-center py-8">
            {products.length === 0
              ? 'Todavía no hay productos en la carta.'
              : 'Ningún plato coincide.'}
          </p>
        ) : visibles.map(p => {
          const cuantos = recipeCounts[p.id] || 0
          const abierto = openId === p.id
          return (
            <div key={p.id} className="bg-carbon-900 border border-carbon-700 rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpenId(abierto ? null : p.id)}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left"
              >
                <div className="min-w-0">
                  <p className="text-smoke-200 text-sm font-semibold truncate">{p.name}</p>
                  <p className="text-smoke-600 text-[11px] mt-0.5">
                    {catName[p.category_id] || 'Sin categoría'}
                    {' · '}
                    {cuantos > 0
                      ? <span className="text-emerald-600">{cuantos} {cuantos === 1 ? 'ingrediente' : 'ingredientes'}</span>
                      : <span className="text-smoke-600">sin receta</span>}
                  </p>
                </div>
                <span className="text-smoke-500 text-xs flex-shrink-0">{abierto ? 'Cerrar' : 'Cargar'}</span>
              </button>

              {abierto && (
                <div className="px-1 pb-1">
                  <IngredientsPanel
                    productId={p.id}
                    productName={p.name}
                    productDescription={p.description}
                    productCategory={categories.find(c => c.id === p.category_id)}
                    currentImageUrl={p.image_url}
                    onPhotoSaved={() => load()}
                    venueId={venueId}
                    onClose={() => { setOpenId(null); load() }}
                    onRefreshProducts={load}
                  />
                </div>
              )}
            </div>
          )
        })}
      </main>
    </div>
  )
}
