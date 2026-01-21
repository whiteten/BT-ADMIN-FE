import { IconMenuItemsPlus, IconMenuMain, IconSlidersHorizontal } from '@/components/custom/Icons';

const appName = 'core';

const menuConfig = {
  groupLabel: 'CORE',
  items: [
    {
      id: `${appName}/dashboard`,
      label: '메인',
      path: 'dashboard',
      index: 0,
      icon: IconMenuMain,
      hide: false,
    },
    {
      id: `${appName}/_resource`,
      label: '자원 관리',
      icon: IconMenuItemsPlus,
      index: 1,
      hide: false,
      children: [
        {
          id: `${appName}/_resource/user`,
          label: '사용자',
          path: 'resource/user/list',
          index: 0,
          hide: false,
        },
      ],
    },
    {
      id: `${appName}/_iam`,
      label: '권한 관리',
      icon: IconSlidersHorizontal,
      index: 2,
      hide: false,
      children: [
        {
          id: `${appName}/_iam/auth-group`,
          label: '권한 그룹',
          path: 'iam/auth-group/list',
          index: 0,
          hide: false,
        },
        {
          id: `${appName}/_iam/password-policy`,
          label: '비밀번호 정책',
          path: 'iam/password-policy',
          index: 1,
          hide: false,
        },
      ],
    },
  ],
};

export default menuConfig;
