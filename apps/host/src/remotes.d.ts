declare module '*/Module' {
  const Module: React.ComponentType;
  export default Module;
}

declare module '*/Routes' {
  import type { RouteObject } from 'react-router-dom';
  export const routes: RouteObject[];
}

declare module '*/PageVariantManifest' {
  import type { PageVariantManifestConfig } from '@/components/custom/DynamicElement';
  export const pageVariantManifest: Record<string, PageVariantManifestConfig>;
}

declare module '*/QuerySelectors' {
  import type { QuerySelectorComponent } from '@/shared-store';
  export const querySelectors: Record<string, QuerySelectorComponent>;
}

// remote 별 범용 컴포넌트 expose 폴백 — 위 구체 패턴(Module/Routes 등)이 우선 매칭되고,
// 구체 선언이 없는 신규 컴포넌트(default React 컴포넌트) expose 는 아래 와일드카드가 받는다.
// 컴포넌트를 새로 expose 해도 host 를 수정할 필요가 없다(단, default ComponentType 으로만 추론 — named export 불가).
declare module 'manager/*' {
  const Component: React.ComponentType;
  export default Component;
}
declare module 'fca/*' {
  const Component: React.ComponentType;
  export default Component;
}
declare module 'ipron/*' {
  const Component: React.ComponentType;
  export default Component;
}
// props 가 있는 expose 는 와일드카드(ComponentType<{}>)로 부족하므로 구체 선언으로 우선 매칭.
declare module 'aoe/AgentChatPanel' {
  const AgentChatPanel: React.ComponentType<{ open: boolean; onClose: () => void; onExited?: () => void; placement?: 'bottom-right' | 'top-right' }>;
  export default AgentChatPanel;
}
declare module 'aoe/*' {
  const Component: React.ComponentType;
  export default Component;
}
declare module 'stt/*' {
  const Component: React.ComponentType;
  export default Component;
}
declare module 'ivr/*' {
  const Component: React.ComponentType;
  export default Component;
}
declare module 'insight/*' {
  const Component: React.ComponentType;
  export default Component;
}
declare module 'taskboard/*' {
  const Component: React.ComponentType;
  export default Component;
}
declare module 'vel/*' {
  const Component: React.ComponentType;
  export default Component;
}
