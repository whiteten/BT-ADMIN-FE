/**
 * 미디어타입 사용처 타입 (BE DTO 매칭).
 *
 * BE: BT-ADMIN-SERVICE-IPRON/.../codemgmt/mediatype
 * 메인 테이블: TB_IC_MEDIA_USAGE (MEDIA_TYPE PK, MEDIA_ALIAS, SERVICE_TYPE, ...)
 * 콤보 메타: TB_CC_COMMONCODE WHERE CLASS_CD='IC_MEDIA_TYPE'
 *
 * SWAT 정합: IPR10S6060 (Media Type 관리).
 */

export interface MediaTypeResponse {
  mediaType: number;
  mediaTypeName?: string | null;
  mediaAlias: string;
  workUser?: number | null;
  workTime?: string | null;
}

export interface MediaTypeUpsertRequest {
  mediaType?: number; // 등록 시 필수, 수정 시 무시
  mediaAlias: string;
}

export interface MediaTypeMetaOption {
  codeCd: number;
  codeName: string;
  sortSeq: number | null;
  inUse: boolean;
}
