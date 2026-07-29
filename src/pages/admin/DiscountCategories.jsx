import { useEffect, useState } from 'react'
import { supabaseStaff } from '../../lib/supabase'
import { formatPrice } from '../../lib/utils'

// Categorías de descuento: un grupo de clientes del local con un porcentaje
// asociado. A diferencia de un código, no se comparte ni se tipea — lo tiene
// quien pertenece, incluidos los que se agreguen después.
//
// Los clientes del local son los de venue_customers: los que se identificaron
// en su página, hayan pedido o no.
export default function DiscountCategories({ venueId }) {
  const [categories, setCategories] = useState([])
  const [rows, setRows] = useState([])
  const [members, setMembers] = useState({})
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [percent, setPercent] = useState('')
  const [openId, setOpenId] = useState(null)
  const [addingTo, setAddingTo] = useState(null)
  const [formError, setFormError] = useState('')

  useEffect(() => { if (venueId) load() }, [venueId])

  async function load() {
    setLoading(true)
    const [clientsRes, catsRes, ordersRes] = await Promise.all([
      supabaseStaff
        .from('venue_customers')
        .select('customer_id, first_seen_at, customers(id, full_name, whatsapp)')
        .eq('venue_id', venueId),
      supabaseStaff
        .from('discount_categories')
        .select('*')
        .eq('venue_id', venueId)
        .order('created_at'),
      supabaseStaff
        .from('orders')
        .select('customer_id, total')
        .eq('venue_id', venueId)
        .not('customer_id', 'is', null)
        .neq('status', 'cancelado'),
    ])

    const cats = catsRes.data || []
    setCategories(cats)

    const stats = {}
    for (const o of ordersRes.data || []) {
      const s = (stats[o.customer_id] ||= { orders: 0, spent: 0 })
      s.orders += 1
      s.spent += Number(o.total) || 0
    }

    const memberMap = {}
    if (cats.length) {
      const { data: mem } = await supabaseStaff
        .from('discount_category_members')
        .select('category_id, customer_id')
        .in('category_id', cats.map(c => c.id))
      for (const m of mem || []) {
        ;(memberMap[m.customer_id] ||= []).push(m.category_id)
      }
    }
    setMembers(memberMap)

    const list = (clientsRes.data || [])
      .filter(r => r.customers)
      .map(r => ({
        id: r.customer_id,
        name: r.customers.full_name || 'Sin nombre',
        whatsapp: r.customers.whatsapp || '',
        orders: stats[r.customer_id]?.orders || 0,
        spent: stats[r.customer_id]?.spent || 0,
      }))
      .sort((a, b) => b.orders - a.orders || a.name.localeCompare(b.name))

    setRows(list)
    setLoading(false)
  }

  async function createCategory() {
    setFormError('')
    if (!name.trim()) { setFormError('Poné un nombre para la categoría.'); return }
    const p = percent ? parseFloat(percent) : null
    if (p !== null && (isNaN(p) || p <= 0 || p > 100)) {
      setFormError('El descuento tiene que ser un número entre 1 y 100.')
      return
    }
    // .select() para distinguir "no se insertó" de "se insertó y no lo veo":
    // si la RLS filtra la escritura, vuelve sin error y sin filas
    const { data, error } = await supabaseStaff
      .from('discount_categories')
      .insert({ venue_id: venueId, name: name.trim(), discount_percent: p })
      .select('id')
    if (error) { setFormError(error.message); return }
    if (!data?.length) {
      setFormError('No se pudo crear. Tu usuario no tiene permiso sobre este local.')
      return
    }
    setName('')
    setPercent('')
    load()
  }

  async function deleteCategory(id) {
    if (!confirm('¿Borrar la categoría? Los clientes no se borran, solo dejan de pertenecer.')) return
    await supabaseStaff.from('discount_categories').delete().eq('id', id)
    load()
  }

  async function addMember(categoryId, customerId) {
    const { error } = await supabaseStaff
      .from('discount_category_members')
      .upsert({ category_id: categoryId, customer_id: customerId }, { onConflict: 'category_id,customer_id' })
    if (error) { alert('Error: ' + error.message); return }
    load()
  }

  async function removeMember(categoryId, customerId) {
    await supabaseStaff
      .from('discount_category_members')
      .delete()
      .eq('category_id', categoryId)
      .eq('customer_id', customerId)
    load()
  }

  if (loading) return <p className="text-smoke-500 text-sm text-center py-8">Cargando...</p>

  return (
    <div className="space-y-4">
      <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5 space-y-3">
        <div>
          <p className="text-smoke-300 text-sm font-medium">Nueva categoría de descuento</p>
          <p className="text-smoke-500 text-xs mt-1">
            Un grupo de clientes con su propio descuento — por ejemplo "Veteranos". No hay código que
            tipear: lo tiene quien pertenece, y se aplica solo al confirmar el pedido.
          </p>
        </div>
        {/* Cada campo en su renglón: .input fuerza width 100% y le gana a las
            clases de ancho, así que en una fila el nombre quedaba aplastado */}
        <div>
          <label className="text-smoke-500 text-xs block mb-1">Nombre</label>
          <input
            className="input"
            placeholder="Ej: Veteranos"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-smoke-500 text-xs block mb-1">Descuento (%)</label>
          <input
            className="input"
            type="number"
            min="1"
            max="100"
            placeholder="Ej: 15 — dejalo vacío para agrupar sin descuento"
            value={percent}
            onChange={e => setPercent(e.target.value)}
          />
        </div>
        {formError && <p className="text-red-500 text-xs">{formError}</p>}
        {/* Sin disabled: un botón que no responde no dice qué falta */}
        <button
          onClick={createCategory}
          className="w-full bg-ember-500 text-white font-semibold py-2.5 rounded-xl text-sm"
        >
          Crear categoría
        </button>
      </div>

      <p className="text-smoke-600 text-xs px-1">
        {rows.length} {rows.length === 1 ? 'cliente' : 'clientes'} en el local
        {rows.length === 0 && ' — aparecen acá cuando se identifican en tu página'}
      </p>

      {categories.length === 0 ? (
        <p className="text-smoke-500 text-sm text-center py-6">Todavía no hay categorías.</p>
      ) : categories.map(c => {
        const memberRows = rows.filter(r => (members[r.id] || []).includes(c.id))
        const candidates = rows.filter(r => !(members[r.id] || []).includes(c.id))
        return (
          <div key={c.id} className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-smoke-200 font-bold text-base">{c.name}</p>
                <p className="text-smoke-500 text-xs mt-0.5">
                  {memberRows.length} {memberRows.length === 1 ? 'cliente' : 'clientes'}
                  {c.discount_percent ? ` · ${c.discount_percent}% de descuento` : ' · sin descuento'}
                </p>
              </div>
              <button onClick={() => deleteCategory(c.id)} className="text-smoke-600 text-[11px] underline flex-shrink-0">
                Borrar
              </button>
            </div>

            <div className="flex gap-3 flex-wrap">
              {memberRows.length > 0 && (
                <button
                  onClick={() => { setOpenId(openId === c.id ? null : c.id); setAddingTo(null) }}
                  className="text-smoke-400 text-xs font-semibold underline"
                >
                  {openId === c.id ? 'Ocultar' : `Ver los ${memberRows.length}`}
                </button>
              )}
              <button
                onClick={() => { setAddingTo(addingTo === c.id ? null : c.id); setOpenId(null) }}
                className="text-ember-400 text-xs font-semibold underline"
              >
                {addingTo === c.id ? 'Cancelar' : '+ Agregar clientes'}
              </button>
            </div>

            {openId === c.id && (
              <div className="space-y-1.5">
                {memberRows.map(r => (
                  <div key={r.id} className="flex items-center justify-between gap-3 bg-carbon-800 rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-smoke-300 text-xs truncate">{r.name}</p>
                      <p className="text-smoke-600 text-[10px] font-mono">
                        {r.whatsapp || 'sin WhatsApp'} · {r.orders} {r.orders === 1 ? 'pedido' : 'pedidos'}
                        {r.spent > 0 ? ` · ${formatPrice(r.spent)}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => removeMember(c.id, r.id)}
                      className="text-smoke-600 text-[11px] underline flex-shrink-0"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}

            {addingTo === c.id && (
              <MemberPicker candidates={candidates} onPick={id => addMember(c.id, id)} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// Clientes del local que todavía no están en la categoría
function MemberPicker({ candidates, onPick }) {
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()
  const list = candidates
    .filter(r => !term || r.name.toLowerCase().includes(term) || r.whatsapp.includes(term))
    .slice(0, 40)

  return (
    <div className="bg-carbon-800 rounded-xl p-3 space-y-2">
      <input
        className="input"
        placeholder="Buscar por nombre o WhatsApp"
        value={q}
        onChange={e => setQ(e.target.value)}
      />
      {candidates.length === 0 ? (
        <p className="text-smoke-600 text-xs text-center py-2">
          No hay clientes para agregar.
        </p>
      ) : list.length === 0 ? (
        <p className="text-smoke-600 text-xs text-center py-2">Nadie coincide con la búsqueda.</p>
      ) : (
        <div className="space-y-1">
          {list.map(r => (
            <button
              key={r.id}
              onClick={() => onPick(r.id)}
              className="w-full flex items-center justify-between gap-3 bg-carbon-900 rounded-lg px-3 py-2 text-left"
            >
              <div className="min-w-0">
                <p className="text-smoke-300 text-xs truncate">{r.name}</p>
                <p className="text-smoke-600 text-[10px] font-mono">
                  {r.whatsapp || 'sin WhatsApp'} · {r.orders} {r.orders === 1 ? 'pedido' : 'pedidos'}
                </p>
              </div>
              <span className="text-ember-400 text-[11px] font-semibold flex-shrink-0">Agregar</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
