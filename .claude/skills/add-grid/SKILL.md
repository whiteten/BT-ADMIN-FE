---
name: add-grid
description: AG-Grid Enterprise 테이블 추가 패턴. useAggridOptions 훅으로 공통 옵션 적용, ColDef 타입 파라미터로 row 타입 지정, 편집 가능 컬럼·커스텀 렌더러·액션 버튼 컬럼(삭제 아이콘 Trash2 표준 포함)·상태값 뱃지(shadcn Badge + Record 색상 맵 표준) 구성, 내부 코드값 컬럼 라벨 표기 판정 기준과 filterValueGetter 필터 라벨 통일, 커스텀 셀 에디터 작성법. 탭바+카드 슬라이더 3단 목록 화면의 하단 그리드(헤더 또는 탭 변형) 표준도 포함. 테이블 추가, 인라인 편집 UI 작성, 행별 액션 버튼(삭제 아이콘 포함) 구성, 그리드 안 상태 뱃지 작성, 커스텀 셀 에디터 작성, 3단 목록 화면 하단 그리드 작성 시 사용.
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

### 2-1. 액션 컬럼 삭제 아이콘 표준

행 삭제 버튼은 lucide `Trash2`로 통일한다(`IconTrash` 커스텀 SVG는 레거시 — 신규/수정 코드에 쓰지 않는다. 아이콘 우선순위 일반 규칙은 AGENTS.md "아이콘 사용 패턴" 참조).

```tsx
{
  headerName: '',
  colId: 'actions',
  width: 56, // 아이콘 1개면 50~60px, 여러 개면 그만큼 확보
  sortable: false,
  filter: false,
  suppressHeaderMenuButton: true,
  cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cellRenderer: (p: ICellRendererParams<RowType>) =>
    p.data ? (
      <button
        type="button"
        title="삭제"
        onClick={(e) => {
          e.stopPropagation(); // 행 클릭에 selection/선택 로직이 걸려 있으면 필수
          handleDelete(p.data!);
        }}
      >
        <Trash2 className="size-4 text-red-500 hover:cursor-pointer" />
      </button>
    ) : null,
}
```

- **아이콘**: `<Trash2 className="size-4 text-red-500 hover:cursor-pointer" />` — 크기는 `size-4`(그리드 기본), 촘촘한 그리드는 `size-3.5`도 허용. 색상은 `text-red-500` 고정.
- **클릭 영역**: 아이콘을 감싼 `<button type="button">`에 `title="삭제"`를 달아 툴팁을 제공한다. 별도 배경·테두리·padding은 주지 않는다(아이콘 자체가 클릭 영역).
- **`e.stopPropagation()`**: `onRowClicked`로 행 선택을 처리하는 그리드(예: 카드 슬라이더 선택과 연동되는 목록)에서는 반드시 호출해 행 선택과 삭제 클릭이 충돌하지 않게 한다. 행 클릭에 아무 동작이 없는 그리드(예: `onRowDoubleClicked`만 있는 경우)는 생략 가능.
- 삭제 실행 자체는 `useModal().confirm.delete({ onOk: () => ... })`로 확인 후 처리(AGENTS.md "확인 모달" 참조) — 클릭 즉시 삭제하지 않는다.
- 수정(연필) 등 다른 액션 아이콘과 나란히 두는 경우 `flex items-center gap-2.5`로 감싸고, 각각 `title`(수정/삭제)을 부여한다.

### 2-2. 그리드 안 상태값 뱃지 표준

행의 상태·분류값(Role 타입, 상태, 구분 코드 등)을 그리드 셀에 표현할 때는 antd `Tag`나 인라인 `style` 컬러 `<span>`이 아니라 **shadcn `Badge` + `Record` 색상 맵**을 쓴다. 레퍼런스: [HaGroupList.tsx](../../../apps/ivr/src/app/pages/ha/HaGroupList.tsx)의 멤버 그리드(`ROLE_TYPE_BADGE_CLASS`/`ROLE_STATUS_BADGE_CLASS`), [ScenarioAssignedStatusModal.tsx](../../../apps/ivr/src/app/features/scenario/components/ScenarioAssignedStatusModal.tsx).

```tsx
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// 파일 상단(컬럼 정의 밖) — 값별 색상은 고정 매핑, 라벨은 별도 소스(공통코드 API·LABELS record)에서 가져온다.
const ROLE_TYPE_BADGE_CLASS: Record<number, string> = {
  [ROLE_TYPE.BACKUP]: 'text-gray-500 bg-gray-100',
  [ROLE_TYPE.SERVICE]: 'text-blue-600 bg-blue-50',
};
const DEFAULT_BADGE_CLASS = 'text-gray-500 bg-gray-100';
const BADGE_CLASS = 'text-[13px] leading-[13px] font-medium !h-6';

// ColDef 안
{
  headerName: 'ROLE TYPE',
  field: 'roleType',
  width: 110,
  cellRenderer: (p: ICellRendererParams<RowType>) =>
    p.data ? <Badge className={cn(BADGE_CLASS, ROLE_TYPE_BADGE_CLASS[p.data.roleType] ?? DEFAULT_BADGE_CLASS)}>{labelMap.get(p.data.roleType) ?? '-'}</Badge> : null,
}
```

- **컴포넌트**: shadcn `Badge`(`@/components/ui/badge`)로 통일한다. antd `Tag`는 기본 padding·border·font-size가 shadcn Badge와 달라 같은 화면 안에서도 톤이 어긋나 보이므로 그리드 신규/수정 코드에 쓰지 않는다(과거 antd `Tag`를 쓰던 코드는 발견 시 이 표준으로 교체).
- **크기 고정값**: `BADGE_CLASS = 'text-[13px] leading-[13px] font-medium !h-6'`를 모든 뱃지 컬럼에 공통 적용한다. shadcn Badge 기본 높이를 덮어써야 하므로 `!h-6`처럼 `!important`가 필요하다.
- **색상 매핑**: 값(코드)마다 `Record<code, string>` 형태로 `text-<color>-600 bg-<color>-50`(또는 `text-<color>-500 bg-<color>-100`) 조합을 고정한다. 매핑에 없는 값은 `DEFAULT_BADGE_CLASS = 'text-gray-500 bg-gray-100'`로 폴백한다(맵 조회에 `?? DEFAULT_BADGE_CLASS` 필수 — 없으면 신규 코드값 추가 시 아예 렌더가 깨진다).
- **색상 팔레트 의미**(이 저장소에서 반복 확인된 관례 — 화면마다 임의로 다른 색을 고르지 말 것):
  - `gray`/`slate` — 대기, 기본, 미배포, 비활성
  - `blue` — 진행중, 전송/명령 완료
  - `emerald` — 정상, 성공, 적용완료, 활성
  - `red` — 실패, 에러
  - `amber` — 대기(경고성), 최대치 임박
  - `purple` — 예약 등 별도 구분(경쟁 상태와 무관한 3번째 분류가 필요할 때)
- **라벨 소스와 색상 매핑을 분리**한다: 라벨은 공통코드 API 응답(`labelMap.get(code)`)이나 `<도메인>_LABELS` record에서, 색상은 이 파일에 고정된 `<도메인>_BADGE_CLASS` map에서 — 백엔드 공통코드 라벨이 바뀌어도 색상 로직에 영향이 없게 분리한다.
- **null 처리**: 값이 없을 수 있는 컬럼은 `p.data?.field != null ? <Badge>...</Badge> : '-'`로 대시 처리한다(빈 뱃지를 렌더하지 않는다).
- 카드 슬라이더(2단)에서 같은 상태값을 배지로 표현할 때는 Badge 대신 `inline-flex items-center px-1.5 py-0.5 rounded text-[10~11px] font-medium border` 계열의 색상 pill을 쓴다([add-card-slider](../add-card-slider/SKILL.md) 참조) — 그리드 셀과 카드는 서로 다른 밀도라 폰트 크기·padding이 다르다. 같은 상태값이면 색상 의미(위 팔레트)는 동일하게 유지한다.

### 2-3. 코드값 컬럼은 라벨로 표기한다 — 판정 기준과 필터 통일

컬럼 값을 원본 그대로 보여줄지, 라벨로 치환해 보여줄지는 **"그 값이 사용자 어휘인가, 시스템 어휘인가"**로 판정한다:

- **라벨 표기 (원본 숨김)**: 값이 내부 표현일 때 — `0/1`·`Y/N` 플래그, enum 코드(`ADDED`, `roleType` 코드 등), 기획서·메뉴·다른 화면에서 이미 한글 용어로 부르는 값, Select 옵션·배지 등 다른 UI에서 이미 라벨로 노출 중인 값(같은 화면에서 그리드만 코드로 보이면 이원화).
- **원본 그대로**: 값 자체가 사용자 데이터인 것 — 이름·전화번호·DN·IP·UCID·파일명·계정, 자유 텍스트·식별자(매핑 자체가 없음). 기술자 대상 화면에서 코드 자체가 소통 단위인 값(SIP 헤더명, HTTP 상태코드 등)도 원본 유지 — 라벨링이 오히려 방해.
- **경계 케이스 판별법**: "사용자가 문의할 때 이 값을 뭐라고 부르나?" — 라벨로 부르면("비활성인데요") 라벨만, 코드로도 부르면("FAIL_003이래요") 라벨 표기 + tooltip에 원본 코드 병기.

라벨 표기로 판정한 컬럼은 **`cellRenderer` + shadcn `Badge`(2-2 표준 스타일) + `cellStyle` 가운데 정렬 + `filterValueGetter` 라벨 통일** 세트로 작성한다:

```tsx
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// 파일 상단 — 라벨·색상 매핑 (상수 객체 SoT 패턴은 AGENTS.md "상태값·매핑 타입" 참조)
const PROC_STATUS_LABELS: Record<ProcStatus, string> = {
  0: '대기',
  1: '진행중',
  2: '완료',
  3: '실패',
};
const PROC_STATUS_BADGE_CLASS: Record<ProcStatus, string> = {
  0: 'text-gray-500 bg-gray-100',
  1: 'text-blue-600 bg-blue-50',
  2: 'text-emerald-600 bg-emerald-50',
  3: 'text-red-500 bg-red-50',
};

// ColDef 안
{
  headerName: '처리상태',
  field: 'procStatus',
  maxWidth: 120,
  cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cellRenderer: (p: ICellRendererParams<RowType>) =>
    p.data != null ? (
      <Badge variant="secondary" className={cn(BADGE_CLASS, PROC_STATUS_BADGE_CLASS[p.data.procStatus] ?? DEFAULT_BADGE_CLASS)}>
        {PROC_STATUS_LABELS[p.data.procStatus] ?? '-'}
      </Badge>
    ) : null,
  filterValueGetter: (p) => (p.data != null ? (PROC_STATUS_LABELS[p.data.procStatus] ?? String(p.data.procStatus)) : ''),
},
```

- **가운데 정렬**: 뱃지 컬럼은 `cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }`로 수직·수평 중앙 정렬한다 (`alignItems`만 주면 수직 정렬만 되므로 `justifyContent`까지 세트로).
- **색상은 값에 어울리도록 자유롭게 선택**한다: 성공·실패·진행중처럼 2-2 팔레트 의미에 해당하는 상태값은 그 관례를 따르되, 그 외 분류값(타입·구분·카테고리 등)은 값의 성격이 잘 드러나는 색을 자유롭게 고른다. 단 `text-<color>-600 bg-<color>-50`(또는 `-500`/`-100`) 조합 형식과 같은 화면 안에서의 값별 색상 일관성은 유지한다.

**대표 관례 값 — 라벨·색상 통일 표.** 아래 계열의 값은 화면마다 표기가 달라지지 않도록 표준 라벨과 색상을 고정한다. 기존 코드에서 다른 표기(antd `Tag` green, hex 색상, 맨 텍스트, `'사용'/'안함'` 등)를 발견하면 이 표준으로 교체한다:

| 값 계열 (코드 예) | 표준 라벨 | 색상 (text / bg) |
| --- | --- | --- |
| 사용 여부 (`useYn`, `isUse`, `Y/N`) | 사용 / 미사용 | `emerald-600/emerald-50` / `gray-500/gray-100` |
| 활성 여부 (`activateYn`, `ACTIVE/DISABLED`) | 활성 / 비활성 | `emerald-600/emerald-50` / `gray-500/gray-100` |
| 진행 상태 (`procStatus` 등 단계형) | 대기 / 진행중 / 완료 / 실패 | `gray` / `blue` / `emerald` / `red` |
| 처리 결과 (`result`, `SUCCESS/FAIL`) | 성공 / 실패 | `emerald-600/emerald-50` / `red-500/red-50` |
| 차단·위험성 토글 (`blockYn` 등 켜지면 위험한 값) | 설정 / 해제 | `red-500/red-50` / `gray-500/gray-100` |
| 배정 여부 (`assignYn`) | 배정중 / 미배정 | `emerald-600/emerald-50` / `gray-500/gray-100` |
| 예약 등 제3 분류 | 예약 | `purple-600/purple-50` |

- **라벨 어휘도 표에 맞춰 통일**한다: `'사용'/'안함'` ❌ → `'사용'/'미사용'`, `Y`·`N`·`0`·`1` 원본 노출 ❌. `O/X` 표기는 여부 컬럼이 여러 개 나열되는 조밀한 기술 그리드(DN 속성 등)에서만 허용하고, 일반 목록 컬럼은 한글 라벨을 쓴다.
- **같은 on/off라도 의미 방향이 다르면 색이 다르다**: 켜짐이 정상 동작이면 emerald(사용·활성), 켜짐이 위험·차단이면 red(차단 설정). "켜짐=emerald"로 기계적으로 칠하지 말고 값의 의미로 판단한다.
- **필터 라벨 통일 필수**: 셀 표시가 라벨인 컬럼은 반드시 `filterValueGetter`로 필터·검색 값도 같은 라벨 소스로 맞춘다. 빠뜨리면 셀에는 "완료"가 보이는데 필터 목록에는 `2`가 뜨는 이원화가 생긴다.
- **뱃지가 과한 단순 치환 컬럼**(색상 구분이 필요 없는 라벨)은 Badge 없이 `valueFormatter` + `filterValueGetter` 쌍으로 같은 라벨 함수를 재사용한다:

```tsx
{ headerName: 'ACD타입', field: 'acdType', width: 140, filterValueGetter: (p) => getAcdTypeName(p.data?.acdType), valueFormatter: (p) => getAcdTypeName(p.value) },
```

- 같은 도메인 뱃지를 여러 파일에서 재사용하면 `features/<feature>/components/<도메인>StatusBadge.tsx` 컴포넌트로 추출하고, cellRenderer에서는 해당 컴포넌트만 호출한다.

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

## 5. 3단 목록 화면(탭바 + 카드 슬라이더 + 하단 그리드)의 하단 그리드

노드/시스템 탭 → 카드 슬라이더 → 하단 그리드로 이어지는 3단 목록 화면(1단은 [add-tab-bar](../add-tab-bar/SKILL.md), 2단은 [add-card-slider](../add-card-slider/SKILL.md) 스킬 참조)에서, 카드 선택에 반응하는 **하단 그리드 박스**의 헤더·패딩 표준. 레퍼런스: [HaGroupList.tsx](../../../apps/ivr/src/app/pages/ha/HaGroupList.tsx), [IvrDnGroupList.tsx](../../../apps/ivr/src/app/pages/line/IvrDnGroupList.tsx).

### 5-1. 기본형 — 헤더 하나

```tsx
<div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
  <div className="px-5 py-3 flex items-center justify-between flex-shrink-0">
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-[#405189]" />
      <h3 className="text-sm font-semibold text-gray-800">
        제목 — <span className="text-[#405189]">{선택된값}</span>
      </h3>
      <span className="text-[11px] font-medium px-1.5 py-0.5 rounded text-slate-500 bg-slate-100">{count}개</span>
    </div>
    <div className="flex items-center gap-2">{/* 검색, 추가 버튼 등 */}</div>
  </div>
  <div className="border-t border-gray-200" />
  <div className="flex-1 min-h-0 p-5">
    <AgGridReact ... />
  </div>
</div>
```

- 헤더: 아이콘 + 기존 semibold 제목(도메인별 문구는 유지, 새로 짓지 않음) + 카운트 배지, 컨테이너 `px-5 py-3`.
- **우측 버튼이 없는 헤더는 `py-3` 대신 `py-5`**를 쓴다. antd `Button`이 있는 헤더는 버튼 자체 높이 때문에 `py-3`이어도 충분한 높이가 나오지만, 좌측 텍스트뿐인 헤더는 `py-3`이면 더 낮아져 옆(또는 위아래)에 나란히 배치된 다른 그리드 박스 헤더와 높이가 어긋난다(예: [SleeConfigList.tsx](../../../apps/ivr/src/app/pages/scenario/SleeConfigList.tsx)의 카테고리(버튼 없음, `py-5`) + 속성(버튼 있음, `py-3`) 좌우 분할). 우측에 `<div className="flex items-center gap-2">{/* 버튼 등 */}</div>`를 실제로 렌더하는지 여부로 판정 — 버튼·Select 등 어떤 우측 요소든 있으면 `py-3`, 우측 슬롯 자체를 생략했다면 `py-5`.
- **상위 단(1단 탭·2단 카드)에서 선택한 값이 있으면 제목에 반영**: `제목 — <span className="text-[#405189]">{선택값}</span>` 형태(em dash `—` + 브랜드 컬러 강조). 값이 없을 때(전체·미선택) 뒤 span은 빈 문자열로 비워 두거나 조건부로 아예 생략. 검색 중처럼 선택값 기준 제목이 의미 없는 상태는 "검색 결과" 등 별도 문구로 대체. 레퍼런스: `HaGroupList.tsx`의 `HA 그룹 멤버 — {haGroupName}`, `IvrDnGroupList.tsx`의 `DN 그룹 — {systemName}`.
- **헤더 자체에 `border-b` 금지** — 헤더 바로 아래 별도 `<div className="border-t border-gray-200" />` 구분선을 둔다.
- 그리드를 감싸는 래퍼에 **`p-5` 패딩 필수**(그리드가 박스 테두리에 바로 붙지 않도록). 기존 `flex-1 min-h-0`에 `p-5`만 추가.
- 그리드 셀 안의 상태·분류값은 뱃지로 표현(이미 뱃지/컬러 pill을 쓰고 있으면 그대로 유지).

### 5-2. 변형 — 하단이 헤더 대신 탭인 경우

하나의 상위 항목 아래 성격이 다른 콘텐츠 여러 개를 전환해서 보여줘야 하는 화면(예: [IvrMedia.tsx](../../../apps/ivr/src/app/pages/line/IvrMedia.tsx) — Media Server/TTS Master/STT Master 탭)은 5-1의 "헤더 + `border-t`" 대신 **1단 탭바와 동일한 시각 언어**의 탭 줄을 쓴다:

```tsx
<div className="flex items-stretch border-b-2 border-gray-200 bg-white pr-5 h-[56px] flex-shrink-0">
  {/* TabButton: 아이콘 + 라벨 + (카운트), 활성 시 border-b-2 border-b-[var(--color-bt-primary)] -mb-[2px] */}
  <div className="ml-auto flex items-center gap-2 self-center">{/* 추가 버튼 등 */}</div>
</div>
<div className="flex-1 flex flex-col overflow-hidden">
  {/* 탭 콘텐츠 — 그리드면 p-5 패딩 */}
</div>
```

- 탭 스트립 자체의 `border-b-2 border-gray-200`가 구분선을 겸하므로 별도 `border-t` div를 추가하지 않는다.
- **탭 버튼**: 아이콘 + 라벨 + 카운트는 슬레이트 pill 배지가 아니라 `(N)` 괄호 형태(1단 노드 탭과 동일 포맷) — `text-[11px] text-gray-400`. 활성 탭 `text-[var(--color-bt-primary)] border-b-2 border-b-[var(--color-bt-primary)] -mb-[2px]`, 비활성 `text-gray-400 border-b-transparent`.
- 우측 액션 버튼이 있으면 탭 줄 컨테이너에 `pr-5`(`pr-3` 쓰지 말 것), 버튼 그룹은 `ml-auto flex items-center gap-2 self-center`.
- 탭 콘텐츠가 그리드면 그리드 래퍼에 `p-5` 패딩(5-1과 동일). 그리드가 아닌 콘텐츠(정보 패널 등)는 그 콘텐츠 자체의 기존 여백 규칙을 따름 — 강제로 p-5를 얹지 않는다.

## 체크리스트

- [ ] `useAggridOptions()`로 공통 옵션을 적용했는가?
- [ ] `getRowId`를 지정했는가?
- [ ] `ColDef<RowType>[]` 타입 파라미터를 지정했는가?
- [ ] 액션 컬럼에 `colId: 'actions'` 및 sort/filter/headerMenu 비활성화 옵션이 있는가?
- [ ] 편집 가능 컬럼에 커스텀 `cellEditor`를 사용했는가?
- [ ] 삭제 아이콘이 `IconTrash`가 아니라 lucide `Trash2`(`size-4 text-red-500`)인가, 필요 시 `stopPropagation`을 걸었는가?
- [ ] 상태값 뱃지가 antd `Tag`/인라인 컬러 `span`이 아니라 shadcn `Badge` + `Record` 색상 맵(`BADGE_CLASS` + `<도메인>_BADGE_CLASS` + `DEFAULT_BADGE_CLASS` 폴백)인가?
- [ ] 내부 코드값 컬럼(`0/1`·`Y/N`·enum 코드)을 원본 그대로 노출하지 않고 라벨(뱃지)로 표기했는가? (2-3 판정 기준)
- [ ] 셀 표시가 라벨인 컬럼에 `filterValueGetter`로 필터·검색 값도 같은 라벨로 통일했는가?
- [ ] 뱃지 컬럼에 `cellStyle`(flex + `justifyContent: 'center'`) 가운데 정렬을 적용했는가?
- [ ] 테이블이 `bg-white bt-shadow` 컨테이너로 감싸져 있는가?
- [ ] (3단 목록 화면 하단 그리드인 경우) 헤더에 `border-b` 대신 별도 `border-t` 구분선을 뒀는가, 그리드 래퍼에 `p-5`를 줬는가?
- [ ] (3단 목록 화면 하단 그리드인 경우) 상위 단 선택값이 있으면 헤더 제목을 `제목 — {선택값}`(em dash + `text-[#405189]` 강조) 형태로 반영했는가?
- [ ] (3단 목록 화면 하단 그리드인 경우) 헤더 우측에 버튼 등 실제 요소가 있으면 `py-3`, 없으면(우측 슬롯 생략) `py-5`로 높이를 맞췄는가?
- [ ] (탭 변형인 경우) 탭 줄에 `pr-5`(우측 버튼 있을 때)와 `(N)` 괄호 카운트 포맷을 썼는가?
- [ ] 파일 수정 후 `npx eslint --fix <file-path>`를 실행했는가?
