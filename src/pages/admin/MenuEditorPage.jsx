import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { formatPrice } from '../../lib/utils'

export default function MenuEditorPage() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  async function loadAll() {
    const [catRes, prodRes] = await Promise.all([
      supabaseStaff.from('categories').select('*').eq('venue_id', ACTIVE_VENUE_ID).order('sort_order'),
      supabaseStaff.from('products').select('*').eq('venue_id', ACTIVE_VENUE_ID).order('sort_order')
    ])
    setCategories(catRes.data || [])
    setProducts(prodRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function toggleAvailability(product) {
    setProducts(prev =>
      prev.map(p => (p.id === product.id ? { ...p, is_available: !p.is_available } : p))
    )
    await supabase
      .from('products')
      .update({ is_available: !product.is_available })
      .eq('id', product.id)
  }

  async function deleteProduct(productId) {
    if (!confirm('¿Eliminar este producto de la carta?')) return
    await supabaseStaff.from('products').delete().eq('id', productId)
    setProducts(prev => prev.filter(p => p.id !== productId))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
        <p className="text-smoke-400 text-sm">Cargando carta...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-carbon-950 pb-10">
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700 flex items-center justify-between">
        <h1 className="font-display text-3xl text-ember-500 tracking-wide">CARTA</h1>
        <Link to="/admin" className="text-smoke-400 text-xs underline">
          ← Volver
        </Link>
      </header>

      <div className="px-5 mt-4">
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-ember-500 hover:bg-ember-600 text-white font-semibold py-3 rounded-xl mb-4"
        >
          + Agregar producto
        </button>

        {showForm && (
          <NewProductForm
            categories={categories}
            onClose={() => setShowForm(false)}
            onCreated={() => {
              setShowForm(false)
              loadAll()
            }}
          />
        )}

        {categories.map(cat => (
          <div key={cat.id} className="mb-6">
            <h2 className="text-smoke-400 text-xs font-semibold uppercase tracking-wide mb-2">
              {cat.name}
            </h2>
            <div className="space-y-2">
              {products
                .filter(p => p.category_id === cat.id)
                .map(product => (
                  <div
                    key={product.id}
                    className="bg-carbon-900 border border-carbon-700 rounded-xl p-3 flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-smoke-300 text-sm font-medium">{product.name}</p>
                      <p className="font-mono text-ember-400 text-xs">{formatPrice(product.price)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => toggleAvailability(product)}
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                          product.is_available
                            ? 'border-emerald-500/40 text-emerald-700'
                            : 'border-red-500/40 text-red-700'
                        }`}
                      >
                        {product.is_available ? 'Disponible' : 'Agotado'}
                      </button>
                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="text-smoke-500 text-xs underline"
                      >
                        Borrar
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function NewProductForm({ categories, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    await supabaseStaff.from('products').insert({
      venue_id: ACTIVE_VENUE_ID,
      category_id: categoryId,
      name,
      description,
      price: Number(price)
    })
    setSaving(false)
    onCreated()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 mb-6 space-y-3">
      <input
        className="input"
        placeholder="Nombre del producto"
        required
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <input
        className="input"
        placeholder="Descripción (opcional)"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />
      <input
        className="input"
        placeholder="Precio"
        type="number"
        required
        min="0"
        value={price}
        onChange={e => setPrice(e.target.value)}
      />
      <select className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
        {categories.map(c => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 border border-carbon-700 text-smoke-400 py-2.5 rounded-xl text-sm"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-ember-500 hover:bg-ember-600 text-white font-semibold py-2.5 rounded-xl text-sm"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
