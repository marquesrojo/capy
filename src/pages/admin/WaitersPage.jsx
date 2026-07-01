import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`

export default function WaitersPage() {
  const { profile, venueId } = useAuth()
  const [tab, setTab] = useState('camareros')
  const [vinculados, setVinculados] = useState([])
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)

  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const isAdmin = profile?.role === 'admin' || profile?.role === 'propietario'

  useEffect(() => {
    if (!venueId) return
    loadAll()
  }, [venueId])

  async function loadAll() {
    setLoading(true)
    const [vinculadosRes, adminsRes] = await Promise.all([
      supabaseStaff
        .from('venue_staff')
        .select('id, status, joined_at, profile:profiles(id, full_name)')
        .eq('venue_id', venueId)
        .eq('status', 'active'),
      supabaseStaff
        .from('profiles')
        .select('id, full_name, role, created_at')
        .in('role', ['admin', 'propietario'])
        .order('full_name')
    ])
    setVinculados(vinculadosRes.data || [])
    setAdmins(adminsRes.data || [])
    setLoading(false)
  }

  async function desvincular(id) {
    if (!confirm('¿Desvincular este camarero?')) return
    await supabaseStaff
      .from('venue_staff')
      .update({ status: 'inactive', left_at: new Date().toISOString() })
      .eq('id', id)
    setVinculados(prev => prev.filter(v => v.id !== id))
  }

  async function createAdmin(e) {
    e.preventDefault()
    if (!newEmail || !newName || !newPassword) { setCreateError('Completá todos los campos'); return }
    setCreating(true)
    setCreateError('')
    const res = await fetch(EDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
      body: JSON.stringify({ action: 'create', email: newEmail, full_name: newName, role: 'admin', password: newPassword })
    })
    const data = await res.json()
    if (data.error) { setCreateError(data.error); setCreating(false); return }
    setNewEmail(''); setNewName(''); setNewPassword('')
    loadAll()
    setCreating(false)
  }

  return (
    <div className="min-h-screen bg-carbon-950 px-5 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/configuracion" className="text-smoke-500 text-sm">← Volver</Link>
      </div>
      <h1 className="font-display text-3xl text-ember-500 tracking-wide mb-6">USUARIOS</h1>

      <div className="flex gap-2 mb-6">
        {[
          { id: 'camareros', label: 'Capy Camarero' },
          { id: 'admins', label: 'Administradores' },
        ].map(t => (
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

      {loading ? (
        <p className="text-smoke-500 text-sm">Cargando...</p>
      ) : (
        <>
          {tab === 'camareros' && (
            <div className="space-y-3">
              <p className="text-smoke-500 text-xs mb-4">
                Camareros vinculados via código de invitación desde{' '}
                <Link to="/admin/qr" className="text-ember-500 underline">Config → Códigos QR</Link>.
              </p>
              {vinculados.length === 0 ? (
                <p className="text-smoke-600 text-sm text-center py-8">No hay camareros vinculados todavía.</p>
              ) : (
                vinculados.map(v => (
                  <div key={v.id} className="bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-smoke-200 font-semibold text-sm">{v.profile?.full_name || 'Sin nombre'}</p>
                      <p className="text-smoke-500 text-xs">
                        Desde {new Date(v.joined_at).toLocaleDateString('es-AR')}
                      </p>
                    </div>
                    <button onClick={() => desvincular(v.id)} className="text-red-400 text-xs underline">
                      Desvincular
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'admins' && isAdmin && (
            <div className="space-y-4">
              <div className="space-y-2">
                {admins.map(u => (
                  <AdminCard key={u.id} user={u} currentUserId={profile?.id} onUpdated={loadAll} />
                ))}
                {admins.length === 0 && (
                  <p className="text-smoke-600 text-sm text-center py-4">No hay administradores cargados.</p>
                )}
              </div>

              <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 mt-4">
                <p className="text-smoke-300 font-semibold text-sm mb-3">Crear nuevo administrador</p>
                <form onSubmit={createAdmin} className="space-y-2">
                  <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="Nombre completo" className="input w-full" />
                  <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                    placeholder="Email" className="input w-full" />
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    placeholder="Contraseña" className="input w-full" />
                  {createError && <p className="text-red-500 text-xs">{createError}</p>}
                  <button type="submit" disabled={creating}
                    className="w-full bg-ember-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm">
                    {creating ? 'Creando...' : 'Crear administrador'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {tab === 'admins' && !isAdmin && (
            <p className="text-smoke-600 text-sm text-center py-8">Solo los administradores pueden gestionar usuarios.</p>
          )}
        </>
      )}
    </div>
  )
}

function AdminCard({ user, currentUserId, onUpdated }) {
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(user.full_name)
  const [saving, setSaving] = useState(false)
  const isMe = user.id === currentUserId

  async function handleSave() {
    setSaving(true)
    await supabaseStaff.from('profiles').update({ full_name: fullName.trim() }).eq('id', user.id)
    setSaving(false)
    setEditing(false)
    onUpdated()
  }

  async function handleSuspend() {
    if (!confirm(`¿Suspender a ${user.full_name}?`)) return
    await supabaseStaff.from('profiles').update({ role: 'suspendido' }).eq('id', user.id)
    onUpdated()
  }

  const roleLabel = user.role === 'propietario' ? 'Propietario' : 'Admin'

  return (
    <div className="bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-3">
      {editing ? (
        <div className="space-y-2">
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className="input w-full text-sm"
          />
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-ember-500 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-xl">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={() => setEditing(false)}
              className="flex-1 border border-carbon-700 text-smoke-400 text-xs py-2 rounded-xl">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-smoke-200 font-semibold text-sm">
              {user.full_name || user.id.slice(0, 8)}
              {isMe && <span className="ml-2 text-ember-500 text-xs">(vos)</span>}
            </p>
            <p className="text-smoke-500 text-xs">{roleLabel}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setEditing(true)} className="text-ember-500 text-xs underline">Editar</button>
            {!isMe && (
              <button onClick={handleSuspend} className="text-red-400 text-xs underline">Suspender</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
