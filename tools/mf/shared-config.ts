/**
 * Module Federation `shared` 설정의 공통 구현 (rsbuild/@module-federation 객체 형태).
 *
 * 원본(BT-ADMIN-FE tools/webpack/webpack-shared-config.ts)은 Nx 플러그인 전용
 * "라이브러리별 콜백" 시그니처였다. @module-federation/rsbuild-plugin은 객체 맵을
 * 받으므로, 루트 package.json dependencies를 순회해 같은 정책으로 맵을 생성한다.
 *
 * 정책(원본 + poc/nx23-rspack2 브랜치 검증분 이월):
 *  - eagerLibraries:     app 로딩 이전 시점에 필요해 eager 로드해야 하는 라이브러리
 *  - singletonLibraries: 단일 인스턴스 보장이 필수인 라이브러리(react·react-dom).
 *      비-singleton이면 공급자 선정이 로드 순서 의존이라 React 인스턴스 이중화
 *      크래시(Invalid hook call·useMemoCache null)가 실측됨 — 브랜치 2026-07-14 5차.
 *  - excludedLibraries:  shared에서 제외하고 각 앱이 self-bundle (substring 매칭).
 *      echarts: wordCloud 시리즈 등록처·렌더처 인스턴스 불일치 → 빈 화면 문제.
 *      codemirror: transitive 코어 인스턴스 2개화 → "Unrecognized extension value" 에러.
 *      recharts: victory-vendor(d3 계열) transitive 청크가 공유 스코프와 얽혀 첫 진입 시
 *        모듈 팩토리 미등록 TypeError(reading 'call') 실측(ipron 콜 추적, 2026-07-22).
 *        cross-app 단일 인스턴스가 필요 없는 차트 라이브러리라 self-bundle로 격리.
 *      clsx·tailwind-merge: stateless 초경량이라 공유 이득 없음.
 *  - version: 실제 설치 버전 명시 — provided version 자동 감지가 "0"이 되는
 *      패키지(@uiw/react-codemirror 등)의 singleton 로드 실패(freeze) 일괄 보정.
 *  - '@/shared-store': 워크스페이스 lib 단일 인스턴스 (원본 additionalShared 상당).
 */
import * as path from 'path';

const eagerLibraries = ['dayjs'];
const singletonLibraries = ['react', 'react-dom'];
const excludedLibraries = ['clsx', 'tailwind-merge', 'echarts', 'codemirror', 'recharts'];

const readInstalledVersion = (libraryName: string): string | undefined => {
  try {
    return (require(`${libraryName}/package.json`) as { version?: string }).version;
  } catch {
    return undefined;
  }
};

export interface SharedEntry {
  requiredVersion?: string | false;
  version?: string;
  eager?: boolean;
  singleton?: boolean;
  strictVersion?: boolean;
  import?: string | false;
}

/**
 * @param options.consumeOnly custom(오버라이드 운반체) 전용 — 공유 라이브러리를 소비만
 *   하고 공급하지 않는다(import: false). fallback 번들 자체를 제거해 host가 공급한
 *   인스턴스만 쓰도록 강제 (원본 apps/custom/webpack.config.ts 주석 참조).
 */
export const createSharedConfig = (options?: { consumeOnly?: boolean }): Record<string, SharedEntry> => {
  const rootPackageJson = require(path.resolve(__dirname, '../../package.json')) as {
    dependencies?: Record<string, string>;
  };
  const consumeOnly = options?.consumeOnly === true;

  const shared: Record<string, SharedEntry> = {};
  for (const [libraryName, pinnedVersion] of Object.entries(rootPackageJson.dependencies ?? {})) {
    if (excludedLibraries.some((excluded) => libraryName.includes(excluded))) continue;

    const entry: SharedEntry = { requiredVersion: pinnedVersion };
    const installedVersion = readInstalledVersion(libraryName);
    if (installedVersion) entry.version = installedVersion;
    if (eagerLibraries.includes(libraryName)) entry.eager = true;
    if (singletonLibraries.includes(libraryName)) entry.singleton = true;
    if (consumeOnly) entry.import = false;
    shared[libraryName] = entry;
  }

  // 워크스페이스 lib 단일 인스턴스 (원본 additionalShared 상당).
  // version: 소스 lib라 package.json이 없어 자동 감지 불가 — 명시하지 않으면 빌드 경고.
  // '@/shared-util': useToastStore(zustand) 보유 — 비공유 시 remote가 자기 복사본 스토어에
  // push하고 host ToastProvider는 host 인스턴스를 구독해 remote발 토스트가 화면에 안 뜬다.
  for (const workspaceLib of ['@/shared-store', '@/shared-util']) {
    shared[workspaceLib] = {
      singleton: true,
      strictVersion: true,
      requiredVersion: false,
      version: '0.0.0',
      ...(consumeOnly ? { import: false as const } : {}),
    };
  }

  return shared;
};
