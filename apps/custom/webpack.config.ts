import type { ModuleFederationConfig, SharedLibraryConfig } from '@nx/module-federation';
import { withModuleFederation } from '@nx/module-federation/webpack.js';
import { withReact } from '@nx/react';
import { composePlugins, withNx } from '@nx/webpack';

import { createSharedConfig } from '../../tools/webpack/webpack-shared-config';
import baseConfig from './module-federation.config';
import { withDefinePlugin, withHmrPath } from './webpack-helpers';

/**
 * custom은 오버라이드 운반체이므로 공유 라이브러리를 "소비만" 하고 공급하지 않는다(consume-only).
 *
 * 일반 remote처럼 provider로 합류시키면, 런타임 동적 로드 시 host share scope의
 * 동일 버전 항목(react 등)을 custom 자신의 미로딩 factory로 덮어써 React 인스턴스가
 * 2개가 되는 문제가 발생한다(Invalid hook call / useMemoCache null).
 * `import: false`는 fallback 번들 자체를 제거해 custom이 항상 host(및 정적 remote)가
 * 공급한 인스턴스만 사용하도록 강제한다. 단, 오버라이드 코드가 사용하는 공유 라이브러리는
 * 반드시 제품(host·정적 remote)에서도 사용 중이어야 한다(아니면 로드 실패).
 */
const consumeOnlySharedConfig = () => {
  const base = createSharedConfig();
  return (libraryName: string, sharedConfig: unknown): false | SharedLibraryConfig | undefined => {
    const cfg = base(libraryName, sharedConfig);
    if (!cfg) return cfg;
    return { ...cfg, import: false } as SharedLibraryConfig;
  };
};

const config: ModuleFederationConfig = {
  ...baseConfig,
  shared: consumeOnlySharedConfig(),
};

// Nx plugins for webpack to build config object from Nx options and context.
/**
 * DTS Plugin is disabled in Nx Workspaces as Nx already provides Typing support Module Federation
 * The DTS Plugin can be enabled by setting dts: true
 * Learn more about the DTS Plugin here: https://module-federation.io/configure/dts.html
 */
export default composePlugins(withNx(), withReact(), withModuleFederation(config, { dts: false }), withDefinePlugin, withHmrPath);
