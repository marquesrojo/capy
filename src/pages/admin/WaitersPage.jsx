import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`

const SORT_ICONS = {
  xp: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  pedidos: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  rating: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
}

export default function WaitersPage() {
  const { profile, venueId } = useAuth()
  const [tab, setTab] = useState('camareros')
  const [vinculados, setVinculados] = useState([])
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [comparativa, setComparativa] = useState([])
  const [compSort, setCompSort] = useState('xp')
  const [compLoading, setCompLoading] = useState(false)

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

  useEffect(() => {
    if (tab === 'comparativa' && venueId) loadComparativa()
  }, [tab, venueId])

  async function loadComparativa() {
    setCompLoading(true)

    const { data: staffList } = await supabaseStaff
      .from('staff_names')
      .select('id, full_name, alias, xp, total_orders')
      .eq('venue_id', venueId)
      .eq('is_active', true)

    if (!staffList?.length) { setComparativa([]); setCompLoading(false); return }

    const ids = staffList.map(s => s.id)
    const { data: feedbacks } = await supabaseStaff
      .from('order_feedback')
      .select('staff_id, rating')
      .in('staff_id', ids)

    const ratingMap = {}
    if (feedbacks) {
      for (const f of feedbacks) {
        if (!ratingMap[f.staff_id]) ratingMap[f.staff_id] = []
        ratingMap[f.staff_id].push(f.rating)
      }
    }

    const rows = staffList.map(s => {
      const ratings = ratingMap[s.id] || []
      const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : null
      return { ...s, avgRating, totalRatings: ratings.length }
    })

    setComparativa(rows)
    setCompLoading(false)
  }

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
          { id: 'comparativa', label: 'Comparativa' },
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

          {tab === 'comparativa' && (
            <div>
              {/* Sort controls */}
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
