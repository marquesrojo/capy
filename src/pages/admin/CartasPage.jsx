import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatPrice } from '../../lib/utils'

// Cartas del local: además de la carta general, el local puede tener el menú
// ejecutivo del mediodía, el de los jugadores del club, el que sea. Se prenden
// y apagan desde acá, y el cliente ve arriba de la carta las que estén activas.
//
// Una carta libre muestra los productos elegidos, cada uno a su precio. Una
// carta de precio fijo se arma por pasos —entrada, principal, postre, café— y
// se cobra un solo precio, elija lo que elija.
//
// Las dos se apoyan en productos que ya existen en la carta: un mismo plato
// puede estar en varias cartas a la vez.

const PASOS_SUGERIDOS = ['Entrada', 'Plato principal', 'Postre', 'Café']

export default function CartasPage() {
  const { venueId } = useAuth()
  const [menus, setMenus] = useState([])
  const [products, setProducts] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState(null)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [kind, setKind] = useState('fijo')
  const [price, setPrice] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => { if (venueId) load() }, [venueId])

  async function load() {
    const [menusRes, prodRes, groupsRes] = await Promise.all([
      supabaseStaff
        .from('venue_menus')
        .select('*, venue_menu_steps(*, venue_menu_step_options(*)), venue_menu_products(product_id)')
        .eq('venue_id', venueId)
        .order('sort_order')
        .order('created_at'),
      supabaseStaff
        .from('products')
        .select('id, name, price, category_id, is_available, in_main_menu')
        .eq('venue_id', venueId)
        .order('sort_order'),
      supabaseStaff
        .from('customer_groups')
        .select('id, name')
        .eq('venue_id', venueId)
        .order('created_at'),
    ])
    setGroups(groupsRes.data || [])
    const list = (menusRes.data || []).map(m => ({
      ...m,
      venue_menu_steps: (m.venue_menu_steps || []).sort((a, b) => a.sort_order - b.sort_order),
    }))
    setMenus(list)
    setProducts(prodRes.data || [])
    setLoading(false)
  }

  async function createMenu() {
    setError('')
    if (!name.trim()) { setError('Poné un nombre para la carta.'); return }
    const p = kind === 'fijo' ? parseFloat(price) : null
    if (kind === 'fijo' && (!p || isNaN(p) || p <= 0)) {
      setError('Una carta de precio fijo necesita su precio.')
      return
    }
    setCreating(true)
    // .select() para distinguir "no se insertó" de "se insertó y no lo veo":
    // si la RLS filtra la escritura, vuelve sin error y sin filas
    const { data, error: err } = await supabaseStaff
      .from('venue_menus')
      .insert({ venue_id: venueId, name: name.trim(), kind, price: p, sort_order: menus.length })
      .select('id')
    setCreating(false)
    if (err) { setError(err.message); return }
    if (!data?.length) { setError('No se pudo crear. Tu usuario no tiene permiso sobre este local.'); return }
    // Una carta de precio fijo sin pasos no se puede pedir: se arranca con los
    // de siempre y el local saca los que no use
    if (kind === 'fijo') {
      await supabaseStaff.from('venue_menu_steps').insert(
        PASOS_SUGERIDOS.map((n, i) => ({
          menu_id: data[0].id,
          name: n,
          // El café no siempre se toma
          min_choices: n === 'Café' ? 0 : 1,
          sort_order: i,
        }))
      )
    }
    setName('')
    setPrice('')
    setOpenId(data[0].id)
    load()
  }

  async function toggleActive(menu) {
    await supabaseStaff.from('venue_menus').update({ is_active: !menu.is_active }).eq('id', menu.id)
    setMenus(prev => prev.map(m => m.id === menu.id ? { ...m, is_active: !m.is_active } : m))
  }

  async function deleteMenu(menu) {
    if (!confirm(`¿Borrar "${menu.name}"? Los productos no se tocan, solo deja de existir la carta.`)) return
    await supabaseStaff.from('venue_menus').delete().eq('id', menu.id)
    load()
  }

  if (loading) return <p className="text-smoke-500 text-sm text-center py-10">Cargando...</p>

  return (
    <div className="min-h-screen bg-carbon-950 pb-16">
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">CARTAS</h1>
          <Link to="/admin/configuracion" className="text-smoke-400 text-xs underline">← Volver</Link>
        </div>
        <p className="text-smoke-500 text-xs mt-1">
          El cliente ve las que estén activas arriba de la carta
        </p>
        <div className="flex gap-2 mt-3">
          <Link
            to="/admin/carta"
            className="text-xs font-bold px-3 py-1.5 rounded-xl border border-carbon-700 text-smoke-400 hover:text-smoke-200 transition-colors"
          >
            Productos
          </Link>
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-ember-500 text-white">
            Cartas especiales
          </span>
        </div>
      </header>

      <main className="px-5 mt-4 space-y-4 max-w-2xl mx-auto">
        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5 space-y-3">
          <div>
            <p className="text-smoke-300 text-sm font-medium">Nueva carta</p>
            <p className="text-smoke-500 text-xs mt-1">
              Por ejemplo "Menú Ejecutivo" o "Menú Jugadores". Se apoya en los productos que ya
              tenés cargados.
            </p>
          </div>

          <div>
            <label className="text-smoke-500 text-xs block mb-1">Nombre</label>
            <input className="input" placeholder="Ej: Menú Ejecutivo" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'fijo', label: 'Precio fijo', desc: 'Se arma por pasos y se cobra un solo precio' },
              { id: 'libre', label: 'Precio libre', desc: 'Cada producto a su precio' },
            ].map(o => (
              <button
                key={o.id}
                onClick={() => setKind(o.id)}
                className={`text-left rounded-xl p-3 border transition-colors ${
                  kind === o.id
                    ? 'border-ember-500 bg-ember-500/10'
                    : 'border-carbon-700 bg-carbon-800 hover:border-carbon-600'
                }`}
              >
                <p className="text-smoke-200 text-sm font-semibold">{o.label}</p>
                <p className="text-smoke-500 text-[11px] leading-snug mt-0.5">{o.desc}</p>
              </button>
            ))}
          </div>

          {kind === 'fijo' && (
            <div>
              <label className="text-smoke-500 text-xs block mb-1">Precio del menú completo</label>
              <input className="input" type="number" min="1" placeholder="Ej: 26000" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
          )}

          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            onClick={createMenu}
            disabled={creating}
            className="w-full bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm"
          >
            {creating ? 'Creando...' : 'Crear carta'}
          </button>
        </div>

        {menus.length === 0 ? (
          <p className="text-smoke-500 text-sm text-center py-6">
            Todavía no hay cartas especiales. El cliente ve solo la carta general.
          </p>
        ) : menus.map(menu => (
          <MenuCard
            key={menu.id}
            menu={menu}
            products={products}
            groups={groups}
            open={openId === menu.id}
            onToggleOpen={() => setOpenId(openId === menu.id ? null : menu.id)}
            onToggleActive={() => toggleActive(menu)}
            onDelete={() => deleteMenu(menu)}
            onChanged={load}
          />
        ))}
      </main>
    </div>
  )
}

function MenuCard({ menu, products, groups, open, onToggleOpen, onToggleActive, onDelete, onChanged }) {
  const inMenu = new Set((menu.venue_menu_products || []).map(p => p.product_id))
  const stepCount = (menu.venue_menu_steps || []).length
  const optionCount = (menu.venue_menu_steps || []).reduce(
    (n, s) => n + (s.venue_menu_step_options || []).length, 0
  )

  const resumen = menu.kind === 'fijo'
    ? `${formatPrice(menu.price || 0)} · ${stepCount} ${stepCount === 1 ? 'paso' : 'pasos'} · ${optionCount} ${optionCount === 1 ? 'opción' : 'opciones'}`
    : `${inMenu.size} ${inMenu.size === 1 ? 'producto' : 'productos'}`

  return (
    <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-smoke-200 font-bold text-base">{menu.name}</p>
          <p className="text-smoke-500 text-xs mt-0.5">{resumen}</p>
        </div>
        <button
          onClick={onToggleActive}
          aria-label={menu.is_active ? 'Desactivar carta' : 'Activar carta'}
          className={`flex-shrink-0 w-12 h-7 rounded-full transition-colors relative ${
            menu.is_active ? 'bg-ember-500' : 'bg-carbon-700'
          }`}
        >
          <span
            className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
              menu.is_active ? 'left-6' : 'left-1'
            }`}
          />
        </button>
      </div>

      <p className="text-smoke-600 text-[11px]">
        {!menu.is_active
          ? 'Apagada: no la ve nadie'
          : menu.audience_group_id
            ? `Solo la ve ${groups.find(g => g.id === menu.audience_group_id)?.name || 'un grupo borrado'}`
            : 'Visible para todos los clientes'}
      </p>

      {/* Quién la ve. Fuera del grupo la carta no existe: no aparece bloqueada
          ni en gris, directamente no llega al navegador. */}
      <div>
        <label className="text-smoke-500 text-xs block mb-1">Quién la ve</label>
        <select
          value={menu.audience_group_id || ''}
          onChange={async e => {
            const v = e.target.value || null
            await supabaseStaff.from('venue_menus').update({ audience_group_id: v }).eq('id', menu.id)
            onChanged()
          }}
          className="input"
        >
          <option value="">Todos los clientes</option>
          {groups.map(g => (
            <option key={g.id} value={g.id}>Solo {g.name}</option>
          ))}
        </select>
        {groups.length === 0 && (
          <p className="text-smoke-600 text-[11px] mt-1">
            Para reservarla a un grupo, creá uno primero en{' '}
            <Link to="/admin/grupos" className="text-ember-500 underline">Grupos de clientes</Link>.
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={onToggleOpen} className="text-ember-400 text-xs font-semibold underline">
          {open ? 'Cerrar' : menu.kind === 'fijo' ? 'Armar los pasos' : 'Elegir productos'}
        </button>
        <button onClick={onDelete} className="text-smoke-600 text-[11px] underline">Borrar</button>
      </div>

      {open && (menu.kind === 'fijo'
        ? <StepsEditor menu={menu} products={products} onChanged={onChanged} />
        : <FreeMenuEditor menu={menu} products={products} inMenu={inMenu} onChanged={onChanged} />
      )}
    </div>
  )
}

// ── Carta de precio fijo: pasos y sus opciones ──
function StepsEditor({ menu, products, onChanged }) {
  const [newStep, setNewStep] = useState('')

  async function addStep() {
    if (!newStep.trim()) return
    await supabaseStaff.from('venue_menu_steps').insert({
      menu_id: menu.id,
      name: newStep.trim(),
      sort_order: (menu.venue_menu_steps || []).length,
    })
    setNewStep('')
    onChanged()
  }

  async function deleteStep(id) {
    await supabaseStaff.from('venue_menu_steps').delete().eq('id', id)
    onChanged()
  }

  async function setOptional(step, optional) {
    await supabaseStaff.from('venue_menu_steps').update({ min_choices: optional ? 0 : 1 }).eq('id', step.id)
    onChanged()
  }

  return (
    <div className="space-y-3 pt-1">
      {(menu.venue_menu_steps || []).map(step => (
        <StepBlock
          key={step.id}
          step={step}
          products={products}
          onDelete={() => deleteStep(step.id)}
          onSetOptional={v => setOptional(step, v)}
          onChanged={onChanged}
        />
      ))}

      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Otro paso: Bebida, Guarnición..."
          value={newStep}
          onChange={e => setNewStep(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addStep()}
        />
        <button
          onClick={addStep}
          disabled={!newStep.trim()}
          className="bg-carbon-700 hover:bg-carbon-600 disabled:opacity-40 text-smoke-200 font-semibold px-4 rounded-xl text-sm"
        >
          Sumar
        </button>
      </div>
    </div>
  )
}

function StepBlock({ step, products, onDelete, onSetOptional, onChanged }) {
  const [picking, setPicking] = useState(false)
  const chosen = step.venue_menu_step_options || []
  const chosenIds = new Set(chosen.map(o => o.product_id))
  const byId = new Map(products.map(p => [p.id, p]))

  async function add(productId) {
    await supabaseStaff.from('venue_menu_step_options').insert({
      step_id: step.id,
      product_id: productId,
      sort_order: chosen.length,
    })
    onChanged()
  }

  async function remove(productId) {
    await supabaseStaff
      .from('venue_menu_step_options')
      .delete()
      .eq('step_id', step.id)
      .eq('product_id', productId)
    onChanged()
  }

  return (
    <div className="bg-carbon-800 rounded-xl p-3.5 space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-smoke-200 text-sm font-semibold">{step.name}</p>
        <button onClick={onDelete} className="text-smoke-600 text-[11px] underline flex-shrink-0">Quitar paso</button>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={step.min_choices === 0}
          onChange={e => onSetOptional(e.target.checked)}
          className="accent-ember-500"
        />
        <span className="text-smoke-500 text-[11px]">Se puede saltear</span>
      </label>

      {chosen.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chosen.map(o => {
            const p = byId.get(o.product_id)
            return (
              <span key={o.product_id} className="inline-flex items-center gap-1.5 bg-carbon-900 border border-carbon-700 rounded-lg pl-2.5 pr-1.5 py-1">
                <span className="text-smoke-300 text-xs">{p?.name || 'Producto borrado'}</span>
                <button onClick={() => remove(o.product_id)} aria-label="Quitar" className="text-smoke-600 text-xs px-1">×</button>
              </span>
            )
          })}
        </div>
      )}

      <button onClick={() => setPicking(v => !v)} className="text-ember-400 text-xs font-semibold underline">
        {picking ? 'Listo' : '+ Agregar platos a este paso'}
      </button>

      {picking && (
        <ProductPicker
          products={products.filter(p => !chosenIds.has(p.id))}
          onPick={add}
        />
      )}
    </div>
  )
}

// ── Carta libre: qué productos entran ──
function FreeMenuEditor({ menu, products, inMenu, onChanged }) {
  const [picking, setPicking] = useState(false)
  const chosen = products.filter(p => inMenu.has(p.id))

  async function add(productId) {
    await supabaseStaff.from('venue_menu_products').insert({
      menu_id: menu.id,
      product_id: productId,
      sort_order: inMenu.size,
    })
    onChanged()
  }

  async function remove(productId) {
    await supabaseStaff
      .from('venue_menu_products')
      .delete()
      .eq('menu_id', menu.id)
      .eq('product_id', productId)
    onChanged()
  }

  return (
    <div className="space-y-2.5 pt-1">
      {chosen.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chosen.map(p => (
            <span key={p.id} className="inline-flex items-center gap-1.5 bg-carbon-800 border border-carbon-700 rounded-lg pl-2.5 pr-1.5 py-1">
              <span className="text-smoke-300 text-xs">{p.name}</span>
              <button onClick={() => remove(p.id)} aria-label="Quitar" className="text-smoke-600 text-xs px-1">×</button>
            </span>
          ))}
        </div>
      )}
      <button onClick={() => setPicking(v => !v)} className="text-ember-400 text-xs font-semibold underline">
        {picking ? 'Listo' : '+ Agregar productos'}
      </button>
      {picking && <ProductPicker products={products.filter(p => !inMenu.has(p.id))} onPick={add} />}
    </div>
  )
}

// Un mismo producto puede sumarse a varias cartas, así que la lista nunca se
// agota: lo que se saca acá es lo que ya está en este paso o en esta carta.
function ProductPicker({ products, onPick }) {
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()
  const list = products.filter(p => !term || p.name.toLowerCase().includes(term)).slice(0, 40)

  return (
    <div className="bg-carbon-900 rounded-xl p-3 space-y-2 border border-carbon-700">
      <input className="input" placeholder="Buscar producto" value={q} onChange={e => setQ(e.target.value)} />
      {products.length === 0 ? (
        <p className="text-smoke-600 text-xs text-center py-2">Ya están todos agregados.</p>
      ) : list.length === 0 ? (
        <p className="text-smoke-600 text-xs text-center py-2">Ningún producto coincide.</p>
      ) : (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {list.map(p => (
            <button
              key={p.id}
              onClick={() => onPick(p.id)}
              className="w-full flex items-center justify-between gap-3 bg-carbon-800 hover:bg-carbon-700 rounded-lg px-3 py-2 text-left transition-colors"
            >
              <span className="text-smoke-300 text-xs truncate">
                {p.name}
                {p.is_available === false && <span className="text-smoke-600"> · agotado</span>}
                {p.in_main_menu === false && <span className="text-violet-400"> · solo carta</span>}
              </span>
              <span className="text-smoke-600 text-[11px] flex-shrink-0">{formatPrice(p.price)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
