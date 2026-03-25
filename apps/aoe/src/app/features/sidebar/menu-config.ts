import { Component } from 'lucide-react';
import { IconMenuBotConfig, IconMenuMain } from '@/components/custom/Icons';

const appId = 'aoe';
const appName = 'AOE';
const menuConfig = {
  appId,
  appName,
  icon: Component,
  menus: [
    {
      menuId: 78,
      label: '메인',
      path: 'main',
      index: 0,
      icon: IconMenuMain,
      hide: false,
    },
    {
      menuId: 80,
      label: '관리',
      icon: IconMenuBotConfig,
      index: 1,
      hide: false,
      children: [
        {
          menuId: 82,
          label: 'Agent',
          path: 'agent-config/agent/list',
          index: 0,
          hide: false,
        },
      ],
    },
  ],
};

export default menuConfig;
