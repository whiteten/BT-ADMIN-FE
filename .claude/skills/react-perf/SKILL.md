---
name: react-perf
description: React 성능 점검·리팩터 체크리스트. 번들(barrel import·lazy), async 워터폴(Promise.all), 파생상태(useEffect 오용 제거), 리렌더, 알고리즘(Set/Map) 룰을 이 저장소 맥락(React Compiler·Webpack MF·client-only SPA)으로 정리. "성능 점검", "느려요", "리렌더 너무 많음", "번들 큼", "리팩터 성능" 시 사용. 출처: Vercel agent-skills(MIT)에서 stack-agnostic 룰만 발췌·재작성.
---

# react-perf

이 저장소의 React 성능 점검·리팩터 체크리스트. 화면이 느리거나, 리렌더가 과하거나, 번들이 크거나, 성능 관점 리뷰를 할 때 이 룰을 적용한다.

## 전제 — 이 저장소 맥락

- **React Compiler 켜져 있음** → 수동 `memo`/`useMemo`/`useCallback`은 **쓰지 않는다**(AGENTS 지침). 컴파일러가 자동 메모이제이션. **이 skill은 컴파일러가 못 고치는 성능 문제만 다룬다** — 파생상태 오용, 리렌더 구조, async 워터폴, 번들, 알고리즘.
- **Webpack 5 + Module Federation, client-only SPA** → Next.js·RSC·SSR·hydration 룰은 미적용이라 제외. lazy-load는 `React.lazy`(routes.tsx에서 이미 사용).
- **새 의존성 추가 금지** → 룰 적용에 npm 패키지가 필요하면 제외했다(예: `better-all`).

## 이 skill이 다루지 않는 것 (위임)

| 주제 | 위임 |
| --- | --- |
| 수동 메모이제이션 | 안 함 — React Compiler가 처리 |
| 데이터 fetch·캐시·무효화 | [add-api](../add-api/SKILL.md) (TanStack Query) |
| 검색 필터 성능 | [add-search](../add-search/SKILL.md) (fuzzy) |
| 대용량 그리드 | [add-grid](../add-grid/SKILL.md) SSRM 섹션 |

## 우선순위 (impact 순)

1. **번들** (CRITICAL) — 초기 로딩(TTI/LCP) 직결
2. **async 워터폴** (CRITICAL) — 순차 await가 지연을 곱한다
3. **파생상태·리렌더** (HIGH~MEDIUM) — 진짜 버그(상태 drift)이자 리렌더 폭증 원인
4. **렌더링** (MEDIUM) — 브라우저 작업량
5. **알고리즘 마이크로옵트** (LOW) — hot path에서만

---

## 1. 번들 (CRITICAL)

### barrel import 직접화

큰 라이브러리는 **barrel(`index.ts`의 `export *`)에서 import하지 말고 소스 경로에서 직접 import**한다. 아이콘·컴포넌트 라이브러리는 entry에 수천~만 개 re-export가 있어, barrel을 타면 안 쓰는 모듈까지 끌어와 import에만 200~800ms가 든다.

```ts
// ❌ barrel 전체 로드
import { debounce } from 'lodash';
// ✅ 소스 직접
import debounce from 'lodash/debounce';
```

> 우리 코드의 `@/shared-util`·`Icons.tsx` 같은 **자체 barrel은 의도된 공개 API**라 유지한다. 이 룰은 `lodash`·`antd`·`date-fns` 등 **대형 외부 라이브러리**를 barrel로 통째 당길 때가 대상. `lucide-react`는 named import해도 tree-shake되도록 설정돼 있으면 OK(번들 분석으로 확인).

### 무거운 컴포넌트 lazy-load

초기 렌더에 필요 없는 큰 컴포넌트는 `React.lazy` + `Suspense`로 분할한다. 페이지 단위는 routes.tsx에서 이미 `React.lazy` 적용(라우팅 컨벤션). **무거운 비-페이지 컴포넌트**(차트·에디터·대형 모달 등)도 같은 방식으로.

### 비핵심 서드파티 지연

analytics·logging·error tracking은 상호작용을 막지 않는다. **mount 후/idle**에 로드한다(`requestIdleCallback` 등).

### 조건부·preload

- 특정 기능 활성화 시에만 큰 모듈/데이터 로드(`bundle-conditional`).
- hover/focus 시 다음에 필요할 번들 preload로 체감 지연 감소(`bundle-preload`).

---

## 2. async 워터폴 (CRITICAL)

### 독립 작업은 Promise.all

상호 의존 없는 async는 **병렬 실행**. 순차 await는 지연을 합산한다(2~10× 차이).

```ts
// ❌ 순차 — 두 지연의 합
const a = await fetchA();
const b = await fetchB();
// ✅ 병렬 — max(두 지연)
const [a, b] = await Promise.all([fetchA(), fetchB()]);
```

### 필요한 분기에서만 await

`await`를 실제 쓰는 branch 안으로 내려, 그 값이 필요 없는 경로를 막지 않는다.

### 싼 동기 조건 먼저

분기가 `await`(플래그·원격값) + **싼 동기 조건**(props·이미 로드된 state)을 함께 요구하면 **동기 조건을 먼저** 평가. 안 그러면 복합조건이 거짓이어도 async 비용을 낸다.

---

## 3. 파생상태·리렌더 (HIGH~MEDIUM)

> 이 섹션이 React Compiler로는 안 고쳐지는 핵심. 대부분 **상태 drift 버그**까지 동반한다.

### 파생값은 렌더 중 계산 (useEffect로 state 만들지 마라)

props/state로 계산 가능한 값은 state에 저장하거나 effect로 동기화하지 말고 **렌더 중 파생**한다. 추가 렌더·상태 drift 방지.

```tsx
// ❌ 중복 state + effect
const [fullName, setFullName] = useState('');
useEffect(() => setFullName(first + ' ' + last), [first, last]);
// ✅ 렌더 중 파생
const fullName = first + ' ' + last;
```

### 컴포넌트를 컴포넌트 안에서 정의하지 마라 (HIGH)

렌더마다 새 컴포넌트 타입이 생겨 React가 매번 **remount**(state·DOM 파괴)한다. 부모 변수 접근이 목적이면 props로 넘기고 컴포넌트는 밖으로 빼라.

### 사용자 액션 로직은 이벤트 핸들러에

submit·click·drag로 발생하는 side effect는 그 **이벤트 핸들러에서** 실행. "state + effect"로 모델링하면 무관한 변경에 effect가 재실행되고 액션이 중복된다.

### functional setState

현재 값 기준 업데이트는 `setX(prev => ...)`. stale closure·불필요한 deps 제거, 콜백 안정화.

### lazy state init

비싼 초기값은 `useState(() => compute())`. 함수형이 아니면 매 렌더 initializer가 돈다.

### transient 값은 useRef

마우스 좌표·interval·임시 플래그처럼 자주 바뀌고 화면에 직접 안 그리는 값은 `useState` 대신 `useRef`(리렌더 안 일으킴).

### 콜백 안에서만 읽는 state는 구독하지 마라

`searchParams`·`localStorage` 등을 **콜백 안에서만 읽으면** 컴포넌트 본문에서 구독하지 말고 사용 지점에서 읽어 불필요한 구독/리렌더 제거.

### 독립 작업은 훅 분리

deps가 다른 독립 작업을 한 훅에 묶으면 한 dep 변경에 전부 재실행. 별도 훅으로 분리.

### effect deps는 좁게(primitive)

객체 대신 primitive를 deps로. 무거운 입력엔 `useDeferredValue`로 입력 응답성 유지, 로딩 상태는 `useTransition`(`isPending`)으로.

---

## 4. 렌더링 (MEDIUM)

- **조건부 렌더는 삼항**: 조건이 `0`/`NaN` 등일 수 있으면 `&&` 대신 `cond ? <X/> : null`(falsy가 그대로 렌더되는 사고 방지).
- **정적 JSX는 컴포넌트 밖으로 hoist**: 재생성 방지.
- **긴 목록**: `content-visibility: auto`로 off-screen 렌더 지연.
- **resource hints**: 임계 자원에 `preconnect`/`prefetchDNS`/`preload`(react-dom). client-side에도 유효.

---

## 5. 알고리즘 마이크로옵트 (LOW — hot path 한정)

| 룰 | 내용 |
| --- | --- |
| Set/Map 조회 | 반복 멤버십 체크는 배열 `.includes` → `Set`/`Map` (O(n)→O(1)) |
| index map | 같은 key로 `.find` 여러 번 → `Map`으로 인덱싱 |
| 반복 결합 | `.filter().map()` 다단 → 한 루프로 |
| early return | 결과 확정 시 조기 반환 |
| RegExp hoist | 렌더 중 `new RegExp` 생성 금지 → 모듈 스코프로 |
| `toSorted` | `.sort()`(in-place 변형) 대신 `.toSorted()` — React state/props 변형 버그 방지 |
| layout thrashing | style write와 layout read(`offsetWidth` 등) 교차 금지 — 강제 reflow |

> 저임팩트. 측정으로 hot path 확인된 뒤 적용. 가독성 희생하면서 선제 적용하지 말 것.

---

## 6. advanced (React 19 훅 패턴)

- **app 1회 초기화는 컴포넌트 `useEffect([])`에 두지 마라** — remount 시 재실행. 모듈 스코프 가드 또는 entry 모듈 top-level에서.
- **effect에서 안 바뀌어야 할 콜백은 ref에 저장** — 콜백 변경에 재구독 방지.
- **`useEffectEvent`** (React 19): effect 안에서 최신 값 접근하되 deps에 넣지 않기. effect event는 identity가 매 렌더 바뀌므로 **deps 배열에 넣지 마라**. (안정화 버전 확인 후 사용)

---

## 적용 절차

1. 증상 분류 — 초기 로딩 느림 → §1, API 지연 → §2, 입력/타이핑 끊김·리렌더 폭증 → §3, 스크롤/긴목록 → §4·§5.
2. 측정 먼저 — React DevTools Profiler·Network·번들 분석으로 병목 확인 후 해당 룰 적용. 추측 최적화 금지.
3. 수동 메모로 해결하려는 충동이 들면 멈춰라 — Compiler가 담당. §3의 구조 문제인지 다시 본다.

> 출처: [Vercel agent-skills `react-best-practices`](https://github.com/vercel-labs/agent-skills) (MIT). 70룰 중 이 저장소 스택(React Compiler·Webpack MF·client-only)에 적용되는 룰만 발췌·재작성. RSC/server·SWR·수동 메모 룰은 제외.
