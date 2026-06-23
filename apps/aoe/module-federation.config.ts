import type { ModuleFederationConfig } from '@nx/module-federation';

const config: ModuleFederationConfig = {
  name: 'aoe',
  exposes: {
    './Module': './src/remote-entry.ts',
    './Routes': './src/app/routes.tsx',
    './PageVariantManifest': './src/app/features/router/pageVariantManifest.ts',
    './QuerySelectors': './src/app/features/router/querySelectors.ts',
    './AgentChatPanel': './src/app/features/agent-config/components/AgentChatPanel.tsx',
  },
  additionalShared: [['@/shared-store', { singleton: true, strictVersion: true, requiredVersion: false }]],
};

/**
 * Nx requires a default export of the config to allow correct resolution of the module federation graph.
 **/
export default config;
