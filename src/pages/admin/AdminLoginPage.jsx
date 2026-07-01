import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabaseStaff } from '../../lib/supabase'

async function signInWithGoogle() {
  await supabaseStaff.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback?type=admin` }
  })
}

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
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-carbon-700" />
            <span className="text-smoke-600 text-xs">o</span>
            <div className="flex-1 h-px bg-carbon-700" />
          </div>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-2 border border-carbon-600 bg-carbon-800 hover:bg-carbon-700 text-smoke-300 font-medium py-3 rounded-xl text-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Entrar con Google
          </button>
        </form>
      </div>
    </div>
  )
}
