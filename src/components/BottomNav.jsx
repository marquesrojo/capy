import { NavLink } from 'react-router-dom'
import { useClientBase } from '../hooks/useVenue'

export default function BottomNav() {
  const base = useClientBase()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-carbon-950 border-t border-carbon-700 flex z-20">
      <NavTab to={`${base}/carta`} label="Carta" icon="🍽️" />
      <NavTab to={`${base}/pedidos`} label="Pedidos" icon="🧾" />
    </nav>
  )
}

function NavTab({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors ${
          isActive ? 'text-pucara-blue-500' : 'text-smoke-500'
        }`
      }
    >
      <span className="text-base leading-none">{icon}</span>
      {label}
    </NavLink>
  )
}
