import { Database } from 'lucide-react';
import { IconMenuItemsPlus, IconMenuMain } from '@/components/custom/Icons';

const appId = 'manager';
const appName = 'MANAGER';
const menuConfig = {
  appId,
  appName,
  icon: Database,
  menus: [
    {
      menuId: 17,
      label: '메인',
      path: 'main',
      index: 0,
      icon: IconMenuMain,
      hide: false,
    },
    {
      menuId: 18,
      label: '자원 관리',
      icon: IconMenuItemsPlus,
      index: 1,
      hide: false,
      children: [
        {
          menuId: 19,
          label: '사용자',
          path: 'resource/user/list',
          index: 0,
          hide: false,
        },
        {
          menuId: 20,
          label: '역할',
          path: 'resource/auth-group/list',
          index: 1,
          hide: false,
        },
        {
          menuId: 52,
          label: '메뉴',
          path: 'resource/menu',
          index: 2,
          hide: false,
        },
        {
          menuId: 53,
          label: 'API Flow',
          path: 'resource/bff-flow',
          index: 3,
          hide: false,
        },
        {
          menuId: 21,
          label: '계정 정책',
          path: 'resource/account-policy',
          index: 4,
          hide: false,
        },
        {
          menuId: 30,
          label: '작업이력',
          path: 'resource/work-history',
          index: 5,
          hide: false,
        },
        {
          menuId: 54,
          label: '클라이언트 관리',
          path: 'resource/client/list',
          index: 4,
          hide: false,
        },
      ],
    },
  ],
};

export default menuConfig;
