import * as React from 'react';
import { useRoutes } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import koKR from 'antd/locale/ko_KR';
import { routes } from './routes';
import '../styles.css';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export function App() {
  const element = useRoutes(routes);
  return (
    <ConfigProvider
      locale={koKR}
      drawer={{
        styles: {
          mask: { backgroundColor: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'none' },
        },
      }}
      modal={{
        styles: {
          mask: { backgroundColor: 'rgba(0, 0, 0, 0.35)', backdropFilter: 'none' },
        },
      }}
    >
      <React.Suspense fallback={<FallbackSpinner />}>{element}</React.Suspense>
    </ConfigProvider>
  );
}

export default App;
