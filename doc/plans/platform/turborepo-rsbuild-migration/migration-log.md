# 마이그레이션 이력 (BT-ADMIN-FE → turborepo + Rsbuild + MF)

작업 단위마다 실행 명령어·작업 내용·결과·커밋을 기록한다. 최신 항목이 아래.

## 배경

- 원본: `BT-ADMIN-FE` — Nx 21 + Webpack 5 + Module Federation (host + remote 11, 페이지 226개)
- 동기: dev·빌드 속도. MF(Module Federation)는 반드시 유지.
- 선행 시도: `poc/nx23-rspack2` 브랜치(Nx 23 + rspack 이관 — P0~P4 완료 상태로 중단). 그 브랜치에서 검증된 자산을 이월한다:
  - react-refresh 브리지(host main.ts — remote 수정 시 화면 재렌더 보정, 커밋 `ab313e9a`)
  - MF shared 전략: `shareStrategy: 'loaded-first'` + react·react-dom `singleton: true`
  - tailwind v4 `@source` 경로 함정(앱 cwd 기준 스캔 축소) 대응
  - svgr `exportType: 'named'` 3룰
  - APP_PORTS 포트 SoT 개념
  - antd 인스턴스 파편화 검증 항목(P5 매트릭스)
- PoC 범위: host + fca + custom 3개 앱 이관 → 게이트(HMR 재렌더·antd 테마·custom 동적 등록·prod 빌드·속도 실측) 통과 시 나머지 8개 확장.

## 이력

### 2026-07-15 — 저장소 생성·clone

```sh
git clone https://github.com/leehojae91/bt-admin-fe.git E:/dev/bt-admin-fe
```

- GitHub에 빈 저장소 생성(leehojae91/bt-admin-fe), 로컬 clone. 기본 브랜치 `main`.
- 위치는 기존 워크스페이스(`E:\dev\bt-admin-workspace`) 밖 — Windows 대소문자 무구분으로 기존 `BT-ADMIN-FE` 폴더와 충돌하기 때문.

### 2026-07-15 — turborepo 골격 생성

```sh
npx -y create-turbo@latest . -m pnpm --skip-install
```

- 처음에 골격 파일 4개(package.json·pnpm-workspace.yaml·turbo.json·.gitignore)를 수동 작성했다가, 공식 생성기를 쓰기로 결정하고 제거 후 `create-turbo`로 재생성.
- 생성물: apps/web·apps/docs(Next.js 예제), packages/ui·eslint-config·typescript-config, turbo.json, pnpm-workspace.yaml 등.
- 커밋 `02d0067` — 생성 원본 그대로 (이력 보존 목적).

### 2026-07-15 — 예제 제거·프로젝트 정합

```sh
rm -rf apps/web apps/docs packages/ui packages/eslint-config/next.js packages/typescript-config/nextjs.json
pnpm install   # lock 재생성
npx turbo run build --dry=json   # turbo 동작 확인
```

- Next.js 예제 앱·ui 패키지 제거. eslint-config에서 `next-js` export·`@next/eslint-plugin-next` 제거.
- `packageManager: pnpm@10.29.2`, `engines.node >=22.17.0` — 원본 저장소 요구 버전과 정합.
- turbo.json build outputs `.next/**` → `dist/**` (Rsbuild 산출물 기준).
- README를 프로젝트 안내로 교체.
- 커밋 `ab0f0d4`.

### 2026-07-15 — 기반 구성 (deps·rsbuild·tailwind·ag-grid 패치·MF 공통 모듈)

```sh
# 버전 조회 후 루트 package.json 직접 작성 → 설치
npm view @rsbuild/core version   # 2.1.6 (rspack 2 기반), @module-federation/rsbuild-plugin 2.7.0 등
pnpm install
```

- 루트 package.json: 원본 dependencies 전량 이관(단일 버전 정책 유지 — 앱 package.json은 이름·버전·스크립트·rsbuild devDeps만).
  `@module-federation/enhanced`를 ^0.17.0 → **^2.7.0 승격** (rsbuild-plugin 2.7.0과 런타임 세대 정합).
- **Rsbuild 2.x = rspack 2 기반**: poc/nx23-rspack2 브랜치의 "신표준+rspack 2 백지 크래시"가
  Nx 조합 한정인지 여기서 판명됨. dev 게이트 실패 시 @rsbuild/core 1.x(rspack 1.x) 핀으로 fallback 예정.
- ag-grid-enterprise 패치 이관: `patches/ag-grid-enterprise.patch` 복사 + pnpm-workspace.yaml `patchedDependencies`.
- `.npmrc`(strict-peer-dependencies=false 등) 원본 이관.
- `tools/mf/app-ports.ts`: 포트 SoT (브랜치 APP_PORTS 이월). ⚠️ 원본의 campaign·custom 4209 중복도 그대로 이관(잠복 이슈 기록).
- `tools/mf/shared-config.ts`: 원본 webpack-shared-config(Nx 콜백형)를 **객체 맵 생성형으로 재작성**.
  정책 동일 이관: eager(dayjs)·excluded(clsx·tailwind-merge·echarts·codemirror)·설치 버전 명시.
  브랜치 검증분 이월: react·react-dom singleton, `@/shared-store` 워크스페이스 lib 공유(version 0.0.0 명시 — 미명시 시 빌드 경고).
- 루트 `postcss.config.mjs`(@tailwindcss/postcss + autoprefixer), `types/assets.d.ts`(svg ReactComponent 등 — @nx/react typings 대체), `tsconfig.base.json` 복사(paths 별칭 그대로).

### 2026-07-15 — libs 4종 복사 + tailwind @source 교정

```sh
cp -r BT-ADMIN-FE/libs/{shared-ui,shared-api,shared-store,shared-util} libs/
rm libs/*/project.json libs/*/.babelrc libs/*/eslint.config.cjs libs/shared-ui/tailwind.config.js
```

- 소스 무변경 복사. Nx 부산물(project.json·.babelrc·eslint.config.cjs)과 v4에서 사문인 tailwind.config.js만 제거.
- `libs/shared-ui/src/styles/global.css`의 `@source` 3단계 → **4단계 교정** (브랜치 2026-07-14 2차 함정 ⑸ 이월 —
  3단계는 libs/apps를 가리키는 오기. webpack cwd=루트 자동 스캔이 가려줬지만 rsbuild에선 유틸리티 전멸).

### 2026-07-15 — host·fca·custom 이관 + 전체 빌드 성공

```sh
# 앱별: src 복사 + package.json(스크립트·rsbuild devDeps) + rsbuild.config.ts + tsconfig 2종
cd apps/fca && pnpm build      # 첫 시도 성공
cd ../host && pnpm build       # 3.28s
cd ../custom && pnpm build     # 0.23s
rm -rf apps/*/dist && npx turbo run build   # 콜드 3앱 병렬: turbo 7.6s (custom 0.68s·fca 4.74s·host 4.87s)
```

- 각 앱 `module-federation.config.ts`를 번들러 중립(name·exposes만)으로 재작성. host remotes 조립은
  rsbuild.config.ts에서 — dev `http://<MF_REMOTE_HOST||localhost>:<port>/remoteEntry.js`, prod `/remotes/<name>/remoteEntry.js`.
  10개 remote 이름 전부 빌드 매핑 유지(host의 `import('<remote>/Module')` 정적 참조 25건 때문 — 미기동은 런타임 404 스킵).
- 공통: `publicPath: 'auto'`(root context·LAN 호환), `uniqueName: <app>`, svgr `mixedImport`(ReactComponent 패턴),
  `shareStrategy: 'loaded-first'`, `filename: 'remoteEntry.js'`, dts false.
- host 특이: proxy.config.js 재사용(/api·/oauth·/ws·/remotes/custom), global.css preEntry 공급,
  `mf-basepath-runtime-plugin` runtimePlugins 등록, index.html 타이틀 `%NX_PUBLIC_HTML_TITLE%` → 정적 "BT-Admin",
  public/(config.js)은 rsbuild 기본 publicDir 규약 사용, NX_PUBLIC_REACT_QUERY_DEVTOOLS define 유지.
- custom 특이: `createSharedConfig({ consumeOnly: true })` — 공유 라이브러리 소비 전용(import: false).
- **React Compiler 미적용** (원본은 babel 플러그인): Rsbuild=SWC 체계라 babel 경유 시 속도 이점 상실.
  동작 정확성엔 영향 없음(리렌더 최적화만 손실). 후속 과제로 SWC용 적용 방안 검토.
- **react-refresh 브리지(브랜치 ab313e9a) 이월 보류 — 사용자 결정**: 브리지 같은 보정 계층이 싫어서
  브랜치를 중단한 것이므로, 순정 Rsbuild+MF로 dev HMR 게이트를 먼저 실측하고 필요 판명 시에만 재논의.
- 빌드 실측: **콜드 3앱 병렬 7.6초** (원본 Nx+webpack 대비 극적 단축 — 참고: 브랜치 Nx+rspack 11앱 2m20s).
- 커밋 `3d721cc`(기반)·`fb2bf13`(libs)·`2518d7e`(앱 3종).

### 2026-07-15 — dev 기동 스모크 + proxy 형식 수정

```sh
(apps/fca) pnpm dev    # ready built in 1.35s
(apps/host) pnpm dev   # ready built in 0.48s
# HTTP 확인: fca /remoteEntry.js 200, host / 200(title BT-Admin·config.js 주입), /api 504(백엔드 미기동 — 정상 스코프)
```

- **수정**: 원본 proxy.config.js는 webpack-dev-server 배열형(`{ context: [...] }`)인데 rsbuild
  server.proxy가 context 배열 항목을 해석하지 못해 **전 경로가 프록시로 넘어가 전 화면 504**.
  host rsbuild.config.ts에서 경로 키 객체 맵으로 변환해 전달(원본 파일은 SoT로 유지).
- dev 기동 실측: **host 0.48s·fca 1.35s** (원본 webpack dev는 앱당 수십 초).
- 남은 게이트(브라우저 필요 — 별도 진행): 로그인·화면 진입, remote 수정 HMR 재렌더(브리지 없이 순정 판정),
  antd 커스텀 테마(#405189), custom 동적 등록(/remotes/custom), LAN(MF_REMOTE_HOST).

### 2026-07-15 — 브라우저 게이트 1차: 세션 WS 폭풍 → React Compiler 필수 판명

증상(사용자 보고 재현): 로그인 후 `ws://.../ws/session?ticket=...`이 "closed before the connection
is established"로 무한 재연결(ticket 재발급 루프). 프록시·백엔드는 정상(직결/프록시 A/B 동일 거동)
— 앱이 CONNECTING 중 스스로 close.

원인: `useSessionSocket`의 effect deps `[ticket, onClose, onError]`에 `SharedInfoProvider`가
**인라인 콜백**을 전달. 원본은 React Compiler가 자동 메모이제이션해 안정적이었으나 이관본은
Compiler 미적용이라 렌더마다 재생성 → effect 재실행 → 연결/해제 루프.
**이 코드베이스에서 React Compiler는 성능이 아니라 정합성 필수 요소** (AGENTS.md 방침상
useCallback/useMemo를 쓰지 않고 Compiler에 의존하는 코드가 존재).

조치: Rsbuild 공식 레시피로 Compiler 적용 — `@rsbuild/plugin-babel`(jsx/tsx만 스코프) +
`babel-plugin-react-compiler`, 공통 헬퍼 `tools/rsbuild/react-compiler.ts`로 3앱 일괄.
적용 후 실측: 세션 WS `[onopen]` 후 안정 유지(재연결 0), dev 기동 host 0.6s대 유지.

부수 확인: 로그인·메인·fca 봇 목록(실데이터) 정상 렌더 — **rspack 2 백지 크래시 리스크 해소 확정**.
`/remotes/custom` HEAD 504는 custom 미기동 시 표준 fallback(정상), 미기동 remote 9개
CONNECTION_REFUSED는 legacy 404 스킵과 등가(전부 catch 처리됨).

### 2026-07-15 — 브라우저 게이트 2차: remote HMR 재렌더 — 순정에서도 결함 재현 확정

실험: fca `BotList.tsx` 버튼 라벨 센티널 수정(제자리 저장) → fca dev 재컴파일 OK,
브라우저 CSS hot 반영 OK, **JS 화면 재렌더 없음**(검색창 상태는 보존 — 풀 리로드도 없음).

런타임 계측: `__reactRefreshInjected_host/fca` 둘 다 true(주입 정상, uniqueName 분리 동작)이나
`__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.size === 0` — 스텁 훅이 렌더러를 저장하지 않아
늦게 로드된 remote refresh 런타임이 재렌더 대상을 못 잡음.
**poc/nx23-rspack2 브랜치 7차 진단과 동일 — Nx 무관, 순정 Rsbuild 2 + MF 2.7에도 존재하는
생태계 공통 결함**(react-refresh-webpack-plugin#394·#863) 확정.

대응 선택지(사용자 결정 대기): ① react-refresh 브리지 이월(dev 전용 1파일, 브랜치 검증됨)
② remote 수정 시 풀 리로드 수용(상태 소실, 구성 단순).

### 2026-07-15 — 브라우저 게이트 3차: 브리지 이월 → remote HMR 완전 동작

사전 레퍼런스 체크(사용자 요청): rspack/rsbuild 진영 공식 해법 부재 확인 —
react-refresh-webpack-plugin#394(2021~)·#863 여전히 open, rspack엔 MF+HMR 관련 버그
리포트 진행 중(#9322·#11735). **Vite 진영만 `@vitejs/plugin-react`의 MF 전용
`reactRefreshHost` 옵션으로 공식 해결**(refresh 런타임 전체 1개로 통일 — 브리지와 동일 원리).
MF core 논의 #2210은 커뮤니티 우회 수준(runtimeChunk single은 단일 빌드 토폴로지 한정).
→ 브리지가 유일한 검증 해법으로 판정, 사용자 승인 후 이월.

조치: `apps/host/src/main.ts` 최상단에 dev 전용 브리지(브랜치 `ab313e9a` 이월, 93줄).
Rsbuild에 reactRefreshHost 동등 옵션이 생기면 삭제 가능(주석에 명기).

실측(브라우저, 2연속): fca `BotList.tsx` 센티널 수정 → **즉시 화면 반영 + 검색창 상태
보존(풀 리로드 없음)**, 원복도 동일. 계측: `hook.renderers.size` 0→1(렌더러 저장 브리지 동작),
fca 플래그 setter 발화 확인.

부수 게이트 통과: **antd 커스텀 테마 정상** — primary 버튼 배경 `rgb(64,81,137)`(=#405189),
인스턴스 파편화 회귀 없음(shared singleton + loaded-first 유효).

남은 게이트(후속): custom 동적 등록 실기동(/remotes/custom — 오늘은 미기동 fallback만 확인),
LAN(MF_REMOTE_HOST), 원자적 저장(IDE safe-write) 이중 컴파일 재현 여부.
후속 과제: Rsbuild 업스트림에 reactRefreshHost 동등 기능 요청 검토.

### 2026-07-15 — 계획서 신설

- [migration-plan.md](migration-plan.md) 작성 — 남은 일의 SoT (잔여 게이트 P1 → remote 9개 확장 P2 →
  주변 정비 P3 → 전환 판정 P4). 진행 현황·핵심 결정 기록 포함, 다른 세션 이어받기 전제.
  이 로그는 계속 "실행 이력"의 SoT로 유지.

### 2026-07-15 — 브라우저 게이트 4차: P1 잔여 게이트 3건 전부 통과

```sh
# P1-1·P1-3: host+fca+custom 3서버 기동 (localhost)
# P1-2: 3서버 재기동 — export MF_REMOTE_HOST=192.168.115.31 후 pnpm dev, 브라우저를 IP로 진입
```

- **P1-1 custom 실기동**: `[useSiteCustomLoader] custom remote 등록 완료 / overrides` 로그 +
  `__FEDERATION__.__INSTANCES__`에 host·custom·fca 3개(custom 컨테이너 실로드) + 프록시 경유 200.
  부작용 실증: campaign remote(4209)가 custom dev 서버(같은 포트)에 붙어 REFUSED가 9→8건 —
  원본에서 이관된 포트 중복의 실제 관측 사례(동시 dev 기동 요구 시 재배정 필요).
- **P1-2 LAN**: fca·custom이 기본값에서 IPv6 루프백([::1])만 리슨해 IP 접속 거부 발견 →
  `server.host: '0.0.0.0'` 명시로 수정. 이후 IP(192.168.115.31) 접속에서 로그인·fca 화면 로드
  (remote entry `http://192.168.115.31:4202/remoteEntry.js`로 조립 확인)·HMR 센티널 반영·antd 테마 정상.
- **P1-3 원자적 저장**: Claude Edit 도구(임시파일+rename) 저장 → fca 컴파일 2회 발생(이중 컴파일 재현)
  **그러나 hot-swap·상태 보존 정상, 풀 리로드 없음** — Nx 브랜치의 "hot-update 404→풀 리로드"는
  rsbuild 미발생. 무해 판정, 추가 조치 없음.

### 2026-07-15 — P2 확장 이관: remote 9개 + 설정 팩토리화 + 12앱 빌드 성공 (게이트 5차)

```sh
# 9앱(manager·ipron·aoe·stt·ivr·insight·taskboard·campaign·vel): src 복사 + package.json +
# MF config(번들러 중립) + rsbuild.config(팩토리 5줄) + tsconfig 2종
pnpm install
rm -rf apps/*/dist && npx turbo run build   # 12앱 병렬 콜드: 47.3s, 에러·경고 0
```

- **설정 팩토리화**: `tools/rsbuild/remote-config.ts` 신설 — 전 remote가 공유하는 표준 설정 SoT.
  각 앱 rsbuild.config.ts는 5줄(팩토리 호출)로 축소. fca·custom도 팩토리로 리팩터.
  예외는 옵션으로: custom `consumeOnly`, insight `ignoreWarnings`(sql-formatter sourcemap — 원본 이관).
- 앱별 편차 이관: aoe `./AgentChatPanel` expose + lexical deps, vel wavesurfer.js deps.
  taskboard·vel의 additionalShared '@/components/ui/sidebar'는 사용처 없음 판정(브랜치 8953c09d) 이월 제외.
- ag-grid-enterprise 패치 해시 보존 확인(pnpm-lock `patch_hash` 실재).
- **React Compiler 적용 범위 교정**: jsx/tsx만 → **전 소스 ts/tsx**(node_modules 제외) + `target: '19'`.
  원본 .babelrc는 babel-loader로 앱·libs의 모든 ts를 컴파일했는데 jsx/tsx만 걸면 .ts 커스텀 훅이
  비컴파일로 남음. (아래 Maximum update depth 조사 과정에서 발견·교정 — 루프 자체의 원인은 아니었음)
- **브라우저 스윕 중 "Maximum update depth exceeded" 발견 → 원본 대조로 잠복 버그 판정**:
  ipron `/ipron/line/endpoint`에서 발생. 스택 추적 → `EndpointList.tsx` 251행 effect.
  뿌리: 132행 `const { data: allNodeTenants = [] } = useGetNodeTenants()` — 로딩 중 렌더마다
  새 배열 생성 → effect deps 변경 → `setTenantOptions` 루프(데이터 도착 후 안정화라 화면은 동작).
  **원본(master, webpack) 실기동 대조: 동일 화면에서 동일 에러·동일 파일 스택 재현** —
  이관 회귀 아님, 원본 잠복 버그(antd Empty·Drawer deprecated 경고 2종도 원본 동일).
  → 원본 저장소에 수정 제안 대상(effect 대신 useMemo 파생 또는 훅 반환 기본값 안정화).
- 속도 비교 실측(부수): 원본 host+ipron dev 기동 **272초** vs 신규 host+ipron+manager+insight 4서버 **4초**.
- 스윕 완료: ipron 국선관리 렌더·antd 테마(#405189)·BFF 4종 API 200. 잔여 스윕(후속): insight echarts
  화면, aoe codemirror 화면, manager 화면 지정, AG-Grid 데이터 있는 화면.

### 2026-07-15 — 브라우저 게이트 6차: P2 잔여 스윕 4건 전부 통과 — P2 완료

```sh
# host·manager·insight·stt 4서버 기동 후 브라우저 스윕 (화면마다 렌더 + 콘솔 error/warn 세트 확인)
```

- **AG-Grid 데이터 화면**: manager 사용자 목록(`/manager/resource/user/list`) 20행 렌더.
  Enterprise 워터마크 요소는 존재하나 `display:none`·빈 텍스트 — 실표시 없음 = ag-grid 패치 유효.
  insight 검색 아이템 그리드 13행도 부수 확인.
- **manager 화면 지정(picker)**: 렌더·콘솔 0. variant 카드 0건은 fca 등 variant 보유 remote
  미기동 조건 탓(원본도 동일 조건이면 동일) — 완전 확인은 fca 동시 기동 시.
- **codemirror**: insight 검색 아이템 "새 검색조건" 편집기 — `.cm-editor` 렌더·contenteditable,
  "Unrecognized extension value" 에러 0 → self-bundle 정책 유효.
- **echarts**: insight 대시보드 view(헬스보드, `/insight/monitoring/dashboards/20/view`) —
  canvas 3개·echarts 인스턴스 6개 렌더, LIVE 지표 수신. 에러 0 → self-bundle 정책 유효.
- 신규 발견(무해 기록): 대시보드 view 진입 시 `/ws/proxy/insight/monitoring` WS 1회 실패 후
  재연결(LIVE 수신 정상 — 세션 WS 폭풍과 무관, 재발 없음 20초 관찰).
- 미확인으로 남긴 것: stt 워드클라우드 화면, aoe 워크플로우 codemirror(정책 동일이라 위험 낮음),
  picker의 variant 카드 노출(fca 동시 기동 필요).
- **P2 완료 판정** — 계획서 §3 매트릭스 전부 체크. 다음은 P3(주변 정비).

### 2026-07-15 — P3-5 테스트 러너: Jest → Vitest 전환

```sh
pnpm add -w -D vitest jsdom
pnpm test   # Test Files 1 passed, Tests 4 passed (1.13s)
```

- **사용자 결정**: 원본 테스트가 실질 0건(유일한 host app.spec.tsx도 전체 주석)이라 Jest 이관 대신
  rsbuild 생태계 정합이 좋은 Vitest로 전환.
- 루트 단일 `vitest.config.ts`: jsdom 환경, apps·libs spec 포함 글롭, **Vite 네이티브
  `resolve.tsconfigPaths`로 별칭 해석**(처음 vite-tsconfig-paths 플러그인을 썼다가 Vite가
  네이티브 지원 안내 → 플러그인 제거하고 공식 옵션 채택).
- 사문 spec(app.spec.tsx) 삭제, 러너 검증용 smoke 테스트 신설: `libs/shared-util/src/lib/util.spec.ts`
  — createUUID(UUID v4 형식·유일성)·fuzzyScore(한글 초성 매칭, es-hangul 연동) 4케이스.
- 루트 스크립트 `pnpm test` = `vitest run`. @testing-library/*는 컴포넌트 테스트가 실제로
  생길 때 추가(YAGNI).

### 2026-07-15 — P3-1 serve 대화형 스크립트 재작성 (turbo 기반)

```sh
pnpm serve        # 대화형 메뉴 (원본 UX 그대로)
pnpm serve 2      # 비대화형 — host만(+manager)
pnpm serve 3,4    # 개별 선택
# 실검증: pnpm serve 2 → turbo --filter 조립·LAN IP 감지 출력·host+manager 4초 기동 확인
```

- `scripts/serve-host.js` — 원본 UX 완전 이식: 메뉴(1=전체, 2=host만+manager, 3+=개별),
  콤마·공백 구분 인자, LAN IP 자동 감지 → `MF_REMOTE_HOST` 주입, `serve-host.local.json`
  env 머지(셸 기존 값 우선), SIGINT/SIGTERM 전파.
- 원본과의 구조 차이: `nx serve --devRemotes/--skipRemotes` 대신 **`turbo run dev --filter=...`로
  선택 앱만 기동** — 미선택 remote는 서버 자체가 없어 host가 404/REFUSED 스킵(legacy skipRemotes 등가).
- 브라우저 자동 열기: serve 경유 시에만 `SERVE_OPEN=1`을 host rsbuild config(server.open)에 전달,
  `SERVE_NO_OPEN`으로 억제(원본 동일). `serve-host.local.json` gitignore 등재.

### 2026-07-15 — P3-3 typecheck 배선 — 12앱 전부 통과 (회귀 2건 발견·정합 해결)

```sh
# 각 앱 package.json에 "check-types": "tsc -p tsconfig.app.json --noEmit" 배선 (turbo 태스크 기존재)
npx turbo run check-types   # 12 successful, 24.2s
```

- 첫 실행에서 오류 2계열 발견 → **원본 대조(4앱 tsc 직접 실행: 전부 에러 0)로 이관 회귀 판정** → 원인 추적:
  1. **tslib 누락**: `importHelpers: true`인데 원본 devDeps의 tslib을 이관 누락 — 55건 전원 동일
     오류(TS2354). tslib 추가로 일괄 해소.
  2. **typescript 5.9.2 유출**: 앱이 typescript를 선언하지 않아 스캐폴드 잔재
     packages/eslint-config의 typescript ^5.9.2가 `.bin`으로 새어 들어옴 —
     `pnpm --filter vel exec tsc -v` = 5.9.2 실측. 5.9의 Uint8Array 제네릭화로
     vel·stt에서 BufferSource/BlobPart 오류, ipron TS2871(신규 진단). 
     → **전 앱에 typescript ~5.8.2 명시 선언** + 스캐폴드 typescript도 ~5.8.2 정합.
  3. **@xyflow/react 드리프트**: 루트 `^12.10.2` range가 12.11.2를 설치해 aoe OnNodeDrag
     시그니처 오류 2건 → 원본 lock 고정 버전 12.10.2로 핀. @types/node도 20.19.9로 핀.
- 처리 원칙: **소스는 무변경, 의존성을 원본 lock에 정합** (소스 드리프트 방지).
- 잔여 드리프트 기록: antd 6.5.1(원본 lock 6.0.0, range ^6.0.0은 동일) — 브라우저 게이트를
  6.5.1로 전부 통과했고 원본도 재설치 시 동일 버전이 되므로 유지. 문제 시 6.0.0 핀 검토.

### 2026-07-15 — P3-2 remote 생성기 — `pnpm gen remote` (turbo gen/Plop)

```sh
pnpm add -w -D @turbo/gen
npx turbo gen remote --args gentest 4211          # 비대화형 실검증 (대화형은 pnpm gen remote)
npx turbo run check-types build --filter=@bridgetec/ui-remote-gentest   # 2 successful, 4.6s
npx turbo run check-types build --filter=@bridgetec/ui-host --force     # 2 successful, 8.4s
# 검증 후 gentest 롤백 (rm -rf apps/gentest + git restore 등록 지점 6파일 + pnpm install)
```

- `turbo/generators/config.ts` + `templates/remote/` 14개 템플릿 — 원본 `create-remote` 상당.
  원본 스크립트(38KB, nx 생성기 + 패치 20여 곳)가 팩토리 구조 덕에 **골격 add 14 + modify 6**으로 축소.
- 자동 패치 6곳: `tools/mf/app-ports.ts`(APP_PORTS·REMOTE_NAMES),
  `scripts/serve-host.js`(REMOTE_APPS 메뉴), host 로더 3종(ROUTE_LOADERS·VARIANT_LOADERS·
  SELECTOR_LOADERS — 원본 create-remote와 동일한 정규식 앵커 방식), `remotes.d.ts`(와일드카드 선언).
- favicon은 바이너리라 Plop add 불가 → 커스텀 액션(copyFavicon)으로 manager 것 복사.
- 프롬프트 검증: 이름(소문자·숫자, APP_PORTS·폴더 중복 차단), 포트(중복 차단, 기본값 = 최대+1).
  `--args` 비대화형 모드의 validate 시점엔 `turbo.paths.root` 미주입 → `__dirname` 폴백 처리.
- 생성 후 `pnpm install` 1회 필요(안내문 출력). 메뉴 노출은 별도(manager 메뉴 관리에서 라우트 등록).
- **create-custom 상당은 보류**: custom 앱은 단일 운반체로 이미 이관 완료 — 고객사별 복제
  생성은 P4 본선 승격 후 실수요 발생 시 확장(계획서 P3-2 판정 기록).

### 2026-07-15 — P3-4 eslint·husky·commitlint 이관 — 전량 lint errors 0

```sh
pnpm add -w -D eslint @eslint/js typescript-eslint eslint-plugin-react@7.35.0 eslint-plugin-react-hooks@5.0.0 \
  eslint-plugin-react-refresh eslint-plugin-react-compiler@19.1.0-rc.2 eslint-plugin-import@2.31.0 \
  eslint-plugin-prettier eslint-config-prettier globals husky lint-staged \
  @commitlint/cli @commitlint/config-conventional @commitlint/cz-commitlint cz-git commitizen
npx eslint .   # files 1762, errors 0, fatal 0, warnings 1165 (전부 warn 레벨)
```

- `eslint.config.mjs` — 원본 eslint.config.cjs를 **Nx 레이어만 제거하고 루트 단일 파일로 이관**
  (실질 규칙 동일). `pnpm lint` = `eslint .`.
- Nx 레이어 제거로 생긴 회귀 2건을 전량 실행으로 발견·복원:
  1. CJS 설정 js(proxy.config.js·commitlint.config.js 등) no-undef — 원본 @nx/flat/javascript가
     node globals 제공했음 → globals 패키지로 동등 블록 추가(+public/config.js browser globals).
  2. `@typescript-eslint/no-unused-expressions` — 원본 @nx/flat/typescript가
     `allowTernary·allowShortCircuit·allowTaggedTemplates: true` 옵션을 주고 있었음
     (`--print-config` 원본 대조로 확인) → 명시 복원. insight 삼항 토글 7건 오탐 해소.
- `types/assets.d.ts`는 projectService closest-tsconfig 탐색 밖이라 파싱 fatal → ignores 등재.
- husky 훅 3종 이관: pre-commit(lint-staged)·commit-msg(commitlint)·post-rewrite(rebase 후
  타입검사 — **origin/master → origin/main 교정**). scripts/typecheck-staged.js 원본 그대로.
- commitlint.config.js 원본 그대로(scope = apps/ 디렉토리 SoT·custom 제외, 이모지 타입 강제) —
  **이 커밋부터 커밋 메시지는 이모지 타입 규약(✨feat·📦️chore 등)을 따른다**. cz-git(`pnpm commit`).
- lint-staged: 원본의 `--ignore-pattern '**/webpack*.ts'` 대신 `--no-warn-ignored`(eslint 9) 사용.
- 잔여 경고 1165건은 전부 warn 레벨(prettier 541·prefer-nullish-coalescing 227·no-unused-vars 181 등)
  — 원본과 동일 성격(원본은 전량 lint 게이트가 없어 잠복). 소스 무변경 원칙으로 유지.
- **스캐폴드 packages/(eslint-config·typescript-config) 미사용 확정(자기 참조뿐)** — 삭제는
  사용자 확인 대기(권한 정책상 자동 삭제 보류).

### 2026-07-15 — P3-6 prod 배포 산출물 구조 — build:deploy + serve:prod 스모크 통과

```sh
node scripts/build-deploy.js all   # 11앱 빌드(46.1s 콜드) → dist/deploy 조립
pnpm serve:prod                    # serve dist/deploy -l 4200 -s
# 스모크: / 200(html) · /remotes/{manager,vel}/remoteEntry.js 200 · SPA fallback 200 · /config.js 200
```

- `scripts/build-deploy.js` — 원본 build-selective.js 상당. 산출 구조도 원본 규약 그대로:
  **dist/deploy(=host dist 루트) + dist/deploy/remotes/<name>/** — host prod remote URL
  `/remotes/<name>/remoteEntry.js` 전제와 일치.
- 원본과 차이: nx run-many → `turbo run build --filter=...`(캐시 활용), fs-extra → Node 내장
  cpSync, `all`/이름/번호 비대화형 인자 지원(인자 없으면 원본식 메뉴).
- custom은 원본 APPS와 동일하게 배포 트리 제외(런타임 동적 등록 운반체).
- `pnpm serve:prod` = `serve dist/deploy -l 4200 -s` (원본 serve:prod 상당, serve ^14.2.5).

### 2026-07-15 — P3-7 basePath(root context) 게이트 — 브라우저 실측 통과 (게이트 7차)

```sh
pnpm build:deploy all              # dist/deploy 조립 (P3-6 산출물 재사용)
# 검증 서버(스크래치): dist/deploy를 /bt-admin 하위로 서빙 + <base href="/"> → "/bt-admin/" 동적 치환
# 브라우저: http://localhost:4300/bt-admin/
```

- **host 청크**: /bt-admin/static/js·css 전부 200 — `publicPath: 'auto'` + `<base href>` 치환 조합 실측.
- **API**: /bt-admin/api/... 로 접두되어 요청됨(BE 부재라 data undefined 에러는 예상치 — 게이트 무관).
- **remote entry**: 10개 전부 `/bt-admin/remotes/<name>/remoteEntry.js` 200 —
  **mf-basepath-runtime-plugin의 basePath 접두 실측**(원본 c10756ae 규격 동작).
- **remote 모듈 실로드**: `loadRemote('manager/Routes')` 성공(routes 2건 반환),
  useRemoteRoutesLoader "Remote routes loaded" 로그 확인.
- **custom 동적 등록**도 /bt-admin/remotes/custom/... 로 접두됨(배포 트리 제외라 로드는 graceful
  실패 — useSiteCustomLoader 경고 후 계속, 설계 그대로). 콘솔의 SyntaxError 1건은 검증 서버의
  SPA fallback이 부재 custom entry에 html을 200으로 준 것 — 이관 회귀 아님.
- 앱 셸 렌더 정상(Welcome 화면·헤더·메뉴바). 스크린샷: 세션 스크래치 basepath-gate.png.

### 2026-07-15 — P4 착수: 속도 비교표 확정 + 공개 라우트·chromeless 게이트 (게이트 8차)

```sh
# 원본 콜드 빌드 실측 (1차 시도는 Nx Cloud 원격 캐시가 11/11 재사용 → --skip-nx-cache로 재실측)
npx nx run-many --target=build --projects=<11앱> --parallel=6 --skip-nx-cache   # 269s
# 신규: 46.1s(콜드·P3-6 실측) / 73ms(FULL TURBO 캐시 히트) / dev 전체 11앱 29.8s
```

- **속도 비교표 확정** (계획서 P4-2): prod 콜드 269s→46.1s(5.8배), 캐시 히트 54s(Nx Cloud)→
  0.07s(FULL TURBO), dev 기동 272s(host+ipron)→4s급, 전체 11앱 dev 동시 기동 29.8s.
- **serve 전체 기동 결함 발견·수정**: turbo 기본 동시성(10) < persistent 태스크 11개로 기동 거부 —
  지금까지 최대 4서버라 잠복. `--concurrency=(앱 수+1)` 동적 지정으로 수정(scripts/serve-host.js).
- **공개 라우트·chromeless 게이트 통과**: 비로그인으로 `/taskboard/board/task-view-public` 진입 —
  RouteShell 세션 체크 통과, taskboard remote 렌더("전광판 정보 없음" 정상 fallback),
  크롬 요소(헤더·메뉴·패널) 제거 강제 확인. 콘솔 이슈 antd cssVar 경고 1건 기록(낮은 위험).
- 기능 동등성 체크리스트를 계획서 P4-1로 정리(게이트 1~8차 매핑) — 잔여: aoe·ivr·campaign·vel·stt
  대표 화면, 로그아웃, 탭 모델, picker variant 카드(전부 로그인 필요, 11서버 기동 유지 중).
- 승격 시 미이관 자산 목록화 완료(계획서 P4-4): doc/·.claude/skills/·Jenkinsfile+infra/·
  components.json·ds-bundle/ 등 + git 이력 처리 방침(fresh start + 원본 아카이브) 제안.

### 2026-07-15 — P4 기능 동등성 전수 실측 완료 — 체크리스트 전 항목 통과 (게이트 9차)

```sh
pnpm serve 1   # host + remote 10개 전체 dev 기동(29.8s) — 수정된 --concurrency 적용 첫 전체 기동
# 브라우저: 로그인(admin) → aoe·ivr·campaign·vel·stt 대표 화면 → 탭 모델 → picker → 로그아웃
```

- **대표 화면 5종 통과**(실데이터·콘솔 error 0 기준): aoe Agent 목록 30건, ivr End Point 27건+멤버
  그리드, campaign 대시보드(리다이렉트 포함), vel 녹취 검색 20건, stt STT 검색.
  fca 봇 대시보드(canvas 4개)로 echarts·wordcloud self-bundle 정책도 재확인.
- **탭 모델(keep-alive) 실측 통과**: STT 검색 탭에 키워드 입력 → fca 탭 전환 → 복귀 시
  입력값 보존. remote 간 탭 전환·상태 보존 정상.
- **picker variant 카드 통과**(6차 잔여): 전 remote 기동 상태에서 화면 지정 진입 —
  IPRON skill-assign 파일 1건 잡히고, 선택 시 variant 카드 2종(default·경량 패널) 렌더.
- **로그아웃 통과**: 사용자 메뉴 → 로그아웃 → /login 복귀, 이후 세션 API 401(정상).
- 기록(낮은 위험, P4-1 표 참조): aoe 최초 진입 1회 `factory is undefined(@radix-ui/react-slot)`
  +HMR disposed 크래시 — 리로드 후 정상, 풀로드·SPA 재진입 모두 재현 실패(dev 전용 일시 현상).
  campaign BFF API 1건 500(BE 응답 오류 — FE 무관). antd cssVar·stt useForm 경고(원본 대조 대상).
- 스윕 종료 후 dev 서버 전부 종료·포트 4200~4210 해제 실검증.
- **P4 잔여는 판정 단계만**: 팀 합의(승격 여부) + 승격 시 미이관 자산 처리(P4-4).

### 2026-07-15 — P4 보강: dev 메모리 사용량 실측 (신규 vs 원본)

```sh
# 측정법: 기동 완료 + idle 15초 후 node 프로세스 WorkingSet 합산 (Win32_Process, 순차 측정 — 포트 충돌 방지)
# 신규 전체 11앱:  pnpm serve 1                         → 6.19GB (14개 프로세스)
# 신규 host+ipron: turbo run dev --filter host,ipron    → 0.91GB (3개: host 318MB·ipron 547MB·turbo 70MB)
# 원본 host+ipron: nx serve host --devRemotes=ipron     → 4.85GB (15개: webpack 메인 2.2GB·fork-ts-checker 1.6GB·nx daemon 포함)
```

- **동일 조합(host+ipron) 직접 비교: 4.85GB → 0.91GB, 약 5.3배 절감.**
- 신규는 전체 11앱을 동시에 띄워도 6.19GB — 원본 2앱(4.85GB)보다 +1.3GB 수준.
  remote 앱당 550~650MB로 균질(rsbuild 단일 프로세스), host는 307~318MB.
- 원본은 프로세스 분화가 큼: webpack dev 메인 2.2GB + fork-ts-checker 2세트 1.6GB +
  nx 데몬·부속 다수. fork-ts-checker(별도 타입체크 프로세스)는 rsbuild 구성엔 없음
  (typecheck는 `pnpm check-types`로 온디맨드 — P3-3).
- nx daemon(249MB)은 상주 프로세스라 원본 합산에 포함(스택 상주 비용). 측정 후 dev 서버
  전부 종료·포트 해제 검증(daemon만 잔존 — 정상 상주).
- 계획서 P4-2 속도 비교표에 메모리 2행 추가.
