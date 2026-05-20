import { Cable, Component, Workflow } from 'lucide-react';
import { IconMenuMain } from '@/components/custom/Icons';

/**
 * IVR 앱 로컬 메뉴 설정.
 * IAM 재설계 v2.3: menuId(number) → menuKey(string).
 * 서버 Navigation 응답의 menuKey와 일치해야 메뉴가 렌더링됨.
 */
const appId = 'ivr';
const appName = 'ForCus';
const menuConfig = {
  appId,
  appName,
  icon: Component,
  menus: [
    {
      menuKey: 'fc-main',
      label: '메인',
      path: 'main',
      index: 0,
      icon: IconMenuMain,
      hide: false,
    },
    {
      menuKey: 'ivr-line-mgmt',
      label: '회선관리',
      icon: Cable,
      index: 1,
      hide: false,
      children: [
        {
          menuKey: 'ivr-endpoint',
          label: '국선관리',
          path: 'ivr/endpoint',
          index: 0,
          hide: false,
        },
        {
          menuKey: 'ivr-dn-group',
          label: 'IVR DN 그룹관리',
          path: 'ivr/dn-group',
          index: 1,
          hide: false,
        },
        {
          menuKey: 'ivr-media',
          label: '미디어 관리',
          path: 'ivr/media',
          index: 2,
          hide: false,
        },
        {
          menuKey: 'ivr-ain-dnis',
          label: '대표번호별 DNIS관리',
          path: 'ivr/ain-dnis',
          index: 3,
          hide: false,
        },
      ],
    },
    {
      menuKey: 'ivr-scenario-mgmt',
      label: '시나리오 관리',
      icon: Workflow,
      index: 2,
      hide: false,
      children: [
        {
          menuKey: 'ivr-scenario',
          label: '시나리오/버전 관리',
          path: 'ivr/scenario',
          index: 0,
          hide: false,
        },
      ],
    },
  ],
};

export default menuConfig;
