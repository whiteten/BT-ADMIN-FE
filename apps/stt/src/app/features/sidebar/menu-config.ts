import { Component } from 'lucide-react';
import { IconMenuBotConfig, IconMenuMain } from '@/components/custom/Icons';

const appId = 'stt';
const appName = 'STT';
const menuConfig = {
  appId,
  appName,
  icon: Component,
  menus: [
    {
      menuId: 134,
      label: '메인',
      path: 'main',
      index: 0,
      icon: IconMenuMain,
      hide: false,
    },
    {
      menuId: 137,
      label: 'STT 관리',
      icon: IconMenuBotConfig,
      index: 1,
      hide: false,
      children: [
        {
          menuId: 138,
          label: 'STT 검색',
          path: 'stt-config/search/list',
          index: 0,
          hide: false,
        },
        {
          menuId: 139,
          label: '학습 데이터 관리',
          path: 'stt-config/training/list',
          index: 1,
          hide: false,
        },
        {
          menuId: 145,
          label: '정답지 관리',
          path: 'stt-config/recog/list',
          index: 2,
          hide: false,
        },
        {
          menuId: 144,
          label: '사전 관리',
          path: 'stt-config/dictionary/list',
          index: 3,
          hide: false,
        },
      ],
    },
  ],
};

export default menuConfig;
