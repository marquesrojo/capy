import { useEffect, useState } from 'react'
import { supabaseStaff } from '../../lib/supabase'
import { formatPrice } from '../../lib/utils'

function randomCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// Categorías de descuento: un grupo de clientes del local con un porcentaje
// asociado. A diferencia de un código, no se comparte ni se tipea — lo tiene
// quien pertenece, incluidos los que se sumen después.
//
// Los clientes salen de los pedidos del local; no hay un alta aparte. Se suman
// los miembros que entraron por el link sin haber pedido todavía.
export default function DiscountCategories({ venueId }) {
  const [categories, setCategories] = useState([])
  const [rows, setRows] = useState([])
  const [members, setMembers] = useState({})
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [percent, setPercent] = useState('')
  const [openId, setOpenId] = useState(null)
  const [addingTo, setAddingTo] = useState(null)
  const [copied, setCopied] = useState('')

  useEffect(() => { if (venueId) load() }, [venueId])

  async function load() {
    setLoading(true)
    const [ordersRes, catsRes] = await Promise.all([
      supabaseStaff
        .from('orders')
        .select('customer_id, total, customers(id, full_name, whatsapp)')
        .eq('venue_id', venueId)
        .not('customer_id', 'is', null)
        .neq('status', 'cancelado'),
      supabaseStaff
        .from('discount_categories')
        .select('*')
        .eq('venue_id', venueId)
        .order('created_at'),
    ])

    const cats = catsRes.data || []
    setCategories(cats)

    const orders = ordersRes.data || []
    const memberMap = {}

    if (cats.length) {
      const { data: mem } = await supabaseStaff
        .from('discount_category_members')
        .select('category_id, customer_id, customers(id, full_name, whatsapp)')
        .in('category_id', cats.map(c => c.id))
      for (const m of mem || []) {
        ;(memberMap[m.customer_id] ||= []).push(m.category_id)
        // Se sumó por el link y todavía no pidió: igual es cliente del local
        if (m.customers && !orders.some(o => o.customer_id === m.customer_id)) {
          orders.push({ customer_id: m.customer_id, total: 0, customers: m.customers, _noOrders: true })
        }
      }
    }
    setMembers(memberMap)

    const byCustomer = {}
    for (const o of orders) {
      if (!o.customers) continue
      const c = (byCustomer[o.customer_id] ||= {
        id: o.customer_id,
        name: o.customers.full_name || 'Sin nombre',
        whatsapp: o.customers.whatsapp || '',
        orders: 0,
        spent: 0,
      })
      if (!o._noOrders) {
        c.orders += 1
        c.spent += Number(o.total) || 0
      }
    }
    setRows(Object.values(byCustomer).sort((a, b) => b.orders - a.orders))
    setLoading(false)
  }

  async function createCategory() {
    if (!name.trim()) return
    const p = percent ? parseFloat(percent) : null
    if (p !== null && (isNaN(p) || p <= 0 || p > 100)) { alert('El porcentaje debe ser entre 1 y 100.'); return }
    const { error } = await supabaseStaff.from('discount_categories').insert({
      venue_id: venueId,
      name: name.trim(),
      join_code: randomCode(),
      discount_percent: p,
    })
    if (error) { alert('Error: ' + error.message); return }
    setName('')
    setPercent('')
    load()
  }

  async function updateCategory(id, patch) {
    await supabaseStaff.from('discount_categories').update(patch).eq('id', id)
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
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

  function joinUrl(code) {
    return `${window.location.origin}/sumarme/${code}`
  }

  if (loading) return <p className="text-smoke-500 text-sm text-center py-8">Cargando...</p>

  return (
    <div className="space-y-4">
      <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5 space-y-3">
        <div>
          <p className="text-smoke-300 text-sm font-medium">Nueva categoría de descuento</p>
          <p className="text-smoke-500 text-xs mt-1">
            Un grupo de clientes con su propio descuento — por ejemplo "Veteranos". No hay código que
            tipear: lo tiene quien pertenece, también los que se sumen después.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Nombre de la categoría"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <input
            className="input w-20 text-center"
            type="number"
            min="1"
            max="100"
            placeholder="%"
            value={percent}
            onChange={e => setPercent(e.target.value)}
          />
        </div>
        <button
          onClick={createCategory}
          disabled={!name.trim()}
          className="w-full bg-ember-500 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl text-sm"
        >
          Crear categoría
        </button>
      </div>

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

            <div className="bg-carbon-800 rounded-xl p-3">
              <p className="text-smoke-500 text-[10px] font-semibold uppercase tracking-wide mb-1.5">
                Link para sumarse
              </p>
              <p className="text-smoke-300 text-xs font-mono break-all mb-2.5">{joinUrl(c.join_code)}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(joinUrl(c.join_code))
                    setCopied(c.id)
                    setTimeout(() => setCopied(''), 2000)
                  }}
                  className="bg-ember-500 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full"
                >
                  {copied === c.id ? '¡Copiado! ✓' : 'Copiar link'}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Sumate a ${c.name}: ${joinUrl(c.join_code)}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="border border-emerald-500/40 text-emerald-500 text-[11px] font-semibold px-3 py-1.5 rounded-full"
                >
                  Enviar por WhatsApp
                </a>
                <button
                  onClick={() => updateCategory(c.id, { join_open: !c.join_open })}
                  className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border ${
                    c.join_open ? 'border-carbon-600 text-smoke-500' : 'border-amber-500/40 text-amber-500'
                  }`}
                >
                  {c.join_open ? 'Cerrar altas' : 'Reabrir altas'}
                </button>
              </div>
              {!c.join_open && (
                <p className="text-smoke-600 text-[11px] mt-2">
                  El link ya no suma gente nueva. Los que están conservan el descuento.
                </p>
              )}
            </div>

            <div className="flex gap-3 flex-wrap">
              {memberRows.length > 0 && (
                <button
                  onClick={() => { setOpenId(openId === c.id ? null : c.id); setAddingTo(null) }}
                  className="text-smoke-400 text-xs font-semibold underline"
                >
                  {openId === c.id ? 'Ocultar clientes' : `Ver los ${memberRows.length}`}
                </button>
              )}
              <button
                onClick={() => { setAddingTo(addingTo === c.id ? null : c.id); setOpenId(null) }}
                className="text-ember-400 text-xs font-semibold underline"
              >
                {addingTo === c.id ? 'Cancelar' : '+ Agregar a mano'}
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

// Los que ya pidieron en el local y todavía no están en la categoría
function MemberPicker({ candidates, onPick }) {
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()
  const list = candidates
    .filter(r => !term || r.name.toLowerCase().includes(term) || r.whatsapp.includes(term))
    .slice(0, 30)

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
          Todavía no hay clientes con pedidos en el local.
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
