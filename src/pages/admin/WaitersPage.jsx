import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`

export default function WaitersPage() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('camareros')
  const [vinculados, setVinculados] = useState([])
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)

  // Crear admin
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const [vinculadosRes, adminsRes] = await Promise.all([
      supabaseStaff
        .from('venue_staff')
        .select('id, status, joined_at, profile:profiles(id, full_name)')
        .eq('venue_id', ACTIVE_VENUE_ID)
        .eq('status', 'active'),
      supabaseStaff
        .from('profiles')
        .select('id, full_name, role, created_at')
        .eq('role', 'admin')
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
          { id: 'admins', label: 'Admins' },
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
          {/* Capy Camarero vinculados */}
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

          {/* Admins */}
          {tab === 'admins' && profile?.role === 'admin' && (
            <div className="space-y-4">
              {/* Lista de admins */}
              <div className="space-y-2">
                {admins.map(u => (
                  <div key={u.id} className="bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-3">
                    <p className="text-smoke-200 font-semibold text-sm">{u.full_name}</p>
                    <p className="text-smoke-500 text-xs capitalize">{u.role}</p>
                  </div>
                ))}
              </div>

              {/* Crear admin */}
              <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-4 mt-4">
                <p className="text-smoke-300 font-semibold text-sm mb-3">Crear nuevo admin</p>
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
                    {creating ? 'Creando...' : 'Crear admin'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {tab === 'admins' && profile?.role !== 'admin' && (
            <p className="text-smoke-600 text-sm text-center py-8">Solo los admins pueden gestionar usuarios.</p>
          )}
        </>
      )}
    </div>
  )
}
