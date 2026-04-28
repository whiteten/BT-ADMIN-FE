declare module '*/Module' {
  const Module: React.ComponentType;
  export default Module;
}

declare module '*/Routes' {
  import type { RouteObject } from 'react-router-dom';
  export const routes: RouteObject[];
}

declare module '*/PageVariants' {
  import type { PageVariantConfig } from '@/components/custom/DynamicElement';
  export const pageVariants: Record<string, PageVariantConfig>;
}
