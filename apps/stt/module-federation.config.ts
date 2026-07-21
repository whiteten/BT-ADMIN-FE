/** stt remote의 MF 노출 정의 (번들러 중립 — tools/rsbuild/remote-config.ts가 소비). */
export default {
  name: 'stt',
  exposes: {
    './Module': './src/remote-entry.ts',
    './Routes': './src/app/routes.tsx',
    './PageVariantManifest': './src/app/features/router/pageVariantManifest.ts',
    './QuerySelectors': './src/app/features/router/querySelectors.ts',
  },
};
