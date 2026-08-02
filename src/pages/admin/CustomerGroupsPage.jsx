import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatPrice } from '../../lib/utils'
import { fetchVenueStaff, ensureStaffCustomer, mergePeople } from '../../lib/venuePeople'
import MemberPicker, { PersonRole } from '../../components/MemberPicker'

// Grupos de clientes: los jugadores del club, los socios, el personal de la
// empresa de al lado. Un grupo abre cartas — se elige desde Cartas cuál grupo
// ve cada una.
//
// No es lo mismo que una categoría de descuento. Aquella existe para hacerle un
// precio a alguien; un grupo existe para abrirle una puerta. Se pueden solapar,
// pero son listas distintas y se administran por separado.
export default function CustomerGroupsPage() {
  const { venueId } = useAuth()
  const [groups, setGroups] = useState([])
  const [rows, setRows] = useState([])
  const [staff, setStaff] = useState([])
  const [members, setMembers] = useState({})
  const [menusByGroup, setMenusByGroup] = useState({})
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [openId, setOpenId] = useState(null)
  const [addingTo, setAddingTo] = useState(null)
  const [formError, setFormError] = useState('')
  const [showAnonymous, setShowAnonymous] = useState(false)

  useEffect(() => { if (venueId) load() }, [venueId])

  async function load() {
    setLoading(true)
    const [clientsRes, groupsRes, ordersRes, menusRes, staffList] = await Promise.all([
      // Por RPC y no leyendo la tabla: el email vive en auth.users
      supabaseStaff.rpc('venue_customer_list', { p_venue_id: venueId }),
      supabaseStaff.from('customer_groups').select('*').eq('venue_id', venueId).order('created_at'),
      supabaseStaff
        .from('orders')
        .select('customer_id, total')
        .eq('venue_id', venueId)
        .not('customer_id', 'is', null)
        .neq('status', 'cancelado'),
      supabaseStaff
        .from('venue_menus')
        .select('id, name, audience_group_id')
        .eq('venue_id', venueId)
        .not('audience_group_id', 'is', null),
      fetchVenueStaff(venueId),
    ])

    setStaff(staffList)
    const gs = groupsRes.data || []
    setGroups(gs)

    const byGroup = {}
    for (const m of menusRes.data || []) {
      ;(byGroup[m.audience_group_id] ||= []).push(m.name)
    }
    setMenusByGroup(byGroup)

    const stats = {}
    for (const o of ordersRes.data || []) {
      const s = (stats[o.customer_id] ||= { orders: 0, spent: 0 })
      s.orders += 1
      s.spent += Number(o.total) || 0
    }

    const memberMap = {}
    if (gs.length) {
      const { data: mem } = await supabaseStaff
        .from('customer_group_members')
        .select('group_id, customer_id')
        .in('group_id', gs.map(g => g.id))
      for (const m of mem || []) {
        ;(memberMap[m.customer_id] ||= []).push(m.group_id)
      }
    }
    setMembers(memberMap)

    setRows((clientsRes.data || [])
      .map(r => ({
        id: r.customer_id,
        name: r.full_name || (r.email ? r.email.split('@')[0] : 'Sin nombre'),
        email: r.email || '',
        whatsapp: r.whatsapp || '',
        identified: !!r.email,
        orders: stats[r.customer_id]?.orders || 0,
        spent: stats[r.customer_id]?.spent || 0,
      }))
      .sort((a, b) => b.orders - a.orders || a.name.localeCompare(b.name)))

    setLoading(false)
  }

  async function createGroup() {
    setFormError('')
    if (!name.trim()) { setFormError('Poné un nombre para el grupo.'); return }
    // .select() para distinguir "no se insertó" de "se insertó y no lo veo":
    // si la RLS filtra la escritura, vuelve sin error y sin filas
    const { data, error } = await supabaseStaff
      .from('customer_groups')
      .insert({ venue_id: venueId, name: name.trim(), description: description.trim() || null })
      .select('id')
    if (error) { setFormError(error.message); return }
    if (!data?.length) { setFormError('No se pudo crear. Tu usuario no tiene permiso sobre este local.'); return }
    setName('')
    setDescription('')
    load()
  }

  async function deleteGroup(g) {
    if (!confirm(`¿Borrar "${g.name}"? Los clientes no se borran, y las cartas que lo usaban pasan a verse por todos.`)) return
    await supabaseStaff.from('customer_groups').delete().eq('id', g.id)
    load()
  }

  async function addMember(groupId, person) {
    const customerId = person.id
    // Un empleado puede no tener ficha de cliente todavía, y sin ficha no puede
    // ser miembro. Es idempotente: si ya la tiene, no pasa nada.
    if (person.staffRole) {
      const staffError = await ensureStaffCustomer(venueId, customerId)
      if (staffError) { alert('Error: ' + staffError.message); return }
    }
    // venue_id va en la fila: es lo que mira su policy, sin consultar la tabla
    // de grupos (ver 0086, la recursión entre policies)
    const { error } = await supabaseStaff
      .from('customer_group_members')
      .upsert({ group_id: groupId, customer_id: customerId, venue_id: venueId }, { onConflict: 'group_id,customer_id' })
    if (error) { alert('Error: ' + error.message); return }
    load()
  }

  async function removeMember(groupId, customerId) {
    await supabaseStaff
      .from('customer_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('customer_id', customerId)
    load()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
        <p className="text-smoke-400 text-sm">Cargando...</p>
      </div>
    )
  }

  const anonCount = rows.filter(r => !r.identified).length
  // people = clientes + personal. rows queda para el contador, que habla de
  // clientes del local y no de la nómina.
  const people = mergePeople(rows, staff)
  const visibleRows = showAnonymous ? people : people.filter(r => r.identified)
  const visibleCustomers = showAnonymous ? rows : rows.filter(r => r.identified)

  return (
    <div className="min-h-screen bg-carbon-950 pb-16">
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">GRUPOS DE CLIENTES</h1>
          <Link to="/admin/configuracion" className="text-smoke-400 text-xs underline">← Volver</Link>
        </div>
        <p className="text-smoke-500 text-xs mt-1">
          Un grupo puede tener su propia carta, que nadie más ve
        </p>
      </header>

      <main className="px-5 mt-4 space-y-4 max-w-2xl mx-auto">
        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5 space-y-3">
          <div>
            <p className="text-smoke-300 text-sm font-medium">Nuevo grupo</p>
            <p className="text-smoke-500 text-xs mt-1">
              Por ejemplo "Jugadores del club". Después, desde{' '}
              <Link to="/admin/cartas" className="text-ember-500 underline">Cartas</Link>, elegís qué
              carta ve solo este grupo.
            </p>
          </div>
          <div>
            <label className="text-smoke-500 text-xs block mb-1">Nombre</label>
            <input className="input" placeholder="Ej: Jugadores del club" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-smoke-500 text-xs block mb-1">
              Descripción <span className="text-smoke-600">— opcional, solo la ves vos</span>
            </label>
            <input className="input" placeholder="Ej: Plantel y cuerpo técnico" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          {formError && <p className="text-red-500 text-xs">{formError}</p>}
          <button
            onClick={createGroup}
            className="w-full bg-ember-500 hover:bg-ember-600 text-white font-semibold py-2.5 rounded-xl text-sm"
          >
            Crear grupo
          </button>
        </div>

        <div className="px-1 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-smoke-600 text-xs">
            {visibleCustomers.length} {visibleCustomers.length === 1 ? 'cliente' : 'clientes'} en el local
            {staff.length > 0 && ` · ${staff.length} del personal`}
            {visibleCustomers.length === 0 && ' — aparecen acá cuando inician sesión en tu página'}
          </p>
          {anonCount > 0 && (
            <button onClick={() => setShowAnonymous(v => !v)} className="text-smoke-600 text-[11px] underline">
              {showAnonymous ? `Ocultar ${anonCount} sin cuenta` : `Ver ${anonCount} sin cuenta`}
            </button>
          )}
        </div>

        {/* Sin cuenta no hay grupo posible: la lista se arma con quien se
            identificó, y alguien que escanea el QR de paso no está en ninguna */}
        <p className="text-smoke-600 text-[11px] px-1 leading-relaxed">
          Para sumar a un cliente tiene que haber iniciado sesión al menos una vez en la página del
          local. Si un jugador no aparece en la lista, pedile que entre con su cuenta y volvé. Tu
          personal aparece siempre, haya pedido o no.
        </p>

        {groups.length === 0 ? (
          <p className="text-smoke-500 text-sm text-center py-6">Todavía no hay grupos.</p>
        ) : groups.map(g => {
          const memberRows = people.filter(r => (members[r.id] || []).includes(g.id))
          const candidates = visibleRows.filter(r => !(members[r.id] || []).includes(g.id))
          const cartas = menusByGroup[g.id] || []
          return (
            <div key={g.id} className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-smoke-200 font-bold text-base">{g.name}</p>
                  <p className="text-smoke-500 text-xs mt-0.5">
                    {memberRows.length} {memberRows.length === 1 ? 'persona' : 'personas'}
                    {g.description ? ` · ${g.description}` : ''}
                  </p>
                  {cartas.length > 0 && (
                    <p className="text-violet-400 text-xs mt-1">
                      Ve {cartas.length === 1 ? 'la carta' : 'las cartas'}: {cartas.join(', ')}
                    </p>
                  )}
                </div>
                <button onClick={() => deleteGroup(g)} className="text-smoke-600 text-[11px] underline flex-shrink-0">
                  Borrar
                </button>
              </div>

              <div className="flex gap-3 flex-wrap">
                {memberRows.length > 0 && (
                  <button
                    onClick={() => { setOpenId(openId === g.id ? null : g.id); setAddingTo(null) }}
                    className="text-smoke-400 text-xs font-semibold underline"
                  >
                    {openId === g.id ? 'Ocultar' : `Ver los ${memberRows.length}`}
                  </button>
                )}
                <button
                  onClick={() => { setAddingTo(addingTo === g.id ? null : g.id); setOpenId(null) }}
                  className="text-ember-400 text-xs font-semibold underline"
                >
                  {addingTo === g.id ? 'Cancelar' : '+ Agregar gente'}
                </button>
              </div>

              {openId === g.id && (
                <div className="space-y-1.5">
                  {memberRows.map(r => (
                    <div key={r.id} className="flex items-center justify-between gap-3 bg-carbon-800 rounded-lg px-3 py-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-smoke-300 text-xs truncate">{r.name}</p>
                          <PersonRole person={r} />
                        </div>
                        <p className="text-smoke-600 text-[10px] font-mono truncate">
                          {[r.email, r.whatsapp].filter(Boolean).join(' · ') || 'sin contacto'}
                        </p>
                        <p className="text-smoke-600 text-[10px]">
                          {r.orders} {r.orders === 1 ? 'pedido' : 'pedidos'}
                          {r.spent > 0 ? ` · ${formatPrice(r.spent)}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => removeMember(g.id, r.id)}
                        className="text-smoke-600 text-[11px] underline flex-shrink-0"
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {addingTo === g.id && (
                <MemberPicker
                  candidates={candidates}
                  onPick={person => addMember(g.id, person)}
                  emptyText="No hay clientes ni personal para agregar."
                />
              )}
            </div>
          )
        })}
      </main>
    </div>
  )
}
