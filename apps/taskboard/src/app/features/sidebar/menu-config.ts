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
      label: '메인2',
      path: 'main',
      index: 0,
      icon: IconMenuMain,
      hide: false,
    },
    {
      menuKey: 'taskboard',
      label: '전광판메인',
      icon: IconMenuItemsPlus,
      index: 1,
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
          menuKey: 'taskboard-list',
          label: '전광판리스트',
          path: 'board/task-list',
          index: 1,
          hide: false,
        },
        {
          menuKey: 'taskboard-mgmt',
          label: '전광판관리',
          path: 'board/task-mgmt',
          index: 2,
          hide: false,
        },
        {
          menuKey: 'taskboard-view',
          label: '전광판뷰',
          path: 'board/task-view',
          index: 3,
          hide: false,
        },
        {
          menuKey: 'taskboard-notice',
          label: '공지사항관리',
          path: 'board/task-notice',
          index: 4,
          hide: false,
        },
      ],
    },
  ],
};

export default menuConfig;
