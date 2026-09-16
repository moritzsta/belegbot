/* TK-0006: BelegBot Service Worker.
 *
 * Bewusst minimal — er macht die App installierbar und laedt die App-Shell
 * (JS/CSS/Icons) aus dem Cache. Mehr nicht.
 *
 * Regeln (Learnings aus der gruenpflege-app, docs/PWA-BEST-PRACTICES.md dort):
 * - HTML-Navigationen werden NIEMALS gecached und NIEMALS per respondWith
 *   beantwortet: HTML traegt Auth-Redirects und Cookies. Wer das cached,
 *   sieht Login-Seiten als eingeloggter User oder umgekehrt.
 * - /api/* wird NIEMALS gecached (Beleg-Bilder, Auth, Daten).
 * - Nur Assets mit Content-Hash (/_next/static/) und bekannte statische
 *   Dateien sind cache-first. Alles andere geht unangetastet ans Netz.
 * - CACHE_VERSION bei jeder SW-Aenderung hochzaehlen: activate loescht dann
 *   alle alten Caches, damit niemand auf altem JS/CSS sitzen bleibt.
 */

const CACHE_VERSION = "belegbot-shell-v1";

// Beim Install vorladen — der Browser braucht die Icons unmittelbar zum
// Manifest-Fetch fuer den Install-Prompt.
const PRECACHE_URLS = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-192-maskable.png",
  "/icons/icon-512-maskable.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      // Best effort: ein einzelner 404 darf die Installation nicht killen.
      await Promise.all(PRECACHE_URLS.map((url) => cache.add(url).catch(() => {})));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

/** Whitelist: NUR diese Requests fasst der SW ueberhaupt an. */
function isCacheableRequest(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;

  // HTML nie — Auth-Redirects und Cookies.
  if (request.mode === "navigate") return false;
  if ((request.headers.get("accept") || "").includes("text/html")) return false;

  // API nie — Beleg-Bilder, Session, Daten.
  if (url.pathname.startsWith("/api/")) return false;

  // Build-Assets tragen einen Content-Hash im Pfad -> cache-first ist sicher.
  if (url.pathname.startsWith("/_next/static/")) return true;

  if (PRECACHE_URLS.includes(url.pathname)) return true;

  // Fonts/Bilder aus /public.
  return /\.(png|jpg|jpeg|svg|webp|woff2?|ttf|ico)$/i.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // Kein respondWith -> Browser macht die normale Netzwerkanfrage.
  if (!isCacheableRequest(request)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(request);
      if (cached) return cached;
      const network = await fetch(request);
      if (network.ok) cache.put(request, network.clone()).catch(() => {});
      return network;
    })(),
  );
});
