import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { createDemoEnvironment } from './demo/environment';

// The demo environment (mock data, fixed clock, role sign-in) is the only
// composition today. Production will build an environment with the API
// repository, real auth and the system clock instead.
const env = createDemoEnvironment();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App env={env} />
  </StrictMode>,
);
