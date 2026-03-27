import { Activity, Bot } from 'lucide-react';
import { IconMenuBotCommon, IconMenuBotConfig, IconMenuDashboard, IconMenuMain, IconMenuStatistics } from '@/components/custom/Icons';

const appId = 'fca';
const appName = 'FOCUS AI';
const menuConfig = {
  appId: appId,
  appName: appName,
  icon: Bot,
  menus: [
    {
      menuId: 1,
      label: '메인',
      path: 'main',
      index: 0,
      icon: IconMenuMain,
      hide: false,
    },
    {
      menuId: 2,
      label: '봇 관리',
      icon: IconMenuBotConfig,
      index: 1,
      hide: false,
      children: [
        {
          menuId: 6,
          label: '봇',
          path: 'bot-config/bot/list',
          index: 0,
          hide: false,
        },
        {
          menuId: 7,
          label: '모델',
          path: 'bot-config/model/list',
          index: 1,
          hide: false,
        },
      ],
    },
    {
      menuId: 3,
      label: '공용',
      index: 2,
      hide: false,
      icon: IconMenuBotCommon,
      children: [
        {
          menuId: 8,
          label: '공용모델',
          path: 'global/model/list',
          index: 0,
          hide: false,
        },
        {
          menuId: 22,
          label: 'AOE 확장',
          path: 'global/aoe/config',
          index: 1,
          hide: false,
        },
      ],
    },
    {
      menuId: 55,
      label: '트래킹',
      index: 3,
      hide: false,
      icon: Activity,
      children: [
        {
          menuId: 56,
          label: '실시간 봇 트래킹',
          path: 'tracking/bot-realtime',
          index: 0,
          hide: false,
        },
        {
          menuId: 75,
          label: '대화이력',
          path: 'tracking/bot-dialog-history',
          index: 1,
          hide: false,
        },
      ],
    },
    {
      menuId: 4,
      label: '대시보드',
      index: 4,
      hide: false,
      icon: IconMenuDashboard,
      children: [
        {
          menuId: 9,
          label: '콜봇 현황',
          path: 'dashboard/call-bot',
          index: 0,
          hide: false,
        },
      ],
    },
    {
      menuId: 5,
      label: '통계',
      index: 5,
      hide: false,
      icon: IconMenuStatistics,
      children: [
        {
          menuId: 10,
          label: '콜봇 통계',
          index: 0,
          hide: false,
          children: [
            {
              menuId: 12,
              label: '서비스 통계',
              path: 'statistics/call-bot/service',
              index: 0,
              hide: false,
            },
            {
              menuId: 13,
              label: '대화 통계',
              path: 'statistics/call-bot/dialog',
              index: 1,
              hide: false,
            },
            {
              menuId: 23,
              label: '슬롯 통계',
              path: 'statistics/call-bot/slot',
              index: 2,
              hide: false,
            },
          ],
        },
        {
          menuId: 11,
          label: 'NLU 통계',
          index: 1,
          hide: false,
          children: [
            {
              menuId: 14,
              label: '의도 통계',
              path: 'statistics/nlu/intent',
              index: 0,
              hide: false,
            },
            {
              menuId: 15,
              label: '개체 통계',
              path: 'statistics/nlu/entity',
              index: 1,
              hide: false,
            },
            {
              menuId: 16,
              label: '키워드 통계',
              path: 'statistics/nlu/keyword',
              index: 2,
              hide: false,
            },
          ],
        },
      ],
    },
  ],
};

export default menuConfig;
