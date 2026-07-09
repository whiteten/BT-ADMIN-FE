---
name: add-card-slider
description: 가로 스크롤 카드 슬라이더(좌우 화살표 + 카드 목록, 클릭 시 선택/더블클릭 시 수정) 작성 절차. 카드 내부 상태값 태그(Tailwind Record 색상 맵 표준) 규칙 포함. "탭바 + 카드 슬라이더 + 하단 그리드" 3단 목록 화면의 2단. 레퍼런스 HaGroupList.tsx, IvrDnGroupList.tsx, IvrMedia.tsx, IvrEndpointList.tsx, ScenarioList.tsx. 1단(탭바)은 add-tab-bar, 3단(하단 그리드)은 add-grid 스킬 참조. "카드 슬라이더 추가", "카드 목록 만들어줘", 카드 안 상태 태그 작성, 선택형 카드 UI 요청 시 사용.
---

# add-card-slider

이 저장소의 가로 스크롤 카드 슬라이더 작성 절차. "카드 슬라이더 추가해줘", "카드 목록 만들어줘" 등의 요청 시 이 절차를 따른다.

"탭바 + 카드 슬라이더 + 하단 그리드" 3단 목록 화면(AGENTS.md "화면 패턴" 절 참조)의 **2단**이다. 1단(탭바)은 [add-tab-bar](../add-tab-bar/SKILL.md), 3단(하단 그리드)은 [add-grid](../add-grid/SKILL.md)의 "3단 목록 화면의 하단 그리드" 섹션을 따른다. 탭바 없이 카드 슬라이더만 쓰는 화면(예: [ScenarioList.tsx](../../../apps/ivr/src/app/pages/scenario/ScenarioList.tsx) — 탭바 대신 검색 Select+Input)도 이 스킬의 카드 슬라이더 규칙을 그대로 적용한다.

레퍼런스: [HaGroupList.tsx](../../../apps/ivr/src/app/pages/ha/HaGroupList.tsx), [IvrDnGroupList.tsx](../../../apps/ivr/src/app/pages/line/IvrDnGroupList.tsx), [IvrMedia.tsx](../../../apps/ivr/src/app/pages/line/IvrMedia.tsx), [IvrEndpointList.tsx](../../../apps/ivr/src/app/pages/line/IvrEndpointList.tsx), [ScenarioList.tsx](../../../apps/ivr/src/app/pages/scenario/ScenarioList.tsx).

## 0. 판정 — 이 패턴이 맞는가

| 상황 | 결론 |
| --- | --- |
| 항목을 카드 형태로 훑어보다가 하나를 클릭해 선택 → 하위(그리드 등)가 반응 | ✅ 이 스킬 |
| 항목이 소수(3~4개 이하)라 스크롤이 전혀 필요 없음 | 골격은 동일하되 좌우 화살표·`overflow-x-auto`는 생략 가능 |
| 카드가 아니라 전형적인 표(그리드) 형태로 충분 | ❌ [add-grid](../add-grid/SKILL.md) |

## 마크업 골격

```tsx
<div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
  {/* 헤더는 있는 화면만 — 아래 "헤더" 절 참조. 없으면 이 블록 자체를 생략 */}
  <div className="flex items-center gap-2 px-5 py-2.5 border-b border-gray-100">
    <Icon className="size-4 text-[#405189]" />
    <h3 className="text-sm font-semibold text-gray-800">제목</h3>
    <span className="text-[11px] font-medium px-1.5 py-0.5 rounded text-slate-500 bg-slate-100">{count}개</span>
  </div>

  <div className="flex items-center gap-2 px-4 py-3 h-[NNpx]">
    <Button
      type="text"
      icon={<ChevronLeft className="size-5" />}
      onClick={() => cardScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
      className="!flex-shrink-0 !w-8 !h-8 !p-0"
    />
    <div ref={cardScrollRef} className="flex gap-3 overflow-x-auto py-2 px-1 flex-1" style={{ scrollbarWidth: 'none' }}>
      {items.map((item) => {
        const isSelected = selectedId === item.id;
        return (
          <div
            key={item.id}
            id={`card-${item.id}`}
            className={`bg-white border rounded-lg p-3 cursor-pointer transition-all w-[220px] flex-shrink-0 flex flex-col ${
              isSelected
                ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
            }`}
            onClick={(e) => {
              handleSelect(item.id);
              (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }}
            onDoubleClick={() => handleEdit(item)}
          >
            {/* 카드 헤더: 아이콘 + 이름 + 더보기(⋮) */}
            {/* 카드 정보 줄들 */}
            {/* mt-auto pt-1.5로 바닥에 붙는 상태 뱃지 */}
          </div>
        );
      })}
    </div>
    <Button
      type="text"
      icon={<ChevronRight className="size-5" />}
      onClick={() => cardScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
      className="!flex-shrink-0 !w-8 !h-8 !p-0"
    />
  </div>
</div>
```

## 핵심 규칙

1. **박스**: 카드 슬라이더는 독립된 `bg-white bt-shadow overflow-hidden flex-shrink-0` 박스.
2. **헤더는 있는 화면만** 적용한다. 헤더 없는 카드 슬라이더(예: ScenarioList.tsx)는 이 규칙 자체를 스킵 — 강제로 헤더를 추가하지 않는다. 헤더 형태는 작은 회색 텍스트 한 줄이 아니라 `아이콘(카드 자체가 쓰는 아이콘을 재사용, 카드에 아이콘이 없으면 그 도메인을 대표하는 아이콘 선정) + h3 text-sm font-semibold text-gray-800 제목 + 카운트 배지(N개, text-[11px] font-medium px-1.5 py-0.5 rounded text-slate-500 bg-slate-100)`, 컨테이너 `px-5 py-2.5`.
   - 헤더가 접기/펼치기 토글을 겸하는 경우(예: IvrDnGroupList 시스템 슬라이더) `<button>` 안에 이 스타일을 그대로 적용하되, `h3`는 버튼 내부 시맨틱상 `<span>`(동일한 `text-sm font-semibold text-gray-800`)으로 대체하고 펼침 화살표는 `ml-auto`로 오른쪽 끝에 고정.
3. **카드 높이 — "카드 깨지는" 버그 방지**: 카드 자체나 스크롤 컨테이너(`cardScrollRef`가 걸린 div)에 **`h-full`을 주지 말 것**. 카드는 내용에 맞춰 자연 크기로 두고, 바깥 행에만 고정 `h-[NNpx]` + `items-center`로 세로 중앙 정렬한다. `h-full`을 주면 카드 내부 `mt-auto`로 밀어낸 하단 요소(상태 뱃지 등)가 어긋나며 카드가 깨져 보이는 버그가 생긴다(이 저장소에서 반복 발생한 함정).
4. **행 높이(`h-[NNpx]`)는 화면마다 카드 내용량에 맞춰 손으로 튜닝**한다 — `140px`가 여러 화면에서 쓰인다고 해서 고정 상수가 아니다. 카드 정보 줄이 많으면(예: ScenarioList 4줄 → `181px`) 그만큼 늘린다.
5. **카드 폭**: `w-[220px] flex-shrink-0`이 기본값. 카드 내용이 유독 많으면 화면별로 조정 가능.
6. **카드 내부 태그(뱃지) 표준** — 상세는 아래 "카드 내부 태그" 절 참조.
7. **클릭/더블클릭**: 카드 클릭 = 선택(하단 그리드·패널 등에 반영 + `scrollIntoView({ inline: 'center' })`), 더블클릭 = 수정 드로어 오픈이 일반적 패턴. 카드 우상단에 `⋮`(`MoreVertical`) 드롭다운 메뉴(수정/삭제)를 두는 경우, 메뉴 트리거에 `onClick={(e) => e.stopPropagation()}`을 걸어 카드 선택과 충돌하지 않게 한다.
8. **신규 등록 후 포커스**: 새로 추가된 카드는 목록 갱신 후 해당 카드로 자동 스크롤 + 잠시 하이라이트(`pendingFocusIdRef` 패턴 — ScenarioList.tsx/IvrEndpointList.tsx 참조)하는 것을 권장.
9. **빈 상태**: 항목이 0개면 화살표 없이 `Empty` + 안내 문구로 대체.

## 카드 내부 태그

카드 하단에 상태·분류값(배포 상태, Role 타입, Direction 등)을 표시할 때의 표준. 그리드 셀 안 뱃지([add-grid](../add-grid/SKILL.md)의 "그리드 안 상태값 뱃지 표준")와 색상 의미는 동일하게 맞추되, **컴포넌트는 shadcn `Badge`가 아니라 pill `<span>`**을 쓴다 — 카드가 더 조밀해서(`text-[10px]`) Badge의 기본 padding/height가 과하다.

```tsx
// 파일 상단(컴포넌트 밖) — Tailwind 클래스로 값별 색상을 고정 매핑한다. 인라인 style 헥스값 금지.
const GROUP_MODE_TAG_CLASS: Record<string, string> = {
  ACTIVE_STANDBY: 'text-purple-600 bg-purple-50 border-purple-200',
};
const DEFAULT_TAG_CLASS = 'text-gray-600 bg-gray-100 border-gray-200';

// 카드 안, mt-auto pt-1.5 로 바닥에 고정
<div className="flex flex-wrap gap-1 mt-auto pt-1.5">
  <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border', GROUP_MODE_TAG_CLASS[g.haGroupMode] ?? DEFAULT_TAG_CLASS)}>
    {groupModeLabelMap.get(g.haGroupMode) ?? g.haGroupMode}
  </span>
  {g.activateYn === '0' && <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border', DEFAULT_TAG_CLASS)}>비활성화</span>}
</div>;
```

- **마크업**: `inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border`(아이콘을 함께 넣는 칩은 `font-semibold` + `gap-1`도 허용 — 예: IvrMedia 시스템 카드의 "⚡ MS" 칩). 여러 개면 `flex flex-wrap gap-1`로 감싸고, 카드 하단에 `mt-auto pt-1.5`로 고정한다.
- **색상 지정 방식 — Tailwind Record 맵 필수, 인라인 `style` 헥스값 금지**: `Record<value, string>`으로 `text-<color>-600 bg-<color>-50 border-<color>-200`을 고정 매핑하고, 매핑에 없는 값은 `DEFAULT_TAG_CLASS = 'text-gray-600 bg-gray-100 border-gray-200'`로 폴백한다. `getMasterTagList`/`getDirectionTag`/`BADGE_STYLE`처럼 `{ color, bgColor, borderColor }` 헥스 객체를 반환해 `style={{...}}`로 꽂는 기존 유틸은 **레거시 패턴** — 신규 카드나 수정 시 이 Tailwind 맵 방식으로 옮긴다.
- **색상 팔레트 의미는 그리드와 동일**([add-grid](../add-grid/SKILL.md) 참조): gray=대기·기본·비활성, blue=진행·활성, emerald=정상·성공, red=실패, amber=경고, purple=별도 구분. 같은 상태값이면 카드와 그리드에서 같은 색을 쓴다.
- **라벨 소스**: 공통코드 API의 label map(`xxxLabelMap.get(value)`)이나 `<도메인>_LABELS` record에서 가져오고, 색상 맵과는 분리한다(그리드와 동일 원칙).
- **개수 제한**: 태그가 여러 개 나올 수 있으면 `tags.slice(0, 2)`처럼 상한을 둬서 좁은 카드 폭에서 줄바꿈이 과해지지 않게 한다(IvrEndpointList.tsx 참조).
- **단순 수치는 태그 대상이 아님**: "멤버 3개", "DN 그룹 5개" 같은 카운트는 plain text로 쓰고 뱃지화하지 않는다.

## 체크리스트

- [ ] 카드 슬라이더가 독립된 `bg-white bt-shadow` 박스인가?
- [ ] 헤더가 있는 경우 아이콘+h3+카운트 배지 형식인가(없는 화면에 강제로 추가하지 않았는가)?
- [ ] 카드나 스크롤 컨테이너에 `h-full`을 주지 않았는가?
- [ ] 카드 내부 상태값 태그가 인라인 `style` 헥스값이 아니라 Tailwind `Record` 색상 맵(+ `DEFAULT_TAG_CLASS` 폴백)인가?
- [ ] 카드 클릭=선택, 더블클릭=수정 동작을 구현했는가?
- [ ] 드롭다운 메뉴 트리거에 `stopPropagation`을 걸었는가?
- [ ] 파일 수정 후 `npx eslint --fix <file-path>`를 실행했는가?
