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
      label: '사용자 관리',
      icon: IconMenuItemsPlus,
      index: 1,
      hide: false,
      children: [
        {
          menuId: 19,
          label: '사용자 계정 관리',
          path: 'resource/user/list',
          index: 0,
          hide: false,
        },
        {
          menuId: 20,
          label: '역할/권한 관리',
          path: 'resource/auth-group/list',
          index: 1,
          hide: false,
        },
      ],
    },
    {
      menuId: 57,
      label: '보안 관리',
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
      label: '시스템 관리',
      icon: IconLayer,
      index: 3,
      hide: false,
      children: [
        {
          menuId: 62,
          label: '플랫폼 설정',
          index: 0,
          hide: false,
          children: [
            {
              menuId: 52,
              label: '메뉴 관리',
              path: 'resource/menu',
              index: 0,
              hide: false,
            },
            {
              menuId: 53,
              label: 'API 경로 관리',
              path: 'resource/bff-flow',
              index: 1,
              hide: false,
            },
            {
              menuId: 54,
              label: '외부 앱 연동 관리',
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
      label: '감사 관리',
      icon: IconDocument,
      index: 4,
      hide: false,
      children: [
        {
          menuId: 30,
          label: '작업 이력 조회',
          path: 'resource/work-history',
          index: 0,
          hide: false,
        },
      ],
    },
  ],
};

export default menuConfig;
