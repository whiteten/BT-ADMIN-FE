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
