---
name: add-search
description: 클라이언트 사이드 검색을 공통 fuzzy 유틸(@/shared-util)로 작성하는 패턴. client/server 검색 판정, fuzzyFilter·fuzzyScore API 선택, useTreeView matchesSearch 연동, Highlight 강조, AG-Grid·SSRM 예외까지. "검색 만들어줘", "검색 필터 추가", 목록·트리 검색 작성·기존 includes 검색 교체 시 사용.
---

# add-search

이 저장소의 검색 기능 작성 절차. 목록·트리 등에 검색/필터를 붙이거나 기존 `includes` 검색을 교체할 때 이 절차를 따른다.

## 핵심 규칙

1. **client-side 검색은 가능하면 fuzzy를 사용한다** — 전체 데이터가 메모리에 있는(클라이언트 필터) 검색은 `String.includes`(substring LIKE) 대신 공통 fuzzy 유틸(`@/shared-util`)을 쓴다. 한글 초성·부분 음절·gap 매칭이 자연스럽다.
2. **fuzzy 유틸을 직접 재구현하지 않는다** — `fuzzyFilter`·`fuzzyScore`·`fuzzyMatchIndices`가 `libs/shared-util/src/lib/search/fuzzy.ts`에 있다. 검증된 함수만 사용.
3. **하이라이트는 공통 `Highlight`** (`@/components/custom/Highlight`)를 쓴다 — 이미 fuzzy 인덱스 기반이라 노출(필터)과 강조 기준이 일치한다.
4. **server 페이징 검색에는 fuzzy를 쓰지 않는다** — 아래 "client vs server 판정" 참조.

## client vs server 판정 (작성 전 필수)

| 상황 | 판정 |
| --- | --- |
| 전체 목록이 한 번에 로드돼 메모리에 있음(클라이언트 필터링) | **fuzzy 사용** |
| 백엔드 `page`/`size` 페이징 + 검색어를 API에 전달 | **백엔드 검색** — fuzzy 대상 아님 |
| AG-Grid **SSRM**(Server-Side Row Model) | **백엔드 검색** — datasource에서 검색 파라미터 전달, fuzzy X |

> 부분 데이터만 클라이언트에 있는 상태에서 fuzzy를 돌리면 "검색 결과 없음"이 실제로는 다음 페이지에 있는 오탐을 낳는다. 전체가 메모리에 있을 때만 fuzzy.

## fuzzy 유틸 API

`@/shared-util`에서 import.

| 함수 | 시그니처 | 용도 |
| --- | --- | --- |
| `fuzzyFilter` | `(query, items, selector) => T[]` | 배열 필터 + **점수 내림차순 정렬**. 대부분 이것만 쓰면 됨 |
| `fuzzyScore` | `(query, text) => number` | 단일 텍스트 매치 점수. `-1`=불일치, `0` 이상=매치(클수록 우선) |
| `fuzzyMatchIndices` | `(query, text) => number[] \| null` | 매치된 글자의 원본 인덱스. 하이라이트용(보통 직접 호출 안 하고 `Highlight`가 사용) |

### 매칭 동작 (한글)

- **초성 전용 쿼리**: `"ㄷㅅㅂㄷ"` → `대시보드`
- **음절 서브시퀀스(gap 허용)**: `"대보드"` → `대시보드`
- **마지막 글자만 조합 중(prefix) 허용**: `"대시보"` → `대시보드`, `"대ㅅ"` → `대시…`
- **완성 글자는 정확 비교**: `"서리"` → `서리태` ✅, `설정 관리` ❌ (과매칭 방지)
- **영문**: 대소문자 무시 서브시퀀스 + 경계·camelCase 점수 보너스

## 패턴 1 — 배열 목록 검색

```tsx
import { fuzzyFilter } from '@/shared-util';

const filtered = fuzzyFilter(keyword, bots, (b) => b.serviceName);
// keyword가 빈 문자열이면 원본 그대로 반환
```

여러 필드를 합쳐 검색하려면 selector에서 합친다:

```tsx
const filtered = fuzzyFilter(keyword, items, (i) => `${i.name} ${i.code}`);
```

## 패턴 2 — 트리 검색 (useTreeView)

`useTreeView`의 `matchesSearch` 콜백에서 `fuzzyScore(... ) >= 0`을 반환한다. 트리는 점수 정렬을 하지 않고 **필터만** 한다(트리 순서·계층 유지).

```tsx
const { items, rootProps } = useTreeView<Node>({
  data: treeData,
  getId: (n) => n.key,
  getChildren: (n) => n.children,
  getName: (n) => n.label,
  searchText: search,
  matchesSearch: (n, kw) => fuzzyScore(kw, n.label) >= 0,
  // ...
});
```

여러 필드 검색(leaf의 부가 필드 등)은 OR로:

```tsx
matchesSearch: (n, kw) => {
  if (n.data) return fuzzyScore(kw, n.data.name) >= 0 || fuzzyScore(kw, n.data.code ?? '') >= 0;
  return fuzzyScore(kw, n.label) >= 0;
},
```

행 라벨 강조는 `Highlight`:

```tsx
<TreeLabel selected={isSelected}>
  <Highlight text={node.label} query={search} />
</TreeLabel>
```

## 패턴 3 — 하이라이트만 필요할 때

매치 위치 강조는 `Highlight`에 검색어만 넘기면 된다(별도 인덱스 계산 불필요).

```tsx
import { Highlight } from '@/components/custom/Highlight';

<Highlight text={label} query={search} />
```

substring 입력은 연속 구간이 단일 `<mark>`로, 초성/흩어진 매치는 음절별로 강조된다.

## 예외 / 주의

- **AG-Grid 목록**: 그리드 자체 quickFilter/필터 기능이 있다. fuzzy가 필요하면 통째로 교체하지 말고 `doesExternalFilterPass`에 `fuzzyScore(...) >= 0`을 연결한다. ClientSide 그리드에 한함(SSRM은 백엔드 검색).
- **정렬**: `fuzzyFilter`는 점수 내림차순으로 재정렬한다. 원본 순서를 유지해야 하는 화면(트리·고정 순서 목록)은 `fuzzyScore`로 필터만 하고 정렬은 하지 않는다.
- **검색 대상 텍스트**: 사용자에게 보이는 라벨을 기준으로 검색한다. 내부 코드·ID로도 찾게 하려면 selector에 합치되, 그 필드는 화면에 노출되지 않으면 하이라이트 대상에서 제외(혼란 방지).
- **빈 쿼리**: `fuzzyFilter`는 원본 전체, `fuzzyScore`는 `0`(전체 통과), `Highlight`는 원본 텍스트를 그대로 반환한다 — 별도 빈 값 가드 불필요.

## 의존성

fuzzy 유틸은 `es-hangul`(자모 분해)에 의존한다. 이미 설치돼 있으며 추가 라이브러리(fuse.js·korean-regexp 등)를 들이지 않는다.
