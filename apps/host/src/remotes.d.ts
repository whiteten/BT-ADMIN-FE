declare module '*/Module' {
  const Module: React.ComponentType;
  export default Module;
}

declare module '*/WorkflowApp' {
  const WorkflowApp: React.ComponentType;
  export default WorkflowApp;
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
