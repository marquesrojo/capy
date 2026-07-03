import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatPrice } from '../../lib/utils'

const KIND_LABELS = { bebida: 'Bebida', comida: 'Comida', otro: 'Otro' }
const KIND_COLORS = {
  bebida: 'border-blue-500/40 text-blue-700',
  comida: 'border-emerald-500/40 text-emerald-700',
  otro: 'border-carbon-600 text-smoke-500'
}

export default function MenuEditorPage() {
  const { venueId } = useAuth()
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showProductForm, setShowProductForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)

  async function loadAll() {
    const [catRes, prodRes] = await Promise.all([
      supabaseStaff.from('categories').select('*').eq('venue_id', venueId).order('sort_order'),
      supabaseStaff.from('products').select('*').eq('venue_id', venueId).order('sort_order')
    ])
    setCategories(catRes.data || [])
    setProducts(prodRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!venueId) return
    loadAll()
  }, [venueId])

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

        <ImportarConIA venueId={venueId} onImported={loadAll} />

        {showCategoryForm && (
          <NewCategoryForm
            venueId={venueId}
            onClose={() => setShowCategoryForm(false)}
            onCreated={() => { setShowCategoryForm(false); loadAll() }}
          />
        )}

        {showProductForm && (
          <NewProductForm
            venueId={venueId}
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

function NewCategoryForm({ venueId, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState('comida')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!name.trim()) return
    setSaving(true)
    await supabaseStaff.from('categories').insert({
      venue_id: venueId,
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

function NewProductForm({ venueId, categories, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    await supabaseStaff.from('products').insert({
      venue_id: venueId,
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

function ImportarConIA({ venueId, onImported }) {
  const [step, setStep] = useState('idle') // idle | analyzing | review | saving
  const [preview, setPreview] = useState(null)
  const [detected, setDetected] = useState([])
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setStep('analyzing')
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(',')[1]
      setPreview(ev.target.result)
      try {
        const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
        if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY no configurada')
        const BASE_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`

        const transcriptRes = await fetch(BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [
              { inline_data: { mime_type: file.type, data: base64 } },
              { text: 'Transcribí exactamente todo el texto que ves en esta imagen. Incluí nombres, precios y categorías tal como aparecen. No agregues nada extra.' }
            ]}]
          })
        })
        const transcriptData = await transcriptRes.json()
        if (transcriptData.error) throw new Error(transcriptData.error.message)
        const transcriptText = transcriptData.candidates?.[0]?.content?.parts?.[0]?.text || ''
        if (!transcriptText) throw new Error('No se pudo leer texto de la imagen')

        const parseRes = await fetch(BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{
              text: `Este es el texto de un menú de restaurante:\n\n${transcriptText}\n\nConvertí esto a un JSON array de productos. Para cada producto incluí: name (nombre), price (precio como número sin símbolo), category (categoría en español). Respondé ÚNICAMENTE con el JSON array, sin texto adicional, sin backticks. Ejemplo: [{"name":"Milanesa","price":2500,"category":"Platos principales"}]`
            }]}]
          })
        })
        const parseData = await parseRes.json()
        const parseText = parseData.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
        const jsonMatch = parseText.match(/\[[\s\S]*\]/)
        const items = JSON.parse(jsonMatch ? jsonMatch[0] : '[]')
        setDetected(items.map(i => ({ ...i, selected: true })))
        setStep('review')
      } catch (err) {
        const msg = err.message || ''
        const isOverloaded = /high demand|overload|capacity|try again later/i.test(msg)
        setError(isOverloaded
          ? 'La IA tiene mucha demanda en este momento. Esperá unos minutos e intentá de nuevo.'
          : 'No se pudo analizar la imagen. Intentá de nuevo.')
        setStep('idle')
      }
    }
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!venueId) return
    setStep('saving')
    const toImport = detected.filter(i => i.selected && i.name.trim())
    const catNames = [...new Set(toImport.map(i => i.category || 'General'))]
    const catMap = {}
    for (const catName of catNames) {
      const { data: existing } = await supabaseStaff
        .from('categories').select('id').eq('venue_id', venueId).eq('name', catName).maybeSingle()
      if (existing) {
        catMap[catName] = existing.id
      } else {
        const { data: newCat } = await supabaseStaff
          .from('categories').insert({ venue_id: venueId, name: catName, sort_order: 0 }).select('id').single()
        catMap[catName] = newCat?.id
      }
    }
    await supabaseStaff.from('products').insert(
      toImport.map(i => ({
        venue_id: venueId,
        name: i.name.trim(),
        price: parseFloat(i.price) || 0,
        category_id: catMap[i.category || 'General'],
        is_available: true
      }))
    )
    onImported()
    setStep('idle')
    setDetected([])
    setPreview(null)
  }

  function toggleItem(i) {
    setDetected(prev => prev.map((item, idx) => idx === i ? { ...item, selected: !item.selected } : item))
  }

  function updateItem(i, field, value) {
    setDetected(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  if (step === 'saving') {
    return (
      <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 mb-4 text-center">
        <p className="text-ember-500 text-sm font-semibold">Guardando productos...</p>
      </div>
    )
  }

  if (step === 'review') {
    return (
      <div className="bg-carbon-900 border border-carbon-700 rounded-2xl overflow-hidden mb-4">
        {preview && <img src={preview} alt="Menú" className="w-full h-28 object-cover opacity-50" />}
        <div className="p-4">
          <p className="font-semibold text-smoke-300 text-sm mb-1">
            {detected.filter(i => i.selected).length} productos detectados
          </p>
          <p className="text-smoke-500 text-xs mb-3">Revisá y editá antes de importar</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {detected.map((item, i) => (
              <div key={i} className={`flex items-center gap-2 p-2 rounded-xl border ${item.selected ? 'border-ember-500/30 bg-ember-500/5' : 'border-carbon-700 opacity-50'}`}>
                <input type="checkbox" checked={item.selected} onChange={() => toggleItem(i)} className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={item.name}
                    onChange={e => updateItem(i, 'name', e.target.value)}
                    className="w-full text-xs font-semibold text-smoke-300 bg-transparent border-none outline-none"
                  />
                  <input
                    type="text"
                    value={item.category}
                    onChange={e => updateItem(i, 'category', e.target.value)}
                    className="w-full text-[10px] text-smoke-500 bg-transparent border-none outline-none"
                  />
                </div>
                <input
                  type="number"
                  value={item.price}
                  onChange={e => updateItem(i, 'price', e.target.value)}
                  className="w-20 text-xs text-ember-400 font-semibold bg-transparent border border-carbon-600 rounded-lg px-2 py-1 text-right"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => { setStep('idle'); setDetected([]); setPreview(null) }}
              className="flex-1 border border-carbon-700 text-smoke-400 text-sm py-2.5 rounded-xl"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!detected.some(i => i.selected)}
              className="flex-1 bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-xl"
            >
              Importar {detected.filter(i => i.selected).length} productos
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={step === 'analyzing'}
        className="w-full bg-carbon-900 border border-carbon-700 hover:border-ember-500/40 rounded-2xl p-4 flex items-center gap-3"
      >
        {step === 'analyzing' ? (
          <>
            <div className="w-9 h-9 rounded-xl bg-ember-500/10 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            </div>
            <div className="text-left">
              <p className="font-semibold text-smoke-300 text-sm">Analizando imagen...</p>
              <p className="text-smoke-500 text-xs">Gemini está leyendo tu menú</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-9 h-9 rounded-xl bg-ember-500/10 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 0 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <div className="text-left">
              <p className="font-semibold text-smoke-300 text-sm">Importar carta con IA</p>
              <p className="text-smoke-500 text-xs">Sacá una foto de tu menú y Gemini lo carga automático</p>
            </div>
          </>
        )}
      </button>
      {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
    </div>
  )
}
