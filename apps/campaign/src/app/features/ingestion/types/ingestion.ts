// 적재(Ingestion) 도메인 타입

/** 표준 대상 필드(20개 카탈로그) 한 항목 */
export interface TargetFieldDef {
  /** 필드 코드 (예: CUST_NAME, EXT_01) */
  code: string;
  label: string;
  fixed: boolean;
}

/** 매핑 컬럼(상세) — 원본 위치 → 우리 표준 필드 1:1 규칙 */
export interface IngestMappingColumn {
  colId?: number;
  /** 우리 표준 필드 코드 (TargetField) */
  targetField: string;
  /** 원본 한 줄을 구분자로 나눴을 때의 위치(0부터) */
  sourceIndex: number;
  sourceName?: string;
  /** 변환 규칙 (TransformType) */
  transformType?: string;
  requiredYn?: string;
  defaultValue?: string;
  sortOrder?: number;
}

/** 매핑 정의(헤더 + 컬럼) */
export interface IngestMapping {
  mappingId: number;
  tenantId?: number;
  mappingName: string;
  sourceType?: string;
  delimiter?: string;
  hasHeaderYn?: string;
  errorPolicy?: string;
  fileDir?: string;
  useYn?: string;
  description?: string;
  regDt?: string;
  updDt?: string;
  columns?: IngestMappingColumn[];
}

/** 목록용(컬럼 제외) */
export type IngestMappingListItem = Omit<IngestMapping, 'columns'>;

/** 생성/수정 요청 */
export interface IngestMappingSaveDatas {
  mappingName: string;
  sourceType?: string;
  delimiter?: string;
  hasHeaderYn?: string;
  errorPolicy?: string;
  fileDir?: string;
  useYn?: string;
  description?: string;
  columns: IngestMappingColumn[];
}

/** 적재 이력(헤더) */
export interface IngestHistory {
  historyId: number;
  mappingId: number;
  mappingName?: string;
  fileName?: string;
  status?: string;
  totalRows?: number;
  successRows?: number;
  failRows?: number;
  stoppedRowNo?: number | null;
  errorSummary?: string;
  startedAt?: string;
  finishedAt?: string;
}

/** 적재 실패 행(상세) */
export interface IngestError {
  errorId: number;
  rowNo: number;
  rawLine?: string;
  reason?: string;
  regDt?: string;
}
