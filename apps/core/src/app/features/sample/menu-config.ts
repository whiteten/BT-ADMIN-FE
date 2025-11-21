import { Home } from 'lucide-react';

const appName = '';
const menuConfig = {
  groupLabel: `${appName.toUpperCase()}`,
  items: [
    {
      id: `${appName}/dashboard`,
      label: '대시보드',
      path: 'dashboard',
      index: 0,
      icon: Home,
      hide: false,
    },
  ],
};

export default menuConfig;
