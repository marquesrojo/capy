import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabaseStaff } from '../../lib/supabase'

export default function AdminLoginPage() {
  const { signInWithEmail } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error } = await signInWithEmail(email, password)
    setLoading(false)
    if (error) {
      setError('Email o contraseña incorrectos.')
      return
    }
    // Leer el perfil directamente para saber el rol antes de redirigir
    const userId = data?.user?.id || data?.session?.user?.id
    if (userId) {
      const { data: profile } = await supabaseStaff
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      if (profile?.role === 'camarero') {
        navigate('/admin/tomar')
        return
      }
    }
    navigate('/admin')
  }

  return (
    <div className="min-h-screen bg-carbon-950 flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="/icon-512.png"
            alt="Capy"
            className="w-28 h-28 mx-auto mb-2"
          />
          <h1 className="font-display text-3xl tracking-wide text-ember-500">CAPY</h1>
          <p className="text-smoke-400 text-xs mt-1">Acceso de camareros y administración</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-carbon-900 border border-carbon-700 rounded-2xl p-6 space-y-4"
        >
          <label className="block">
            <span className="text-smoke-400 text-xs mb-1.5 block">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input"
            />
          </label>
          <label className="block">
            <span className="text-smoke-400 text-xs mb-1.5 block">Contraseña</span>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input"
            />
          </label>
          {error && <p className="text-red-700 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl"
          >
            {loading ? 'Cargando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
