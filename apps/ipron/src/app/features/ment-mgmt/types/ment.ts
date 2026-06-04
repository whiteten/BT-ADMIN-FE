/**
 * 교환기 멘트 관리 타입 (BE DTO 매칭).
 *
 * BE: BT-ADMIN-SERVICE-IPRON `/api/ipron/ments` (SWAT IPR20S1070, TB_IE_ANNOUNCEBGM).
 *   - 멘트 = 교환기 음성안내(PCM) 파일. 스코프: NODE_ID + TENANT_ID (TENANT_ID=0 → 공통).
 *   - 멘트명은 노드+테넌트 내 중복 불가 (SWAT selDuplcateAnnouncebgmCount).
 */

// ──────────────────────────────────────────────────────────
//  멘트 마스터 (응답)
// ──────────────────────────────────────────────────────────

export interface MentResponse {
  ieMentId: number;
  nodeId: number | null;
  tenantId: number | null; // 0 = 공통
  tenantName: string | null;
  nodeName: string | null;
  mentName: string | null;
  fileName: string | null;
  filePath: string | null;
  mentDesc: string | null;
  createDate: string | null; // YYYYMMDD
  fileStatus: string | null;
  workUser: number | null;
  workTime: string | null;
}

// ──────────────────────────────────────────────────────────
//  등록/수정 요청
// ──────────────────────────────────────────────────────────

/** 단일 등록 — JSON body. 파일 바이너리 업로드는 Phase 1 deferred(MS 동기화 미구현). filePath 는 파일명 문자열 메타만 저장. */
export interface MentCreateRequest {
  nodeId: number;
  tenantId: number;
  mentName: string;
  filePath?: string; // 선택된 파일명 (실제 업로드는 추후)
  mentDesc?: string;
  createDate?: string;
}

/** 수정 — JSON body. 노드/테넌트 불변. filePath 는 파일명 문자열 메타만. */
export interface MentUpdateRequest {
  mentName: string;
  filePath?: string; // 선택된 파일명 (실제 업로드는 추후)
  mentDesc?: string;
  createDate?: string;
}

/** 다량 등록 — 파일명=멘트명 자동. 항목별 설명 매핑. */
export interface MentBatchItem {
  file: File;
  mentDesc?: string;
}

export interface MentBatchCreateRequest {
  nodeId: number;
  tenantId: number;
  items: MentBatchItem[];
}

// ──────────────────────────────────────────────────────────
//  콤보 옵션 (CTI큐 멘트 콤보 등 재사용)
// ──────────────────────────────────────────────────────────

/** 멘트 콤보 옵션 (id=mentId, name=멘트명). */
export interface MentOptionItem {
  id: number;
  name: string;
  fileName: string | null;
}

// ──────────────────────────────────────────────────────────
//  테넌트 통계 (카드 슬라이더)
// ──────────────────────────────────────────────────────────

export interface MentTenantStat {
  tenantId: number | null; // null = 전체
  tenantName: string | null;
  totalCnt: number;
}

// ──────────────────────────────────────────────────────────
//  MS 동기화 결과
// ──────────────────────────────────────────────────────────

/**
 * 멘트 MS(미디어서버) 동기화 결과.
 *
 * BE: MentSyncResult. configured=false → MS 송신부(iosvr-client-starter) 미연동.
 * 이 경우 메타/로컬파일은 정상 저장되어 있으나 미디어서버 송신은 수행되지 않음.
 */
export interface MentSyncResult {
  nodeId: number | null;
  configured: boolean;
  synced: boolean;
  successCnt: number;
  failCnt: number;
  message: string | null;
}
