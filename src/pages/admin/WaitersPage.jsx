import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { formatPrice } from '../../lib/utils'

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`

export default function WaitersPage() {
  const [tab, setTab] = useState('vinculados')
  const [vinculados, setVinculados] = useState([])
  const [staffNames, setStaffNames] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const [vinculadosRes, staffRes, usersRes] = await Promise.all([
      // Camareros camaut vinculados
      supabaseStaff
        .from('venue_staff')
        .select('id, status, joined_at, profile:profiles(id, full_name, venue_id)')
        .eq('venue_id', ACTIVE_VENUE_ID)
        .eq('status', 'active'),
      // Staff names (para asignar a pedidos)
      supabaseStaff
        .from('staff_names')
        .select('id, full_name, is_active, created_at')
        .eq('venue_id', ACTIVE_VENUE_ID)
        .order('full_name'),
      // Usuarios con login directo
      supabaseStaff
        .from('profiles')
        .select('id, full_name, role, created_at')
        .in('role', ['admin', 'camarero'])
        .order('role')
    ])
    setVinculados(vinculadosRes.data || [])
    setStaffNames(staffRes.data || [])
    setUsers(usersRes.data || [])
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

  async function toggleStaff(id, isActive) {
    await supabaseStaff.from('staff_names').update({ is_active: !isActive }).eq('id', id)
    setStaffNames(prev => prev.map(s => s.id === id ? { ...s, is_active: !isActive } : s))
  }

  return (
    <div className="min-h-screen bg-carbon-950 px-5 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/configuracion" className="text-smoke-500 text-sm">← Volver</Link>
      </div>
      <h1 className="font-display text-3xl text-ember-500 tracking-wide mb-6">CAMAREROS</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'vinculados', label: 'Capy Camarero' },
          { id: 'staff', label: 'Nombres' },
          { id: 'usuarios', label: 'Usuarios' },
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
          {tab === 'vinculados' && (
            <div className="space-y-3">
              <p className="text-smoke-500 text-xs mb-4">
                Camareros autónomos vinculados via código de invitación. Para invitar nuevos, compartí el código desde{' '}
                <Link to="/admin/configuracion/qr" className="text-ember-500 underline">Config → QR</Link>.
              </p>
              {vinculados.length === 0 ? (
                <p className="text-smoke-600 text-sm text-center py-8">No hay camareros vinculados todavía.</p>
              ) : (
                vinculados.map(v => (
                  <div key={v.id} className="bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-smoke-200 font-semibold text-sm">{v.profile?.full_name || 'Sin nombre'}</p>
                      <p className="text-smoke-500 text-xs">
                        Vinculado desde {new Date(v.joined_at).toLocaleDateString('es-AR')}
                      </p>
                    </div>
                    <button
                      onClick={() => desvincular(v.id)}
                      className="text-red-400 text-xs underline"
                    >
                      Desvincular
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Staff names */}
          {tab === 'staff' && (
            <div className="space-y-3">
              <p className="text-smoke-500 text-xs mb-4">
                Nombres que aparecen en el selector de pedidos del kanban.
              </p>
              {staffNames.map(s => (
                <div key={s.id} className="bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className={`font-semibold text-sm ${s.is_active ? 'text-smoke-200' : 'text-smoke-600 line-through'}`}>
                      {s.full_name}
                    </p>
                    <p className="text-smoke-500 text-xs">{s.is_active ? 'Activo' : 'Inactivo'}</p>
                  </div>
                  <button
                    onClick={() => toggleStaff(s.id, s.is_active)}
                    className={`text-xs underline ${s.is_active ? 'text-red-400' : 'text-emerald-500'}`}
                  >
                    {s.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              ))}
              {staffNames.length === 0 && (
                <p className="text-smoke-600 text-sm text-center py-8">No hay nombres registrados.</p>
              )}
            </div>
          )}

          {/* Usuarios con login */}
          {tab === 'usuarios' && (
            <div className="space-y-3">
              <p className="text-smoke-500 text-xs mb-4">
                Cuentas con acceso directo al panel. Usá esto solo para admins.
              </p>
              {users.map(u => (
                <div key={u.id} className="bg-carbon-900 border border-carbon-700 rounded-2xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-smoke-200 font-semibold text-sm">{u.full_name}</p>
                    <p className="text-smoke-500 text-xs capitalize">{u.role}</p>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <p className="text-smoke-600 text-sm text-center py-8">No hay usuarios.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
