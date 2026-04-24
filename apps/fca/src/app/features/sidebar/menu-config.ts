import { Bot } from 'lucide-react';
import { IconMenuBotCommon, IconMenuBotConfig, IconMenuDashboard, IconMenuMain, IconMenuStatistics } from '@/components/custom/Icons';

/**
 * FCA 앱 로컬 메뉴 설정.
 * IAM 재설계 v2.2: menuId(number) → menuKey(string).
 */
const appId = 'fca';
const appName = 'FOCUS AI';
const menuConfig = {
  appId: appId,
  appName: appName,
  icon: Bot,
  menus: [
    {
      menuKey: 'fca-main',
      label: '메인',
      path: 'main',
      index: 0,
      icon: IconMenuMain,
      hide: false,
    },
    {
      menuKey: 'fca-mgmt',
      label: '봇 관리',
      icon: IconMenuBotConfig,
      index: 1,
      hide: false,
      children: [
        {
          menuKey: 'bot',
          label: '봇',
          path: 'bot-config/bot/list',
          index: 0,
          hide: false,
        },
        {
          menuKey: 'model',
          label: '모델',
          path: 'bot-config/model/list',
          index: 1,
          hide: false,
        },
      ],
    },
    {
      menuKey: 'fca-cm',
      label: '공용',
      index: 2,
      hide: false,
      icon: IconMenuBotCommon,
      children: [
        {
          menuKey: 'cm-model',
          label: '공용모델',
          path: 'global/model/list',
          index: 0,
          hide: false,
        },
        {
          menuKey: 'cm-aoe-ext',
          label: 'AOE 확장',
          path: 'global/aoe/config',
          index: 1,
          hide: false,
        },
      ],
    },
    {
      menuKey: 'fca-dashboard',
      label: '대시보드',
      index: 3,
      hide: false,
      icon: IconMenuDashboard,
      children: [
        {
          menuKey: 'call-bot-status',
          label: '콜봇 현황',
          path: 'dashboard/call-bot',
          index: 0,
          hide: false,
        },
      ],
    },
    {
      menuKey: 'fca-stats',
      label: '통계',
      index: 4,
      hide: false,
      icon: IconMenuStatistics,
      children: [
        {
          menuKey: 'callbot-stats',
          label: '콜봇 통계',
          index: 0,
          hide: false,
          children: [
            {
              menuKey: 'stats-service',
              label: '서비스 통계',
              path: 'statistics/call-bot/service',
              index: 0,
              hide: false,
            },
            {
              menuKey: 'stats-dialog',
              label: '대화 통계',
              path: 'statistics/call-bot/dialog',
              index: 1,
              hide: false,
            },
            {
              menuKey: 'stat-slot',
              label: '슬롯 통계',
              path: 'statistics/call-bot/slot',
              index: 2,
              hide: false,
            },
          ],
        },
        {
          menuKey: 'nlu-stats',
          label: 'NLU 통계',
          index: 1,
          hide: false,
          children: [
            {
              menuKey: 'stats-intent',
              label: '의도 통계',
              path: 'statistics/nlu/intent',
              index: 0,
              hide: false,
            },
            {
              menuKey: 'stats-entity',
              label: '개체 통계',
              path: 'statistics/nlu/entity',
              index: 1,
              hide: false,
            },
            {
              menuKey: 'stats-keyword',
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
