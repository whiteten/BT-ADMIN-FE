import * as fs from 'fs';
import * as path from 'path';
import { defineConfig, type RsbuildConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginSvgr } from '@rsbuild/plugin-svgr';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

import { APP_PORTS } from '../mf/app-ports';
import { createSharedConfig } from '../mf/shared-config';
import { pluginReactCompiler } from './react-compiler';

export interface RemoteMfConfig {
  name: string;
  exposes: Record<string, string>;
}

export interface RemoteConfigOptions {
  /** custom(오버라이드 운반체) 전용 — 공유 라이브러리 소비만 (import: false) */
  consumeOnly?: boolean;
  /** 앱별 빌드 경고 무시 패턴 (예: insight의 sql-formatter sourcemap 경고) */
  ignoreWarnings?: RegExp[];
}

/**
 * remote 앱 표준 rsbuild 설정 팩토리 — 전 remote가 이 한곳을 쓴다(설정 SoT).
 *
 * 앱별로 다른 것은 module-federation.config.ts(name·exposes)·package.json(version)·
 * 예외 옵션(consumeOnly·ignoreWarnings)뿐이고, 포트는 tools/mf/app-ports.ts에서 name으로 해석한다.
 *
 * @param appDir 각 앱 rsbuild.config.ts의 __dirname (favicon·assets 존재 판정용)
 */
export const createRemoteRsbuildConfig = (appDir: string, packageJson: { version: string }, mfConfig: RemoteMfConfig, options?: RemoteConfigOptions): RsbuildConfig => {
  const { name } = mfConfig;
  const port = APP_PORTS[name];
  if (!port) throw new Error(`[remote-config] tools/mf/app-ports.ts에 '${name}' 포트가 없습니다.`);

  const copy: Array<{ from: string; to?: string }> = [];
  if (fs.existsSync(path.join(appDir, 'src/favicon.ico'))) copy.push({ from: './src/favicon.ico' });
  if (fs.existsSync(path.join(appDir, 'src/assets'))) copy.push({ from: './src/assets', to: 'assets' });

  return defineConfig({
    server: {
      port,
      // LAN(MF_REMOTE_HOST) 접속 지원 — 미지정 시 IPv6 루프백([::1])만 리슨해 IP 접속 거부(실측)
      host: '0.0.0.0',
      // host(4200)가 remote 리소스를 교차 출처로 로드하므로 CORS 허용
      headers: { 'Access-Control-Allow-Origin': '*' },
    },
    html: {
      template: './src/index.html',
    },
    source: {
      entry: { index: './src/main.ts' },
      define: {
        'process.env.APP_VERSION': JSON.stringify(packageJson.version),
        // react-draggable(react-grid-layout legacy·react-resizable 내장)의 디버그 플래그.
        // 브라우저에는 process가 없어 치환하지 않으면 드래그 시작 시 ReferenceError로 드래그·리사이즈가 전부 죽는다.
        'process.env.DRAGGABLE_DEBUG': 'undefined',
      },
    },
    output: {
      copy,
    },
    tools: {
      rspack: (config) => {
        config.output = {
          ...config.output,
          // remote 청크는 remoteEntry가 로드된 URL 기준으로 해석(root context·LAN 접속 호환)
          publicPath: 'auto',
          // react-refresh 플래그 네임스페이스 분리(MF dev HMR — host 브리지와 연동)
          uniqueName: name,
        };
        if (options?.ignoreWarnings?.length) {
          config.ignoreWarnings = [...(config.ignoreWarnings ?? []), ...options.ignoreWarnings];
        }
      },
    },
    plugins: [
      pluginReactCompiler(),
      pluginReact(),
      pluginSass(),
      // Icons.tsx의 `export { ReactComponent as ... }` 패턴 유지용 mixedImport
      pluginSvgr({ mixedImport: true }),
      pluginModuleFederation({
        ...mfConfig,
        filename: 'remoteEntry.js',
        shared: createSharedConfig({ consumeOnly: options?.consumeOnly }),
        // 'version-first'는 부팅 시 remotes 전원 remoteEntry 선로드로 오염 — 브랜치 실측(5차)
        shareStrategy: 'loaded-first',
        dts: false,
      }),
    ],
  });
};
