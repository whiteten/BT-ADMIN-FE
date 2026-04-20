import { Component } from 'lucide-react';
import { IconMenuItemsPlus, IconMenuMain } from '@/components/custom/Icons';
/**
 * 자동 생성된 menu-config.ts 파일에서,
 * 메인 메뉴의 menuId를 DB에 등록된 menuId로 변경해주세요.
 */

const appId = 'taskboard';
const appName = 'TASKBOARD';
const menuConfig = {
  appId,
  appName,
  icon: Component,
  menus: [
    {
      menuId: 128,
      label: '메인',
      path: 'main',
      index: 0,
      icon: IconMenuMain,
      hide: false,
    },
    {
      menuId: 122,
      label: '얍1',
      icon: IconMenuItemsPlus,
      index: 0,
      hide: false,
      children: [
        {
          menuId: 129,
          label: '배경관리',
          path: 'board/task-bg',
          index: 0,
          hide: false,
        },
        {
          menuId: 124,
          label: '전광판리스트',
          path: 'board/task-list',
          index: 1,
          hide: false,
        },
      ],
    },
    {
      menuId: 125,
      label: '전광판뷰',
      icon: IconMenuItemsPlus,
      index: 1,
      hide: false,
      children: [
        {
          menuId: 127,
          label: '전광판뷰-sub',
          path: 'board/task-view',
          index: 0,
          hide: false,
        },
      ],
    },
  ],
};

export default menuConfig;
