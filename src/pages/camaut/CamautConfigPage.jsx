import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseCamaut, supabaseStaff, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatPrice } from '../../lib/utils'

export default function CamautConfigPage({ initialTab, embedded }) {
  const { profile, signOut } = useAuth()
  const [tab, setTab] = useState(initialTab || 'perfil')

  if (embedded) {
    return (
      <div>
        {tab === 'perfil' && <PerfilTab profile={profile} />}
        {tab === 'carta' && <CartaTab profile={profile} />}
        {tab === 'ubicaciones' && <UbicacionesTab profile={profile} />}
        {tab === 'whatsapp' && <WhatsappTab profile={profile} />}
      </div>
    )
  }

  return (
    <div className="bg-[#F0F4F8] min-h-screen">
      <div className="bg-white border-b border-black/8 px-5 pt-4 pb-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-bold text-[#1A2A3A] text-lg">Configuración</h1>
          <button onClick={signOut} className="text-[#8896A5] text-xs underline">Salir</button>
        </div>
        <div className="flex gap-4 border-b border-transparent">
          {['perfil', 'carta', 'ubicaciones', 'whatsapp'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-2.5 text-xs font-semibold capitalize border-b-2 ${
                tab === t ? 'border-[#008080] text-[#008080]' : 'border-transparent text-[#8896A5]'
              }`}
            >
              {t === 'whatsapp' ? 'WhatsApp' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-5">
        {tab === 'perfil' && <PerfilTab profile={profile} />}
        {tab === 'carta' && <CartaTab profile={profile} />}
        {tab === 'ubicaciones' && <UbicacionesTab profile={profile} />}
        {tab === 'whatsapp' && <WhatsappTab profile={profile} />}
      </div>
    </div>
  )
}

function PerfilTab({ profile }) {
  const [staffData, setStaffData] = useState(null)
  const [fullName, setFullName] = useState('')
  const [alias, setAlias] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [docNumber, setDocNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadStaff()
  }, [profile])

  async function loadStaff() {
    if (!profile) return
    const { data: profileData } = await supabaseStaff
      .from('profiles')
      .select('venue_id')
      .eq('id', profile.id)
      .single()
    if (!profileData?.venue_id) return
    const { data } = await supabaseStaff
      .from('staff_names')
      .select('*')
      .eq('venue_id', profileData.venue_id)
      .single()
    if (data) {
      setStaffData(data)
      setFullName(data.full_name || '')
      setAlias(data.alias || '')
      setLinkedin(data.linkedin_url || '')
      setDocNumber(data.document_number || '')
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!staffData) return
    setSaving(true)
    await supabaseStaff
      .from('staff_names')
      .update({
        full_name: fullName.trim(),
        alias: alias.trim() || null,
        linkedin_url: linkedin.trim() || null,
        document_number: docNumber.trim() || null
      })
      .eq('id', staffData.id)

    // Sincronizar nombre en profiles también
    await supabaseStaff
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('id', profile.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-sm space-y-4">
        <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide">Datos personales</p>
        <label className="block">
          <span className="text-[#8896A5] text-xs block mb-1.5">Nombre completo</span>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
            className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm bg-[#F8FAFC] text-[#1A2A3A]" />
        </label>
        <label className="block">
          <span className="text-[#8896A5] text-xs block mb-1.5">Alias público (ranking)</span>
          <input type="text" value={alias} onChange={e => setAlias(e.target.value)}
            placeholder="Ej: mozo_veloz"
            className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm bg-[#F8FAFC] text-[#1A2A3A]" />
        </label>
        <label className="block">
          <span className="text-[#8896A5] text-xs block mb-1.5">DNI / Documento</span>
          <input type="text" value={docNumber} onChange={e => setDocNumber(e.target.value)}
            placeholder="Para tu certificado verificado"
            className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm bg-[#F8FAFC] text-[#1A2A3A]" />
        </label>
        <label className="block">
          <span className="text-[#8896A5] text-xs block mb-1.5">LinkedIn (opcional)</span>
          <input type="url" value={linkedin} onChange={e => setLinkedin(e.target.value)}
            placeholder="https://linkedin.com/in/tu-perfil"
            className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm bg-[#F8FAFC] text-[#1A2A3A]" />
        </label>
      </div>

      {saved && <p className="text-emerald-600 text-xs text-center">¡Guardado!</p>}
      <button type="submit" disabled={saving}
        className="w-full bg-[#008080] disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl">
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </form>
  )
}

function CartaTab({ profile }) {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [venueId, setVenueId] = useState(null)
  const [newCatName, setNewCatName] = useState('')
  const [newProd, setNewProd] = useState({ name: '', price: '', category_id: '' })
  const [addingCat, setAddingCat] = useState(false)
  const [addingProd, setAddingProd] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCarta()
  }, [profile])

  async function loadCarta() {
    if (!profile) return
    const { data: profileData } = await supabaseCamaut
      .from('profiles')
      .select('venue_id')
      .eq('id', profile.id)
      .single()

    if (!profileData?.venue_id) return
    setVenueId(profileData.venue_id)

    const [catRes, prodRes] = await Promise.all([
      supabaseCamaut.from('categories').select('*').eq('venue_id', profileData.venue_id).order('sort_order'),
      supabaseCamaut.from('products').select('*').eq('venue_id', profileData.venue_id).order('name')
    ])
    setCategories(catRes.data || [])
    setProducts(prodRes.data || [])
    setLoading(false)
  }

  async function addCategory() {
    if (!newCatName.trim() || !venueId) return
    setAddingCat(true)
    const { data } = await supabaseCamaut
      .from('categories')
      .insert({ venue_id: venueId, name: newCatName.trim(), kind: 'comida', sort_order: categories.length })
      .select().single()
    if (data) setCategories(prev => [...prev, data])
    setNewCatName('')
    setAddingCat(false)
  }

  async function deleteCategory(id) {
    await supabaseCamaut.from('categories').delete().eq('id', id)
    setCategories(prev => prev.filter(c => c.id !== id))
    setProducts(prev => prev.filter(p => p.category_id !== id))
  }

  async function addProduct() {
    if (!newProd.name.trim() || !newProd.price || !newProd.category_id || !venueId) return
    setAddingProd(true)
    const { data } = await supabaseCamaut
      .from('products')
      .insert({
        venue_id: venueId,
        name: newProd.name.trim(),
        price: Number(newProd.price),
        category_id: newProd.category_id,
        is_available: true
      })
      .select().single()
    if (data) setProducts(prev => [...prev, data])
    setNewProd({ name: '', price: '', category_id: newProd.category_id })
    setAddingProd(false)
  }

  async function toggleProduct(product) {
    await supabaseCamaut.from('products').update({ is_available: !product.is_available }).eq('id', product.id)
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_available: !p.is_available } : p))
  }

  async function deleteProduct(id) {
    await supabaseCamaut.from('products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  if (loading) return <p className="text-[#8896A5] text-sm text-center py-10">Cargando carta...</p>

  return (
    <div className="space-y-4">
      {/* Agregar categoría */}
      <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm">
        <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-3">Nueva categoría</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            placeholder="Ej: Entradas, Bebidas..."
            className="flex-1 border border-black/10 rounded-xl px-3 py-2.5 text-sm bg-[#F8FAFC] text-[#1A2A3A]"
          />
          <button onClick={addCategory} disabled={addingCat || !newCatName.trim()}
            className="bg-[#4DD0E1] disabled:opacity-50 text-white font-semibold px-4 rounded-xl text-sm">
            + Agregar
          </button>
        </div>
      </div>

      {/* Agregar producto */}
      {categories.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm">
          <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-3">Nuevo producto</p>
          <div className="space-y-2">
            <select
              value={newProd.category_id}
              onChange={e => setNewProd(p => ({ ...p, category_id: e.target.value }))}
              className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm bg-[#F8FAFC] text-[#1A2A3A]"
            >
              <option value="">Categoría...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input
              type="text"
              value={newProd.name}
              onChange={e => setNewProd(p => ({ ...p, name: e.target.value }))}
              placeholder="Nombre del producto"
              className="w-full border border-black/10 rounded-xl px-3 py-2.5 text-sm bg-[#F8FAFC] text-[#1A2A3A]"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={newProd.price}
                onChange={e => setNewProd(p => ({ ...p, price: e.target.value }))}
                placeholder="Precio"
                className="flex-1 border border-black/10 rounded-xl px-3 py-2.5 text-sm bg-[#F8FAFC] text-[#1A2A3A]"
              />
              <button onClick={addProduct} disabled={addingProd || !newProd.name || !newProd.price || !newProd.category_id}
                className="bg-[#4DD0E1] disabled:opacity-50 text-white font-semibold px-4 rounded-xl text-sm">
                + Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de productos por categoría */}
      {categories.map(cat => {
        const catProducts = products.filter(p => p.category_id === cat.id)
        return (
          <div key={cat.id} className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-black/5 bg-[#F8FAFC] flex items-center justify-between">
              <p className="font-semibold text-[#1A2A3A] text-sm">{cat.name}</p>
              <button
                onClick={() => deleteCategory(cat.id)}
                className="text-red-400 text-xs underline"
              >
                Borrar
              </button>
            </div>
            {catProducts.length === 0 ? (
              <p className="text-[#B0BEC5] text-xs px-4 py-3">Sin productos todavía</p>
            ) : (
              <div className="divide-y divide-black/5">
                {catProducts.map(product => (
                  <div key={product.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${product.is_available ? 'text-[#1A2A3A]' : 'text-[#B0BEC5] line-through'}`}>
                        {product.name}
                      </p>
                      <p className="text-xs text-[#008080]">{formatPrice(product.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleProduct(product)}
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                          product.is_available
                            ? 'border-emerald-400 text-emerald-600 bg-emerald-50'
                            : 'border-black/10 text-[#8896A5]'
                        }`}>
                        {product.is_available ? 'Activo' : 'Inactivo'}
                      </button>
                      <button onClick={() => deleteProduct(product.id)}
                        className="text-red-400 text-xs underline">
                        Borrar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {categories.length === 0 && (
        <p className="text-[#8896A5] text-sm text-center py-8">Agregá una categoría para empezar</p>
      )}
    </div>
  )
}

function WhatsappTab({ profile }) {
  const [venueId, setVenueId] = useState(null)
  const [whatsapp, setWhatsapp] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadVenue()
  }, [profile])

  async function loadVenue() {
    if (!profile) return
    const { data: profileData } = await supabaseCamaut
      .from('profiles').select('venue_id').eq('id', profile.id).single()
    if (!profileData?.venue_id) return
    setVenueId(profileData.venue_id)
    const { data } = await supabaseCamaut
      .from('venues').select('whatsapp_number').eq('id', profileData.venue_id).single()
    if (data) setWhatsapp(data.whatsapp_number || '')
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!venueId) return
    setSaving(true)
    await supabaseCamaut.from('venues').update({ whatsapp_number: whatsapp.trim() }).eq('id', venueId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-sm">
        <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-1">WhatsApp de cocina</p>
        <p className="text-[#B0BEC5] text-xs mb-4">Las comandas se envían a este número</p>
        <input
          type="tel"
          value={whatsapp}
          onChange={e => setWhatsapp(e.target.value)}
          placeholder="+54 9 11 1234 5678"
          className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm bg-[#F8FAFC] text-[#1A2A3A]"
        />
      </div>
      {saved && <p className="text-emerald-600 text-xs text-center">¡Guardado!</p>}
      <button type="submit" disabled={saving}
        className="w-full bg-[#008080] disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl">
        {saving ? 'Guardando...' : 'Guardar'}
      </button>
    </form>
  )
}

function UbicacionesTab({ profile }) {
  const [venueId, setVenueId] = useState(null)
  const [zones, setZones] = useState([])
  const [newZone, setNewZone] = useState('')
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadZones()
  }, [profile])

  async function loadZones() {
    if (!profile) return
    const { data: profileData } = await supabaseCamaut
      .from('profiles').select('venue_id').eq('id', profile.id).single()
    if (!profileData?.venue_id) return
    setVenueId(profileData.venue_id)
    const { data } = await supabaseCamaut
      .from('venue_zones')
      .select('*')
      .eq('venue_id', profileData.venue_id)
      .eq('is_active', true)
      .order('sort_order')
    setZones(data || [])
    setLoading(false)
  }

  async function addZone() {
    if (!newZone.trim() || !venueId) return
    setAdding(true)
    const { data } = await supabaseCamaut
      .from('venue_zones')
      .insert({
        venue_id: venueId,
        name: newZone.trim(),
        type: 'mesa',
        is_active: true,
        sort_order: zones.length
      })
      .select().single()
    if (data) setZones(prev => [...prev, data])
    setNewZone('')
    setAdding(false)
  }

  async function deleteZone(id) {
    await supabaseCamaut.from('venue_zones').update({ is_active: false }).eq('id', id)
    setZones(prev => prev.filter(z => z.id !== id))
  }

  if (loading) return <p className="text-[#8896A5] text-sm text-center py-10">Cargando...</p>

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm">
        <p className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide mb-3">Nueva ubicación</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newZone}
            onChange={e => setNewZone(e.target.value)}
            placeholder="Ej: Mesa 1, Barra, Terraza..."
            className="flex-1 border border-black/10 rounded-xl px-3 py-2.5 text-sm bg-[#F8FAFC] text-[#1A2A3A]"
          />
          <button onClick={addZone} disabled={adding || !newZone.trim()}
            className="bg-[#4DD0E1] disabled:opacity-50 text-white font-semibold px-4 rounded-xl text-sm">
            + Agregar
          </button>
        </div>
      </div>

      {zones.length === 0 ? (
        <p className="text-[#8896A5] text-sm text-center py-6">No hay ubicaciones todavía</p>
      ) : (
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
          <div className="divide-y divide-black/5">
            {zones.map(zone => (
              <div key={zone.id} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm font-medium text-[#1A2A3A]">{zone.name}</p>
                <button onClick={() => deleteZone(zone.id)} className="text-red-400 text-xs underline">
                  Borrar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
