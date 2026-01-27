import { IconMenuBotCommon, IconMenuBotConfig, IconMenuDashboard, IconMenuMain, IconMenuStatistics } from '@/components/custom/Icons';

const appId = 'fca';
const appName = 'FOCUS AI';
const menuConfig = {
  appId: appId,
  appName: appName,
  menus: [
    {
      menuKey: `${appId}/main`,
      label: '메인',
      path: 'main',
      index: 0,
      icon: IconMenuMain,
      hide: false,
    },
    {
      menuKey: `${appId}/_config-bot`,
      label: '봇 관리',
      icon: IconMenuBotConfig,
      index: 1,
      hide: false,
      children: [
        {
          menuKey: `${appId}/_config-bot/bot`,
          label: '봇',
          path: 'bot-config/bot/list',
          index: 0,
          hide: false,
        },
        {
          menuKey: `${appId}/_config-bot/model`,
          label: '모델',
          path: 'bot-config/model/list',
          index: 1,
          hide: false,
        },
      ],
    },
    {
      menuKey: `${appId}/_config-global`,
      label: '공용',
      index: 2,
      hide: false,
      icon: IconMenuBotCommon,
      children: [
        {
          menuKey: `${appId}/_config-global/model`,
          label: '공용모델',
          path: 'global/model/list',
          index: 0,
          hide: false,
        },
        {
          menuKey: `${appId}/_config-global/aoe`,
          label: 'AOE 확장',
          path: 'global/aoe/config',
          index: 1,
          hide: false,
        },
      ],
    },
    {
      menuKey: `${appId}/_dashboard`,
      label: '대시보드',
      index: 3,
      hide: false,
      icon: IconMenuDashboard,
      children: [
        {
          menuKey: `${appId}/_dashboard/call-bot`,
          label: '콜봇 현황',
          path: 'dashboard/call-bot',
          index: 0,
          hide: false,
        },
      ],
    },
    {
      menuKey: `${appId}/_statistics`,
      label: '통계',
      index: 4,
      hide: false,
      icon: IconMenuStatistics,
      children: [
        {
          menuKey: `${appId}/_statistics/call-bot`,
          label: '콜봇 통계',
          index: 0,
          hide: false,
          children: [
            {
              menuKey: `${appId}/_statistics/call-bot/service`,
              label: '서비스 통계',
              path: 'statistics/call-bot/service',
              index: 0,
              hide: false,
            },
            {
              menuKey: `${appId}/_statistics/call-bot/conversation`,
              label: '대화 통계',
              path: 'statistics/call-bot/conversation',
              index: 1,
              hide: false,
            },
            {
              menuKey: `${appId}/_statistics/call-bot/slot`,
              label: '슬롯 통계',
              path: 'statistics/call-bot/slot',
              index: 2,
              hide: false,
            },
            {
              menuKey: `${appId}/_statistics/call-bot/user`,
              label: '사용자 통계',
              path: 'statistics/call-bot/user',
              index: 3,
              hide: false,
            },
          ],
        },
        {
          menuKey: `${appId}/_statistics/nlu`,
          label: 'NLU 통계',
          index: 1,
          hide: false,
          children: [
            {
              menuKey: `${appId}/_statistics/nlu/intent`,
              label: '의도 통계',
              path: 'statistics/nlu/intent',
              index: 0,
              hide: false,
            },
            {
              menuKey: `${appId}/_statistics/nlu/entity`,
              label: '개체 통계',
              path: 'statistics/nlu/entity',
              index: 1,
              hide: false,
            },
            {
              menuKey: `${appId}/_statistics/nlu/keyword`,
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
