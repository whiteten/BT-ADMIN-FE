// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

export const routes = [
  {
    path: '/',
    element: <Outlet />,
    children: [
      // 루트 index redirect(<Navigate to="/">)는 여기 두지 말 것 — host(app.tsx)가 담당한다.
      // remote에 두면 host keep-alive로 보존된 비활성 상태에서 발동해 탭 네비게이션을 '/'로 덮는 버그가 생긴다.
      // 페이지를 추가할 때 이 children 배열에 라우트를 넣는다.
    ],
  },
  {
    path: '*',
    element: <NotFound homePath="/" />,
  },
];
