import { Component } from 'lucide-react';
import { IconMenuMain } from '@/components/custom/Icons';
/**
 * 자동 생성된 menu-config.ts 파일에서,
 * 메인 메뉴의 menuId를 DB에 등록된 menuId로 변경해주세요.
 */

const appId = 'aoe';
const appName = 'AOE';
const menuConfig = {
  appId,
  appName,
  icon: Component,
  menus: [
    {
      menuId: '78',
      label: '메인',
      path: 'main',
      index: 0,
      icon: IconMenuMain,
      hide: false,
    },
  ],
};

export default menuConfig;
