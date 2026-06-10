/**
 * 단말모델 관리 타입 정의 (IPR20S2120)
 * 마스터 테이블: TB_IE_DN_DEVICEINFO (PK: DEVICE_TYPE, IE 채번)
 */

export interface DeviceModelResponse {
  deviceType: number;
  deviceName: string;
  vendorName: string | null;
  modelName: string | null;
  feature: string | null;
  userAgentMsg: string | null;
  lineNum: number | null;
  buttonNum: number | null;
  xmlApiFilePath: string | null;
  silentAlertInfo: string | null;
  firmName: string | null;
  firmVersion: string | null;
  firmFileName: string | null;
  firmFilePath: string | null;
  /** 이 모델을 사용 중인 단말기 수 (TB_IE_DEV_MASTER.DEVICE_TYPE 참조 건수) — 0보다 크면 삭제 차단 */
  usedDeviceCount?: number | null;
  workUser?: number | null;
  workTime?: string | null;
}

/**
 * 등록/수정 요청 — BE DeviceModelCreateRequest(record) 정합.
 * firmFileName 은 요청에 없음(펌웨어 업로드 엔드포인트가 메타 기록).
 */
export interface DeviceModelCreateRequest {
  deviceName: string;
  vendorName: string;
  modelName: string;
  feature: string;
  userAgentMsg?: string;
  lineNum: number;
  buttonNum: number;
  xmlApiFilePath: string;
  silentAlertInfo?: string;
  firmName?: string;
  firmVersion?: string;
  firmFilePath?: string;
}

export type DeviceModelUpdateRequest = DeviceModelCreateRequest;

/** 펌웨어 파일 업로드 결과 (메타) */
export interface FirmwareUploadResult {
  fileName: string;
  filePath: string;
}

/** 펌웨어 IE노드 동기화 결과 (노드별) */
export interface FirmwareSyncResult {
  nodeId?: number;
  nodeName: string;
  success: boolean;
  message?: string | null;
}

// ─── 콤보 옵션 상수 (승인 목업 정합) ─────────────────────────────────────────

export const VENDOR_OPTIONS = [
  { value: 'BridgeTec', label: 'BridgeTec' },
  { value: 'Yealink', label: 'Yealink' },
  { value: 'Grandstream', label: 'Grandstream' },
  { value: 'Cisco', label: 'Cisco' },
  { value: 'Polycom', label: 'Polycom' },
  { value: '기타', label: '기타' },
];

export const FEATURE_OPTIONS = [
  { value: 'IP Phone', label: 'IP Phone' },
  { value: 'SoftPhone', label: 'SoftPhone' },
  { value: 'Door Phone', label: 'Door Phone' },
  { value: 'ATA', label: 'ATA' },
];
