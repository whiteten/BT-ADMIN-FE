/**
 * Mock 코드 룩업 카탈로그 + 데이터셋 룩업
 * BE 구현 후 본 파일 삭제
 */

import type { DatasetLookup, LookupCatalogItem, SchemaPreview } from '../types';

export const MOCK_LOOKUP_CATALOG: LookupCatalogItem[] = [
  {
    lookupCatalogId: 1,
    displayName: '부서 마스터',
    tableName: 'TB_BT_CM_DEPT_MST',
    category: '일반',
    description: '전사 부서 코드/명칭/부서장',
    recommendedKey: 'DEPT_CODE',
    recommendedValues: ['DEPT_NAME', 'MANAGER_NAME', 'MEMBER_COUNT'],
    usageCount: 4,
  },
  {
    lookupCatalogId: 2,
    displayName: '부서 계층',
    tableName: 'TB_BT_CM_DEPT_HIER',
    category: '일반',
    description: '부서 트리(상위/하위 코드)',
    recommendedKey: 'DEPT_CODE',
    recommendedValues: ['PARENT_DEPT_CODE', 'DEPTH'],
    usageCount: 1,
  },
  {
    lookupCatalogId: 3,
    displayName: '상담사 마스터',
    tableName: 'TB_BT_CM_AGENT_MST',
    category: 'IC',
    description: '상담사 ID/이름/소속 부서',
    recommendedKey: 'AGENT_ID',
    recommendedValues: ['AGENT_NAME', 'DEPT_CODE', 'SKILL_GRP_CODE'],
    usageCount: 14,
  },
  {
    lookupCatalogId: 4,
    displayName: '큐 마스터',
    tableName: 'TB_BT_CM_QUEUE_MST',
    category: 'IC',
    description: '큐 ID/명칭/유형 (인바운드/아웃바운드)',
    recommendedKey: 'QUEUE_ID',
    recommendedValues: ['QUEUE_NAME', 'QUEUE_TYPE'],
    usageCount: 6,
  },
  {
    lookupCatalogId: 5,
    displayName: '스킬 마스터',
    tableName: 'TB_BT_CM_SKILL_MST',
    category: 'IC',
    description: '스킬 코드/명칭',
    recommendedKey: 'SKILL_CODE',
    recommendedValues: ['SKILL_NAME', 'SKILL_LEVEL'],
    usageCount: 2,
  },
];

/** 데이터셋별 룩업 정의 — datasetId 1만 mock */
export function getMockDatasetLookups(datasetId: number): DatasetLookup[] {
  if (datasetId === 1) {
    return [
      {
        lookupId: 1,
        datasetId: 1,
        lookupCatalogId: 1,
        catalogDisplayName: '부서 마스터',
        catalogTableName: 'TB_BT_CM_DEPT_MST',
        sourceField: 'DEPT_CODE',
        keyColumn: 'DEPT_CODE',
        joinType: 'LEFT',
        cacheTtlSec: 300,
        missPolicy: 'PASSTHROUGH',
        fields: [
          { lookupFieldId: 1, masterColumn: 'DEPT_NAME', outputFieldName: 'DEPT_NAME', dataType: 'STRING', displayName: '부서명', orderNo: 0 },
          { lookupFieldId: 2, masterColumn: 'MANAGER_NAME', outputFieldName: 'DEPT_MANAGER', dataType: 'STRING', displayName: '부서장', orderNo: 1 },
          { lookupFieldId: 3, masterColumn: 'MEMBER_COUNT', outputFieldName: 'DEPT_SIZE', dataType: 'NUMBER', displayName: '부서원수', orderNo: 2 },
        ],
      },
    ];
  }
  return [];
}

/** 스키마 프리뷰 mock (ADMIN 즉석 등록용) */
export const MOCK_SCHEMA_PREVIEW: Record<string, SchemaPreview> = {
  TB_BT_CM_SKILL_GRP_MST: {
    tableName: 'TB_BT_CM_SKILL_GRP_MST',
    selectGranted: true,
    rowCount: 42,
    columns: [
      { name: 'SKILL_GRP_CODE', type: 'STRING', nullable: false, isPrimaryKey: true },
      { name: 'SKILL_GRP_NAME', type: 'STRING', nullable: false },
      { name: 'PRIORITY', type: 'NUMBER', nullable: true },
      { name: 'PARENT_GRP', type: 'STRING', nullable: true },
      { name: 'CREATED_AT', type: 'DATETIME', nullable: false },
      { name: 'UPDATED_AT', type: 'DATETIME', nullable: true },
    ],
  },
};
