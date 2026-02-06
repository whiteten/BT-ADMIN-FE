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
