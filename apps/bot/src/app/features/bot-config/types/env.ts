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
export type EnvUpdateDatas = Pick<Env, 'category' | 'property' | 'value'>;
