# Modelo económico — Capy Camarero (Freemium)

> Especificación de trabajo del esquema comercial de la app de camareros
> (Camaut). El esquema económico del **restaurante / centro gastronómico** es un
> track aparte y se define por separado (ver "Pendientes").

**Estado:** en definición · **Mercado de lanzamiento:** Argentina (test) ·
**Moneda:** ARS

---

## 1. Principios

1. **La prioridad es la adopción.** El núcleo de la app (cobrar propinas, tomar
   pedidos, reputación) es y sigue siendo sin cargo.
2. **Lo único pago es superar el cupo de cartas con IA.** Todo lo demás —incluida
   la comanda por voz— es gratis.
3. **El precio se fija por valor, no por costo.** El costo de IA es despreciable
   (ver §2). El cupo existe para acotar el único costo que podría escalar de
   forma incierta (la subida de cartas por visión).
4. **Redacción abierta** en lo comercial: no prometer permanencia ni absolutos
   ("gratis para siempre", "100% gratis", "ilimitado"). Ver §6.

---

## 2. Costos reales medidos (nuestro costo)

Ambas funciones con IA corren sobre **Gemini 2.5 Flash**:

| Función | Qué procesa | Costo aprox. por uso |
|---|---|---|
| **Comanda por voz** | solo texto (la transcripción la hace el navegador, gratis) | **≈ US$0.0007** |
| **Carta con IA** | 1 foto del menú → JSON estructurado (visión) | **≈ US$0.005–0.02** según páginas |

- La voz es tan barata que se ofrece **gratis y sin límite**.
- Las cartas (visión) son el único costo con riesgo de escalar → llevan cupo.

---

## 3. Qué es gratis y qué se paga

**Gratis (sujeto a los límites y condiciones vigentes, §6):**
- Cobro de propinas, vinculación a locales por QR, toma de comandas (tipeando).
- **Comanda por voz con IA: sin límite.**
- Reputación, certificado, estadísticas, perfil, CV.
- **Subida de cartas con IA: 10 gratis (de por vida).**

**Pago (único punto de cobro):**
- Al llegar a **10 cartas** subidas con IA, para subir más se compra un
  **pack de cartas** (§4).

---

## 4. Pack de cartas (el único cobro)

- Se dispara **al superar las 10 cartas** con IA. Antes no aparece nada de pago.
- Al intentar subir la carta N.º 11, se muestra un cartel con el medio de pago.
- **Medio de pago:** el **mismo Mercado Pago** que las imágenes IA del venue
  —la cuenta recaudadora ya cargada en `capy_settings.mp_access_token`—. No hay
  que configurar nada nuevo.
- **Pack:** por defecto **10 cartas** (`CAPY_CARTA_PACK_SIZE`).
- **Precio:** configurable por secret `CAPY_CARTA_PACK_ARS`. **Pendiente de
  definir.**
- El pack **suma** al cupo del camarero (no vence). Se pueden comprar varios.

Relación con el restaurante (growth loop): si el local usa Capy, su carta entra
nativa y **no consume el cupo** del camarero. El cupo solo "pega" al que trabaja
en locales que aún no adoptaron Capy → nudge para activar el restaurante en vez
de comprar el pack.

---

## 5. (Reservado)

El modelo previo tenía un "Pack Pro" de pago único (voz + cartas + perfil). Se
descartó a favor del esquema simple: voz gratis y solo se cobra el pack de
cartas al superar las 10.

---

## 6. Redacción del "sin cargo" (abierta / no vinculante)

**Evitar:** "gratis para siempre", "100% gratis", "ilimitado" a secas.

**Usar:** "Gratis, sin vueltas" · "El plan sin cargo incluye cupos de uso,
sujeto a las condiciones vigentes" · "Podemos actualizar funciones, límites y
precios; te avisaremos los cambios".

Ya aplicado en la landing (`CamautLandingPage.jsx`) y en los Términos
específicos del camarero (`TerminosPage.jsx`), sección "Plan sin cargo y
funciones pagas".

---

## 7. Referidos (en revisión)

El mecanismo previo (5 camareros válidos → Pro bonificado; restaurante →
comisión) queda **en revisión**, porque el "Pro" ya no existe. Cuando se
retome, la recompensa natural pasa a ser **packs de cartas gratis**. La
atribución venue → camarero se mantiene contemplada en el modelo de datos para
reconocer la referencia más adelante.

---

## 8. Implementación técnica

**Base de datos (`0079_camarero_freemium.sql`) — hecho:**
- `profiles`: `ia_carta_quota` (default 10) e `ia_cartas_used`.
- Tabla `camarero_carta_purchases` (idempotencia por pago de MP).
- RPCs: `consume_ia_carta` (consume 1 carta, atómico), `get_camarero_carta_quota`
  (snapshot para la UI), `add_camarero_cartas` (suma un pack desde el webhook).

**Pago — hecho:**
- Edge `create-camarero-carta-payment`: crea la preferencia de MP con la cuenta
  de `capy_settings`. Pack y precio por secrets `CAPY_CARTA_PACK_SIZE` /
  `CAPY_CARTA_PACK_ARS`.
- `mp-upgrade-webhook` extendido para `carta_pack` (idempotente, suma cartas).

**Voz — hecho:** sin gating (gratis, sin límite).

**Frontend — parcial:** `src/lib/camareroPro.js` (`getCartaQuota`,
`startCartaPackCheckout`). Falta la UI (contador + cartel de pago al superar 10)
y el gating server-side de la subida de carta (hoy pasa por `gemini-proxy` anon;
hay que consumir `consume_ia_carta` en un edge autenticado o al confirmar la
subida).

---

## 9. Pendientes de definir

- **Precio del pack de cartas** (`CAPY_CARTA_PACK_ARS`) y tamaño del pack.
- **Referidos**: nueva recompensa (packs de cartas gratis) — ver §7.
- **Esquema económico del venue / centro gastronómico** (track separado).

> **Perfil profesional / CV Pro:** liberado (gratis). Ya no está atado a ningún
> pago.

---

## Anexo — Resumen

| Concepto | Valor |
|---|---|
| Comanda por voz | Gratis, sin límite |
| Cartas con IA gratis | 10 (de por vida) |
| Al superar 10 cartas | Pack de cartas (default 10) por Mercado Pago |
| Medio de pago | Mismo MP que las imágenes IA del venue (`capy_settings`) |
| Precio del pack | Pendiente (`CAPY_CARTA_PACK_ARS`) |
| Costo real IA | voz ≈ US$0.0007 · carta ≈ US$0.005–0.02 |
