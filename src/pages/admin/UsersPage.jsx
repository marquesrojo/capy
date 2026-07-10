import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { UsersIcon } from '../../components/Icons'

const ROLE_LABELS = { admin: 'Administrador', camarero: 'Camarero', propietario: 'Propietario' }

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`
const EDGE_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'x-capy-secret': import.meta.env.VITE_CAPY_ADMIN_SECRET
}

const SORT_ICONS = {
  xp: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  pedidos: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  rating: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
}

export default function UsersPage() {
  const { venueId } = useAuth()
  const [tab, setTab] = useState('todos')

  // Tab: todos
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('admin')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // Tab: vinculados
  const [vinculados, setVinculados] = useState([])
  const [loadingVinculados, setLoadingVinculados] = useState(false)

  // Tab: comparativa
  const [comparativa, setComparativa] = useState([])
  const [compLoading, setCompLoading] = useState(false)
  const [compSort, setCompSort] = useState('xp')

  const loadUsers = useCallback(async () => {
    if (!venueId) return
    const { data } = await supabaseStaff
      .from('profiles')
      .select('id, full_name, role, is_active, is_shared_account, created_at')
      .eq('venue_id', venueId)
      .in('role', ['admin', 'camarero', 'propietario'])
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false })
    setUsers(data || [])
    setLoadingUsers(false)
  }, [venueId])

  const loadVinculados = useCallback(async () => {
    if (!venueId) return
    setLoadingVinculados(true)
    const { data } = await supabaseStaff
      .from('venue_staff')
      .select('id, status, joined_at, profile:profiles(id, full_name)')
      .eq('venue_id', venueId)
      .eq('status', 'active')
    setVinculados(data || [])
    setLoadingVinculados(false)
  }, [venueId])

  const loadComparativa = useCallback(async () => {
    if (!venueId) return
    setCompLoading(true)
    const { data: linked } = await supabaseStaff
      .from('venue_staff')
      .select('staff_profile_id, profile:profiles(full_name)')
      .eq('venue_id', venueId)
      .eq('status', 'active')

    if (!linked?.length) { setComparativa([]); setCompLoading(false); return }

    const linkedIds = linked.map(l => l.staff_profile_id).filter(Boolean)
    if (!linkedIds.length) { setComparativa([]); setCompLoading(false); return }

    const { data: byId } = await supabaseStaff
      .from('staff_names')
      .select('id, full_name, alias, xp, total_orders, profile_id')
      .in('profile_id', linkedIds)

    const foundProfileIds = new Set((byId || []).map(s => s.profile_id).filter(Boolean))
    const missingLinks = linked.filter(l => !foundProfileIds.has(l.staff_profile_id))
    const missingNames = missingLinks.map(l => l.profile?.full_name).filter(Boolean)

    let byName = []
    if (missingNames.length) {
      const { data: fallback } = await supabaseStaff
        .from('staff_names')
        .select('id, full_name, alias, xp, total_orders, profile_id')
        .in('full_name', missingNames)
        .order('xp', { ascending: false, nullsFirst: false })
      const seen = new Map()
      for (const s of fallback || []) {
        if (!seen.has(s.full_name)) seen.set(s.full_name, s)
      }
      byName = Array.from(seen.values())
    }

    const staffList = [...(byId || []), ...byName]
    if (!staffList.length) { setComparativa([]); setCompLoading(false); return }

    const ids = staffList.map(s => s.id)
    const { data: feedbacks } = await supabaseStaff
      .from('order_feedback')
      .select('staff_id, rating')
      .in('staff_id', ids)

    const ratingMap = {}
    for (const f of feedbacks || []) {
      if (!ratingMap[f.staff_id]) ratingMap[f.staff_id] = []
      ratingMap[f.staff_id].push(f.rating)
    }

    setComparativa(staffList.map(s => {
      const ratings = ratingMap[s.id] || []
      return {
        ...s,
        avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
        totalRatings: ratings.length
      }
    }))
    setCompLoading(false)
  }, [venueId])

  useEffect(() => { if (venueId) loadUsers() }, [venueId, loadUsers])

  useEffect(() => {
    if (tab === 'vinculados') loadVinculados()
    if (tab === 'comparativa') loadComparativa()
  }, [tab, loadVinculados, loadComparativa])

  async function handleCreate() {
    if (!email.trim() || !fullName.trim() || !password.trim()) {
      setError('Completá todos los campos.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(EDGE_URL, {
        method: 'POST',
        headers: EDGE_HEADERS,
        body: JSON.stringify({ action: 'create', email: email.trim(), full_name: fullName.trim(), role, password: password.trim() })
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error || 'Error al crear el usuario.')
      } else {
        setSuccess(`Usuario ${fullName.trim()} creado correctamente.`)
        setEmail(''); setFullName(''); setPassword(''); setRole('admin')
        loadUsers()
      }
    } catch {
      setError('No pudimos crear el usuario. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  async function desvincular(id) {
    if (!confirm('¿Desvincular este camarero?')) return
    await supabaseStaff
      .from('venue_staff')
      .update({ status: 'inactive', left_at: new Date().toISOString() })
      .eq('id', id)
    setVinculados(prev => prev.filter(v => v.id !== id))
  }

  function handleUpdated(updated) {
    setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u))
  }

  const TABS = [
    { id: 'todos', label: 'Todos' },
    { id: 'vinculados', label: 'App Camarero' },
    { id: 'comparativa', label: 'Comparativa' },
  ]

  return (
    <div className="min-h-screen bg-carbon-950 pb-10">
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">USUARIOS</h1>
          <Link to="/admin/configuracion" className="text-smoke-400 text-xs underline">← Volver</Link>
        </div>
      </header>

      <div className="px-5 pt-4 flex gap-2">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-xs font-semibold border ${
              tab === t.id ? 'bg-ember-500 text-white border-ember-500' : 'border-carbon-700 text-smoke-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <main className="px-5 mt-4">

        {/* ── TAB: TODOS ── */}
        {tab === 'todos' && (
          <div className="space-y-6">
            <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
              <p className="text-smoke-300 font-medium text-sm mb-4">Crear nuevo usuario</p>
              <div className="space-y-3">
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nombre completo" className="input w-full" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="input w-full" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña (mínimo 6 caracteres)" className="input w-full" />
                <select value={role} onChange={e => setRole(e.target.value)} className="input w-full">
                  <option value="admin">Administrador</option>
                  <option value="camarero">Camarero</option>
                </select>
              </div>
              {error && <p className="text-red-700 text-xs mt-3">{error}</p>}
              {success && <p className="text-emerald-700 text-xs mt-3">{success}</p>}
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="w-full mt-4 bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl"
              >
                {submitting ? 'Creando...' : 'Crear usuario'}
              </button>
            </div>

            {loadingUsers ? (
              <p className="text-smoke-500 text-sm text-center py-8">Cargando...</p>
            ) : (
              <>
                {(() => {
                  const active = users.filter(u => u.is_active !== false)
                  const inactive = users.filter(u => u.is_active === false)
                  return (
                    <>
                      <div>
                        <p className="text-smoke-400 text-xs font-semibold uppercase tracking-wide mb-2">
                          Activos · {active.length}
                        </p>
                        <div className="space-y-2">
                          {active.map(user => (
                            <UserRow key={user.id} user={user} onUpdated={handleUpdated} />
                          ))}
                        </div>
                      </div>
                      {inactive.length > 0 && (
                        <div>
                          <p className="text-smoke-500 text-xs font-semibold uppercase tracking-wide mb-2">
                            Deshabilitados · {inactive.length}
                          </p>
                          <div className="space-y-2 opacity-50">
                            {inactive.map(user => (
                              <UserRow key={user.id} user={user} onUpdated={handleUpdated} />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </>
            )}
          </div>
        )}

        {/* ── TAB: APP CAMARERO ── */}
        {tab === 'vinculados' && (
          <div className="space-y-3">
            <p className="text-smoke-500 text-xs mb-4">
              Camareros vinculados via código de invitación desde{' '}
              <Link to="/admin/qr" className="text-ember-500 underline">Config → Códigos QR</Link>.
            </p>
            {loadingVinculados ? (
              <p className="text-smoke-500 text-sm text-center py-8">Cargando...</p>
            ) : vinculados.length === 0 ? (
              <p className="text-smoke-600 text-sm text-center py-8">No hay camareros vinculados todavía.</p>
            ) : (
              vinculados.map(v => (
                <div key={v.id} className="bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-smoke-200 font-semibold text-sm">{v.profile?.full_name || 'Sin nombre'}</p>
                    <p className="text-smoke-500 text-xs">Desde {new Date(v.joined_at).toLocaleDateString('es-AR')}</p>
                  </div>
                  <button onClick={() => desvincular(v.id)} className="text-red-400 text-xs underline">
                    Desvincular
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── TAB: COMPARATIVA ── */}
        {tab === 'comparativa' && (
          <div>
            <div className="flex gap-2 mb-4">
              {[
                { id: 'xp', label: 'XP' },
                { id: 'pedidos', label: 'Pedidos' },
                { id: 'rating', label: 'Rating' },
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setCompSort(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    compSort === s.id ? 'bg-ember-500 text-white border-ember-500' : 'border-carbon-700 text-smoke-400'
                  }`}
                >
                  {SORT_ICONS[s.id]}
                  {s.label}
                </button>
              ))}
            </div>
            {compLoading ? (
              <p className="text-smoke-500 text-sm">Cargando...</p>
            ) : comparativa.length === 0 ? (
              <p className="text-smoke-600 text-sm text-center py-8">Sin datos todavía.</p>
            ) : (
              <div className="space-y-2">
                {[...comparativa]
                  .sort((a, b) => {
                    if (compSort === 'xp') return (b.xp || 0) - (a.xp || 0)
                    if (compSort === 'pedidos') return (b.total_orders || 0) - (a.total_orders || 0)
                    if (compSort === 'rating') return (b.avgRating ?? -1) - (a.avgRating ?? -1)
                    return 0
                  })
                  .map((s, i) => (
                    <div key={s.id} className="bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-3 flex items-center gap-3">
                      <span className="text-smoke-500 font-bold text-sm w-5 text-center">{i + 1}</span>
                      <div className="w-9 h-9 rounded-full bg-ember-500/20 flex items-center justify-center text-ember-400 font-bold text-xs flex-shrink-0">
                        {(s.alias || s.full_name)?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-smoke-200 font-semibold text-sm truncate">
                          {s.alias ? `@${s.alias}` : s.full_name}
                        </p>
                        <p className="text-smoke-500 text-xs">{s.totalRatings} reseñas</p>
                      </div>
                      <div className="flex gap-4 text-right">
                        <div>
                          <p className="text-ember-400 font-bold text-sm">{(s.xp || 0).toLocaleString()}</p>
                          <p className="text-smoke-600 text-[10px]">XP</p>
                        </div>
                        <div>
                          <p className="text-smoke-300 font-bold text-sm">{s.total_orders || 0}</p>
                          <p className="text-smoke-600 text-[10px]">Pedidos</p>
                        </div>
                        <div>
                          <p className="text-smoke-300 font-bold text-sm">
                            {s.avgRating != null ? s.avgRating.toFixed(1) : '—'}
                          </p>
                          <p className="text-smoke-600 text-[10px]">Rating</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function UserRow({ user, onUpdated }) {
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(user.full_name)
  const [role, setRole] = useState(user.role)
  const [password, setPassword] = useState('')
  const [managerPin, setManagerPin] = useState('')
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [togglingShared, setTogglingShared] = useState(false)
  const [error, setError] = useState('')

  async function handleToggleShared() {
    setTogglingShared(true)
    const { error: updateError } = await supabaseStaff
      .from('profiles')
      .update({ is_shared_account: !user.is_shared_account })
      .eq('id', user.id)
    setTogglingShared(false)
    if (!updateError) {
      onUpdated({ id: user.id, is_shared_account: !user.is_shared_account })
    } else {
      alert('No se pudo actualizar. ' + updateError.message)
    }
  }

  async function handleSave() {
    if (!fullName.trim()) { setError('El nombre no puede estar vacío.'); return }
    if (password && password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (managerPin && (managerPin.length !== 4 || !/^\d{4}$/.test(managerPin))) {
      setError('El PIN debe ser exactamente 4 dígitos.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const body = { action: 'update', user_id: user.id, full_name: fullName.trim(), role }
      if (password.trim()) body.password = password.trim()
      const res = await fetch(EDGE_URL, { method: 'POST', headers: EDGE_HEADERS, body: JSON.stringify(body) })
      const result = await res.json()
      if (!res.ok) { setError(result.error || 'Error al guardar.'); return }
      if (managerPin) {
        await supabaseStaff.from('profiles').update({ manager_pin: managerPin }).eq('id', user.id)
      }
      onUpdated({ id: user.id, full_name: fullName.trim(), role })
      setEditing(false)
      setPassword('')
      setManagerPin('')
    } catch {
      setError('Error de red.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle() {
    const action = user.is_active !== false ? 'disable' : 'enable'
    const label = action === 'disable' ? 'deshabilitar' : 'habilitar'
    if (!confirm(`¿${label} al usuario ${user.full_name}?`)) return
    setToggling(true)
    try {
      const res = await fetch(EDGE_URL, { method: 'POST', headers: EDGE_HEADERS, body: JSON.stringify({ action, user_id: user.id }) })
      if (res.ok) onUpdated({ id: user.id, is_active: action === 'enable' })
    } catch {
      alert('Error de red.')
    } finally {
      setToggling(false)
    }
  }

  if (editing) {
    return (
      <div className="bg-carbon-900 border border-ember-500/40 rounded-xl p-4 space-y-3">
        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nombre completo" className="input w-full" />
        <select value={role} onChange={e => setRole(e.target.value)} className="input w-full">
          <option value="admin">Administrador</option>
          <option value="camarero">Camarero</option>
        </select>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Nueva contraseña (opcional)" className="input w-full" />
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={managerPin}
          onChange={e => setManagerPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="PIN de manager (4 dígitos, opcional)"
          className="input w-full"
        />
        {error && <p className="text-red-700 text-xs">{error}</p>}
        <div className="flex gap-2">
          <button onClick={() => { setEditing(false); setPassword(''); setManagerPin(''); setError('') }} className="flex-1 border border-carbon-700 text-smoke-400 py-2 rounded-xl text-sm">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-ember-500 text-white font-semibold py-2 rounded-xl text-sm disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-carbon-900 border border-carbon-700 rounded-xl px-4 py-3 flex items-center justify-between">
      <div>
        <p className="text-smoke-300 text-sm font-medium">{user.full_name}</p>
        <p className="text-smoke-500 text-xs mt-0.5">{new Date(user.created_at).toLocaleDateString('es-AR')}</p>
        {user.is_shared_account && (
          <p className="text-blue-700 text-[10px] mt-0.5 flex items-center gap-1"><UsersIcon size={11} /> Cuenta compartida</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs px-2.5 py-1 rounded-full border ${
          user.role === 'admin' || user.role === 'propietario'
            ? 'border-ember-500/40 text-ember-600'
            : 'border-carbon-600 text-smoke-400'
        }`}>
          {ROLE_LABELS[user.role] || user.role}
        </span>
        {user.role === 'camarero' && user.is_active !== false && (
          <button onClick={handleToggleShared} disabled={togglingShared} className="text-blue-700 text-xs underline disabled:opacity-50">
            {togglingShared ? '...' : user.is_shared_account ? 'Quitar compartida' : 'Marcar compartida'}
          </button>
        )}
        {user.is_active !== false && (
          <button onClick={() => setEditing(true)} className="text-smoke-400 text-xs underline">Editar</button>
        )}
        <button onClick={handleToggle} disabled={toggling} className="text-smoke-400 text-xs underline disabled:opacity-50">
          {toggling ? '...' : user.is_active !== false ? 'Deshabilitar' : 'Habilitar'}
        </button>
      </div>
    </div>
  )
}
