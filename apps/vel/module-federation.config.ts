/**
 * vel remote의 MF 노출 정의 (번들러 중립 — tools/rsbuild/remote-config.ts가 소비).
 *
 * 원본의 additionalShared '@/components/ui/sidebar'는 사용처 없음이 검증돼 이관 제외
 * (poc/nx23-rspack2 커밋 8953c09d 판정 이월).
 */
export default {
  name: 'vel',
  exposes: {
    './Module': './src/remote-entry.ts',
    './Routes': './src/app/routes.tsx',
    './PageVariantManifest': './src/app/features/router/pageVariantManifest.ts',
    './QuerySelectors': './src/app/features/router/querySelectors.ts',
  },
};
