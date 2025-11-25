import { Home } from 'lucide-react';

const appName = '';
const menuConfig = {
  groupLabel: `${appName.toUpperCase()}`,
  items: [
    {
      id: `${appName}/dashboard`,
      label: '메인',
      path: 'main',
      index: 0,
      icon: Home,
      hide: false,
    },
  ],
};

export default menuConfig;
