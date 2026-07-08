self.addEventListener('push', event => {
  const data = event.data?.json() || {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Capy Camarero', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'capy-order',
      renotify: true,
      data: { url: data.url || '/camaut/app' },
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/camaut/app'
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      for (const client of list) {
        if (client.url.includes('/camaut') && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
