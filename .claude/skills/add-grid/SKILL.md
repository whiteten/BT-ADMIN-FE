---
name: add-grid
description: AG-Grid Enterprise 테이블 추가 패턴. useAggridOptions 훅으로 공통 옵션 적용, ColDef 타입 파라미터로 row 타입 지정, 편집 가능 컬럼·커스텀 렌더러·액션 버튼 컬럼 구성, 커스텀 셀 에디터 작성법. 테이블 추가, 인라인 편집 UI 작성, 행별 액션 버튼 구성, 커스텀 셀 에디터 작성 시 사용.
---

# add-grid

이 저장소의 AG-Grid 테이블 작성 절차. "테이블 추가", "AG-Grid 넣어줘", "ColDef 작성", "셀 에디터 만들어줘" 등의 요청 시 이 절차를 따른다.

## 핵심 규칙

1. 공통 옵션은 반드시 **`useAggridOptions`** 훅으로 적용한다. 직접 `gridOptions`를 하드코딩하지 않는다.
2. `ColDef`는 **row 데이터 타입 파라미터**로 지정한다: `ColDef<RowType>[]`.
3. 테이블 컨테이너는 **`bg-white bt-shadow`** 로 감싼다 (UI 레이아웃 규칙).
4. 액션 컬럼은 `colId: 'actions'`로 식별하고 `sortable: false`, `filter: false`, `suppressHeaderMenuButton: true`.
5. 편집 가능 컬럼은 `editable: true` + `cellEditor` (커스텀 에디터 권장).

## 1. 기본 설정

```typescript
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const { gridOptions, sideBar } = useAggridOptions();

<AgGridReact
  rowData={data}
  columnDefs={columnDefs}
  getRowId={(params) => params.data.id}
  gridOptions={{
    ...gridOptions,
    // 필요 시 추가 옵션 오버라이드
    editType: 'fullRow',
    readOnlyEdit: true,
    suppressClickEdit: true,
  }}
  loading={isLoading}
  onGridReady={handleGridReady}
/>
```

- `getRowId`는 반드시 지정해 React 렌더 최적화 및 상태 추적을 확보한다.
- `loading` prop을 `isLoading`과 연결 (TanStack Query의 반환값).

## 2. ColDef 정의

타입 파라미터로 row 데이터 타입을 지정한다:

```typescript
const columnDefs: ColDef<IntentSentenceListItem>[] = [
  // 숨김 ID 컬럼
  { headerName: 'ID', field: 'sentenceId', hide: true },

  // 편집 가능 컬럼 (커스텀 에디터)
  {
    headerName: '문장',
    field: 'sentence',
    flex: 3,
    editable: true,
    cellEditor: InputTextCellEditor,
    cellEditorParams: { placeholder: '문장을 입력하세요.' },
  },

  // 커스텀 렌더러 컬럼
  {
    headerName: '학습상태',
    field: 'trainStatus',
    maxWidth: 120,
    cellStyle: { display: 'flex', alignItems: 'center' },
    cellRenderer: (params) => <TrainStatusBadge status={params.value} />,
  },

  // 액션 버튼 컬럼
  {
    headerName: '',
    colId: 'actions',
    maxWidth: 100,
    sortable: false,
    filter: false,
    suppressHeaderMenuButton: true,
    cellRenderer: ActionCellRenderer,
    cellRendererParams: { onSave: handleSave, onDelete: handleDelete },
  },
];
```

## 3. 커스텀 셀 에디터

AG-Grid가 에디터에 전달하는 `value`, `onValueChange`, `cellStartedEdit`을 받아 처리:

```typescript
interface InputTextCellEditorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  cellStartedEdit?: boolean;
}

const InputTextCellEditor = ({ value = '', onValueChange, placeholder, cellStartedEdit }: InputTextCellEditorProps) => {
  const inputRef = useRef<InputRef>(null);

  useEffect(() => {
    if (cellStartedEdit) inputRef.current?.focus();
  }, [cellStartedEdit]);

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      placeholder={placeholder}
    />
  );
};
```

- `cellStartedEdit`이 true일 때 자동 포커싱해 사용자 경험을 맞춘다.
- 외부 상태는 건드리지 않고 `onValueChange`로 AG-Grid에 값만 위임.

## 4. 레이아웃 감싸기

```typescript
<div className="w-full h-full bg-white bt-shadow">
  <AgGridReact rowData={data} columnDefs={columnDefs} ... />
</div>
```

툴바가 함께 있으면 툴바도 별도 `bg-white bt-shadow` 컨테이너로 분리.

## 체크리스트

- [ ] `useAggridOptions()`로 공통 옵션을 적용했는가?
- [ ] `getRowId`를 지정했는가?
- [ ] `ColDef<RowType>[]` 타입 파라미터를 지정했는가?
- [ ] 액션 컬럼에 `colId: 'actions'` 및 sort/filter/headerMenu 비활성화 옵션이 있는가?
- [ ] 편집 가능 컬럼에 커스텀 `cellEditor`를 사용했는가?
- [ ] 테이블이 `bg-white bt-shadow` 컨테이너로 감싸져 있는가?
- [ ] 파일 수정 후 `npx eslint --fix <file-path>`를 실행했는가?
