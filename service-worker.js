const CACHE_NAME = "form-function-shell-v13";
const PHOTO_CACHE = "form-function-food-photos-v1";
const PHOTO_HOST = "upload.wikimedia.org";
const APP_SHELL = [
  "./",
  "./index.html",
  "./dashboard.html",
  "./login.html",
  "./manifest.webmanifest",
  "./assets/app-config.js",
  "./assets/supabase-client.js",
  "./assets/pwa.js",
  "./assets/reveal.js",
  "./assets/app-icon.svg",
  "./assets/login-athlete.jpg",
  "./assets/login-glass-background.png",
  "./assets/login-athlete-background.png",
  "./assets/login-morphism-glass.png",
  "./assets/runner-background.png",
  "./assets/exercises/women-upper.jpg",
  "./assets/exercises/women-chest.jpg",
  "./assets/exercises/women-core.jpg",
  "./assets/exercises/women-legs.jpg",
  "./assets/exercises/women-glutes.jpg",
  "./assets/exercises/women-full.jpg",
  "./assets/exercises/men-upper.jpg",
  "./assets/exercises/men-chest.jpg",
  "./assets/exercises/men-core.jpg",
  "./assets/exercises/men-legs.jpg",
  "./assets/exercises/men-glutes.jpg",
  "./assets/exercises/men-full.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME && key !== PHOTO_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);
  if (event.request.method === "GET" && requestUrl.hostname === PHOTO_HOST) {
    event.respondWith((async () => {
      const cache = await caches.open(PHOTO_CACHE);
      const cachedPhoto = await cache.match(event.request);
      if (cachedPhoto) return cachedPhoto;
      const response = await fetch(event.request);
      if (response.ok || response.type === "opaque") cache.put(event.request, response.clone());
      return response;
    })());
    return;
  }
  if (event.request.method !== "GET" || requestUrl.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cachedResponse = await caches.match(event.request);
    if (cachedResponse) return cachedResponse;
    try {
      return await fetch(event.request);
    } catch (error) {
      if (event.request.mode === "navigate") {
        const offlinePage = await caches.match("./index.html");
        if (offlinePage) return offlinePage;
      }
      throw error;
    }
  })());
});

self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { body: event.data.text() };
    }
  }
  const destination = typeof payload.url === "string" ? new URL(payload.url, self.registration.scope) : new URL("./index.html#planner", self.registration.scope);
  const safeDestination = destination.origin === self.location.origin ? destination.href : new URL("./index.html#planner", self.registration.scope).href;
  event.waitUntil(self.registration.showNotification(payload.title || "Workout reminder", {
    body: payload.body || "A little movement can make a big difference. Ready for your workout?",
    icon: "./assets/app-icon.svg",
    badge: "./assets/app-icon.svg",
    data: { url: safeDestination }
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const target = event.notification.data && event.notification.data.url
      ? event.notification.data.url
      : new URL("./index.html#planner", self.registration.scope).href;
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.registration.scope)) {
        await client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
