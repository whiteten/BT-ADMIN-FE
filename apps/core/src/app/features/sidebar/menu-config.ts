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
          id: 'core/password-policy',
          label: '비밀번호 정책',
          path: 'password-policy',
          index: 1,
          hide: false,
        },
      ],
    },
  ],
};

export default menuConfig;
