import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'

const ROLE_LABELS = {
  admin: 'Administrador',
  camarero: 'Camarero'
}

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('admin')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    const { data } = await supabaseStaff
      .from('profiles')
      .select('id, full_name, role, created_at')
      .in('role', ['admin', 'camarero'])
      .order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  async function handleInvite() {
    if (!email.trim() || !fullName.trim()) {
      setError('Completá el email y el nombre.')
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const { data: { session }, error: sessionError } = await supabaseStaff.auth.getSession()

      if (sessionError || !session) {
        setError(`Sin sesión activa: ${sessionError?.message || 'sesión nula'}. Intentá cerrar sesión y volver a entrar.`)
        setSubmitting(false)
        return
      }

      console.log('Token (primeros 20 chars):', session.access_token?.slice(0, 20))

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            email: email.trim(),
            full_name: fullName.trim(),
            role
          })
        }
      )

      const result = await res.json()
      console.log('Response status:', res.status, 'body:', JSON.stringify(result))

      if (!res.ok) {
        setError(`HTTP ${res.status}: ${result.error || result.message || JSON.stringify(result)}`)
      } else {
        setSuccess(`Invitación enviada a ${email.trim()}. El usuario recibirá un email para elegir su contraseña.`)
        setEmail('')
        setFullName('')
        setRole('admin')
        loadUsers()
      }
    } catch (err) {
      console.error('Error completo:', err)
      const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err) || 'error desconocido'
      setError(`Error: ${msg}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
        <p className="text-smoke-400 text-sm">Cargando usuarios...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-carbon-950 pb-10">
      <header className="px-5 pt-5 pb-4 border-b border-carbon-700">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-ember-500 tracking-wide">USUARIOS</h1>
          <Link to="/admin" className="text-smoke-400 text-xs underline">
            ← Volver
          </Link>
        </div>
      </header>

      <main className="px-5 mt-4 space-y-6">
        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5">
          <p className="text-smoke-300 font-medium text-sm mb-4">Invitar nuevo usuario</p>

          <div className="space-y-3">
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Nombre completo"
              className="input w-full"
            />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              className="input w-full"
            />
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="input w-full"
            >
              <option value="admin">Administrador</option>
              <option value="camarero">Camarero</option>
            </select>
          </div>

          {error && <p className="text-red-700 text-xs mt-3">{error}</p>}
          {success && <p className="text-emerald-700 text-xs mt-3">{success}</p>}

          <button
            onClick={handleInvite}
            disabled={submitting}
            className="w-full mt-4 bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl"
          >
            {submitting ? 'Enviando invitación...' : 'Enviar invitación por email'}
          </button>
        </div>

        <div>
          <p className="text-smoke-400 text-xs font-semibold uppercase tracking-wide mb-2">
            Usuarios actuales · {users.length}
          </p>
          <div className="space-y-2">
            {users.map(user => (
              <div
                key={user.id}
                className="bg-carbon-900 border border-carbon-700 rounded-xl px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-smoke-300 text-sm font-medium">{user.full_name}</p>
                  <p className="text-smoke-500 text-xs mt-0.5">
                    {new Date(user.created_at).toLocaleDateString('es-AR')}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border ${
                  user.role === 'admin'
                    ? 'border-ember-500/40 text-ember-600'
                    : 'border-carbon-600 text-smoke-400'
                }`}>
                  {ROLE_LABELS[user.role]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
