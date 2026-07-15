export interface KeywordBoostingSearchParams {
  engineCode?: string;
}

export interface KeywordBoostingItem {
  id: number;
  tenantId: number;
  tenantName: string;
  keyword: string;
  engineCode?: string;
  workUser: string;
  workUserName: string;
  workTime: string;
}

export interface KeywordBoostingCreateData {
  keyword: string;
  engineCode?: string;
}

export interface SttDictionarySearchParams {
  keyword?: string;
}

export interface SttDictionaryItem {
  id: number;
  tenantId: number;
  tenantName: string;
  beforeWord: string;
  afterWord: string;
  useYn: string;
  workUser: string;
  workUserName: string;
  workTime: string;
}

export interface SttDictionaryCreateData {
  beforeWord: string;
  afterWord: string;
  useYn: string;
}

export interface SttDictionaryUpdateData {
  id: number;
  beforeWord: string;
  afterWord: string;
  useYn: string;
}

export interface ExcelImportResultRow {
  rowNumber: number;
  name: string;
  status: 'SUCCESS' | 'FAIL';
  reason: string | null;
}

export interface ExcelImportResult {
  totalCount: number;
  successCount: number;
  failCount: number;
  rows: ExcelImportResultRow[];
}
