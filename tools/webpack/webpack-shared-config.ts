import type { SharedLibraryConfig } from '@nx/module-federation';

/**
 * Module Federation `shared` 설정의 공통 구현.
 *
 * 각 앱의 webpack.config.ts(host는 module-federation.config.ts)가 createSharedConfig를
 * import해 MF shared 설정에 사용한다.
 * 라이브러리별·remote별로 설정이 흩어지지 않도록 SoT(Single Source of Truth)를 한곳에 둔다.
 *
 * 제어 목록:
 *  - eagerLibraries:     app 로딩 이전 시점에 필요해 eager 로드해야 하는 라이브러리
 *  - excludedLibraries:  shared에서 제외하고 각 앱이 self-bundle하는 라이브러리
 */
const eagerLibraries = ['dayjs'];
/**
 * shared에서 제외하고 각 앱이 self-bundle하는 라이브러리 (substring 매칭).
 *
 * [원칙] 특별한 사유가 없으면 기본값인 shared를 유지할 것. excluded(self-bundle)는
 *  - 전역 상태·context·레지스트리를 가진 라이브러리의 단일 인스턴스 보장이 깨지고,
 *  - remote마다 중복 번들되어 전체 로드량이 늘어남.
 *  → stateless·초경량(clsx·tailwind-merge)이거나, echarts처럼 shared로는 정합을 맞출 수 없는
 *    특수한 경우에만 예외로 추가함.
 *
 * [echarts 추가] echarts·echarts-for-react·echarts-wordcloud 3종을 self-bundle 처리함.
 * - 사유: echarts-wordcloud가 deep import로 등록하는 wordCloud 시리즈는, echarts를 shared로 두면
 *   다른 remote(stt 등)가 먼저 제공한 echarts 인스턴스로 렌더되어 등록처와 어긋남 → 에러 없이
 *   워드클라우드만 빈 화면이 됨. 3종을 self-bundle하면 등록처·렌더처가 같은 인스턴스가 되어 해결됨.
 * - 트레이드오프: echarts를 쓰는 remote마다 echarts가 중복 번들됨(용량 증가). 그럼에도 remote마다
 *   개별 설정을 챙길 필요 없이 이 한 곳에서 관리되는 편의를 우선함.
 */
const excludedLibraries = ['clsx', 'tailwind-merge', 'echarts'];

/**
 * 패키지의 실제 설치 버전을 읽는다.
 *
 * 일부 패키지(@uiw/react-codemirror 등)는 esm 진입점 옆 package.json에 version 필드가 없어
 * MF의 provided version 자동 감지가 "0"이 되고, requiredVersion과 불일치해 singleton 로드가
 * 실패한다(→ 페이지 freeze). 실제 설치 버전을 명시하면 라이브러리별 수동 등록 없이 이 문제가
 * 자동으로 해소된다. package.json을 exports로 노출하지 않아 require가 실패하는 패키지는
 * undefined를 반환하고, MF의 자동 감지에 맡긴다.
 */
const readInstalledVersion = (libraryName: string): string | undefined => {
  try {
    return (require(`${libraryName}/package.json`) as { version?: string }).version;
  } catch {
    return undefined;
  }
};

export const createSharedConfig = () => {
  const rootPackageJson = require('../../package.json') as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  return (libraryName: string, sharedConfig: unknown): false | SharedLibraryConfig | undefined => {
    // 제외 목록 문자열이 포함된 라이브러리는 공유하지 않음
    if (excludedLibraries.some((excluded) => libraryName?.includes(excluded))) return false;
    // 루트 package.json에 없는 패키지는 공유하지 않음
    const pinnedVersion = rootPackageJson.dependencies?.[libraryName] ?? rootPackageJson.devDependencies?.[libraryName];
    if (!pinnedVersion) return false;

    // nx의 SharedLibraryConfig에는 version 필드가 없지만, webpack MF 런타임은 provided version으로 받는다.
    const cfg = sharedConfig as SharedLibraryConfig & { version?: string };
    if (eagerLibraries.includes(libraryName)) cfg.eager = true;
    if (cfg.requiredVersion == null) cfg.requiredVersion = pinnedVersion;
    // provided version을 실제 설치 버전으로 명시 — 자동 감지가 깨지는 패키지를 일괄 보정 (B).
    const installedVersion = readInstalledVersion(libraryName);
    if (installedVersion) cfg.version = installedVersion;
    return cfg;
  };
};
