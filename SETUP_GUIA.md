# Guía de puesta en marcha de Capy — paso a paso

Esta guía asume que no hiciste nada todavía salvo tener cuenta de GitHub.
Orden: **Supabase → GitHub → Vercel**. Cada paso depende del anterior, así
que conviene no saltear ninguno.

---

## PARTE 1 — Supabase (la base de datos)

### 1.1 Crear el proyecto

1. Entrá a https://supabase.com y entrá con tu cuenta (podés usar "Continue
   with GitHub" para no crear otra contraseña).
2. Click en **New Project**.
3. Elegí:
   - **Name**: por ejemplo `mi-restaurante`
   - **Database Password**: generá una y guardala en algún lado (no la vas
     a usar seguido, pero por si acaso).
   - **Region**: la más cercana a Argentina (South America - São Paulo).
4. Click en **Create new project** y esperá 1-2 minutos.

### 1.2 Crear las tablas (correr las migraciones)

1. En el menú izquierdo, click en **SQL Editor**.
2. Click en **New query**.
3. Abrí en tu computadora el archivo `supabase/migrations/0001_init.sql`
   (está en la carpeta que descomprimiste del zip), copiá **todo** el
   contenido, pegalo en el editor de Supabase, y click en **Run**.
4. Tiene que decir "Success. No rows returned" o similar. Si dice error,
   copiá el mensaje y avisame antes de seguir.
5. Repetí el mismo proceso, **en este orden exacto**, con cada uno de
   estos archivos (un archivo por vez, esperando que el anterior termine
   bien):
   - `0002_seed.sql`
   - `0003_payment_proof.sql`
   - `0004_customer_identity.sql`

### 1.3 Crear tu usuario admin

1. Menú izquierdo → **Authentication** → pestaña **Users**.
2. Click en **Add user** → **Create new user**.
3. Completá tu email y una contraseña (esta es la que vas a usar para
   entrar al panel de administración del restaurante).
4. Una vez creado, click en ese usuario en la lista y copiá su **UID**
   (un código largo tipo `a1b2c3d4-...`).
5. Volvé a **SQL Editor** → **New query**, pegá esto cambiando los valores
   marcados, y click en **Run**:
   ```sql
   insert into profiles (id, full_name, role)
   values ('PEGÁ-ACÁ-EL-UID-QUE-COPIASTE', 'Tu nombre', 'admin');
   ```

### 1.4 Copiar las credenciales del proyecto

1. Menú izquierdo → **Project Settings** (ícono de engranaje) → **API**.
2. Vas a ver dos valores que necesitamos para más adelante, dejalos
   anotados o esta misma pestaña abierta:
   - **Project URL** (algo como `https://xxxxx.supabase.co`)
   - **anon public** key (un texto largo)

✅ Con esto, Supabase queda listo. No cierres esta pestaña todavía, la vas
a necesitar en la Parte 3.

---

## PARTE 2 — GitHub (subir el código)

### 2.1 Crear el repositorio

1. Entrá a https://github.com con tu cuenta.
2. Click en el botón verde **New** (o el ícono **+** arriba a la derecha
   → **New repository**).
3. **Repository name**: por ejemplo `restaurant-app`.
4. Dejalo en **Private** (privado) — no hace falta que sea público.
5. NO marques ninguna casilla de "Add a README" ni ".gitignore" (el
   proyecto ya los trae).
6. Click en **Create repository**.

### 2.2 Subir los archivos

GitHub te va a mostrar una pantalla con comandos, pero la forma más simple
sin usar la terminal es:

1. En la página del repositorio recién creado, buscá el link que dice
   **uploading an existing file** (o "upload files").
2. Abrí la carpeta del proyecto descomprimido en tu computadora.
3. Arrastrá **todos los archivos y carpetas** de adentro de `restaurant-app`
   (no la carpeta en sí, sino su contenido: `src`, `supabase`, `package.json`,
   `README.md`, etc.) hacia esa pantalla de GitHub.
4. Esperá que termine de subir todo (puede tardar un poco).
5. Abajo de la página, en "Commit changes", dejá el mensaje por defecto y
   click en **Commit changes**.

⚠️ Importante: el archivo `.env` (si ya lo creaste en tu compu) **no se
sube nunca a GitHub** — tiene tus claves. El proyecto ya tiene una regla
(`.gitignore`) que lo bloquea si usás Git por terminal; si subís a mano
por el navegador, simplemente no arrastres ese archivo.

✅ Con esto, el código ya está en GitHub.

---

## PARTE 3 — Vercel (poner el sitio online)

### 3.1 Conectar Vercel con GitHub

1. Entrá a https://vercel.com y elegí **Continue with GitHub** para
   loguearte (te va a pedir autorizar el acceso, aceptá).
2. En el dashboard de Vercel, click en **Add New** → **Project**.
3. Vas a ver la lista de tus repositorios de GitHub — buscá `restaurant-app`
   y click en **Import**.

### 3.2 Configurar las variables de entorno

Antes de hacer click en "Deploy", Vercel te muestra una sección
**Environment Variables**. Ahí agregás, una por una (nombre y valor):

| Nombre | Valor |
|---|---|
| `VITE_SUPABASE_URL` | el Project URL que copiaste en el paso 1.4 |
| `VITE_SUPABASE_ANON_KEY` | la anon public key que copiaste en el paso 1.4 |
| `VITE_VENUE_ID` | `00000000-0000-0000-0000-000000000001` |
| `VITE_TRANSFER_ALIAS` | tu alias de Mercado Pago/banco (opcional — si no lo ponés, el cliente solo va a poder elegir efectivo o tarjeta) |

### 3.3 Deploy

1. Click en **Deploy**.
2. Esperá 1-2 minutos. Cuando termina, te muestra una pantalla de éxito
   con un botón para ver el sitio.
3. La URL va a ser algo como `https://restaurant-app-tunombre.vercel.app`
   — esa es la dirección real que podés compartir o abrir desde el
   celular.

✅ Listo, el sitio ya está online.

---

## Cómo probarlo

- **Como cliente**: abrí la URL de Vercel desde tu celular. Te va a pedir
  nombre y WhatsApp la primera vez, después podés ver la carta, agregar
  productos, elegir mesa o sector, y elegir forma de pago.
- **Como staff**: abrí `[tu-url-de-vercel]/admin/login` y entrá con el
  email/contraseña que creaste en el paso 1.3. Ahí vas a ver el tablero
  de pedidos en tiempo real.

## Si necesitás hacer cambios más adelante

Cualquier ajuste futuro al código (que vayamos haciendo en el chat) hay
que volver a subirlo a GitHub (reemplazando los archivos que cambiaron) y
Vercel automáticamente vuelve a desplegar el sitio con la versión nueva —
no hay que repetir la configuración.
