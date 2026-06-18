# apps/taskboard 개인 작업 지침 (김태금)

> 이 문서는 TASKBOARD 담당자(김태금) 개인 작업 범위를 위한 **보조 지침서**입니다.
> 상위 규칙(`F:\KTK_PROJECT\BTADMIN\CLAUDE.md`, `BT-ADMIN-FE/AGENTS.md`, `.claude/skills/*`)을 우선 따르고,
> 이 문서는 그 규칙들 위에 추가되는 **개인 작업 규칙**입니다. 충돌 시 상위 AGENTS.md/CLAUDE.md가 우선합니다.

## 0. 경로 주의

- 루트 `CLAUDE.md`에 따르면 FE의 정식(canonical) 작업 경로는 `C:\Users\user\git\BT-ADMIN-FE`이고,
  `BT-ADMIN-BE/BT-ADMIN-FE`는 백엔드 패키징용 사본입니다.
- 이 폴더(`F:\KTK_PROJECT\BTADMIN\BT-ADMIN-FE\apps\taskboard`)에서 작업하더라도, **pnpm install / build / lint / typecheck 등 실제 명령은 정식 경로(`C:\Users\user\git\BT-ADMIN-FE`)에서 실행**되어야 합니다. 경로가 다른 사본일 경우 작업 전 사용자에게 확인합니다.

## 1. 작업 범위 (필수)

담당 작업은 다음 두 폴더 안에서만 이루어집니다.

- `BT-ADMIN-FE\apps\taskboard` (이 폴더)
- `BT-ADMIN-BE\BT-ADMIN-SERVICE-TASKBOARD`

**그 외 폴더는 수정하지 않습니다.** 예: `apps/host`, `apps/ie`, `apps/ic`, `apps/ir`, `apps/fc`, `apps/ai`, `libs/shared-*`, BFF/AUTH 등.

다만 TASKBOARD 기능상 아래와 같은 **연동 지점**은 예외적으로 손댈 수 있으나, 작업 전 사용자에게 변경 범위를 먼저 안내하고 확인을 받습니다.

- `apps/host`의 라우팅/세션 가드 등 TASKBOARD 공개 화면(`task-mgmt` 등)과 직접 연관된 최소 수정 (예: `SessionGuard.tsx`, `SharedInfoProvider.tsx`, `useApiErrorHandler.ts`) — 과거 이력상 불가피했던 영역
- `libs/shared-*`에 이미 존재하는 컴포넌트/훅을 그대로 사용하는 것은 자유롭게 가능 (수정이 아닌 "사용"은 범위 제한 대상 아님)
- `libs/shared-*`에 **신규 컴포넌트/훅을 추가**해야 하는 경우는 사전 확인 후 진행

## 2. 변경 이력 관리 (필수)

- 이 폴더에서 진행한 작업 이력은 같은 위치의 [`CHANGELOG.md`](./CHANGELOG.md)에 누적 기록합니다.
- 이미 기록된 항목은 **사용자가 명시적으로 "지워" 또는 "삭제"라고 요청하지 않는 한 그대로 유지**합니다.
  - 요약/정리/재작성 금지. 새 작업은 새 항목으로 append.
- 새 작업을 시작하기 전, `CHANGELOG.md`를 먼저 읽고 기존 구현/결정 사항(네비게이션 흐름, 데이터 구조 등)과 충돌하지 않는지 확인합니다.
- BE 쪽 변경은 `BT-ADMIN-SERVICE-TASKBOARD/CHANGELOG.md`에, FE 쪽 변경은 이 `CHANGELOG.md`에 각각 기록합니다. 한 작업이 양쪽에 걸치면 양쪽 모두에 기록합니다.

## 3. 세션 연속성 (작업 이어가기) — 필수

Claude Code 세션이 종료/재시작되어도 작업을 이어갈 수 있도록 같은 위치의 [`WORK_STATUS.md`](./WORK_STATUS.md)를 사용합니다.

- **세션 시작 시**: 이 폴더에서 작업을 시작하기 전 `WORK_STATUS.md`와 `BT-ADMIN-SERVICE-TASKBOARD/WORK_STATUS.md`를 먼저 읽고, "진행 중 작업"이 남아 있으면 그 내용을 우선 이어서 진행합니다 (사용자가 새 작업을 명시적으로 지시한 경우는 그것을 우선).
- **작업 중**: 여러 단계로 나뉘는 작업(특히 BE/FE 양쪽에 걸치거나, 한 세션에 끝내기 어려운 작업)을 시작하면 즉시 `WORK_STATUS.md`의 "진행 중 작업"에 목표·완료된 단계·남은 단계·다음에 할 일·막힌 점(확인 필요 사항)을 적어둡니다. 단계가 끝날 때마다 갱신합니다(끝날 때 한 번에 몰아서 쓰지 않음 — 세션이 예고 없이 끊길 수 있음).
- **작업 완료 시**: 완료된 항목은 `CHANGELOG.md`에 정식 기록으로 옮기고, `WORK_STATUS.md`의 "진행 중 작업"은 "없음"으로 비웁니다.
- 같은 작업이 BE/FE 양쪽에 걸치면 양쪽 `WORK_STATUS.md`에 동일한 작업명으로 현재 상태를 기록해 어느 쪽에서 세션을 열어도 맥락을 알 수 있게 합니다.

## 4. UI 가이드 (필수)

- 새 UI를 만들 때 **임의로 새로 디자인/구현하지 말고**, 먼저 솔루션 내 공통 자산에서 동일/유사 패턴을 찾아 그대로 따릅니다.
  1. `libs/shared-ui` (shadcn/ui 래퍼, custom 컴포넌트 — Button/Dialog/Drawer/Select/Card 등)
  2. `apps/fca` (레퍼런스 구현 — 페이지 레이아웃, 검색+그리드 패턴, 라우팅/breadcrumb 패턴)
  3. `AGENTS.md`에 명시된 UI 레이아웃 규칙(흰색 래퍼 + `bt-shadow`, 검색·필터+그리드 단일 래퍼 패턴 등)
- 라이브러리(Ant Design, shadcn/ui, AG-Grid, TanStack Query, React Hook Form, date-fns/dayjs, lodash 등)로 구현 가능한 기능은 직접 구현하지 말고 먼저 해당 라이브러리 기능을 확인합니다. 불가능할 때만 사용자 승인 후 직접 구현합니다.
- 신규 Drawer/Modal, Form, Grid, API 훅 작성 시 각각 `.claude/skills/add-drawer`, `add-form`, `add-grid`, `add-api` 스킬을 따릅니다.

## 5. 참고 문서

- 전체 프로젝트 가이드: `F:\KTK_PROJECT\BTADMIN\CLAUDE.md`
- 프론트엔드 공통 규칙: `BT-ADMIN-FE\AGENTS.md`
- 백엔드 짝 폴더 개인 지침: `BT-ADMIN-BE\BT-ADMIN-SERVICE-TASKBOARD\CLAUDE.md`
