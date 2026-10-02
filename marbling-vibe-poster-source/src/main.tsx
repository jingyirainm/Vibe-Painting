import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress MediaPipe's XNNPACK info logs which appear as errors in the UI
const filterLogs = (orig: any) => (...args: any[]) => {
  if (args[0] && typeof args[0] === 'string' && args[0].toLowerCase().includes('xnnpack')) return;
  if (orig) orig.apply(console, args);
};
console.info = filterLogs(console.info);
console.log = filterLogs(console.log);
console.warn = filterLogs(console.warn);
console.error = filterLogs(console.error);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
