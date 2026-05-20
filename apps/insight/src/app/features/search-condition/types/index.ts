export type InputType = 'SELECT' | 'MULTI_SELECT' | 'TREE_MULTI_SELECT' | 'RADIO';

export interface SearchConditionNode {
  nodeId: number;
  nodeDepth: number;
  nodeCode: string;
  nodeLabel: string;
  inputType: InputType;
  optionSql: string;
  parentNodeCode?: string;
}

export interface SearchConditionListItem {
  searchCondId: number;
  title: string;
  categoryCode?: string;
  isBundle: boolean;
  nodes: Pick<SearchConditionNode, 'nodeCode' | 'inputType'>[];
  usedPanelCount: number;
}

export interface SearchConditionDetail {
  searchCondId: number;
  title: string;
  categoryCode?: string;
  isBundle: boolean;
  nodes: SearchConditionNode[];
}

export interface SearchConditionCreateDatas {
  title: string;
  categoryCode?: string;
  isBundle: boolean;
  nodes: Omit<SearchConditionNode, 'nodeId'>[];
}

export interface SqlPreviewRequest {
  optionSql: string;
  parentValue?: string[];
}

export interface SqlPreviewResult {
  label: string;
  value: string;
  parent?: string;
  level?: number;
}

export interface OptionItem {
  label: string;
  value: string;
  parent?: string;
  level?: number;
  children?: OptionItem[];
}
