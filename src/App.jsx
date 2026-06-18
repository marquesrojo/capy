import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { CustomerProvider } from './hooks/useCustomer'
import { CartProvider } from './hooks/useCart'
import { RequireCustomer, RequireStaff } from './components/ProtectedRoute'

import IdentifyPage from './pages/client/IdentifyPage'
import MenuPage from './pages/client/MenuPage'
import OrdersPage from './pages/client/OrdersPage'
import LocationPage from './pages/client/LocationPage'
import PaymentPage from './pages/client/PaymentPage'
import OrderConfirmedPage from './pages/client/OrderConfirmedPage'
import OrderStatusPage from './pages/client/OrderStatusPage'

import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import HistoryPage from './pages/admin/HistoryPage'
import MenuEditorPage from './pages/admin/MenuEditorPage'
import FeedbackPage from './pages/admin/FeedbackPage'
import LocationsPage from './pages/admin/LocationsPage'

export default function App() {
  return (
    <AuthProvider>
      <CustomerProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              {/* Cliente: sin login, identificado por nombre + whatsapp */}
              <Route path="/" element={<Navigate to="/carta" replace />} />
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
              {/* El seguimiento del pedido no requiere identificacion previa
                  en este dispositivo (ej: si comparten el link), solo el id */}
              <Route path="/pedido-enviado/:orderId" element={<OrderConfirmedPage />} />
              <Route path="/pedido/:orderId" element={<OrderStatusPage />} />

              {/* Staff: camarero y admin, con login real */}
              <Route path="/admin/login" element={<AdminLoginPage />} />
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
                element={
                  <RequireStaff>
                    <MenuEditorPage />
                  </RequireStaff>
                }
              />
              <Route
                path="/admin/encuestas"
                element={
                  <RequireStaff>
                    <FeedbackPage />
                  </RequireStaff>
                }
              />
              <Route
                path="/admin/ubicaciones"
                element={
                  <RequireStaff>
                    <LocationsPage />
                  </RequireStaff>
                }
              />

              <Route path="*" element={<Navigate to="/carta" replace />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </CustomerProvider>
    </AuthProvider>
  )
}
