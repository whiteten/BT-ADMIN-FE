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

export const createSharedConfig = () => {
  // 명시적으로 eager 처리가 필요한 라이브러리들 (app 로딩 이전 시점에 필요한 라이브러리)
  const eagerLibraries = ['dayjs'];
  // shared에서 제외할 라이브러리들
  const excludedLibraries = ['clsx', 'tailwind-merge'];
  return (libraryName: string, sharedConfig: unknown): false | SharedLibraryConfig | undefined => {
    // 제외 목록의 문자열이 포함된 라이브러리는 공유하지 않음
    if (excludedLibraries.some((excluded) => libraryName?.includes(excluded))) {
      // console.log('◾', libraryName?.padEnd(35, '-').concat('>'), '❌ Not shared (excluded)');
      return false;
    }
    // 루트 package.json에 없는 패키지들은 공유하지 않음
    const rootPackageJson = require('../../package.json');
    if (!rootPackageJson.dependencies[libraryName] && !rootPackageJson.devDependencies[libraryName]) {
      // console.log('◾', libraryName?.padEnd(35, '-').concat('>'), '❌ Not shared (not in root)');
      return false;
    }
    // console.log('◾', libraryName?.padEnd(35, '-').concat('>'), '✅ Shared');
    if (eagerLibraries.includes(libraryName)) (sharedConfig as SharedLibraryConfig).eager = true;
    return sharedConfig as SharedLibraryConfig;
  };
};
