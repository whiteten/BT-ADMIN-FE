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
      menuKey: 'taskboard-main',
      label: '메인',
      path: 'main',
      index: 0,
      icon: IconMenuMain,
      hide: false,
    },
    {
      menuKey: 'taskboard',
      label: '얍1',
      icon: IconMenuItemsPlus,
      index: 0,
      hide: false,
      children: [
        {
          menuKey: 'taskboard-bg',
          label: '배경관리',
          path: 'board/task-bg',
          index: 0,
          hide: false,
        },
        {
          menuKey: 'taskboard-list2',
          label: '전광판리스트',
          path: 'board/task-list',
          index: 1,
          hide: false,
        },
      ],
    },
    {
      menuKey: 125,
      label: '전광판뷰',
      icon: IconMenuItemsPlus,
      index: 1,
      hide: false,
      children: [
        {
          menuKey: 127,
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
