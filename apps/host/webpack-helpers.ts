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
      'process.env.SELECTED_REMOTES': JSON.stringify(process.env.SELECTED_REMOTES ?? ''),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
    }),
  );
  return config;
};
