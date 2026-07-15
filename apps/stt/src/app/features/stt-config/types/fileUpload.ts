export interface FileUploadItem {
  ucidGkey: string;
  tenantName: string;
  filename: string;
  callDatetime: string;
  callDate: string;
  callTime: string;
  talkTime: string;
  inoutKind: string;
  dnNo: string;
  agentId: string;
  agentName: string;
  workKind: string;
  engineCode: string;
  recSystemIp: string;
  saFilepath: string;
  saFilename: string;
}

export interface FileUploadSearchParams {
  fromDate?: string;
  toDate?: string;
}
