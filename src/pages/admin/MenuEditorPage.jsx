import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatPrice } from '../../lib/utils'
import { CameraIcon, StarIcon, DIETARY_TAGS } from '../../components/Icons'
import { geminiGenerate } from '../../lib/gemini'

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
  const [supplyProductIds, setSupplyProductIds] = useState([])
  const [extraCredits, setExtraCredits] = useState(0)
  const [photoPackPrice, setPhotoPackPrice] = useState(10000)
  const [loading, setLoading] = useState(true)
  const [showProductForm, setShowProductForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [activeTab, setActiveTab] = useState('carta') // 'carta' | 'insumos'

  async function loadAll() {
    const [catRes, prodRes, venueRes, settingsRes] = await Promise.all([
      supabaseStaff.from('categories').select('*').eq('venue_id', venueId).order('sort_order'),
      supabaseStaff.from('products').select('*').eq('venue_id', venueId).order('sort_order'),
      supabaseStaff.from('venues').select('extra_image_credits').eq('id', venueId).single(),
      supabaseStaff.from('capy_settings').select('photo_pack_price').eq('id', 1).single()
    ])
    const allProds = prodRes.data || []
    setCategories(catRes.data || [])
    setProducts(allProds)
    setExtraCredits(venueRes.data?.extra_image_credits || 0)
    if (settingsRes.data?.photo_pack_price) setPhotoPackPrice(settingsRes.data.photo_pack_price)

    const productIds = allProds.map(p => p.id)
    if (productIds.length > 0) {
      const { data: piData } = await supabaseStaff
        .from('product_ingredients')
        .select('supply_product_id')
        .in('product_id', productIds)
        .not('supply_product_id', 'is', null)
      setSupplyProductIds([...new Set((piData || []).map(r => r.supply_product_id))])
    } else {
      setSupplyProductIds([])
    }

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

  async function moveCategory(catId, direction) {
    const idx = categories.findIndex(c => c.id === catId)
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= categories.length) return
    const updated = [...categories]
    const orderA = updated[idx].sort_order ?? idx
    const orderB = updated[swapIdx].sort_order ?? swapIdx
    updated[idx] = { ...updated[idx], sort_order: orderB }
    updated[swapIdx] = { ...updated[swapIdx], sort_order: orderA }
    ;[updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]]
    setCategories(updated)
    await Promise.all([
      supabaseStaff.from('categories').update({ sort_order: orderB }).eq('id', catId),
      supabaseStaff.from('categories').update({ sort_order: orderA }).eq('id', updated[idx].id)
    ])
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
        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-carbon-900 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('carta')}
            className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-colors ${activeTab === 'carta' ? 'bg-ember-500 text-white' : 'text-smoke-400'}`}
          >
            Carta
          </button>
          <button
            onClick={() => setActiveTab('insumos')}
            className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-colors ${activeTab === 'insumos' ? 'bg-ember-500 text-white' : 'text-smoke-400'}`}
          >
            Insumos
          </button>
        </div>

        {activeTab === 'insumos' ? (
          <InsumosList venueId={venueId} categories={categories} allProducts={products} supplyProductIds={supplyProductIds} onRefresh={loadAll} />
        ) : (
          <>
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

            {/* ImportarConIA y FotosConIA — ocultos mientras Gemini API no está disponible */}

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

            {categories.map((cat, catIdx) => (
              <div key={cat.id} className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveCategory(cat.id, -1)}
                        disabled={catIdx === 0}
                        className="text-smoke-600 disabled:opacity-20 leading-none text-xs px-0.5"
                        title="Subir"
                      >▲</button>
                      <button
                        onClick={() => moveCategory(cat.id, 1)}
                        disabled={catIdx === categories.length - 1}
                        className="text-smoke-600 disabled:opacity-20 leading-none text-xs px-0.5"
                        title="Bajar"
                      >▼</button>
                    </div>
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
                  {products.filter(p => p.category_id === cat.id && !p.is_ingredient_only).length === 0 && (
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
                    .filter(p => p.category_id === cat.id && !p.is_ingredient_only)
                    .map(product => (
                      <ProductRow
                        key={product.id}
                        product={product}
                        venueId={venueId}
                        categories={categories}
                        allProducts={products}
                        onToggle={() => toggleAvailability(product)}
                        onDelete={() => deleteProduct(product.id)}
                        onSave={updated => setProducts(prev => prev.map(p => p.id === updated.id ? updated : p))}
                        onRefreshProducts={loadAll}
                      />
                    ))}
                </div>
              </div>
            ))}
          </>
        )}
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

function IngredientsPanel({ productId, productName, productDescription, currentImageUrl, onPhotoSaved, venueId, onClose, onRefreshProducts }) {
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
      .not('ingredient_name', 'is', null)
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
    setSuggesting(true)
    setFoundPhoto(null)
    try {
      const desc = productDescription ? ` — ${productDescription}` : ''
      const prompt = `Sos un chef. Para el plato "${productName}"${desc}, respondé con un JSON objeto (sin texto extra ni backticks) con dos campos: "photo_query" (término de búsqueda en inglés para Unsplash — si el nombre no es descriptivo usá la descripción o la categoría para inferir qué es el plato, siempre términos concretos del plato en inglés) e "ingredients" (array de hasta 8 ingredientes principales con cantidad por porción individual, usando solo estas unidades: g, kg, ml, l, unidad, taza, cdita, cda, porción). Ejemplo: {"photo_query":"beef milanesa breaded","ingredients":[{"name":"Carne","quantity":200,"unit":"g"},{"name":"Huevo","quantity":1,"unit":"unidad"}]}`
      const data = await geminiGenerate([{ parts: [{ text: prompt }] }])
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

    // Load existing is_ingredient_only products for this venue to find/create matches
    const { data: existingInsumos } = await supabaseStaff
      .from('products')
      .select('id, name')
      .eq('venue_id', venueId)
      .eq('is_ingredient_only', true)

    const insumoByName = Object.fromEntries(
      (existingInsumos || []).map(p => [p.name.toLowerCase(), p.id])
    )

    // Create missing ingredient products
    const namesToCreate = [...new Set(
      valid.map(r => r.ingredient_name.trim()).filter(n => !insumoByName[n.toLowerCase()])
    )]
    if (namesToCreate.length > 0) {
      const { data: newProds } = await supabaseStaff
        .from('products')
        .insert(namesToCreate.map(name => ({
          venue_id: venueId, name, price: 0, is_available: false,
          is_ingredient_only: true, stock_mode: 'unit', unit_stock: 0,
        })))
        .select('id, name')
      if (newProds) newProds.forEach(p => { insumoByName[p.name.toLowerCase()] = p.id })
    }

    // Replace all ingredient_name rows for this product
    await supabaseStaff.from('product_ingredients').delete().eq('product_id', productId).not('ingredient_name', 'is', null)
    if (valid.length > 0) {
      await supabaseStaff.from('product_ingredients').insert(
        valid.map(r => ({
          product_id: productId,
          ingredient_name: r.ingredient_name.trim(),
          supply_product_id: insumoByName[r.ingredient_name.trim().toLowerCase()] ?? null,
          quantity: Number(r.quantity),
          unit: r.unit,
        }))
      )
    }

    setIngredients(valid.map(r => ({ ...r, id: null })))
    setSaving(false)
    onRefreshProducts?.()
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
        {/* Sugerir con IA — oculto mientras Gemini API no está disponible */}
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

function ProductRow({ product, venueId, categories, allProducts = [], onToggle, onDelete, onSave, onRefreshProducts }) {
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
  const [stockMode, setStockMode] = useState(product.stock_mode || null)
  const [unitStock, setUnitStock] = useState(product.unit_stock != null ? String(product.unit_stock) : '')
  const [minStockAlert, setMinStockAlert] = useState(product.min_stock_alert != null ? String(product.min_stock_alert) : '')
  const [recipe, setRecipe] = useState(null)
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
      stock_mode: stockMode,
      unit_stock: stockMode === 'unit' && unitStock !== '' ? parseInt(unitStock, 10) : null,
      min_stock_alert: stockMode === 'unit' && minStockAlert !== '' ? parseInt(minStockAlert, 10) : null,
    }
    await supabaseStaff.from('products').update(updates).eq('id', product.id)

    if (stockMode === 'ingredient' && recipe !== null) {
      await supabaseStaff.from('product_ingredients').delete().eq('product_id', product.id).not('supply_product_id', 'is', null)
      const valid = recipe.filter(r => r.supply_product_id && Number(r.quantity) > 0)
      if (valid.length > 0) {
        await supabaseStaff.from('product_ingredients').insert(
          valid.map(r => ({ product_id: product.id, supply_product_id: r.supply_product_id, quantity: Number(r.quantity), unit: r.unit || 'u' }))
        )
      }
    }

    onSave({ ...product, ...updates })
    if (stockMode === 'ingredient') onRefreshProducts?.()
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
        {/* Control de stock */}
        <div className="border border-carbon-700 rounded-xl p-3 space-y-2">
          <p className="text-smoke-400 text-[10px] uppercase tracking-wide">Control de stock</p>
          <div className="flex gap-1">
            {[
              { value: null, label: 'Sin stock' },
              { value: 'unit', label: 'Por unidad' },
              { value: 'ingredient', label: 'Por receta' },
            ].map(({ value, label }) => (
              <button
                key={String(value)}
                type="button"
                onClick={() => { setStockMode(value); if (value !== 'unit') { setUnitStock(''); setMinStockAlert('') } }}
                className={`flex-1 text-[10px] py-1.5 rounded-lg font-semibold transition-colors ${stockMode === value ? 'bg-ember-500 text-white' : 'bg-carbon-800 text-smoke-400'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {stockMode === 'unit' && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-smoke-600 text-[10px] block mb-1">Stock actual</label>
                <input className="input text-xs" type="number" min="0" placeholder="Ej: 20" value={unitStock} onChange={e => setUnitStock(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="text-smoke-600 text-[10px] block mb-1">Alerta cuando queden</label>
                <div className="relative">
                  <input className="input text-xs pr-6" type="number" min="0" placeholder="Ej: 3" value={minStockAlert} onChange={e => setMinStockAlert(e.target.value)} />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-smoke-600 text-[10px]">u.</span>
                </div>
              </div>
            </div>
          )}
          {stockMode === 'ingredient' && (
            <RecipeEditor
              productId={product.id}
              productName={name}
              productDescription={description}
              venueId={venueId}
              allProducts={allProducts}
              recipe={recipe}
              onChange={setRecipe}
              onCreatedSupply={onRefreshProducts}
            />
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={() => { setEditing(false); setImageFile(null); setImagePreview(null); setDietaryTags(product.dietary_tags || []); setStockMode(product.stock_mode || null); setUnitStock(product.unit_stock != null ? String(product.unit_stock) : ''); setMinStockAlert(product.min_stock_alert != null ? String(product.min_stock_alert) : ''); setRecipe(null) }}
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
    if (getUnsplashCount(venueId) >= UNSPLASH_DAILY_LIMIT) return
    setPhotoSearching(true)
    setFoundPhoto(null)
    try {
      const desc = product.description ? ` — ${product.description}` : ''
      const prompt = `Para el plato "${product.name}"${desc}, generá un término de búsqueda en inglés para encontrar una foto gastronómica en Unsplash. Si el nombre no es descriptivo usá la descripción para inferir qué es el plato. Respondé ÚNICAMENTE con el término de búsqueda, sin texto extra. Ejemplo: "beef milanesa breaded"`
      const data = await geminiGenerate([{ parts: [{ text: prompt }] }])
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
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <p className="font-mono text-ember-400 text-xs">{formatPrice(product.price)}</p>
            {(product.dietary_tags || []).map(t => {
              const tag = DIETARY_TAGS.find(d => d.id === t)
              return tag ? <span key={t} className="text-smoke-400" title={tag.label}><tag.Icon size={13} /></span> : null
            })}
            {product.stock_mode === 'unit' && product.unit_stock != null && (
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                product.unit_stock === 0
                  ? 'bg-red-500/15 text-red-500'
                  : product.min_stock_alert != null && product.unit_stock <= product.min_stock_alert
                    ? 'bg-amber-500/15 text-amber-500'
                    : 'bg-carbon-700 text-smoke-500'
              }`}>
                {product.unit_stock === 0 ? 'Sin stock' : `${product.unit_stock} u.`}
              </span>
            )}
            {product.stock_mode === 'ingredient' && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400">Por receta</span>
            )}
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
          {/* Buscar foto con IA — oculto mientras Gemini API no está disponible */}
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
          onRefreshProducts={onRefreshProducts}
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
      .insert({ venue_id: venueId, category_id: categoryId, name, description, price: Number(price), dietary_tags: dietaryTags, is_available: true })
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
        const transcriptData = await geminiGenerate([{ parts: [
          { inline_data: { mime_type: file.type, data: base64 } },
          { text: 'Transcribí exactamente todo el texto que ves en esta imagen. Incluí nombres, precios y categorías tal como aparecen. No agregues nada extra.' }
        ]}])
        if (transcriptData.error) throw new Error(transcriptData.error.message)
        const transcriptText = transcriptData.candidates?.[0]?.content?.parts?.[0]?.text || ''
        if (!transcriptText) throw new Error('No se pudo leer texto de la imagen')

        const isRich = mode === 'rich'
        const parsePrompt = isRich
          ? `Este es el texto de un menú de restaurante:\n\n${transcriptText}\n\nConvertí esto a un JSON array de productos. Para cada producto incluí: name (nombre), price (precio como número sin símbolo), category (categoría en español), description (descripción del plato si aparece en el menú, sino cadena vacía ""), photo_query (término de búsqueda en inglés para encontrar una foto gastronómica del plato en Unsplash — reglas en orden de prioridad: 1) si hay descripción en el menú usala para describir el plato en inglés, 2) si el nombre no es descriptivo pero hay categoría, combiná categoría + nombre para inferir qué es (ej: categoría "Sandwiches" + nombre "El Porteño" → "argentinian beef sandwich"; categoría "Postres" + nombre "La Abuela" → "homemade cake dessert"), 3) si el nombre ya es descriptivo traducilo al inglés; siempre términos concretos del plato en inglés, nunca el nombre propio). Respondé ÚNICAMENTE con el JSON array, sin texto adicional, sin backticks. Ejemplo: [{"name":"El Porteño","price":2500,"category":"Sandwiches","description":"Sándwich de lomo con queso y jamón","photo_query":"steak sandwich cheese ham"}]`
          : `Este es el texto de un menú de restaurante:\n\n${transcriptText}\n\nConvertí esto a un JSON array de productos. Para cada producto incluí: name (nombre), price (precio como número sin símbolo), category (categoría en español). Respondé ÚNICAMENTE con el JSON array, sin texto adicional, sin backticks. Ejemplo: [{"name":"Milanesa","price":2500,"category":"Platos principales"}]`

        const parseData = await geminiGenerate([{ parts: [{ text: parsePrompt }] }])
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

const PHOTO_PACK_CREDITS = 25

function BuyMoreCreditsRow({ venueId, price = 10000 }) {
  const [loading, setLoading] = useState(false)

  async function buy() {
    setLoading(true)
    try {
      const { data, error } = await supabaseStaff.functions.invoke('create-upgrade-payment', {
        body: { venueId, featureKey: 'extra_photos', featureName: `Pack ${PHOTO_PACK_CREDITS} fotos IA`, price },
      })
      if (!error && data?.init_point) window.location.href = data.init_point
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border-t border-carbon-800 pt-3 flex items-center justify-between gap-3">
      <div>
        <p className="text-smoke-500 text-xs">+{PHOTO_PACK_CREDITS} créditos extra</p>
        <p className="text-smoke-600 text-[10px]">${price.toLocaleString('es-AR')} · no vencen</p>
      </div>
      <button
        onClick={buy}
        disabled={loading}
        className="flex-shrink-0 bg-[#009ee3] hover:bg-[#0081c8] disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5"
      >
        {loading ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
        )}
        Comprar más
      </button>
    </div>
  )
}

function BuyPhotoPackBanner({ venueId, noPhotoCount, dailyLimit, price = 10000 }) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function buyPack() {
    setLoading(true)
    setErr('')
    try {
      const { data, error } = await supabaseStaff.functions.invoke('create-upgrade-payment', {
        body: {
          venueId,
          featureKey: 'extra_photos',
          featureName: `Pack ${PHOTO_PACK_CREDITS} fotos IA`,
          price,
        },
      })
      if (error || !data?.init_point) {
        setErr('No se pudo iniciar el pago. Intentá de nuevo.')
        return
      }
      window.location.href = data.init_point
    } catch {
      setErr('No se pudo iniciar el pago. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full mb-4 bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-ember-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-smoke-300 font-semibold text-sm">Sin créditos de fotos</p>
          <p className="text-smoke-500 text-xs mt-1">
            Usaste las {dailyLimit} búsquedas de hoy. Tenés {noPhotoCount} producto{noPhotoCount !== 1 ? 's' : ''} sin foto.
          </p>
          <div className="mt-3 bg-carbon-800 border border-carbon-700 rounded-xl px-3 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-smoke-200 font-bold text-sm">{PHOTO_PACK_CREDITS} fotos IA</p>
              <p className="text-smoke-500 text-xs">Créditos adicionales, no vencen</p>
            </div>
            <p className="text-ember-400 font-bold text-base">${price.toLocaleString('es-AR')}</p>
          </div>
          {err && <p className="text-red-400 text-xs mt-2">{err}</p>}
          <button
            onClick={buyPack}
            disabled={loading}
            className="mt-3 w-full bg-[#009ee3] hover:bg-[#0081c8] disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
            )}
            {loading ? 'Iniciando pago...' : 'Pagar con Mercado Pago'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FotosConIA({ venueId, products, onUpdated, unlimited = false, extraCredits = 0, onExtraCreditsChanged, isSuperAdmin = false, photoPackPrice = 10000 }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('idle') // idle | generating | review | saving
  const [progress, setProgress] = useState({ current: 0, total: 0, name: '' })
  const [results, setResults] = useState([])
  const [error, setError] = useState('')
  const [batchSize, setBatchSize] = useState(15)

  const noPhoto = products.filter(p => !p.image_url)
  const dailyRemaining = unlimited ? Infinity : Math.max(UNSPLASH_DAILY_LIMIT - getUnsplashCount(venueId), 0)
  const totalAvailable = unlimited ? noPhoto.length : dailyRemaining + extraCredits
  const canProcess = Math.min(noPhoto.length, totalAvailable)
  const effectiveBatch = Math.min(batchSize, canProcess)
  const outOfCredits = !unlimited && totalAvailable === 0 && noPhoto.length > 0

  function reset() {
    setOpen(false)
    setStatus('idle')
    setResults([])
    setError('')
    setProgress({ current: 0, total: 0, name: '' })
  }

  async function generate() {
    if (totalAvailable <= 0) return

    // Evitar que la pantalla se apague y frene el proceso
    let wakeLock = null
    try {
      if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen')
    } catch { /* no soportado en este browser */ }

    const toProcess = noPhoto.slice(0, effectiveBatch)
    setStatus('generating')
    setProgress({ current: 0, total: toProcess.length, name: '' })
    setError('')

    const found = []
    let savedCount = 0
    let extraCreditsUsed = 0

    try {
      for (let i = 0; i < toProcess.length; i++) {
        const p = toProcess[i]
        setProgress({ current: i + 1, total: toProcess.length, name: p.name, saved: savedCount })
        const usingExtra = !unlimited && i >= dailyRemaining

        let query = p.name
        try {
          const desc = p.description ? ` — ${p.description}` : ''
          const prompt = `Para el plato "${p.name}"${desc}, generá un término de búsqueda en inglés para encontrar una foto gastronómica en Unsplash. Si el nombre no es descriptivo usá la descripción para inferir qué es. Respondé ÚNICAMENTE con el término, sin texto extra. Ejemplo: "beef milanesa breaded"`
          const data = await geminiGenerate([{ parts: [{ text: prompt }] }])
          query = (data.candidates?.[0]?.content?.parts?.[0]?.text || p.name).trim().replace(/^"|"$/g, '')
        } catch { /* use product name as fallback */ }

        const url = await searchUnsplash(query, venueId, { skipLimit: unlimited || usingExtra })
        if (url) {
          // Guardar inmediatamente — si el proceso se interrumpe, las fotos ya guardadas no se pierden
          await supabaseStaff.from('products').update({ image_url: url }).eq('id', p.id)
          found.push({ product: p, imageUrl: url, selected: true })
          savedCount++
          setProgress({ current: i + 1, total: toProcess.length, name: p.name, saved: savedCount })
          if (usingExtra) extraCreditsUsed++
        }
      }
    } finally {
      wakeLock?.release()
    }

    if (extraCreditsUsed > 0) {
      const newCredits = Math.max(0, extraCredits - extraCreditsUsed)
      await supabaseStaff.from('venues').update({ extra_image_credits: newCredits }).eq('id', venueId)
      onExtraCreditsChanged?.(newCredits)
    }

    if (found.length === 0) {
      setError('No se encontraron fotos. Intentá de nuevo.')
      setStatus('idle')
    } else {
      onUpdated()
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

  if (noPhoto.length === 0) {
    return (
      <div className="w-full mb-4 bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-smoke-300 text-xs font-semibold">Todos los productos tienen foto</p>
          {!unlimited && (
            <p className="text-smoke-600 text-[10px]">
              {dailyRemaining} búsquedas diarias disponibles{extraCredits > 0 ? ` · ${extraCredits} créditos extra` : ''}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Sin créditos: CTA para comprar pack
  if (outOfCredits) {
    return <BuyPhotoPackBanner venueId={venueId} noPhotoCount={noPhoto.length} dailyLimit={UNSPLASH_DAILY_LIMIT} price={photoPackPrice} />
  }

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
          <p className="text-smoke-500 text-xs">
            {noPhoto.length} productos sin foto
            {!unlimited && ` · ${dailyRemaining} diarias${extraCredits > 0 ? ` + ${extraCredits} extra` : ''}`}
          </p>
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
          <div>
            <p className="text-smoke-300 text-sm font-semibold">
              {progress.current === 0 ? 'Generando consultas...' : `Buscando foto ${progress.current}/${progress.total}`}
            </p>
            {progress.saved > 0 && (
              <p className="text-emerald-500 text-xs mt-0.5">{progress.saved} guardada{progress.saved !== 1 ? 's' : ''} ✓</p>
            )}
          </div>
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
            <p className={`text-2xl font-bold font-mono ${dailyRemaining < 5 ? 'text-amber-400' : 'text-smoke-200'}`}>{dailyRemaining}</p>
            <p className="text-smoke-600 text-[10px] mt-0.5">diarias hoy</p>
          </div>
        )}
        {!unlimited && extraCredits > 0 && (
          <div className="flex-1 bg-carbon-800 rounded-xl p-3">
            <p className="text-2xl font-bold font-mono text-emerald-400">{extraCredits}</p>
            <p className="text-smoke-600 text-[10px] mt-0.5">créditos extra</p>
          </div>
        )}
        <div className="flex-1 bg-ember-500/10 border border-ember-500/20 rounded-xl p-3">
          <p className="text-2xl font-bold text-ember-400 font-mono">{effectiveBatch}</p>
          <p className="text-smoke-600 text-[10px] mt-0.5">se procesarán</p>
        </div>
      </div>
      {canProcess > 0 && (
        <div>
          <label className="text-smoke-500 text-xs block mb-1">¿Cuántas procesar ahora?{isSuperAdmin && <span className="text-smoke-600"> (Unsplash: 50/hora)</span>}</label>
          <input
            type="number"
            min={1}
            max={canProcess}
            value={batchSize}
            onChange={e => setBatchSize(Math.max(1, Math.min(canProcess, Number(e.target.value))))}
            className="w-full bg-carbon-800 border border-carbon-700 rounded-lg px-3 py-2 text-smoke-200 text-sm focus:outline-none focus:border-ember-500"
          />
        </div>
      )}
      {!unlimited && canProcess < noPhoto.length && canProcess > 0 && (
        <p className="text-amber-400/80 text-xs">Cupo disponible: {canProcess}. El cupo diario se renueva mañana.</p>
      )}
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <div className="flex gap-2">
        <button onClick={reset} className="flex-1 border border-carbon-700 text-smoke-400 text-sm py-2.5 rounded-xl">Cancelar</button>
        <button
          onClick={generate}
          disabled={effectiveBatch === 0}
          className="flex-1 bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-xl"
        >
          Generar fotos
        </button>
      </div>
      {!unlimited && <BuyMoreCreditsRow venueId={venueId} price={photoPackPrice} />}
    </div>
  )
}

function ProductSearch({ value, allProducts, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const selected = allProducts.find(p => p.id === value)
  const sorted = [...allProducts].sort((a, b) => {
    if (a.is_ingredient_only && !b.is_ingredient_only) return -1
    if (!a.is_ingredient_only && b.is_ingredient_only) return 1
    return a.name.localeCompare(b.name)
  })
  const filtered = query.length > 0
    ? sorted.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
    : sorted

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQuery('') }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="w-full">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full text-left text-xs bg-carbon-800 border border-carbon-700 rounded-lg px-2 py-1.5 truncate"
      >
        {selected
          ? <span className="text-smoke-200">{selected.is_ingredient_only ? '★ ' : ''}{selected.name}</span>
          : <span className="text-smoke-500">— Buscar insumo —</span>}
      </button>
      {open && (
        <div className="mt-1 bg-carbon-800 border border-carbon-600 rounded-xl overflow-hidden">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar..."
            className="w-full text-xs border-b border-carbon-600 bg-carbon-800 px-3 py-2 text-smoke-200 outline-none"
          />
          <div className="max-h-36 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-smoke-500 text-xs px-3 py-2">Sin resultados</p>
            ) : (
              filtered.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={() => { onChange(p.id); setQuery(''); setOpen(false) }}
                  className="w-full text-left px-3 py-2 text-xs active:bg-carbon-700 flex items-center gap-2"
                >
                  {p.is_ingredient_only && <span className="text-amber-500 text-[9px] font-bold">INSUMO</span>}
                  <span className="text-smoke-200 truncate">{p.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function RecipeEditor({ productId, productName, productDescription, venueId, allProducts, recipe, onChange, onCreatedSupply }) {
  const [suggesting, setSuggesting] = useState(false)

  useEffect(() => {
    if (recipe !== null) return
    supabaseStaff
      .from('product_ingredients')
      .select('supply_product_id, quantity, unit')
      .eq('product_id', productId)
      .not('supply_product_id', 'is', null)
      .then(({ data }) => onChange(data || []))
  }, [productId])

  function addRow() {
    onChange(prev => [...(prev || []), { supply_product_id: '', quantity: '', unit: 'u' }])
  }

  function updateRow(i, field, val) {
    onChange(prev => (prev || []).map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  function removeRow(i) {
    onChange(prev => (prev || []).filter((_, idx) => idx !== i))
  }

  async function suggestWithAI() {
    setSuggesting(true)
    try {
      const desc = productDescription ? ` — ${productDescription}` : ''
      const prompt = `Sos un chef profesional. Para el plato "${productName}"${desc}, listá los ingredientes principales con cantidades para una porción. Respondé ÚNICAMENTE con un JSON array sin texto extra ni backticks. Ejemplo: [{"name":"Harina 000","quantity":200,"unit":"g"},{"name":"Huevo","quantity":1,"unit":"u"}]. Unidades permitidas: g, kg, ml, l, u, cdita, cda, taza, porción.`
      const data = await geminiGenerate([{ parts: [{ text: prompt }] }])
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
      const match = text.match(/\[[\s\S]*\]/)
      const suggested = JSON.parse(match ? match[0] : '[]')

      const newRows = []
      for (const s of suggested) {
        const found = allProducts.find(p =>
          p.name.toLowerCase() === s.name.toLowerCase()
        )
        if (found) {
          newRows.push({ supply_product_id: found.id, quantity: String(s.quantity), unit: s.unit || 'u' })
        } else {
          const { data: newProd } = await supabaseStaff
            .from('products')
            .insert({
              venue_id: venueId,
              name: s.name,
              price: 0,
              is_available: false,
              is_ingredient_only: true,
              stock_mode: 'unit',
              unit_stock: 0,
              category_id: allProducts.find(p => p.category_id)?.category_id || null,
            })
            .select()
            .single()
          if (newProd) {
            newRows.push({ supply_product_id: newProd.id, quantity: String(s.quantity), unit: s.unit || 'u' })
            onCreatedSupply?.()
          }
        }
      }
      onChange(newRows)
    } catch { /* silently fail */ }
    setSuggesting(false)
  }

  const rows = recipe || []

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-smoke-600 text-[10px]">Insumos por porción</p>
        <button type="button" onClick={suggestWithAI} disabled={suggesting} className="text-[10px] text-ember-500 underline disabled:opacity-50">
          {suggesting ? 'Consultando IA...' : 'Sugerir con IA'}
        </button>
      </div>
      {recipe === null && <p className="text-smoke-500 text-[10px]">Cargando receta...</p>}
      <div className="space-y-1.5">
        {rows.map((row, i) => (
          <div key={i} className="space-y-1 border border-carbon-700 rounded-lg p-2">
            <ProductSearch
              value={row.supply_product_id || ''}
              allProducts={allProducts.filter(p => p.id !== productId)}
              onChange={id => updateRow(i, 'supply_product_id', id)}
            />
            <div className="flex gap-1 items-center">
              <input
                type="number"
                value={row.quantity}
                onChange={e => updateRow(i, 'quantity', e.target.value)}
                placeholder="Cant."
                min="0"
                step="any"
                className="flex-1 text-xs bg-carbon-800 border border-carbon-700 rounded-lg px-2 py-1.5 text-ember-400 text-right font-mono outline-none"
              />
              <select
                value={row.unit || 'u'}
                onChange={e => updateRow(i, 'unit', e.target.value)}
                className="text-[10px] bg-carbon-800 border border-carbon-700 rounded-lg px-1 py-1.5 text-smoke-400 outline-none"
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <button type="button" onClick={() => removeRow(i)} className="text-smoke-500 hover:text-red-500 text-sm leading-none px-1.5">✕</button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={addRow} className="text-xs text-smoke-400 underline">+ Agregar insumo</button>
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
        <p className="text-smoke-600 text-xs italic mt-4">No hay insumos. Creá uno manualmente o la IA los crea automáticamente al sugerir recetas.</p>
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
