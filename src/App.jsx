import { BrowserRouter, Routes, Route, Navigate, Outlet, Link, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import CapyChat from './components/CapyChat'
import { CustomerProvider } from './hooks/useCustomer'
import { CartProvider } from './hooks/useCart'
import { RequireCustomer, RequireStaff, RequireAdmin, RequireAdmin as RequireEncargado, RequirePropietario, RequireSuperAdmin } from './components/ProtectedRoute'
import { VenueProvider, useVenue } from './hooks/useVenue'

import HubPage from './pages/HubPage'
import IdentifyPage from './pages/client/IdentifyPage'
import MenuPage from './pages/client/MenuPage'
import OrdersPage from './pages/client/OrdersPage'
import LocationPage from './pages/client/LocationPage'
import PaymentPage from './pages/client/PaymentPage'
import OrderConfirmedPage from './pages/client/OrderConfirmedPage'
import OrderStatusPage from './pages/client/OrderStatusPage'

import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminOnboardingPage from './pages/admin/AdminOnboardingPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import HistoryPage from './pages/admin/HistoryPage'
import MenuEditorPage from './pages/admin/MenuEditorPage'
import FeedbackPage from './pages/admin/FeedbackPage'
import LocationsPage from './pages/admin/LocationsPage'
import UsersPage from './pages/admin/UsersPage'
import ConfigPage from './pages/admin/ConfigPage'
import PaymentMethodsPage from './pages/admin/PaymentMethodsPage'
import VenueSettingsPage from './pages/admin/VenueSettingsPage'
import RankConfigPage from './pages/admin/RankConfigPage'
import KpisPage from './pages/admin/KpisPage'
import WaiterModePage from './pages/admin/WaiterModePage'
import WaitersPage from './pages/admin/WaitersPage'
import QuickNotesPage from './pages/admin/QuickNotesPage'
import DiscountsPage from './pages/admin/DiscountsPage'
import QRPage from './pages/admin/QRPage'
import ShiftSummaryPage from './pages/admin/ShiftSummaryPage'
import MercadoPagoReturnPage from './pages/client/MercadoPagoReturnPage'
import CamautVincularPage from './pages/camaut/CamautVincularPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import PublicOrderPage from './pages/client/PublicOrderPage'
import DisplayPage from './pages/display/DisplayPage'
import CamautLandingPage from './pages/camaut/CamautLandingPage'
import CamautRegisterPage from './pages/camaut/CamautRegisterPage'
import CamautLoginPage from './pages/camaut/CamautLoginPage'
import CamautCallbackPage from './pages/camaut/CamautCallbackPage'
import CamautAppPage from './pages/camaut/CamautAppPage'
import PrivacidadPage from './pages/camaut/PrivacidadPage'
import TerminosPage from './pages/camaut/TerminosPage'
import WaiterPublicPage from './pages/camaut/WaiterPublicPage'
import SuperAdminPage from './pages/admin/SuperAdminPage'
import ConsumoPage from './pages/admin/ConsumoPage'
import InventarioPage from './pages/admin/InventarioPage'
import ShiftManagerPage from './pages/admin/ShiftManagerPage'
import OrderAuditorPage from './pages/admin/OrderAuditorPage'
import WaiterCVPage from './pages/camaut/WaiterCVPage'
import ClientAuthCallbackPage from './pages/client/ClientAuthCallbackPage'
import AccountPage from './pages/client/AccountPage'
import ReservasPage from './pages/admin/ReservasPage'
import ReservationBookingPage from './pages/client/ReservationBookingPage'
import UpgradeResultPage from './pages/admin/UpgradeResultPage'
import WhatsAppPage from './pages/admin/WhatsAppPage'

function CapyChatOverlay() {
  const { isStaff } = useAuth()
  const location = useLocation()
  const isAdminOrCamaut = location.pathname.startsWith('/admin') || location.pathname.startsWith('/camaut')
  if (!isStaff || !isAdminOrCamaut) return null
  return <CapyChat />
}

function VenueGuard() {
  const { loading, notFound } = useVenue()
  if (loading) {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
        <p className="text-smoke-400 text-sm">Cargando...</p>
      </div>
    )
  }
  if (notFound) {
    return (
      <div className="min-h-screen bg-carbon-950 flex flex-col items-center justify-center px-5 text-center">
        <p className="text-smoke-300 font-semibold mb-2">Restaurante no encontrado</p>
        <p className="text-smoke-500 text-sm mb-6">Este link no corresponde a ningún local activo.</p>
        <Link to="/" className="text-ember-500 text-sm underline">Volver al inicio</Link>
      </div>
    )
  }
  return <Outlet />
}

function VenueLayout() {
  return (
    <VenueProvider>
      <VenueGuard />
    </VenueProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <CustomerProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              {/* Hub de descubrimiento */}
              <Route path="/" element={<HubPage />} />

              {/* Cliente legacy: rutas planas usan VITE_VENUE_ID por defecto */}
              <Route path="/identificacion" element={<IdentifyPage />} />
              <Route
                path="/carta"
                element={
                  <RequireCustomer>
                    <MenuPage />
                  </RequireCustomer>
                }
              />
              <Route
                path="/pedidos"
                element={
                  <RequireCustomer>
                    <OrdersPage />
                  </RequireCustomer>
                }
              />
              <Route
                path="/ubicacion"
                element={
                  <RequireCustomer>
                    <LocationPage />
                  </RequireCustomer>
                }
              />
              <Route
                path="/pago"
                element={
                  <RequireCustomer>
                    <PaymentPage />
                  </RequireCustomer>
                }
              />
              <Route
                path="/cuenta"
                element={
                  <RequireCustomer>
                    <AccountPage />
                  </RequireCustomer>
                }
              />
              <Route path="/pedido-enviado/:orderId" element={<OrderConfirmedPage />} />
              <Route path="/pedido/:orderId" element={<OrderStatusPage />} />

              {/* Cliente multi-venue: /r/:slug/* */}
              <Route path="/r/:slug" element={<VenueLayout />}>
                <Route index element={<IdentifyPage />} />
                <Route
                  path="carta"
                  element={
                    <RequireCustomer>
                      <MenuPage />
                    </RequireCustomer>
                  }
                />
                <Route
                  path="pedidos"
                  element={
                    <RequireCustomer>
                      <OrdersPage />
                    </RequireCustomer>
                  }
                />
                <Route
                  path="ubicacion"
                  element={
                    <RequireCustomer>
                      <LocationPage />
                    </RequireCustomer>
                  }
                />
                <Route
                  path="pago"
                  element={
                    <RequireCustomer>
                      <PaymentPage />
                    </RequireCustomer>
                  }
                />
                <Route
                  path="cuenta"
                  element={
                    <RequireCustomer>
                      <AccountPage />
                    </RequireCustomer>
                  }
                />
                <Route path="pedido-enviado/:orderId" element={<OrderConfirmedPage />} />
                <Route path="pedido/:orderId" element={<OrderStatusPage />} />
                <Route path="reservar" element={<ReservationBookingPage />} />
              </Route>

              {/* Staff: camarero y admin, con login real */}
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin/onboarding" element={<AdminOnboardingPage />} />
              <Route
                path="/admin"
                element={
                  <RequireStaff>
                    <AdminDashboard />
                  </RequireStaff>
                }
              />
              <Route
                path="/admin/historial"
                element={
                  <RequireStaff>
                    <HistoryPage />
                  </RequireStaff>
                }
              />
              <Route
                path="/admin/carta"
                element={<RequirePropietario><MenuEditorPage /></RequirePropietario>}
              />
              <Route
                path="/admin/encuestas"
                element={<RequirePropietario><FeedbackPage /></RequirePropietario>}
              />
              <Route
                path="/admin/ubicaciones"
                element={<RequireAdmin><LocationsPage /></RequireAdmin>}
              />
              <Route
                path="/admin/usuarios"
                element={<RequireAdmin><UsersPage /></RequireAdmin>}
              />
              <Route
                path="/admin/configuracion"
                element={<RequirePropietario><ConfigPage /></RequirePropietario>}
              />
              <Route
                path="/admin/configuracion/medios-pago"
                element={<RequirePropietario><PaymentMethodsPage /></RequirePropietario>}
              />
              <Route
                path="/admin/configuracion/local"
                element={<RequirePropietario><VenueSettingsPage /></RequirePropietario>}
              />
              <Route
                path="/admin/rangos"
                element={<RequirePropietario><RankConfigPage /></RequirePropietario>}
              />
              <Route
                path="/admin/kpis"
                element={<RequirePropietario><KpisPage /></RequirePropietario>}
              />
              <Route
                path="/admin/tomar"
                element={<RequireStaff><WaiterModePage /></RequireStaff>}
              />
              <Route path="/admin/camareros" element={<Navigate to="/admin/usuarios" replace />} />
              <Route
                path="/admin/notas-rapidas"
                element={<RequirePropietario><QuickNotesPage /></RequirePropietario>}
              />
              <Route
                path="/admin/descuentos"
                element={<RequirePropietario><DiscountsPage /></RequirePropietario>}
              />
              <Route
                path="/admin/qr"
                element={<RequirePropietario><QRPage /></RequirePropietario>}
              />
              <Route
                path="/admin/mi-turno"
                element={
                  <RequireStaff>
                    <ShiftSummaryPage />
                  </RequireStaff>
                }
              />
              <Route
                path="/admin/inventario"
                element={<RequirePropietario><InventarioPage /></RequirePropietario>}
              />
              <Route
                path="/admin/reservas"
                element={<RequirePropietario><ReservasPage /></RequirePropietario>}
              />
              <Route
                path="/admin/whatsapp"
                element={<RequirePropietario><WhatsAppPage /></RequirePropietario>}
              />
              <Route path="/admin/upgrade-success" element={<UpgradeResultPage />} />
              <Route path="/admin/upgrade-failed" element={<UpgradeResultPage />} />
              <Route path="/admin/upgrade-pending" element={<UpgradeResultPage />} />
              <Route
                path="/admin/consumo"
                element={
                  <RequireAdmin>
                    <ConsumoPage />
                  </RequireAdmin>
                }
              />
              <Route
                path="/admin/turno"
                element={
                  <RequireAdmin>
                    <ShiftManagerPage />
                  </RequireAdmin>
                }
              />
              <Route
                path="/admin/auditor"
                element={
                  <RequireAdmin>
                    <OrderAuditorPage />
                  </RequireAdmin>
                }
              />
              <Route
                path="/admin/superadmin"
                element={
                  <RequireSuperAdmin>
                    <SuperAdminPage />
                  </RequireSuperAdmin>
                }
              />

              <Route path="/pedido-pagado" element={<MercadoPagoReturnPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/cliente/callback" element={<ClientAuthCallbackPage />} />
              <Route path="/ver-pedido/:id" element={<PublicOrderPage />} />
              <Route path="/display/:venueId" element={<DisplayPage />} />
              <Route path="/camaut" element={<CamautLandingPage />} />
              <Route path="/camaut/registro" element={<CamautRegisterPage />} />
              <Route path="/camaut/login" element={<CamautLoginPage />} />
              <Route path="/camaut/callback" element={<CamautCallbackPage />} />
              <Route path="/camaut/vincular" element={<CamautVincularPage />} />
              <Route path="/camaut/app" element={<CamautAppPage />} />
              <Route path="/privacidad" element={<PrivacidadPage />} />
              <Route path="/terminos" element={<TerminosPage />} />
              <Route path="/c/:alias" element={<WaiterPublicPage />} />
              <Route path="/cv/:alias" element={<WaiterCVPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <CapyChatOverlay />
          </BrowserRouter>
        </CartProvider>
      </CustomerProvider>
    </AuthProvider>
  )
}
