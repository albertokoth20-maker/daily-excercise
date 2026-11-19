(() => {
  const status = document.getElementById("pwa-status");
  const installButton = document.getElementById("install-app");
  let installPrompt = null;

  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    if (status) {
      status.textContent = "Push notifications require a secure HTTPS site (or localhost during development).";
    }
    return;
  }

  navigator.serviceWorker.register("./service-worker.js")
    .then(() => navigator.serviceWorker.ready)
    .catch((error) => {
      console.error("Service worker registration failed:", error);
      if (status) {
        status.textContent = "This browser could not enable app notifications. Check that the site is served over HTTPS.";
      }
    });

  if (!installButton) return;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    installButton.hidden = true;
    if (status) status.textContent = "App installed. You can now enable workout push notifications on this device.";
  });

  installButton.addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted" && status) {
      status.textContent = "Follow the install prompt, then enable push notifications for this device.";
    }
    installPrompt = null;
    installButton.hidden = true;
  });
})();
