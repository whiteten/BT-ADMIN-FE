export interface SleeConfigTenant {
  tenantId: number;
  tenantName: string;
  configFileCount: number;
}

export interface SleeConfigFile {
  tenantId: number;
  configFile: string;
  categoryCount: number;
  propertyCount: number;
}

export interface SleeConfigCategory {
  tenantId: number;
  configFile: string;
  category: string;
  propertyCount: number;
  lastModified?: string;
}

export interface SleeConfigProperty {
  tenantId: number;
  configFile: string;
  classCd: number;
  category: string;
  property: string;
  value: string;
  chgValue?: string;
  masking?: string;
  ptyDesc?: string;
  workUser?: number;
  workTime?: string;
}
