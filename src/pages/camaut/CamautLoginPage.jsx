import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabaseCamaut } from '../../lib/supabase'

export default function CamautLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: loginError } = await supabaseCamaut.auth.signInWithPassword({
      email: email.trim(),
      password
    })

    if (loginError) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }

    navigate('/camaut/app')
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    await supabaseCamaut.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/camaut/callback`
      }
    })
  }

  return (
    <div className="min-h-screen bg-carbon-950 px-5 py-10 flex flex-col">
      <Link to="/camaut" className="text-smoke-500 text-sm">← Volver</Link>

      <div className="text-center my-8">
        <img
          src="https://ycgptakgpsvmstoftkdk.supabase.co/storage/v1/object/public/icons/icon-512.png"
          alt="Capy" className="w-16 h-16 mx-auto mb-3 rounded-xl"
        />
        <p className="font-display text-3xl text-ember-500 tracking-wide">CAPY</p>
        <p className="text-smoke-500 text-xs tracking-widest uppercase mt-1">Camarero</p>
      </div>

      <h1 className="font-bold text-smoke-200 text-xl mb-1">Bienvenido de vuelta</h1>
      <p className="text-smoke-500 text-sm mb-6">Iniciá sesión en tu cuenta</p>

      {/* Google */}
      <button
        onClick={handleGoogleLogin}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 bg-white disabled:opacity-60 text-[#1A1A1A] font-semibold py-3.5 rounded-2xl text-sm mb-4 border border-black/10"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {googleLoading ? 'Redirigiendo...' : 'Continuar con Google'}
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-carbon-700" />
        <span className="text-smoke-600 text-xs">o con email</span>
        <div className="flex-1 h-px bg-carbon-700" />
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="text-smoke-500 text-xs font-semibold uppercase tracking-wide block mb-1.5">Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="input w-full"
            required
          />
        </div>
        <div>
          <label className="text-smoke-500 text-xs font-semibold uppercase tracking-wide block mb-1.5">Contraseña</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Tu contraseña"
            className="input w-full"
            required
          />
        </div>
        {error && <p className="text-red-600 text-xs">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base">
          {loading ? 'Entrando...' : 'Entrar →'}
        </button>
      </form>

      <p className="text-smoke-500 text-xs text-center mt-6">
        ¿No tenés cuenta?{' '}
        <Link to="/camaut/registro" className="text-ember-500 underline">Registrate gratis</Link>
      </p>
    </div>
  )
}
