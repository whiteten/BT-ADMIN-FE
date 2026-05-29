export interface RetryReqTreeItem {
  treeId: string;
  treeName: string;
  parentId: string;
  treeDepth: number;
}

export interface RetryReqListItem {
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
