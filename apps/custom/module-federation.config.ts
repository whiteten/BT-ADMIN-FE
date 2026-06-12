import type { ModuleFederationConfig, SharedLibraryConfig } from '@nx/module-federation';

/**
 * 현장 커스터마이징 오버라이드 운반체(custom) remote.
 *
 * 일반 업무 remote와 달리 host의 remotes 배열에 등록하지 않으며(빌드 타임에 host가 모름),
 * host가 부팅 시 고정 경로(/remotes/custom/remoteEntry.js) HEAD 체크 후 런타임에 동적 등록한다.
 * exposes에는 라우트 모듈이 아니라 "기존 remote 화면의 오버라이드 사본"을
 * '<appId>/<path>' 형태로 노출한다. componentKey('site:<appId>/<path>')와 1:1 대응.
 */
const config: ModuleFederationConfig = {
  name: 'custom',
  exposes: {
    // 오버라이드 목록 메타 — host가 부팅 시 읽어 picker 카탈로그에 '커스텀' 카드로 노출
    './SiteManifest': './src/app/site-manifest.ts',
    // 오버라이드 키 컨벤션: './<appId>/<path>' — site-manifest.ts의 키와 1:1 동기화할 것
    //   path는 routes.tsx의 화면 키 그대로(동적 세그먼트 ':paramId' 포함 가능)
    // 예시: './fca/bot-config/bot/list': './src/app/overrides/fca/app/pages/bot-config/BotList.tsx',
    //       './fca/bot-config/bot/:serviceId': './src/app/overrides/fca/app/pages/bot-config/BotDetail.tsx',
  },
  // import: false — custom은 @/shared-store도 공급하지 않고 host 것만 소비한다 (webpack.config.ts 주석 참조)
  additionalShared: [['@/shared-store', { singleton: true, strictVersion: true, requiredVersion: false, import: false } as SharedLibraryConfig]],
};

/**
 * Nx requires a default export of the config to allow correct resolution of the module federation graph.
 **/
export default config;
