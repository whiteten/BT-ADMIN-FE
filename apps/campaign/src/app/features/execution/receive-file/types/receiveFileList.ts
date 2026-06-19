export const RECEIVE_FILE_STATUS = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  PROCESSING: 'PROCESSING',
  PARTIAL: 'PARTIAL',
} as const;

export type ReceiveFileStatus = (typeof RECEIVE_FILE_STATUS)[keyof typeof RECEIVE_FILE_STATUS];

export interface ReceiveFileSummary {
  receiveFileId: string;
  tenantId: string;
  campaignId: string;
  scenarioListId: string;
  receivedDate: string;
  fileName: string;
  campaignName: string;
  scenarioName: string;
  targetCount: number;
  receiveStatus: ReceiveFileStatus;
  workDateTime: string;
}

export interface ReceiveFileDetailItem {
  detailId: string;
  receiveFileId: string;
  customerName: string;
  mobilePhone: string;
  customerNumber: string;
  customerKey: string;
  extraInfo1?: string;
  extraInfo2?: string;
  extraInfo3?: string;
  extraInfo4?: string;
  extraInfo5?: string;
  extraInfo6?: string;
  extraInfo7?: string;
  extraInfo8?: string;
  extraInfo9?: string;
  extraInfo10?: string;
  extraInfo11?: string;
  extraInfo12?: string;
  workDateTime: string;
}
