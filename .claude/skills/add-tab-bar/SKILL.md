---
name: add-tab-bar
description: 노드/카테고리 탭 바(좌우 스크롤 화살표 + 가로 스크롤 탭 스트립 + 우측 검색·액션) 작성 절차. "탭바 + 카드 슬라이더 + 하단 그리드" 3단 목록 화면의 1단. 공용 컴포넌트 TabBar(libs/shared-ui) 사용 — 노드·시스템·테넌트 등 도메인 무관 범용 탭 스트립. 레퍼런스 HaGroupList.tsx, IvrDnGroupList.tsx, IvrMedia.tsx, IvrEndpointList.tsx, IvrAinDnis.tsx(전부 TabBar 적용 완료). 2단(카드 슬라이더)은 add-card-slider, 3단(하단 그리드)은 add-grid 스킬 참조. "탭바 만들어줘", "노드 탭 추가", "카테고리 탭 스트립" 요청 시 사용.
---

# add-tab-bar

이 저장소의 노드/카테고리 탭 바 작성 절차. "탭바 만들어줘", "노드 탭 추가", "카테고리 탭 스트립" 등의 요청 시 이 절차를 따른다.

"탭바 + 카드 슬라이더 + 하단 그리드" 3단 목록 화면(AGENTS.md "화면 패턴" 절 참조)의 **1단**이다. 2단(카드 슬라이더)은 [add-card-slider](../add-card-slider/SKILL.md), 3단(하단 그리드)은 [add-grid](../add-grid/SKILL.md)의 "3단 목록 화면의 하단 그리드" 섹션을 따른다.

> ⚠️ **인라인 마크업으로 새로 작성하지 말 것.** 과거 화면마다 탭바 마크업을 복붙하다 보니 패딩·최대폭·구분선 등이 화면마다 미세하게 어긋나는 문제가 반복됐다(2026-07 IVR DN그룹관리 vs 미디어관리 드리프트). 반드시 공용 컴포넌트 **`TabBar`**(`@/components/custom/TabBar`, 실체는 `libs/shared-ui/src/components/custom/TabBar.tsx`)를 사용해 모든 화면이 항상 같은 결과물을 내도록 한다. 이름에 "Node"가 없는 이유: 노드 전용이 아니라 테넌트(IvrAinDnis.tsx) 등 어떤 상위 분류든 쓰는 범용 컴포넌트라서다.

레퍼런스(전부 `TabBar` 적용): [HaGroupList.tsx](../../../apps/ivr/src/app/pages/ha/HaGroupList.tsx), [IvrDnGroupList.tsx](../../../apps/ivr/src/app/pages/line/IvrDnGroupList.tsx), [IvrMedia.tsx](../../../apps/ivr/src/app/pages/line/IvrMedia.tsx), [IvrEndpointList.tsx](../../../apps/ivr/src/app/pages/line/IvrEndpointList.tsx), [IvrAinDnis.tsx](../../../apps/ivr/src/app/pages/line/IvrAinDnis.tsx).

## 0. 판정 — 이 패턴이 맞는가

| 상황 | 결론 |
| --- | --- |
| 노드/시스템/카테고리 등 상위 분류가 여러 개고, 그중 하나를 눌러 하위 화면(카드·그리드)을 필터링 | ✅ 이 스킬 |
| 조건 검색 Select/Input만 있고 클릭으로 전환되는 "탭" 개념이 없음 | ❌ 일반 검색 UI(AGENTS.md "검색·필터 + 그리드" 패턴) |
| 상위 항목이 소수(2~4개)라 스크롤이 필요 없는 단순 탭 | 골격은 동일하되 `TabBar` 그대로 사용(좌우 화살표는 항목이 적어도 그대로 둬도 무방 — 클릭해도 스크롤할 게 없을 뿐) |

## 사용법

```tsx
import TabBar, { type TabBarItem } from '@/components/custom/TabBar';

const nodeTabItems: TabBarItem<number | 'all'>[] = useMemo(
  () => [
    { id: 'all', label: '전체', icon: Layers, count: items.length },
    ...nodes.map((node) => ({
      id: node.nodeId,
      label: node.nodeName,
      icon: Network,
      count: items.filter((i) => i.nodeId === node.nodeId).length,
    })),
  ],
  [nodes, items],
);

<TabBar<number | 'all'>
  items={nodeTabItems}
  selectedId={isSearching ? null : (selectedNodeId ?? 'all')}
  onSelect={(id) => {
    if (id === 'all') {
      setSelectedNodeId(null);
      setSelectedSubState(null); // 하위 선택 상태 초기화
      setSearchText('');
    } else {
      handleNodeSelect(id); // number로 좁혀짐
    }
  }}
  // 검색 Input·추가 버튼 등 우측 액션이 있을 때만 전달 — 있으면 컨테이너에 pr-5가 자동으로 붙는다
  rightContent={<Input allowClear prefix={<Search className="size-3.5 text-gray-400" />} ... />}
/>
```

## 핵심 규칙

1. **컴포넌트 사용**: 탭바를 새로 만들 때 마크업을 손으로 복붙하지 말고 `TabBar`를 import해서 쓴다. 좌우 스크롤 화살표, `h-[56px]` 박스, 탭 버튼 스타일(`px-3` + `min-w-[120px] max-w-[200px]`), 활성/비활성 색상, `(N)` 카운트 포맷은 컴포넌트 내부에 고정되어 있어 화면마다 달라질 수 없다.
2. **`items` 배열**: `{ id, label, icon, count }` 형태. "전체" 항목이 필요하면(여러 화면에서 권장) `id: 'all'`(또는 임의의 sentinel 문자열)로 배열 맨 앞에 직접 넣는다 — 컴포넌트가 "전체"를 특별 취급하지 않으므로 아이콘(`Layers` 권장)·카운트(전체 항목 수)를 호출부가 채운다.
3. **`selectedId`**: 검색 중이라 탭 선택이 의미 없어지는 화면은 `isSearching ? null : (selectedNodeId ?? 'all')`처럼 검색 중엔 `null`을 넘겨 모든 탭을 비활성으로 만든다(어떤 `item.id`도 `null`이 될 수 없으므로 안전).
4. **`onSelect`**: `id === 'all'`(혹은 sentinel) 분기에서 하위 상태(카드 선택·그리드 선택 등)를 초기화한 뒤 실제 노드 선택 핸들러로 위임한다. `handleNodeSelect`류의 기존 핸들러 시그니처(`(nodeId: number) => void`)는 그대로 재사용 — `onSelect`의 `id`는 `'all'` 분기를 걸러내면 자동으로 좁혀진다.
5. **`rightContent`**: 검색 Input·추가 버튼 등 우측 영역이 있을 때만 넘긴다. 넘기지 않으면 컨테이너에 `pr-5`가 붙지 않아 우측에 빈 여백이 생기지 않는다 — **우측 영역이 없는데 직접 `pr-5`를 추가하지 말 것**(과거 이 실수로 두 화면 탭바 폭이 달라 보인 적 있음).
6. **탭 전환 시 하위 상태 초기화**: `onSelect`에서 카드 선택·그리드 선택 등 하위 상태를 반드시 초기화한다(3번 참조).

## 체크리스트

- [ ] `TabBar`를 import해서 썼는가(마크업을 손으로 복붙하지 않았는가)?
- [ ] `items`에 `{ id, label, icon, count }`를 정확히 채웠는가?
- [ ] "전체" 항목이 필요한 화면이면 `id: 'all'`로 맨 앞에 넣었는가?
- [ ] `rightContent`가 없는 화면인데 임의로 `pr-5` 등을 추가하지 않았는가?
- [ ] 탭 전환(`onSelect`) 시 하위 선택 상태를 초기화했는가?
- [ ] 파일 수정 후 `npx eslint --fix <file-path>`를 실행했는가?
