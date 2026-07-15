export interface RetryReqTreeItem {
  treeId: string;
  treeName: string;
  parentId: string;
  treeDepth: number;
}

export interface RetryReqListItem {
  tenantId: number;
  tenantName: string | null;
  retryDate: string;
  retryType: string;
  retryTime: string;
  retryCnt: number;
  retryStatus: number;
  retryStatusNm: string;
  totalSa: number;
  sumSaComplete: number;
  workUser: string | null;
  dbInsertTime: string;
}

export interface RetryReqSearchParams {
  retryDate: string;
}

export interface RetryReqCreateParams {
  retryDate: string;
  retryType: 1 | 2;
  retryTime: string;
}
