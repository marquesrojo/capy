// ¿Estamos dentro de la app instalada y no en una pestaña del navegador?
//
// Importa para el login: el OAuth de Google no se puede completar adentro del
// contenedor de una PWA. Android lo abre en el navegador, la sesión queda en
// esa pestaña y no en la app, y encima deja atrás la pestaña del selector de
// cuentas de Google, que es lo que el usuario ve como "se me abrió otra solapa".
//
// Cuando esto da true hay que ofrecer el login por código de email, que
// arranca y termina adentro de la app.
export function isStandaloneApp() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches ||
      !!window.navigator.standalone
  } catch {
    return false
  }
}
