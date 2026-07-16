import { BrowserRouter } from 'react-router-dom';
import * as ReactDOM from 'react-dom/client';

import { getBasePath } from '@/shared-util';

import App from './app/app';
import { applyRuntimeConfig } from './app/runtimeConfig';

applyRuntimeConfig();

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  // basename: 배포 시 서빙 주체가 index.html의 <base href>를 root context로 치환하면 그 값을 따라간다
  <BrowserRouter basename={getBasePath() || '/'} future={{ v7_relativeSplatPath: false, v7_startTransition: true }}>
    <App />
  </BrowserRouter>,
);
