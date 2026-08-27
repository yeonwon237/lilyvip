import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register as soon as the production app has started so a successful first online
// session deterministically installs every build asset (development stays SW-free).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then((registration) => registration.update())
    .catch((error) => {
      console.warn('Lily offline service worker could not be registered:', error);
    });
}
