(function () {
  if (!('serviceWorker' in navigator)) return;

  var host = window.location.hostname;
  var isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  var isHttps = window.location.protocol === 'https:';
  var canRegister = isHttps || isLocalhost;

  window.addEventListener('load', function () {
    if (!canRegister) {
      try {
        navigator.serviceWorker.getRegistrations()
          .then(function (registrations) {
            return Promise.all(registrations.map(function (registration) {
              return registration.unregister();
            }));
          })
          .catch(function () {});
      } catch (error) {
        // Ignore unsupported service worker access.
      }
      return;
    }

    try {
      navigator.serviceWorker.register('/service-worker.js').catch(function () {});
    } catch (error) {
      // Ignore unsupported or blocked service worker registration.
    }
  });
})();
