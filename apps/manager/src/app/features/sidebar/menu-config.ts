import { Database } from 'lucide-react';
import { IconDocument, IconLayer, IconMenuItemsPlus, IconMenuMain, IconSlidersHorizontal } from '@/components/custom/Icons';

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
      label: '사용자',
      icon: IconMenuItemsPlus,
      index: 1,
      hide: false,
      children: [
        {
          menuId: 19,
          label: '사용자 계정',
          path: 'resource/user/list',
          index: 0,
          hide: false,
        },
        {
          menuId: 20,
          label: '역할/권한',
          path: 'resource/auth-group/list',
          index: 1,
          hide: false,
        },
      ],
    },
    {
      menuId: 57,
      label: '보안',
      icon: IconSlidersHorizontal,
      index: 2,
      hide: false,
      children: [
        {
          menuId: 21,
          label: '계정 보안 정책',
          path: 'resource/account-policy',
          index: 0,
          hide: false,
        },
      ],
    },
    {
      menuId: 58,
      label: '시스템',
      icon: IconLayer,
      index: 3,
      hide: false,
      children: [
        {
          menuId: 106,
          label: '데이터 보관주기',
          path: 'resource/data-retention',
          index: 0,
          hide: false,
        },
        {
          menuId: 62,
          label: '플랫폼',
          index: 1,
          hide: false,
          children: [
            {
              menuId: 52,
              label: '메뉴',
              path: 'resource/menu',
              index: 0,
              hide: false,
            },
            {
              menuId: 53,
              label: 'API 경로',
              path: 'resource/bff-flow',
              index: 1,
              hide: false,
            },
            {
              menuId: 54,
              label: '외부 앱 연동',
              path: 'resource/client/list',
              index: 2,
              hide: false,
            },
          ],
        },
      ],
    },
    {
      menuId: 59,
      label: '감사',
      icon: IconDocument,
      index: 4,
      hide: false,
      children: [
        {
          menuId: 30,
          label: '작업 이력',
          path: 'resource/work-history',
          index: 0,
          hide: false,
        },
      ],
    },
  ],
};

export default menuConfig;
