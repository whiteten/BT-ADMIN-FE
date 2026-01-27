import { IconMenuMain } from '@/components/custom/Icons';

const appId = '';
const appName = '';
const menuConfig = {
  appId,
  appName,
  menus: [
    {
      menuKey: `${appId}-main`,
      label: '메인',
      path: 'main',
      index: 0,
      icon: IconMenuMain,
      hide: false,
    },
  ],
};

export default menuConfig;
