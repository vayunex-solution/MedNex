import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Global Fetch Interceptor for Production API routing
const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
if (isProd) {
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    let targetInput = input;
    if (typeof input === 'string' && input.startsWith('/api/')) {
      targetInput = 'https://api.sdk.vayunexsolution.com' + input;
    }
    return originalFetch(targetInput, init);
  };
}

// Apply persisted theme before first render
const storedTheme = (() => {
  try {
    const stored = JSON.parse(localStorage.getItem('npc-theme') || '{}');
    return stored?.state?.theme ?? 'dark';
  } catch { return 'dark'; }
})();
document.documentElement.classList.toggle('dark', storedTheme === 'dark');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
