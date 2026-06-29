import { useEffect, useRef, useState } from 'react'
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
        {tab === 'notas' && <NotasTab profile={profile} />}
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
        <div className="flex gap-4 border-b border-transparent overflow-x-auto">
          {['perfil', 'carta', 'ubicaciones', 'whatsapp', 'notas'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-2.5 text-xs font-semibold capitalize border-b-2 whitespace-nowrap ${
                tab === t ? 'border-[#008080] text-[#008080]' : 'border-transparent text-[#8896A5]'
              }`}
            >
              {t === 'whatsapp' ? 'WhatsApp' : t === 'notas' ? 'Notas rápidas' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-5">
        {tab === 'perfil' && <PerfilTab profile={profile} />}
        {tab === 'carta' && <CartaTab profile={profile} />}
        {tab === 'ubicaciones' && <UbicacionesTab profile={profile} />}
        {tab === 'whatsapp' && <WhatsappTab profile={profile} />}
        {tab === 'notas' && <NotasTab profile={profile} />}
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
  const [aliasBancario, setAliasBancario] = useState('')
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
      setAliasBancario(data.alias_bancario || '')
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
        document_number: docNumber.trim() || null,
        alias_bancario: aliasBancario.trim() || null
      })
      .eq('id', staffData.id)

    // Sincronizar nombre en profiles usando auth.uid()
    const { data: { user } } = await supabaseStaff.auth.getUser()
    if (user) {
      await supabaseStaff
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', user.id)
    }
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
        <label className="block">
          <span className="text-[#8896A5] text-xs block mb-1.5">Alias bancario (para propinas)</span>
          <input type="text" value={aliasBancario} onChange={e => setAliasBancario(e.target.value)}
            placeholder="Ej: matias.borges.mp"
            className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm bg-[#F8FAFC] text-[#1A2A3A]" />
          <p className="text-[#B0BEC5] text-[10px] mt-1">Aparece en el QR del pedido para que el cliente te deje propina</p>
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
  const [subTab, setSubTab] = useState('carta')
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
      {/* Tabs internos */}
      <div className="flex gap-2 bg-black/5 rounded-xl p-1">
        <button
          onClick={() => setSubTab('carta')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold ${
            subTab === 'carta' ? 'bg-white text-[#008080] shadow-sm' : 'text-[#8896A5]'
          }`}
        >
          Carta
        </button>
        <button
          onClick={() => setSubTab('ubicaciones')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold ${
            subTab === 'ubicaciones' ? 'bg-white text-[#008080] shadow-sm' : 'text-[#8896A5]'
          }`}
        >
          Ubicaciones
        </button>
      </div>

      {subTab === 'ubicaciones' && <UbicacionesTab profile={profile} />}

      {subTab === 'carta' && <>

      {/* Importar con IA */}
      <ImportarConIA venueId={venueId} onImported={loadCarta} />

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
                  <ProductRow
                    key={product.id}
                    product={product}
                    categories={categories}
                    onToggle={() => toggleProduct(product)}
                    onDelete={() => deleteProduct(product.id)}
                    onUpdate={(updated) => setProducts(prev => prev.map(p => p.id === product.id ? { ...p, ...updated } : p))}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {categories.length === 0 && (
        <p className="text-[#8896A5] text-sm text-center py-8">Agregá una categoría para empezar</p>
      )}
      </>}
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

function NotasTab({ profile }) {
  const [notas, setNotas] = useState([])
  const [newLabel, setNewLabel] = useState('')
  const [venueId, setVenueId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile?.venue_id) {
      setVenueId(profile.venue_id)
      loadNotas(profile.venue_id)
    }
  }, [profile])

  async function loadNotas(vId) {
    const { data: ownData } = await supabaseStaff
      .from('quick_notes')
      .select('id, label, is_active, sort_order')
      .eq('venue_id', vId)
      .order('sort_order')
    setNotas(ownData || [])
    setLoading(false)
  }

  async function addNota(e) {
    e.preventDefault()
    if (!newLabel.trim() || !venueId) return
    setSaving(true)
    // Sincronizar sesión
    const { data: { session } } = await supabaseCamaut.auth.getSession()
    if (session) await supabaseStaff.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token })
    const { data } = await supabaseStaff
      .from('quick_notes')
      .insert({ venue_id: venueId, label: newLabel.trim(), is_active: true, sort_order: notas.length })
      .select()
      .single()
    if (data) setNotas(prev => [...prev, data])
    setNewLabel('')
    setSaving(false)
  }

  async function toggleNota(id, isActive) {
    await supabaseStaff.from('quick_notes').update({ is_active: !isActive }).eq('id', id)
    setNotas(prev => prev.map(n => n.id === id ? { ...n, is_active: !isActive } : n))
  }

  async function deleteNota(id) {
    await supabaseStaff.from('quick_notes').delete().eq('id', id)
    setNotas(prev => prev.filter(n => n.id !== id))
  }

  if (loading) return <p className="text-[#8896A5] text-sm text-center py-6">Cargando...</p>

  return (
    <div className="space-y-4">
      <p className="text-[#8896A5] text-xs">
        Chips de aclaración que aparecen al confirmar un pedido. Ej: Sin sal, Bien cocido, Sin TACC.
      </p>

      {/* Lista */}
      <div className="bg-white rounded-2xl overflow-hidden border border-black/5">
        {notas.length === 0 ? (
          <p className="text-[#8896A5] text-sm text-center py-6">No hay notas rápidas todavía.</p>
        ) : (
          <div className="divide-y divide-black/5">
            {notas.map(n => (
              <div key={n.id} className="flex items-center justify-between px-4 py-3">
                <p className={`text-sm font-medium ${n.is_active ? 'text-[#1A2A3A]' : 'text-[#B0BEC5] line-through'}`}>
                  {n.label}
                </p>
                <div className="flex gap-3">
                  <button onClick={() => toggleNota(n.id, n.is_active)} className={`text-xs underline ${n.is_active ? 'text-[#8896A5]' : 'text-emerald-500'}`}>
                    {n.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button onClick={() => deleteNota(n.id)} className="text-red-400 text-xs underline">
                    Borrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agregar nueva */}
      <form onSubmit={addNota} className="flex gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          placeholder="Ej: Sin sal"
          className="flex-1 border border-black/10 rounded-xl px-4 py-3 text-sm bg-white text-[#1A2A3A]"
          maxLength={40}
        />
        <button
          type="submit"
          disabled={saving || !newLabel.trim()}
          className="bg-[#008080] disabled:opacity-50 text-white font-semibold px-4 py-3 rounded-xl text-sm"
        >
          {saving ? '...' : 'Agregar'}
        </button>
      </form>
    </div>
  )
}

function ProductRow({ product, categories, onToggle, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(product.name)
  const [price, setPrice] = useState(String(product.price))
  const [categoryId, setCategoryId] = useState(product.category_id)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await supabaseStaff
      .from('products')
      .update({ name: name.trim(), price: parseFloat(price), category_id: categoryId })
      .eq('id', product.id)
    onUpdate({ name: name.trim(), price: parseFloat(price), category_id: categoryId })
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="px-4 py-3 space-y-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm text-[#1A2A3A]"
          placeholder="Nombre"
        />
        <div className="flex gap-2">
          <input
            type="number"
            value={price}
            onChange={e => setPrice(e.target.value)}
            className="w-28 border border-black/10 rounded-lg px-3 py-2 text-sm text-[#1A2A3A]"
            placeholder="Precio"
          />
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            className="flex-1 border border-black/10 rounded-lg px-3 py-2 text-sm text-[#1A2A3A] bg-white"
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-[#008080] disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button onClick={() => setEditing(false)}
            className="flex-1 border border-black/10 text-[#8896A5] text-xs py-2 rounded-lg">
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex-1">
        <p className={`text-sm font-medium ${product.is_available ? 'text-[#1A2A3A]' : 'text-[#B0BEC5] line-through'}`}>
          {product.name}
        </p>
        <p className="text-xs text-[#008080]">{formatPrice(product.price)}</p>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => setEditing(true)} className="text-ember-500 text-xs underline">
          Editar
        </button>
        <button onClick={onToggle}
          className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
            product.is_available
              ? 'border-emerald-400 text-emerald-600 bg-emerald-50'
              : 'border-black/10 text-[#8896A5]'
          }`}>
          {product.is_available ? 'Activo' : 'Inactivo'}
        </button>
        <button onClick={onDelete} className="text-red-400 text-xs underline">
          Borrar
        </button>
      </div>
    </div>
  )
}

function ImportarConIA({ venueId, onImported }) {
  const [step, setStep] = useState('idle') // idle | analyzing | review | saving
  const [preview, setPreview] = useState(null)
  const [detected, setDetected] = useState([]) // [{ name, price, category, selected }]
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
        if (!API_KEY) throw new Error('API key no configurada')
        
        const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`

        // PASO 1: Transcribir el texto de la imagen
        const transcriptRes = await fetch(BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: file.type, data: base64 } },
                { text: 'Transcribí exactamente todo el texto que ves en esta imagen. Incluí nombres, precios y categorías tal como aparecen. No agregues nada extra.' }
              ]
            }]
          })
        })
        const transcriptData = await transcriptRes.json()
        
        // Mostrar error real si hay
        if (transcriptData.error) throw new Error(transcriptData.error.message)
        
        const transcriptText = transcriptData.candidates?.[0]?.content?.parts?.[0]?.text || ''
        if (!transcriptText) throw new Error('Gemini no devolvió texto. Respuesta: ' + JSON.stringify(transcriptData).slice(0, 200))

        // PASO 2: Convertir el texto a JSON de productos
        const parseRes = await fetch(BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Este es el texto de un menú de restaurante:\n\n${transcriptText}\n\nConvertí esto a un JSON array de productos. Para cada producto incluí: name (nombre), price (precio como número sin símbolo), category (categoría en español). Respondé ÚNICAMENTE con el JSON array, sin texto adicional, sin backticks. Ejemplo: [{"name":"Milanesa","price":2500,"category":"Platos principales"}]`
              }]
            }]
          })
        })
        const parseData = await parseRes.json()
        const parseText = parseData.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
        const jsonMatch = parseText.match(/\[[\s\S]*\]/)
        const clean = jsonMatch ? jsonMatch[0] : '[]'
        const items = JSON.parse(clean)
        setDetected(items.map(i => ({ ...i, selected: true })))
        setStep('review')
      } catch (err) {
        console.error(err)
        setError('No se pudo analizar la imagen: ' + err.message)
        setStep('idle')
      }
    }
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!venueId) return
    setStep('saving')
    const toImport = detected.filter(i => i.selected && i.name.trim())

    // Crear categorías únicas
    const cats = [...new Set(toImport.map(i => i.category || 'General'))]
    const catMap = {}
    for (const catName of cats) {
      const { data: existing } = await supabaseStaff
        .from('categories')
        .select('id')
        .eq('venue_id', venueId)
        .eq('name', catName)
        .maybeSingle()
      if (existing) {
        catMap[catName] = existing.id
      } else {
        const { data: newCat } = await supabaseStaff
          .from('categories')
          .insert({ venue_id: venueId, name: catName, sort_order: 0 })
          .select('id')
          .single()
        catMap[catName] = newCat?.id
      }
    }

    // Crear productos
    const products = toImport.map(i => ({
      venue_id: venueId,
      name: i.name.trim(),
      price: parseFloat(i.price) || 0,
      category_id: catMap[i.category || 'General'],
      is_available: true
    }))
    await supabaseStaff.from('products').insert(products)

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

  if (step === 'idle' || step === 'analyzing') {
    return (
      <div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={step === 'analyzing'}
          className="w-full bg-white border border-black/10 rounded-2xl p-4 flex items-center gap-3 shadow-sm"
        >
          {step === 'analyzing' ? (
            <>
              <div className="w-9 h-9 rounded-xl bg-[#008080]/10 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#008080" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="font-semibold text-[#1A2A3A] text-sm">Analizando imagen...</p>
                <p className="text-[#8896A5] text-xs">Gemini está leyendo tu menú</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-9 h-9 rounded-xl bg-[#008080]/10 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#008080" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 0 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="font-semibold text-[#1A2A3A] text-sm">Importar carta con IA</p>
                <p className="text-[#8896A5] text-xs">Sacá una foto de tu menú y Gemini lo carga automático</p>
              </div>
            </>
          )}
        </button>
        {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
      </div>
    )
  }

  if (step === 'review') {
    return (
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
        {preview && <img src={preview} alt="Menú" className="w-full h-32 object-cover opacity-60" />}
        <div className="p-4">
          <p className="font-semibold text-[#1A2A3A] text-sm mb-1">
            {detected.filter(i => i.selected).length} productos detectados
          </p>
          <p className="text-[#8896A5] text-xs mb-3">Revisá y editá antes de importar</p>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {detected.map((item, i) => (
              <div key={i} className={`flex items-center gap-2 p-2 rounded-xl border ${item.selected ? 'border-[#008080]/20 bg-[#F0FDF8]' : 'border-black/5 opacity-50'}`}>
                <input type="checkbox" checked={item.selected} onChange={() => toggleItem(i)} className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={item.name}
                    onChange={e => updateItem(i, 'name', e.target.value)}
                    className="w-full text-xs font-semibold text-[#1A2A3A] bg-transparent border-none outline-none"
                  />
                  <input
                    type="text"
                    value={item.category}
                    onChange={e => updateItem(i, 'category', e.target.value)}
                    className="w-full text-[10px] text-[#8896A5] bg-transparent border-none outline-none"
                  />
                </div>
                <input
                  type="number"
                  value={item.price}
                  onChange={e => updateItem(i, 'price', e.target.value)}
                  className="w-20 text-xs text-[#008080] font-semibold bg-transparent border border-black/10 rounded-lg px-2 py-1 text-right"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => { setStep('idle'); setDetected([]); setPreview(null) }}
              className="flex-1 border border-black/10 text-[#8896A5] text-sm py-2.5 rounded-xl"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!detected.some(i => i.selected)}
              className="flex-1 bg-[#008080] disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-xl"
            >
              Importar {detected.filter(i => i.selected).length} productos
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-black/5 text-center">
      <p className="text-[#008080] text-sm font-semibold">Guardando productos...</p>
    </div>
  )
}
