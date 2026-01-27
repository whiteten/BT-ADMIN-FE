import { IconMenuItemsPlus, IconMenuMain } from '@/components/custom/Icons';

const appName = 'manager';

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
        {
          id: `${appName}/_resource/role`,
          label: '역할',
          path: 'iam/auth-group/list',
          index: 1,
          hide: false,
        },
        {
          id: `${appName}/_resource/password-policy`,
          label: '비밀번호 정책',
          path: 'iam/password-policy',
          index: 2,
          hide: false,
        },
      ],
    },
  ],
};

export default menuConfig;
