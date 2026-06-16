---
name: add-tree
description: 공통 트리(useTreeView 훅 + TreeView 프리미티브) 기반 트리 UI 작성 패턴. 트리 적합성 판정, 기본 골격, 검색·hover 액션·카운트·툴팁 표준 규격, 외부 DnD 수신·reorder 포함. 새 트리 UI 추가, 기존 트리 수정, antd Tree 대체 검토 시 사용.
---

# add-tree

이 저장소의 트리 UI 작성 절차. "트리 만들어줘", "그룹 트리 추가", "계층 목록 화면" 등의 요청 시 이 절차를 따른다.

## 핵심 규칙

1. **antd `Tree` 신규 도입 금지, 재귀 렌더 직접 구현 금지** — 트리 UI는 공통 트리(`useTreeView` 훅 + `TreeView` 프리미티브)로 작성한다. headless-tree 기반으로 펼침/접힘·평탄화·검색·키보드 a11y를 흡수한다.
2. **작성 전 트리 적합성부터 판정**한다 (아래 "트리 적합성 판정" 참조). 트리처럼 보여도 트리가 아닌 케이스가 많다.
3. 행 chrome(들여쓰기·선택바·라벨 톤)은 `TreeRow`/`TreeCaret`/`TreeFolderIcon`/`TreeLabel` 프리미티브를 사용한다. 표시/hover 규격 기준 SoT는 메뉴 트리 `MenuTree`.
4. 선택·DnD·아이콘·액션·카운트 등 도메인 결합 로직은 소비처가 주입한다 — 훅·프리미티브에 도메인 로직을 넣지 않는다.
5. **표시 데이터는 우측 상시, 버튼 액션은 hover** — 보여줄 값(카운트·메타 칩 등)이 있으면 라벨 우측으로 밀어 **상시 표기**하고, 기능 버튼(추가·수정·삭제·이동 등)은 평소 숨기고 **hover 시에만** 노출한다 (아래 "표시 데이터 + hover 액션" 참조). 행 높이 고정 규격(`h-5` 슬롯)을 함께 적용해 hover 때 행이 흔들리지 않게 한다. 단 사용자가 별도 표기 방식(버튼 상시 노출 등)을 명시하면 그 요청을 우선한다.

## 트리 적합성 판정 (작성 전 필수)

실제 마이그레이션에서 검증된 제외 기준. 하나라도 해당하면 공통 트리를 쓰지 않는다:

| 케이스 | 판정 | 근거 사례 |
| --- | --- | --- |
| 데이터가 children 없는 **평탄 목록** | 트리 아님 — 체크박스 리스트/일반 목록으로 구현 | manager `ResourceAddDrawer` (봇·NLU 모델 평탄 목록) |
| 노드 타입이 제각각인 **이종 시각화** (카드·탭·타임라인 혼합) | 트리 아님 — 도메인 전용 컴포넌트 유지 | ipron `IvrStepTree` (시나리오 카드→블록→스텝) |
| 펼침/접힘 없는 **상시 전체 펼침 네비/사이트맵** + 커넥터 선 | 재귀 `ul/li` 마크업 유지 — 평탄화하면 커넥터 계산만 복잡해짐 | host `PanelMega` TreeNode |
| **폼 입력용 드롭다운 선택** (태그·검색·Form 통합) | antd `TreeSelect` 그대로 사용 — 공통화 대상 아님 | insight `GlobalFilter`, aoe `LlmProperties` |
| TreeSelect 실물을 흉내내는 **미리보기 부속 UI** | 실물과 같은 antd 컴포넌트 유지 (외형 충실도) | insight `SearchConditionEditor` 미리보기 |

## useTreeView API 요약

```typescript
import useTreeView, { type TreeViewItem } from '@/libs/shared-ui/src/hooks/useTreeView';

const { items, rootProps, allExpanded, toggleAll } = useTreeView<MyNode>({
  data: tree,                    // nested 트리 데이터
  getId: (n) => String(n.id),    // 노드 고유 id (string)
  getChildren: (n) => n.children,
  getName: (n) => n.name,        // 검색 기본 매칭 대상
  searchText,                    // 컨트롤드 검색어 (Input은 소비처 보유)
  matchesSearch: (n, kw) => ..., // 선택 — 미지정 시 getName 부분일치
  defaultExpandAll: true,        // 선택 — 마운트·데이터 변경 시 전체 펼침
  ariaLabel: '○○ 트리',
});
```

- `items`: 평탄화된 가시 행 목록 (`TreeViewItem<T>` — `id`/`node`/`depth`/`isFolder`/`isExpanded`/`toggle` 등)
- `rootProps`: 트리 컨테이너 div에 스프레드 (a11y)
- 검색은 **필터형**: 매칭 노드의 서브트리+조상만 표시·자동 펼침, 해제 시 펼침 상태 원복. 데이터를 rebuild 하지 않으므로 소비처에서 별도 필터링 금지.

## 기본 골격 (선택 트리 최소형)

```tsx
import { TreeCaret, TreeFolderIcon, TreeLabel, TreeRow } from '@/components/custom/TreeView';
import useTreeView, { type TreeViewItem } from '@/libs/shared-ui/src/hooks/useTreeView';

const { items, rootProps } = useTreeView<MyNode>({
  data, getId: (n) => n.key, getChildren: (n) => n.children, getName: (n) => n.label,
  defaultExpandAll: true, ariaLabel: '내 트리',
});

const renderRow = (item: TreeViewItem<MyNode>) => {
  const node = item.node;
  const isSelected = node.key === selectedKey;
  return (
    <TreeRow key={item.id} item={item} selected={isSelected} onClick={() => onSelect(node)}>
      <TreeCaret item={item} />
      {item.isFolder && <TreeFolderIcon item={item} selected={isSelected} />}
      <TreeLabel selected={isSelected} title={node.label}>{node.label}</TreeLabel>
    </TreeRow>
  );
};

return (
  <div className="flex-1 overflow-auto">
    <div {...rootProps}>{items.map(renderRow)}</div>
  </div>
);
```

레퍼런스: `apps/stt/.../PaGroupTree.tsx`(최소형), `apps/stt/.../RetryReqTree.tsx`.

## 행 구성 프리미티브

| 프리미티브 | 역할 |
| --- | --- |
| `TreeRow` | 행 chrome — depth 들여쓰기, 선택바(브랜드 블루), hover 배경, a11y. `className`·`draggable`·`onDrag*` 등 추가 props 머지 (twMerge라 나중 클래스가 이김) |
| `TreeCaret` | 펼침 토글 — 행 클릭(선택)과 분리(stopPropagation). 폴더 아니면 빈 자리로 폭 유지 |
| `TreeFolderIcon` | 펼침 상태별 FolderOpen/Closed. 도메인 아이콘을 쓰면 생략 (예: MenuTree 의 App/Folder/File) |
| `TreeLabel` | 12.5px 라벨, 선택 시 브랜드색+semibold. `title`로 풀네임 툴팁 |

## 표준 규격

### 검색 입력

트리 상단에 antd `Input`(allowClear + Search 아이콘 prefix, size="small") 배치, `searchText`를 훅에 전달. 검색 하이라이트가 필요하면 `Highlight`(`@/components/custom/Highlight`) 사용 (레퍼런스: MenuTree).

### 표시 데이터 + hover 액션 (행 높이 고정 규격)

원칙:

- **표시 데이터**(카운트·테넌트 칩 등 보여줄 값)가 있으면 라벨 우측으로 밀어 **상시 표기**한다 — hover 시에도 숨기지 않는다.
- **버튼 액션**(추가·수정·삭제·이동 등 기능)은 평소 숨기고 **hover 시에만** 노출한다.
- 액션 슬롯은 모든 행에 `h-5` 고정으로 상시 존재시켜 hover 때 행 높이가 흔들리지 않게 한다.
- 사용자가 별도 표기 방식(버튼 상시 노출 등)을 명시하면 그 요청을 우선한다.

**버튼만 있는 트리** — 액션 슬롯을 `h-5` 고정으로 상시 렌더하고 버튼만 `hidden group-hover:inline-flex` 처리 (SoT: `MenuTree`, 그 외 RecogGroupTree):

```tsx
{/* 우측 액션 슬롯 — 모든 행에 h-5 고정, 버튼은 hover 시에만 노출 (MenuTree) */}
<div className="flex items-center h-5 flex-shrink-0">
  {showAdd && (
    <button
      type="button"
      className="hidden group-hover:inline-flex w-5 h-5 items-center justify-center rounded text-gray-400 hover:bg-[var(--color-bt-primary-soft)] hover:text-[var(--color-bt-primary)]"
    >
      <Plus className="size-3.5" />
    </button>
  )}
</div>
```

**표시 데이터 + 버튼이 함께 있는 트리** — 표시 데이터는 맨 우측 상시, 액션은 그 좌측에 hover 시 노출 (DOM 순서상 액션 슬롯을 데이터 앞에 둔다):

```tsx
{/* 액션 — hover 시에만, 카운트 좌측 */}
<div className="hidden group-hover:flex items-center gap-0.5 h-5 flex-shrink-0">...버튼들...</div>
{/* 표시 데이터(카운트 등) — 맨 우측 상시 표기 */}
<span className="h-5 inline-flex items-center text-[11px] text-gray-400 flex-shrink-0">
  {node.count.toLocaleString()}
</span>
```

### 액션 버튼 + 툴팁

- 버튼: `w-5 h-5 inline-flex items-center justify-center rounded text-gray-400` + hover 배경 — 일반 액션은 `hover:bg-[var(--color-bt-primary-soft)] hover:text-[var(--color-bt-primary)]`, 삭제는 `hover:bg-red-50 hover:text-red-500`. 아이콘은 lucide `size-3.5` (추가 Plus / 수정 Pencil / 삭제 Trash2 / 이동 ArrowUp·ArrowDown).
- 버튼 onClick에 `e.stopPropagation()` 필수 (행 선택과 분리).
- 툴팁: antd `Tooltip` + 컴팩트 규격 `TOOLTIP_PROPS`(MenuTree 참조 — mouseEnterDelay 0.5, styles.container로 min-height 제거). **원본/기획에 툴팁이 없던 화면에 임의로 추가하지 않는다.**

### 보조 메타 칩 (테넌트명 등)

라벨 인라인이 아니라 **카운트 좌측에 칩(pill)** 으로 — 숫자와 시각 구분:

```tsx
<span className="h-5 inline-flex items-center flex-shrink-0 group-hover:hidden">
  <span className="px-1.5 py-px rounded-full bg-gray-100 text-[10px] leading-4 text-gray-500 max-w-[120px] truncate">{node.tenantName}</span>
</span>
```

### read-only 모드

액션 콜백 props를 **optional**로 선언하고, 하나도 전달되지 않으면 액션 UI를 통째로 렌더하지 않는다 (필수 props + no-op/토스트 스텁 방식보다 우선):

```tsx
const readOnly = !onCreateChild && !onEditGroup && !onDeleteGroup;
```

레퍼런스: AgentGroupTree (스킬배정 화면이 필터 용도로 재사용).

### 드롭 상태 등 도메인 스타일

DnD 강조(emerald·blue) 등은 공통화하지 않고 `TreeRow`의 `className`으로 소비처가 주입한다.

## 고급 패턴

| 패턴 | 요약 | 레퍼런스 |
| --- | --- | --- |
| 외부 DnD 수신 (AG-Grid 행 → 트리) | `<feature>_DRAG_MIME` 채널 + `onDragOver`(types 검사·중복 setState 방지)/`onDragLeave`(contains(relatedTarget) 가드)/`onDrop`(JSON parse) | AgentGroupTree, SkillsetGroupTree |
| 노드 reorder | 그룹 노드 자체 드래그: BEFORE/INSIDE/AFTER 히트테스트(Y좌표 25/50/25%) + 위치 가이드라인. 간단 버전: 형제 내 ↑↓ 버튼(첫/마지막 disabled) | AgentGroupTree(드래그) / SkillsetGroupTree(↑↓) |
| 가상 루트("전체" 행) + 전체 펼치기/접기 | 트리 위에 별도 행으로 "전체" 선택·`toggleAll` 배치. 트리 행과 좌측 정렬·카운트 정렬 맞춤 | AgentGroupTree, MenuTree |
| 시스템 필터 칩 (전체/미배정) | 트리와 분리된 칩 줄 + 칩 자체가 드롭 타겟 | SkillsetGroupTree, CtiQueueGroupTree |
| checkable (체크박스 연동) | 공통 훅 없음 — 필요 시 antd Tree 의미론(체크 시 하위 전파, 부모 indeterminate, 비활성 노드 제외)으로 별도 훅 작성. 단, 먼저 데이터가 진짜 계층인지 적합성 판정부터 |  |

## 레퍼런스 구현 (난이도순)

| 파일 | 특징 |
| --- | --- |
| `apps/stt/.../stt-config/components/PaGroupTree.tsx` | 최소형 — 루트+leaf 선택만 |
| `apps/stt/.../stt-config/components/RetryReqTree.tsx` | 최소형 — 자동선택(최신 leaf) |
| `apps/manager/.../menu/components/MenuTree.tsx` | **표시/hover 규격 SoT** — 버튼만 hover + h-5 슬롯 고정 + 툴팁 규격. 도메인 아이콘·가상 루트·검색 Highlight·필터 칩 Popover |
| `apps/stt/.../stt-config/components/RecogGroupTree.tsx` | hover 액션 + h-5 슬롯 고정 (툴팁 없음) |
| `apps/ipron/.../cti-queue/components/CtiQueueGroupTree.tsx` | 외부 DnD + 시스템 필터 칩 + 테넌트 칩 |
| `apps/ipron/.../skillset-master/components/SkillsetGroupTree.tsx` | 위 + ↑↓ reorder |
| `apps/ipron/.../agent-master/components/AgentGroupTree.tsx` | 외부 DnD + 노드 드래그 reorder + read-only 모드 레퍼런스 (단 현재 카운트·액션 상시 노출 상태 — hover 규격 표본 아님, MenuTree 참조) |
