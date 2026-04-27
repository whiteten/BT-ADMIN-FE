import { AlertTriangle, Cable, Component, Hash } from 'lucide-react';
import { IconMenuMain } from '@/components/custom/Icons';

/**
 * IPRON 앱 로컬 메뉴 설정.
 * IAM 재설계 v2.3: menuId(number) → menuKey(string).
 * 서버 Navigation 응답의 menuKey와 일치해야 메뉴가 렌더링됨.
 */
const appId = 'ipron';
const appName = 'IPRON';
const menuConfig = {
  appId,
  appName,
  icon: Component,
  menus: [
    {
      menuKey: 'ipron-main',
      label: '메인',
      path: 'main',
      index: 0,
      icon: IconMenuMain,
      hide: false,
    },
    {
      menuKey: 'ipron-profile-mgmt',
      label: '프로파일 관리',
      icon: AlertTriangle,
      index: 1,
      hide: false,
      children: [
        {
          menuKey: 'ipron-emerg-profile',
          label: '긴급코드 프로파일',
          path: 'profile/emerg-profile',
          index: 0,
          hide: false,
        },
        {
          menuKey: 'ipron-sip-profile',
          label: 'SIP 프로파일',
          path: 'profile/sip-profile',
          index: 1,
          hide: false,
        },
        {
          menuKey: 'ipron-devfunc-profile',
          label: '기능코드 프로파일',
          path: 'profile/devfunc-profile',
          index: 2,
          hide: false,
        },
        {
          menuKey: 'ipron-access-profile',
          label: '접근코드 프로파일',
          path: 'profile/access-profile',
          index: 3,
          hide: false,
        },
        {
          menuKey: 'ipron-dn-profile',
          label: '내선 프로파일',
          path: 'profile/dn-profile',
          index: 4,
          hide: false,
        },
      ],
    },
    {
      menuKey: 'ipron-line-mgmt',
      label: '회선관리',
      icon: Cable,
      index: 2,
      hide: false,
      children: [
        {
          menuKey: 'ipron-endpoint',
          label: '국선관리',
          path: 'line/endpoint',
          index: 0,
          hide: false,
        },
        {
          menuKey: 'ipron-route',
          label: '발신라우트',
          path: 'line/route',
          index: 1,
          hide: false,
        },
        {
          menuKey: 'ipron-ms-mgmt',
          label: 'MS관리',
          path: 'line/ms-group',
          index: 2,
          hide: false,
        },
        {
          menuKey: 'ipron-media-delivery',
          label: '미디어전달관리',
          path: 'line/media-delivery',
          index: 3,
          hide: false,
        },
        {
          menuKey: 'ipron-acl',
          label: 'IP접근관리',
          path: 'line/acl',
          index: 4,
          hide: false,
        },
        {
          menuKey: 'ipron-did-trans',
          label: 'DID번호변환',
          path: 'line/did-trans',
          index: 5,
          hide: false,
        },
        {
          menuKey: 'ipron-pre-num-trans',
          label: '발신DNIS사전변환',
          path: 'line/pre-num-trans',
          index: 6,
          hide: false,
        },
        {
          menuKey: 'ipron-did-route',
          label: 'DID라우트관리',
          path: 'line/did-route',
          index: 7,
          hide: false,
        },
        {
          menuKey: 'ipron-dod-trans',
          label: 'DOD DNIS관리',
          path: 'line/dod-trans',
          index: 8,
          hide: false,
        },
        {
          menuKey: 'ipron-call-screen',
          label: '수신번호차단관리',
          path: 'line/call-screen',
          index: 9,
          hide: false,
        },
        {
          menuKey: 'ipron-mcs-dnis',
          label: 'DNIS관리(MCS)',
          path: 'line/mcs-dnis',
          index: 10,
          hide: false,
        },
      ],
    },
    {
      menuKey: 'ipron-numbering',
      label: '번호자원관리',
      icon: Hash,
      index: 3,
      hide: false,
      children: [
        {
          menuKey: 'ipron-cos',
          label: 'COS 설정',
          path: 'cos',
          index: 0,
          hide: false,
        },
        {
          menuKey: 'ipron-dn-mgmt',
          label: 'DN관리',
          index: 1,
          hide: false,
          children: [
            {
              menuKey: 'ipron-dn',
              label: '내선관리',
              path: 'dn',
              index: 0,
              hide: false,
            },
          ],
        },
      ],
    },
  ],
};

export default menuConfig;
