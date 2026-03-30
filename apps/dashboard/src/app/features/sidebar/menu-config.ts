import { LayoutDashboard } from 'lucide-react';

const appId = 'dashboard';
const appName = 'DASHBOARD';
const menuConfig = {
  appId,
  appName,
  icon: LayoutDashboard,
  menus: [
    {
      menuId: 88,
      label: '대시보드 관리',
      path: 'boards',
      index: 0,
      icon: LayoutDashboard,
      hide: false,
    },
    {
      menuId: 89,
      label: '위젯 관리',
      path: 'widgets',
      index: 1,
      hide: false,
    },
    {
      menuId: 90,
      label: '데이터소스 관리',
      path: 'datasources',
      index: 2,
      hide: false,
    },
    {
      menuId: 91,
      label: '검색조건 관리',
      path: 'conditions',
      index: 3,
      hide: false,
    },
  ],
};

export default menuConfig;
