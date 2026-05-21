import type { ModuleFederationConfig } from '@nx/module-federation';

const config: ModuleFederationConfig = {
  name: 'ipron',
  exposes: {
    './Module': './src/remote-entry.ts',
    './Routes': './src/app/routes.tsx',
    './PageVariantManifest': './src/app/features/router/pageVariantManifest.ts',
    './QuerySelectors': './src/app/features/router/querySelectors.ts',
  },
  additionalShared: [['@/shared-store', { singleton: true, strictVersion: true, requiredVersion: false }]],
};

/**
 * Nx requires a default export of the config to allow correct resolution of the module federation graph.
 **/
export default config;
