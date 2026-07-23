# Modelo económico — Capy Camarero (Freemium)

> Especificación de trabajo. Define el esquema comercial de la app de camareros
> (Camaut): qué es sin cargo, qué se paga, el pack Pro, las recargas y el
> sistema de referidos. El esquema económico del **restaurante / centro
> gastronómico** es un track aparte y se define por separado (ver "Pendientes").

**Estado:** en definición · **Mercado de lanzamiento:** Argentina (test) ·
**Moneda:** ARS

---

## 1. Principios

1. **La prioridad es la adopción.** El núcleo de la app (cobrar propinas, tomar
   pedidos, reputación) se ofrece sin cargo y no se toca.
2. **Se paga solo por un upgrade**, con **pago único** (no suscripción). El
   segmento (camareros, muchos changas/extras) es reacio a la suscripción.
3. **El precio se fija por valor, no por costo.** El costo de IA es
   despreciable (ver §2); el precio es una fracción de la propina extra que la
   app le genera al camarero.
4. **Redacción abierta** en todo lo comercial: no prometer permanencia ni
   absolutos ("gratis para siempre", "100% gratis", "ilimitado"). Ver §7.

---

## 2. Costos reales medidos (nuestro costo)

Ambas funciones con IA corren sobre **Gemini 2.5 Flash**:

| Función | Qué procesa | Costo aprox. por uso |
|---|---|---|
| **Comanda por voz** | solo texto (la transcripción la hace el navegador, gratis) + la carta | **≈ US$0.0007** |
| **Carta con IA** | 1 foto del menú → JSON estructurado (visión) | **≈ US$0.005–0.02** según páginas |

- 1.000 comandas por voz ≈ **< US$1**.
- 100 cartas subidas con IA ≈ **US$1–2**.

**Implicación:** el costo marginal es despreciable → el margen del pack Pro es
~95 %. Los topes existen para **evitar abuso** y **empujar el upgrade**, no para
cubrir costo. La **única** función con costo que podría escalar de forma
incierta es la **subida de cartas** (visión), por eso lleva tope duro.

---

## 3. Plan sin cargo (base)

Sin cargo, sujeto a los límites y condiciones vigentes (§7):

- Cobro de propinas al alias de Mercado Pago, mesa por mesa.
- Vinculación a locales por QR y trabajo vinculado.
- Toma de comandas **tipeando** (sin IA).
- Reputación / certificado digital / estadísticas.
- Perfil y CV (versión base).
- Funciones con IA, con **cupo de inicio** (valores propuestos, ajustables):
  - **Voz:** 40 comandas/mes.
  - **Cartas con IA:** 2 (de por vida).

> Los cupos del plan sin cargo son la línea de base propuesta; se calibran con
> datos de uso real.

---

## 4. Pack Pro (upgrade — pago único)

- **Precio:** **ARS 9.000**, **pago único**, desbloqueo de por vida.
- **Desbloquea:**
  - **Perfil profesional / CV Pro** → permanente (costo marginal 0, sin tope).
  - **Comanda por voz** → hasta **500/mes** (tope de uso razonable, anti-abuso).
  - **Cartas con IA** → **10** (tope; **no** ilimitado, por costo futuro
    incierto de la IA de visión).
- **Al agotar las cartas:** comprar una **Recarga de cartas** (§5) **o**
  activar el restaurante en Capy (su carta entra nativa y no consume cupo, §6).
- Los topes de exceso (500 voz/mes, 10 cartas) **aplican también al Pro
  bonificado** (§8.B): "bonificado" = el mismo producto sin cargo, no ilimitado.

---

## 5. Recargas / packs adicionales

- **Recarga de cartas:** +N cartas con IA. Es el "segundo desbloqueo" que
  mantiene protegido el único costo que puede escalar. **Precio: pendiente.**
- **(Opcional) Pack de voz:** solo si alguien supera 500/mes (poco frecuente).
  **Precio: pendiente / puede no existir en el lanzamiento.**

---

## 6. Cartas y el restaurante (growth loop B2B)

La carta propia del camarero solo hace falta en "modo suelto":

| Situación | De dónde sale la carta | ¿Consume cupo del camarero? |
|---|---|---|
| El restaurante usa Capy (camarero vinculado) | del venue, nativa | **No** |
| El restaurante **no** usa Capy (extra/suelto) | la sube el camarero con IA | **Sí** |

El tope de 10 cartas solo "pega" a quien trabaja en locales que aún no adoptaron
Capy. Cuando se acerca al límite tiene **dos salidas**, ambas favorables:

1. **Pagar la recarga** (monetización), o
2. **Que su restaurante active Capy** → la carta entra sola y deja de gastar
   cupo (**referido B2B**, §8.A).

**Mensaje in-app al acercarse al límite** (en lugar de solo "comprá más"):
> *"¿Tu restaurante todavía no usa Capy? Si lo activás, su carta entra sola y no
> gastás tus cartas."*

Así el candado **empuja la adopción del local** además de monetizar.

---

## 7. Redacción del "sin cargo" (abierta / no vinculante)

**Objetivo:** comunicar que es sin costo para arrancar **sin** comprometernos a
permanencia ni a límites fijos, para poder introducir funciones y ajustar
límites/precios en el futuro.

**Evitar:**
- "Gratis para siempre", "100% gratis", "para siempre".
- "Ilimitado" a secas (usar siempre "sujeto a uso razonable").
- Cualquier promesa absoluta o permanente.

**Usar:**
- "Gratis para empezar" · "Sin costo para arrancar" · "Plan sin cargo".
- "El plan sin cargo incluye [X], **sujeto a los límites y condiciones
  vigentes**."
- "**Podemos actualizar** las funciones, los límites y los precios; te
  avisaremos los cambios."
- Cláusula al pie / en Términos: *"Funciones, límites y precios sujetos a
  modificación. Consultá los Términos vigentes."*

**Cambios concretos en la landing de camarero** (`CamautLandingPage.jsx`):

| Hoy | Cambiar por |
|---|---|
| "Sin descargas · **100% gratis** · Funciona en Chrome y Safari" | "Sin descargas · **Gratis para empezar** · Funciona en Chrome y Safari" |
| Métrica "**Gratis** / Para empezar" | Mantener (ya dice "Para empezar", que matiza) |
| Feature "Tu carta, con IA" (se lee ilimitada) | Aclarar que el plan sin cargo incluye un **cupo** de cartas |
| Paso 3: "…usar la app **en extras** o vincularte…" | Reescribir sin nombrar el segmento (ej: "…tomar pedidos y cobrar propinas en cualquier turno, vinculado o por tu cuenta.") |
| Footer CTA: "Sumate **gratis**…" | "Sumate **sin costo**…" + nota "límites y funciones sujetos a cambios" |

> Nota: agregar una línea legal breve en el footer y remitir a Términos.

---

## 8. Referidos

### 8.A — Camarero refiere un **restaurante**

- **Atribución** venue → camarero registrada desde el alta del local (se deja
  contemplada en el modelo de datos desde el arranque, para poder reconocer la
  referencia más adelante).
- El esquema de incentivo/recompensa por referir un restaurante **no se define
  en esta especificación**; queda para el track del pricing del venue (§10).

### 8.B — Camarero refiere **5 camareros** → Pro bonificado

- **Referido válido =** se registra **+** (vincula alias de Mercado Pago **o**
  completa al menos 1 turno/comanda real). Evita cuentas fantasma.
- **1 Pro gratis por persona** (el Pro es de por vida; con uno alcanza).
- **Referidos extra** (más allá de 5) → **recargas de cartas gratis**, para que
  el loop siga vivo después del Pro.
- El Pro bonificado **es el mismo producto con los mismos topes** (500 voz/mes,
  10 cartas). No es ilimitado. Esto también acota nuestro costo en packs
  regalados.

**Guardrails anti-abuso:**
- Solo cuentan referidos "válidos" (arriba).
- 1 Pro bonificado por camarero como máximo.
- Registrar `pro_source` (paid | bonificado) para métricas.

---

## 9. Implementación técnica (alto nivel — para cuando se apruebe)

Contadores por camarero:
- `voz_mes` (se resetea cada mes), `cartas_usadas` (acumulado de por vida).
- `pro_activo` (bool), `pro_source` ('paid' | 'bonificado' | 'referral_venue').

Referidos:
- Tabla `referrals`: `referrer_staff_id`, `referred_type` ('waiter' | 'venue'),
  `referred_id`, `status` ('pending' | 'valid'), `reward`, timestamps.
- Atribución venue → camarero en el alta del local.

Gating:
- En `parse-voice-order` (voz) y en la subida de carta con IA: verificar
  cupo/Pro antes de ejecutar; si no hay cupo, devolver estado que dispare el
  paywall / nudge (§6).

Pago:
- Pack Pro **ARS 9.000** vía Mercado Pago (pago único). Recargas: ídem cuando se
  definan precios.

---

## 9.b Estado de implementación

**Incremento 1 (backend) — hecho:**
- Migración `0079_camarero_freemium.sql`: contadores en `profiles`
  (`ia_voice_period/used`, `ia_carta_quota/used`, `pro_active`, `pro_source`,
  `pro_activated_at`), tablas `camarero_pro_purchases` y `camarero_referrals`,
  y RPCs `consume_ia_quota`, `get_camarero_quota`, `grant_camarero_pro`,
  `add_camarero_cartas`.
- Gating de **voz** en `parse-voice-order` (identifica al camarero por JWT y
  consume cupo; si no hay identidad, procesa igual por compatibilidad).
- Pago del Pro: edge `create-camarero-pro-payment` (ARS 9.000, o recarga) +
  `mp-upgrade-webhook` extendido para `pro_camarero` / `recarga_cartas`
  (idempotente, otorga Pro / suma cartas).
- Frontend: `src/lib/camareroPro.js` (`getCamareroQuota`,
  `startCamareroProCheckout`).

**Incremento 2 (pendiente):**
- Gating de **cartas** (rutear la subida por un edge autenticado que consuma
  `consume_ia_quota(..., 'carta')`, hoy la carta pasa por `gemini-proxy` anon).
- UI: mostrar cupos, paywall/nudge al agotar, botón de upgrade y flujo de
  referidos (5 camareros válidos = Pro bonificado).
- Recarga de cartas: default 5 cartas; precio en `CAPY_RECARGA_CARTAS_ARS`
  (pendiente de definir).

## 10. Pendientes de definir

- **Precio de la recarga de cartas** (y si existe pack de voz).
- **Incentivo por referir restaurantes** (atado al pricing del venue).
- **Cupos finales del plan sin cargo** (propuesto: 40 voz/mes + 2 cartas).
- **Esquema económico del venue / centro gastronómico** (track separado; debe
  conversar con el sistema de referidos del camarero).

---

## Anexo — Resumen de números cerrados

| Concepto | Valor |
|---|---|
| Pack Pro camarero | **ARS 9.000**, pago único, de por vida |
| Pro incluye | Perfil profesional (permanente) + voz 500/mes + 10 cartas IA |
| Plan sin cargo (propuesto) | voz 40/mes + 2 cartas IA + todo el core |
| Referir 5 camareros válidos | Pro bonificado (mismos topes) |
| Referidos extra (>5) | recargas de cartas gratis |
| Referir restaurante | atribución registrada; incentivo a definir (fuera de alcance) |
| Costo real IA por uso | voz ≈ US$0.0007 · carta ≈ US$0.005–0.02 |
