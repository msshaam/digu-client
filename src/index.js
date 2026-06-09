import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const shouldSuppressExternalError = (message = '', source = '') => {
  const normalizedMessage = String(message || '');
  const normalizedSource = String(source || '');

  if (normalizedMessage.includes('window.ethereum.selectedAddress')) return true;
  if (normalizedMessage.includes('selectedAddress = undefined')) return true;
  if (normalizedMessage === 'Script error.') return true;
  if (normalizedSource.includes('window.ethereum')) return true;

  return false;
};

window.addEventListener('error', (event) => {
  if (shouldSuppressExternalError(event.message, event.filename)) {
    event.preventDefault();
    event.stopImmediatePropagation?.();
  }
}, true);

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = typeof reason === 'string'
    ? reason
    : reason?.message || reason?.stack || '';

  if (shouldSuppressExternalError(message)) {
    event.preventDefault();
    event.stopImmediatePropagation?.();
  }
}, true);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (process.env.NODE_ENV === 'production' && window.isSecureContext) {
      try {
        navigator.serviceWorker.register('/service-worker.js').catch(() => {});
      } catch (error) {
        // Ignore unsupported or blocked service worker registration.
      }
      return;
    }

    if (window.isSecureContext) {
      try {
        navigator.serviceWorker.getRegistrations()
          .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
          .catch(() => {});
      } catch (error) {
        // Ignore unsupported or blocked service worker access.
      }
    }
  });
}
