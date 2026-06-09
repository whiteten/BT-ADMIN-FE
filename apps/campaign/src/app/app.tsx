import * as React from 'react';
import { useRoutes } from 'react-router-dom';
import { useBreadcrumbStore } from '@/shared-store';
import { routes } from './routes';
import '../styles.css';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export function App() {
  const element = useRoutes(routes);
  return <React.Suspense fallback={<FallbackSpinner />}>{element}</React.Suspense>;
}

export default App;
