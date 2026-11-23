import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { EngagementProvider } from './contexts/EngagementContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <EngagementProvider>
    <App />
  </EngagementProvider>
);
