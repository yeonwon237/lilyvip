import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './lily-ui.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);
if (import.meta.env.DEV && location.hostname === '127.0.0.1' && location.port === '3001' && new URLSearchParams(location.search).has('preview')) {
  import('./preview/LibraryPreview').then(({ default: Preview }) => root.render(<Preview />));
} else {
  root.render(<React.StrictMode><App /></React.StrictMode>);
}

// Register as soon as the production app has started so a successful first online
// session deterministically installs every build asset (development stays SW-free).
if (import.meta.env.PROD && import.meta.env.VITE_LILY_EMBEDDED !== 'true' && 'serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then((registration) => registration.update())
    .catch((error) => {
      console.warn('Lily offline service worker could not be registered:', error);
    });
}
