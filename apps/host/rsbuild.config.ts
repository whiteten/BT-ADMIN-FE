import * as path from 'path';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginSvgr } from '@rsbuild/plugin-svgr';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

import { APP_PORTS, REMOTE_NAMES } from '../../tools/mf/app-ports';
import { createSharedConfig } from '../../tools/mf/shared-config';
import { pluginReactCompiler } from '../../tools/rsbuild/react-compiler';
import packageJson from './package.json';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const proxyConfig = require('./proxy.config.js') as Array<{ context: string[]; [key: string]: unknown }>;

/**
 * 원본 proxy.config.js는 webpack-dev-server의 배열형({ context: [...] })인데,
 * rsbuild server.proxy는 context 배열 항목을 해석하지 못해 전 경로를 프록시로 넘긴다
 * (전 화면 504 실측 — 2026-07-15). 경로 키 객체 맵으로 변환해 전달한다.
 * proxy.config.js(공유본·local override 규약)는 SoT로 그대로 유지.
 */
const proxy = Object.fromEntries(proxyConfig.flatMap(({ context, ...options }) => context.map((prefix) => [prefix, options])));

const isProd = process.env.NODE_ENV === 'production';

/**
 * remote 주소 조립.
 *
 * - dev: http://localhost:<port>/remoteEntry.js — remote dev 서버 직결.
 *   다른 PC에서 IP로 접속하는 경우 MF_REMOTE_HOST(LAN IP)로 host명을 교체
 *   (원본 applyRemoteHostOverride 상당. 포트 SoT는 tools/mf/app-ports.ts).
 *   미기동 remote는 로드 시 404 → host 코드의 catch fallback으로 스킵(legacy 동작 유지).
 * - prod: /remotes/<name>/remoteEntry.js — 같은 origin 하위 정적 경로.
 *   root context(basePath) 접두는 mf-basepath-runtime-plugin이 런타임에 처리.
 */
const remoteEntryUrl = (name: string): string => {
  if (isProd) return `${name}@/remotes/${name}/remoteEntry.js`;
  const remoteHost = process.env.MF_REMOTE_HOST?.trim() || 'localhost';
  return `${name}@http://${remoteHost}:${APP_PORTS[name]}/remoteEntry.js`;
};

export default defineConfig({
  server: {
    port: APP_PORTS.host,
    host: '0.0.0.0',
    // /api·/oauth·/ws(백엔드 BFF)·/remotes/custom(custom dev 서버) 프록시 — 원본 파일 재사용(위에서 맵 변환)
    proxy,
    // 브라우저 자동 열기: scripts/serve-host.js 경유 시에만(SERVE_OPEN), SERVE_NO_OPEN으로 억제 가능
    open: Boolean(process.env.SERVE_OPEN) && !process.env.SERVE_NO_OPEN,
  },
  html: {
    template: './src/index.html',
  },
  source: {
    entry: { index: './src/main.ts' },
    // 전역 스타일(tailwind 포함)은 host가 공급 — 원본 project.json build.options.styles 상당
    preEntry: [path.resolve(__dirname, '../../libs/shared-ui/src/styles/global.css')],
    define: {
      'process.env.APP_VERSION': JSON.stringify(packageJson.version),
      // 앱 폴더명 — query key 앱 스코프(src/app/shared/queryKeys.ts) 등 앱 식별용
      __APP_NAME__: JSON.stringify(path.basename(__dirname)),
      // PUBLIC_REACT_QUERY_DEVTOOLS는 apps/host/.env + rsbuild PUBLIC_ 자동 노출로 주입 — 수동 define 불필요
    },
  },
  output: {
    copy: [{ from: './src/favicon.ico' }, { from: './src/assets', to: 'assets' }],
    // public/(config.js)은 rsbuild 기본 publicDir 규약으로 dev 서빙·build 복사됨
  },
  tools: {
    rspack: (config) => {
      config.output = {
        ...config.output,
        // <base href> 치환(root context 배포)과 호환되도록 로드 지점 기준 해석
        publicPath: 'auto',
        // react-refresh 플래그 네임스페이스 분리(MF dev HMR — poc/nx23-rspack2 이월)
        uniqueName: 'host',
      };
    },
  },
  plugins: [
    pluginReactCompiler(),
    pluginReact(),
    pluginSass(),
    pluginSvgr({ mixedImport: true }),
    pluginModuleFederation({
      name: 'host',
      remotes: Object.fromEntries(REMOTE_NAMES.map((name) => [name, remoteEntryUrl(name)])),
      shared: createSharedConfig(),
      // 'version-first'는 부팅 시 remotes 전원 remoteEntry 선로드로 오염 — 브랜치 실측(5차)
      shareStrategy: 'loaded-first',
      // remote entry(/remotes/...)에 root context(basePath)를 런타임 접두
      runtimePlugins: [path.resolve(__dirname, './src/mf-basepath-runtime-plugin.ts')],
      dts: false,
    }),
  ],
});
