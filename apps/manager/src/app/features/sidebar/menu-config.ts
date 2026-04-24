import { Database } from 'lucide-react';
import { IconDocument, IconLayer, IconMenuItemsPlus, IconMenuMain, IconSlidersHorizontal } from '@/components/custom/Icons';

/**
 * Manager 앱 로컬 메뉴 설정.
 * IAM 재설계 v2.2: menuId(number) → menuKey(string).
 * 서버 Navigation 응답의 menuKey와 일치해야 메뉴가 렌더링됨.
 */
const appId = 'manager';
const appName = 'MANAGER';
const menuConfig = {
  appId,
  appName,
  icon: Database,
  menus: [
    {
      menuKey: 'manager-main',
      label: '메인',
      path: 'main',
      index: 0,
      icon: IconMenuMain,
      hide: false,
    },
    {
      menuKey: 'manager-user-mgmt',
      label: '사용자',
      icon: IconMenuItemsPlus,
      index: 1,
      hide: false,
      children: [
        {
          menuKey: 'manager-user',
          label: '사용자 계정',
          path: 'resource/user/list',
          index: 0,
          hide: false,
        },
        {
          menuKey: 'manager-role',
          label: '역할/권한',
          path: 'resource/auth-group/list',
          index: 1,
          hide: false,
        },
      ],
    },
    {
      menuKey: 'manager-security',
      label: '보안',
      icon: IconSlidersHorizontal,
      index: 2,
      hide: false,
      children: [
        {
          menuKey: 'manager-account-policy',
          label: '계정 보안 정책',
          path: 'resource/account-policy',
          index: 0,
          hide: false,
        },
      ],
    },
    {
      menuKey: 'manager-system',
      label: '시스템',
      icon: IconLayer,
      index: 3,
      hide: false,
      children: [
        {
          menuKey: 'manager-platform',
          label: '플랫폼',
          index: 0,
          hide: false,
          children: [
            {
              menuKey: 'manager-menu',
              label: '메뉴',
              path: 'resource/menu',
              index: 0,
              hide: false,
            },
            {
              menuKey: 'bff-flow',
              label: 'API 경로',
              path: 'resource/bff-flow',
              index: 1,
              hide: false,
            },
            {
              menuKey: 'manager-client',
              label: '외부 앱 연동',
              path: 'resource/client/list',
              index: 2,
              hide: false,
            },
            {
              menuId: 63,
              label: '라이선스',
              path: 'resource/license/list',
              index: 3,
              hide: false,
            },
          ],
        },
        {
          menuId: 74,
          label: '라이센스',
          path: 'resource/license',
          index: 0,
          hide: true,
        },
        {
          menuId: 76,
          label: '자원관리',
          index: 2,
          hide: false,
          children: [
            {
              menuId: 77,
              label: '테넌트',
              path: 'resource/tenant-management/list',
              index: 0,
              hide: false,
            },
            {
              menuId: 83,
              label: '클러스터 관리',
              path: 'resource/node-management/list',
              index: 1,
              hide: false,
            },
          ],
        },
      ],
    },
    {
      menuKey: 'manager-audit',
      label: '감사',
      icon: IconDocument,
      index: 4,
      hide: false,
      children: [
        {
          menuKey: 'manager-work-history',
          label: '작업 이력',
          path: 'resource/work-history',
          index: 0,
          hide: false,
        },
        {
          menuId: 106,
          label: '데이터 보관주기',
          path: 'resource/data-retention',
          index: 1,
          hide: false,
        },
      ],
    },
  ],
};

export default menuConfig;
