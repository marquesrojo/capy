import { Link } from 'react-router-dom'

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-carbon-950 px-5 py-10">
      <Link to="/camareroa" className="text-smoke-500 text-sm">← Volver</Link>

      <div className="mt-8 max-w-lg mx-auto">
        <p className="font-display text-2xl text-ember-500 tracking-wide mb-1">CAPY</p>
        <h1 className="font-bold text-smoke-200 text-xl mb-1">Términos y Condiciones</h1>
        <p className="text-smoke-600 text-xs mb-8">Última actualización: julio de 2026</p>

        <div className="space-y-6 text-smoke-400 text-sm leading-relaxed">

          <section>
            <h2 className="text-smoke-200 font-semibold mb-2">1. Aceptación</h2>
            <p>
              Al crear una cuenta en CAPY o usar cualquiera de sus funciones, aceptás estos Términos y Condiciones
              en su totalidad. Si no estás de acuerdo, no uses la plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-smoke-200 font-semibold mb-2">2. El servicio</h2>
            <p>
              CAPY es una herramienta digital para profesionales gastronómicos que permite:
            </p>
            <ul className="space-y-1.5 list-disc pl-4 mt-2">
              <li>Tomar y gestionar comandas en tiempo real.</li>
              <li>Registrar propinas por turno.</li>
              <li>Acumular experiencia (XP) y obtener niveles y badges.</li>
              <li>Generar un certificado de trayectoria verificado.</li>
              <li>Competir en el ranking con otros profesionales.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-smoke-200 font-semibold mb-2">3. Tu cuenta</h2>
            <ul className="space-y-1.5 list-disc pl-4">
              <li>Sos responsable de mantener la confidencialidad de tus credenciales.</li>
              <li>Debés proporcionar información veraz al registrarte.</li>
              <li>No podés ceder, vender ni transferir tu cuenta a otra persona.</li>
              <li>Podés eliminar tu cuenta en cualquier momento escribiéndonos a <a href="mailto:hola@capyapp.co" className="text-ember-500 underline">hola@capyapp.co</a>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-smoke-200 font-semibold mb-2">4. Uso permitido</h2>
            <p>CAPY está diseñado para uso profesional legítimo. Queda prohibido:</p>
            <ul className="space-y-1.5 list-disc pl-4 mt-2">
              <li>Cargar datos falsos para inflar XP o posición en el ranking.</li>
              <li>Usar la plataforma para actividades ilegales o fraudulentas.</li>
              <li>Intentar acceder a cuentas o datos de otros usuarios.</li>
              <li>Automatizar el uso de la app con bots o scripts.</li>
            </ul>
            <p className="mt-2">
              El incumplimiento puede resultar en la suspensión o eliminación permanente de tu cuenta.
            </p>
          </section>

          <section>
            <h2 className="text-smoke-200 font-semibold mb-2">5. XP, niveles y certificados</h2>
            <p>
              El sistema de XP y niveles es una representación interna del uso de la plataforma.
              CAPY no garantiza que los certificados generados sean reconocidos por empleadores u
              organismos externos. La validez del certificado depende de la decisión de cada empleador.
            </p>
          </section>

          <section>
            <h2 className="text-smoke-200 font-semibold mb-2">6. Propinas</h2>
            <p>
              CAPY facilita el registro y cobro de propinas mediante links de Mercado Pago y alias bancarios.
              No intervenimos en las transferencias: estas ocurren directamente entre el cliente y el camarero.
              CAPY no retiene ni procesa dinero en ningún caso.
            </p>
          </section>

          <section>
            <h2 className="text-smoke-200 font-semibold mb-2">7. Plan sin cargo y funciones pagas</h2>
            <p>
              CAPY ofrece un plan sin cargo con las funciones esenciales (toma de comandas, registro de
              propinas, reputación y estadísticas), sujeto a los límites de uso vigentes. Algunas funciones
              —en particular las asistidas por inteligencia artificial, como la carga de cartas y la toma de
              comandas por voz— tienen cupos de uso dentro del plan sin cargo.
            </p>
            <p className="mt-2">
              CAPY ofrece además un desbloqueo pago ("Pack Pro"), de <strong>pago único</strong>, que amplía o
              habilita funciones (por ejemplo, el perfil profesional y mayores cupos de las funciones con IA),
              siempre dentro de límites de uso razonable. Al agotarse un cupo, podés adquirir recargas
              adicionales o continuar usando las funciones sin IA sin cargo.
            </p>
            <p className="mt-2">
              Los cupos, límites, funciones incluidas y precios vigentes se informan dentro de la app antes de
              cualquier cobro. CAPY puede modificar los cupos, límites, funciones y precios, así como incorporar
              nuevas funciones o planes, notificando los cambios relevantes. El plan sin cargo <strong>no implica
              gratuidad permanente ni ilimitada</strong> de ninguna función.
            </p>
            <p className="mt-2">
              Las promociones, bonificaciones y programas de referidos (por ejemplo, desbloqueos bonificados por
              referir usuarios o locales) están sujetos a las condiciones específicas vigentes al momento de cada
              promoción y pueden ser modificados o discontinuados, sin obligación de continuidad.
            </p>
          </section>

          <section>
            <h2 className="text-smoke-200 font-semibold mb-2">8. Propiedad intelectual</h2>
            <p>
              El nombre CAPY, el logo, el diseño y el código de la plataforma son propiedad de sus creadores.
              No podés reproducir, distribuir ni crear trabajos derivados sin autorización escrita.
            </p>
          </section>

          <section>
            <h2 className="text-smoke-200 font-semibold mb-2">9. Limitación de responsabilidad</h2>
            <p>
              CAPY se brinda "tal cual está". No garantizamos disponibilidad ininterrumpida del servicio.
              En ningún caso seremos responsables por pérdida de datos, lucro cesante o daños indirectos
              derivados del uso o la imposibilidad de uso de la plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-smoke-200 font-semibold mb-2">10. Modificaciones</h2>
            <p>
              Podemos modificar estos Términos en cualquier momento. Te notificaremos por email ante cambios
              relevantes. El uso continuado de la app luego de la notificación implica la aceptación de
              los nuevos términos.
            </p>
          </section>

          <section>
            <h2 className="text-smoke-200 font-semibold mb-2">11. Ley aplicable</h2>
            <p>
              Estos Términos se rigen por las leyes de la República Argentina. Cualquier controversia
              se someterá a la jurisdicción de los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires.
            </p>
          </section>

          <section>
            <h2 className="text-smoke-200 font-semibold mb-2">12. Contacto</h2>
            <p>
              Para consultas sobre estos términos:{' '}
              <a href="mailto:hola@capyapp.co" className="text-ember-500 underline">hola@capyapp.co</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
