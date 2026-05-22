export type InputType = 'SELECT' | 'MULTI_SELECT' | 'TREE_MULTI_SELECT' | 'RADIO';

export const CATEGORY_OPTIONS = [
  { value: 'IE', label: '교환기' },
  { value: 'IC', label: 'CTI' },
  { value: 'IR', label: 'IVR' },
  { value: 'COMMON', label: '공통' },
];

export const INPUT_TYPE_OPTIONS: { value: InputType; label: string }[] = [
  { value: 'SELECT', label: 'SELECT — 단일 선택' },
  { value: 'MULTI_SELECT', label: 'MULTI_SELECT — 복수 선택' },
  { value: 'TREE_MULTI_SELECT', label: 'TREE_MULTI_SELECT — 계층 복수 선택' },
  { value: 'RADIO', label: 'RADIO — 라디오' },
];

export interface SearchConditionNodeSummary {
  nodeCode: string;
  inputType: InputType;
  parentNodeCode?: string | null;
  optionSqlPreview?: string | null;
}

export interface SearchConditionListItem {
  searchCondId: number;
  title: string;
  categoryCode?: string;
  isBundle: boolean;
  nodes: SearchConditionNodeSummary[];
  usedReportCount: number;
}

export interface SearchConditionNode {
  nodeId?: number;
  nodeDepth: number;
  nodeCode: string;
  nodeLabel: string;
  inputType: InputType;
  optionSql: string;
  parentNodeCode?: string | null;
  sortOrder?: number;
  valueColumn?: string;
  labelColumn?: string;
  parentColumn?: string | null;
  levelColumn?: string | null;
}

export interface SearchConditionDetail {
  searchCondId: number;
  title: string;
  categoryCode?: string;
  isBundle: boolean;
  description?: string;
  nodes: SearchConditionNode[];
}

export type SearchConditionCreateDatas = {
  title: string;
  categoryCode?: string;
  description?: string;
  nodes: Omit<SearchConditionNode, 'nodeId'>[];
};

export interface SqlPreviewRequest {
  optionSql: string;
  parentValue?: string;
  valueColumn?: string;
  labelColumn?: string;
  parentColumn?: string;
  levelColumn?: string;
}

export interface SqlPreviewResult {
  label: string | null;
  value: string | null;
  parent?: string | null;
  level?: number | null;
}

/** 카탈로그 테이블 — 노드 단위 플랫 행 */
export interface CatalogRow {
  searchCondId: number;
  title: string;
  categoryCode?: string;
  usedReportCount: number;
  nodeCode: string;
  inputType: InputType;
  parentNodeCode?: string | null;
  optionSqlPreview?: string | null;
}
