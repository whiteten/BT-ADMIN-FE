export interface Env {
  tenantId: number;
  configFile: string;
  classCd: number;
  category: string;
  property: string;
  value: string;
}

export type EnvListItem = Pick<Env, 'configFile' | 'category' | 'property' | 'value'>;

export type EnvCreateDatas = Pick<Env, 'category' | 'property' | 'value'>;
export type EnvUpdateDatas = Pick<Env, 'value'>;

export interface EnvNodeItem {
  historyId: string;
  systemId: number;
  systemName: string;
  category: string;
  property: string;
  value: string;
  applyStatus: number;
  applyResult: number;
  failReason: string | null;
  workUser: number | null;
  workTime: string;
  success: boolean;
}

/** UI용 확장 타입 - nodes 포함 */
export interface EnvListItemWithNodes extends EnvListItem {
  nodes: EnvNodeItem[];
}
