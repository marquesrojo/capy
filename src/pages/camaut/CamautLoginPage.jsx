import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabaseCamaut } from '../../lib/supabase'

export default function CamautLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
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
