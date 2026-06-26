<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Templates QR — Capy</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Bebas+Neue&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: #e5e5e5;
    font-family: 'Inter', sans-serif;
    padding: 40px 20px;
  }

  h2 {
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: #666;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin: 40px 0 16px;
    text-align: center;
  }

  /* ─── A4 ─── */
  .a4 {
    width: 210mm;
    height: 297mm;
    background: #1A1A1A;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    border-radius: 4px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.3);
  }

  /* Fondo sutil */
  .a4::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 70% 50% at 50% 30%, rgba(232,119,42,0.10) 0%, transparent 70%),
      radial-gradient(ellipse 50% 60% at 80% 80%, rgba(232,119,42,0.05) 0%, transparent 60%);
  }

  /* Grid de puntos */
  .a4::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 28px 28px;
  }

  .a4-content {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    padding: 60px 60px;
    width: 100%;
  }

  /* Logo restaurante placeholder */
  .resto-logo {
    width: 90px;
    height: 90px;
    border-radius: 22px;
    background: rgba(232,119,42,0.15);
    border: 1.5px solid rgba(232,119,42,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
  }

  .resto-logo-text {
    font-size: 11px;
    font-weight: 600;
    color: rgba(232,119,42,0.6);
    text-align: center;
    line-height: 1.4;
    letter-spacing: 0.05em;
  }

  /* Nombre restaurante */
  .resto-name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 52px;
    color: #F5F0EB;
    letter-spacing: 0.08em;
    text-align: center;
    margin-bottom: 6px;
    line-height: 1;
  }

  .resto-tagline {
    font-size: 13px;
    font-weight: 400;
    color: rgba(245,240,235,0.35);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    text-align: center;
    margin-bottom: 48px;
  }

  /* Divisor */
  .divider {
    width: 48px;
    height: 2px;
    background: #E8772A;
    border-radius: 2px;
    margin-bottom: 48px;
  }

  /* QR container A4 */
  .qr-a4-wrap {
    background: #F5F0EB;
    border-radius: 24px;
    padding: 28px;
    margin-bottom: 48px;
    box-shadow: 0 0 0 1px rgba(232,119,42,0.2), 0 20px 60px rgba(0,0,0,0.4);
  }

  #qr-a4 canvas,
  #qr-a4 img {
    display: block;
    width: 240px !important;
    height: 240px !important;
  }

  /* Texto invitación */
  .invite-text {
    font-size: 19px;
    font-weight: 500;
    color: #F5F0EB;
    text-align: center;
    line-height: 1.5;
    max-width: 420px;
    margin-bottom: 48px;
  }

  .invite-text strong {
    color: #E8772A;
    font-weight: 700;
  }

  /* Divider bottom */
  .divider-bottom {
    width: 100%;
    height: 1px;
    background: rgba(255,255,255,0.07);
    margin-bottom: 32px;
  }

  /* Footer powered by */
  .powered {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .powered-text {
    font-size: 10px;
    font-weight: 400;
    color: rgba(245,240,235,0.2);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .powered-logo {
    width: 28px;
    height: 28px;
    border-radius: 7px;
    overflow: hidden;
  }

  .powered-logo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.5;
  }

  .powered-brand {
    font-size: 12px;
    font-weight: 700;
    color: rgba(232,119,42,0.5);
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }

  /* ─── 5x10cm ─── */
  .small-wrap {
    display: flex;
    gap: 24px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .small {
    width: 56.7mm; /* ~5.67cm para margen de impresión */
    height: 113.4mm; /* ~10cm */
    background: #E8772A;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px 14px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.25);
    position: relative;
    overflow: hidden;
    gap: 0;
  }

  .small::before {
    content: '';
    position: absolute;
    top: -30px;
    right: -30px;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: rgba(255,255,255,0.08);
  }

  .small::after {
    content: '';
    position: absolute;
    bottom: -20px;
    left: -20px;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: rgba(0,0,0,0.08);
  }

  .small-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 20px;
    color: white;
    letter-spacing: 0.1em;
    text-align: center;
    margin-bottom: 14px;
    position: relative;
    z-index: 1;
    line-height: 1.1;
  }

  .qr-small-wrap {
    background: white;
    border-radius: 12px;
    padding: 10px;
    margin-bottom: 14px;
    position: relative;
    z-index: 1;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  }

  #qr-small canvas,
  #qr-small img {
    display: block;
    width: 110px !important;
    height: 110px !important;
  }

  .small-url {
    font-size: 9px;
    font-weight: 600;
    color: rgba(255,255,255,0.7);
    letter-spacing: 0.08em;
    text-align: center;
    position: relative;
    z-index: 1;
  }

  .small-powered {
    font-size: 7px;
    color: rgba(255,255,255,0.4);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-top: 10px;
    position: relative;
    z-index: 1;
  }

  /* Print */
  @media print {
    body { background: white; padding: 0; }
    h2 { display: none; }
    .a4 { box-shadow: none; border-radius: 0; page-break-after: always; }
    .small { box-shadow: none; }
  }
</style>
</head>
<body>

<h2>Template A4 — Para imprimir y colgar</h2>

<!-- A4 -->
<div class="a4">
  <div class="a4-content">

    <!-- Logo placeholder -->
    <div class="resto-logo">
      <div class="resto-logo-text">LOGO<br>RESTO</div>
    </div>

    <!-- Nombre -->
    <div class="resto-name">Pucará Resto Bar</div>
    <div class="resto-tagline">Restaurante &amp; Bar</div>

    <div class="divider"></div>

    <!-- QR -->
    <div class="qr-a4-wrap">
      <div id="qr-a4"></div>
    </div>

    <!-- Texto -->
    <div class="invite-text">
      Escaneá el código, elegí lo que querés<br>
      y <strong>seguí tu pedido en tiempo real</strong>
    </div>

    <div class="divider-bottom"></div>

    <!-- Powered by -->
    <div class="powered">
      <span class="powered-text">Powered by</span>
      <img
        src="https://ycgptakgpsvmstoftkdk.supabase.co/storage/v1/object/public/icons/icon-192.png"
        style="width:20px;height:20px;border-radius:5px;opacity:0.4;"
        onerror="this.style.display='none'"
      />
      <span class="powered-brand">Capy</span>
    </div>

  </div>
</div>

<h2>Template 5×10 cm — Para pegar en las mesas</h2>

<div class="small-wrap">
  <div class="small">
    <div class="small-title">PEDÍ<br>DESDE ACÁ</div>
    <div class="qr-small-wrap">
      <div id="qr-small"></div>
    </div>
    <div class="small-url">capyapp.co</div>
    <div class="small-powered">Powered by Capy</div>
  </div>
</div>

<script>
  // QR A4
  new QRCode(document.getElementById('qr-a4'), {
    text: 'https://capyapp.co',
    width: 240,
    height: 240,
    colorDark: '#1A1A1A',
    colorLight: '#F5F0EB',
    correctLevel: QRCode.CorrectLevel.H
  })

  // QR pequeño
  new QRCode(document.getElementById('qr-small'), {
    text: 'https://capyapp.co',
    width: 110,
    height: 110,
    colorDark: '#1A1A1A',
    colorLight: '#FFFFFF',
    correctLevel: QRCode.CorrectLevel.H
  })
</script>

</body>
</html>
