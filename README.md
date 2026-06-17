# Capy — Sistema de Pedidos para Restaurante/Club (MVP)

Sistema web para que clientes vean la carta, hagan su pedido sin necesidad
de crear cuenta, indiquen su ubicación (mesa o sector general) y paguen
desde el celular. El staff (camareros y cajero/admin) ve los pedidos en un
tablero en tiempo real, cambia su estado y tiene un historial completo de
operaciones.

**No reemplaza ni se integra con el sistema de gestión del restaurante.**
Es un sistema independiente para tomar y pagar pedidos.

## Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend / Base de datos / Tiempo real**: Supabase (Postgres)
- **Pagos**: sin pasarela externa por ahora (ver sección de pagos abajo)
- **Hosting**: Vercel (o cualquier hosting de sitios estáticos)

## Cómo se identifica cada tipo de usuario

Este sistema tiene **dos identidades completamente separadas**:

**Cliente (sin login)** — la primera vez que alguien pide algo, se le pide
nombre y WhatsApp (sin contraseña). Ese dato se guarda en su dispositivo
(`localStorage`) junto con un token secreto, así en visitas siguientes
desde el mismo celular no se le vuelve a preguntar y puede ver sus pedidos
anteriores. El WhatsApp le sirve al mozo/cajero para contactarlo si no lo
encuentra en el sector, o si necesita avisarle algo (ej. un producto que
se agotó). No hay verificación real del número — cualquiera puede escribir
cualquier WhatsApp. Es aceptable para el objetivo operativo de este MVP
(poder contactar a alguien en el lugar), pero no es identidad verificada.

**Staff (con login real)** — camareros y cajero/admin entran con email y
contraseña por `/admin/login`, usando autenticación real de Supabase. Hay
dos roles:
- `camarero`: ve el tablero de pedidos, cambia estados, contacta al
  cliente por WhatsApp si hace falta. No edita la carta.
- `admin`: todo lo de camarero, más gestión de carta/precios/sectores,
  confirmación de pagos (comprobantes y cobros en persona), e historial.

## Estructura del proyecto

```
restaurant-app/
├── src/
│   ├── pages/client/           # Pantallas del cliente (identificación, carta, ubicación, pago, estado)
│   ├── pages/admin/            # Pantallas del staff (tablero, historial, editor de carta)
│   ├── hooks/                  # useAuth (staff), useCustomer (cliente), useCart, useOrderPolling
│   ├── lib/                    # dos clientes de Supabase (staff y customer), utilidades
│   └── components/             # rutas protegidas
├── supabase/migrations/        # Esquema SQL completo + datos de ejemplo
└── .env.example
```

## 1. Configurar Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. Ir a **SQL Editor** y ejecutar, en orden:
   - `supabase/migrations/0001_init.sql` (tablas, seguridad, triggers)
   - `supabase/migrations/0002_seed.sql` (datos de ejemplo: 1 local, zonas, productos)
   - `supabase/migrations/0003_payment_proof.sql` (soporte para comprobante de transferencia)
   - `supabase/migrations/0004_customer_identity.sql` (clientes sin login + roles de staff `admin`/`camarero`)
3. Ir a **Authentication > Providers** y confirmar que **Email** esté
   habilitado (esto es solo para el login del staff, los clientes no usan
   Supabase Auth).
4. **Crear tu primer usuario admin**: desde **Authentication > Users**,
   crear un usuario manualmente con email y contraseña (botón "Add user").
   Copiá su UUID y en el SQL Editor ejecutá:
   ```sql
   insert into profiles (id, full_name, role) values ('EL-UUID-DEL-USUARIO', 'Tu nombre', 'admin');
   ```
5. Para crear usuarios **camarero** más adelante, repetir el paso 4 con
   `role = 'camarero'`. No hay pantalla en la app para esto — es
   intencional, para que nadie pueda otorgarse acceso de staff por su
   cuenta.
6. Copiar **Project URL** y **anon public key** desde **Project Settings > API**.

### Cargar mesas y sectores

El cliente elige su ubicación de una lista agrupada en dos partes: **Mesas**
(sector restaurante/bar) y **Sectores generales** (tribuna, juegos, cancha
de pádel, etc — cualquier zona del club donde alguien pueda pedir sin tener
una mesa asignada). Ambos se cargan en la tabla `venue_zones`, diferenciados
por la columna `type` (`mesa` o `zona`). El seed (`0002_seed.sql`) ya trae
un ejemplo de cada uno; para agregar más:

```sql
insert into venue_zones (venue_id, name, type, sort_order) values
  ('00000000-0000-0000-0000-000000000001', 'Mesa 5', 'mesa', 9),
  ('00000000-0000-0000-0000-000000000001', 'Pileta', 'zona', 10);
```

## 2. Cómo funciona el pago en este MVP

No hay pasarela de pago online conectada todavía. El cliente elige una
forma de pago al confirmar su pedido:

- **Transferencia por alias** — si definís `VITE_TRANSFER_ALIAS`, esta
  opción aparece. El cliente ve el alias, transfiere desde su billetera
  virtual, y sube una foto del comprobante desde la app. El pedido queda
  en estado "pendiente de pago" con el comprobante visible para el cajero
  en el panel admin, quien lo confirma o rechaza con un botón.
- **Efectivo** — el pedido queda en una cola "Por cobrar en persona" en el
  panel admin. Un mozo se acerca a la ubicación indicada a cobrar, y
  cuando lo cobró, lo marca como "pago recibido" desde el panel — recién
  ahí el pedido pasa a la cola de preparación.
- **Tarjeta** — igual que efectivo, pero el mozo se acerca con el posnet.

Si no definís `VITE_TRANSFER_ALIAS`, solo aparecen las opciones de efectivo
y tarjeta.

## 3. Variables de entorno

Copiar `.env.example` a `.env` y completar:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_VENUE_ID=00000000-0000-0000-0000-000000000001
VITE_TRANSFER_ALIAS=mirestaurante.mp   (opcional, ver sección de pagos)
```

Todas estas son públicas (van al frontend) — no hay variables privadas en
esta versión, porque no hay backend propio ni pasarela de pago conectada.

## 4. Correr en local

```bash
npm install
npm run dev
```

## 5. Deploy

1. Subir este proyecto a un repositorio de GitHub.
2. En [vercel.com](https://vercel.com) (o Netlify, o cualquier hosting de
   sitios estáticos), importar el repositorio.
3. Agregar las variables de entorno del paso 3 en la configuración del
   hosting.
4. Deploy. Vercel detecta Vite automáticamente.

## Cómo usar

### Cliente
`https://tu-app.vercel.app` → la primera vez, ingresa nombre y WhatsApp →
ver carta → agregar items → elegir ubicación (mesa o sector general, de
una lista) → elegir forma de pago → confirmar → ver estado del pedido. En
visitas siguientes desde el mismo celular, entra directo a la carta.

### Staff
`https://tu-app.vercel.app/admin/login` → ingresar con cuenta de rol
`admin` o `camarero` → ver comprobantes y cobros pendientes arriba del
tablero (con WhatsApp del cliente para contactarlo) → ver tablero de
pedidos → marcar siguiente estado → ver historial completo en "Historial"
→ editar la carta en "Editar carta" (solo admin).

## Notas técnicas sobre la identidad sin login

Por seguridad, un cliente sin login no puede ver los pedidos de otro: cada
dispositivo genera un token secreto (no solo un id), y las políticas de
seguridad de la base de datos (RLS) exigen ese token para leer o crear
pedidos — no hay tabla abierta a cualquiera con la clave pública del
proyecto.

Una limitación de esto: las suscripciones en tiempo real de Supabase
(Realtime/WebSocket) no propagan ese token por una limitación conocida de
la plataforma. Por eso la pantalla de seguimiento del pedido del cliente
usa actualización periódica (cada 6 segundos) en lugar de tiempo real
instantáneo. El panel del staff sí usa tiempo real real, porque ahí la
sesión es de Supabase Auth normal.

## Roles

- Cliente: sin rol, sin cuenta. Identificado por nombre + WhatsApp +
  token de dispositivo. Solo ve sus propios pedidos.
- `camarero`: ve y gestiona todos los pedidos del local, contacta clientes.
- `admin`: igual que camarero, más gestión de carta y precios.

## Limitaciones conocidas del MVP (a definir en próximas iteraciones)

- Un solo local (`venue`). El esquema ya soporta multi-local, falta la UI.
- No hay división de cuenta entre varias personas en la misma mesa.
- No hay notificaciones push para el cliente (el estado se actualiza por
  sondeo periódico mientras tiene la pestaña/app abierta).
- No hay panel de métricas (ventas, productos más pedidos).
- Las fotos de productos se suben pegando una URL, no hay subida directa
  de imagen desde el editor de carta.
- No hay pasarela de pago online conectada (queda para una próxima etapa).
- Sin selector de ubicación por mapa/vista aérea por ahora — el esquema lo
  soporta (`location_type = punto_mapa`, columnas `map_x`/`map_y`) pero el
  flujo del cliente quedó simplificado a una lista de mesas y sectores.
- El WhatsApp del cliente no está verificado — cualquiera puede escribir
  cualquier número. Aceptable para contacto operativo, no para identidad
  verificada.
