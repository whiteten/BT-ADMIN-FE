import { lazy } from 'react';
import type { PageVariantManifestConfig } from '@/components/custom/DynamicElement';

export const botListVariants: PageVariantManifestConfig = {
  appId: 'fca',
  path: 'bot-config/bot/list', // ⚠️ 기존 pv() 화면 키와 동일 — 변경 금지
  defaultKey: 'default',
  components: {
    default: {
      label: '표준',
      component: lazy(() => import('./BotList')),
    },
    BotListGrid: {
      label: '그리드형',
      description: '카드 대신 AG-Grid 테이블로 봇 목록 표시',
      component: lazy(() => import('./variants/BotListGrid')),
    },
  },
};
