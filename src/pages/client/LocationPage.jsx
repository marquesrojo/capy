import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseCustomer, ACTIVE_VENUE_ID } from '../../lib/supabase'
import { useCart } from '../../hooks/useCart'
import { useClientBase } from '../../hooks/useVenue'
import { accentColor } from '../../lib/utils'
import ClientFloorMap from '../../components/ClientFloorMap'

function zoneShort(name) {
  const match = name.match(/\d+/)
  if (match) return match[0]
  return name.slice(0, 2).toUpperCase()
}

export default function LocationPage() {
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [venueColor, setVenueColor] = useState('#1A3A6B')
  const [pickedSector, setPickedSector] = useState(null)
  const [retiroExternoEnabled, setRetiroExternoEnabled] = useState(false)
  const [deliveryEnabled, setDeliveryEnabled] = useState(false)
  const [viewMode, setViewMode] = useState(null) // 'mapa' | 'lista' | null (not yet decided)
  const { setLocation, itemCount } = useCart()
  const navigate = useNavigate()
  const base = useClientBase()

  useEffect(() => {
    if (itemCount === 0) navigate(`${base}/carta`)
  }, [itemCount, navigate])

  useEffect(() => {
    async function load() {
      const [zonesRes, venueRes] = await Promise.all([
        supabaseCustomer
          .from('venue_zones')
          .select('id, name, type, parent_zone_id, pos_x, pos_y, size_w, size_h, shape')
          .eq('venue_id', ACTIVE_VENUE_ID)
          .eq('is_active', true)
          .order('sort_order')
          .order('name'),
        supabaseCustomer
          .from('venues')
          .select('header_bg_color, retiro_externo_enabled, delivery_enabled')
          .eq('id', ACTIVE_VENUE_ID)
          .single()
      ])
      const zonesData = zonesRes.data || []
      setZones(zonesData)
      if (venueRes.data?.header_bg_color) setVenueColor(venueRes.data.header_bg_color)
      if (venueRes.data?.retiro_externo_enabled) setRetiroExternoEnabled(true)
      if (venueRes.data?.delivery_enabled) setDeliveryEnabled(true)

      // Default to map view if any mesa has been positioned
      const hasMap = zonesData.some(z => z.type === 'mesa' && z.pos_x != null)
      setViewMode(hasMap ? 'mapa' : 'lista')
      setLoading(false)
    }
    load()
  }, [])

  function chooseZone(zone) {
    setLocation({ type: zone.type, zoneId: zone.id, label: zone.name })
    navigate(`${base}/pago`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <p className="text-[#9DAAB8] text-sm">Cargando...</p>
      </div>
    )
  }

  const accent = accentColor(venueColor)
  const sectores = zones.filter(z => z.type === 'zona')
  const allMesas = zones.filter(z => z.type === 'mesa')
  const retiro = zones.filter(z => z.type === 'retiro')
  const hasMap = allMesas.some(m => m.pos_x != null)
  const sectorMesas = pickedSector ? allMesas.filter(m => m.parent_zone_id === pickedSector.id) : []
  const orphanMesas = allMesas.filter(m => !m.parent_zone_id)

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-10">
      <header className="px-5 pt-6 pb-5" style={{ backgroundColor: venueColor }}>
        <h1 className="font-display text-3xl text-white tracking-wide">¿DÓNDE ESTÁS?</h1>
        <p className="text-white/70 text-sm mt-1">Así sabemos a dónde llevar tu pedido</p>
      </header>

      <div className="px-5 pt-5 space-y-6">

        {/* Map / List toggle */}
        {hasMap && allMesas.length > 0 && (
          <div className="flex gap-1 bg-[#EDE9E1] rounded-xl p-1">
            {['mapa', 'lista'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize"
                style={viewMode === mode
                  ? { backgroundColor: accent, color: 'white' }
                  : { color: accent }
                }
              >
                {mode === 'mapa' ? (
                  <span className="flex items-center justify-center gap-1">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
                      <line x1="9" y1="3" x2="9" y2="18"/>
                      <line x1="15" y1="6" x2="15" y2="21"/>
                    </svg>
                    Mapa
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                    </svg>
                    Lista
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Map view */}
        {viewMode === 'mapa' && hasMap && (
          <ClientFloorMap zones={zones} accent={accent} onChoose={chooseZone} />
        )}

        {/* List view */}
        {viewMode === 'lista' && (
          <>
            {sectores.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#C0CBDA] mb-2">
                  {allMesas.length > 0 ? 'Sector' : 'Sectores'}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {sectores.map(sector => {
                    const hasMesas = allMesas.some(m => m.parent_zone_id === sector.id)
                    const active = pickedSector?.id === sector.id
                    return (
                      <button
                        key={sector.id}
                        onClick={() => {
                          if (!hasMesas) {
                            chooseZone(sector)
                          } else {
                            setPickedSector(active ? null : sector)
                          }
                        }}
                        className="rounded-xl py-3 px-1 text-xs font-bold text-center border-2 transition-all leading-tight"
                        style={active
                          ? { backgroundColor: accent, borderColor: accent, color: 'white' }
                          : { backgroundColor: '#F0F4F8', borderColor: accent, color: accent }
                        }
                      >
                        {sector.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {sectorMesas.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#C0CBDA] mb-2">
                  Mesa — {pickedSector.name}
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {sectorMesas.map(mesa => (
                    <button
                      key={mesa.id}
                      onClick={() => chooseZone(mesa)}
                      className="aspect-square rounded-full flex items-center justify-center text-sm font-black border-2 transition-all active:scale-95"
                      style={{ backgroundColor: '#F0F4F8', borderColor: accent, color: accent }}
                    >
                      {zoneShort(mesa.name)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {orphanMesas.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#C0CBDA] mb-2">Mesas</p>
                <div className="grid grid-cols-5 gap-2">
                  {orphanMesas.map(mesa => (
                    <button
                      key={mesa.id}
                      onClick={() => chooseZone(mesa)}
                      className="aspect-square rounded-full flex items-center justify-center text-sm font-black border-2 transition-all active:scale-95"
                      style={{ backgroundColor: '#F0F4F8', borderColor: accent, color: accent }}
                    >
                      {zoneShort(mesa.name)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {retiro.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#C0CBDA] mb-2">Retiro</p>
            <div className="grid grid-cols-3 gap-2">
              {retiro.map(zone => (
                <button
                  key={zone.id}
                  onClick={() => chooseZone(zone)}
                  className="rounded-xl py-3 text-xs font-bold text-center border-2 transition-all active:scale-95"
                  style={{ backgroundColor: '#F0F4F8', borderColor: accent, color: accent }}
                >
                  {zone.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {zones.length === 0 && !retiroExternoEnabled && !deliveryEnabled && (
          <p className="text-[#9DAAB8] text-sm text-center py-10">
            No hay mesas ni sectores configurados todavía.
          </p>
        )}

        {(retiroExternoEnabled || deliveryEnabled) && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#C0CBDA] mb-2">Para llevar</p>
            <div className={`grid gap-2 ${retiroExternoEnabled && deliveryEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {retiroExternoEnabled && (
                <button
                  onClick={() => { setLocation({ type: 'retiro_externo', label: 'Retiro en local' }); navigate(`${base}/pago`) }}
                  className="rounded-xl py-3.5 px-3 text-sm font-bold text-center border-2 transition-all active:scale-95 flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#F0F4F8', borderColor: accent, color: accent }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                  Retiro en local
                </button>
              )}
              {deliveryEnabled && (
                <button
                  onClick={() => { setLocation({ type: 'delivery', label: 'Delivery' }); navigate(`${base}/pago`) }}
                  className="rounded-xl py-3.5 px-3 text-sm font-bold text-center border-2 transition-all active:scale-95 flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#F0F4F8', borderColor: accent, color: accent }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                  Delivery
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
