---
description: 기존 remote 앱을 점검해 create-remote.js 기준으로 누락된 파일·구문을 보강하고 menu-config 잔재를 제거
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
- **manager에서 복사 + 치환**하는 함수 (예: `updateModuleFederationConfig`의 `name` 치환, `copyQuerySelectorsTemplate`의 `APP_ID` 치환, `copyRoutesTemplate`의 `homePath` 치환·주석 제거): 함수 본문의 치환 규칙을 그대로 적용한 결과와 대상 파일을 비교.
- **JSON 구조를 수정**하는 함수 (예: `createPackageJson`, `updateProjectJson`): 함수가 작성·수정하는 필드만 확인 (사용자가 추가한 다른 필드는 건드리지 않는다).
- **host 파일에 라인 추가**하는 함수 (예: `addReactLazyToApp`, `addRoutePattern`, `updateRouteLoaders`, `updateVariantLoaders`, `updateQuerySelectorLoaders`, `updateWebpackConfigProd`, `updateBuildSelective`, `updateServeHost`): 해당 라인이 이미 host 파일에 존재하는지 grep으로 확인. 없으면 함수와 동일한 패턴으로 삽입.
- **파일 삭제** 함수 (예: `removeNxWelcome`, `removeAppSpec`): 파일이 남아있으면 삭제.
- **`updateBuildScripts`의 분기**: `serve-host.js`는 `<APP_NAME> === 'manager'`이면 추가하지 않는 예외가 있음. 이런 함수 본문의 if문도 반드시 그대로 따른다.

> 함수 이름·log 메시지·복사 경로가 명확해 별도 표 없이도 분석 가능. 분석 결과가 모호하면 사용자에게 확인을 요청한다.

### 주의 — 파일이 이미 존재할 때

- `routes.tsx`, `pageVariantManifest.ts`, `querySelectors.ts`, `app.tsx`, `Main.tsx`는 **운영 중에 사용자가 직접 작성한 코드가 들어있을 가능성이 높다**. 파일이 존재한다면 단순 덮어쓰지 말고:
  - 파일이 **비어있거나 sample 그대로**면 덮어쓴다.
  - 의미 있는 사용자 코드가 들어있으면 그대로 두고 "사용자 코드 있음 — 스킵" 으로 보고만 한다.
- `module-federation.config.ts`의 `exposes` / `additionalShared`는 remote가 자체적으로 추가했을 수 있으므로, `name` 필드만 비교/치환한다.

## 3. create-remote.js에 없는 정리 작업 — menu-config 잔재 제거

`create-remote.js`는 신규 생성용 스크립트라 과거 잔재 제거 로직이 없다. 이 항목은 이 커맨드가 별도로 처리한다.

| 파일 경로 | 비고 |
|----------|------|
| `apps/<APP_NAME>/src/app/features/sidebar/menu-config.ts` | 있으면 삭제. 삭제 후 `sidebar/` 폴더가 비면 폴더도 제거 |
| `apps/<APP_NAME>/**/menu-config*` | 위 위치 외에 남아있는 잔재가 있는지 `Glob`로 검색해 추가 삭제 |

> menu-config 파일은 옛 `'./MenuConfig'` expose 시절의 유물이며 현재 아키텍처(`pageVariantManifest` + `querySelectors`)에서는 더 이상 사용하지 않는다. README 등 문서에 언급이 남아있어도 **실제 파일만 삭제하고 문서 수정은 이 커맨드의 범위가 아니다**.

## 4. tsconfig.base.json 정리

`compilerOptions.paths`에 `<APP_NAME>/Module` 키가 남아있으면 제거한다. (create-remote.js의 `removeTsConfigPath` 참조.) 제거 후 `npx prettier --write tsconfig.base.json` 실행.

## 5. 마무리

- 수정한 TypeScript/JavaScript 파일에 대해 `npx eslint --fix <file-path>` 실행. 특히 `apps/host/src/app/app.tsx`는 반드시.
- 최종 보고: 표로 정리
  - 추가된 파일
  - 수정된 파일 (어떤 라인이 추가/치환됐는지 한 줄 요약)
  - 삭제된 파일
  - 스킵된 항목 (사용자 코드 보존)

## 안전 장치

- 위 작업 중 **삭제·덮어쓰기**가 발생하는 항목이 하나라도 있으면 실행 전 표로 묶어 사용자에게 일괄 확인을 받는다.
- 단순 추가(라인 삽입, 누락 파일 신규 생성)만 있다면 별도 확인 없이 진행한다.
- create-remote.js 분석 중 해석이 모호하거나 예상치 못한 파일 상태(예: manager에 sample 파일이 없음)를 발견하면 즉시 중단하고 사용자에게 보고한다.
