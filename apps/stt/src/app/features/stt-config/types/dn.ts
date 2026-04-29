export interface PaGroupItem {
  groupId: string;
  groupName: string;
  parentId?: string | null;
}

export interface SttDnItem {
  tenantId: string;
  tenantName: string;
  dnNo: string;
  phoneIp: string;
  dnStatus: string;
  useYn: string;
  agentId: string;
  hostName: string;
  saFinshDate: string;
}

export interface SttDnSearchParams {
  hostName?: string;
  dnStatus?: string;
  useYn?: string;
  dnNo?: string;
  phoneIp?: string;
}

export interface SttDnDeleteParams {
  tenantId: string;
  dnNo: string;
}

export interface SttDnCreateData {
  hostName: string;
  dnNo: string;
  phoneIp: string;
  dnStatus: string;
  useYn: string;
  tenantId: string;
  agentId: string;
}
