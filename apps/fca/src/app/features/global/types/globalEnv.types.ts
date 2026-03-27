export interface GlobalEnv {
  category: string;
  property: string;
  value: string;
  reapplyYn: boolean;
}

export type GlobalEnvListItem = Pick<GlobalEnv, 'category' | 'property' | 'value' | 'reapplyYn'>;

export type GlobalEnvCreateDatas = Pick<GlobalEnv, 'category' | 'property' | 'value'>;
export type GlobalEnvUpdateDatas = Pick<GlobalEnv, 'value'>;

export interface GlobalEnvDetailItem extends GlobalEnv {
  systemId: number;
}

export interface GlobalEnvHistoryItem {
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
