import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';

import StandaloneApp from './app/StandaloneApp';

// 단독 서빙(standalone dev) 진입점. host 통합 시에는 remote-entry(App)가 사용되며 이 파일은 쓰이지 않는다.
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <StrictMode>
    <StandaloneApp />
  </StrictMode>,
);
