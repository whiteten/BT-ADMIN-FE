---
description: 기존 remote 앱을 점검해 create-remote.js 기준으로 누락된 파일·구문을 보강하고 menu-config 잔재 제거 및 뱃지 아이콘 등록 누락을 점검
argument-hint: [remote-name]
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion, TodoWrite
---

# /update-remote

`pnpm run create-remote` 스크립트로 생성됐어야 할 파일이나 host 측 등록 구문이 누락된 remote 앱을 사후 정상화합니다. 기준 스크립트: [scripts/create-remote.js](scripts/create-remote.js).

## SoT 원칙 — 점검 항목은 create-remote.js가 단일 출처

이 커맨드는 점검 항목 표를 따로 들고 있지 않습니다. **매 실행마다 [scripts/create-remote.js](scripts/create-remote.js)를 직접 읽고**, `createRemote()` 함수에서 호출되는 함수들을 순서대로 분석해 동일한 작업을 "이미 되어 있는지" 검사하는 방식으로 동작합니다. create-remote.js가 수정되면 별도 동기화 없이 자동으로 반영됩니다.

## 동작 원칙

- 단순 점검 도구다. 누락·차이가 있을 때만 수정한다. 멀쩡한 파일을 무조건 manager로 덮어쓰지 않는다.
- 차이가 발견되면 어떤 파일을 어떻게 바꿀지 표로 한 번에 보고하고, 사용자에게 일괄 진행 여부만 확인한다 (각 항목마다 따로 묻지 않는다).
- 점검 진행 상황은 `TodoWrite`로 단계별 추적한다.
- 사용자가 명시적으로 요청하기 전까지 **커밋하지 않는다**.
- 누락 항목이 하나도 없으면 "이미 정상" 메시지만 출력하고 종료한다.

## 1. 대상 remote 선택

1. 인자 `$1`이 주어졌으면 그것을 `<APP_NAME>`으로 사용한다.
2. 인자가 없으면 `apps/` 디렉토리를 읽어 `host`를 **제외한** 폴더 목록을 만든 뒤, `AskUserQuestion`으로 선택지로 제시한다.

   현재 remote 후보: !`ls apps/`

3. 선택된 이름을 `<APP_NAME>`, 첫 글자만 대문자로 변환한 값을 `<COMPONENT_NAME>`이라 한다.

## 2. create-remote.js 분석 — 점검 항목 도출

`scripts/create-remote.js`를 읽고 `createRemote()` 함수의 본문을 위에서 아래로 따라가며, 호출되는 각 함수가 **어떤 파일에 어떤 변경을 가하는지** 파악한다. 각 함수마다 점검 항목 한 개를 만들고 TodoWrite로 등록한다.

함수 분석 시 다음 사항을 기준으로 점검 로직을 도출한다:

- **manager에서 복사하는 함수** (예: `copyWebpackHelpers`, `copyPostcssConfig`, `copyTailwindConfig`, `updateWebpackConfig`): 대상 파일이 존재하고 manager 원본과 바이트 단위로 동일한지 확인. 다르면 manager 내용으로 덮어쓰기.
- **manager에서 복사 + 치환**하는 함수 (예: `updateModuleFederationConfig`의 `name` 치환, `copyQuerySelectorsTemplate`의 `APP_ID` 치환, `copyRoutesTemplate`의 주석 제거): 함수 본문의 치환 규칙을 그대로 적용한 결과와 대상 파일을 비교.
- **JSON 구조를 수정**하는 함수 (예: `createPackageJson`, `updateProjectJson`): 함수가 작성·수정하는 필드만 확인 (사용자가 추가한 다른 필드는 건드리지 않는다).
- **host 파일에 라인 추가**하는 함수 (예: `addReactLazyToApp`, `addRoutePattern`, `updateRouteLoaders`, `updateVariantLoaders`, `updateQuerySelectorLoaders`, `updateWebpackConfigProd`, `updateBuildSelective`, `updateServeHost`): 해당 라인이 이미 host 파일에 존재하는지 grep으로 확인. 없으면 함수와 동일한 패턴으로 삽입.
- **파일 삭제** 함수 (예: `removeNxWelcome`, `removeAppSpec`): 파일이 남아있으면 삭제.
- **`updateBuildScripts`의 분기**: `serve-host.js`는 `<APP_NAME> === 'manager'`이면 추가하지 않는 예외가 있음. 이런 함수 본문의 if문도 반드시 그대로 따른다.

> 함수 이름·log 메시지·복사 경로가 명확해 별도 표 없이도 분석 가능. 분석 결과가 모호하면 사용자에게 확인을 요청한다.

### 주의 — 파일이 이미 존재할 때

- `routes.tsx`, `pageVariantManifest.ts`, `querySelectors.ts`, `app.tsx`는 **운영 중에 사용자가 직접 작성한 코드가 들어있을 가능성이 높다**. 파일이 존재한다면 단순 덮어쓰지 말고:
  - 파일이 **비어있거나 sample 그대로**면 덮어쓴다.
  - 의미 있는 사용자 코드가 들어있으면 그대로 두고 "사용자 코드 있음 — 스킵" 으로 보고만 한다.
- `module-federation.config.ts`의 `exposes` / `additionalShared`는 remote가 자체적으로 추가했을 수 있으므로, `name` 필드만 비교/치환한다.

## 3. create-remote.js에 없는 정리 작업 — 잔재 제거 및 컨벤션 점검

`create-remote.js`는 신규 생성용 스크립트라 과거 잔재 제거나 코딩 컨벤션 점검 로직이 없다. 이 항목은 이 커맨드가 별도로 처리한다. 각 항목마다 TodoWrite 항목을 따로 등록한다.

### 3-1. menu-config 잔재 제거

| 파일 경로 | 비고 |
|----------|------|
| `apps/<APP_NAME>/src/app/features/sidebar/menu-config.ts` | 있으면 삭제. 삭제 후 `sidebar/` 폴더가 비면 폴더도 제거 |
| `apps/<APP_NAME>/**/menu-config*` | 위 위치 외에 남아있는 잔재가 있는지 `Glob`로 검색해 추가 삭제 |

> menu-config 파일은 옛 `'./MenuConfig'` expose 시절의 유물이며 현재 아키텍처(`pageVariantManifest` + `querySelectors`)에서는 더 이상 사용하지 않는다. README 등 문서에 언급이 남아있어도 **실제 파일만 삭제하고 문서 수정은 이 커맨드의 범위가 아니다**.

### 3-2. PageHeader → useBreadcrumbStore 패턴 마이그레이션

페이지의 breadcrumb은 host SubHeader가 그리도록 표준이 바뀌었다. 페이지에서는 `useBreadcrumbStore`에 push/clear만 한다(상세 규칙: [CLAUDE.md "페이지 Breadcrumb 패턴"](../../CLAUDE.md), [DEVELOPER_GUIDE.md "페이지 레이아웃 가이드 → Breadcrumb 표준 절차"](../../doc/DEVELOPER_GUIDE.md)). 이전 표준이었던 `PageHeader` 컴포넌트는 `libs/shared-ui`에서 제거됐으므로, 페이지 파일에 import가 남아있으면 빌드가 실패한다.

검사 대상은 `apps/<APP_NAME>/**/*.tsx`. 다음 두 패턴을 `Grep`으로 검색한다:

| 패턴 | 처리 |
|------|------|
| `import PageHeader from '@/components/custom/PageHeader';` | 발견된 모든 파일에서 import 라인 제거 |
| `<PageHeader ... />` (JSX 호출, loading early-return 분기 포함 다중 호출 가능) | JSX에서 해당 라인 모두 제거 |

검출된 각 페이지마다 다음 단계를 적용한다:

1. `useEffect`가 import되어 있지 않으면 react import에 추가
2. `useBreadcrumbStore` 를 `@/shared-store` 에서 import
3. 컴포넌트 본문 시작부에 push/clear 패턴 삽입 — 본문 시작부 위치는 hook 순서가 깨지지 않도록 가장 위에 둔다:
   ```ts
   const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
   const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
   useEffect(() => {
     setBreadcrumb(breadcrumb /*, params */);
     return () => clearBreadcrumb();
   }, [/* 동적 deps */, setBreadcrumb, clearBreadcrumb]);
   ```
4. `breadcrumb` 상수가 컴포넌트 내부에 정의되어 있다면 모듈 레벨로 끌어올린다(useEffect deps 안정화)
5. 동적 라벨(`:botName` 등)이 있으면 `setBreadcrumb`의 두 번째 인자에 `params` 전달 + deps에 fetch 결과 포함
6. `isPublic` 등 분기 케이스는 useEffect 내부에서 조건 분기로 items 선택 + deps에 분기 키 포함

자동 변환 범위:

- **자동 진행**: 정적 const breadcrumb + 단일 `<PageHeader />` 호출 (BotList 등 패턴) — 위 6단계를 그대로 적용
- **확인 후 진행**: 동적 `params` 호출 / `isPublic` 분기 / loading early-return 다중 `<PageHeader />` 호출 — 변환 계획을 표로 보여주고 사용자에게 일괄 확인을 받는다

변환 후 해당 파일에 `npx eslint --fix` 실행 (마무리 섹션의 일괄 처리에 포함).

> PageHeader 잔재는 코드만 정리한다. README 등 문서에 언급이 남아있어도 **실제 코드만 마이그레이션하고 문서 수정은 이 커맨드의 범위가 아니다**.

### 3-3. 구버전 Main 페이지·main 라우트·remote homePath 잔재 제거

`create-remote.js`가 더 이상 remote에 main 페이지를 만들지 않는 정책으로 변경됐다. 메인 페이지는 host의 `/`가 단독으로 제공하며, 모든 remote의 루트(`/<APP_NAME>`) 진입과 404 fallback은 host `/`로 redirect된다. 기존 remote에 남아있는 다음 잔재를 정리한다.

| 점검 대상 | 처리 |
|----------|------|
| `apps/<APP_NAME>/src/app/pages/main/Main.tsx` 파일 존재 | 파일 삭제. `pages/main/` 폴더가 비면 폴더도 제거 |
| `apps/<APP_NAME>/src/app/routes.tsx`의 `Main` lazy import (`const Main = React.lazy(() => import('./pages/main/Main'));` 패턴) | 라인 제거 |
| `apps/<APP_NAME>/src/app/routes.tsx`의 index redirect 대상 (`<Navigate to="main" replace />` 또는 `<Navigate to="/main" replace />` 등 host 루트가 아닌 값) | `<Navigate to="/" replace />`로 변경 |
| `apps/<APP_NAME>/src/app/routes.tsx`의 main 라우트 항목 (`{ path: 'main', element: <Main /> }` 형태) | 해당 라우트 객체 제거 |
| `apps/<APP_NAME>/src/app/routes.tsx`의 `NotFound homePath` (`homePath="/<APP_NAME>"` 등 host 루트가 아닌 값) | `homePath="/"`로 변경 |

routes.tsx는 §2의 "사용자 코드 있음 — 스킵" 정책으로 자동 덮어쓰기 대상에서 빠지므로 위 패턴들은 §3에서 명시적으로 검사·치환한다. 변경 후 해당 파일에 `npx eslint --fix` 실행(마무리 섹션의 일괄 처리에 포함).

> 정책 배경: host의 `/`에 공통 메인 페이지([apps/host/src/app/pages/Main.tsx](../../apps/host/src/app/pages/Main.tsx))를 두고, 모든 remote가 자체 main 페이지를 가지지 않도록 단일화했다. 변경 사유에 대한 자세한 맥락은 [CLAUDE.md "라우팅(routes.tsx) 컨벤션"](../../CLAUDE.md) 참조.

### 3-4. remote 앱 뱃지 아이콘 등록 점검

사이드바 좌측 60px 컬럼([PanelAppBadgeStrip.tsx](../../apps/host/src/app/features/layout/panel/PanelAppBadgeStrip.tsx))의 remote 뱃지 아이콘은 `create-remote.js`가 자동 처리하지 않는다. 미등록 상태면 lucide `SquareDashed` placeholder가 fallback으로 표시되므로, 신규 remote가 정식 출시되기 전 다음 3개 항목이 모두 갖춰져야 한다(상세 절차: [CLAUDE.md "생성 후 수동 단계 — remote 앱 뱃지 아이콘"](../../CLAUDE.md), [DEVELOPER_GUIDE.md "수동 단계 — remote 앱 뱃지 아이콘 추가"](../../doc/DEVELOPER_GUIDE.md)).

세 항목을 차례대로 점검한다:

| # | 점검 대상 | 점검 방법 |
|---|----------|----------|
| ① | SVG 자산 | `libs/shared-ui/src/assets/images/icon/icon-remote-<APP_NAME>.svg` 파일 존재 여부 |
| ② | Icons.tsx export | `libs/shared-ui/src/components/custom/Icons.tsx`에 `IconRemote<COMPONENT_NAME>` export 라인 존재 여부 (`Grep`으로 확인) |
| ③ | PanelAppBadgeStrip 매핑 | `apps/host/src/app/features/layout/panel/PanelAppBadgeStrip.tsx`의 `APP_BADGE_ICONS` 객체에 `<APP_NAME>:` 키 존재 여부 |

상태별 처리:

- **① 누락** — SVG는 디자인팀에 의뢰해야 하므로 커맨드가 자동 처리할 수 없다. 보고 표에 "디자인팀 의뢰 필요"로 남기고 ②·③은 **자동 처리하지 않는다**(SVG 없이 export·매핑만 추가하면 빌드 실패). 사용자에게 다음 안내문구를 출력한다:
  > ⚠️ `<APP_NAME>` remote의 뱃지 아이콘 SVG가 없습니다. 디자인팀에 제품 컨셉에 맞는 아이콘을 의뢰하세요. 기존 자산(`icon-remote-fca.svg`, `icon-remote-ipron.svg`)과 동일한 스펙(단색·여백·viewBox)을 가이드로 첨부할 것. 받은 파일을 `libs/shared-ui/src/assets/images/icon/icon-remote-<APP_NAME>.svg`로 저장한 뒤 `/update-remote <APP_NAME>`을 다시 실행하면 export·매핑은 자동으로 추가됩니다.
- **① 존재, ② 누락** — Icons.tsx 하단 `IconRemoteFca`/`IconRemoteIpron` export 옆에 동일 패턴으로 한 줄 추가:
  ```ts
  export { ReactComponent as IconRemote<COMPONENT_NAME> } from '../../assets/images/icon/icon-remote-<APP_NAME>.svg';
  ```
- **①·② 존재, ③ 누락** — PanelAppBadgeStrip.tsx의 import에 `IconRemote<COMPONENT_NAME>` 추가하고, `APP_BADGE_ICONS` 객체에 `<APP_NAME>: IconRemote<COMPONENT_NAME>,` 항목 추가.
- **세 항목 모두 존재** — 스킵.

> menu-config 잔재나 PageHeader 마이그레이션과 달리 이 항목은 디자인 자산 의존성이 있어 자동 완료가 보장되지 않는다. 보고 시 ① 누락 케이스는 **반드시 별도 경고 블록으로 강조**해 사용자가 디자인 의뢰 단계를 놓치지 않게 한다.

### 3-5. 폴더 구조·파일명·routes.tsx 컨벤션 점검 (CLAUDE.md 기준)

`create-remote.js`는 골격만 생성하므로, 이후 운영하며 추가된 페이지·feature가 프로젝트 표준에서 벗어났는지는 점검하지 않는다. 이 항목은 대상 remote 전체를 **CLAUDE.md 기준**으로 점검한다.

SoT는 다음 두 문서이며 **fca가 레퍼런스 구현**이다:

- [CLAUDE.md](../../CLAUDE.md) — "파일 구조 컨벤션", "라우팅(routes.tsx) 컨벤션"
- [DEVELOPER_GUIDE.md](../../doc/DEVELOPER_GUIDE.md) — "2. 프로젝트 구조 이해하기 → 앱 내부 구조", "20. 라우팅(routes.tsx) 가이드"

점검 항목은 위 문서를 **매 실행마다 직접 읽어 도출**한다(문서가 갱신되면 별도 동기화 없이 자동 반영). 아래는 핵심 점검 포인트다.

#### 폴더 구조

| 점검 대상 | 기준 |
|----------|------|
| 페이지 위치 | `apps/<APP_NAME>/src/app/pages/<route-group>/`. `features/<feature>/pages/` 등 비표준 위치에 있으면 `pages/` 하위로 이동 대상 |
| 라우트 그룹 폴더 | `pages/` 1단계 하위는 라우트 그룹 폴더(kebab-case)로 분류 |
| 상세 페이지 탭 | 탭 컴포넌트는 `pages/`가 아니라 `features/<feature>/tabs/`에 위치 |
| 타입 파일 | `features/<feature>/types/` 아래 `index.ts`(barrel) + 도메인별 `<domain>.ts`. `<domain>.types.ts` 서픽스 사용 시 rename + barrel 정리 대상 |
| 라우팅 보조 모듈 | 세션 핸들러·variant manifest·query selector 등은 `features/router/`에 위치 |
| `.gitkeep` 잔재 | 빈 폴더 표시용 `.gitkeep`이 실제 파일과 함께 남아있으면 제거 |

#### 파일명·네이밍

| 점검 대상 | 기준 |
|----------|------|
| 페이지 컴포넌트명 | `.tsx` 파일명·lazy 변수명·`default export` 이름을 **기능명만**으로 통일. `Page` 접미사(`RoleCreatePage` 등) 금지 → `RoleCreate` |
| 대소문자 | 페이지 파일 `PascalCase`, 라우트 그룹·path 세그먼트 폴더 `kebab-case` |

#### routes.tsx 컨벤션

`routes.tsx`는 §2의 "사용자 코드 있음 — 스킵" 정책 대상이지만, 아래 컨벤션 항목은 §3-3과 마찬가지로 패턴 단위로 명시 점검한다. DEVELOPER_GUIDE.md "20. 라우팅(routes.tsx) 가이드"의 **정규화 체크리스트**를 그대로 적용한다:

- 모든 페이지가 `React.lazy(() => import('./pages/...'))`로 선언 (직접 import 없음)
- 페이지 파일명·lazy 변수명에 `Page` 접미사 없음
- `routes`가 named export, 최상위가 단일 `path: '/'` 루트
- 2-depth 이상 그룹이 `element: <Outlet />` + `children` 구조
- 각 그룹 `children` 첫 항목이 `index` redirect(`Navigate ... replace`)
- 배열 마지막 항목이 catch-all `{ path: '*', element: <NotFound homePath="/" /> }`
- path 세그먼트 kebab-case, 동적 세그먼트 `:camelCase`
- 라우팅 보조 코드가 `features/router/`에 있고 routes.tsx는 import만 함
- 중복 라우트 묶음이 모듈 스코프 상수로 추출됨

#### 처리 방식 — 모두 "확인 후 진행"

폴더·파일 rename, 파일 이동, 컴포넌트명 변경은 **import 경로·라우트 트리·`routes.tsx` lazy 선언이 연쇄로 수정**되어야 하므로 자동 진행하지 않는다. 위반 항목을 다음 형식의 표로 한 번에 보고하고 사용자에게 **일괄 확인**을 받은 뒤 진행한다:

| 위반 항목 | 현재 | 표준 | 연쇄 수정 범위 |
|----------|------|------|--------------|
| 예: 페이지명 | `NodeListPage.tsx` | `NodeList.tsx` | routes.tsx lazy 선언·import 경로 |

위반이 하나도 없으면 "컨벤션 정상"으로만 보고한다.

> 컨벤션 위반은 빌드를 깨뜨리지 않는 경우가 많아 자동 수정 시 무리한 변경이 될 수 있다. 반드시 사용자 확인을 거치고, 변경 후 영향받은 모든 파일에 `npx eslint --fix`를 실행한다(마무리 섹션의 일괄 처리에 포함). rename·이동 후에는 깨진 import가 없는지 `npx nx typecheck <APP_NAME>`로 검증한다.

## 4. tsconfig.base.json 정리

`compilerOptions.paths`에 `<APP_NAME>/Module` 키가 남아있으면 제거한다. (create-remote.js의 `removeTsConfigPath` 참조.) 제거 후 `npx prettier --write tsconfig.base.json` 실행.

## 5. 마무리

- 수정한 TypeScript/JavaScript 파일에 대해 `npx eslint --fix <file-path>` 실행. 특히 `apps/host/src/app/app.tsx`는 반드시.
- 최종 보고: 표로 정리
  - 추가된 파일
  - 수정된 파일 (어떤 라인이 추가/치환됐는지 한 줄 요약)
  - 삭제된 파일
  - 스킵된 항목 (사용자 코드 보존)
  - **디자인 자산 의뢰 필요** (3-3에서 뱃지 아이콘 SVG가 누락된 경우 — 별도 경고 블록으로 강조)

## 안전 장치

- 위 작업 중 **삭제·덮어쓰기**가 발생하는 항목이 하나라도 있으면 실행 전 표로 묶어 사용자에게 일괄 확인을 받는다.
- 단순 추가(라인 삽입, 누락 파일 신규 생성)만 있다면 별도 확인 없이 진행한다.
- create-remote.js 분석 중 해석이 모호하거나 예상치 못한 파일 상태(예: manager에 sample 파일이 없음)를 발견하면 즉시 중단하고 사용자에게 보고한다.
