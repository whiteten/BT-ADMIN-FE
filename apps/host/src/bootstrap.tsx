import { BrowserRouter } from 'react-router-dom';
import * as ReactDOM from 'react-dom/client';

import App from './app/app';
import { applyRuntimeConfig } from './app/runtimeConfig';

applyRuntimeConfig();

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <BrowserRouter future={{ v7_relativeSplatPath: false, v7_startTransition: true }}>
    <App />
  </BrowserRouter>,
);
