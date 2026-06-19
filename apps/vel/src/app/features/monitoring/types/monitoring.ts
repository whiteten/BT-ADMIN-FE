export interface MonitoringItem {
  tenantId: string;
  dnNo: string | null;
  userId: string | null;
  userName: string | null;
  phoneIp: string | null;
  userIp: string | null;
  dnStatus: string | null;
  dnStatusName: string | null;
  agentStatus: string | null;
  groupId: string | null;
  groupName: string | null;
  lastUptDate: string | null;
  elapsedTime: number | null;
  systemId: string | null;
  systemName: string | null;
  processId: string | null;
  processName: string | null;
  useFlag: string | null;
  diffTime: number | null;
  recCustTel: string | null;
  rtFlag: string | null;
  rtUserName: string | null;
  rtSystemId: string | null;
  rtProcessId: string | null;
}

export interface MruSystem {
  code: number | string;
  codeNm: string;
  processName: string | null;
}

export interface MruProcess {
  code: number | string;
  codeNm: string;
}

export const SORT_OPTIONS = [
  { value: 'dn', label: '내선번호' },
  { value: 'id', label: '상담원ID' },
  { value: 'nm', label: '상담원이름' },
  { value: 'st', label: '상담원상태' },
];

export interface MonitoringSearchParams {
  tenantId?: string;
  findSort?: string;
  findGrantId?: string;
  findGroupId?: string;
  findGroupName?: string;
  findUserNameText?: string;
  findDnText?: string;
  findSystemId?: string;
  findProcessId?: string;
  callFrmTm?: string;
  callEndTm?: string;
  findStatusWait?: string;
  findStatusRec?: string;
  findLogin?: string;
  findLogout?: string;
  userId?: string;
  controlAuth?: string;
  grantId?: string;
}

export const AGENT_STATUS_LABELS: Record<string, string> = {
  '01': '로그인',
  '99': '로그아웃',
};

export interface EavesdropInfo {
  mfuIp: string | null;
  dnNo: string | null;
  tenantId: string;
  userId: string | null;
  userName: string | null;
  workerId: string;
  workerName: string;
}

export interface EavesdropUpdateRequest {
  tenantId: string;
  rtUserName: string;
  dnNo: string;
}

export interface EavesdropLogRequest {
  tenantId: string;
  workerId: string;
  userId: string;
  dnNo: string;
  userIp: string;
}

export const GRANT_OPTIONS = [
  { value: '', label: '선택하세요!' },
  { value: 'SuperAdmin', label: '슈퍼어드민' },
  { value: 'SystemAdmin', label: '시스템관리자' },
  { value: 'Manager', label: '매니저' },
  { value: 'GroupManager', label: '그룹매니저' },
  { value: 'Agent', label: '상담원' },
];
