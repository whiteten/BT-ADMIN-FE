import * as fs from 'fs';
import * as path from 'path';
import type { SharedLibraryConfig } from '@nx/module-federation';
import { type Configuration, DefinePlugin } from 'webpack';

const packageJsonPath = path.resolve(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

export const withHmrPath = (config: Configuration, _ctx: unknown): Configuration => {
  const devServer = (config as Record<string, unknown>).devServer as Record<string, unknown> | undefined;
  if (devServer) {
    devServer.client = {
      ...(devServer.client as Record<string, unknown>),
      webSocketURL: { pathname: '/hmr' },
    };
    devServer.webSocketServer = { options: { path: '/hmr' } };
  }
  return config;
};

export const withDefinePlugin = <T extends { plugins?: unknown[] }>(config: T): T => {
  (config.plugins ??= []).push(
    new DefinePlugin({
      'process.env.APP_VERSION': JSON.stringify(packageJson.version),
    }),
  );
  return config;
};

/**
 * 무해한 3rd-party 경고 silence.
 *  - sql-formatter@15.x: dist에 .ts 원본 없이 sourcemap만 포함 → source-map-loader가 원본을 못 찾고 ENOENT 경고
 *  - @uiw/react-codemirror: esm/package.json에 version 필드 없음 → MF shared가 version 자동감지 실패 (shared config 쪽도 보강)
 */
export const withIgnoreWarnings = <T extends { ignoreWarnings?: (RegExp | ((warning: Error) => boolean))[] }>(config: T): T => {
  (config.ignoreWarnings ??= []).push(/Failed to parse source map.*sql-formatter/, /No version specified.*@uiw[\\/]react-codemirror/);
  return config;
};

export const createSharedConfig = () => {
  // 명시적으로 eager 처리가 필요한 라이브러리들 (app 로딩 이전 시점에 필요한 라이브러리)
  const eagerLibraries = ['dayjs'];
  // shared에서 제외할 라이브러리들
  const excludedLibraries = ['clsx', 'tailwind-merge'];
  const rootPackageJson = require('../../package.json');
  return (libraryName: string, sharedConfig: unknown): false | SharedLibraryConfig | undefined => {
    // 제외 목록의 문자열이 포함된 라이브러리는 공유하지 않음
    if (excludedLibraries.some((excluded) => libraryName?.includes(excluded))) {
      // console.log('◾', libraryName?.padEnd(35, '-').concat('>'), '❌ Not shared (excluded)');
      return false;
    }
    // 루트 package.json에 없는 패키지들은 공유하지 않음
    const pinnedVersion = rootPackageJson.dependencies?.[libraryName] ?? rootPackageJson.devDependencies?.[libraryName];
    if (!pinnedVersion) {
      // console.log('◾', libraryName?.padEnd(35, '-').concat('>'), '❌ Not shared (not in root)');
      return false;
    }
    // console.log('◾', libraryName?.padEnd(35, '-').concat('>'), '✅ Shared');
    const cfg = sharedConfig as SharedLibraryConfig;
    if (eagerLibraries.includes(libraryName)) cfg.eager = true;
    // 일부 패키지(@uiw/react-codemirror의 esm/package.json 등)는 version 필드가 없어 MF가 자동 감지에 실패.
    // 루트 package.json에 핀된 버전을 명시적으로 부여해 경고 회피.
    if (cfg.requiredVersion == null) cfg.requiredVersion = pinnedVersion;
    return cfg;
  };
};
