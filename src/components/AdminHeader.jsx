import { useEffect, useState } from 'react'
import { supabaseStaff, ACTIVE_VENUE_ID } from '../lib/supabase'

// Header global con logo+nombre del local, mostrado arriba de TODAS las
// pantallas de admin (se inyecta una sola vez desde RequireStaff).
// Color de fondo y de texto son configurables desde Configuracion > Datos
// del local, y se aplican via "style" inline ya que son valores dinamicos
// que no existen como clases fijas de Tailwind.
export default function AdminHeader() {
  const [venueName, setVenueName] = useState('')
  const [venueLogo, setVenueLogo] = useState('')
  const [bgColor, setBgColor] = useState('#1A1A1A')
  const [textColor, setTextColor] = useState('#E8772A')

  useEffect(() => {
    async function load() {
      const { data } = await supabaseStaff
        .from('venues')
        .select('name, logo_url, header_bg_color, header_text_color')
        .eq('id', ACTIVE_VENUE_ID)
        .single()
      if (data) {
        setVenueName(data.name || '')
        setVenueLogo(data.logo_url || '')
        if (data.header_bg_color) setBgColor(data.header_bg_color)
        if (data.header_text_color) setTextColor(data.header_text_color)
      }
    }
    load()
  }, [])

  if (!venueName && !venueLogo) return null

  return (
    <div
      className="px-5 py-2 flex items-center gap-2.5 border-b border-carbon-700"
      style={{ backgroundColor: bgColor }}
    >
      {venueLogo && (
        <img
          src={venueLogo}
          alt={venueName}
          className="w-6 h-6 rounded object-cover border border-carbon-700 flex-shrink-0"
        />
      )}
      <span
        className="text-xs font-medium tracking-wide"
        style={{ color: textColor }}
      >
        {venueName.toUpperCase()}
      </span>
    </div>
  )
}
