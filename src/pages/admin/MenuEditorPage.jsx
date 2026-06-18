import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { formatPrice } from '../../lib/utils'

const KIND_LABELS = { bebida: 'Bebida', comida: 'Comida', otro: 'Otro' }
const KIND_COLORS = {
  bebida: 'border-blue-500/40 text-blue-700',
  comida: 'border-emerald-500/40 text-emerald-700',
  otro: 'border-carbon-600 text-smoke-500'
}

export default function MenuEditorPage() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showProductForm, setShowProductForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)

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
    await supabaseStaff
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
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setShowProductForm(true); setShowCategoryForm(false) }}
            className="flex-1 bg-ember-500 hover:bg-ember-600 text-white font-semibold py-3 rounded-xl text-sm"
          >
            + Producto
          </button>
          <button
            onClick={() => { setShowCategoryForm(true); setShowProductForm(false) }}
            className="flex-1 border border-carbon-700 text-smoke-300 font-semibold py-3 rounded-xl text-sm"
          >
            + Categoría
          </button>
        </div>

        {showCategoryForm && (
          <NewCategoryForm
            onClose={() => setShowCategoryForm(false)}
            onCreated={() => { setShowCategoryForm(false); loadAll() }}
          />
        )}

        {showProductForm && (
          <NewProductForm
            categories={categories}
            onClose={() => setShowProductForm(false)}
            onCreated={() => { setShowProductForm(false); loadAll() }}
          />
        )}

        {categories.map(cat => (
          <div key={cat.id} className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-smoke-400 text-xs font-semibold uppercase tracking-wide">
                  {cat.name}
                </h2>
                <select
                  value={cat.kind || 'otro'}
                  onChange={async e => {
                    const newKind = e.target.value
                    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, kind: newKind } : c))
                    await supabaseStaff.from('categories').update({ kind: newKind }).eq('id', cat.id)
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded-full border bg-transparent cursor-pointer ${KIND_COLORS[cat.kind] || KIND_COLORS.otro}`}
                >
                  <option value="comida">Comida</option>
                  <option value="bebida">Bebida</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              {products.filter(p => p.category_id === cat.id).length === 0 && (
                <button
                  onClick={async () => {
                    if (!confirm(`¿Borrar la categoría "${cat.name}"?`)) return
                    await supabaseStaff.from('categories').delete().eq('id', cat.id)
                    setCategories(prev => prev.filter(c => c.id !== cat.id))
                  }}
                  className="text-smoke-500 text-xs underline"
                >
                  Borrar
                </button>
              )}
            </div>
            <div className="space-y-2">
              {products
                .filter(p => p.category_id === cat.id)
                .map(product => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    categories={categories}
                    onToggle={() => toggleAvailability(product)}
                    onDelete={() => deleteProduct(product.id)}
                    onSave={updated => setProducts(prev => prev.map(p => p.id === updated.id ? updated : p))}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProductRow({ product, categories, onToggle, onDelete, onSave }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(product.name)
  const [price, setPrice] = useState(String(product.price))
  const [description, setDescription] = useState(product.description || '')
  const [categoryId, setCategoryId] = useState(product.category_id)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const updates = {
      name: name.trim(),
      price: Number(price),
      description: description.trim() || null,
      category_id: categoryId
    }
    await supabaseStaff.from('products').update(updates).eq('id', product.id)
    onSave({ ...product, ...updates })
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="bg-carbon-900 border border-ember-500/40 rounded-xl p-3 space-y-2">
        <input
          className="input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nombre"
        />
        <input
          className="input"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Descripción (opcional)"
        />
        <input
          className="input"
          type="number"
          value={price}
          onChange={e => setPrice(e.target.value)}
          placeholder="Precio"
        />
        <select
          className="input"
          value={categoryId}
          onChange={e => setCategoryId(e.target.value)}
        >
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(false)}
            className="flex-1 border border-carbon-700 text-smoke-400 py-2 rounded-xl text-xs"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-ember-500 text-white font-semibold py-2 rounded-xl text-xs"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-carbon-900 border border-carbon-700 rounded-xl p-3 flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-smoke-300 text-sm font-medium">{product.name}</p>
        <p className="font-mono text-ember-400 text-xs">{formatPrice(product.price)}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onToggle}
          className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
            product.is_available
              ? 'border-emerald-500/40 text-emerald-700'
              : 'border-red-500/40 text-red-700'
          }`}
        >
          {product.is_available ? 'Disponible' : 'Agotado'}
        </button>
        <button
          onClick={() => setEditing(true)}
          className="text-smoke-400 text-xs underline"
        >
          Editar
        </button>
        <button
          onClick={onDelete}
          className="text-smoke-500 text-xs underline"
        >
          Borrar
        </button>
      </div>
    </div>
  )
}

function NewCategoryForm({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState('comida')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!name.trim()) return
    setSaving(true)
    await supabaseStaff.from('categories').insert({
      venue_id: ACTIVE_VENUE_ID,
      name: name.trim(),
      kind
    })
    setSaving(false)
    onCreated()
  }

  return (
    <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 mb-6 space-y-3">
      <p className="text-smoke-300 text-sm font-medium">Nueva categoría</p>
      <input
        className="input"
        placeholder="Nombre de la categoría"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <select className="input" value={kind} onChange={e => setKind(e.target.value)}>
        <option value="comida">Comida</option>
        <option value="bebida">Bebida</option>
        <option value="otro">Otro</option>
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
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 bg-ember-500 hover:bg-ember-600 text-white font-semibold py-2.5 rounded-xl text-sm"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
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
      <p className="text-smoke-300 text-sm font-medium">Nuevo producto</p>
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
            {c.name} ({KIND_LABELS[c.kind] || 'Otro'})
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
