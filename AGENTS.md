# AGENTS.md

이 파일은 AI 코딩 도구(Claude Code, Codex, Cursor 등)가 이 저장소의 코드를 작업할 때 참고하는 가이드입니다.

## AI 도구 공통 안내

- **이 파일(AGENTS.md)이 모든 AI 코딩 도구 지침의 단일 소스(SoT)입니다.** Codex·Cursor·Copilot coding agent·Amp·Jules 등 `AGENTS.md` 표준을 지원하는 도구는 이 파일을 자동으로 읽습니다. `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.windsurf/rules/agents.md`, `.clinerules`, `.roo/rules/agents.md`, `.junie/guidelines.md`는 모두 이 파일을 가리키는 포인터이므로, 지침 추가·수정은 반드시 이 파일에서만 할 것.
- **`.claude/skills/`의 스킬 문서는 Claude Code 전용이 아닙니다.** 모든 AI 도구가 읽을 수 있는 일반 마크다운 절차서이므로, 아래 인덱스에 해당하는 작업을 수행할 때는 사용 중인 도구와 무관하게 해당 `SKILL.md`를 먼저 읽고 그 절차를 따를 것.

### AI 작업 스킬 인덱스

| 작업 | 문서 |
| --- | --- |
| 커밋 메시지 작성 (카테고리·scope 판정 규칙) | [.claude/skills/commit/SKILL.md](.claude/skills/commit/SKILL.md) |
| API 계층·TanStack Query 훅 작성 | [.claude/skills/add-api/SKILL.md](.claude/skills/add-api/SKILL.md) |
| 데이터 추가/수정 폼 (Ant Design Form) 작성 | [.claude/skills/add-form/SKILL.md](.claude/skills/add-form/SKILL.md) |
| Drawer/Modal (forwardRef 명령형 제어) 작성 | [.claude/skills/add-drawer/SKILL.md](.claude/skills/add-drawer/SKILL.md) |
| Zustand 스토어 작성 | [.claude/skills/add-store/SKILL.md](.claude/skills/add-store/SKILL.md) |
| 트리 UI (useTreeView + TreeView) 작성 | [.claude/skills/add-tree/SKILL.md](.claude/skills/add-tree/SKILL.md) |
| AG-Grid 테이블 작성 | [.claude/skills/add-grid/SKILL.md](.claude/skills/add-grid/SKILL.md) |
| 사용자 매뉴얼 자동 생성 (스크린샷 + Markdown) | [.claude/skills/generate-manual/SKILL.md](.claude/skills/generate-manual/SKILL.md) |
| 기존 remote 앱 점검·정규화 | [.claude/commands/update-remote.md](.claude/commands/update-remote.md) |

# 중요 지침

이 프로젝트는 **React Compiler**를 사용합니다. 컴파일러가 자동으로 리렌더링을 최적화하므로, 명시적으로 필요한 경우가 아니면 `useMemo`나 `useCallback`을 사용하지 말 것.
`pnpm-lock.yaml`에는 `ag-grid-enterprise` 패치 정보(`patchedDependencies`, `patch_hash`)가 포함되어 있으므로, lock 파일 수정·충돌 해결 시 해당 내용이 제거되지 않도록 주의할 것. 패치가 누락되면 AG-Grid Enterprise 라이선스 관련 동작에 영향을 줄 수 있음. 또한 pnpm 메이저 버전이 다르면 lock 파일 포맷과 패치 해시가 달라질 수 있으므로, 필수 환경 요구사항에 명시된 pnpm 버전을 준수할 것.
커밋 메시지 작성 시 타이틀은 간결하게 작성하고, 반드시 본문(body)에 변경 사항의 상세 내용을 포함할 것. 타이틀만으로 커밋을 생성하지 말 것.
커밋 메시지를 작성할 때는 반드시 [.claude/skills/commit/SKILL.md](.claude/skills/commit/SKILL.md) 스킬을 먼저 확인하고, 해당 스킬의 카테고리(이모지)·scope 판정 규칙·절차를 따를 것.
이미 사용 중인 라이브러리(Ant Design, shadcn/ui, AG-Grid, TanStack Query, React Hook Form, date-fns, dayjs, lodash 등)로 구현 가능한 기능은 직접 코드를 작성하기 전에 **반드시 해당 라이브러리가 그 기능을 제공하는지 먼저 확인**할 것. 라이브러리가 제공하지 않거나 요구사항에 부합하지 않는 경우에는 임의로 직접 구현하지 말고, 먼저 사용자에게 "라이브러리가 해당 기능을 제공하지 않는데 직접 구현해도 되는지" 확인한 뒤 승인을 받고 진행할 것.

## 필수 환경 요구사항

아래 항목은 프로젝트 실행 전 **직접 설치**가 필요합니다:

| 항목        | 버전     |
| ----------- | -------- |
| **Node.js** | v22.17.0 |
| **pnpm**    | 10.29.2  |

> Nx, TypeScript, Webpack 등 나머지 도구는 `package.json`에 버전이 명시되어 있으며, `pnpm install` 시 자동 설치됩니다.

## 프로젝트 아키텍처

**Nx 모노레포** + **Module Federation** 기반 마이크로 프론트엔드. `apps/host`(셸, 로그인·레이아웃) + remote 앱들(`apps/manager`, `apps/fca`, `apps/ipron`, `apps/aoe`, `apps/insight`, `apps/ivr`, `apps/stt`, `apps/taskboard`) + 공유 라이브러리 `libs/shared-{ui,api,store,util}`. 각 remote는 `module-federation.config.ts`로 모듈을 노출하고 host가 런타임에 통합·라우팅. 상세 구조는 [DEVELOPER_GUIDE.md](doc/DEVELOPER_GUIDE.md) "2. 프로젝트 구조 이해하기" 참조.

> ⚠️ **`apps/custom`은 일반 업무 remote가 아닙니다** — 현장 커스터마이징 오버라이드 운반체(host remotes 배열 미등록, 런타임 동적 등록, 라우트·메뉴 없음)입니다. "모든 remote"를 대상으로 하는 작업(remote 점검·정규화, 빌드/serve 목록, 매뉴얼 생성, routes.tsx 일괄 수정 등)에서 **custom은 항상 제외**할 것. 상세는 [doc/CUSTOM_DEVELOPMENT_GUIDE.md](doc/CUSTOM_DEVELOPMENT_GUIDE.md) 참조.

## 개발 명령어

- **빌드·개발 서버**: `pnpm run build` / `pnpm run serve` (대화형 앱 선택 + 의존성 확인 포함). 특정 옵션이 필요한 경우에만 `npx nx <target> <project>` 사용.
- **새 Remote 생성**: 반드시 `pnpm run create-remote` 사용. Module Federation 설정·라우팅 등록 등 자동화 로직이 포함되어 수동 생성 시 정상 동작 안 함.
- **lint·typecheck**: husky + lint-staged가 pre-commit hook에서 스테이징된 `.{js,jsx,ts,tsx}`에 자동으로 `eslint --fix` + `prettier --write` 실행. 별도로 돌릴 때는 `npx nx lint <project>` / `npx nx typecheck <project>`.
- **shadcn 컴포넌트 추가**: `pnpm run shadcn:add <name>`.

자세한 워크플로우(브랜치, 커밋, 푸시 포함)는 [DEVELOPER_GUIDE.md](doc/DEVELOPER_GUIDE.md) "14. 개발 워크플로우" 참조.

### 새 Remote 생성 후 수동 단계 — 뱃지 아이콘

`create-remote`는 사이드바 좌측 60px 컬럼([PanelAppBadgeStrip.tsx](apps/host/src/app/features/layout/panel/PanelAppBadgeStrip.tsx))의 remote 뱃지 아이콘을 자동 처리하지 않습니다(미등록 시 lucide `SquareDashed` placeholder 표시). 신규 remote 정식 출시 전 다음 절차로 교체:

1. 디자인팀에 SVG 의뢰 (기존 `icon-remote-fca.svg`/`icon-remote-ipron.svg` 스펙 가이드로 첨부)
2. [libs/shared-ui/src/assets/images/icon/](libs/shared-ui/src/assets/images/icon/)에 `icon-remote-<appId>.svg`로 저장 (`<appId>`는 kebab-case)
3. [Icons.tsx](libs/shared-ui/src/components/custom/Icons.tsx)에 `IconRemote<AppId>` export 한 줄 추가
4. [PanelAppBadgeStrip.tsx](apps/host/src/app/features/layout/panel/PanelAppBadgeStrip.tsx)의 `APP_BADGE_ICONS`에 `<appId>: IconRemote<AppId>` 등록

> 메뉴 트리 항목별 아이콘(`menuIconRegistry`)과는 별개 자산. 상세는 [DEVELOPER_GUIDE.md](doc/DEVELOPER_GUIDE.md)의 "수동 단계 — remote 앱 뱃지 아이콘 추가" 참조.

## 기술 스택

React 19 + TypeScript 5.8, Webpack 5 + Module Federation, Nx 21, pnpm. UI는 Tailwind CSS v4 + shadcn/ui + Ant Design v6 + AG-Grid Enterprise + Lucide. 상태는 Zustand, 서버 상태는 TanStack Query, 폼은 React Hook Form + Zod, 라우팅은 React Router DOM 6.29. 날짜는 date-fns/dayjs, 유틸은 lodash, 테스트는 Jest + Testing Library. 정확한 버전은 `package.json` 참조.

## API 통합 가이드라인

API 통합 시 반드시 **TanStack Query**와 커스텀 훅을 사용합니다. 컴포넌트에서 `apiClient`를 직접 호출하지 마세요.

**API 계층/쿼리 훅을 작성할 때**: [.claude/skills/add-api/SKILL.md](.claude/skills/add-api/SKILL.md) 스킬을 사용합니다. apiClient 함수 정의, Query Key Factory, 쿼리/뮤테이션 훅 시그니처, 캐시 무효화 등 상세 규칙과 예시는 해당 스킬에 정리되어 있습니다.

### 핵심 규칙 (요약)

1. **apiClient 직접 사용 금지**: 컴포넌트에서 `apiClient`를 직접 import하여 사용하지 말 것
2. **Query Key Factory**: `@lukemorales/query-key-factory`의 `createQueryKeys` 사용
3. **훅 파라미터**: 쿼리 훅은 `{ params, queryOptions }`, 뮤테이션 훅은 `{ mutationOptions }` 사용
4. **훅 네이밍**: `useGet<Feature>s` (목록), `useGet<Feature>` (단건), `useCreate<Feature>`, `useUpdate<Feature>`, `useDelete<Feature>`
5. **캐시 무효화**: 컴포넌트에서 `mutationOptions.onSuccess`를 통해 처리
6. **응답 타입**: 모든 응답은 단일 엔벨로프 타입 `ApiResponse<T>`(`@/shared-util`)로 감싸고, api 함수 return부에서 `data`(목록은 `items`)를 직접 추출. 별도 응답 타입·추출 유틸을 만들지 말 것

## 커밋 가이드라인

이 프로젝트는 **commitizen** + cz-git을 사용합니다. 사람이 직접 커밋할 때는 `pnpm commit`(대화형)을 사용하세요.

## 파일 구조 컨벤션

`apps/fca`가 **레퍼런스 구현**. 신규 remote 생성·기존 remote 점검(`/update-remote`) 시 이 구조 기준으로 정규화. 상세 트리·표는 [DEVELOPER_GUIDE.md](doc/DEVELOPER_GUIDE.md) "2. 프로젝트 구조 이해하기" 참조.

### remote 앱 구조

- `apps/<remote>/src/app/pages/<route-group>/<Page>.tsx` — 라우트에 1:1 매핑되는 페이지. 라우트 그룹은 kebab-case, 파일은 PascalCase
- `apps/<remote>/src/app/features/<feature>/{api,components,constants,hooks,tabs,types,utils}/` — feature별 로직. 필요한 하위만 생성
- `apps/<remote>/src/app/features/router/` — 라우팅 보조 모듈 전용(도메인 feature 아님). 세션 핸들러·`DynamicElement`·variant manifest·query selector aggregator 위치
- `pages/<route-group>/variants/` — 화면 커스터마이징 변형(상세는 "화면 커스터마이징(Variants) 패턴" 참조)
- 상세 페이지의 탭 컴포넌트는 `pages/`가 아니라 `features/<feature>/tabs/`에 둠

### 공유 라이브러리

- `libs/shared-ui/src/components/shadcn/` — shadcn/ui 컴포넌트
- `libs/shared-ui/src/components/custom/` — 커스텀 재사용 컴포넌트
- `libs/shared-store/`, `libs/shared-util/`, `libs/shared-api/` — 각각 전역 스토어/유틸/API·타입

## Import 경로 컨벤션

- **같은 앱 내부**: 상대 경로 (`./`, `../../`)
- **공유 라이브러리·다른 앱**: `@` 별칭 절대 경로 (가장 짧은 별칭 사용)

`tsconfig.base.json`에 정의된 별칭:

| 전체 경로                                | 별칭                    |
| ---------------------------------------- | ----------------------- |
| `libs/shared-ui/src/components/shadcn/*` | `@/components/ui/*`     |
| `libs/shared-ui/src/components/custom/*` | `@/components/custom/*` |
| `libs/shared-ui/src/lib/utils`           | `@/lib/utils`           |
| `libs/shared-util/src/lib/log.ts`        | `@/log`                 |
| `libs/shared-util/src/index.ts`          | `@/shared-util`         |
| `libs/shared-api/src/index.ts`           | `@/shared-api`          |
| `libs/shared-store/src/index.ts`         | `@/shared-store`        |
| `libs/*`                                 | `@/libs/*`              |
| `apps/*`                                 | `@/app/*`               |

흔한 import 예시는 [DEVELOPER_GUIDE.md](doc/DEVELOPER_GUIDE.md) "10. Import 경로 규칙" 참조.

## 코딩 컨벤션

### 컴포넌트 Export 패턴

- **컴포넌트**: `default export`. `forwardRef` 컴포넌트는 `default export` + `displayName` 지정 필수
- **API 함수·유틸·타입·상수**: `named export`. API는 `export const <feature>Api = { ... }` 객체 형태

### 타입 정의 컨벤션

타입 파일은 `features/<feature>/types/` 아래에 도메인별로 분리하고, `index.ts`에서 barrel export합니다.

#### 파일 구조

```
features/<feature>/types/
├── index.ts          # barrel export (export * from './bot'; ...)
├── bot.ts            # 봇 관련 타입
├── model.ts          # 모델 관련 타입
├── intent.ts         # 의도 관련 타입
└── entity.ts         # 개체 관련 타입
```

#### DTO 서픽스 규칙

용도에 따라 서픽스를 붙여 타입을 구분합니다:

| 서픽스        | 용도                      | 예시                                 |
| ------------- | ------------------------- | ------------------------------------ |
| (없음)        | 기본 도메인 타입          | `Bot`, `Model`                       |
| `ListItem`    | 목록 조회용 (제한된 필드) | `BotListItem`, `ModelListItem`       |
| `Item`        | 상세 조회용 (확장된 필드) | `BotItem`, `ModelItem`               |
| `CreateDatas` | 생성 요청용               | `BotCreateDatas`, `ModelCreateDatas` |
| `UpdateDatas` | 수정 요청용               | `BotBasicInfoUpdateDatas`            |

```typescript
// 기본 도메인 타입
export interface Bot {
  serviceId: string;
  serviceName: string;
  serviceDesc?: string;
  confidence: [number, number];
  tags?: string[];
}

// 목록용 - Omit으로 불필요한 필드 제거 + 추가 필드
export type BotListItem = Omit<Bot, 'serviceDesc' | 'confidence'> & {
  conversationCount: number;
  updateTime: string;
};

// 상세 조회용 - 교차 타입으로 확장
export type BotItem = Bot & BotSchedule & BotVoice;

// 생성용 - Omit으로 서버 생성 필드 제거
export type BotCreateDatas = Omit<Bot, 'serviceId' | 'workTime'> & BotVoice;

// 수정용
export type BotBasicInfoUpdateDatas = Omit<Bot, 'workTime'>;
```

#### 상태값·매핑 타입 — 상수 객체 + 파생 타입 패턴

여러 모듈에서 비교·매핑·순회되는 도메인 상태값(API enum, 처리 상태, 카테고리 등)은 **인라인 union 리터럴로 박지 말고, `as const` 상수 객체를 SoT(Single Source of Truth)로 두고 거기서 타입을 파생**합니다.

```typescript
// ❌ 인라인 union 리터럴 — SoT가 흩어지고, 문자열을 직접 비교해야 함
export type TrainStatus = 0 | 1 | 2 | 3;
export type TrainDiffStatus = 'ADDED' | 'MODIFIED' | 'DELETED';

if (status === 'ADDED') { ... } // 오타 시 컴파일러가 잡지만, 사용처마다 매번 문자열

// ✅ 상수 객체를 SoT로 + typeof로 타입 파생
export const TRAIN_STATUS = {
  WAITING: 0,
  RUNNING: 1,
  SUCCESS: 2,
  FAILED: 3,
} as const;
export type TrainStatus = (typeof TRAIN_STATUS)[keyof typeof TRAIN_STATUS];

export const TRAIN_DIFF_STATUS = {
  ADDED: 'ADDED',
  MODIFIED: 'MODIFIED',
  DELETED: 'DELETED',
} as const;
export type TrainDiffStatus = (typeof TRAIN_DIFF_STATUS)[keyof typeof TRAIN_DIFF_STATUS];

// 사용처 — 상수 참조로 오타 방지, Go to Definition으로 SoT 추적 가능
if (status === TRAIN_DIFF_STATUS.ADDED) { ... }

// 부가 매핑(라벨·색상)을 같은 모듈에 묶어 일관 관리
export const TRAIN_DIFF_STATUS_LABELS: Record<TrainDiffStatus, string> = {
  ADDED: '추가',
  MODIFIED: '수정',
  DELETED: '삭제',
};
```

핵심 규칙 (요약):

- **상수 객체 권장**: 도메인 상태값(API enum 매핑), 여러 모듈에서 비교·매핑·순회되는 값, 라벨/색상/아이콘 등 부가 메타데이터가 따라붙는 값, Select·Radio 옵션을 동적으로 생성해야 하는 값
- **인라인 union 허용**: 한 모듈/한 컴포넌트에서만 쓰이는 ad-hoc 타입, 컴포넌트 prop의 좁은 variant union(`size?: 'sm' | 'md' | 'lg'`), 외부 라이브러리 타입을 그대로 받는 자리
- **`enum` 사용 금지**: TS `enum`은 트리쉐이킹·`erasableSyntaxOnly` 호환성·번들 사이즈 등 이슈가 있어 사용하지 않음. 위 `as const` 패턴이 표준 대안
- **네이밍**: 상수 객체는 `UPPER_SNAKE_CASE`, 타입은 `PascalCase`. 부가 매핑은 `<도메인>_LABELS`, `<도메인>_COLORS` 등 일관된 접미사 사용

상세 장단점, 선택 기준, 흔한 실수는 [DEVELOPER_GUIDE.md](doc/DEVELOPER_GUIDE.md)의 "4. 타입 정의 가이드 → 상태값·매핑 타입" 섹션 참조.

### 이벤트 핸들러 패턴

컴포넌트 props에 콜백을 전달할 때 인라인 함수 대신 `handle` 접두사 함수(`handleClose`, `handleSubmit` 등)로 추출해 전달. 한 줄 짜리 단순 위임(`onClick={fn}`)은 그대로 전달 가능.

### 모달/드로어 제어 패턴

모달과 드로어는 `forwardRef` + `useImperativeHandle`을 사용하여 부모에서 명령형으로 제어합니다. 상세 절차는 [.claude/skills/add-drawer/SKILL.md](.claude/skills/add-drawer/SKILL.md) 스킬 참조.

### 트리 UI 패턴

트리 UI는 antd `Tree` 신규 도입이나 재귀 렌더 직접 구현 대신 **공통 트리**(`useTreeView` 훅 + `TreeView` 프리미티브, headless-tree 기반)를 사용합니다. 작성 전 트리 적합성 판정(평탄 목록·이종 시각화·TreeSelect 케이스는 트리 아님), 기본 골격, 검색·hover 액션·카운트·툴팁 표준 규격, 외부 DnD 수신·reorder 등 상세 절차는 [.claude/skills/add-tree/SKILL.md](.claude/skills/add-tree/SKILL.md) 스킬 참조.

### AG-Grid 사용 패턴

`useAggridOptions` 훅으로 공통 그리드 옵션을 적용하고, `ColDef<RowType>[]`로 컬럼을 정의합니다. 편집 가능 컬럼·커스텀 렌더러·액션 컬럼·커스텀 셀 에디터 구성 등 상세 절차는 [.claude/skills/add-grid/SKILL.md](.claude/skills/add-grid/SKILL.md) 스킬 참조.

#### SSRM(Server-Side Row Model) — 서버 페이징 그리드

백엔드가 `page`/`size` 페이징을 지원하고 데이터 규모가 큰 화면(수천 건 이상)은 ClientSide가 아닌 **SSRM**을 사용합니다. AG-Grid Enterprise 기능이며 `libs/shared-ui/src/lib/aggridSetup.ts`가 `AllEnterpriseModule`을 등록해 두어 즉시 사용 가능. 레퍼런스: [BotDialogHistoryTable.tsx](apps/fca/src/app/features/tracking/components/BotDialogHistoryTable.tsx).

핵심 규칙:

- **TanStack Query 병용 금지**: SSRM은 그리드 자체 블록 캐시(행 범위 단위)를 가지므로 `useGet<Feature>` 훅과 같이 쓰지 말 것. `IServerSideDatasource.getRows`에서 `apiClient`를 직접 호출
- **`cacheBlockSize === paginationPageSize`**: 반드시 일치. 안 그러면 페이지당 백엔드 호출이 N배
- **`getRowId` 필수**: 페이지 이동 후 행 강조 안정성. PK 단일 또는 PK 트리플(예: `${ucid}_${nextHop}_${cdrPkey}`) 활용
- **검색 트리거**: `searchParams` 객체 의존성 ❌ → 부모에서 `searchVersion` 카운터를 만들어 검색 버튼 클릭마다 +1, 자식 그리드는 `useEffect([searchVersion])`에서 `gridApi.refreshServerSide({ purge: true })` 호출
- **datasource 안정화**: `useMemo([])`로 1회 생성 + `searchParamsRef`로 최신 검색조건을 클로저에 흘림. 매 렌더 재생성 ❌
- **정렬**: 백엔드 sort 미지원이면 `defaultColDef: { sortable: false }`로 그리드 단위 비활성화 (헤더 클릭 시 잘못된 결과 방지)
- **AgGridReact props**: `rowData`/`loading` 제거 필수 (SSRM과 충돌 경고)
- **페이지네이션 UI**: `useAggridOptions` 기본 statusBar의 `AggridPagination` 활용 — `pagination: false`/`statusBar: undefined` override 금지
- **부모 콜백**: `onLoadingChange`(SearchForm spinner용), `onTotalRowsChange`(빈 데이터 체크용) 두 콜백을 자식 그리드가 부모에 노출
- **`params.fail()`**: try/catch 안에서 누락 시 네트워크 실패 시 그리드가 영원히 로딩 표시
- **`selectedRowId` 강조**: 외부 state 변경은 자동 감지 안 됨 → `useEffect([selectedRowId])` + `gridApi.redrawRows()`로 즉시 반영

상세 표준 골격(자식 그리드·부모 페이지 양쪽 코드 + 함정 체크리스트 + ClientSide 비교)은 [DEVELOPER_GUIDE.md](doc/DEVELOPER_GUIDE.md)의 "AG-Grid 사용 가이드 → SSRM(Server-Side Row Model)" 섹션 참조.

### Zustand 스토어 컨벤션

feature 단위 로컬 상태는 `hooks/use<Feature>Store.ts`, 전역 공유 상태는 `libs/shared-store/`에 정의합니다.

#### 핵심 규칙 (요약)

- 상태는 직접 변경하지 말고 반드시 `set` 메서드를 통해 업데이트
- 각 상태 필드마다 대응하는 `set<Field>` 메서드를 정의
- 단일 인터페이스에 상태 + 액션을 함께 정의
- 모든 스토어에 `devtools` 미들웨어 적용, `set()` 호출 시 세 번째 인자로 액션 이름 지정

기본 스토어·영속 스토어(`persist` + `createJSONStorage`) 작성 예시는 [.claude/skills/add-store/SKILL.md](.claude/skills/add-store/SKILL.md) 스킬 참조.

### 유틸리티 사용 패턴

#### 로깅

```typescript
import { Log } from '@/log';

Log.debug('onFinish', values); // 디버그 로그
Log.warn('onFinishFailed', errorInfo); // 경고 로그
```

#### UUID 생성

```typescript
import { createUUID } from '@/shared-util';

const id = createUUID(); // ✅ 비-secure context에서도 동작
```

`crypto.randomUUID()`는 **secure context(HTTPS·localhost) 전용 API**라 HTTP+IP로 접속하는 개발계에서는 `undefined`가 되어 `TypeError: crypto.randomUUID is not a function`이 발생한다. 반드시 `crypto.getRandomValues` 기반인 공용 유틸 `createUUID`(`@/shared-util`)를 사용할 것.

#### 토스트 알림

```typescript
import { toast } from '@/shared-util';

toast.success('봇이 저장되었습니다.');
toast.error('오류가 발생했습니다.');
toast.warning('학습이 완료된 모델만 배포할 수 있습니다.');
```

#### 확인 모달 (useModal)

```typescript
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const modal = useModal();

// 삭제 확인
modal.confirm.delete({
  onOk: () => deleteBot({ serviceId }),
});

// 커스텀 확인
modal.confirm.execute({
  options: {
    title: '모델배포 확인',
    okText: '배포',
    cancelText: '취소',
  },
  onOk: () => deployModel({ ... }),
});
```

#### 로딩 스피너 (FallbackSpinner)

페이지·영역 로딩 중 표시가 필요할 때는 antd `Spin`이나 shadcn `Spinner`를 직접 쓰지 말고 **공통 컴포넌트 `FallbackSpinner`(`@/components/custom/FallbackSpinner`)를 기본**으로 사용합니다.

```typescript
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

// 페이지/컨테이너 로딩 (부모 영역 기준 중앙 정렬, 기본 size 100)
if (isLoading) return <FallbackSpinner />;

// 전체 화면 로딩
<FallbackSpinner useFullScreen />

// 드로어·모달 내부 섹션 로딩 — size 축소 + 안내 문구
<FallbackSpinner size={36} tip="대화 내용을 불러오는 중..." />
```

예외 (FallbackSpinner를 강제하지 않는 경우):

- **용도가 다른 경우**: 버튼 내부 로딩(antd `Button loading`), 리스트 항목 옆 소형 인라인 진행 표시(lucide `Loader2` + `animate-spin`) 등 "영역 로딩"이 아닌 항목 단위 인디케이터
- **사용자가 직접 다른 컴포넌트를 지시한 경우**: 지시를 따름

### 라우팅(routes.tsx) 컨벤션

각 remote의 라우팅은 `apps/<remote>/src/app/routes.tsx` 한 파일에 정의하며, **`apps/fca/src/app/routes.tsx`를 레퍼런스**로 삼습니다.

#### 핵심 규칙 (요약)

1. **페이지는 `React.lazy`로 지연 로드**: 모든 페이지 컴포넌트는 파일 상단에서 `const Xxx = React.lazy(() => import('./pages/...'))`로 선언. 라우트 그룹 순서대로 묶어 선언하고, 페이지는 `./pages/...` 상대 경로로 import. (직접 import하면 모든 페이지가 한꺼번에 로드되어 초기 로딩이 느려짐)
2. **`routes` named export**: 라우트 트리는 `export const routes = [...]` 배열로 내보냄
3. **단일 루트 + Outlet 그룹**: 최상위는 `{ path: '/', element: <세션핸들러 또는 Outlet>, children: [...] }` 하나. 2-depth 이상 라우트 그룹은 `{ path: '<group>', element: <Outlet />, children: [...] }`로 표현
4. **leaf 페이지는 변형 소켓(pv)으로 래핑**: 파일 상단에 `const pv = createPageVariantSocket('<appId>')`를 1회 선언하고, 실제 화면을 그리는 leaf element는 `pv('<화면 키>', Component)`로 작성. 화면 키는 **라우트 경로 그대로**(동적 세그먼트 `:paramId` 포함 — 예: `bot-config/bot/:serviceId`, `cos/:cosId/edit`). 그룹 index가 페이지를 직접 그리면 그룹 경로가 키(예: `cos`). 키는 DB page-variant row·custom remote exposes와 매칭되는 SoT이므로 **한번 정하면 변경 금지** — 이후 라우트 경로·파라미터명이 리팩토링으로 바뀌어도 키는 유지(키가 경로와 어긋나는 건 허용, 끊어지는 게 문제). 레이아웃(`<Feature>DetailLayout`)·`Navigate`·`NotFound`는 소켓 제외
5. **index redirect**: 루트·각 그룹의 children 첫 항목은 기본 하위로 보내는 `{ index: true, element: <Navigate to="<default>" replace /> }`. 동적 세그먼트 하위 그룹의 index는 `<Navigate to=".." replace />`로 부모 복귀
6. **동적 세그먼트**: `:paramId` 형태(camelCase). 탭 레이아웃이 필요한 상세 페이지는 `element`에 `<Feature>DetailLayout`, `children`에 탭·하위 라우트를 둠
7. **공통 라우트는 복사 작성**: 여러 path에서 동일 라우트 묶음을 재사용하더라도 각 path에 그대로 복사. spread 패턴(`children: [...sharedXxxRoutes]`)은 정적 분석·도구 정합성에 한계가 있어 표준에서 제외 (상세 이유는 DEVELOPER_GUIDE 참조). 메뉴 컨텍스트가 다른 복사 라우트는 화면 키도 분리(`bot-config/model/list` vs `global/model/list`)
8. **catch-all은 항상 마지막**: `routes` 배열 마지막 항목은 `{ path: '*', element: <NotFound homePath="/" /> }`
9. **path는 kebab-case**: `bot-config`, `bot-dialog-history`, `call-bot` 등
10. **라우팅 보조 모듈은 `features/router/`**: 세션 이벤트 핸들러·variant manifest·query selector 등은 `features/router/`에 두고 routes.tsx는 import만 함
11. **변형·분기**: 정식 variant(2개 이상)를 가진 path만 `pv` 대신 `<DynamicElement variants={...} />`를 직접 사용("화면 커스터마이징(Variants) 패턴" 참조), queryString 분기 path는 `handle.queryParams`를 선언("queryString 기반 메뉴 분기 패턴" 참조 — `pv` 소켓과 공존 가능)
12. **페이지 컴포넌트 네이밍은 기능명만**: 페이지 `.tsx` 파일명과 lazy 변수명은 `<기능명>` 또는 `<기능명><역할>`(역할 = `List`·`Create`·`Detail` 등) 형태로 **기능명만** 사용하고, `Page`처럼 "페이지임"을 나타내는 군더더기 접미사를 붙이지 않음. fca를 기준으로 통일 — ❌ `RoleCreatePage`, `NodeListPage`, `AccountPolicyPage` → ✅ `RoleCreate`, `NodeList`, `AccountPolicy`

```typescript
// apps/<remote>/src/app/routes.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { createPageVariantSocket } from '@/components/custom/DynamicElement';
import { NotFound } from '@/components/custom/NotFound';

// 페이지 — 라우트 그룹 순서대로 묶어 lazy 선언
const BotList = React.lazy(() => import('./pages/bot-config/BotList'));
const BotCreate = React.lazy(() => import('./pages/bot-config/BotCreate'));
const BotDetail = React.lazy(() => import('./pages/bot-config/BotDetail'));

// 변형 소켓 — path 인자는 화면 식별 키(라우트 경로 그대로, 동적 세그먼트 포함)
const pv = createPageVariantSocket('fca');

export const routes = [
  {
    path: '/',
    element: <Outlet />, // 또는 remote별 세션 핸들러 (예: <FcaWsSessionEventHandler />)
    children: [
      { index: true, element: <Navigate to="/" replace /> },
      {
        path: 'bot-config', // 라우트 그룹 — kebab-case
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="bot" replace /> },
          {
            path: 'bot',
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: pv('bot-config/bot/list', BotList) },
              { path: 'create', element: pv('bot-config/bot/create', BotCreate) },
              { path: ':serviceId', element: pv('bot-config/bot/:serviceId', BotDetail) }, // 동적 세그먼트 — 키에도 그대로 포함
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound homePath="/" /> }, // 항상 마지막
];
```

상세 골격·중첩 상세 페이지·공통 라우트 추출 예시는 [DEVELOPER_GUIDE.md](doc/DEVELOPER_GUIDE.md)의 "라우팅(routes.tsx) 가이드" 섹션 참조.

### 페이지 Breadcrumb 패턴

페이지의 breadcrumb은 **페이지 본문이 아니라 host의 SubHeader가 그립니다**. host 레이아웃의 `BreadcrumbSlot`이 `useBreadcrumbStore`(libs/shared-store)를 구독해 SubHeader 우측에 렌더하므로, 각 페이지 컴포넌트는 mount 시 store에 push하고 unmount 시 clear하는 책임만 갖습니다. 페이지 본문에 `<Breadcrumb />` 등 breadcrumb 컴포넌트를 직접 두지 마세요.

#### 핵심 규칙 (요약)

1. **store 위치**: `useBreadcrumbStore` (from `@/shared-store`) — `setBreadcrumb(items, params?)` / `clearBreadcrumb()`
2. **호출 위치**: 페이지 컴포넌트 본문 시작부의 `useEffect`. mount 시 set, cleanup에서 clear
3. **deps 규칙**: 정적 breadcrumb이면 `[setBreadcrumb, clearBreadcrumb]`만, 분기/동적 라벨이 있으면 그 deps도 포함 (`isPublic`, `params`, fetch 결과 등)
4. **동적 라벨**: breadcrumb item title을 `:paramName` 형태로 적고 `setBreadcrumb`의 두 번째 인자로 `{ paramName: value }` 전달 → BreadcrumbSlot이 치환
5. **path 없는 항목**: 부모(redirect-only 그룹 등)는 `path` 없이 두면 BreadcrumbSlot이 비링크 텍스트로 렌더해 클릭이 자연스럽게 비활성
6. **remote 이름 라벨은 페이지에서 작성하지 않음**: host BreadcrumbSlot이 `useCurrentRemote().appName`을 자동 prepend(비링크). 페이지는 카테고리부터 시작. 결과 합성: `🏠 > [appName] > 페이지 items`. 상세는 DEVELOPER_GUIDE 참조

#### 예시

```typescript
// 정적 breadcrumb
const breadcrumb: BreadcrumbProps['items'] = [
  { title: '관리', path: '/fca/bot-config' },
  { title: '봇', path: '/fca/bot-config/bot' },
  { title: '봇 목록', path: '/fca/bot-config/bot/list' },
];

export default function BotList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  // ...
}

// 동적 라벨 (fetch 결과 의존)
export default function BotDetail() {
  const { serviceId } = useParams();
  const { data: bot } = useGetBot({ params: { serviceId } });
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    const items: BreadcrumbProps['items'] = [
      { title: '관리', path: '/fca/bot-config' },
      { title: '봇', path: '/fca/bot-config/bot' },
      { title: ':botName', path: `/fca/bot-config/bot/${serviceId}` },
    ];
    setBreadcrumb(items, { botName: bot?.serviceName ?? '-' });
    return () => clearBreadcrumb();
  }, [serviceId, bot?.serviceName, setBreadcrumb, clearBreadcrumb]);

  // ...
}
```

분기(예: `isPublic`)가 있으면 useEffect 내부에서 조건 분기로 items를 선택하고 deps에 분기 키를 포함합니다. early-return으로 로딩 분기되는 페이지도 hook 순서가 깨지지 않도록 useEffect는 본문 시작부에 두세요.

### 화면 커스터마이징(Variants) 패턴

테넌트별로 같은 path에서 다른 컴포넌트를 렌더하고 싶을 때 사용합니다. routes.tsx의 path는 그대로 두고 element만 운영자 선택값에 따라 바꾸는 구조입니다.

#### 핵심 규칙 (요약)

1. **변형 정의 파일 위치**: 페이지 옆에 `<Page>.variants.ts`로 co-location (예: `pages/bot-config/BotList.variants.ts`)
2. **aggregator**: 각 remote의 `apps/<remote>/src/app/features/router/pageVariants.ts`에 모든 variants 파일을 import해서 등록 (MF `./PageVariants`로 expose)
3. **DynamicElement 래퍼**: 변형 지원 path는 `routes.tsx`에서 `<DynamicElement variants={...} />`로 감싸 element를 런타임 lookup으로 전환
4. **컴포넌트 prop 호환성 필수**: 같은 variants 그룹의 모든 컴포넌트는 동일 prop·context·query key를 사용. 본질이 다르면 variant가 아니라 별도 path로 분리
5. **점진적 도입**: 변형 필요 없는 path는 정적 element 그대로 두고 건드리지 않음. variant 요구사항 생긴 page만 합류
6. **variant 전용 sub 컴포넌트는 폴더 승격으로 격리**: 변형이 단일 파일을 넘어 자기 전용 sub 컴포넌트(탭·드로어 등)를 가지면 `variants/<Variant>/` 폴더로 승격해 진입점을 `index.tsx`로 둠(`*.variants.ts`의 lazy import 경로는 그대로 폴더를 가리킴 — webpack이 index로 해석). 정식 `features/<feature>/...`에 variant 전용 코드를 섞지 않음

#### 데이터 흐름

- **API/DB**: 메뉴 row의 `componentKey` 컬럼이 SoT
- **store**: `useMenuStore.menuConfigs[].menus[].componentKey`로 propagate
- **렌더**: DynamicElement가 menuStore lookup → 매칭되는 variant component 렌더, 누락·미등록 시 defaultKey fallback
- **picker**: 호스트의 `usePageVariantsStore`(메타만 보관)를 메뉴 관리 화면 picker에서 읽어 카드 그리드 노출

새 변형 컴포넌트 작성·등록 절차 및 picker 통합 상세는 [DEVELOPER_GUIDE.md](doc/DEVELOPER_GUIDE.md)의 "화면 커스터마이징(Variants) 가이드" 섹션 참조.

### queryString 기반 메뉴 분기 패턴

같은 path를 여러 메뉴가 공유하면서 queryString으로 화면 분기를 하는 패턴(예: 같은 대시보드 골격에 메뉴마다 다른 위젯 preset)에 사용합니다. 메뉴 등록 폼이 path별로 어떤 query 입력을 받을지 자동 인지하도록 하는 것이 핵심입니다.

#### 핵심 규칙 (요약)

1. **routes.tsx의 `handle.queryParams`에 spec 선언**: React Router 표준 `handle` 슬롯에 `{ key, label, selectorKey, ...extra }` 형태로 박는다. host의 `flattenRoutes`가 추출해 `RemoteRouteEntry.queryParams`로 전파.
2. **selectorKey 하드코딩 금지**: 반드시 `DefaultSelectorKeys`(공통) 또는 remote의 `SelectorKeys`(자체 도메인) 상수에서 import해서 사용. 오타·휴먼에러 방지.
3. **공통 selector vs 도메인 selector 구분**:
   - **공통 selector**: 옵션을 routes.tsx의 spec에서 받는 generic selector(EnumSelector 등). manager가 작성·등록하고 모든 remote가 `DefaultSelectorKeys.Xxx`로 공유.
   - **도메인 selector**: 옵션을 selector 컴포넌트가 자체 정의/fetch하는 selector(특정 도메인 데이터에 결합). 해당 remote가 자기 `features/router/selectors/`에 작성하고 자체 `querySelectors.ts` aggregator에 등록.
4. **selectorKey는 appId prefix 자동 적용**: host의 `useQuerySelectorsLoader`가 각 remote의 querySelectors를 `<appId>:<key>` 형태로 통합 registry에 적재. 같은 이름 selector가 여러 remote에 있어도 prefix로 자연스럽게 분리됨.
5. **메뉴 폼 자동 인지**: 운영자가 path 선택 시 `RemoteRouteEntry.queryParams`를 보고 `QuerySelectorRenderer`가 selector를 동적으로 노출 → 선택값을 path에 `?key=value`로 합성해서 저장.

#### 데이터 흐름

- **routes.tsx**: `handle.queryParams`로 path별 query spec 선언
- **MF expose**: 각 remote의 `apps/<remote>/src/app/features/router/querySelectors.ts`가 `'./QuerySelectors'`로 expose
- **store**: `useQuerySelectorsStore.registry`에 `<appId>:<key>` → 컴포넌트 맵으로 적재 (host 부팅 시)
- **메뉴 폼**: path Select 변경 시 entry.queryParams 감지 → registry lookup → selector 렌더 → 운영자 선택값을 `URLSearchParams`로 합성해 path 컬럼 저장
- **사용자 진입**: 메뉴 클릭 → 해당 path로 이동 → 컴포넌트가 `useSearchParams`로 query 읽어 화면 분기

#### 사용 예시

```tsx
// routes.tsx — 공통 selector (옵션은 spec.options에 하드코딩)
import { DefaultSelectorKeys } from '@/shared-store';

{
  path: 'dashboard',
  element: pv('dashboard', Dashboard),
  handle: {
    queryParams: [
      {
        key: 'option',
        label: '옵션',
        selectorKey: DefaultSelectorKeys.EnumSelector,
        options: [
          { value: 'A', label: '옵션 A' },
          { value: 'B', label: '옵션 B' },
        ],
      },
    ],
  },
}

// routes.tsx — 도메인 selector (옵션은 selector 컴포넌트 내부에 정의)
import { SelectorKeys } from './features/router/querySelectors';

{
  path: 'preset-demo',
  element: pv('sample/preset-demo', PresetDemo),
  handle: {
    queryParams: [
      { key: 'preset', label: '프리셋', selectorKey: SelectorKeys.PresetSelector },
    ],
  },
}
```

> 분기 값을 fetch 인자로 사용한다면 React Query 일반 규칙대로 queryKey에 포함시켜 메뉴별 캐시를 분리합니다(`createQueryKeys` factory에 인자로 받으면 자동 적용).
>
> 메뉴 등록·편집 폼은 `handle.queryParams`에 선언된 모든 query를 무조건 필수 입력으로 검증합니다(빈 값 저장 불가, 옵트인 옵션 없음 — 선택적 query 키 케이스는 의도적으로 미지원).
>
> 분기 메뉴 페이지의 breadcrumb은 leaf 항목 `path`에 query 값을 직접 합성해 자기 자신을 가리키도록 작성합니다(예: <code>path: \`/fca/sample/preset-demo?preset=${preset}\`</code>). 상위(부모) 항목은 redirect-only 그룹인 경우가 많아 query 처리가 애매하므로 `path`를 작성하지 않는 것을 권장합니다 — host의 BreadcrumbSlot이 path 없는 항목을 비링크 텍스트로 렌더해 클릭 자체를 비활성합니다.

#### 주의사항 — 컴포넌트 remount 처리

같은 path를 여러 메뉴가 공유할 때 메뉴 A→B 전환 시 React가 같은 컴포넌트 인스턴스를 재사용해 form state·scroll·진행 중 mutation이 유지됩니다. 페이지에서 outer/inner 분할 + `<Inner key={queryValue} />`로 강제 remount 필요. 분기 키 문자열은 routes의 `handle.queryParams[].key`·페이지의 `searchParams.get(...)`·(있다면) TanStack Query key 세 곳에 박아야 하며 non-data router 환경에서 자동 동기화는 불가하므로 작성자가 일관성을 챙겨야 함(키가 1~2개로 짧으면 하드코딩, 재사용·오타 위험·키 2개 이상이면 `<Page>.consts.ts`로 상수화). 자동화 메커니즘은 검토했으나 효과가 없어 React 표준 `key` 패턴을 정공법으로 채택([DEVELOPER_GUIDE.md](doc/DEVELOPER_GUIDE.md)의 "queryString 기반 메뉴 분기 가이드 → 주의사항 — 컴포넌트 remount 처리" 참조).

상세 절차(새 selector 추가, create-remote 자동화 등)는 [DEVELOPER_GUIDE.md](doc/DEVELOPER_GUIDE.md)의 "queryString 기반 메뉴 분기 가이드" 섹션 참조.

### 상수 정의 패턴

상수는 `features/<feature>/constants/` 아래에 정의합니다.

#### 네이밍 규칙

- 상수명: `UPPER_SNAKE_CASE`
- 파일명: `<feature>Constants.ts` (camelCase)
- 객체 상수는 `as const`로 불변 처리

```typescript
// features/dashboard/constants/dashboardConstants.ts

// 단순 상수
export const GRID_COLS = 12;
export const REFRESH_INTERVAL = 3000;

// 색상 매핑 상수
export const CHART_COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#F06548',
} as const;

// 라벨 매핑 (Record 타입 사용)
export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  SAME: '동의어',
  SYNONYMS: '유사어',
  PATTERNS: '패턴형',
};

// 색상 매핑
export const ENTITY_TYPE_COLORS: Record<EntityType, string> = {
  SAME: 'blue',
  SYNONYMS: 'green',
  PATTERNS: 'orange',
};
```

### 아이콘 사용 패턴

새 아이콘이 필요하면 **lucide 아이콘을 사용**하거나 **직접 SVG를 추가**하는 두 가지만 쓴다. 다른 아이콘 라이브러리를 새로 도입하거나, 컴포넌트에 인라인 `<svg>` 마크업을 직접 박지 말 것.

- **lucide (`lucide-react`) — 1순위**: 범용 UI 아이콘(검색·추가·삭제·화살표 등)은 lucide를 우선 사용. `import { Search, Plus } from 'lucide-react'`로 가져와 그대로 사용하며 별도 등록이 필요 없다
- **커스텀 SVG**: 디자인팀 제공 자산이나 lucide에 없는 브랜드·도메인 전용 아이콘만 해당. `libs/shared-ui/src/assets/images/icon/icon-<name>.svg`(kebab-case, `icon-` 접두사)로 저장하고 [Icons.tsx](libs/shared-ui/src/components/custom/Icons.tsx)에 `export { ReactComponent as Icon<Name> } from '../../assets/images/icon/icon-<name>.svg';` 한 줄을 추가한 뒤 import해서 사용 (svgr이 React 컴포넌트로 변환)

> 위 규칙은 **일반 UI 아이콘** 기준이다. 다음 두 경우는 별도 메커니즘을 따르므로 혼동하지 말 것:
>
> - **메뉴 트리 아이콘**(사이드바 메뉴 항목): 운영자가 picker에서 선택. [menuIconRegistry.ts](libs/shared-ui/src/components/custom/menuIconRegistry.ts)에 `custom:`(커스텀 SVG)·`lucide:` 키로 등록된 아이콘만 노출되므로, 새 아이콘이 필요하면 레지스트리에 등록한다
> - **remote 뱃지 아이콘**(사이드바 좌측 60px 컬럼의 remote 대표 아이콘): 위 "새 Remote 생성 후 수동 단계 — 뱃지 아이콘" 절차를 따른다

상세 기준·절차는 [DEVELOPER_GUIDE.md](doc/DEVELOPER_GUIDE.md)의 "아이콘 사용 가이드" 섹션 참조.

### UI 레이아웃 규칙

레이아웃 배경(회색 계열) 위에 버튼·입력 필드·테이블 등을 직접 배치하지 말 것. 배경과의 시각적 분리가 없으면 요소가 부유하는 느낌을 주어 완성도가 떨어진다. 반드시 `bg-white bt-shadow` 컨테이너 또는 `Card`로 감싸 콘텐츠 영역을 명확히 구분할 것.

#### 화면 패턴: 검색·필터 + 그리드 목록

목록 페이지의 표준 골격은 **상단 검색·필터 + 하단 그리드를 단일 흰색 래퍼로 묶는 구조**다. 필터와 그리드를 각각 별도의 `bg-white bt-shadow` 박스로 분리하지 말고, 하나의 래퍼 안에 `gap-5`로 간격을 두어 같은 영역에 속함을 시각적으로 표현한다.

```typescript
// ✅ 표준 패턴 — 단일 흰색 래퍼
// breadcrumb은 host SubHeader가 그리므로 페이지 본문에는 두지 않는다.
// 페이지 컴포넌트 본문 시작부에서 useBreadcrumbStore.setBreadcrumb을 호출한다.
<div className="flex flex-col gap-4 w-full h-full">
  <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
    {/* 인라인 필터·액션 헤더 */}
    <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
      <div className="flex items-center w-full gap-3">
        <Select ... />
        <Input ... />
      </div>
      <div className="flex items-center gap-2.5">
        <Button type="primary" onClick={handleCreate}>추가</Button>
      </div>
    </header>
    {/* 그리드 */}
    <div className="w-full h-full">
      <AgGridReact rowData={data} columnDefs={columnDefs} />
    </div>
  </div>
  {/* Drawer/Modal은 흰색 래퍼 밖, 외곽 컨테이너 안쪽 */}
  <SomeDrawer ref={drawerRef} />
</div>

// ❌ 필터와 그리드를 분리된 박스로 나누지 말 것
<div className="flex flex-col gap-4 w-full h-full">
  <div className="bg-white bt-shadow px-7 py-5 h-[76px]">{/* 필터 */}</div>
  <div className="bg-white bt-shadow w-full h-full">{/* 그리드 */}</div>
</div>
```

핵심 규칙 (요약):

- **외곽 컨테이너**: `flex flex-col gap-4 w-full h-full` — 흰색 래퍼 → Drawer 순으로 배치 (breadcrumb은 host SubHeader가 담당)
- **흰색 래퍼**: `flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5` — 필터·그리드를 모두 포함
- **인라인 필터 헤더**: `<header>` 시맨틱 태그 + `flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap` (좁은 화면에서 자연스럽게 줄바꿈)
- **검색 영역이 복잡한 경우**(다단 필터·`Collapsible`·전용 컴포넌트 분리): 자식 컴포넌트 내부에서 `bg-white bt-shadow`/`p-5`/`mb-4` 등 배경·여백 클래스를 추가하지 말 것 — 흰색 래퍼는 부모가 책임진다
- **그리드 컨테이너**: `w-full h-full`만 부여. 별도 배경·그림자 금지
- **Drawer·Modal**: 흰색 래퍼 밖, 외곽 컨테이너 안쪽에 배치

상세 절차(검색 폼 분리 기준, Collapsible 필터, 다중 그리드 등)는 [DEVELOPER_GUIDE.md](doc/DEVELOPER_GUIDE.md)의 "페이지 레이아웃 가이드 → 화면 패턴: 검색·필터 + 그리드 목록" 섹션 참조.

### 데이터 추가/수정 폼 패턴

데이터를 추가하거나 수정하는 UI를 구성할 때는 **Ant Design Form** 활용을 권장합니다. `useState`로 필드를 개별 관리하기보다 `Form.useForm`으로 폼 상태를 통합 관리하는 방향을 지향합니다.

#### 권장 사항 (요약)

1. **Form.useForm 활용**: `useState`로 필드를 개별 관리하기보다 폼 인스턴스로 통합 관리
2. **layout="vertical"**: 레이블이 입력 필드 위에 오는 수직 레이아웃 선호
3. **rules로 유효성 검사**: `required`, `min`, `max`, `pattern` 등 선언적으로 정의
4. **hasFeedback**: 유효성 검사 결과 아이콘(✓, ✕)을 필드에 표시
5. **onFinishFailed**: 첫 번째 에러 메시지를 `toast.error`로 안내
6. **수정 시 초기화**: `form.setFieldsValue()`로 API 데이터를 폼에 세팅
7. **Drawer 닫힐 때**: `form.resetFields()`로 폼 상태 초기화

기본 구조, 수정 페이지/탭 초기화, Drawer 폼 초기화·리셋 패턴, 제출 버튼 트리거 등 상세 절차는 [.claude/skills/add-form/SKILL.md](.claude/skills/add-form/SKILL.md) 스킬 참조.
