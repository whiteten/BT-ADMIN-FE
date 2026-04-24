import { Component } from 'lucide-react';
import { IconMenuMain } from '@/components/custom/Icons';
/**
 * 자동 생성된 menu-config.ts 파일에서,
 * 메인 메뉴의 menuKey를 DB에 등록된 menuKey로 변경해주세요.
 * IAM 재설계 v2.2: menuId → menuKey.
 */

const appId = '';
const appName = '';
const menuConfig = {
  appId,
  appName,
  icon: Component,
  menus: [
    {
      menuKey: 'replace_menuKey',
      label: '메인',
      path: 'main',
      index: 0,
      icon: IconMenuMain,
      hide: false,
    },
  ],
};

export default menuConfig;
