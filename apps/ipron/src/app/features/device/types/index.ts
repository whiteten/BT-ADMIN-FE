/**
 * 단말기 관리 타입 정의 (IPR20S2110)
 */

export interface DevMasterResponse {
  devMasterId: number;
  nodeId: number;
  deviceType: number;
  deviceTypeName: string | null;
  lineNum: number | null;
  buttonNum: number | null;
  devMstName: string;
  macAddr: string;
  ipAddr: string | null;
  ipVersion: number | null;
  portNo: number | null;
  transportType: number | null;
  extAuthtype: number | null;
  codec1: number | null;
  codec2: number | null;
  codec3: number | null;
  codec4: number | null;
  codec5: number | null;
  confMode: number | null;
  confRoomNum: string | null; // DB: NVARCHAR2(128)
  blfUseYn: number | null;
  xmlUrl: number | null;
  srtpUseYn: number | null;
  provTime: string | null;
  provResult: number | null;
  firmVersion: string | null;
  firmUpdUseYn: number | null;
  firmUpdTime: string | null;
  firmUpdResult: number | null;
  dnId: number | null;
  dnNo: string | null;
  lines: ProvisionLineDto[] | null;
  buttons: ProvisionButtonDto[] | null;
  workUser: number | null;
  workTime: string | null;
}

export interface ProvisionLineDto {
  provisionSeq: number;
  dnId: number | null;
  dnNo: string | null;
  labelText: string | null;
  dnTypeName: string | null;
}

export interface ProvisionButtonDto {
  provisionSeq: number;
  labelText: string | null;
  buttonFunc: number | null;
  buttonFuncValue: string | null;
}

export interface DeviceTypeInfoDto {
  deviceType: number;
  deviceName: string;
  lineNum: number | null;
  buttonNum: number | null;
}

export interface NodeTenantStatDto {
  nodeId: number;
  tenantId: number;
  totalCnt: number;
  firmUpdCnt: number;
  provSuccessCnt: number;
}

export interface DevMasterCreateRequest {
  nodeId: number;
  deviceType: number;
  devMstName: string;
  macAddr: string;
  ipAddr?: string;
  ipVersion?: number;
  portNo: number;
  transportType: number;
  extAuthtype: number;
  codec1?: number;
  codec2?: number;
  codec3?: number;
  codec4?: number;
  codec5?: number;
  blfUseYn?: number;
  xmlUrl?: number;
  firmUpdUseYn?: number;
  srtpUseYn?: number;
  lines?: ProvisionLineRequest[];
  buttons?: ProvisionButtonRequest[];
}

export interface ProvisionLineRequest {
  provisionSeq: number;
  dnId?: number;
  labelText?: string;
}

export interface ProvisionButtonRequest {
  provisionSeq: number;
  labelText?: string;
  buttonFunc?: number;
  buttonFuncValue?: string;
}

export type DevMasterUpdateRequest = Omit<DevMasterCreateRequest, 'nodeId'>;

export interface FirmwareUseRequest {
  devMasterIds: number[];
  firmUpdUseYn: number;
}

export interface DeviceRebootRequest {
  devMasterIds: number[];
}

export interface DnAssignRequest {
  dnId: number;
}

// 단말기 이력 타입
export interface DevHistoryResponse {
  historyId: string;
  macAddr: string | null;
  mdfyTime: string | null;
  dnId: number | null;
  dnNo: string | null;
  ieUserid: number | null;
  ieUsername: string | null;
  devStatus: string | null;
  devStatusName: string | null;
  changeCode: string | null;
  changeCodeName: string | null;
  changeDesc: string | null;
}

export interface DevHistorySearchParams {
  strDate?: string;
  endDate?: string;
  macAddr?: string;
  ieUsername?: string;
  startDn?: string;
  endDn?: string;
  devStatus?: string;
  changeCode?: string;
  page?: number;
  size?: number;
}
