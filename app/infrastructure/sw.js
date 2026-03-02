export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.register("./js/sw.js").catch(error => {
    console.error("Error registrando Service Worker:", error);
  });
}
