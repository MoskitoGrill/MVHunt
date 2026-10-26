export async function registerPwa(report: (text: string) => void) {
  if (!import.meta.env.PROD) { report('Vývojový režim – service worker se neregistruje. PWA ověřujte přes build a preview.'); return () => {} }
  if (!('serviceWorker' in navigator) || !window.isSecureContext) { report('PWA vyžaduje HTTPS a podporu service workeru.'); return () => {} }
  try {
    const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {scope:import.meta.env.BASE_URL, updateViaCache:'none'})
    const status = () => report(registration.waiting ? 'Nová verze je připravena. Po hře zavřete všechna okna a instalovanou aplikaci MVHunt, potom ji znovu otevřete. Neobnovujte ji během nejisté akce.' : registration.active ? 'Aplikace připravena pro další spuštění offline; herní data vyžadují spojení.' : 'Připravuji soubory pro další spuštění offline…')
    const update = () => { status(); registration.installing?.addEventListener('statechange',status) }
    registration.addEventListener('updatefound',update); update()
    const resume = () => { if (document.visibilityState === 'visible') void registration.update().catch(() => report('Kontrola aktualizace se nezdařila; běžící verze pokračuje.')) }
    document.addEventListener('visibilitychange',resume)
    return () => { registration.removeEventListener('updatefound',update); document.removeEventListener('visibilitychange',resume) }
  } catch { report('Service worker se nezaregistroval. Zkontrolujte HTTPS, scope a dostupnost sw.js.'); return () => {} }
}
