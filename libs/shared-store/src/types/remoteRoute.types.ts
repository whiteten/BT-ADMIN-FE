export interface RemoteRouteEntry {
  path: string;
  fullPath: string;
  componentName?: string;
  file?: string;
  paramKeys?: string[];
}

export type RemoteRoutesMap = Record<string, RemoteRouteEntry[]>;
