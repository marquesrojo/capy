import { Link } from 'react-router-dom'

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-carbon-950 px-5 py-10">
      <Link to="/camareroa" className="text-smoke-500 text-sm">← Volver</Link>

      <div className="mt-8 max-w-lg mx-auto">
        <p className="font-display text-2xl text-ember-500 tracking-wide mb-1">CAPY</p>
        <h1 className="font-bold text-smoke-200 text-xl mb-1">Política de Privacidad</h1>
        <p className="text-smoke-600 text-xs mb-8">Última actualización: junio de 2026</p>

        <div className="space-y-6 text-smoke-400 text-sm leading-relaxed">

          <section>
            <h2 className="text-smoke-200 font-semibold mb-2">1. Quiénes somos</h2>
            <p>
              CAPY es una plataforma digital desarrollada en Argentina que ofrece herramientas profesionales
              para camareros y personal gastronómico. Nos podés contactar en{' '}
              <a href="mailto:hola@capyapp.co" className="text-ember-500 underline">hola@capyapp.co</a>.
            </p>
          </section>

          <section>
            <h2 className="text-smoke-200 font-semibold mb-2">2. Qué información recopilamos</h2>
            <ul className="space-y-1.5 list-disc pl-4">
              <li><strong className="text-smoke-300">Datos de cuenta:</strong> nombre, dirección de correo electrónico y, opcionalmente, número de documento y perfil de LinkedIn.</li>
              <li><strong className="text-smoke-300">Datos de actividad:</strong> comandas tomadas, propinas registradas, turnos trabajados, calificaciones recibidas.</li>
              <li><strong className="text-smoke-300">Datos de uso:</strong> dispositivo, sistema operativo y comportamiento dentro de la app (para mejorar el servicio).</li>
              <li><strong className="text-smoke-300">Datos de terceros:</strong> si iniciás sesión con Google, recibimos tu nombre y email desde Google.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-smoke-200 font-semibold mb-2">3. Para qué usamos tu información</h2>
            <ul className="space-y-1.5 list-disc pl-4">
              <li>Brindarte acceso a las funciones de la app (comandas, kanban, propinas, ranking).</li>
              <li>Generar tu certificado de experiencia verificado.</li>
              <li>Calcular tu XP, nivel y posición en el ranking.</li>
              <li>Enviarte notificaciones relevantes sobre tu cuenta o actividad.</li>
              <li>Mejorar el producto con datos agregados y anónimos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-smoke-200 font-semibold mb-2">4. Dónde guardamos tus datos</h2>
            <p>
              Tus datos se almacenan en servidores de <strong className="text-smoke-300">Supabase</strong> ubicados
              en la región de São Paulo, Brasil. Supabase cumple con estándares de seguridad SOC 2 Type II.
            </p>
          </section>

          <section>
            <h2 className="text-smoke-200 font-semibold mb-2">5. Terceros que acceden a tus datos</h2>
            <ul className="space-y-1.5 list-disc pl-4">
              <li><strong className="text-smoke-300">Google</strong> (autenticación opcional): si usás "Iniciar sesión con Google", Google comparte tu nombre y email con nosotros.</li>
              <li><strong className="text-smoke-300">Mercado Pago</strong>: los links de propina abren la app de Mercado Pago. No compartimos datos de pago con ellos.</li>
              <li><strong className="text-smoke-300">WhatsApp / Meta</strong>: las notificaciones de pedidos se envían vía WhatsApp Business. Solo se comparte el número del local, no datos de clientes.</li>
            </ul>
            <p className="mt-2">No vendemos ni cedemos tus datos personales a terceros con fines comerciales.</p>
          </section>

          <section>
            <h2 className="text-smoke-200 font-semibold mb-2">6. Tus derechos</h2>
            <p>De acuerdo con la Ley N° 25.326 de Protección de Datos Personales (Argentina), tenés derecho a:</p>
            <ul className="space-y-1.5 list-disc pl-4 mt-2">
              <li>Acceder a los datos que tenemos sobre vos.</li>
              <li>Solicitar la corrección de datos incorrectos.</li>
              <li>Pedir la eliminación de tu cuenta y tus datos.</li>
              <li>Oponerte al tratamiento de tus datos en cualquier momento.</li>
            </ul>
            <p className="mt-2">
              Para ejercer estos derechos, escribinos a{' '}
              <a href="mailto:hola@capyapp.co" className="text-ember-500 underline">hola@capyapp.co</a>.
            </p>
          </section>

          <section>
            <h2 className="text-smoke-200 font-semibold mb-2">7. Cookies y almacenamiento local</h2>
            <p>
              CAPY utiliza localStorage del navegador para guardar tu sesión y preferencias de uso.
              No utilizamos cookies de seguimiento de terceros ni publicidad.
            </p>
          </section>

          <section>
            <h2 className="text-smoke-200 font-semibold mb-2">8. Menores de edad</h2>
            <p>
              CAPY está destinado a personas mayores de 18 años. No recopilamos intencionalmente
              información de menores de edad.
            </p>
          </section>

          <section>
            <h2 className="text-smoke-200 font-semibold mb-2">9. Cambios a esta política</h2>
            <p>
              Podemos actualizar esta política en cualquier momento. Te notificaremos por email
              ante cambios significativos. El uso continuado de la app implica la aceptación
              de la política vigente.
            </p>
          </section>

          <section>
            <h2 className="text-smoke-200 font-semibold mb-2">10. Contacto</h2>
            <p>
              Para cualquier consulta sobre privacidad:{' '}
              <a href="mailto:hola@capyapp.co" className="text-ember-500 underline">hola@capyapp.co</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
