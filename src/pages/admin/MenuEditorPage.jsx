import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatPrice } from '../../lib/utils'
import { CameraIcon, StarIcon, DIETARY_TAGS } from '../../components/Icons'

const KIND_LABELS = { bebida: 'Bebida', comida: 'Comida', otro: 'Otro' }
const KIND_COLORS = {
  bebida: 'border-blue-500/40 text-blue-700',
  comida: 'border-emerald-500/40 text-emerald-700',
  otro: 'border-carbon-600 text-smoke-500'
}

export default function MenuEditorPage() {
  const { venueId, isSuperAdmin, isPropietario } = useAuth()
  const today = new Date().toISOString().slice(0, 10)
  const unlimitedPhotos = isSuperAdmin || (isPropietario && today === '2026-07-10')
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

        <ImportarConIA venueId={venueId} onImported={loadAll} unlimited={unlimitedPhotos} />
        <FotosConIA venueId={venueId} products={products} onUpdated={loadAll} unlimited={unlimitedPhotos} />

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
                <CategoryNameEditor
                  cat={cat}
                  onSave={newName => setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, name: newName } : c))}
                />
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
                    venueId={venueId}
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

function CategoryNameEditor({ cat, onSave }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(cat.name)
  const inputRef = useRef(null)

  async function save() {
    const trimmed = value.trim()
    if (!trimmed || trimmed === cat.name) { setValue(cat.name); setEditing(false); return }
    await supabaseStaff.from('categories').update({ name: trimmed }).eq('id', cat.id)
    onSave(trimmed)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setValue(cat.name); setEditing(false) } }}
        className="text-xs font-semibold uppercase tracking-wide bg-carbon-800 border border-ember-500/50 rounded px-2 py-0.5 text-smoke-200 w-32 focus:outline-none"
        autoFocus
      />
    )
  }

  return (
    <button
      onClick={() => { setValue(cat.name); setEditing(true) }}
      className="text-smoke-400 text-xs font-semibold uppercase tracking-wide hover:text-smoke-200 flex items-center gap-1 group"
      title="Editar nombre"
    >
      {cat.name}
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-60 transition-opacity">
        <path d="M11 2l3 3-9 9H2v-3z"/>
      </svg>
    </button>
  )
}

const UNITS = ['g', 'kg', 'ml', 'l', 'unidad', 'taza', 'cdita', 'cda', 'porción']

function IngredientsPanel({ productId, productName, productDescription, currentImageUrl, onPhotoSaved, venueId, onClose }) {
  const [ingredients, setIngredients] = useState(null) // null = loading
  const [saving, setSaving] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [foundPhoto, setFoundPhoto] = useState(null)
  const [savingPhoto, setSavingPhoto] = useState(false)

  useEffect(() => {
    supabaseStaff
      .from('product_ingredients')
      .select('id, ingredient_name, quantity, unit')
      .eq('product_id', productId)
      .then(({ data }) => setIngredients(data || []))
  }, [productId])

  function addRow() {
    setIngredients(prev => [...prev, { id: null, ingredient_name: '', quantity: '', unit: 'g' }])
  }

  function updateRow(i, field, val) {
    setIngredients(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  function removeRow(i) {
    setIngredients(prev => prev.filter((_, idx) => idx !== i))
  }

  async function suggestWithAI() {
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
    if (!API_KEY) return
    setSuggesting(true)
    setFoundPhoto(null)
    try {
      const desc = productDescription ? ` — ${productDescription}` : ''
      const prompt = `Sos un chef. Para el plato "${productName}"${desc}, respondé con un JSON objeto (sin texto extra ni backticks) con dos campos: "photo_query" (término de búsqueda en inglés para Unsplash — si el nombre no es descriptivo usá la descripción o la categoría para inferir qué es el plato, siempre términos concretos del plato en inglés) e "ingredients" (array de hasta 8 ingredientes principales con cantidad por porción individual, usando solo estas unidades: g, kg, ml, l, unidad, taza, cdita, cda, porción). Ejemplo: {"photo_query":"beef milanesa breaded","ingredients":[{"name":"Carne","quantity":200,"unit":"g"},{"name":"Huevo","quantity":1,"unit":"unidad"}]}`
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      )
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
      const match = text.match(/\{[\s\S]*\}/)
      const parsed = JSON.parse(match ? match[0] : '{}')

      if (parsed.ingredients?.length) {
        setIngredients(parsed.ingredients.map(i => ({ id: null, ingredient_name: i.name, quantity: String(i.quantity), unit: i.unit || 'g' })))
      }
      if (parsed.photo_query) {
        const url = await searchUnsplash(parsed.photo_query, venueId)
        if (url) setFoundPhoto(url)
      }
    } catch {
      // silently fail
    }
    setSuggesting(false)
  }

  async function handleSavePhoto() {
    if (!foundPhoto) return
    setSavingPhoto(true)
    await supabaseStaff.from('products').update({ image_url: foundPhoto }).eq('id', productId)
    onPhotoSaved?.(foundPhoto)
    setFoundPhoto(null)
    setSavingPhoto(false)
  }

  async function handleSave() {
    const valid = (ingredients || []).filter(r => r.ingredient_name.trim() && Number(r.quantity) > 0)
    setSaving(true)
    await supabaseStaff.from('product_ingredients').delete().eq('product_id', productId)
    if (valid.length > 0) {
      await supabaseStaff.from('product_ingredients').insert(
        valid.map(r => ({
          product_id: productId,
          ingredient_name: r.ingredient_name.trim(),
          quantity: Number(r.quantity),
          unit: r.unit,
        }))
      )
    }
    setIngredients(valid.map(r => ({ ...r, id: null })))
    setSaving(false)
    onClose?.()
  }

  if (ingredients === null) {
    return (
      <div className="px-3 pb-3">
        <p className="text-smoke-500 text-xs">Cargando ingredientes...</p>
      </div>
    )
  }

  return (
    <div className="px-3 pb-3 pt-1 border-t border-carbon-800 mt-1 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-smoke-500 text-[10px] uppercase tracking-wide font-medium">Ingredientes por porción</p>
        <button
          onClick={suggestWithAI}
          disabled={suggesting}
          className="text-[10px] text-ember-500 underline disabled:opacity-50"
        >
          {suggesting ? 'Consultando IA...' : 'Sugerir con IA'}
        </button>
      </div>

      {foundPhoto && (
        <div className="flex items-center gap-2 bg-carbon-800 border border-carbon-700 rounded-xl p-2">
          <img src={foundPhoto} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-smoke-300 text-xs font-medium">Foto encontrada</p>
            {currentImageUrl && <p className="text-smoke-600 text-[10px]">Reemplaza la foto actual</p>}
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={handleSavePhoto}
              disabled={savingPhoto}
              className="text-[10px] bg-ember-500 text-white font-semibold px-2.5 py-1 rounded-lg disabled:opacity-50"
            >
              {savingPhoto ? 'Guardando...' : 'Usar foto'}
            </button>
            <button
              onClick={() => setFoundPhoto(null)}
              className="text-[10px] text-smoke-500 underline text-center"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {ingredients.length === 0 && !suggesting && (
        <p className="text-smoke-600 text-xs italic">Sin ingredientes. Agregá uno o usá la IA.</p>
      )}

      <div className="space-y-1.5">
        {ingredients.map((row, i) => (
          <div key={i} className="flex gap-1 items-center">
            <input
              value={row.ingredient_name}
              onChange={e => updateRow(i, 'ingredient_name', e.target.value)}
              placeholder="Ingrediente"
              className="flex-1 min-w-0 text-xs bg-carbon-800 border border-carbon-700 rounded-lg px-2 py-1.5 text-smoke-200 outline-none focus:border-ember-500/50"
            />
            <input
              type="number"
              value={row.quantity}
              onChange={e => updateRow(i, 'quantity', e.target.value)}
              placeholder="Cant."
              min="0"
              className="w-16 text-xs bg-carbon-800 border border-carbon-700 rounded-lg px-2 py-1.5 text-ember-400 text-right font-mono outline-none focus:border-ember-500/50"
            />
            <select
              value={row.unit}
              onChange={e => updateRow(i, 'unit', e.target.value)}
              className="text-[10px] bg-carbon-800 border border-carbon-700 rounded-lg px-1 py-1.5 text-smoke-400 outline-none"
            >
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <button onClick={() => removeRow(i)} className="text-smoke-600 hover:text-red-500 text-sm leading-none px-1">×</button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={addRow}
          className="text-xs text-smoke-400 underline"
        >
          + Agregar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="ml-auto text-xs bg-ember-500 text-white font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

function ProductRow({ product, venueId, categories, onToggle, onDelete, onSave }) {
  const [editing, setEditing] = useState(false)
  const [showIngredients, setShowIngredients] = useState(false)
  const [photoSearching, setPhotoSearching] = useState(false)
  const [foundPhoto, setFoundPhoto] = useState(null)
  const [savingPhoto, setSavingPhoto] = useState(false)
  const [name, setName] = useState(product.name)
  const [price, setPrice] = useState(String(product.price))
  const [description, setDescription] = useState(product.description || '')
  const [categoryId, setCategoryId] = useState(product.category_id)
  const [dietaryTags, setDietaryTags] = useState(product.dietary_tags || [])
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const imgInputRef = useRef(null)

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    setSaving(true)
    let imageUrl = product.image_url || null

    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `${venueId}/products/${product.id}.${ext}`
      const { error: upErr } = await supabaseStaff.storage
        .from('venue-assets')
        .upload(path, imageFile, { upsert: true })
      if (!upErr) {
        const { data: urlData } = supabaseStaff.storage.from('venue-assets').getPublicUrl(path)
        imageUrl = `${urlData.publicUrl}?t=${Date.now()}`
      }
    }

    const updates = {
      name: name.trim(),
      price: Number(price),
      description: description.trim() || null,
      category_id: categoryId,
      image_url: imageUrl,
      dietary_tags: dietaryTags,
    }
    await supabaseStaff.from('products').update(updates).eq('id', product.id)
    onSave({ ...product, ...updates })
    setSaving(false)
    setEditing(false)
    setImageFile(null)
    setImagePreview(null)
  }

  async function toggleFeatured() {
    const next = !product.is_featured
    await supabaseStaff.from('products').update({ is_featured: next }).eq('id', product.id)
    onSave({ ...product, is_featured: next })
  }

  async function toggleDailySpecial() {
    const next = !product.is_daily_special
    await supabaseStaff.from('products').update({ is_daily_special: next }).eq('id', product.id)
    onSave({ ...product, is_daily_special: next })
  }

  if (editing) {
    const displayImg = imagePreview || product.image_url
    return (
      <div className="bg-carbon-900 border border-ember-500/40 rounded-xl p-3 space-y-2" onClick={() => setShowIngredients(false)}>
        {/* Image upload */}
        <div
          onClick={() => imgInputRef.current?.click()}
          className="w-full h-28 rounded-xl border border-dashed border-carbon-600 overflow-hidden cursor-pointer flex items-center justify-center bg-carbon-800"
        >
          {displayImg ? (
            <img src={displayImg} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-smoke-500 text-xs flex items-center gap-1.5"><CameraIcon size={14} /> Agregar foto</span>
          )}
        </div>
        <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre" />
        <input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción (opcional)" />
        <input className="input" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Precio" />
        <select className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div>
          <p className="text-smoke-500 text-[10px] uppercase tracking-wide mb-1.5">Apto para</p>
          <div className="flex flex-wrap gap-2">
            {DIETARY_TAGS.map(tag => {
              const active = dietaryTags.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setDietaryTags(prev => active ? prev.filter(t => t !== tag.id) : [...prev, tag.id])}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    active ? 'bg-emerald-500/15 border-emerald-600/60 text-emerald-700' : 'border-carbon-600 text-smoke-300'
                  }`}
                >
                  <tag.Icon size={12} /> {tag.label}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditing(false); setImageFile(null); setImagePreview(null); setDietaryTags(product.dietary_tags || []) }}
            className="flex-1 border border-carbon-700 text-smoke-400 py-2 rounded-xl text-xs">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-ember-500 text-white font-semibold py-2 rounded-xl text-xs">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    )
  }

  async function searchPhoto() {
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
    if (!API_KEY) return
    if (getUnsplashCount(venueId) >= UNSPLASH_DAILY_LIMIT) return
    setPhotoSearching(true)
    setFoundPhoto(null)
    try {
      const desc = product.description ? ` — ${product.description}` : ''
      const prompt = `Para el plato "${product.name}"${desc}, generá un término de búsqueda en inglés para encontrar una foto gastronómica en Unsplash. Si el nombre no es descriptivo usá la descripción para inferir qué es el plato. Respondé ÚNICAMENTE con el término de búsqueda, sin texto extra. Ejemplo: "beef milanesa breaded"`
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
      )
      const data = await res.json()
      const query = (data.candidates?.[0]?.content?.parts?.[0]?.text || product.name).trim().replace(/^"|"$/g, '')
      const url = await searchUnsplash(query, venueId)
      if (url) setFoundPhoto(url)
    } catch { /* silently fail */ }
    setPhotoSearching(false)
  }

  async function saveFoundPhoto() {
    if (!foundPhoto) return
    setSavingPhoto(true)
    await supabaseStaff.from('products').update({ image_url: foundPhoto }).eq('id', product.id)
    onSave({ ...product, image_url: foundPhoto })
    setFoundPhoto(null)
    setSavingPhoto(false)
  }

  return (
    <div className="bg-carbon-900 border border-carbon-700 rounded-xl overflow-hidden">
      <div className="p-3 flex items-center gap-3">
        {/* Thumbnail */}
        <div
          onClick={() => { setEditing(true); setShowIngredients(false) }}
          className="w-12 h-12 rounded-lg bg-carbon-800 flex-shrink-0 overflow-hidden cursor-pointer flex items-center justify-center"
        >
          {product.image_url ? (
            <img src={product.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <CameraIcon size={20} className="text-smoke-600" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-smoke-300 text-sm font-medium truncate">{product.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="font-mono text-ember-400 text-xs">{formatPrice(product.price)}</p>
            {(product.dietary_tags || []).map(t => {
              const tag = DIETARY_TAGS.find(d => d.id === t)
              return tag ? <span key={t} className="text-smoke-400" title={tag.label}><tag.Icon size={13} /></span> : null
            })}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Daily special toggle */}
          <button
            onClick={toggleDailySpecial}
            title={product.is_daily_special ? 'Quitar plato del día' : 'Marcar como plato del día'}
            className={`text-base leading-none transition-opacity ${product.is_daily_special ? 'opacity-100' : 'opacity-25 hover:opacity-60'}`}
          >
            ☀️
          </button>
          {/* Featured toggle */}
          <button
            onClick={toggleFeatured}
            title={product.is_featured ? 'Quitar destacado' : 'Marcar como destacado'}
            className={`leading-none transition-opacity ${product.is_featured ? 'text-amber-400 opacity-100' : 'text-smoke-500 opacity-25 hover:opacity-60'}`}
          >
            <StarIcon size={18} />
          </button>
          <button
            onClick={onToggle}
            className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${
              product.is_available ? 'border-emerald-500/40 text-emerald-700' : 'border-red-500/40 text-red-700'
            }`}
          >
            {product.is_available ? 'Disp.' : 'Agot.'}
          </button>
          <button
            onClick={searchPhoto}
            disabled={photoSearching}
            title="Buscar foto con IA"
            className="text-[10px] font-semibold text-smoke-500 hover:text-ember-500 disabled:opacity-40 transition-colors flex items-center gap-0.5"
          >
            {photoSearching ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            )}
            IA
          </button>
          <button
            onClick={() => { setShowIngredients(v => !v); setEditing(false) }}
            className={`text-xs underline ${showIngredients ? 'text-ember-500' : 'text-smoke-500'}`}
          >
            Ingredientes
          </button>
          <button onClick={() => { setEditing(true); setShowIngredients(false) }} className="text-smoke-400 text-xs underline">Editar</button>
          <button onClick={onDelete} className="text-smoke-500 text-xs underline">Borrar</button>
        </div>
      </div>

      {foundPhoto && (
        <div className="flex items-center gap-3 px-3 pb-3 border-t border-carbon-800 pt-2.5">
          <img src={foundPhoto} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-smoke-300 text-xs font-medium">Foto sugerida</p>
            {product.image_url && <p className="text-smoke-600 text-[10px]">Reemplaza la foto actual</p>}
          </div>
          <div className="flex flex-col gap-1 flex-shrink-0">
            <button
              onClick={saveFoundPhoto}
              disabled={savingPhoto}
              className="text-[10px] bg-ember-500 text-white font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              {savingPhoto ? 'Guardando...' : 'Usar foto'}
            </button>
            <button onClick={() => setFoundPhoto(null)} className="text-[10px] text-smoke-500 underline text-center">
              Descartar
            </button>
          </div>
        </div>
      )}

      {showIngredients && (
        <IngredientsPanel
          productId={product.id}
          productName={product.name}
          productDescription={product.description}
          currentImageUrl={product.image_url}
          onPhotoSaved={url => onSave({ ...product, image_url: url })}
          venueId={venueId}
          onClose={() => setShowIngredients(false)}
        />
      )}
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
  const [dietaryTags, setDietaryTags] = useState([])
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const imgInputRef = useRef(null)

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const { data: newProduct } = await supabaseStaff
      .from('products')
      .insert({ venue_id: venueId, category_id: categoryId, name, description, price: Number(price), dietary_tags: dietaryTags })
      .select('id')
      .single()

    if (newProduct && imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `${venueId}/products/${newProduct.id}.${ext}`
      const { error: upErr } = await supabaseStaff.storage
        .from('venue-assets')
        .upload(path, imageFile, { upsert: true })
      if (!upErr) {
        const { data: urlData } = supabaseStaff.storage.from('venue-assets').getPublicUrl(path)
        await supabaseStaff.from('products').update({ image_url: `${urlData.publicUrl}?t=${Date.now()}` }).eq('id', newProduct.id)
      }
    }

    setSaving(false)
    onCreated()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 mb-6 space-y-3">
      <p className="text-smoke-300 text-sm font-medium">Nuevo producto</p>

      {/* Image upload */}
      <div
        onClick={() => imgInputRef.current?.click()}
        className="w-full h-28 rounded-xl border border-dashed border-carbon-600 overflow-hidden cursor-pointer flex items-center justify-center bg-carbon-800"
      >
        {imagePreview ? (
          <img src={imagePreview} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-smoke-500 text-xs flex items-center gap-1.5"><CameraIcon size={14} /> Foto del producto (opcional)</span>
        )}
      </div>
      <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

      <input className="input" placeholder="Nombre del producto" required value={name} onChange={e => setName(e.target.value)} />
      <input className="input" placeholder="Descripción (opcional)" value={description} onChange={e => setDescription(e.target.value)} />
      <input className="input" placeholder="Precio" type="number" required min="0" value={price} onChange={e => setPrice(e.target.value)} />
      <select className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
        {categories.map(c => (
          <option key={c.id} value={c.id}>{c.name} ({KIND_LABELS[c.kind] || 'Otro'})</option>
        ))}
      </select>
      <div>
        <p className="text-smoke-500 text-[10px] uppercase tracking-wide mb-1.5">Apto para</p>
        <div className="flex flex-wrap gap-2">
          {DIETARY_TAGS.map(tag => {
            const active = dietaryTags.includes(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => setDietaryTags(prev => active ? prev.filter(t => t !== tag.id) : [...prev, tag.id])}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  active ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300' : 'border-carbon-600 text-smoke-500'
                }`}
              >
                {tag.emoji} {tag.label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 border border-carbon-700 text-smoke-400 py-2.5 rounded-xl text-sm">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="flex-1 bg-ember-500 hover:bg-ember-600 text-white font-semibold py-2.5 rounded-xl text-sm">
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

const UNSPLASH_DAILY_LIMIT = 15

function getUnsplashCount(venueId) {
  const today = new Date().toISOString().slice(0, 10)
  return parseInt(localStorage.getItem(`capy_unsplash_${venueId}_${today}`) || '0', 10)
}

function incrementUnsplashCount(venueId) {
  const today = new Date().toISOString().slice(0, 10)
  localStorage.setItem(`capy_unsplash_${venueId}_${today}`, String(getUnsplashCount(venueId) + 1))
}

async function searchUnsplash(query, venueId, { skipLimit = false } = {}) {
  const key = import.meta.env.VITE_UNSPLASH_ACCESS_KEY
  if (!key) return null
  if (!skipLimit && venueId && getUnsplashCount(venueId) >= UNSPLASH_DAILY_LIMIT) return null
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape&client_id=${key}`
    )
    const data = await res.json()
    const url = data.results?.[0]?.urls?.small || null
    if (url && venueId && !skipLimit) incrementUnsplashCount(venueId)
    return url
  } catch {
    return null
  }
}


function ImportarConIA({ venueId, onImported, unlimited = false }) {
  const [step, setStep] = useState('idle') // idle | pick_mode | analyzing | enriching | review | saving
  const [mode, setMode] = useState('basic') // 'basic' | 'rich'
  const [preview, setPreview] = useState(null)
  const [detected, setDetected] = useState([])
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  function pickMode(selectedMode) {
    if (!unlimited && selectedMode === 'rich' && getUnsplashCount(venueId) >= UNSPLASH_DAILY_LIMIT) {
      setError(`Límite diario de imágenes alcanzado (${UNSPLASH_DAILY_LIMIT}/día). Mañana se renueva.`)
      return
    }
    setMode(selectedMode)
    setStep('analyzing')
    setTimeout(() => fileRef.current?.click(), 50)
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) { setStep('idle'); return }
    // reset so same file can be re-selected
    e.target.value = ''
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

        const isRich = mode === 'rich'
        const parsePrompt = isRich
          ? `Este es el texto de un menú de restaurante:\n\n${transcriptText}\n\nConvertí esto a un JSON array de productos. Para cada producto incluí: name (nombre), price (precio como número sin símbolo), category (categoría en español), description (descripción del plato si aparece en el menú, sino cadena vacía ""), photo_query (término de búsqueda en inglés para encontrar una foto gastronómica del plato en Unsplash — reglas en orden de prioridad: 1) si hay descripción en el menú usala para describir el plato en inglés, 2) si el nombre no es descriptivo pero hay categoría, combiná categoría + nombre para inferir qué es (ej: categoría "Sandwiches" + nombre "El Porteño" → "argentinian beef sandwich"; categoría "Postres" + nombre "La Abuela" → "homemade cake dessert"), 3) si el nombre ya es descriptivo traducilo al inglés; siempre términos concretos del plato en inglés, nunca el nombre propio). Respondé ÚNICAMENTE con el JSON array, sin texto adicional, sin backticks. Ejemplo: [{"name":"El Porteño","price":2500,"category":"Sandwiches","description":"Sándwich de lomo con queso y jamón","photo_query":"steak sandwich cheese ham"}]`
          : `Este es el texto de un menú de restaurante:\n\n${transcriptText}\n\nConvertí esto a un JSON array de productos. Para cada producto incluí: name (nombre), price (precio como número sin símbolo), category (categoría en español). Respondé ÚNICAMENTE con el JSON array, sin texto adicional, sin backticks. Ejemplo: [{"name":"Milanesa","price":2500,"category":"Platos principales"}]`

        const parseRes = await fetch(BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: parsePrompt }] }] })
        })
        const parseData = await parseRes.json()
        const parseText = parseData.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
        const jsonMatch = parseText.match(/\[[\s\S]*\]/)
        const items = JSON.parse(jsonMatch ? jsonMatch[0] : '[]')

        if (isRich) {
          setStep('enriching')
          const enriched = await Promise.all(
            items.map(async item => ({
              ...item,
              description: item.description || '',
              image_url: await searchUnsplash(item.photo_query || item.name, venueId, { skipLimit: unlimited }),
              selected: true,
            }))
          )
          setDetected(enriched)
        } else {
          setDetected(items.map(i => ({ ...i, selected: true })))
        }
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
        description: i.description?.trim() || null,
        image_url: i.image_url || null,
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
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {detected.map((item, i) => (
              <div key={i} className={`rounded-xl border p-2 ${item.selected ? 'border-ember-500/30 bg-ember-500/5' : 'border-carbon-700 opacity-50'}`}>
                <div className="flex items-start gap-2">
                  <input type="checkbox" checked={item.selected} onChange={() => toggleItem(i)} className="flex-shrink-0 mt-1" />
                  {item.image_url && (
                    <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  )}
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
                    {item.description !== undefined && (
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => updateItem(i, 'description', e.target.value)}
                        placeholder="Descripción (opcional)"
                        className="w-full text-[10px] text-smoke-400 bg-transparent border-none outline-none mt-0.5 italic"
                      />
                    )}
                  </div>
                  <input
                    type="number"
                    value={item.price}
                    onChange={e => updateItem(i, 'price', e.target.value)}
                    className="w-20 text-xs text-ember-400 font-semibold bg-transparent border border-carbon-600 rounded-lg px-2 py-1 text-right flex-shrink-0"
                  />
                </div>
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

  const busy = step === 'analyzing' || step === 'enriching'

  return (
    <div className="mb-4 space-y-2">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {busy ? (
        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-ember-500/10 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          </div>
          <div>
            <p className="font-semibold text-smoke-300 text-sm">
              {step === 'enriching' ? 'Buscando fotos...' : 'Analizando imagen...'}
            </p>
            <p className="text-smoke-500 text-xs">
              {step === 'enriching' ? 'Obteniendo imágenes para cada producto' : 'Gemini está leyendo tu menú'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <button
            onClick={() => pickMode('basic')}
            className="w-full bg-carbon-900 border border-carbon-700 hover:border-ember-500/40 rounded-2xl p-4 flex items-center gap-3 text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-ember-500/10 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-smoke-300 text-sm">Importar productos</p>
              <p className="text-smoke-500 text-xs">Nombre, precio y categoría</p>
            </div>
          </button>

          <button
            onClick={() => pickMode('rich')}
            className="w-full bg-carbon-900 border border-ember-500/30 hover:border-ember-500/60 rounded-2xl p-4 flex items-center gap-3 text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-ember-500/20 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-smoke-300 text-sm">Importar con fotos y descripciones</p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-ember-500/20 text-ember-400 leading-none flex-shrink-0">PRO</span>
              </div>
              <p className="text-smoke-500 text-xs">Suma descripción e imagen desde Unsplash</p>
            </div>
          </button>
        </>
      )}

      {error && <p className="text-red-500 text-xs text-center">{error}</p>}
    </div>
  )
}

function FotosConIA({ venueId, products, onUpdated, unlimited = false }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('idle') // idle | generating | review | saving
  const [progress, setProgress] = useState({ current: 0, total: 0, name: '' })
  const [results, setResults] = useState([])
  const [error, setError] = useState('')

  const noPhoto = products.filter(p => !p.image_url)
  const remaining = unlimited ? noPhoto.length : UNSPLASH_DAILY_LIMIT - getUnsplashCount(venueId)
  const canProcess = Math.min(noPhoto.length, Math.max(remaining, 0))

  function reset() {
    setOpen(false)
    setStatus('idle')
    setResults([])
    setError('')
    setProgress({ current: 0, total: 0, name: '' })
  }

  async function generate() {
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
    if (!API_KEY) { setError('VITE_GEMINI_API_KEY no configurada'); return }
    if (remaining <= 0) { setError(`Límite diario alcanzado (${UNSPLASH_DAILY_LIMIT}/día). Volvé mañana.`); return }

    const toProcess = noPhoto.slice(0, remaining)
    setStatus('generating')
    setProgress({ current: 0, total: toProcess.length, name: '' })
    setError('')

    const batchPrompt = `Para los siguientes platos de restaurante, generá términos de búsqueda en inglés para fotos gastronómicas en Unsplash.
Reglas: si hay descripción usala para describir el plato en inglés; si el nombre no es descriptivo inferí por contexto; siempre términos concretos del plato en inglés, nunca nombre propio.
Respondé ÚNICAMENTE con un JSON array (sin texto extra ni backticks) donde cada objeto tiene "idx" (número entero 0-based) y "query" (string).

Platos:
${toProcess.map((p, i) => `${i}. "${p.name}"${p.description ? ' — ' + p.description : ''}`).join('\n')}

Ejemplo: [{"idx":0,"query":"beef milanesa breaded"},{"idx":1,"query":"espresso coffee cup"}]`

    const queryMap = {}
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: batchPrompt }] }] }) }
      )
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
      const match = text.match(/\[[\s\S]*\]/)
      const parsed = JSON.parse(match ? match[0] : '[]')
      for (const q of parsed) queryMap[q.idx] = q.query
    } catch { /* fall back to product names */ }

    const found = []
    for (let i = 0; i < toProcess.length; i++) {
      setProgress({ current: i + 1, total: toProcess.length, name: toProcess[i].name })
      const query = queryMap[i] || toProcess[i].name
      const url = await searchUnsplash(query, venueId, { skipLimit: unlimited })
      if (url) found.push({ product: toProcess[i], imageUrl: url, selected: true })
    }

    if (found.length === 0) {
      setError('No se encontraron fotos. Intentá de nuevo.')
      setStatus('idle')
    } else {
      setResults(found)
      setStatus('review')
    }
  }

  async function saveAll() {
    setStatus('saving')
    const toSave = results.filter(r => r.selected)
    await Promise.all(toSave.map(r =>
      supabaseStaff.from('products').update({ image_url: r.imageUrl }).eq('id', r.product.id)
    ))
    onUpdated()
    reset()
  }

  if (noPhoto.length === 0) return null

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full mb-4 bg-carbon-900 border border-dashed border-carbon-600 hover:border-ember-500/40 hover:bg-ember-500/5 rounded-2xl px-4 py-3 flex items-center gap-3 text-left transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-ember-500/10 flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <div>
          <p className="font-semibold text-smoke-300 text-sm">Generar fotos con IA</p>
          <p className="text-smoke-500 text-xs">{noPhoto.length} productos sin foto{!unlimited ? ` · ${Math.max(remaining, 0)} búsquedas disponibles hoy` : ''}</p>
        </div>
      </button>
    )
  }

  if (status === 'generating') {
    return (
      <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin flex-shrink-0">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <p className="text-smoke-300 text-sm font-semibold">
            {progress.current === 0 ? 'Generando consultas...' : `Buscando foto ${progress.current}/${progress.total}`}
          </p>
        </div>
        {progress.current > 0 && (
          <>
            <div className="w-full bg-carbon-800 rounded-full h-1.5 mb-2">
              <div
                className="bg-ember-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-smoke-600 text-xs truncate">{progress.name}</p>
          </>
        )}
      </div>
    )
  }

  if (status === 'review') {
    const selected = results.filter(r => r.selected)
    return (
      <div className="bg-carbon-900 border border-carbon-700 rounded-2xl overflow-hidden mb-4">
        <div className="p-4 border-b border-carbon-800">
          <p className="font-semibold text-smoke-300 text-sm">{results.length} fotos encontradas</p>
          <p className="text-smoke-500 text-xs">Tocá para seleccionar o deseleccionar</p>
        </div>
        <div className="max-h-80 overflow-y-auto p-3 space-y-2">
          {results.map((r, i) => (
            <div
              key={r.product.id}
              onClick={() => setResults(prev => prev.map((x, idx) => idx === i ? { ...x, selected: !x.selected } : x))}
              className={`flex items-center gap-3 p-2 rounded-xl border cursor-pointer transition-colors ${
                r.selected ? 'border-ember-500/40 bg-ember-500/5' : 'border-carbon-700 opacity-40'
              }`}
            >
              <img src={r.imageUrl} alt={r.product.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
              <p className="flex-1 min-w-0 text-smoke-300 text-xs font-medium truncate">{r.product.name}</p>
              <div className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${
                r.selected ? 'bg-ember-500 border-ember-500' : 'border-carbon-600'
              }`}>
                {r.selected && (
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2 6 5 9 10 3"/>
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-carbon-800 flex gap-2">
          <button onClick={reset} className="flex-1 border border-carbon-700 text-smoke-400 text-sm py-2.5 rounded-xl">
            Cancelar
          </button>
          <button
            onClick={saveAll}
            disabled={selected.length === 0}
            className="flex-1 bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-xl"
          >
            Guardar {selected.length} foto{selected.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    )
  }

  if (status === 'saving') {
    return (
      <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 mb-4 text-center">
        <p className="text-ember-500 text-sm font-semibold">Guardando fotos...</p>
      </div>
    )
  }

  // idle + open: confirmation panel
  return (
    <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5 mb-4 space-y-4">
      <div>
        <p className="font-semibold text-smoke-300 text-sm mb-1">Generar fotos con IA</p>
        <p className="text-smoke-500 text-xs">Busca fotos en Unsplash para los productos sin imagen, usando IA para encontrar la foto correcta.</p>
      </div>
      <div className="flex gap-3 text-center">
        <div className="flex-1 bg-carbon-800 rounded-xl p-3">
          <p className="text-2xl font-bold text-smoke-200 font-mono">{noPhoto.length}</p>
          <p className="text-smoke-600 text-[10px] mt-0.5">sin foto</p>
        </div>
        {!unlimited && (
          <div className="flex-1 bg-carbon-800 rounded-xl p-3">
            <p className={`text-2xl font-bold font-mono ${remaining < 5 ? 'text-amber-400' : 'text-smoke-200'}`}>{Math.max(remaining, 0)}</p>
            <p className="text-smoke-600 text-[10px] mt-0.5">disponibles hoy</p>
          </div>
        )}
        <div className="flex-1 bg-ember-500/10 border border-ember-500/20 rounded-xl p-3">
          <p className="text-2xl font-bold text-ember-400 font-mono">{canProcess}</p>
          <p className="text-smoke-600 text-[10px] mt-0.5">se procesarán</p>
        </div>
      </div>
      {!unlimited && remaining < noPhoto.length && remaining > 0 && (
        <p className="text-amber-400/80 text-xs">Solo se procesarán {remaining} productos hoy. El cupo se renueva mañana.</p>
      )}
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <div className="flex gap-2">
        <button onClick={reset} className="flex-1 border border-carbon-700 text-smoke-400 text-sm py-2.5 rounded-xl">Cancelar</button>
        <button
          onClick={generate}
          disabled={canProcess === 0}
          className="flex-1 bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-xl"
        >
          Generar fotos
        </button>
      </div>
    </div>
  )
}
