/**
 * OAuth2 클라이언트 관리 타입 정의
 */

/**
 * OAuth2 클라이언트 백엔드 응답 타입
 */
export interface ClientBackendResponse {
  clientId: number;
  clientKey: string;
  clientName: string;
  description?: string;
  tenantId?: string;
  /** 권한(Scopes) - authKey 문자열 배열 */
  scopes: string[];
  /** 역할 목록 */
  roles?: string[];
  /** Grant Types - 백엔드에서 문자열로 옴 */
  grantTypes: string;
  /** 활성 여부 - "Y" 또는 "N" */
  isActive: string;
  /** 클라이언트 시크릿 (생성/재생성 시에만 반환) */
  clientSecret?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * OAuth2 클라이언트 프론트엔드 타입 (변환된 형태)
 */
export interface Client {
  clientId: number;
  clientKey: string;
  clientName: string;
  description?: string;
  tenantId?: string;
  /** 권한(Scopes) - authKey 문자열 배열 */
  scopes: string[];
  /** 역할 목록 */
  roles?: string[];
  /** Grant Types - 배열로 변환 */
  grantTypes: string[];
  /** 활성 여부 - boolean으로 변환 */
  isActive: boolean;
  /** 클라이언트 시크릿 (생성/재생성 시에만 반환) */
  clientSecret?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * 클라이언트 생성 요청 DTO (백엔드 형식)
 */
export interface ClientCreateRequest {
  clientKey: string;
  clientName: string;
  description?: string;
  roles?: string[];
  scopes?: string[];
  isActive?: string; // "Y" 또는 "N"
}

/**
 * 클라이언트 수정 요청 DTO (백엔드 형식)
 */
export interface ClientUpdateRequest {
  clientKey: string; // 필수!
  clientName: string;
  description?: string;
  roles?: string[];
  scopes?: string[];
  isActive?: string; // "Y" 또는 "N"
}

export interface TaskboardBg {
  tenantId: string;
  pageId: number;
  pageName: string;
  fileName: string;
  authorName?: string;
  authRole?: string;
  genType: string;
  useYn: string;
  regDt: string;
}

/** 레이아웃 (배경 1개 → 다수 전광판) */
export interface TaskboardLayout {
  layoutId: number;
  pageId: number;
  tenantId?: string;
  pageName?: string; // bg 테이블에서 조인
  fileName?: string; // bg 이미지 URL
  layoutName: string;
  layoutJson?: string;
  authorName?: string; // 등록자 이름
  authRole?: string; // 등록자 권한 역할코드
  useYn: string;
  regDt: string;
}

/** 테이블형 위젯 컬럼 정의 */
export interface TableColumn {
  key: string;
  label: string;
  width?: string;
}

/** 드래그 가능한 콜데이터 위젯 아이템 */
export interface CallDataItem {
  id: string;
  category: 'IVR' | 'CTI' | 'Agent' | 'Group' | 'Skill' | 'Tenant' | 'etc' | 'List' | 'Redis';
  label: string;
  unit?: string;
  sampleValue: string | number;
  color: string; // 카테고리 대표 색상
  displayType?: 'value' | 'table';
  isRealtime?: boolean;
  tableConfig?: {
    columns: TableColumn[];
    sampleRows: Record<string, string | number>[];
  };
}

/** 위젯 스타일 */
export interface WidgetStyle {
  fontSize: number;
  fontFamily: string;
  color: string;
  bgColor: string;
  titleAlign?: 'left' | 'center' | 'right';
  valueAlign?: 'left' | 'center' | 'right';
  useThousandSep?: boolean;
}

/** 전광판 캔버스에 드랍된 위젯 */
export interface DroppedWidget {
  id: string;
  item: CallDataItem;
  x: number; // % left position
  y: number; // % top position
  w: number; // % width
  h: number; // % height
  showTitle: boolean; // 라벨(타이틀) 표시 여부
  customTitle?: string; // 사용자 정의 타이틀 (item.label 대체)
  style: WidgetStyle;
}

/** 전광판 롤링 그룹 (DB: TB_TK_ROLLING_GROUP) */
export interface RollingGroup {
  groupId: number;
  tenantId?: string;
  groupName: string;
  /** 포함 레이아웃 ID 배열 JSON 문자열 "[1,2,3]" */
  layoutIds: string;
  intervalSec: number;
  /** 공개 URL 접근용 UUID 토큰 (서버 자동 발급) */
  publicToken: string;
  /** 레이아웃 스냅샷 JSON — 공개 뷰에서 사용 */
  rollingData?: string;
  useYn: string;
  regDt: string;
}

/** 레이아웃 존 */
export interface LayoutZone {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

/** 레이아웃 템플릿 */
export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  zones: LayoutZone[];
}

/**
 * 백엔드 응답을 프론트엔드 타입으로 변환
 */
export function transformClientResponse(backendClient: ClientBackendResponse): Client {
  return {
    ...backendClient,
    grantTypes: backendClient.grantTypes ? backendClient.grantTypes.split(',').map((s) => s.trim()) : [],
    isActive: backendClient.isActive === 'Y',
  };
}

/**
 * 프론트엔드 폼 데이터를 백엔드 요청 형식으로 변환
 */
export function transformToBackendFormat(isActive: boolean): string {
  return isActive ? 'Y' : 'N';
}
export class Taskboard {}
