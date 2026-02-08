/**
 * 사용자 리소스 접근 관련 타입
 */

/** 리소스 타입 */
export type ResourceType = 'BOT' | 'NLU_MODEL';

/** 선택 가능한 리소스 항목 (트리/다이얼로그용) */
export interface AvailableResource {
  id: string;
  name: string;
  description?: string;
  children?: AvailableResource[];
}

/** 할당된 리소스 항목 (테이블 표시용) */
export interface AssignedResource {
  resourceId: string;
  resourceName: string;
}

// ──────────────────────────────────────────────
// API 타입
// ──────────────────────────────────────────────

/** 사용자 리소스 매핑 (API 응답) */
export interface UserResourceMap {
  resourceMapId: number;
  tenantId: number;
  userId: number;
  resourceType: ResourceType;
  resourceId: string;
  createdAt: string;
  createdBy: number | null;
}

/** 사용자 리소스 매핑 동기화 요청 */
export interface UserResourceSyncRequest {
  botIds: string[];
  nluModelIds: string[];
}

/** 사용자 리소스 매핑 동기화 응답 */
export interface UserResourceSyncResponse {
  botCount: number;
  modelCount: number;
}

/** 봇 서비스 정보 (bot-list API 응답) */
export interface BotService {
  serviceId: number;
  serviceName: string;
  serviceDesc?: string;
}

/** NLU 모델 정보 (model-list API 응답) */
export interface NluModel {
  modelId: string;
  modelName: string;
}
