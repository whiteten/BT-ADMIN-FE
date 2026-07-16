/**
 * fca remote의 MF 노출 정의 (번들러 중립 — rsbuild.config.ts가 소비).
 *
 * shared 전략·기본 옵션(shareStrategy 등)은 tools/mf/shared-config.ts와
 * rsbuild.config.ts에서 일괄 관리하므로 여기에는 name·exposes만 둔다.
 */
export default {
  name: 'fca',
  exposes: {
    './Module': './src/remote-entry.ts',
    './Routes': './src/app/routes.tsx',
    './PageVariantManifest': './src/app/features/router/pageVariantManifest.ts',
    './QuerySelectors': './src/app/features/router/querySelectors.ts',
  },
};
