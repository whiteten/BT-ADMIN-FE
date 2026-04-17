import { AlertTriangle, Cable, Component } from 'lucide-react';
import { IconMenuMain } from '@/components/custom/Icons';
/**
 * 자동 생성된 menu-config.ts 파일에서,
 * 메인 메뉴의 menuId를 DB에 등록된 menuId로 변경해주세요.
 */

const appId = 'ipron';
const appName = 'IPRON';
const menuConfig = {
  appId,
  appName,
  icon: Component,
  menus: [
    {
      menuId: 84,
      label: '메인',
      path: 'main',
      index: 0,
      icon: IconMenuMain,
      hide: false,
    },
    {
      menuId: 86,
      label: '프로파일 관리',
      icon: AlertTriangle,
      index: 1,
      hide: false,
      children: [
        {
          menuId: 87,
          label: '긴급코드 프로파일',
          path: 'profile/emerg-profile',
          index: 0,
          hide: false,
        },
        {
          menuId: 98,
          label: 'SIP 프로파일',
          path: 'profile/sip-profile',
          index: 1,
          hide: false,
        },
        {
          menuId: 114,
          label: '기능코드 프로파일',
          path: 'profile/devfunc-profile',
          index: 2,
          hide: false,
        },
      ],
    },
    {
      menuId: 99,
      label: '회선관리',
      icon: Cable,
      index: 2,
      hide: false,
      children: [
        {
          menuId: 100,
          label: '국선관리',
          path: 'line/endpoint',
          index: 0,
          hide: false,
        },
        {
          menuId: 101,
          label: '발신라우트',
          path: 'line/route',
          index: 1,
          hide: false,
        },
        {
          menuId: 103,
          label: 'MS관리',
          path: 'line/ms-group',
          index: 2,
          hide: false,
        },
        {
          menuId: 105,
          label: '미디어전달관리',
          path: 'line/media-delivery',
          index: 3,
          hide: false,
        },
        {
          menuId: 104,
          label: 'IP접근관리',
          path: 'line/acl',
          index: 4,
          hide: false,
        },
        {
          menuId: 108,
          label: 'DID번호변환',
          path: 'line/did-trans',
          index: 5,
          hide: false,
        },
        {
          menuId: 109,
          label: '발신DNIS사전변환',
          path: 'line/pre-num-trans',
          index: 6,
          hide: false,
        },
        {
          menuId: 110,
          label: 'DID라우트관리',
          path: 'line/did-route',
          index: 7,
          hide: false,
        },
        {
          menuId: 111,
          label: 'DOD DNIS관리',
          path: 'line/dod-trans',
          index: 8,
          hide: false,
        },
        {
          menuId: 112,
          label: '수신번호차단관리',
          path: 'line/call-screen',
          index: 9,
          hide: false,
        },
      ],
    },
  ],
};

export default menuConfig;
