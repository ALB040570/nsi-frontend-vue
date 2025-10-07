import { Workbox } from 'workbox-window'

export function registerPWA(): void {
  if (!('serviceWorker' in navigator)) return

  const wb = new Workbox('/sw.js')

  const reloadOnControlling = () => {
    console.info('[PWA] Service worker took control, reloading to apply updates')
    window.location.reload()
  }

  wb.addEventListener('waiting', () => {
    console.info('[PWA] New version available (waiting). Applying update...')
    wb.addEventListener('controlling', reloadOnControlling)
    wb.messageSkipWaiting()
  })

  wb.register()
}
