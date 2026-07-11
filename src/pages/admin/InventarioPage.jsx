import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabaseStaff } from '../../lib/supabase'

export default function InventarioPage() {
  const { venueId } = useAuth()
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [supplyProductIds, setSupplyProductIds] = useState([])
  const [loading, setLoading] = useState(true)

  async function loadAll() {
    if (!venueId) return
    const [catRes, prodRes, ingRes] = await Promise.all([
      supabaseStaff.from('categories').select('id, name').eq('venue_id', venueId).order('sort_order'),
      supabaseStaff.from('products').select('id, name, unit_stock, min_stock_alert, is_ingredient_only, is_available').eq('venue_id', venueId),
      supabaseStaff.from('product_ingredients').select('supply_product_id').eq('venue_id', venueId).not('supply_product_id', 'is', null),
    ])
    setCategories(catRes.data || [])
    setProducts(prodRes.data || [])
    setSupplyProductIds([...new Set((ingRes.data || []).map(r => r.supply_product_id))])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [venueId])

  return (
    <div className="min-h-screen bg-carbon-950 pb-10">
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">INVENTARIO</h1>
          <Link to="/admin/configuracion" className="text-smoke-400 text-xs underline">← Volver</Link>
        </div>
      </header>

      <main className="px-4 mt-4">
        {loading ? (
          <p className="text-smoke-500 text-sm text-center py-10">Cargando...</p>
        ) : (
          <InsumosList
            venueId={venueId}
            categories={categories}
            allProducts={products}
            supplyProductIds={supplyProductIds}
            onRefresh={loadAll}
          />
        )}
      </main>
    </div>
  )
}

function InsumosList({ venueId, categories, allProducts, supplyProductIds = [], onRefresh }) {
  const insumos = [...(allProducts || [])]
    .filter(p => p.is_ingredient_only || supplyProductIds.includes(p.id))
    .sort((a, b) => a.name.localeCompare(b.name))
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newStock, setNewStock] = useState('')
  const [newAlert, setNewAlert] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editStock, setEditStock] = useState('')
  const [editAlert, setEditAlert] = useState('')

  useEffect(() => { if (categories.length && !newCategory) setNewCategory(categories[0]?.id || '') }, [categories])

  async function createInsumo() {
    if (!newName.trim()) return
    setSaving(true)
    await supabaseStaff.from('products').insert({
      venue_id: venueId,
      name: newName.trim(),
      price: 0,
      is_available: false,
      is_ingredient_only: true,
      stock_mode: 'unit',
      unit_stock: newStock !== '' ? parseInt(newStock, 10) : 0,
      min_stock_alert: newAlert !== '' ? parseInt(newAlert, 10) : null,
      category_id: newCategory || categories[0]?.id || null,
    })
    setNewName(''); setNewStock(''); setNewAlert('')
    setSaving(false)
    setShowForm(false)
    onRefresh?.()
  }

  async function adjustStock(id) {
    await supabaseStaff.from('products').update({
      unit_stock: parseInt(editStock, 10) || 0,
      min_stock_alert: editAlert !== '' ? parseInt(editAlert, 10) : null,
      is_available: (parseInt(editStock, 10) || 0) > 0,
    }).eq('id', id)
    setEditingId(null)
    onRefresh?.()
  }

  async function deleteInsumo(id) {
    if (!confirm('¿Eliminar este insumo?')) return
    await supabaseStaff.from('products').delete().eq('id', id)
    onRefresh?.()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-smoke-400 text-xs font-semibold uppercase tracking-wide">Insumos · {insumos.length}</p>
        <button onClick={() => setShowForm(v => !v)} className="text-xs bg-ember-500 text-white font-semibold px-3 py-1.5 rounded-lg">
          + Nuevo insumo
        </button>
      </div>

      {showForm && (
        <div className="bg-carbon-900 border border-carbon-700 rounded-xl p-3 mb-4 space-y-2">
          <input className="input" placeholder="Nombre (ej: Harina 000)" value={newName} onChange={e => setNewName(e.target.value)} />
          <select className="input" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-smoke-600 text-[10px] block mb-1">Stock inicial</label>
              <input className="input text-xs" type="number" min="0" placeholder="0" value={newStock} onChange={e => setNewStock(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="text-smoke-600 text-[10px] block mb-1">Alerta cuando queden</label>
              <input className="input text-xs" type="number" min="0" placeholder="Ej: 5" value={newAlert} onChange={e => setNewAlert(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 border border-carbon-700 text-smoke-400 py-2 rounded-xl text-xs">Cancelar</button>
            <button onClick={createInsumo} disabled={saving || !newName.trim()} className="flex-1 bg-ember-500 text-white font-semibold py-2 rounded-xl text-xs disabled:opacity-50">
              {saving ? 'Creando...' : 'Crear insumo'}
            </button>
          </div>
        </div>
      )}

      {insumos.length === 0 ? (
        <p className="text-smoke-600 text-xs italic mt-4">No hay insumos. Creá uno manualmente o guardá recetas desde la Carta para que aparezcan acá.</p>
      ) : (
        <div className="space-y-2">
          {insumos.map(p => (
            <div key={p.id} className="bg-carbon-900 border border-carbon-700 rounded-xl p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-smoke-200 text-sm font-medium truncate">{p.name}</p>
                <p className={`text-[10px] font-semibold ${
                  p.unit_stock == null ? 'text-smoke-600'
                  : p.unit_stock === 0 ? 'text-red-400'
                  : p.min_stock_alert != null && p.unit_stock <= p.min_stock_alert ? 'text-amber-500'
                  : 'text-smoke-500'
                }`}>
                  {p.unit_stock == null ? 'Sin control de stock' : p.unit_stock === 0 ? 'Sin stock' : `${p.unit_stock} u.`}
                  {p.min_stock_alert != null && ` · alerta ≤ ${p.min_stock_alert}`}
                </p>
              </div>
              {editingId === p.id ? (
                <div className="flex items-center gap-1.5">
                  <input autoFocus type="number" min="0" value={editStock} onChange={e => setEditStock(e.target.value)}
                    placeholder="Stock" className="w-16 bg-carbon-800 border border-carbon-600 text-smoke-200 text-xs px-2 py-1 rounded-lg" />
                  <input type="number" min="0" value={editAlert} onChange={e => setEditAlert(e.target.value)}
                    placeholder="Alerta" className="w-16 bg-carbon-800 border border-carbon-600 text-smoke-200 text-xs px-2 py-1 rounded-lg" />
                  <button onClick={() => adjustStock(p.id)} className="text-xs text-emerald-500 font-semibold">OK</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-smoke-500">✕</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingId(p.id); setEditStock(String(p.unit_stock ?? 0)); setEditAlert(p.min_stock_alert != null ? String(p.min_stock_alert) : '') }}
                    className="text-[10px] text-amber-500 border border-amber-500/40 px-2 py-1 rounded-lg font-semibold"
                  >
                    Ajustar
                  </button>
                  <button onClick={() => deleteInsumo(p.id)} className="text-[10px] text-smoke-500 underline">Borrar</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
