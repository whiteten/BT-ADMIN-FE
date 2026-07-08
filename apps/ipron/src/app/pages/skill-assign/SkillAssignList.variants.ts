import { lazy } from 'react';
import type { PageVariantManifestConfig } from '@/components/custom/DynamicElement';

/**
 * 스킬 배정 화면 변형 선언.
 * path 는 routes.tsx 의 pv('skill-assign', ...) 화면 키와 동일 — 변경 금지.
 */
export const skillAssignVariants: PageVariantManifestConfig = {
  appId: 'ipron',
  path: 'skill-assign',
  defaultKey: 'default',
  components: {
    default: {
      label: '표준',
      component: lazy(() => import('./SkillAssignList')),
    },
    SkillAssignListLite: {
      label: '경량 패널',
      description: '3열(상담사·스킬셋/모음·실행 패널) 경량 리스트 레이아웃',
      component: lazy(() => import('./variants/SkillAssignListLite')),
    },
  },
};
