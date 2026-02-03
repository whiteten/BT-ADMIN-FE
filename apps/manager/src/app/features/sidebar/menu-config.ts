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
      path: 'dashboard',
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
          menuId: 21,
          label: '계정 정책',
          path: 'resource/account-policy',
          index: 2,
          hide: false,
        },
        {
          menuId: 30,
          label: '작업이력',
          path: 'audit/work-history',
          index: 3,
          hide: false,
        },
      ],
    },
  ],
};

export default menuConfig;
