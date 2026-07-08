import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { UsersIcon } from '../../components/Icons'

const ROLE_LABELS = { admin: 'Administrador', camarero: 'Camarero' }

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`
const EDGE_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'x-capy-secret': import.meta.env.VITE_CAPY_ADMIN_SECRET
}

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('admin')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    const { data } = await supabaseStaff
      .from('profiles')
      .select('id, full_name, role, is_active, is_shared_account, created_at')
      .in('role', ['admin', 'camarero'])
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

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

  function handleUpdated(updated) {
    setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
        <p className="text-smoke-400 text-sm">Cargando usuarios...</p>
      </div>
    )
  }

  const activeUsers = users.filter(u => u.is_active !== false)
  const inactiveUsers = users.filter(u => u.is_active === false)

  return (
    <div className="min-h-screen bg-carbon-950 pb-10">
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">USUARIOS</h1>
          <Link to="/admin" className="text-smoke-400 text-xs underline">← Volver</Link>
        </div>
      </header>

      <main className="px-5 mt-4 space-y-6">
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

        <div>
          <p className="text-smoke-400 text-xs font-semibold uppercase tracking-wide mb-2">
            Activos · {activeUsers.length}
          </p>
          <div className="space-y-2">
            {activeUsers.map(user => (
              <UserRow key={user.id} user={user} onUpdated={handleUpdated} />
            ))}
          </div>
        </div>

        {inactiveUsers.length > 0 && (
          <div>
            <p className="text-smoke-500 text-xs font-semibold uppercase tracking-wide mb-2">
              Deshabilitados · {inactiveUsers.length}
            </p>
            <div className="space-y-2 opacity-50">
              {inactiveUsers.map(user => (
                <UserRow key={user.id} user={user} onUpdated={handleUpdated} />
              ))}
            </div>
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
    setSaving(true)
    setError('')
    try {
      const body = { action: 'update', user_id: user.id, full_name: fullName.trim(), role }
      if (password.trim()) body.password = password.trim()
      const res = await fetch(EDGE_URL, { method: 'POST', headers: EDGE_HEADERS, body: JSON.stringify(body) })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error || 'Error al guardar.')
      } else {
        onUpdated({ id: user.id, full_name: fullName.trim(), role })
        setEditing(false)
        setPassword('')
      }
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
      if (res.ok) {
        onUpdated({ id: user.id, is_active: action === 'enable' })
      }
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
        {error && <p className="text-red-700 text-xs">{error}</p>}
        <div className="flex gap-2">
          <button onClick={() => { setEditing(false); setPassword(''); setError('') }} className="flex-1 border border-carbon-700 text-smoke-400 py-2 rounded-xl text-sm">
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
          <p className="text-blue-700 text-[10px] mt-0.5 flex items-center gap-1"><UsersIcon size={11} /> Cuenta compartida (toma de pedido)</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs px-2.5 py-1 rounded-full border ${user.role === 'admin' ? 'border-ember-500/40 text-ember-600' : 'border-carbon-600 text-smoke-400'}`}>
          {ROLE_LABELS[user.role]}
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
