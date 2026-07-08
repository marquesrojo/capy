// Central SVG icon library — all icons accept { size=20, className='', strokeWidth=1.8, ...props }
// Standard: viewBox 0 0 24 24, fill none, stroke currentColor, round linecap/join

function Icon({ size = 20, className = '', strokeWidth = 1.8, children, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {children}
    </svg>
  )
}

// ── Navigation ─────────────────────────────────────────────────────────────────

export function UtensilsIcon(p) {
  return (
    <Icon {...p}>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
      <path d="M7 2v20"/>
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3v7"/>
    </Icon>
  )
}

export function ReceiptIcon(p) {
  return (
    <Icon {...p}>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/>
      <path d="M14 8H8"/>
      <path d="M16 12H8"/>
      <path d="M13 16H8"/>
    </Icon>
  )
}

// ── Communication ──────────────────────────────────────────────────────────────

export function BellIcon(p) {
  return (
    <Icon {...p}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </Icon>
  )
}

export function MessageIcon(p) {
  return (
    <Icon {...p}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </Icon>
  )
}

// ── Location ───────────────────────────────────────────────────────────────────

export function PinIcon(p) {
  return (
    <Icon {...p}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3"/>
    </Icon>
  )
}

// ── Actions ────────────────────────────────────────────────────────────────────

export function ClipboardIcon(p) {
  return (
    <Icon {...p}>
      <rect width="8" height="4" x="8" y="2" rx="1"/>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <path d="M9 12h6"/>
      <path d="M9 16h4"/>
    </Icon>
  )
}

export function HelpCircleIcon(p) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <path d="M12 17h.01"/>
    </Icon>
  )
}

export function FileTextIcon(p) {
  return (
    <Icon {...p}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
      <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
      <path d="M10 9H8"/>
      <path d="M16 13H8"/>
      <path d="M16 17H8"/>
    </Icon>
  )
}

export function PaperclipIcon(p) {
  return (
    <Icon {...p}>
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
    </Icon>
  )
}

export function CameraIcon(p) {
  return (
    <Icon {...p}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
      <circle cx="12" cy="13" r="3"/>
    </Icon>
  )
}

export function SearchIcon(p) {
  return (
    <Icon {...p}>
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.3-4.3"/>
    </Icon>
  )
}

export function PhoneIcon(p) {
  return (
    <Icon {...p}>
      <rect width="14" height="20" x="5" y="2" rx="2"/>
      <path d="M12 18h.01"/>
    </Icon>
  )
}

export function ShoppingBagIcon(p) {
  return (
    <Icon {...p}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </Icon>
  )
}

export function CreditCardIcon(p) {
  return (
    <Icon {...p}>
      <rect width="20" height="14" x="2" y="5" rx="2"/>
      <line x1="2" y1="10" x2="22" y2="10"/>
    </Icon>
  )
}

// ── Status ─────────────────────────────────────────────────────────────────────

export function ClockIcon(p) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </Icon>
  )
}

export function CheckCircleIcon(p) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="12" r="10"/>
      <path d="m9 12 2 2 4-4"/>
    </Icon>
  )
}

export function XCircleIcon(p) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="12" r="10"/>
      <path d="m15 9-6 6"/>
      <path d="m9 9 6 6"/>
    </Icon>
  )
}

export function AlertIcon(p) {
  return (
    <Icon {...p}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>
      <path d="M12 9v4"/>
      <path d="M12 17h.01"/>
    </Icon>
  )
}

export function CheckIcon(p) {
  return (
    <Icon {...p}>
      <path d="M20 6 9 17l-5-5"/>
    </Icon>
  )
}

export function XIcon(p) {
  return (
    <Icon {...p}>
      <path d="M18 6 6 18"/>
      <path d="m6 6 12 12"/>
    </Icon>
  )
}

// ── People ─────────────────────────────────────────────────────────────────────

export function UsersIcon(p) {
  return (
    <Icon {...p}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </Icon>
  )
}

export function ChefHatIcon(p) {
  return (
    <Icon {...p}>
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/>
      <line x1="6" y1="17" x2="18" y2="17"/>
    </Icon>
  )
}

// ── Content ────────────────────────────────────────────────────────────────────

export function SunIcon(p) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2"/>
      <path d="M12 20v2"/>
      <path d="m4.93 4.93 1.41 1.41"/>
      <path d="m17.66 17.66 1.41 1.41"/>
      <path d="M2 12h2"/>
      <path d="M20 12h2"/>
      <path d="m6.34 17.66-1.41 1.41"/>
      <path d="m19.07 4.93-1.41 1.41"/>
    </Icon>
  )
}

export function StarIcon(p) {
  return (
    <Icon {...p}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </Icon>
  )
}

export function InboxIcon(p) {
  return (
    <Icon {...p}>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
    </Icon>
  )
}

export function BoltIcon(p) {
  return (
    <Icon {...p}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </Icon>
  )
}

export function CalendarIcon(p) {
  return (
    <Icon {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </Icon>
  )
}

// ── Rank level icons ───────────────────────────────────────────────────────────

export function RankShieldIcon(p) {
  return (
    <Icon {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </Icon>
  )
}

export function RankFlameIcon(p) {
  return (
    <Icon {...p}>
      <path d="M8.5 14.5a5.5 5.5 0 0 0 11 0c0-3.5-2.5-6.5-5-9-1 2-2 3.5-3 4C11 8 10.5 5.5 9 3 6.5 6.5 8.5 11 8.5 14.5Z"/>
      <path d="M12 18c-1.5 0-2.5-1-2.5-2.5S11 13 12 12c1 1 2.5 1.5 2.5 3.5S13.5 18 12 18Z"/>
    </Icon>
  )
}

export function RankCrownIcon(p) {
  return (
    <Icon {...p}>
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z"/>
      <path d="M5 20h14"/>
    </Icon>
  )
}

export function RankTrophyIcon(p) {
  return (
    <Icon {...p}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/>
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
    </Icon>
  )
}

// Map level number → icon component
export function RankIcon({ level, ...rest }) {
  if (level === 1) return <RankShieldIcon {...rest} />
  if (level === 2) return <RankFlameIcon {...rest} />
  if (level === 3) return <RankCrownIcon {...rest} />
  return <RankTrophyIcon {...rest} />
}

export const RANK_COLORS = {
  1: '#94A3B8',
  2: '#F59E0B',
  3: '#8B5CF6',
  4: '#E15C23',
}

export const DEFAULT_RANKS = [
  { level: 1, name: 'Cliente Inicial', min_orders: 0, prize: null },
  { level: 2, name: 'Foodie Recurrente', min_orders: 3, prize: null },
  { level: 3, name: 'Crítico VIP', min_orders: 7, prize: null },
  { level: 4, name: 'Leyenda del Salón', min_orders: 15, prize: null },
]

// ── Medal icons (🥇🥈🥉) ───────────────────────────────────────────────────────

const MEDAL_PALETTE = {
  1: { outer: '#D4A017', inner: '#FFD700', text: '#7A5000' },
  2: { outer: '#9E9E9E', inner: '#E0E0E0', text: '#424242' },
  3: { outer: '#A0622A', inner: '#CE8E55', text: '#5C3518' },
}

export function MedalIcon({ rank = 1, size = 28 }) {
  const c = MEDAL_PALETTE[rank] || MEDAL_PALETTE[3]
  return (
    <svg width={size} height={size} viewBox="0 0 28 32" fill="none">
      {/* Ribbon */}
      <path d="M10 1h8l-2 8H12L10 1z" fill={c.outer}/>
      <path d="M11.5 1h5l-1.5 7H13L11.5 1z" fill={c.inner}/>
      {/* Connector */}
      <line x1="14" y1="9" x2="14" y2="12" stroke={c.outer} strokeWidth="2"/>
      {/* Medal body */}
      <circle cx="14" cy="22" r="9" fill={c.outer}/>
      <circle cx="14" cy="22" r="7.5" fill={c.inner}/>
      <circle cx="14" cy="22" r="5.5" fill="none" stroke={c.outer} strokeWidth="0.8" opacity="0.6"/>
      {/* Rank number */}
      <text
        x="14"
        y="27"
        textAnchor="middle"
        fontSize="8"
        fontWeight="900"
        fontFamily="system-ui, sans-serif"
        fill={c.text}
      >
        {rank}
      </text>
    </svg>
  )
}
