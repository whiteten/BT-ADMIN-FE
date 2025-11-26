import { IconMenuMain } from '@/components/custom/Icons';

const appName = '';
const menuConfig = {
  groupLabel: `${appName.toUpperCase()}`,
  items: [
    {
      id: `${appName}/dashboard`,
      label: '메인',
      path: 'main',
      index: 0,
      icon: IconMenuMain,
      hide: false,
    },
  ],
};

export default menuConfig;
