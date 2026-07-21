/**
 * aoe remote의 MF 노출 정의 (번들러 중립 — tools/rsbuild/remote-config.ts가 소비).
 *
 * './AgentChatPanel': host Layout이 직접 소비하는 추가 노출 (일반 4종 외 aoe 특수분).
 */
export default {
  name: 'aoe',
  exposes: {
    './Module': './src/remote-entry.ts',
    './Routes': './src/app/routes.tsx',
    './PageVariantManifest': './src/app/features/router/pageVariantManifest.ts',
    './QuerySelectors': './src/app/features/router/querySelectors.ts',
    './AgentChatPanel': './src/app/features/agent-config/components/AgentChatPanel.tsx',
  },
};
