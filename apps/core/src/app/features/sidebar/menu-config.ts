import { Home, Settings } from 'lucide-react';

const menuConfig = {
  groupLabel: 'CORE',
  items: [
    {
      id: 'core/dashboard',
      label: '대시보드',
      path: 'dashboard',
      index: 0,
      icon: Home,
      hide: false,
    },
    {
      id: 'core/_config',
      label: '자원 관리',
      icon: Settings,
      index: 1,
      hide: false,
      children: [
        {
          id: 'core/users',
          label: '사용자',
          path: 'users',
          index: 0,
          hide: false,
        },
        {
          id: 'core/auth-groups',
          label: '권한 그룹',
          path: 'auth-groups',
          index: 1,
          hide: false,
        },
      ],
    },
  ],
};

export default menuConfig;
