import type { ModuleFederationConfig } from '@nx/module-federation';

const config: ModuleFederationConfig = {
  name: 'manager',
  exposes: {
    './Module': './src/remote-entry.ts',
    './Routes': './src/app/routes.tsx',
    './PageVariants': './src/app/features/router/pageVariants.ts',
  },
  additionalShared: [
    ['@/components/ui/sidebar', { singleton: true, strictVersion: true, requiredVersion: false }],
    ['@/shared-store', { singleton: true, strictVersion: true, requiredVersion: false }],
  ],
};

/**
 * Nx requires a default export of the config to allow correct resolution of the module federation graph.
 **/
export default config;
