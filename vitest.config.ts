import { defineConfig } from 'vitest/config';

/**
 * 워크스페이스 단일 Vitest 설정 (Jest 대체 — 2026-07-15 결정).
 *
 * 원본(BT-ADMIN-FE)은 Jest 30 구성이었으나 실제 테스트가 0건(유일한 spec도 전체 주석)이라
 * 이관하지 않고 rsbuild 생태계 정합이 좋은 Vitest로 전환. 최소 구성 원칙:
 *  - 별칭(@/...)은 Vite 네이티브 tsconfig paths 해석(resolve.tsconfigPaths) 사용
 *  - 컴포넌트 테스트 대비 jsdom 환경 (필요 시 @testing-library/* 추가는 그때)
 *  - describe/it/expect는 'vitest'에서 명시 import (globals 미사용)
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    include: ['apps/**/src/**/*.{spec,test}.{ts,tsx}', 'libs/**/src/**/*.{spec,test}.{ts,tsx}'],
  },
});
