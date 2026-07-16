import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabaseStaff } from '../../lib/supabase'

async function signInWithGoogle() {
  await supabaseStaff.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` }
  })
}

function scrollToForm() {
  document.getElementById('lp-form')?.scrollIntoView({ behavior: 'smooth' })
}

// ── SVG icons ──────────────────────────────────────────────────────────────
const Icon = ({ d, size = 17, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    {...props}>
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
)

const icons = {
  qr: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/>
      <rect x="3" y="16" width="5" height="5" rx="1"/>
      <path d="M21 16h-3v3"/><path d="M18 21v-2"/><path d="M16 18h2"/>
    </svg>
  ),
  book: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      <line x1="8" y1="8" x2="14" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  ),
  cart: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  ),
  refresh: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  ),
  bell: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  users: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  card: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  calendar: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  location: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  kanban: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M9 3v18"/><path d="M15 3v18"/>
    </svg>
  ),
  grid: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  chat: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  chatLines: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      <line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="12" y2="13"/>
    </svg>
  ),
  flame: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
    </svg>
  ),
  clipboard: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 14l2 2 4-4"/>
    </svg>
  ),
  checkCircle: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  barChart: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  calendarDots: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/>
      <path d="M8 18h.01"/><path d="M12 18h.01"/>
    </svg>
  ),
  scanCorners: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
      <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
      <rect x="7" y="7" width="3" height="3" rx=".5"/>
      <rect x="14" y="7" width="3" height="3" rx=".5"/>
      <rect x="7" y="14" width="3" height="3" rx=".5"/>
      <path d="M14 14h3v3"/>
    </svg>
  ),
}

// ── Feature item ────────────────────────────────────────────────────────────
function FeatItem({ icon: IconComp, name, desc, tag, tagColor, iconColor }) {
  const bgMap = {
    teal:    { bg: 'rgba(13,148,136,.1)',  color: '#0D9488' },
    blue:    { bg: '#DBEAFE',              color: '#2563EB' },
    emerald: { bg: '#D1FAE5',              color: '#059669' },
    amber:   { bg: '#FEF3C7',              color: '#D97706' },
  }
  const tagMap = {
    teal:    { bg: 'rgba(13,148,136,.1)',  color: '#0D9488' },
    blue:    { bg: '#DBEAFE',              color: '#2563EB' },
    green:   { bg: '#D1FAE5',              color: '#059669' },
    amber:   { bg: '#FEF3C7',              color: '#D97706' },
  }
  const ic = bgMap[iconColor] || bgMap.teal
  const tg = tagMap[tagColor] || tagMap.teal

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 13,
      padding: '13px 24px', borderBottom: '1px solid #E2E8F0',
      transition: 'background .12s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{
        width: 34, height: 34, minWidth: 34, borderRadius: 9,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 1, background: ic.bg, color: ic.color,
      }}>
        <IconComp />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>{name}</span>
          {tag && (
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '.04em',
              padding: '2px 7px', borderRadius: 999,
              background: tg.bg, color: tg.color,
            }}>{tag}</span>
          )}
        </div>
        <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>{desc}</p>
      </div>
    </div>
  )
}

// ── Landing section ─────────────────────────────────────────────────────────
function LandingSection() {
  const clientFeatures = [
    { icon: icons.qr,       iconColor: 'teal',    name: 'Acceso por QR de mesa',          desc: 'Escanea el QR de la mesa y el sistema lo ubica automáticamente. Sin registro previo.' },
    { icon: icons.book,     iconColor: 'emerald', name: 'Menú digital con fotos',          desc: 'Navega el menú por categorías, ve fotos y descripción de cada plato.', tag: 'Sin app', tagColor: 'teal' },
    { icon: icons.cart,     iconColor: 'teal',    name: 'Pedido desde la mesa',            desc: 'Agrega ítems al carrito y envía el pedido directo a cocina. Sin esperar al mozo.' },
    { icon: icons.refresh,  iconColor: 'blue',    name: 'Seguimiento en tiempo real',      desc: 'Ve el estado del pedido: recibido → en preparación → listo. Se actualiza solo.' },
    { icon: icons.bell,     iconColor: 'amber',   name: 'Pedir atención',                  desc: 'Botón para llamar al camarero con motivo: traer la cuenta, consulta, reponer algo.' },
    { icon: icons.users,    iconColor: 'emerald', name: 'Invitar a la mesa',               desc: 'Compartí un link para que otros del grupo pidan desde sus propios celulares.', tag: 'Pedidos grupales', tagColor: 'green' },
    { icon: icons.card,     iconColor: 'teal',    name: 'Pago integrado',                  desc: 'Elegí cómo pagar: efectivo, tarjeta o transferencia con comprobante.', tag: 'Múltiples métodos', tagColor: 'amber' },
    { icon: icons.calendar, iconColor: 'blue',    name: 'Reservas online',                 desc: 'Reservá fecha, hora y cantidad de personas directamente desde el menú.' },
    { icon: icons.location, iconColor: 'amber',   name: 'Pedido para llevar / delivery',   desc: 'El cliente puede pedir para retirar en el local o para envío a domicilio.' },
  ]

  const camautFeatures = [
    { icon: icons.kanban,     iconColor: 'blue',    name: 'Kanban de pedidos',                 desc: 'Vista en columnas: recibido / en preparación / listo / entregado. Arrastrá para avanzar.' },
    { icon: icons.grid,       iconColor: 'teal',    name: 'Mapa del salón en tiempo real',     desc: 'Ve qué mesas están ocupadas. Tocá una mesa y ves todos sus pedidos activos.', tag: 'Vista por mesa', tagColor: 'blue' },
    { icon: icons.chat,       iconColor: 'emerald', name: 'Alertas de WhatsApp',               desc: 'Recibí notificaciones automáticas por WA al entrar un pedido, listo o atención.' },
    { icon: icons.chatLines,  iconColor: 'blue',    name: 'Contacto directo con el cliente',   desc: 'Botón de WA prearmado para escribirle al cliente cuando el pedido está listo.', tag: 'Mensaje preescrito', tagColor: 'teal' },
    { icon: icons.flame,      iconColor: 'amber',   name: 'Vista cocina',                      desc: 'Pantalla full-screen para cocina: solo muestra lo que hay que preparar.' },
    { icon: icons.clipboard,  iconColor: 'blue',    name: 'Comanda digital por mesa',          desc: 'Todos los pedidos de una sesión agrupados. Historial completo por mesa.' },
    { icon: icons.checkCircle,iconColor: 'emerald', name: 'Confirmación de pagos',             desc: 'Revisá y aprobá transferencias. Marcá pedidos pagados en efectivo o tarjeta.' },
    { icon: icons.barChart,   iconColor: 'amber',   name: 'Control de stock',                  desc: 'Alertas de stock bajo. Un clic para ocultar un producto del menú.', tag: 'Tiempo real', tagColor: 'amber' },
    { icon: icons.calendarDots, iconColor: 'teal',  name: 'Reservas del día',                  desc: 'Panel con reservas confirmadas: horario, cantidad de personas y notas.' },
  ]

  const colHead = (badge, badgeColor, title, desc) => (
    <div style={{ padding: '24px 24px 18px', borderBottom: '1px solid #E2E8F0' }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 12px', borderRadius: 999,
        fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em',
        marginBottom: 10,
        background: badgeColor === 'teal' ? 'rgba(13,148,136,.1)' : '#DBEAFE',
        color: badgeColor === 'teal' ? '#0D9488' : '#2563EB',
      }}>{badge}</span>
      <div style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', marginBottom: 3 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#64748B' }}>{desc}</div>
    </div>
  )

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif', overflowX: 'hidden' }}>

      {/* ── HERO ── */}
      <section style={{
        background: '#060C18', padding: '88px 5% 100px',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        {/* glows */}
        <div style={{
          position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)',
          width: 700, height: 500, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(13,148,136,.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, right: -60,
          width: 420, height: 420, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(45,212,191,.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', maxWidth: 820, margin: '0 auto' }}>
          {/* Logo mark */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 28 }}>
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="7.5" fill="#0D9488"/>
              <rect x="5.5" y="5.5" width="8.5" height="8.5" rx="1.8" fill="white"/>
              <rect x="18" y="5.5" width="8.5" height="8.5" rx="1.8" fill="white"/>
              <rect x="5.5" y="18" width="8.5" height="8.5" rx="1.8" fill="white"/>
              <rect x="18" y="18" width="3.8" height="3.8" rx="0.9" fill="rgba(255,255,255,0.5)"/>
              <rect x="22.7" y="18" width="3.8" height="3.8" rx="0.9" fill="rgba(255,255,255,0.5)"/>
              <rect x="18" y="22.7" width="3.8" height="3.8" rx="0.9" fill="rgba(255,255,255,0.5)"/>
            </svg>
            <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '.06em', color: '#2DD4BF' }}>CAPY</span>
          </div>

          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(45,212,191,.08)', border: '1px solid rgba(45,212,191,.2)',
            color: '#2DD4BF', padding: '8px 20px', borderRadius: 999,
            fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
            marginBottom: 28,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2DD4BF', flexShrink: 0 }} />
            Sin descargas de app — funciona directo en el navegador
          </div>

          <h1 style={{
            fontSize: 'clamp(2.2rem, 5.5vw, 3.8rem)', fontWeight: 900,
            lineHeight: 1.08, letterSpacing: -1.5, color: '#F1F5F9',
            marginBottom: 18,
          }}>
            Todo lo que tu{' '}
            <em style={{ color: '#2DD4BF', fontStyle: 'normal' }}>cliente y camarero</em>
            {' '}necesitan<br />para vender más
          </h1>

          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.18rem)', color: '#94A3B8',
            maxWidth: 580, margin: '0 auto 40px', lineHeight: 1.65,
          }}>
            CAPY digitaliza el proceso de pedidos de tu local: desde que el cliente escanea el QR de la mesa hasta que paga y se va. Sin papel, sin malentendidos, sin esperas innecesarias.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={scrollToForm} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#0D9488', color: '#fff', border: 'none',
              fontFamily: 'inherit', fontSize: '1rem', fontWeight: 700,
              padding: '15px 34px', borderRadius: 14, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(13,148,136,.3)',
              transition: 'all .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#0F766E'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#0D9488'; e.currentTarget.style.transform = 'none' }}
            >
              Registrar mi Local
            </button>
            <button onClick={scrollToForm} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,.07)', color: '#CBD5E1',
              border: '1.5px solid rgba(255,255,255,.14)',
              fontFamily: 'inherit', fontSize: '1rem', fontWeight: 700,
              padding: '15px 34px', borderRadius: 14, cursor: 'pointer',
              transition: 'all .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.12)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.07)' }}
            >
              Ya tengo cuenta →
            </button>
          </div>
        </div>
      </section>

      {/* ── SEGMENTS ── */}
      <section style={{
        background: '#fff', borderBottom: '1px solid #E2E8F0',
        padding: '40px 5%', textAlign: 'center',
      }}>
        <p style={{
          fontSize: 11, fontWeight: 700, color: '#94A3B8',
          letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 18,
        }}>
          La solución ideal para cualquier formato gastronómico
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 10 }}>
          {[
            ['Restaurantes', <><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></>],
            ['Bares',        <><path d="M8 22h8"/><path d="M12 11v11"/><path d="M20 2H4l4 8a4 4 0 0 0 8 0l4-8Z"/></>],
            ['Take Away',    <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></>],
            ['Food Trucks',  <><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>],
          ].map(([label, svgContent]) => (
            <span key={label} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: '#F8FAFC', border: '1px solid #E2E8F0',
              padding: '9px 20px', borderRadius: 999,
              fontSize: 14, fontWeight: 600, color: '#334155',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="#0D9488" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {svgContent}
              </svg>
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ background: '#fff', padding: '0 5% 52px' }}>
        <div style={{
          maxWidth: 1140, margin: '0 auto',
          background: '#F8FAFC', border: '1px solid #E2E8F0',
          borderRadius: 18, padding: '22px 26px',
          display: 'flex', alignItems: 'flex-start', gap: 16,
        }}>
          <div style={{
            width: 44, height: 44, minWidth: 44, borderRadius: 12,
            background: 'rgba(13,148,136,.1)', color: '#0D9488',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <icons.scanCorners />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginBottom: 5 }}>¿Cómo funciona?</div>
            <p style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.6 }}>
              El cliente escanea el QR de la mesa y accede al menú del local en su celular. Pide, sigue el estado de su pedido en tiempo real y paga — sin hablar con nadie si no quiere. El camarero recibe todo en pantalla al instante.
            </p>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ background: '#F8FAFC', padding: '64px 5% 72px' }}>
        <div style={{
          maxWidth: 1140, margin: '0 auto',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24,
        }}
          className="lp-feat-grid"
        >
          {/* Client col */}
          <div style={{
            background: '#fff', border: '1px solid #E2E8F0', borderRadius: 20, overflow: 'hidden',
          }}>
            {colHead('App del Cliente', 'teal', 'Experiencia del Consumidor', 'Diseñada para cautivar, agilizar el pedido y aumentar el ticket promedio.')}
            <div>
              {clientFeatures.map(f => (
                <FeatItem key={f.name} icon={f.icon} iconColor={f.iconColor}
                  name={f.name} desc={f.desc} tag={f.tag} tagColor={f.tagColor} />
              ))}
            </div>
          </div>

          {/* Camaut col */}
          <div style={{
            background: '#fff', border: '1px solid #E2E8F0', borderRadius: 20, overflow: 'hidden',
          }}>
            {colHead('App del Camarero · Camaut', 'blue', 'Herramientas del Staff', 'La consola de control de tu equipo para despachar con precisión quirúrgica.')}
            <div>
              {camautFeatures.map(f => (
                <FeatItem key={f.name} icon={f.icon} iconColor={f.iconColor}
                  name={f.name} desc={f.desc} tag={f.tag} tagColor={f.tagColor} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* responsive grid */}
      <style>{`
        @media (max-width: 860px) {
          .lp-feat-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
export default function AdminLoginPage() {
  const { signInWithEmail } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [showRecovery, setShowRecovery] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoverySent, setRecoverySent] = useState(false)
  const [recoveryLoading, setRecoveryLoading] = useState(false)

  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [regSent, setRegSent] = useState(false)

  async function handleRecovery(e) {
    e.preventDefault()
    const target = recoveryEmail.trim() || email.trim()
    if (!target) return
    setRecoveryLoading(true)
    try {
      await supabaseStaff.auth.resetPasswordForEmail(target, {
        redirectTo: `${window.location.origin}/auth/callback`,
      })
    } catch (_) {}
    setRecoveryLoading(false)
    setRecoverySent(true)
  }

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
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    })
    setRegLoading(false)
    if (error) {
      setRegError(error.message)
      return
    }
    if (data.session) {
      navigate('/admin/onboarding')
    } else {
      setRegSent(true)
    }
  }

  const googleBtn = (
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
  )

  const divider = (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-carbon-700" />
      <span className="text-smoke-600 text-xs">o con email</span>
      <div className="flex-1 h-px bg-carbon-700" />
    </div>
  )

  return (
    <>
      <LandingSection />

      {/* ── LOGIN / REGISTER FORM ── */}
      <div id="lp-form" className="bg-carbon-950 py-16 px-5">
        <div className="w-full max-w-sm mx-auto space-y-4">

          <div className="text-center mb-2">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white shadow-md p-2">
              <img src="/icon-512.png" alt="Capy" className="w-full h-full object-contain" />
            </div>
            <h2 className="font-display text-2xl tracking-wide text-ember-500">CAPY</h2>
            <p className="text-smoke-500 text-sm mt-1">Ingresá o creá tu cuenta para empezar</p>
          </div>

          {/* Ya tengo cuenta */}
          <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5 space-y-3">
            <p className="text-smoke-300 font-semibold text-sm">Ya tengo cuenta</p>
            {googleBtn}
            {divider}
            <form onSubmit={handleLogin} className="space-y-3">
              <label className="block">
                <span className="text-smoke-500 text-xs mb-1 block">Email</span>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input" />
              </label>
              <label className="block">
                <span className="text-smoke-500 text-xs mb-1 block">Contraseña</span>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="input" />
              </label>
              {loginError && <p className="text-red-700 text-xs">{loginError}</p>}
              <button type="submit" disabled={loginLoading}
                className="w-full bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm">
                {loginLoading ? 'Cargando...' : 'Ingresar'}
              </button>
            </form>

            {!showRecovery && (
              <button type="button" onClick={() => setShowRecovery(true)}
                className="w-full text-smoke-500 text-xs underline pt-1">
                ¿Olvidaste tu contraseña?
              </button>
            )}
            {showRecovery && (
              <div className="pt-1">
                {recoverySent ? (
                  <p className="text-smoke-400 text-xs text-center">Si el email existe, te mandamos el link de recuperación.</p>
                ) : (
                  <form onSubmit={handleRecovery} className="space-y-2">
                    {!email.trim() && (
                      <input type="email" required value={recoveryEmail}
                        onChange={e => setRecoveryEmail(e.target.value)}
                        placeholder="Tu email" className="input text-sm" />
                    )}
                    <button type="submit"
                      disabled={recoveryLoading || (!email.trim() && !recoveryEmail.trim())}
                      className="w-full border border-carbon-600 text-smoke-400 text-xs font-medium py-2 rounded-xl disabled:opacity-50">
                      {recoveryLoading ? 'Enviando...' : `Enviar link a ${email.trim() || recoveryEmail.trim() || 'mi email'}`}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-carbon-700" />
            <span className="text-smoke-600 text-xs">¿Nuevo en Capy?</span>
            <div className="flex-1 h-px bg-carbon-700" />
          </div>

          {/* Registrá tu Local */}
          <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5 space-y-3">
            <p className="text-smoke-300 font-semibold text-sm">Registrá tu Local</p>
            {regSent ? (
              <div className="bg-ember-500/10 border border-ember-500/20 rounded-xl p-4 text-center">
                <p className="text-smoke-300 text-sm font-medium mb-1">Revisá tu email</p>
                <p className="text-smoke-500 text-xs">Te mandamos un link para confirmar tu cuenta y continuar.</p>
              </div>
            ) : (
              <>
                {googleBtn}
                {divider}
                <form onSubmit={handleRegister} className="space-y-3">
                  <label className="block">
                    <span className="text-smoke-500 text-xs mb-1 block">Email</span>
                    <input type="email" required value={regEmail} onChange={e => setRegEmail(e.target.value)} className="input" />
                  </label>
                  <label className="block">
                    <span className="text-smoke-500 text-xs mb-1 block">Contraseña</span>
                    <input type="password" required minLength={6} value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres" className="input" />
                  </label>
                  {regError && <p className="text-red-700 text-xs">{regError}</p>}
                  <button type="submit" disabled={regLoading}
                    className="w-full bg-ember-500 hover:bg-ember-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm">
                    {regLoading ? 'Creando cuenta...' : 'Crear cuenta'}
                  </button>
                </form>
              </>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
