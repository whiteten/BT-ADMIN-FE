import * as React from 'react';
import { useRoutes } from 'react-router-dom';
import { routes } from './routes';
import '../styles.css';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import KeepAliveBoundary from '@/components/custom/KeepAliveBoundary';
import '@/libs/shared-ui/src/lib/aggridSetup';

export function App() {
  const element = useRoutes(routes);
  return (
    <React.Suspense fallback={<FallbackSpinner />}>
      <KeepAliveBoundary>{element}</KeepAliveBoundary>
    </React.Suspense>
  );
}

export default App;
