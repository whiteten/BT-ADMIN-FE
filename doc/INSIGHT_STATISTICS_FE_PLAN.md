# Insight 통계 MFE 전면 재작성 — 프론트엔드 구현 계획

> **문서 목적**: `apps/insight` 통계 MFE를 완전히 재설계·재구현하기 위한 개발자 레퍼런스.  
> **작성 기준일**: 2026-05-18  
> **대상 브랜치**: `feature/statistics-dashboard`

---

## 목차

1. [개요](#1-개요)
2. [삭제 대상](#2-삭제-대상)
3. [신규 디렉토리 구조](#3-신규-디렉토리-구조)
4. [라우팅 설계](#4-라우팅-설계)
5. [타입 정의 전체](#5-타입-정의-전체)
6. [API 계층](#6-api-계층)
7. [상태 관리 (Zustand)](#7-상태-관리-zustand)
8. [컴포넌트별 상세 설계](#8-컴포넌트별-상세-설계)
9. [AG-Grid 사용 가이드](#9-ag-grid-사용-가이드)
10. [차트 컴포넌트 가이드](#10-차트-컴포넌트-가이드)
11. [시간 단위 × 비교 매트릭스 (D120)](#11-시간-단위--비교-매트릭스-d120)
12. [구현 단계 및 순서](#12-구현-단계-및-순서)
13. [주의사항](#13-주의사항)

---

## 1. 개요

### 1.1 시스템 개요

- **MFE 식별자**: `insight` (Module Federation remote)
- **라우트 프리픽스**: `/insight/statistics/*`
- **API**: 모든 호출은 BFF 경유 → `apiClient.post('/bff/{flow-id}', body)` 또는 `apiClient.get('/bff/{flow-id}?...')`
- **핵심 라이브러리**: AG-Grid Enterprise (그리드), Recharts (차트), react-grid-layout (캔버스 드래그)

### 1.2 설계 토큰 (Design Tokens)

```css
/* CSS 변수 (styles.css에 선언) */
--bt-primary:       #085fb5;   /* 기본 파란색 */
--bt-fg:            #0a0a0b;   /* 본문 텍스트 */
--bt-fg-muted:      #6a6f78;   /* 보조 텍스트 */
--bt-border:        #e4e7ec;   /* 테두리 */
--bt-bg-canvas:     #f1f3f6;   /* 캔버스 배경 */
--bt-bg-surface:    #ffffff;   /* 카드·패널 배경 */
--bt-radius:        1px;       /* 매우 각진 모서리 (angular design) */
```

- **폰트**: Pretendard Variable
- **그리드 격자 배경**: `linear-gradient(to right, #e4e7ec 1px, transparent 1px), linear-gradient(to bottom, #e4e7ec 1px, transparent 1px)` / `backgroundSize: 24px 24px`

### 1.3 핵심 설계 결정 (Design Decisions)

| ID | 내용 |
|----|------|
| D113 | 보고서 1개 = 뷰(데이터소스) 1개 고정. 생성 시 선택, 이후 변경 불가 |
| D115 | 모든 패널은 동일 데이터셋 공유. 글로벌 필터 1번 조회로 전체 패널 갱신 |
| D116 | 패널 타입 6종: GRID, BAR, LINE, PIE, RADAR, KPI |
| D117 | LINE은 X축에 DATE 차원 필수. PIE는 단일 지표만 허용, 시리즈 없음 |
| D118 | BAR 2가지 변형: 이중 축(2개 이상 지표, 단위 다를 때 좌우 Y축 자동 분리), X축 지표 모드(피벗) |
| D119 | 차트 옵션 최소화: 데이터 레이블, 범례, 방향, 스타일, 도넛 토글, 목표선만 |
| D120 | 시간 단위(5) × 비교 옵션(4) 동적 매트릭스. 단위별 일부 비교 비활성 |
| D121 | 비교 ON 시 패널별 자동 렌더: KPI=diff 칩, Grid=컬럼 그룹, BAR=그룹 막대, LINE=점선 오버레이, PIE=2개 도넛 나란히, RADAR=2개 폴리곤 |
| D122 | 푸터 합계는 ag-Grid `aggFunc` 클라이언트 계산. 계산 필드는 `aggExpression` 패턴 |
| D123 | 보고서 발행 토글 → 메뉴 등록(boundary publish) |
| D124 | 정렬·제한은 패널 필드 매핑의 별도 슬롯으로 분리 |
| D54  | 사용자 레이아웃 오버라이드 (개인화) |

---

## 2. 삭제 대상

아래 파일·디렉토리를 **전부 삭제**한다. 신규 구현과 충돌하므로 어떤 코드도 재사용하지 않는다.

```
apps/insight/src/app/features/stat/           ← 디렉토리 전체 삭제
apps/insight/src/app/pages/stat/              ← 디렉토리 전체 삭제
```

**개별 파일 목록**:

```
apps/insight/src/app/features/stat/api/statApi.ts
apps/insight/src/app/features/stat/constants/widgetTemplates.ts
apps/insight/src/app/features/stat/hooks/useStatQueries.ts
apps/insight/src/app/features/stat/router/pageVariantManifest.ts
apps/insight/src/app/features/stat/router/querySelectors.ts
apps/insight/src/app/features/stat/types/condition.ts
apps/insight/src/app/features/stat/types/datasource.ts
apps/insight/src/app/features/stat/types/index.ts
apps/insight/src/app/features/stat/types/query.ts
apps/insight/src/app/features/stat/types/widget.ts
apps/insight/src/app/pages/stat/StatDashboardPage.tsx
apps/insight/src/app/pages/stat/widget/WidgetBuilderPage.tsx
apps/insight/src/app/pages/stat/widget/WidgetListPage.tsx
apps/insight/src/app/pages/stat/widget/WidgetTemplateModal.tsx
apps/insight/src/app/pages/stat/widget/steps/StepDataSource.tsx
apps/insight/src/app/pages/stat/widget/steps/StepFieldMapping.tsx
apps/insight/src/app/pages/stat/widget/steps/StepPreview.tsx
apps/insight/src/app/pages/stat/widget/steps/StepVisualization.tsx
apps/insight/src/app/pages/stat/widget/steps/StepVisualizeAndPreview.tsx
```

**수정이 필요한 파일** (삭제 아님):

- `apps/insight/src/app/routes.tsx` → 신규 라우트로 전면 교체
- `apps/insight/module-federation.config.ts` → expose 경로 업데이트

---

## 3. 신규 디렉토리 구조

```
apps/insight/src/app/
├── routes.tsx                                    # 신규 라우트 (전면 교체)
│
├── pages/
│   ├── search-conditions/
│   │   └── SearchConditionCatalogPage.tsx        # §1 검색 조건 카탈로그
│   ├── reports/
│   │   └── ReportListPage.tsx                    # §2 보고서 목록
│   ├── report-wizard/
│   │   └── ReportWizardPage.tsx                  # §2-A·B·C 생성 위저드
│   ├── report-editor/
│   │   └── ReportEditorPage.tsx                  # §3~§6+§8 편집 모드
│   └── report-view/
│       └── ReportViewPage.tsx                    # §7·§7-B·§9 뷰 모드
│
├── features/
│   ├── search-condition/
│   │   ├── api/
│   │   │   └── searchConditionApi.ts
│   │   ├── components/
│   │   │   ├── SearchConditionEditor.tsx         # §1-A 에디터 사이드시트
│   │   │   └── SearchConditionBinder.tsx         # §2-B 검색 조건 바인딩 UI
│   │   ├── hooks/
│   │   │   └── useSearchConditionQueries.ts
│   │   └── types/
│   │       └── index.ts
│   │
│   ├── report/
│   │   ├── api/
│   │   │   └── reportApi.ts
│   │   ├── components/
│   │   │   ├── ReportCard.tsx                    # §2 카드 컴포넌트
│   │   │   └── PublishDialog.tsx                 # §8 발행 다이얼로그
│   │   ├── hooks/
│   │   │   └── useReportQueries.ts
│   │   └── types/
│   │       └── index.ts
│   │
│   ├── dataset/
│   │   ├── api/
│   │   │   └── datasetApi.ts
│   │   ├── components/
│   │   │   ├── DatasetFieldTable.tsx             # §2-B 필드 인라인 편집 테이블
│   │   │   └── CalcFieldEditor.tsx               # §2-C 계산 필드 모달
│   │   ├── hooks/
│   │   │   └── useDatasetQueries.ts
│   │   └── types/
│   │       └── index.ts
│   │
│   ├── panel/
│   │   ├── api/
│   │   │   └── panelApi.ts
│   │   ├── components/
│   │   │   ├── PanelEditorSheet.tsx              # §4 패널 편집 사이드시트 (3단계)
│   │   │   ├── grid/
│   │   │   │   └── PanelGrid.tsx                 # 그리드 패널
│   │   │   ├── chart/
│   │   │   │   ├── PanelBarChart.tsx             # BAR 패널
│   │   │   │   ├── PanelLineChart.tsx            # LINE 패널
│   │   │   │   ├── PanelPieChart.tsx             # PIE 패널
│   │   │   │   └── PanelRadarChart.tsx           # RADAR 패널
│   │   │   └── kpi/
│   │   │       └── PanelKpiCard.tsx              # KPI 카드 패널
│   │   ├── hooks/
│   │   │   └── usePanelQueries.ts
│   │   └── types/
│   │       └── index.ts
│   │
│   ├── canvas/
│   │   ├── components/
│   │   │   ├── CanvasLayout.tsx                  # react-grid-layout 래퍼
│   │   │   └── PanelWrapper.tsx                  # 패널 헤더+컨텐츠 래퍼
│   │   └── hooks/
│   │       └── useCanvasLayout.ts
│   │
│   └── global-filter/
│       ├── components/
│       │   ├── GlobalFilter.tsx                  # §6 글로벌 필터 바
│       │   ├── TimeUnitToggle.tsx                # 시간 단위 토글
│       │   └── ComparisonToggle.tsx              # 비교 기간 토글
│       └── types/
│           └── index.ts
│
├── stores/
│   ├── useReportEditorStore.ts                   # 편집 모드 전역 상태
│   ├── useReportViewStore.ts                     # 뷰 모드 글로벌 필터 상태
│   └── useSearchConditionStore.ts               # 검색 조건 카탈로그 상태
│
└── router/
    ├── pageVariantManifest.ts                    # MF expose (빈 객체 유지)
    └── querySelectors.ts                         # MF expose (빈 객체 유지)
```

---

## 4. 라우팅 설계

### 4.1 routes.tsx (전체)

```typescript
// apps/insight/src/app/routes.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const SearchConditionCatalogPage = React.lazy(
  () => import('./pages/search-conditions/SearchConditionCatalogPage')
);
const ReportListPage = React.lazy(
  () => import('./pages/reports/ReportListPage')
);
const ReportWizardPage = React.lazy(
  () => import('./pages/report-wizard/ReportWizardPage')
);
const ReportEditorPage = React.lazy(
  () => import('./pages/report-editor/ReportEditorPage')
);
const ReportViewPage = React.lazy(
  () => import('./pages/report-view/ReportViewPage')
);

export const routes = [
  {
    path: '/',
    element: <Outlet />,
    children: [
      { index: true, element: <Navigate to="statistics/reports" replace /> },
      {
        path: 'statistics',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="reports" replace /> },
          {
            path: 'search-conditions',
            element: <SearchConditionCatalogPage />,
            handle: {
              breadcrumb: [
                { title: '통계' },
                { title: '검색 조건', path: '/insight/statistics/search-conditions' },
              ],
            },
          },
          {
            path: 'reports',
            children: [
              {
                index: true,
                element: <ReportListPage />,
                handle: {
                  breadcrumb: [
                    { title: '통계' },
                    { title: '보고서 목록', path: '/insight/statistics/reports' },
                  ],
                },
              },
              {
                path: 'new',
                element: <ReportWizardPage />,
                handle: {
                  breadcrumb: [
                    { title: '통계' },
                    { title: '보고서 목록', path: '/insight/statistics/reports' },
                    { title: '새 보고서', path: '/insight/statistics/reports/new' },
                  ],
                },
              },
              {
                path: ':reportId',
                children: [
                  {
                    path: 'edit',
                    element: <ReportEditorPage />,
                    handle: {
                      breadcrumb: [
                        { title: '통계' },
                        { title: '보고서 목록', path: '/insight/statistics/reports' },
                        { title: ':reportTitle' },
                        { title: '편집' },
                      ],
                    },
                  },
                  {
                    path: 'view',
                    element: <ReportViewPage />,
                    handle: {
                      breadcrumb: [
                        { title: '통계' },
                        { title: '보고서 목록', path: '/insight/statistics/reports' },
                        { title: ':reportTitle' },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound homePath="/insight" /> },
];
```

### 4.2 breadcrumb 처리 패턴

- `ReportEditorPage` / `ReportViewPage` 에서 `useGetReportDetail` 완료 후 `setBreadcrumb(items, { reportTitle: report.title })`로 동적 라벨 치환
- `useEffect` deps에 `report?.title` 포함
- cleanup 시 `clearBreadcrumb()` 호출

### 4.3 module-federation.config.ts 수정

```typescript
// apps/insight/module-federation.config.ts
exposes: {
  './Module': './src/remote-entry.ts',
  './Routes': './src/app/routes.tsx',
  './PageVariantManifest': './src/app/router/pageVariantManifest.ts',   // 경로 변경
  './QuerySelectors': './src/app/router/querySelectors.ts',             // 경로 변경
},
```

---

## 5. 타입 정의 전체

### 5.1 공통 타입

```typescript
// apps/insight/src/app/features/report/types/index.ts

// ─── 시간 단위 ───
export type TimeUnit = '10MIN' | 'HOURLY' | 'DAILY' | 'MONTHLY' | 'YEARLY';
export const TIME_UNIT_LABELS: Record<TimeUnit, string> = {
  '10MIN':   '10분',
  'HOURLY':  '시',
  'DAILY':   '일',
  'MONTHLY': '월',
  'YEARLY':  '년',
};

// ─── 비교 타입 ───
export type ComparisonType = 'PREV_DAY' | 'PREV_WEEK' | 'PREV_MONTH' | 'PREV_YEAR';
export const COMPARISON_LABELS: Record<ComparisonType, string> = {
  PREV_DAY:   '전일',
  PREV_WEEK:  '전주',
  PREV_MONTH: '전월',
  PREV_YEAR:  '전년',
};

// ─── 보고서 목록 아이템 ───
export interface ReportListItem {
  reportId: number;
  title: string;
  description?: string;
  domain: string;          // 'IE' | 'IC' | 'IR' | 'FCA' | 'AI' | 'COMMON'
  viewKey: string;         // 데이터소스(뷰) 키 — 생성 후 불변
  isPublished: boolean;    // 메뉴 등록 여부
  isOwner: boolean;        // 내 보고서 여부
  updatedBy: string;
  updatedAt: string;
  createdBy: string;
  createdAt: string;
}

// ─── 보고서 상세 ───
export interface ReportDetail extends ReportListItem {
  panels: Panel[];
  fieldDisplays: FieldDisplay[];
  calcFields: CalcField[];
  searchBindings: SearchBinding[];
}

// ─── 보고서 생성 요청 ───
export interface ReportCreateDatas {
  title: string;
  description?: string;
  domain: string;
  viewKey: string;        // 생성 시만 설정
}

// ─── 보고서 수정 요청 ───
export interface ReportUpdateDatas {
  title: string;
  description?: string;
}
```

### 5.2 데이터셋 타입

```typescript
// apps/insight/src/app/features/dataset/types/index.ts

// ─── 데이터소스(뷰) ───
export interface DataSource {
  viewKey: string;
  viewName: string;
  domain: string;
  description?: string;
  isActive: boolean;
}

// ─── 데이터소스 필드 ───
export interface DataSourceField {
  fieldName: string;
  displayName: string;
  fieldType: 'DIM' | 'MSR' | 'DATE';   // DATE는 DIM의 특수 케이스
  dataType: 'STRING' | 'NUMBER' | 'DATETIME';
  sortOrder: number;
}

// ─── 필드 표시 설정 (§2-B 인라인 편집 대상) ───
export interface FieldDisplay {
  fieldDisplayId: number;
  reportId: number;
  fieldName: string;
  displayName: string;       // 편집 가능
  fieldType: 'DIM' | 'MSR'; // 편집 가능
  columnFormat: ColumnFormat; // 편집 가능
  isVisible: boolean;        // 편집 가능
  sortOrder: number;
}

export type ColumnFormat = 'Number' | 'Decimal' | 'Rate' | 'String' | 'Date' | 'Time';

export const COLUMN_FORMAT_OPTIONS: { value: ColumnFormat; label: string }[] = [
  { value: 'Number',  label: '숫자' },
  { value: 'Decimal', label: '소수' },
  { value: 'Rate',    label: '비율(%)' },
  { value: 'String',  label: '문자' },
  { value: 'Date',    label: '날짜' },
  { value: 'Time',    label: '시간' },
];

// ─── 계산 필드 ───
export interface CalcField {
  calcFieldId: number;
  reportId: number;
  fieldCode: string;          // 고유 코드 (토큰에서 참조)
  displayName: string;
  columnFormat: ColumnFormat;
  kpiDirection: KpiDirection;
  rowExpression: string;      // 행 계산식 (토큰 빌더 출력)
  aggExpression: string;      // 푸터/집계 계산식
}

export type KpiDirection = 'HIGHER_BETTER' | 'LOWER_BETTER' | 'NEUTRAL';
export const KPI_DIRECTION_LABELS: Record<KpiDirection, string> = {
  HIGHER_BETTER: '높을수록 좋음',
  LOWER_BETTER:  '낮을수록 좋음',
  NEUTRAL:       '중립',
};

// ─── 계산 필드 생성 요청 ───
export type CalcFieldCreateDatas = Omit<CalcField, 'calcFieldId' | 'reportId'>;
export type CalcFieldUpdateDatas = Omit<CalcField, 'calcFieldId' | 'reportId'>;

// ─── 검색 조건 바인딩 ───
export interface SearchBinding {
  bindingId: number;
  reportId: number;
  conditionId: number;
  conditionName: string;   // 표시용 (읽기 전용)
  bindFieldName: string;   // 데이터소스 필드와 연결
  sortOrder: number;
}
```

### 5.3 패널 타입

```typescript
// apps/insight/src/app/features/panel/types/index.ts

export type PanelType = 'GRID' | 'BAR' | 'LINE' | 'PIE' | 'RADAR' | 'KPI';

export const PANEL_TYPE_LABELS: Record<PanelType, string> = {
  GRID:  '그리드',
  BAR:   '막대 차트',
  LINE:  '선 차트',
  PIE:   '파이 차트',
  RADAR: '레이더 차트',
  KPI:   'KPI 카드',
};

// ─── 슬롯 타입 (패널 타입별로 사용 가능한 슬롯 다름) ───
export type SlotType =
  | 'ROW'      // Grid: 행 차원
  | 'COLUMN'   // Grid: 열 차원 (피벗)
  | 'X_AXIS'   // BAR/LINE: X축
  | 'Y_AXIS'   // BAR: Y축 (복수 허용)
  | 'SERIES'   // BAR/LINE: 시리즈 분기 차원
  | 'SLICE'    // PIE: 슬라이스 차원
  | 'VALUE'    // PIE/KPI: 단일 지표
  | 'AXIS'     // RADAR: 축 지표 (복수)
  | 'SORT'     // 정렬 (D124)
  | 'LIMIT'    // 상위 N개 (D124)
  | 'FILTER';  // 패널 고유 필터

// ─── 슬롯별 허용 fieldType 매핑 ───
export const SLOT_ALLOWED_FIELD_TYPES: Record<SlotType, ('DIM' | 'MSR' | 'DATE')[]> = {
  ROW:    ['DIM', 'DATE'],
  COLUMN: ['DIM'],
  X_AXIS: ['DIM', 'DATE'],
  Y_AXIS: ['MSR'],
  SERIES: ['DIM'],
  SLICE:  ['DIM'],
  VALUE:  ['MSR'],
  AXIS:   ['MSR'],
  SORT:   ['DIM', 'MSR', 'DATE'],
  LIMIT:  [],     // 숫자값, 별도 처리
  FILTER: ['DIM', 'MSR', 'DATE'],
};

// ─── 패널 필드 매핑 ───
export interface PanelFieldMap {
  fieldMapId: number;
  panelId: number;
  slotType: SlotType;
  fieldName: string;         // FieldDisplay.fieldName 또는 CalcField.fieldCode 참조
  isCalcField: boolean;
  sortOrder: number;
  // SORT 슬롯 전용
  sortDirection?: 'ASC' | 'DESC';
  // LIMIT 슬롯 전용
  limitCount?: number;
}

// ─── 패널 ───
export interface Panel {
  panelId: number;
  reportId: number;
  panelType: PanelType;
  title: string;
  // react-grid-layout 좌표
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  fieldMaps: PanelFieldMap[];
  chartOptions: ChartOptions;
  sortOrder: number;
}

// ─── 차트 옵션 (D119) ───
export interface ChartOptions {
  showDataLabel: boolean;
  showLegend: boolean;
  // BAR/LINE 전용
  direction?: 'VERTICAL' | 'HORIZONTAL';
  // BAR 전용
  barStyle?: 'GROUPED' | 'STACKED';
  // PIE 전용
  isDonut?: boolean;
  // LINE/BAR 전용: 목표선
  goalLine?: { value: number; label: string; color: string } | null;
}

// ─── 패널 생성 요청 ───
export type PanelCreateDatas = Omit<Panel, 'panelId' | 'reportId' | 'fieldMaps'> & {
  fieldMaps: Omit<PanelFieldMap, 'fieldMapId' | 'panelId'>[];
};

// ─── 레이아웃 업데이트 요청 (드래그 후 일괄) ───
export interface PanelLayoutUpdateItem {
  panelId: number;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
}
```

### 5.4 검색 조건 타입

```typescript
// apps/insight/src/app/features/search-condition/types/index.ts

export type ConditionInputType = 'SELECT' | 'MULTI_SELECT' | 'TREE_MULTI_SELECT' | 'RADIO';

export const CONDITION_INPUT_TYPE_LABELS: Record<ConditionInputType, string> = {
  SELECT:            '단일 선택',
  MULTI_SELECT:      '다중 선택',
  TREE_MULTI_SELECT: '트리 다중 선택',
  RADIO:             '라디오',
};

// ─── 노드 번들 모델: D0(루트) + D1+(케스케이드 자식) ───
export interface SearchConditionNode {
  nodeId: number;
  conditionId: number;   // 속한 검색 조건
  parentNodeId: number | null;  // null이면 D0(루트)
  nodeLevel: number;     // 0=D0, 1=D1, ...
  nodeName: string;
  inputType: ConditionInputType;
  sqlQuery: string;      // 옵션을 가져오는 SQL
  isValidated: boolean;  // SQL 실행 성공 여부
  sortOrder: number;
}

// ─── 검색 조건 (카탈로그 항목) ───
export interface SearchCondition {
  conditionId: number;
  conditionKey: string;  // 고유 키 (바인딩에서 참조)
  displayName: string;
  groupKey: string;
  groupLabel: string;
  nodes: SearchConditionNode[];
  panelUsageCount: number;   // 사용 중인 패널 수 (읽기 전용)
  sqlPreview: string;        // SQL 미리보기 (truncated, 읽기 전용)
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── 검색 조건 생성 요청 ───
export type SearchConditionCreateDatas = Pick<SearchCondition, 'conditionKey' | 'displayName' | 'groupKey' | 'groupLabel'> & {
  nodes: Omit<SearchConditionNode, 'nodeId' | 'conditionId'>[];
};

export type SearchConditionUpdateDatas = SearchConditionCreateDatas;

// ─── SQL 검증·미리보기 요청 ───
export interface SearchConditionPreviewRequest {
  sqlQuery: string;
  parentValue?: string | number;  // 케스케이드 테스트용
}

export interface SearchConditionPreviewResult {
  isValid: boolean;
  errorMessage?: string;
  rows: Record<string, unknown>[];  // 미리보기 데이터 (최대 10행)
  columns: { key: string; label: string }[];
}
```

### 5.5 쿼리 실행 타입

```typescript
// apps/insight/src/app/features/panel/types/index.ts 에 포함

// ─── 글로벌 필터 ───
export interface GlobalFilter {
  period: { from: string; to: string };  // 'YYYY-MM-DD'
  timeUnit: TimeUnit;
  searchValues: Record<string, unknown>; // conditionKey → 사용자 입력값
  comparison: ComparisonType | null;
}

// ─── 쿼리 요청 ───
export interface QueryRequest {
  reportId: number;
  panelId: number;
  globalFilter: GlobalFilter;
}

// ─── 쿼리 응답 ───
export interface QueryResult {
  columns: QueryColumn[];
  current: Record<string, unknown>[];
  compare: Record<string, unknown>[] | null;  // 비교 ON일 때만
  totalCount: number;
}

export interface QueryColumn {
  fieldName: string;
  displayName: string;
  fieldType: 'DIM' | 'MSR' | 'DATE';
  columnFormat: ColumnFormat;
}
```

---

## 6. API 계층

### 6.1 apiClient 설정

```typescript
// 각 api 파일 공통 헤더
import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';

const apiClient = new ApiClient({ serviceURL: '/bff' });
```

### 6.2 reportApi.ts

```typescript
// apps/insight/src/app/features/report/api/reportApi.ts
export const reportApi = {
  getList: async (params?: Record<string, unknown>): Promise<ReportListItem[]> => {
    const res = await apiClient.get<ListResponse<ReportListItem>>('/insight-statistics-report-list', { params });
    return extractList(res);
  },

  getDetail: async (params: { reportId: number }): Promise<ReportDetail> => {
    const res = await apiClient.get<DetailResponse<ReportDetail>>('/insight-statistics-report-detail', { params });
    return extractDetail(res);
  },

  create: async (data: ReportCreateDatas) => {
    return apiClient.post('/insight-statistics-report-create', data);
  },

  update: async ({ params, data }: { params: { reportId: number }; data: ReportUpdateDatas }) => {
    return apiClient.put('/insight-statistics-report-update', data, { params });
  },

  delete: async (params: { reportId: number }) => {
    return apiClient.delete('/insight-statistics-report-delete', { params });
  },

  publishOn: async (data: PublishRequest) => {
    return apiClient.post('/insight-statistics-publish-on', data);
  },

  publishOff: async (params: { reportId: number }) => {
    return apiClient.delete('/insight-statistics-publish-off', { params });
  },
};

// 발행 요청 타입
export interface PublishRequest {
  reportId: number;
  menuName: string;
  menuParentId: number;
  permissionGroupIds: number[];
}
```

### 6.3 datasetApi.ts

```typescript
// apps/insight/src/app/features/dataset/api/datasetApi.ts
export const datasetApi = {
  // 데이터소스 목록 (위저드 §2-A)
  getDataSourceList: async (params?: Record<string, unknown>): Promise<DataSource[]> => {
    const res = await apiClient.get<ListResponse<DataSource>>('/insight-statistics-datasource-list', { params });
    return extractList(res);
  },

  // 데이터소스 필드 (위저드 §2-A 선택 후)
  getDataSourceFields: async (params: { viewKey: string }): Promise<DataSourceField[]> => {
    const res = await apiClient.get<ListResponse<DataSourceField>>('/insight-statistics-datasource-fields', { params });
    return extractList(res);
  },

  // 필드 표시 설정 업데이트 (§2-B 인라인 저장)
  updateFieldDisplay: async (data: { reportId: number; displays: FieldDisplay[] }) => {
    return apiClient.put('/insight-statistics-field-display-update', data);
  },

  // 계산 필드 CRUD
  getCalcFieldList: async (params: { reportId: number }): Promise<CalcField[]> => {
    const res = await apiClient.get<ListResponse<CalcField>>('/insight-statistics-calc-field-list', { params });
    return extractList(res);
  },

  createCalcField: async (data: { reportId: number } & CalcFieldCreateDatas) => {
    return apiClient.post('/insight-statistics-calc-field-create', data);
  },

  updateCalcField: async ({ params, data }: { params: { calcFieldId: number }; data: CalcFieldUpdateDatas }) => {
    return apiClient.put('/insight-statistics-calc-field-update', data, { params });
  },

  deleteCalcField: async (params: { calcFieldId: number }) => {
    return apiClient.delete('/insight-statistics-calc-field-delete', { params });
  },

  // 검색 바인딩 CRUD
  getSearchBindingList: async (params: { reportId: number }): Promise<SearchBinding[]> => {
    const res = await apiClient.get<ListResponse<SearchBinding>>('/insight-statistics-search-binding-list', { params });
    return extractList(res);
  },

  createSearchBinding: async (data: { reportId: number; conditionId: number; bindFieldName: string }) => {
    return apiClient.post('/insight-statistics-search-binding-create', data);
  },

  deleteSearchBinding: async (params: { bindingId: number }) => {
    return apiClient.delete('/insight-statistics-search-binding-delete', { params });
  },
};
```

### 6.4 panelApi.ts

```typescript
// apps/insight/src/app/features/panel/api/panelApi.ts
export const panelApi = {
  getList: async (params: { reportId: number }): Promise<Panel[]> => {
    const res = await apiClient.get<ListResponse<Panel>>('/insight-statistics-panel-list', { params });
    return extractList(res);
  },

  create: async (data: { reportId: number } & PanelCreateDatas) => {
    return apiClient.post<DetailResponse<Panel>>('/insight-statistics-panel-create', data);
  },

  update: async ({ params, data }: { params: { panelId: number }; data: Partial<PanelCreateDatas> }) => {
    return apiClient.put('/insight-statistics-panel-update', data, { params });
  },

  delete: async (params: { panelId: number }) => {
    return apiClient.delete('/insight-statistics-panel-delete', { params });
  },

  // 드래그 후 레이아웃 일괄 저장
  updateLayout: async (data: { reportId: number; layouts: PanelLayoutUpdateItem[] }) => {
    return apiClient.put('/insight-statistics-panel-layout-update', data);
  },

  // 데이터 조회 (패널별)
  executeQuery: async (data: QueryRequest): Promise<QueryResult> => {
    const res = await apiClient.post<DetailResponse<QueryResult>>('/insight-statistics-query-execute', data);
    return extractDetail(res);
  },
};
```

### 6.5 searchConditionApi.ts

```typescript
// apps/insight/src/app/features/search-condition/api/searchConditionApi.ts
export const searchConditionApi = {
  getList: async (params?: Record<string, unknown>): Promise<SearchCondition[]> => {
    const res = await apiClient.get<ListResponse<SearchCondition>>('/insight-statistics-search-condition-list', { params });
    return extractList(res);
  },

  getDetail: async (params: { conditionId: number }): Promise<SearchCondition> => {
    const res = await apiClient.get<DetailResponse<SearchCondition>>('/insight-statistics-search-condition-detail', { params });
    return extractDetail(res);
  },

  create: async (data: SearchConditionCreateDatas) => {
    return apiClient.post('/insight-statistics-search-condition-create', data);
  },

  update: async ({ params, data }: { params: { conditionId: number }; data: SearchConditionUpdateDatas }) => {
    return apiClient.put('/insight-statistics-search-condition-update', data, { params });
  },

  delete: async (params: { conditionId: number }) => {
    return apiClient.delete('/insight-statistics-search-condition-delete', { params });
  },

  preview: async (data: SearchConditionPreviewRequest): Promise<SearchConditionPreviewResult> => {
    const res = await apiClient.post<DetailResponse<SearchConditionPreviewResult>>('/insight-statistics-search-condition-preview', data);
    return extractDetail(res);
  },
};
```

### 6.6 사용자 개인화 API

```typescript
// reportApi.ts에 추가
userFilterGet: async (params: { reportId: number }): Promise<GlobalFilter> => {
  const res = await apiClient.get<DetailResponse<GlobalFilter>>('/insight-statistics-user-filter-get', { params });
  return extractDetail(res);
},

userFilterSave: async (data: { reportId: number } & GlobalFilter) => {
  return apiClient.put('/insight-statistics-user-filter-save', data);
},

userLayoutGet: async (params: { reportId: number }): Promise<PanelLayoutUpdateItem[]> => {
  const res = await apiClient.get<ListResponse<PanelLayoutUpdateItem>>('/insight-statistics-user-layout-get', { params });
  return extractList(res);
},

userLayoutSave: async (data: { reportId: number; layouts: PanelLayoutUpdateItem[] }) => {
  return apiClient.put('/insight-statistics-user-layout-save', data);
},
```

### 6.7 BFF Flow ID 전체 목록

| Flow ID | 메서드 | 용도 |
|---------|--------|------|
| `insight-statistics-report-list` | GET | 보고서 목록 |
| `insight-statistics-report-create` | POST | 보고서 생성 |
| `insight-statistics-report-detail` | GET | 보고서 상세 (패널+데이터셋+전체) |
| `insight-statistics-report-update` | PUT | 보고서 메타 수정 |
| `insight-statistics-report-delete` | DELETE | 보고서 삭제 |
| `insight-statistics-panel-list` | GET | 보고서 내 패널 목록 |
| `insight-statistics-panel-create` | POST | 패널 추가 |
| `insight-statistics-panel-update` | PUT | 패널 수정 |
| `insight-statistics-panel-delete` | DELETE | 패널 삭제 |
| `insight-statistics-panel-layout-update` | PUT | 드래그 후 레이아웃 일괄 저장 |
| `insight-statistics-calc-field-list` | GET | 계산 필드 목록 |
| `insight-statistics-calc-field-create` | POST | 계산 필드 생성 |
| `insight-statistics-calc-field-update` | PUT | 계산 필드 수정 |
| `insight-statistics-calc-field-delete` | DELETE | 계산 필드 삭제 |
| `insight-statistics-search-binding-list` | GET | 검색 조건 바인딩 목록 |
| `insight-statistics-search-binding-create` | POST | 바인딩 추가 |
| `insight-statistics-search-binding-delete` | DELETE | 바인딩 삭제 |
| `insight-statistics-field-display-update` | PUT | 필드 표시 설정 저장 |
| `insight-statistics-query-execute` | POST | 패널 데이터 조회 |
| `insight-statistics-search-condition-list` | GET | 검색 조건 카탈로그 |
| `insight-statistics-search-condition-detail` | GET | 검색 조건 상세 |
| `insight-statistics-search-condition-create` | POST | 검색 조건 생성 |
| `insight-statistics-search-condition-update` | PUT | 검색 조건 수정 |
| `insight-statistics-search-condition-delete` | DELETE | 검색 조건 삭제 |
| `insight-statistics-search-condition-preview` | POST | SQL 실행 미리보기 |
| `insight-statistics-datasource-list` | GET | 데이터소스(뷰) 카탈로그 |
| `insight-statistics-datasource-fields` | GET | 데이터소스 필드 목록 |
| `insight-statistics-publish-on` | POST | 메뉴 등록 |
| `insight-statistics-publish-off` | DELETE | 메뉴 해제 |
| `insight-statistics-user-filter-get` | GET | 사용자 저장 필터 조회 |
| `insight-statistics-user-filter-save` | PUT | 사용자 필터 저장 |
| `insight-statistics-user-layout-get` | GET | 사용자 레이아웃 조회 |
| `insight-statistics-user-layout-save` | PUT | 사용자 레이아웃 저장 |

---

## 7. 상태 관리 (Zustand)

### 7.1 useReportEditorStore

편집 모드(`/insight/statistics/reports/:id/edit`)에서 전체 보고서 상태를 보관한다.

```typescript
// apps/insight/src/app/stores/useReportEditorStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ReportDetail, Panel, CalcField, SearchBinding, FieldDisplay } from '../features/report/types';
import type { PanelLayoutUpdateItem } from '../features/panel/types';

interface ReportEditorState {
  // ─── 상태 ───
  report: ReportDetail | null;
  panels: Panel[];
  calcFields: CalcField[];
  searchBindings: SearchBinding[];
  fieldDisplays: FieldDisplay[];
  isDirty: boolean;

  // ─── 액션 ───
  setReport: (report: ReportDetail) => void;
  clearReport: () => void;

  addPanel: (panel: Panel) => void;
  updatePanel: (panelId: number, data: Partial<Panel>) => void;
  removePanel: (panelId: number) => void;
  applyLayouts: (layouts: PanelLayoutUpdateItem[]) => void;

  setFieldDisplays: (displays: FieldDisplay[]) => void;

  addCalcField: (cf: CalcField) => void;
  updateCalcField: (calcFieldId: number, data: Partial<CalcField>) => void;
  removeCalcField: (calcFieldId: number) => void;

  setSearchBindings: (bindings: SearchBinding[]) => void;

  setDirty: (dirty: boolean) => void;
}

export const useReportEditorStore = create<ReportEditorState>()(
  devtools(
    (set) => ({
      report: null,
      panels: [],
      calcFields: [],
      searchBindings: [],
      fieldDisplays: [],
      isDirty: false,

      setReport: (report) =>
        set(
          {
            report,
            panels: report.panels,
            calcFields: report.calcFields,
            searchBindings: report.searchBindings,
            fieldDisplays: report.fieldDisplays,
            isDirty: false,
          },
          false,
          'setReport'
        ),

      clearReport: () =>
        set(
          { report: null, panels: [], calcFields: [], searchBindings: [], fieldDisplays: [], isDirty: false },
          false,
          'clearReport'
        ),

      addPanel: (panel) =>
        set((s) => ({ panels: [...s.panels, panel], isDirty: true }), false, 'addPanel'),

      updatePanel: (panelId, data) =>
        set(
          (s) => ({ panels: s.panels.map((p) => (p.panelId === panelId ? { ...p, ...data } : p)), isDirty: true }),
          false,
          'updatePanel'
        ),

      removePanel: (panelId) =>
        set((s) => ({ panels: s.panels.filter((p) => p.panelId !== panelId), isDirty: true }), false, 'removePanel'),

      applyLayouts: (layouts) =>
        set(
          (s) => ({
            panels: s.panels.map((p) => {
              const l = layouts.find((x) => x.panelId === p.panelId);
              return l ? { ...p, gridX: l.gridX, gridY: l.gridY, gridW: l.gridW, gridH: l.gridH } : p;
            }),
          }),
          false,
          'applyLayouts'
        ),

      setFieldDisplays: (displays) =>
        set({ fieldDisplays: displays, isDirty: true }, false, 'setFieldDisplays'),

      addCalcField: (cf) =>
        set((s) => ({ calcFields: [...s.calcFields, cf], isDirty: true }), false, 'addCalcField'),

      updateCalcField: (calcFieldId, data) =>
        set(
          (s) => ({
            calcFields: s.calcFields.map((c) => (c.calcFieldId === calcFieldId ? { ...c, ...data } : c)),
            isDirty: true,
          }),
          false,
          'updateCalcField'
        ),

      removeCalcField: (calcFieldId) =>
        set(
          (s) => ({ calcFields: s.calcFields.filter((c) => c.calcFieldId !== calcFieldId), isDirty: true }),
          false,
          'removeCalcField'
        ),

      setSearchBindings: (bindings) =>
        set({ searchBindings: bindings }, false, 'setSearchBindings'),

      setDirty: (dirty) => set({ isDirty: dirty }, false, 'setDirty'),
    }),
    { name: 'ReportEditorStore' }
  )
);
```

### 7.2 useReportViewStore

뷰 모드(`/insight/statistics/reports/:id/view`)의 글로벌 필터 상태를 보관한다.

```typescript
// apps/insight/src/app/stores/useReportViewStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { GlobalFilter, TimeUnit, ComparisonType } from '../features/panel/types';
import dayjs from 'dayjs';

interface ReportViewState {
  globalFilter: GlobalFilter;
  hasQueried: boolean;

  setGlobalFilter: (filter: Partial<GlobalFilter>) => void;
  setTimeUnit: (unit: TimeUnit) => void;
  setComparison: (comparison: ComparisonType | null) => void;
  setPeriod: (from: string, to: string) => void;
  setSearchValue: (key: string, value: unknown) => void;
  setHasQueried: (v: boolean) => void;
  resetFilter: () => void;
}

const DEFAULT_FILTER: GlobalFilter = {
  period: {
    from: dayjs().subtract(29, 'day').format('YYYY-MM-DD'),
    to:   dayjs().format('YYYY-MM-DD'),
  },
  timeUnit: 'DAILY',
  searchValues: {},
  comparison: null,
};

export const useReportViewStore = create<ReportViewState>()(
  devtools(
    (set) => ({
      globalFilter: DEFAULT_FILTER,
      hasQueried: false,

      setGlobalFilter: (filter) =>
        set((s) => ({ globalFilter: { ...s.globalFilter, ...filter } }), false, 'setGlobalFilter'),

      setTimeUnit: (unit) =>
        set((s) => ({ globalFilter: { ...s.globalFilter, timeUnit: unit } }), false, 'setTimeUnit'),

      setComparison: (comparison) =>
        set((s) => ({ globalFilter: { ...s.globalFilter, comparison } }), false, 'setComparison'),

      setPeriod: (from, to) =>
        set((s) => ({ globalFilter: { ...s.globalFilter, period: { from, to } } }), false, 'setPeriod'),

      setSearchValue: (key, value) =>
        set(
          (s) => ({ globalFilter: { ...s.globalFilter, searchValues: { ...s.globalFilter.searchValues, [key]: value } } }),
          false,
          'setSearchValue'
        ),

      setHasQueried: (v) => set({ hasQueried: v }, false, 'setHasQueried'),

      resetFilter: () => set({ globalFilter: DEFAULT_FILTER, hasQueried: false }, false, 'resetFilter'),
    }),
    { name: 'ReportViewStore' }
  )
);
```

### 7.3 useSearchConditionStore

검색 조건 카탈로그 페이지 UI 상태 (선택된 항목, 필터).

```typescript
// apps/insight/src/app/stores/useSearchConditionStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface SearchConditionStoreState {
  selectedConditionId: number | null;
  groupFilter: string;
  searchText: string;
  isEditorOpen: boolean;

  setSelectedConditionId: (id: number | null) => void;
  setGroupFilter: (group: string) => void;
  setSearchText: (text: string) => void;
  setEditorOpen: (open: boolean) => void;
}

export const useSearchConditionStore = create<SearchConditionStoreState>()(
  devtools(
    (set) => ({
      selectedConditionId: null,
      groupFilter: '',
      searchText: '',
      isEditorOpen: false,

      setSelectedConditionId: (id) => set({ selectedConditionId: id }, false, 'setSelectedConditionId'),
      setGroupFilter: (group) => set({ groupFilter: group }, false, 'setGroupFilter'),
      setSearchText: (text) => set({ searchText: text }, false, 'setSearchText'),
      setEditorOpen: (open) => set({ isEditorOpen: open }, false, 'setEditorOpen'),
    }),
    { name: 'SearchConditionStore' }
  )
);
```

---

## 8. 컴포넌트별 상세 설계

### 8.1 페이지 컴포넌트

#### SearchConditionCatalogPage (§1)

**목적**: 관리자 전용. 검색 조건 카탈로그 열람 및 에디터 진입.

```typescript
interface SearchConditionCatalogPageProps {} // no props (page)

// 레이아웃:
// - 외곽: flex flex-col gap-4 w-full h-full
// - 흰색 래퍼: flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5
// - header: 좌측 (그룹 Select + 검색 Input) / 우측 (+ 신규 버튼)
// - 그리드: useAggridOptions + ColDef<SearchCondition>[]
// - 더블클릭 → SearchConditionEditor 사이드시트 open(conditionId)

// 컬럼 정의
const columnDefs: ColDef<SearchCondition>[] = [
  { field: 'conditionKey', headerName: 'KEY', width: 200, cellClass: 'font-mono text-xs' },
  { field: 'displayName', headerName: '표시명', flex: 1 },
  { field: 'groupLabel', headerName: '그룹', width: 120 },
  {
    field: 'nodes',
    headerName: 'INPUT TYPE',
    width: 160,
    // 루트 노드(D0)의 inputType을 Chip으로 표시
    cellRenderer: ({ value }: { value: SearchConditionNode[] }) => {
      const root = value?.find((n) => n.nodeLevel === 0);
      return root ? <InputTypeChip type={root.inputType} /> : '-';
    },
  },
  { field: 'sqlPreview', headerName: 'SQL 미리보기', flex: 2, cellClass: 'text-xs text-muted truncate' },
  { field: 'panelUsageCount', headerName: '사용 패널', width: 100, type: 'numericColumn' },
];
```

#### ReportListPage (§2)

**목적**: 보고서 카드 그리드. 생성, 열기, 삭제.

```typescript
// 필터: ownership Toggle (전체/내 보고서), domain Select, 검색 Input
// 카드 그리드: grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4
// 우하단 고정: "+ 새 보고서" FAB 또는 header 버튼 → /insight/statistics/reports/new 이동
// 카드 ⋮ 메뉴: 편집(→ /edit), 보기(→ /view), 삭제
// 카드 더블클릭 → /view
```

#### ReportWizardPage (§2-A·B·C)

**목적**: 보고서 생성 3단계 위저드.

```typescript
// Step 1 (§2-A): 도메인 Select → 뷰(데이터소스) RadioGroup → 제목+설명 Input
//   경고 배너: "뷰는 생성 후 변경할 수 없습니다."
//
// Step 2 (§2-B):
//   상단: DatasetFieldTable (AG-Grid 인라인 편집)
//   하단 좌: CalcField 목록 + + 추가 버튼 → CalcFieldEditor 모달(§2-C)
//   하단 우: SearchBinding 목록 + + 카탈로그에서 추가 버튼
//
// Step 3: 확인 요약 + 생성 완료 버튼
//   성공 시 → /insight/statistics/reports/:id/edit 으로 이동

interface WizardFormValues {
  domain: string;
  viewKey: string;
  title: string;
  description?: string;
}
```

#### ReportEditorPage (§3~§6+§8)

**목적**: 보고서 편집. 패널 추가·배치·편집·삭제. 발행 관리.

```typescript
// 레이아웃:
// ┌─────────────────────────────────────────┐
// │  Header (타이틀, isDirty 배지, 저장, 발행 버튼)  │
// ├─────────────────────────────────────────┤
// │  GlobalFilter 바 (§6)                    │
// ├─────────────────────────────────────────┤
// │  CanvasLayout (§3/§5) — react-grid-layout │
// │    PanelWrapper × N                     │
// └─────────────────────────────────────────┘
// 우측: PanelEditorSheet (§4) — fixed position overlay

// 마운트 시: useGetReportDetail → useReportEditorStore.setReport()
// unmount 시: useReportEditorStore.clearReport()

// 패널 0개: EmptyCanvas (§3) — 중앙에 패널 타입 선택 6종
// 패널 1개 이상: CanvasLayout + PanelWrapper들
```

#### ReportViewPage (§7·§7-B·§9)

**목적**: 최종 사용자 뷰 모드. 편집 컨트롤 없음.

```typescript
// 레이아웃:
// ┌─────────────────────────────────────────────────────┐
// │  Header: 타이틀, 데이터 정보, ☆/새로고침/엑셀/PDF/공유 버튼 │
// ├─────────────────────────────────────────────────────┤
// │  KPI 카드 Row (KPI 패널만 상단 고정)                     │
// ├─────────────────────────────────────────────────────┤
// │  GlobalFilter 바 (읽기 전용 + [조회] 버튼)               │
// ├─────────────────────────────────────────────────────┤
// │  CanvasLayout (readonly — 드래그 비활성)               │
// └─────────────────────────────────────────────────────┘
// 비교 ON(§7-B): 패널별 D121 렌더 규칙 적용
```

---

### 8.2 feature 컴포넌트

#### ReportCard.tsx

```typescript
interface ReportCardProps {
  report: ReportListItem;
  onOpen: () => void;         // 보기 모드로 이동
  onEdit: () => void;         // 편집 모드로 이동
  onDelete: () => void;
}

// 카드 내부:
// - domain Chip (IE/IC/IR/FCA/AI/COMMON, 색상별 구분)
// - isPublished 여부: "메뉴 등록" (초록) / "내 보고서" (회색) Badge
// - 제목, 마지막 수정자, 수정일
// - ⋮ 드롭다운 메뉴 (편집/보기/삭제)
// - 더블클릭 → onOpen()
```

#### PublishDialog.tsx

```typescript
interface PublishDialogProps {
  reportId: number;
  isPublished: boolean;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// 내용:
// - 메뉴 위치 트리 선택기 (부모 메뉴 트리)
// - 메뉴명 Input
// - 권한 그룹 Checkbox 목록
// - "경계 발행 주의사항" 경고 배너
// - [발행] / [발행 해제] 버튼
```

#### CalcFieldEditor.tsx (§2-C)

```typescript
interface CalcFieldEditorProps {
  reportId: number;
  editTarget?: CalcField;   // undefined면 생성 모드
  availableFields: FieldDisplay[];  // 토큰 팔레트에 표시할 필드들
  open: boolean;
  onClose: () => void;
  onSaved: (cf: CalcField) => void;
}

// 내부:
// - fieldCode Input (코드 검증: /^[A-Z_][A-Z0-9_]*$/)
// - displayName Input
// - columnFormat Select
// - kpiDirection Select (HIGHER_BETTER / LOWER_BETTER / NEUTRAL)
// - rowExpression: 토큰 빌더 영역
//   - 상단: 필드 토큰 팔레트 (DIM/MSR/CalcField 탭)
//   - 중단: 함수 토큰 팔레트 (SUM, AVG, MAX, MIN, COUNT, ROUND, IF, ...)
//   - 하단: 식 입력 Textarea (토큰 클릭/드래그 시 커서 위치에 삽입)
// - aggExpression: 푸터용 집계식 별도 입력
//   - 예: SUM(A) / SUM(B) 패턴
// - [미리보기]: 상위 5행 데이터로 rowExpression 실행 결과 테이블
```

#### SearchConditionEditor.tsx (§1-A)

```typescript
interface SearchConditionEditorProps {
  conditionId?: number;    // undefined면 신규 생성
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// 레이아웃: 좌 280px 노드 트리 + 우 나머지 편집 영역
//
// 좌측 노드 트리:
//   - D0 (루트 노드) 항상 존재
//   - D0 클릭 → 우측에 D0 편집
//   - D0에 + 버튼 → D1 자식 노드 추가
//   - 자식 노드 클릭 → 우측에 해당 노드 편집
//
// 우측 편집 영역:
//   - inputType Select (4종)
//   - sqlQuery Textarea (SQL 에디터, 최소 8행)
//   - [검증] 버튼: searchConditionApi.preview({ sqlQuery }) 호출
//     - 성공 시: isValidated=true, 성공 배지 표시
//     - 실패 시: errorMessage 표시 (빨간 배경)
//   - [미리보기] 버튼: 실제 렌더된 UI 컴포넌트 표시 (inputType별)
//     - SELECT: AntD Select with options
//     - MULTI_SELECT: AntD Select mode="multiple" with options
//     - TREE_MULTI_SELECT: AntD TreeSelect
//     - RADIO: AntD Radio.Group
//
// 저장 조건: 모든 노드의 isValidated=true 필수
```

#### GlobalFilter.tsx (§6)

```typescript
interface GlobalFilterProps {
  mode: 'edit' | 'view';   // edit: 조회 버튼 없음(자동), view: [조회] 버튼 있음
  searchBindings: SearchBinding[];
  onQuery?: () => void;    // view 모드에서 [조회] 클릭 시
}

// 구성:
// 1. 기간 선택: DateRangePicker (Ant Design RangePicker, YYYY-MM-DD)
//    + 빠른 선택: 오늘, 어제, 최근 7일, 최근 30일, 이번 달
// 2. TimeUnitToggle: 5종 토글 버튼
// 3. searchBindings에 따른 동적 검색 조건 입력 UI
//    - inputType별 컴포넌트 렌더 (SELECT/MULTI_SELECT/TREE_MULTI_SELECT/RADIO)
//    - 케스케이드: 부모 값 변경 시 자식 옵션 자동 갱신
// 4. ComparisonToggle: Switch + 비교 타입 Select
//    - D120 매트릭스에 따라 일부 옵션 비활성
// 5. [조회] 버튼 (view 모드만)
```

#### TimeUnitToggle.tsx

```typescript
interface TimeUnitToggleProps {
  value: TimeUnit;
  onChange: (unit: TimeUnit) => void;
}

// 5개 버튼: 10분 | 시 | 일 | 월 | 년
// 선택된 것: bg-bt-primary text-white
// 단위 변경 시 → 비교 옵션 유효성 재검증 (D120)
```

#### ComparisonToggle.tsx

```typescript
interface ComparisonToggleProps {
  timeUnit: TimeUnit;
  value: ComparisonType | null;
  onChange: (comparison: ComparisonType | null) => void;
}

// Switch (비교 ON/OFF) + Select (비교 타입)
// D120 매트릭스에 따라 비활성화된 옵션은 disabled
// timeUnit 변경으로 현재 선택된 비교가 비활성화되면 → null로 자동 리셋
```

#### CanvasLayout.tsx (§5)

```typescript
interface CanvasLayoutProps {
  panels: Panel[];
  mode: 'edit' | 'view';
  onLayoutChange?: (layouts: PanelLayoutUpdateItem[]) => void;  // 드래그 완료 시
  onPanelEdit?: (panelId: number) => void;
  onPanelDelete?: (panelId: number) => void;
  globalFilter: GlobalFilter;
  hasQueried: boolean;
}

// react-grid-layout 설정:
//   - cols: 12
//   - rowHeight: 60 (단위: px)
//   - isDraggable: mode === 'edit'
//   - isResizable: mode === 'edit'
//   - onLayoutChange: Layout[] → PanelLayoutUpdateItem[] 변환 → props.onLayoutChange
// 배경: CANVAS_STYLE (격자 패턴)
// 패널 없을 때: EmptyCanvas 컴포넌트 (§3 - 패널 타입 6종 선택 버튼)
```

#### PanelWrapper.tsx

```typescript
interface PanelWrapperProps {
  panel: Panel;
  mode: 'edit' | 'view';
  globalFilter: GlobalFilter;
  hasQueried: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

// 패널 헤더 (edit 모드만):
//   - 타이틀, 패널 타입 Chip, 좌표 뱃지 (12W×4H)
//   - [🔍 검색 바인딩] [⚙ 편집] [× 삭제] 아이콘 버튼
// 패널 컨텐츠:
//   - hasQueried=false: "조회 버튼을 눌러 데이터를 불러오세요" 안내
//   - hasQueried=true: panelType에 따라 PanelGrid / PanelBarChart / ... 렌더
//   - 데이터 로딩 중: Skeleton 또는 Spinner
// 데이터 패칭:
//   - hasQueried가 true가 되는 순간 panelApi.executeQuery 호출
//   - globalFilter 변경 후 조회 버튼 클릭 시 refetch
```

#### PanelEditorSheet.tsx (§4)

```typescript
interface PanelEditorSheetProps {
  reportId: number;
  panelId?: number;        // undefined면 신규 생성
  panelType?: PanelType;  // 신규 생성 시 필수
  fieldDisplays: FieldDisplay[];
  calcFields: CalcField[];
  open: boolean;
  onClose: () => void;
  onSaved: (panel: Panel) => void;
}

// 3단계 내부 스텝:
// Step 1 - 필드 매핑:
//   - 좌: 데이터셋 필드 팔레트 (DIM탭/MSR탭/계산필드탭)
//   - 우: 슬롯 드롭존 (panelType에 따라 슬롯 다름)
//     슬롯별 허용 fieldType 표시 + validation
//   - Sort 슬롯: 방향 ASC/DESC 선택 포함
//   - Limit 슬롯: 숫자 InputNumber
//
// Step 2 - 옵션 (D119):
//   - showDataLabel Toggle
//   - showLegend Toggle
//   - BAR/LINE: direction (VERTICAL/HORIZONTAL)
//   - BAR: barStyle (GROUPED/STACKED)
//   - PIE: isDonut Toggle
//   - BAR/LINE: goalLine 설정 (값, 라벨, 색상)
//
// Step 3 - 미리보기:
//   - panelApi.executeQuery 실행 (더미 globalFilter)
//   - 실제 패널 컴포넌트 렌더 (미니 버전)
//
// 슬롯 × 패널 타입 매핑:
// GRID:  ROW(복수), COLUMN(복수), SORT, LIMIT
// BAR:   X_AXIS(1), Y_AXIS(복수), SERIES(0~1), SORT, LIMIT
// LINE:  X_AXIS(1, DATE만), Y_AXIS(복수), SERIES(0~1)
// PIE:   SLICE(1), VALUE(1), LIMIT
// RADAR: AXIS(3+), SERIES(0~1)
// KPI:   VALUE(1)
```

---

## 9. AG-Grid 사용 가이드

### 9.1 DatasetFieldTable (§2-B)

인라인 편집이 가능한 필드 설정 테이블. ClientSide 모델.

```typescript
// apps/insight/src/app/features/dataset/components/DatasetFieldTable.tsx

interface DatasetFieldTableProps {
  fieldDisplays: FieldDisplay[];
  onChange: (updated: FieldDisplay[]) => void;
}

// useAggridOptions 훅으로 공통 옵션 적용
const { aggridOptions } = useAggridOptions();

const columnDefs: ColDef<FieldDisplay>[] = [
  {
    field: 'isVisible',
    headerName: '표시',
    width: 70,
    cellRenderer: 'agCheckboxCellRenderer',
    cellEditor: 'agCheckboxCellEditor',
    editable: true,
  },
  {
    field: 'fieldName',
    headerName: '필드명',
    width: 180,
    cellClass: 'font-mono text-xs',
    editable: false,
  },
  {
    field: 'fieldType',
    headerName: '타입',
    width: 110,
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: ['DIM', 'MSR'] },
    cellRenderer: ({ value }: { value: string }) =>
      value === 'DIM'
        ? <span className="rounded px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-semibold">DIM</span>
        : <span className="rounded px-1.5 py-0.5 bg-orange-50 text-orange-700 text-[11px] font-semibold">MSR</span>,
  },
  {
    field: 'columnFormat',
    headerName: '포맷',
    width: 130,
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: ['Number', 'Decimal', 'Rate', 'String', 'Date', 'Time'] },
  },
  {
    field: 'displayName',
    headerName: '표시명',
    flex: 1,
    editable: true,
  },
];

// onCellValueChanged 콜백으로 변경된 행을 props.onChange로 전달
// editType: 'fullRow' 금지 — 셀 단위 편집 유지
```

### 9.2 PanelGrid (§4 그리드 패널)

데이터 조회 결과를 보여주는 동적 컬럼 그리드. ClientSide 모델.

```typescript
// apps/insight/src/app/features/panel/components/grid/PanelGrid.tsx

interface PanelGridProps {
  queryResult: QueryResult;
  panel: Panel;
  comparison: ComparisonType | null;
}

// 1. 기본 컬럼 생성 (비교 OFF)
function buildColumnDefs(queryResult: QueryResult, panel: Panel): ColDef[] {
  return queryResult.columns.map((col) => {
    const fieldMap = panel.fieldMaps.find((f) => f.fieldName === col.fieldName);
    return {
      field: col.fieldName,
      headerName: col.displayName,
      type: col.fieldType === 'MSR' ? 'numericColumn' : undefined,
      valueFormatter: getValueFormatter(col.columnFormat),
      aggFunc: col.fieldType === 'MSR' ? getSumAggFunc(fieldMap) : undefined,
    };
  });
}

// 2. 비교 ON: 컬럼 그룹 (현재 / 비교 2레벨 헤더)
// PREV_MONTH 비교 예시:
// [날짜] [지표_현재 헤더그룹 { 현재 | 전월 }] ...
function buildComparisonColumnDefs(queryResult: QueryResult, panel: Panel): (ColDef | ColGroupDef)[] {
  const dimCols = queryResult.columns.filter((c) => c.fieldType === 'DIM' || c.fieldType === 'DATE');
  const msrCols = queryResult.columns.filter((c) => c.fieldType === 'MSR');

  return [
    // 차원 컬럼 (그룹 없음)
    ...dimCols.map((col) => ({
      field: col.fieldName,
      headerName: col.displayName,
      valueFormatter: getValueFormatter(col.columnFormat),
    })),
    // 지표 컬럼 그룹
    ...msrCols.map((col) => ({
      headerName: col.displayName,
      children: [
        { field: `current_${col.fieldName}`, headerName: '현재', type: 'numericColumn' },
        { field: `compare_${col.fieldName}`, headerName: '비교', type: 'numericColumn', cellClass: 'text-muted' },
      ],
    })),
  ];
}

// 3. rowData 구성 (비교 ON 시)
// queryResult.current + queryResult.compare를 merge:
// { ...currentRow, compare_<field>: compareRow[field] }

// 4. 푸터 합계 (D122)
// aggFunc: 일반 MSR → 'sum'
// 계산 필드 → aggExpression 파싱하여 커스텀 aggFunc 등록
// 예: aggExpression = "SUM(A) / SUM(B)" → 커스텀 aggFunc에서 params.values 순회

// 주요 그리드 props:
// rowData={mergedRowData}
// columnDefs={comparison ? buildComparisonColumnDefs(...) : buildColumnDefs(...)}
// groupIncludeTotalFooter={true}  ← 총합계 행 표시
// suppressAggFuncInHeader={true}
// animateRows={false}
```

### 9.3 SearchConditionCatalogPage 그리드 (§1)

관리자 전용 검색 조건 목록. ClientSide 모델.

```typescript
// 그리드 설정
const gridOptions = {
  rowSelection: { mode: 'singleRow' as const },
  onRowDoubleClicked: (e: RowDoubleClickedEvent<SearchCondition>) => {
    if (e.data) {
      setSelectedConditionId(e.data.conditionId);
      setEditorOpen(true);
    }
  },
};

// 좌측 카테고리 사이드바 (그룹 필터)
// groupFilter 변경 시 AG-Grid externalFilter 적용:
// isExternalFilterPresent: () => !!groupFilter
// doesExternalFilterPass: (node) => node.data?.groupKey === groupFilter
```

---

## 10. 차트 컴포넌트 가이드

### 10.1 공통 색상 팔레트

```typescript
// apps/insight/src/app/features/panel/components/chart/chartConstants.ts

export const CHART_COLORS = [
  '#085fb5', // bt-primary (첫 번째 시리즈)
  '#4892d3', // bt-primary-light
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
];

// 비교 데이터 (current vs compare)
export const COMPARE_COLOR_SUFFIX = '80'; // 투명도 50%
// current: CHART_COLORS[i], compare: CHART_COLORS[i] + COMPARE_COLOR_SUFFIX
// 또는 단일 회색: '#cdd2d9'
```

### 10.2 PanelBarChart

```typescript
interface PanelBarChartProps {
  data: QueryResult;
  panel: Panel;
  comparison: ComparisonType | null;
}

// 기본 구성 (Recharts):
// <ResponsiveContainer width="100%" height="100%">
//   <BarChart data={chartData}>
//     <XAxis dataKey={xField} />
//     <YAxis yAxisId="left" />
//     {needsRightAxis && <YAxis yAxisId="right" orientation="right" />}
//     <Tooltip />
//     {chartOptions.showLegend && <Legend />}
//     {chartOptions.goalLine && <ReferenceLine y={goalLine.value} label={goalLine.label} stroke={goalLine.color} />}
//     {yFields.map((f, i) => (
//       <Bar
//         key={f}
//         dataKey={f}
//         yAxisId={rightAxisFields.includes(f) ? 'right' : 'left'}
//         fill={CHART_COLORS[i]}
//         label={chartOptions.showDataLabel ? { position: 'top' } : false}
//       />
//     ))}
//     {/* 비교 ON: 각 지표마다 compare_ 버전 추가 */}
//     {comparison && yFields.map((f, i) => (
//       <Bar key={`compare_${f}`} dataKey={`compare_${f}`} fill="#cdd2d9" yAxisId="left" />
//     ))}
//   </BarChart>
// </ResponsiveContainer>

// 이중 축 판단 (D118):
// 같은 단위(format)가 아닌 지표가 2개 이상이면 → 자동 좌/우 Y축 분리
// 예: 건수(Number) + 비율(Rate) → 건수는 왼쪽, 비율은 오른쪽

// chartData 가공 (비교 ON 시):
// current[i]와 compare[i]를 같은 X값으로 merge
// { x: 'A', metric1: 100, compare_metric1: 90, metric2: 0.5, compare_metric2: 0.48 }
```

### 10.3 PanelLineChart

```typescript
interface PanelLineChartProps {
  data: QueryResult;
  panel: Panel;
  comparison: ComparisonType | null;
}

// LINE은 X축에 DATE 차원 필수 (D117)
// 비교 ON 시: 현재 데이터는 실선, 비교 데이터는 점선(strokeDasharray="5 5")으로 오버레이

// <LineChart data={chartData}>
//   {yFields.map((f, i) => (
//     <>
//       <Line key={f} dataKey={f} stroke={CHART_COLORS[i]} dot={false} />
//       {comparison && (
//         <Line
//           key={`compare_${f}`}
//           dataKey={`compare_${f}`}
//           stroke={CHART_COLORS[i]}
//           strokeDasharray="5 5"
//           dot={false}
//           opacity={0.6}
//         />
//       )}
//     </>
//   ))}
// </LineChart>

// X축 데이터 병합 (비교 ON):
// 현재 기간: '2025-01-01', 비교 기간: '2024-01-01'
// 같은 상대 위치(인덱스)에 두 값을 하나의 점으로 합쳐 표시
// → x축은 현재 기간 날짜 사용, compare_ 접두사로 비교값 병합
```

### 10.4 PanelPieChart

```typescript
interface PanelPieChartProps {
  data: QueryResult;
  panel: Panel;
  comparison: ComparisonType | null;
}

// PIE: 단일 지표, 시리즈 없음 (D117)
// 비교 ON (D121): 2개 도넛 나란히 (현재 | 비교)
// isDonut(D119): innerRadius=60% 적용

// 단일 (비교 OFF):
// <PieChart>
//   <Pie data={pieData} dataKey="value" nameKey="slice" innerRadius={isDonut ? '60%' : 0}>
//     {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
//   </Pie>
// </PieChart>

// 비교 ON:
// <div style={{ display: 'flex' }}>
//   <PieChart> {/* 현재 */} </PieChart>
//   <PieChart> {/* 비교 */} </PieChart>
// </div>

// Top N + 기타 그룹 (LIMIT 슬롯):
// limitCount 이하면 정상 표시, 초과분은 '기타'로 합산
```

### 10.5 PanelRadarChart

```typescript
interface PanelRadarChartProps {
  data: QueryResult;
  panel: Panel;
  comparison: ComparisonType | null;
}

// RADAR: 3개 이상 지표를 축으로 (D116)
// 비교 ON (D121): 2개 폴리곤 오버레이 (현재=실선+반투명 fill, 비교=점선+fill 없음)

// <RadarChart data={radarData}>
//   <PolarGrid />
//   <PolarAngleAxis dataKey="axis" />   // 지표명
//   <PolarRadiusAxis />
//   <Radar dataKey="current" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.3} />
//   {comparison && (
//     <Radar dataKey="compare" stroke="#cdd2d9" fill="transparent" strokeDasharray="5 5" />
//   )}
// </RadarChart>

// radarData 구조:
// [{ axis: '지표A', current: 100, compare: 90 }, ...]
// SERIES가 있으면 SERIES 차원별 RadarChart를 분리해서 렌더
```

### 10.6 PanelKpiCard

```typescript
interface PanelKpiCardProps {
  data: QueryResult;
  panel: Panel;
  comparison: ComparisonType | null;
}

// 가장 최신 행의 단일 지표 값 표시
// 비교 ON (D121):
//   - diff = current - compare
//   - diffRate = (diff / compare) * 100
//   - KpiDirection에 따라 chip 색상 결정:
//     HIGHER_BETTER: diff > 0 → 초록, diff < 0 → 빨강
//     LOWER_BETTER:  diff > 0 → 빨강, diff < 0 → 초록
//     NEUTRAL:       파란색 (방향 무관)

// UI:
// ┌────────────────────────────┐
// │  지표명           [chip +5.2%] │
// │  1,234,567                   │
// │  비교: 1,173,302             │
// └────────────────────────────┘

function getKpiChipColor(direction: KpiDirection, diff: number): string {
  if (direction === 'NEUTRAL') return 'blue';
  if (direction === 'HIGHER_BETTER') return diff >= 0 ? 'green' : 'red';
  return diff >= 0 ? 'red' : 'green'; // LOWER_BETTER
}
```

---

## 11. 시간 단위 × 비교 매트릭스 (D120)

### 11.1 매트릭스 상수

```typescript
// apps/insight/src/app/features/global-filter/types/index.ts

export const COMPARISON_AVAILABILITY: Record<TimeUnit, Record<ComparisonType, boolean>> = {
  '10MIN':   { PREV_DAY: true,  PREV_WEEK: true,  PREV_MONTH: true,  PREV_YEAR: true  },
  'HOURLY':  { PREV_DAY: true,  PREV_WEEK: true,  PREV_MONTH: true,  PREV_YEAR: true  },
  'DAILY':   { PREV_DAY: true,  PREV_WEEK: true,  PREV_MONTH: true,  PREV_YEAR: true  },
  'MONTHLY': { PREV_DAY: false, PREV_WEEK: false, PREV_MONTH: true,  PREV_YEAR: true  },
  'YEARLY':  { PREV_DAY: false, PREV_WEEK: false, PREV_MONTH: false, PREV_YEAR: true  },
};

export function isComparisonAvailable(timeUnit: TimeUnit, comparison: ComparisonType): boolean {
  return COMPARISON_AVAILABILITY[timeUnit][comparison];
}
```

### 11.2 ComparisonToggle 동작 규칙

```typescript
// ComparisonToggle.tsx 내 useEffect
useEffect(() => {
  if (value === null) return;
  if (!isComparisonAvailable(timeUnit, value)) {
    // 현재 선택된 비교가 새 시간 단위에서 지원되지 않으면 자동 해제
    onChange(null);
  }
}, [timeUnit]);

// Select 옵션 구성
const options = (Object.keys(COMPARISON_LABELS) as ComparisonType[]).map((type) => ({
  value: type,
  label: COMPARISON_LABELS[type],
  disabled: !isComparisonAvailable(timeUnit, type),
}));
```

### 11.3 UI 표시 규칙

- `MONTHLY` 선택 시: 전일/전주 옵션 회색(disabled) + 툴팁 "월 단위에서는 사용 불가"
- `YEARLY` 선택 시: 전일/전주/전월 옵션 회색(disabled)
- 비활성화된 옵션 위 hover → `Tooltip` 표시

---

## 12. 구현 단계 및 순서

### Phase 1: 기반 구조 (Foundation)

**목표**: 빌드 통과, 기존 코드 정리, 신규 타입·API·스토어 스캐폴딩

**작업 목록**:
1. 삭제 대상 파일·디렉토리 전체 제거
2. `apps/insight/src/app/router/` 디렉토리 생성, `pageVariantManifest.ts` · `querySelectors.ts` 이전 (내용 동일, 경로만 변경)
3. `module-federation.config.ts` expose 경로 업데이트
4. `apps/insight/src/app/stores/` 디렉토리 생성 및 3개 스토어 파일 작성
5. 모든 타입 파일 작성 (section 5 참조)
6. 모든 API 파일 작성 (section 6 참조)
7. 모든 query 훅 파일 작성 (useReportQueries, useDatasetQueries, usePanelQueries, useSearchConditionQueries)
8. `routes.tsx` 신규 라우트로 교체 (page 컴포넌트는 임시 placeholder)
9. `pages/` 각 디렉토리와 skeleton 페이지 컴포넌트 생성
10. `pnpm lint && tsc` 빌드 통과 확인

**예상 기간**: 2일

---

### Phase 2: §2 보고서 목록 + §2-A·B·C 생성 위저드

**목표**: 보고서 생성 플로우 전체 완성

**작업 목록**:
1. `ReportCard.tsx` 구현
2. `ReportListPage.tsx` 구현 (카드 그리드 + 필터 + 탐색)
3. `ReportWizardPage.tsx` 3단계 위저드 구현
   - Step 1 (§2-A): 도메인·뷰 선택 + 제목·설명
   - Step 2 (§2-B): `DatasetFieldTable` + `CalcFieldEditor` 모달 + `SearchConditionBinder`
   - Step 3: 확인 요약
4. `DatasetFieldTable.tsx` AG-Grid 인라인 편집 구현
5. `CalcFieldEditor.tsx` 토큰 빌더 모달 구현
6. `SearchConditionBinder.tsx` 카탈로그에서 바인딩 추가 UI
7. `useDatasetQueries.ts` 완성 (dataSource, calcField, searchBinding CRUD)
8. `useReportQueries.ts` 완성 (report CRUD)

**예상 기간**: 3일

---

### Phase 3: §3 빈 캔버스 + §4 패널 6종 + §5 다중 패널 캔버스

**목표**: 편집 캔버스 기능 완성

**작업 목록**:
1. `CanvasLayout.tsx` (react-grid-layout 통합)
2. `PanelWrapper.tsx` (헤더 + 컨텐츠 + 로딩)
3. `EmptyCanvas` (§3 패널 타입 선택 UI)
4. `PanelEditorSheet.tsx` 3단계 사이드시트
   - Step 1: 슬롯 드롭존 + 필드 팔레트
   - Step 2: 차트 옵션 (D119)
   - Step 3: 미리보기
5. `PanelGrid.tsx` 구현 (비교 모드 포함, 푸터 aggFunc)
6. `PanelBarChart.tsx` (이중 축 + 비교)
7. `PanelLineChart.tsx` (DATE X축 + 비교 점선)
8. `PanelPieChart.tsx` (도넛 + 비교 나란히)
9. `PanelRadarChart.tsx` (다각형 + 비교 오버레이)
10. `PanelKpiCard.tsx` (diff 칩)
11. `usePanelQueries.ts` 완성 (panel CRUD + executeQuery)
12. `useCanvasLayout.ts` 훅 (레이아웃 드래그 핸들러)
13. `ReportEditorPage.tsx` 전체 통합

**예상 기간**: 4일

---

### Phase 4: §6 글로벌 필터 + 검색 조건 바인딩 연동

**목표**: 조회 플로우 완성

**작업 목록**:
1. `GlobalFilter.tsx` 구현 (날짜 범위 + 빠른 선택)
2. `TimeUnitToggle.tsx`
3. `ComparisonToggle.tsx` (D120 매트릭스 적용)
4. 검색 조건 동적 UI (inputType별 Ant Design 컴포넌트)
5. 케스케이드 옵션 로딩 (`conditionApi.preview` 활용)
6. `useReportViewStore` 연동 (setGlobalFilter, setHasQueried)
7. 조회 버튼 클릭 → 모든 PanelWrapper 동시 refetch
8. 단위 변경 → ComparisonToggle 자동 리셋 연동

**예상 기간**: 2일

---

### Phase 5: §7·§7-B 뷰 모드 + 비교 렌더링

**목표**: 최종 사용자 뷰 모드 완성

**작업 목록**:
1. `ReportViewPage.tsx` 구현
   - Header (타이틀, 별표, 새로고침, 엑셀/PDF 내보내기, 공유 버튼)
   - KPI 카드 Row (KPI 패널 상단 고정)
   - GlobalFilter (view 모드, [조회] 버튼 포함)
   - CanvasLayout (readonly)
2. 엑셀 내보내기 (AG-Grid Enterprise `exportDataAsExcel`)
3. PDF 내보내기 (window.print() 또는 print-specific CSS)
4. 비교 ON(§7-B) D121 규칙 전체 검증
5. KPI diffChip 색상 로직 (D121, kpiDirection 기반)

**예상 기간**: 2일

---

### Phase 6: §1·§1-A 검색 조건 카탈로그 + §8 발행 + §9 개인화

**목표**: 관리자 기능 + 개인화 완성

**작업 목록**:
1. `SearchConditionCatalogPage.tsx` (AG-Grid + 카테고리 사이드바)
2. `SearchConditionEditor.tsx` (노드 트리 + SQL 편집 + 검증·미리보기)
3. `useSearchConditionQueries.ts` 완성
4. `PublishDialog.tsx` (메뉴 위치 트리 + 권한 그룹)
5. 발행 토글 → `reportApi.publishOn/publishOff` 연동
6. `useSearchConditionStore.ts` 연동
7. §9 개인화: 필터 기본값 저장/불러오기 (`userFilterGet/Save`)
8. 사용자 레이아웃 오버라이드 (`userLayoutGet/Save`)

**예상 기간**: 3일

---

## 13. 주의사항

### 13.1 react-grid-layout 설치 및 타입

```bash
pnpm add react-grid-layout
pnpm add -D @types/react-grid-layout
```

`CanvasLayout.tsx`에서 import 시 CSS도 함께 가져와야 함:
```typescript
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
```

`Layout` 타입의 `i` 필드는 `panelId.toString()`으로 설정. `onLayoutChange` 콜백의 `Layout[]`을 `PanelLayoutUpdateItem[]`으로 변환할 때 `parseInt(layout.i)` 사용.

### 13.2 뷰(데이터소스) 불변 원칙 (D113)

보고서 생성 시 선택한 `viewKey`는 **절대 수정 불가**. 위저드 Step 1에서 경고 배너를 필수로 표시하고, `ReportUpdateDatas` 타입에서 `viewKey` 필드를 의도적으로 제외하여 API 계층에서도 전송되지 않도록 설계함.

### 13.3 PanelGrid aggFunc 등록

AG-Grid Enterprise에서 커스텀 `aggFunc`를 패널별로 다르게 적용할 때, 동일한 함수명이 전역 등록(`gridApi.addAggFunc`)되므로 패널 ID를 접두사로 붙여 충돌 방지:

```typescript
// 등록
gridApi.addAggFunc(`panel_${panelId}_calc_${fieldCode}`, customAggFunc);

// ColDef에서
{ field: fieldCode, aggFunc: `panel_${panelId}_calc_${fieldCode}` }
```

### 13.4 LINE 패널 DATE 차원 검증 (D117)

`PanelEditorSheet` Step 1에서 LINE 패널의 X_AXIS 슬롯에 필드를 드롭할 때:
- `DataSourceField.fieldType === 'DATE'` 또는 `FieldDisplay.columnFormat === 'Date'`만 허용
- 아닌 경우 드롭 거부 + `toast.error('LINE 차트의 X축에는 날짜 차원만 허용됩니다.')`

### 13.5 비교 데이터 병합 (QueryResult)

백엔드는 `{ current: [...], compare: [...] }`로 반환. 프론트엔드에서 차트 라이브러리가 소화하는 형태로 변환:

```typescript
// 선 차트 / 막대 차트용 merge
function mergeCurrentAndCompare(result: QueryResult): Record<string, unknown>[] {
  return result.current.map((row, i) => {
    const compareRow = result.compare?.[i] ?? {};
    const compareEntries = Object.entries(compareRow).reduce(
      (acc, [k, v]) => ({ ...acc, [`compare_${k}`]: v }),
      {}
    );
    return { ...row, ...compareEntries };
  });
}
```

### 13.6 글로벌 필터 조회 트리거 패턴

`ReportViewPage` / `ReportEditorPage`에서 "조회" 버튼을 누를 때 모든 패널이 동시에 재조회되어야 한다. TanStack Query에서 이를 처리하는 방법:

```typescript
// ReportViewPage에서
const [queryVersion, setQueryVersion] = useState(0);

const handleQuery = () => {
  setQueryVersion((v) => v + 1);
  setHasQueried(true);
};

// PanelWrapper에 queryVersion 전달
// PanelWrapper 내부 useQuery의 queryKey에 queryVersion 포함
// → queryVersion 변경 시 자동 refetch
const { data } = useQuery({
  queryKey: panelQueryKeys.executeQuery({ reportId, panelId, globalFilter, queryVersion }).queryKey,
  queryFn: () => panelApi.executeQuery({ reportId, panelId, globalFilter }),
  enabled: hasQueried,
});
```

### 13.7 PanelEditorSheet 슬롯 드롭존 (드래그 없이 클릭 방식도 허용)

react-dnd 또는 @dnd-kit 설치가 필요하지만 복잡도가 높다. 대안으로 **클릭 방식 (2-panel select)**을 우선 구현:
1. 좌측 팔레트에서 필드 클릭 → 선택 상태로 표시
2. 우측 슬롯 클릭 → 선택된 필드를 해당 슬롯에 배치
3. 슬롯에서 × 클릭 → 필드 제거

드래그-드롭은 UX 개선 차원에서 추후 추가 가능.

### 13.8 ESLint 자동 수정

TypeScript / TSX 파일을 수정한 후 반드시 실행:
```bash
npx eslint --fix <파일경로>
```

React Compiler를 사용하므로 `useMemo`, `useCallback`을 명시적으로 추가하지 말 것.

### 13.9 react-grid-layout 드래그 후 레이아웃 저장

`onDragStop` / `onResizeStop` 이벤트에서 즉시 저장하면 과도한 API 호출이 발생한다. `onLayoutChange`를 사용하되 **debounce 1000ms** 적용 후 `panelApi.updateLayout` 호출:

```typescript
const debouncedSave = useMemo(
  () => debounce((layouts: PanelLayoutUpdateItem[]) => {
    updateLayoutMutation.mutate({ reportId, layouts });
  }, 1000),
  [reportId]
);
```

### 13.10 PIE 패널 단일 지표 제약 (D117)

`PanelEditorSheet` Step 1에서 PIE의 VALUE 슬롯은 필드 1개만 허용. 이미 1개가 설정된 상태에서 추가 시도 시 `toast.warning('파이 차트는 지표를 1개만 설정할 수 있습니다.')`

### 13.11 useReportEditorStore 마운트/언마운트

`ReportEditorPage` unmount 시 `clearReport()` 반드시 호출. 그렇지 않으면 다른 보고서 편집 시 이전 보고서 데이터가 잔존한다:

```typescript
useEffect(() => {
  loadReport();
  return () => clearReport();
}, [reportId]);
```

### 13.12 발행(Publish) 경계 주의사항 (D123)

발행은 **host 메뉴 시스템에 영향**을 준다(경계 발행). `PublishDialog`에서 반드시 경고 배너 표시:
> "메뉴에 등록하면 해당 권한을 가진 모든 사용자에게 노출됩니다. 발행 후 메뉴 구조 변경은 시스템 관리자에게 요청하세요."

발행 취소(`publishOff`)도 마찬가지로 경고 후 진행.

### 13.13 KPI 패널 뷰 모드 위치 고정 (§7)

`ReportViewPage`에서 `panelType === 'KPI'`인 패널은 캔버스에서 분리하여 **상단 Row에 고정** 표시. CanvasLayout에는 KPI가 아닌 패널만 전달:

```typescript
const kpiPanels = panels.filter((p) => p.panelType === 'KPI');
const canvasPanels = panels.filter((p) => p.panelType !== 'KPI');
```

---

*이 문서는 구현 진행에 따라 업데이트될 수 있습니다. 의사결정 변경 시 해당 섹션에 날짜와 함께 변경 이유를 기재하세요.*


│       화면        │                            URL                             │
├───────────────────┼────────────────────────────────────────────────────────────┤
│ 보고서 목록       │ http://localhost:4200/insight/statistics/reports           │
├───────────────────┼────────────────────────────────────────────────────────────┤
│ 새 보고서 생성    │ http://localhost:4200/insight/statistics/reports/new       │
├───────────────────┼────────────────────────────────────────────────────────────┤
│ 보고서 편집       │ http://localhost:4200/insight/statistics/reports/{id}/edit │
├───────────────────┼────────────────────────────────────────────────────────────┤
│ 보고서 뷰         │ http://localhost:4200/insight/statistics/reports/{id}/view │
├───────────────────┼────────────────────────────────────────────────────────────┤
│ 검색조건 카탈로그 │ http://localhost:4200/insight/statistics/search-conditions │
└───────────────────┴────────────────────────────────────────────────────────────┘
