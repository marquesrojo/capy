import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabaseStaff } from '../../lib/supabase'

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

    const { error: loginError } = await supabaseStaff.auth.signInWithPassword({
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
    <div className="min-h-screen bg-[#F0F4F8] px-6 py-10">
      <Link to="/camaut" className="text-[#8896A5] text-sm">← Volver</Link>

      <div className="mt-6 mb-8">
        <h1 className="font-bold text-[#1A2A3A] text-2xl mb-1">Bienvenido de vuelta</h1>
        <p className="text-[#8896A5] text-sm">Iniciá sesión en tu cuenta</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide block mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm bg-white text-[#1A2A3A]"
            required
          />
        </div>
        <div>
          <label className="text-[#8896A5] text-xs font-semibold uppercase tracking-wide block mb-1.5">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Tu contraseña"
            className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm bg-white text-[#1A2A3A]"
            required
          />
        </div>
        {error && <p className="text-red-600 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#008080] disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base"
        >
          {loading ? 'Entrando...' : 'Entrar →'}
        </button>
      </form>

      <p className="text-[#8896A5] text-xs text-center mt-6">
        ¿No tenés cuenta?{' '}
        <Link to="/camaut/registro" className="text-[#008080] underline">Registrate gratis</Link>
      </p>
    </div>
  )
}
