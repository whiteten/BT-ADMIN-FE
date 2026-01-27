import { IconMenuItemsPlus, IconMenuMain } from '@/components/custom/Icons';

const appId = 'manager';
const appName = 'MANAGER';
const menuConfig = {
  appId,
  appName,
  menus: [
    {
      menuKey: `${appId}/dashboard`,
      label: '메인',
      path: 'dashboard',
      index: 0,
      icon: IconMenuMain,
      hide: false,
    },
    {
      menuKey: `${appId}/_resource`,
      label: '자원 관리',
      icon: IconMenuItemsPlus,
      index: 1,
      hide: false,
      children: [
        {
          menuKey: `${appId}/_resource/user`,
          label: '사용자',
          path: 'resource/user/list',
          index: 0,
          hide: false,
        },
        {
          menuKey: `${appId}/_resource/role`,
          label: '역할',
          path: 'iam/auth-group/list',
          index: 1,
          hide: false,
        },
        {
          menuKey: `${appId}/_resource/password-policy`,
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
