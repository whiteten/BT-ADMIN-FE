import * as fs from 'fs';
import * as path from 'path';
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
 */
export const withIgnoreWarnings = (config: Configuration): Configuration => {
  (config.ignoreWarnings ??= []).push(/Failed to parse source map.*sql-formatter/);
  return config;
};
