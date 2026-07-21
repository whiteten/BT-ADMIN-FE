---
name: add-chromeless
description: 인증은 필요하나 Layout(헤더/사이드바/패널)이 없는 chromeless 화면(녹취 재생 팝업·감청 팝업·워크플로우 편집기 등 새창/standalone) 작성 절차. routes.tsx leaf를 Chromeless 래퍼로 감싸고, (새창이면) window.open 경로를 Layout 통과 경로(/<remote>/...)로 작성. host에 전용 prefix 라우트를 만들지 않는다. "팝업 화면 추가", "헤더 없는 새창", "chromeless 화면", "전체화면 편집기 새창" 요청 시 사용.
---

# add-chromeless

이 저장소에서 **chrome(host 헤더·사이드바·패널) 없이 본문만 렌더되는 화면**을 추가하는 절차. "녹취 재생 새창", "워크플로우 편집기 팝업", "헤더 없는 전체화면" 등의 요청 시 따른다.

핵심 원칙: **chromeless 여부는 화면(remote)이 routes.tsx에서 스스로 선언**한다. host는 건드리지 않는다. 신규 chromeless 화면마다 host에 전용 prefix 라우트(`/aoe-workflow`·`/vel-player` 등)를 추가하던 옛 방식을 대체한다.

## 0. 판정 — chromeless가 맞는가

작성 전 반드시 판정한다:

| 상황 | 결론 |
| --- | --- |
| 인증 필요 + host 헤더/사이드바/패널 불필요(새창·standalone 편집기·재생 팝업) | ✅ 이 스킬 |
| 사용자가 버튼으로 잠깐 헤더만 접고 펴는 일반 화면 | ❌ `chromeCollapsed`(`toggleChrome`) — 이 스킬 아님 |
| **세션 없이 접근하는 공개 화면**(공개 전광판 등) | ❌ 공개 라우트 `handle: { public: true }` 선언 — host `PublicRouteGate`가 Chromeless를 **강제**하므로 래퍼 불필요 (AGENTS.md "라우팅 컨벤션" 핵심 규칙 14 참조) |
| 로그인 등 **비인증** 단독 화면 | ❌ host `/login`처럼 가드 밖 별도 라우트 |
| 일반 화면 위에 띄우는 모달·드로어 | ❌ Layout 안 페이지에서 antd `Modal`/`Drawer` 직접 사용 |

chromeless는 **인증 가드는 통과하되 Layout 셸만 벗는** 화면이다(가드는 그대로 탄다).

## 메커니즘

- SoT: `useLayoutStore`(`@/shared-store`)의 `chromeless` 상태 + `useChromeless()` 훅.
- host `Layout`이 `chromeless`를 구독 → true면 헤더/사이드바/패널/펼치기 버튼을 제거하고 본문만 full-bleed 렌더. antd 컨텍스트(`ConfigProvider`+`App`)는 유지하므로 `useModal`은 그대로 동작(`toast`는 antd와 무관한 자체 구현이라 어디서든 동작).
- 페이지는 host `/<remote>` 경로(= Layout을 거치는 경로)로 진입해야 신호가 Layout에 닿는다.
- 진입 선언은 `Chromeless` 래퍼(`@/components/custom/Chromeless`)로 한다. 래퍼가 `useChromeless()` 호출 + lazy children을 자체 `Suspense`로 감싸 깜빡임·재마운트를 막는다(아래 함정 참조).

레퍼런스 구현:
- `apps/aoe` 워크플로우 편집기 — `routes.tsx`의 `workflow/:agentId` + `pages/agent-config/AgentList.tsx`(window.open)
- `apps/vel` 녹취재생·감청·실시간재생 — `routes.tsx`의 `rec-search/player`·`monitoring/eavesdrop`·`monitoring/realtime-player`

## Step 1. routes.tsx leaf를 Chromeless로 감싼다

해당 remote의 `routes.tsx`에서 chromeless로 띄울 leaf를 `Chromeless` 래퍼로 감싼다. pv 소켓은 그대로 유지(변형·custom 키 보존).

```tsx
import Chromeless from '@/components/custom/Chromeless';

const WorkflowEdit = React.lazy(() => import('./pages/workflow/WorkflowEdit'));

// 최종 경로 /<remote>/workflow/:agentId — host /<remote> 아래라 Layout을 거친다
{ path: 'workflow/:agentId', element: <Chromeless>{pv('workflow/:agentId', WorkflowEdit)}</Chromeless> },
```

- **host에 별도 prefix 라우트(`/aoe-workflow` 등)를 만들지 말 것.** 그 방식을 없애려고 이 메커니즘이 있다.
- pv 소켓을 쓰지 않는 leaf라면 `<Chromeless><Page /></Chromeless>`로 감싼다.
- **공개 라우트(`handle: { public: true }`) leaf는 감싸지 않는다** — host `PublicRouteGate`가 Chromeless를 강제하므로 중복.
- 페이지 컴포넌트 안에서 `useChromeless`를 직접 호출하지 않는다(래퍼가 담당 — 함정 참조).

## Step 2. 진입 경로 작성

- **새창**: 여는 쪽에서 `window.open`으로 **Layout 통과 경로**(`/<remote>/...`)를 연다. 창 크기·named window 옵션은 그대로 유지.
  ```tsx
  window.open(`/aoe/workflow/${agentId}`, '_blank', 'noopener,noreferrer');
  ```
- **같은 탭 네비게이션**: `navigate('/aoe/workflow/...')`. unmount 시 chrome이 복귀한다.

## Step 3. 페이지 컴포넌트

- 페이지에서 `ConfigProvider`/`App`로 다시 감싸지 말 것 — Layout chromeless 분기가 이미 제공한다(이중 래핑 불필요).
- 전체화면이 필요하면 `w-screen h-screen` 등 자체 클래스로 처리(Layout chromeless main은 padding·배경 없는 full-bleed).

## 함정 체크리스트

- [ ] **반드시 `Chromeless` 래퍼로 감쌌는가** — 래퍼 없이 lazy 페이지 내부에서 `useChromeless`를 호출하면, 페이지가 lazy 로딩되는 동안 Layout이 chrome을 먼저 그려 **로딩 구간 내내 chrome이 보이는 깜빡임**이 생긴다. 래퍼는 non-lazy라 Layout과 같은 커밋에 mount되고 lazy children의 suspend를 자체 Suspense로 가둬 `useLayoutEffect`가 페인트 전에 chrome을 제거한다.
- [ ] host `/<remote>` 경로(Layout 통과)로 진입하는가 — 별도 host prefix 라우트를 만들지 않았는가
- [ ] 페이지에서 `ConfigProvider`/`App`을 다시 감싸지 않았는가 (Layout이 제공)
- [ ] `chromeless`는 persist 대상이 아니다 — `useLayoutStore`의 `partialize`(chromeCollapsed만 persist)를 건드리지 말 것
- [ ] **Layout을 수정한다면 chromeless를 별도 return(다른 트리)으로 분기하지 말 것** — Outlet의 부모 사슬이 바뀌어 chromeless 토글 시 페이지가 언마운트+재마운트된다(localStorage를 1회 소비하고 삭제하는 페이지가 빈 값으로 재초기화되는 버그). 단일 트리를 유지하고 chrome 조각만 `{cond && ...}`로 조건부 렌더한다
- [ ] 같은 탭에서 chromeless → 일반 화면 이동 시 chrome이 정상 복귀하는가
