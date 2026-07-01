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

  // Login existente
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Registro nuevo por email
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [regSent, setRegSent] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    const { data, error } = await signInWithEmail(email, password)
    setLoginLoading(false)
    if (error) {
      setLoginError('Email o contraseña incorrectos.')
      return
    }
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

  async function handleRegister(e) {
    e.preventDefault()
    setRegError('')
    setRegLoading(true)
    const { data, error } = await supabaseStaff.auth.signUp({
      email: regEmail.trim(),
      password: regPassword,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?type=admin` }
    })
    setRegLoading(false)
    if (error) {
      setRegError(error.message)
      return
    }
    // Si hay sesión activa inmediatamente (email confirmation deshabilitado)
    if (data.session) {
      navigate('/admin/onboarding')
    } else {
      setRegSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-carbon-950 flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm space-y-4">

        {/* Logo */}
        <div className="text-center mb-2">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white shadow-md p-2">
            <img src="/icon-512.png" alt="Capy" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-display text-3xl tracking-wide text-ember-500">CAPY</h1>
        </div>

        {/* Card: ya tengo cuenta */}
        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5 space-y-3">
          <p className="text-smoke-300 font-semibold text-sm">Ya tengo cuenta</p>
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
            Continuar con Google
          </button>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-carbon-700" />
            <span className="text-smoke-600 text-xs">o con email</span>
            <div className="flex-1 h-px bg-carbon-700" />
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <label className="block">
              <span className="text-smoke-500 text-xs mb-1 block">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
              />
            </label>
            <label className="block">
              <span className="text-smoke-500 text-xs mb-1 block">Contraseña</span>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
              />
            </label>
            {loginError && <p className="text-red-700 text-xs">{loginError}</p>}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm"
            >
              {loginLoading ? 'Cargando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-carbon-700" />
          <span className="text-smoke-600 text-xs">¿Nuevo en Capy?</span>
          <div className="flex-1 h-px bg-carbon-700" />
        </div>

        {/* Card: registro nuevo restaurante */}
        <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5 space-y-3">
          <p className="text-smoke-300 font-semibold text-sm">Registrá tu Local</p>

          {regSent ? (
            <div className="bg-ember-500/10 border border-ember-500/20 rounded-xl p-4 text-center">
              <p className="text-smoke-300 text-sm font-medium mb-1">Revisá tu email</p>
              <p className="text-smoke-500 text-xs">Te mandamos un link para confirmar tu cuenta y continuar.</p>
            </div>
          ) : (
            <>
              {/* Google */}
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
                Continuar con Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-carbon-700" />
                <span className="text-smoke-600 text-xs">o con email</span>
                <div className="flex-1 h-px bg-carbon-700" />
              </div>

              {/* Email registration */}
              <form onSubmit={handleRegister} className="space-y-3">
                <label className="block">
                  <span className="text-smoke-500 text-xs mb-1 block">Email</span>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    className="input"
                  />
                </label>
                <label className="block">
                  <span className="text-smoke-500 text-xs mb-1 block">Contraseña</span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="input"
                  />
                </label>
                {regError && <p className="text-red-700 text-xs">{regError}</p>}
                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm"
                >
                  {regLoading ? 'Creando cuenta...' : 'Crear cuenta'}
                </button>
              </form>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
