export interface RecLogItem {
  tenantId: string;
  workSdate: string;
  workerIp: string | null;
  workerId: string | null;
  workerName: string | null;
  userId: string | null;
  userName: string | null;
  recKey: string | null;
  dnNo: string | null;
  realtimeFlag: string;
  recReasonText: string | null;
  recReason: string | null;
  recTime: string | null;
  endTime: number | null;
  custTel: string | null;
  callId: string | null;
}

export interface RecLogPagedResult {
  items: RecLogItem[];
  page: number;
  size: number;
  total: number;
}

export interface RecLogSearchParams {
  tenantId: string;
  startDate: string;
  startTime?: string;
  endDate: string;
  endTime?: string;
  findWorkerId?: string;
  findWorkerNm?: string;
  findUserId?: string;
  findUserNm?: string;
  findCustTel?: string;
  findCallId?: string;
  findRealtimeFlag?: string;
  page?: number;
  size?: number;
}

export interface RecReasonType {
  tenantId: string;
  code: string;
  codeNm: string;
  codeDesc: string | null;
}

export interface RecReasonTypeRequest {
  tenantId: string;
  code: string;
  codeNm: string;
  codeDesc?: string;
}

export interface RecReasonTypeSearchParams {
  tenantId?: string;
  findCodeId?: string;
  findCodeNm?: string;
}

export const REALTIME_FLAG_LABELS: Record<string, string> = {
  '0': '파일청취',
  '1': '실시간청취',
  '2': '파일변환',
  '3': '상담APP',
  '4': '샘플콜',
  '5': '엑셀다운로드',
};
