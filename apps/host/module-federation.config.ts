import type { ModuleFederationConfig } from '@nx/module-federation';
import { createSharedConfig } from './webpack-helpers';

const config: ModuleFederationConfig = {
  name: 'host',
  /**
   * To use a remote that does not exist in your current Nx Workspace
   * You can use the tuple-syntax to define your remote
   *
   * remotes: [['my-external-remote', 'https://nx-angular-remote.netlify.app']]
   *
   * You _may_ need to add a `remotes.d.ts` file to your `src/` folder declaring the external remote for tsc, with the
   * following content:
   *
   * declare module 'my-external-remote';
   *
   */
  remotes: [
    ['manager', 'http://192.168.115.27:4201'],
    ['fca', 'http://192.168.115.27:4202'],
    ['ipron', 'http://192.168.115.27:4203'],
  ],
  shared: createSharedConfig(),
  additionalShared: [
    ['@/components/ui/sidebar', { singleton: true, strictVersion: true, requiredVersion: false }],
    ['@/shared-store', { singleton: true, strictVersion: true, requiredVersion: false }],
  ],
};

/**
 * Nx requires a default export of the config to allow correct resolution of the module federation graph.
 **/
export default config;
