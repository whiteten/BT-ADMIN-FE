import { Component } from 'lucide-react';
import { IconMenuMain } from '@/components/custom/Icons';

/**
 * 자동 생성된 menu-config.ts 파일에서,
 * 메인 메뉴의 menuKey를 DB에 등록된 menuKey로 변경해주세요.
 * IAM 재설계 v2.2: menuId → menuKey.
 */

const appId = 'vel';
const appName = 'VEL';
const menuConfig = {
  appId,
  appName,
  icon: Component,
  menus: [
    {
      menuKey: 'vel-main',
      label: '메인',
      path: 'main',
      index: 0,
      icon: IconMenuMain,
      hide: false,
    },
    {
      // 상태모니터링 — TB_MNG_USERTELNO V5 누락으로 보류. 결정 후 hide=false로 변경.
      menuKey: 'vel-monitoring',
      label: '상태모니터링',
      path: 'monitoring',
      index: 1,
      icon: IconMenuMain,
      hide: true,
      children: [
        {
          menuKey: 'vel-monitoring-list',
          label: '모니터링',
          path: 'monitoring/list',
          index: 0,
          hide: true,
        },
      ],
    },
    {
      menuKey: 'vel-rec-search',
      label: '통화내역관리',
      path: 'rec-search',
      index: 2,
      icon: IconMenuMain,
      hide: false,
      children: [
        {
          menuKey: 'vel-rec-search-list',
          label: '통화내역조회',
          path: 'rec-search/list',
          index: 0,
          hide: false,
        },
        {
          menuKey: 'vel-reclog-list',
          label: '청취로그조회',
          path: 'reclog/list',
          index: 1,
          hide: false,
        },
      ],
    },
    {
      // 실시간 감청 데모(PoC) — Veloce API 소비 예시. 끝까지 가져갈 메뉴는 아님.
      menuKey: 'vel-rt-demo',
      label: '실시간감청 데모',
      path: 'monitoring/realtime-test',
      index: 3,
      icon: IconMenuMain,
      hide: false,
    },
    {
      menuKey: 'vel-config',
      label: '설정관리',
      path: 'config',
      index: 4,
      icon: IconMenuMain,
      hide: false,
      children: [
        {
          menuKey: 'vel-config-data-access',
          label: '데이터접근관리',
          path: 'config/data-access',
          index: 0,
          hide: false,
        },
      ],
    },
  ],
};

export default menuConfig;
