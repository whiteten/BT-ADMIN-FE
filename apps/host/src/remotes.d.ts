declare module '*/Module' {
  const Module: React.ComponentType;
  export default Module;
}

declare module '*/Routes' {
  import type { RouteObject } from 'react-router-dom';
  export const routes: RouteObject[];
}
