import type { ModuleFederationConfig } from '@nx/module-federation';

const config: ModuleFederationConfig = {
  name: 'fca',
  exposes: {
    './Module': './src/remote-entry.ts',
    './MenuConfig': './src/app/features/sidebar/menu-config.ts',
    './Routes': './src/app/routes.tsx',
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
