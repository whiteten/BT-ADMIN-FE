export interface TenantItem {
  tenantId: number;
  tenantName: string;
}

export interface CodeItem {
  code: string;
  value: string;
}

export interface SttSystemItem {
  systemId: string;
  systemCode: string;
  systemName: string;
  systemAlias: string;
  sysClassCdNm: string;
  hostName: string;
  ipv4Address: string;
}
