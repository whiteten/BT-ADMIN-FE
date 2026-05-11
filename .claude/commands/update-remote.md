---
description: 기존 remote 앱을 점검해 create-remote.js 기준으로 누락된 파일·구문을 보강하고 menu-config 잔재를 제거
argument-hint: [remote-name]
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion, TodoWrite
---

# /update-remote

`pnpm run create-remote` 스크립트로 생성됐어야 할 파일이나 host 측 등록 구문이 누락된 remote 앱을 사후 정상화합니다. 기준 스크립트: [scripts/create-remote.js](scripts/create-remote.js).

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

## 2. Remote 앱 자체 파일 점검

아래 표의 각 항목을 확인하고, 누락·차이가 있으면 `create-remote.js`의 대응 함수와 동일한 방식으로 작성한다.

| # | 파일 | 기대 상태 | 참조 함수 |
|---|------|----------|-----------|
| 1 | `apps/<APP_NAME>/package.json` | `{ "name": "@bridgetec/ui-remote-<APP_NAME>", "version": "0.0.1", "private": true }` | `createPackageJson` |
| 2 | `apps/<APP_NAME>/project.json` | `targets.build.options.styles = []`, `targets.build.configurations.production.extractLicenses = false` | `updateProjectJson` |
| 3 | `apps/<APP_NAME>/webpack-helpers.ts` | manager와 동일 | `copyWebpackHelpers` |
| 4 | `apps/<APP_NAME>/webpack.config.ts` | manager와 동일 | `updateWebpackConfig` |
| 5 | `apps/<APP_NAME>/module-federation.config.ts` | manager와 동일하되 `name: '<APP_NAME>'`만 치환 | `updateModuleFederationConfig` |
| 6 | `apps/<APP_NAME>/postcss.config.js` | manager와 동일 | `copyPostcssConfig` |
| 7 | `apps/<APP_NAME>/tailwind.config.js` | manager와 동일 | `copyTailwindConfig` |
| 8 | `apps/<APP_NAME>/.babelrc` | host와 동일 | `copyBabelrc` |
| 9 | `apps/<APP_NAME>/src/styles.css` | 빈 파일 | `clearStyleCss` |
| 10 | `apps/<APP_NAME>/src/app/app.tsx` | manager `src/app/features/sample/app.tsx` 와 동일 | `copyAppTemplate` |
| 11 | `apps/<APP_NAME>/src/app/routes.tsx` | manager `src/app/features/sample/routes.tsx`에서 주석(`//`, `/* */`)과 빈 줄 제거 + `homePath="/..."`를 `homePath="/<APP_NAME>"`로 치환한 결과 | `copyRoutesTemplate` |
| 12 | `apps/<APP_NAME>/src/app/pages/main/Main.tsx` | manager `src/app/features/sample/Main.tsx` 와 동일. 디렉토리 없으면 생성 | `copyMainTemplate` |
| 13 | `apps/<APP_NAME>/src/app/features/router/pageVariantManifest.ts` | manager `src/app/features/sample/pageVariantManifest.ts` 와 동일 | `copyPageVariantsTemplate` |
| 14 | `apps/<APP_NAME>/src/app/features/router/querySelectors.ts` | manager `src/app/features/sample/querySelectors.ts`에서 `const APP_ID = '...';`를 `const APP_ID = '<APP_NAME>';`로 치환한 결과 | `copyQuerySelectorsTemplate` |

### 주의 — 파일이 이미 존재할 때

- `routes.tsx`, `pageVariantManifest.ts`, `querySelectors.ts`, `app.tsx`, `Main.tsx`는 **운영 중에 사용자가 직접 작성한 코드가 들어있을 가능성이 높다**. 파일이 존재한다면 단순 덮어쓰지 말고:
  - 파일이 **비어있거나 sample 그대로**면 덮어쓴다.
  - 의미 있는 사용자 코드가 들어있으면 그대로 두고 "사용자 코드 있음 — 스킵" 으로 보고만 한다.
- `module-federation.config.ts`의 `exposes` / `additionalShared`는 remote가 자체적으로 추가했을 수 있으므로, `name` 필드만 비교/치환한다.

## 3. 삭제 대상 파일

| 파일 경로 | 비고 |
|----------|------|
| `apps/<APP_NAME>/src/app/nx-welcome.tsx` | 있으면 삭제 (`removeNxWelcome`) |
| `apps/<APP_NAME>/src/app/app.spec.tsx` | 있으면 삭제 (`removeAppSpec`) |
| `apps/<APP_NAME>/src/app/features/sidebar/menu-config.ts` | 있으면 삭제. 삭제 후 `sidebar/` 폴더가 비면 폴더도 제거 |
| `apps/<APP_NAME>/**/menu-config*` | 위 위치 외에 남아있는 잔재가 있는지 `Glob`로 검색해 추가 삭제 |

> menu-config 파일은 옛 `'./MenuConfig'` expose 시절의 유물이며 현재 아키텍처(`pageVariantManifest` + `querySelectors`)에서는 더 이상 사용하지 않는다. README 등 문서에 언급이 남아있어도 **실제 파일만 삭제하고 문서 수정은 이 커맨드의 범위가 아니다**.

## 4. tsconfig.base.json 정리

`compilerOptions.paths`에 `<APP_NAME>/Module` 키가 남아있으면 제거한다. 제거 후 `npx prettier --write tsconfig.base.json` 실행.

## 5. host 측 등록 점검

각 파일에 `<APP_NAME>` 등록 구문이 누락되어 있으면 추가한다. 이미 있으면 스킵.

| # | host 파일 | 등록 형식 | 참조 함수 |
|---|----------|----------|-----------|
| 1 | `apps/host/src/app/app.tsx` | `const <COMPONENT_NAME> = React.lazy(() => import('<APP_NAME>/Module').catch(() => ({ default: () => <NotFound /> })));` + 대응 `<Route path="/<APP_NAME>" element={<Layout />}>` 블록 | `addReactLazyToApp` / `addRoutePattern` |
| 2 | `apps/host/src/app/features/router/hooks/useRemoteRoutesLoader.ts` | `ROUTE_LOADERS`에 `<APP_NAME>: () => import('<APP_NAME>/Routes').catch(() => ({ routes: [] })) as Promise<RoutesModule>,` | `updateRouteLoaders` |
| 3 | `apps/host/src/app/features/router/hooks/usePageVariantManifestLoader.ts` | `VARIANT_LOADERS`에 `<APP_NAME>: () => import('<APP_NAME>/PageVariantManifest').catch(() => ({ pageVariantManifest: {} })) as Promise<PageVariantManifestModule>,` | `updateVariantLoaders` |
| 4 | `apps/host/src/app/features/router/hooks/useQuerySelectorsLoader.ts` | `SELECTOR_LOADERS`에 `<APP_NAME>: () => import('<APP_NAME>/QuerySelectors').catch(() => ({ querySelectors: {} })) as Promise<SelectorsModule>,` | `updateQuerySelectorLoaders` |
| 5 | `apps/host/webpack.config.prod.ts` | `remotes` 배열에 `['<APP_NAME>', '/remotes/<APP_NAME>/remoteEntry.js'],` | `updateWebpackConfigProd` |
| 6 | `scripts/build-selective.js` | `APPS` 배열에 `'<APP_NAME>'` | `updateBuildSelective` |
| 7 | `scripts/serve-host.js` | `REMOTE_APPS` 배열에 `'<APP_NAME>'` — 단 `<APP_NAME> === 'manager'`이면 추가하지 않음 | `updateServeHost` |

## 6. 마무리

- 수정한 TypeScript/JavaScript 파일에 대해 `npx eslint --fix <file-path>` 실행. 특히 `apps/host/src/app/app.tsx`는 반드시.
- 최종 보고: 표로 정리
  - 추가된 파일
  - 수정된 파일 (어떤 라인이 추가/치환됐는지 한 줄 요약)
  - 삭제된 파일
  - 스킵된 항목 (사용자 코드 보존)

## 안전 장치

- 위 작업 중 **삭제·덮어쓰기**가 발생하는 항목이 하나라도 있으면 실행 전 표로 묶어 사용자에게 일괄 확인을 받는다.
- 단순 추가(라인 삽입, 누락 파일 신규 생성)만 있다면 별도 확인 없이 진행한다.
- 작업 도중 예상치 못한 파일 상태(예: manager에 sample 파일이 없음)를 발견하면 즉시 중단하고 사용자에게 보고한다.
