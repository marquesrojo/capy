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
2. **Lo único pago es superar el cupo de imágenes de carta con IA.** Todo lo demás —incluida
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
- Las imágenes de carta (visión) son el único costo con riesgo de escalar →
  llevan cupo. La unidad es la **imagen** procesada con IA (una carta puede ser
  varias imágenes/páginas).

---

## 3. Qué es gratis y qué se paga

**Gratis (sujeto a los límites y condiciones vigentes, §6):**
- Cobro de propinas, vinculación a locales por QR, toma de comandas (tipeando).
- **Comanda por voz con IA: sin límite.**
- Reputación, certificado, estadísticas, **perfil profesional / CV (liberado)**.
- **Subida de imágenes de carta con IA: 10 gratis (de por vida).**

**Pago (único punto de cobro):**
- Al llegar a **10 imágenes** subidas con IA, para subir más se compra un
  **pack de imágenes** (§4).

---

## 4. Pack de imágenes (el único cobro)

- Se dispara **al superar las 10 imágenes** con IA. Antes no aparece nada de pago.
- Al intentar subir la imagen N.º 11, se muestra un cartel con el medio de pago.
- **Medio de pago:** el **mismo Mercado Pago** que las imágenes IA del venue
  —la cuenta recaudadora ya cargada en `capy_settings.mp_access_token`—. No hay
  que configurar nada nuevo.
- **Pack:** **10 imágenes por $8.000** (configurable: `CAPY_IMAGE_PACK_SIZE` /
  `CAPY_IMAGE_PACK_ARS`).
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
retome, la recompensa natural pasa a ser **packs de imágenes gratis**. La
atribución venue → camarero se mantiene contemplada en el modelo de datos para
reconocer la referencia más adelante.

---

## 8. Implementación técnica

**Base de datos (`0079_camarero_freemium.sql`) — hecho:**
- `profiles`: `ia_image_quota` (default 10) e `ia_images_used`.
- Tabla `camarero_image_purchases` (idempotencia por pago de MP).
- RPCs: `consume_ia_image` (consume 1 imagen, atómico), `get_camarero_image_quota`
  (snapshot para la UI), `add_camarero_images` (suma un pack desde el webhook).

**Pago — hecho:**
- Edge `create-camarero-image-payment`: crea la preferencia de MP con la cuenta
  de `capy_settings`. Pack **10 imágenes por $8.000** (secrets
  `CAPY_IMAGE_PACK_SIZE` / `CAPY_IMAGE_PACK_ARS`).
- `mp-upgrade-webhook` extendido para `image_pack` (idempotente, suma imágenes).

**Voz — hecho:** sin gating (gratis, sin límite).

**Frontend — parcial:** `src/lib/camareroImages.js` (`getImageQuota`,
`startImagePackCheckout`). Falta la UI (contador + cartel de pago al superar 10)
y el gating server-side de la subida de imagen (hoy pasa por `gemini-proxy` anon;
hay que consumir `consume_ia_image` en un edge autenticado o al confirmar la
subida).

---

## 9. Pendientes de definir

- **Referidos**: nueva recompensa (packs de imágenes gratis) — ver §7.
- **Esquema económico del venue / centro gastronómico** (track separado).

> **Perfil profesional / CV Pro:** liberado (gratis). Ya no está atado a ningún
> pago.

---

## Anexo — Resumen

| Concepto | Valor |
|---|---|
| Comanda por voz | Gratis, sin límite |
| Perfil profesional / CV | Liberado (gratis) |
| Imágenes de carta con IA gratis | 10 (de por vida) |
| Al superar 10 imágenes | Pack de 10 imágenes por $8.000 (Mercado Pago) |
| Medio de pago | Mismo MP que las imágenes IA del venue (`capy_settings`) |
| Costo real IA | voz ≈ US$0.0007 · imagen ≈ US$0.005–0.02 |
