export interface Env {
  tenantId: number;
  configFile: string;
  classCd: number;
  category: string;
  property: string;
  value: string;
  reapplyYn: boolean;
}

export type EnvListItem = Pick<Env, 'configFile' | 'category' | 'property' | 'value' | 'reapplyYn'>;

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
  applyResult: number | null;
  failReason: string | null;
  workUser: number | null;
  workTime: string;
  success: boolean;
}
