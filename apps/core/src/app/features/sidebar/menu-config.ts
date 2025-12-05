import { IconMenuItemsPlus, IconMenuMain, IconSlidersHorizontal } from '@/components/custom/Icons';

const menuConfig = {
  groupLabel: 'CORE',
  items: [
    {
      id: 'core/dashboard',
      label: '메인',
      path: 'dashboard',
      index: 0,
      icon: IconMenuMain,
      hide: false,
    },
    {
      id: 'core/_config',
      label: '자원 관리',
      icon: IconMenuItemsPlus,
      index: 1,
      hide: false,
      children: [
        {
          id: 'core/users',
          label: '사용자',
          path: 'users',
          index: 0,
          hide: false,
        },
      ],
    },
    {
      id: 'core/_iam',
      label: '권한 관리',
      icon: IconSlidersHorizontal,
      index: 2,
      hide: false,
      children: [
        {
          id: 'core/auth-groups',
          label: '권한 그룹',
          path: 'auth-groups',
          index: 0,
          hide: false,
        },
        {
          id: 'core/roles',
          label: '역할 관리',
          path: 'roles',
          index: 1,
          hide: false,
        },
        {
          id: 'core/permissions',
          label: '권한 목록',
          path: 'permissions',
          index: 2,
          hide: false,
        },
        {
          id: 'core/user-auth-override',
          label: '사용자 권한 할당',
          path: 'user-auth-override',
          index: 3,
          hide: false,
        },
      ],
    },
  ],
};

export default menuConfig;
