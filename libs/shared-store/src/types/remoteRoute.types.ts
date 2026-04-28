export interface RemoteRouteEntry {
  path: string;
  paramKeys?: string[];
}

export type RemoteRoutesMap = Record<string, RemoteRouteEntry[]>;
