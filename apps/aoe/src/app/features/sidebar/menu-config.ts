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
      menuKey: 'aoe-main',
      label: '메인',
      path: 'main',
      index: 0,
      icon: IconMenuMain,
      hide: false,
    },
    {
      menuKey: 'aoe-mgmt',
      label: '관리',
      icon: IconMenuBotConfig,
      index: 1,
      hide: false,
      children: [
        {
          menuKey: 'aoe-mgmt-agent',
          label: 'Agent',
          path: 'agent-config/agent/list',
          index: 0,
          hide: false,
        },
        {
          menuKey: 'aoe-mgmt-model',
          label: 'AI 모델',
          path: 'agent-config/model/list',
          index: 1,
          hide: false,
        },
        {
          menuKey: 'aoe-mgmt-know',
          label: '지식',
          path: 'agent-config/knowledge/list',
          index: 2,
          hide: false,
        },
      ],
    },
  ],
};

export default menuConfig;
