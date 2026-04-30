import { lazy } from 'react';
import type { PageVariantConfig } from '@/components/custom/DynamicElement';

/**
 * 봇 목록 화면 변형 정의.
 *
 * 새 변형을 추가하려면:
 *  1. ./variants/BotListXxx.tsx 같은 식으로 컴포넌트 작성
 *  2. 아래 components에 lazy import + label/description 추가
 *  3. apps/fca/src/app/features/router/pageVariants.ts aggregator에 import 누락 없는지 확인
 */
export const botListVariants: PageVariantConfig = {
  appId: 'fca',
  path: 'bot-config/bot/list',
  defaultKey: 'BotList',
  components: {
    BotList: {
      label: '기본 봇 목록',
      description: '기본 봇 목록',
      component: lazy(() => import('./BotList')),
    },
    BotList_TEST_A: {
      label: '화면 변경 테스트 A',
      description: '화면 지정 동작 확인용 테스트 변형. 검증 후 제거 예정.',
      component: lazy(() => import('./variants/BotList_TEST_A')),
    },
  },
};
