import { Home, Phone } from 'lucide-react';

const menuConfig = {
  groupLabel: 'IPRON',
  items: [
    {
      id: 'ipron/dashboard',
      label: '대시보드',
      path: 'dashboard',
      index: 0,
      icon: Home,
      hide: false,
    },
    {
      id: 'ipron/_phone',
      label: '단말 관리',
      icon: Phone,
      index: 1,
      hide: false,
      children: [
        {
          id: 'ipron/phones',
          label: '단말기 관리',
          path: 'phones',
          index: 0,
          hide: false,
        },
        {
          id: 'ipron/models',
          label: '단말모델 관리',
          path: 'models',
          index: 1,
          hide: false,
        },
      ],
    },
  ],
};

export default menuConfig;
