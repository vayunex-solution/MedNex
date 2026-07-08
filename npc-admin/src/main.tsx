import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

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
