# 개발자 온보딩 가이드

이 문서는 프로젝트에 처음 합류하는 개발자를 위한 상세 가이드입니다.
CLAUDE.md의 컨벤션을 기반으로, **왜 이렇게 하는지**와 **흔히 하는 실수**를 중심으로 설명합니다.

---

## 목차

1. [환경 설정](#1-환경-설정)
2. [프로젝트 구조 이해하기](#2-프로젝트-구조-이해하기)
3. [새 기능 개발 체크리스트](#3-새-기능-개발-체크리스트)
4. [타입 정의 가이드](#4-타입-정의-가이드)
5. [API 연동 가이드](#5-api-연동-가이드)
6. [상태 관리 가이드](#6-상태-관리-가이드)
7. [UI 컴포넌트 작성 가이드](#7-ui-컴포넌트-작성-가이드)
8. [모달/드로어 패턴](#8-모달드로어-패턴)
9. [AG-Grid 사용 가이드](#9-ag-grid-사용-가이드)
10. [Import 경로 규칙](#10-import-경로-규칙)
11. [네이밍 규칙 총정리](#11-네이밍-규칙-총정리)
12. [자주 쓰는 유틸리티](#12-자주-쓰는-유틸리티)
13. [흔한 실수 & 안티패턴](#13-흔한-실수--안티패턴)
14. [개발 워크플로우](#14-개발-워크플로우)
15. [디버깅 팁](#15-디버깅-팁)
16. [상수 정의 패턴](#16-상수-정의-패턴)
17. [페이지 레이아웃 가이드](#17-페이지-레이아웃-가이드)
18. [폼(Form) 작성 가이드](#18-폼form-작성-가이드)
19. [화면 커스터마이징(Variants) 가이드](#19-화면-커스터마이징variants-가이드)
20. [라우팅(routes.tsx) 가이드](#20-라우팅routestsx-가이드)

---

## 1. 환경 설정

### 필수 설치 항목

| 항목        | 버전     | 설치 방법                                                     |
| ----------- | -------- | ------------------------------------------------------------- |
| **Node.js** | v22.17.0 | [nvm](https://github.com/nvm-sh/nvm) 사용 권장                |
| **pnpm**    | 10.29.2  | `corepack enable && corepack prepare pnpm@10.29.2 --activate` |

> **왜 정확한 버전이 필요한가요?**
> pnpm 메이저 버전이 다르면 `pnpm-lock.yaml`의 포맷이 달라져서, AG-Grid Enterprise 패치 정보가 깨질 수 있습니다. 팀원 간 lock 파일 충돌을 방지하기 위해 동일한 버전을 사용합니다.

### 프로젝트 초기 셋업

```bash
# 1. 저장소 클론
git clone <repository-url>
cd bt-admin-fe

# 2. 의존성 설치
pnpm install

# 3. 개발 서버 실행
pnpm run serve
```

`pnpm run serve`를 실행하면 대화형 메뉴가 나타나며, 함께 실행할 Remote 앱을 선택할 수 있습니다:

1. **모든 Remote 앱 실행** — Host + manager + fca 모두 실행
2. **Host만 실행** — Host + manager만 실행 (manager는 항상 포함)
3. **개별 선택** — 원하는 Remote만 선택 (여러 개 선택 시 쉼표로 구분)

실행 후 브라우저에서 `http://localhost:4200`으로 접속할 수 있습니다.

### 개발 서버 proxy 설정

API·WebSocket 요청은 host 개발 서버의 proxy를 거쳐 백엔드로 전달됩니다. 설정은 `apps/host/proxy.config.js`에 있습니다.

- **공유본 `proxy.config.js`를 직접 수정하지 마세요.** 커밋되면 다른 사람의 개발 환경이 깨집니다.
- 개인 PC에서 다른 서버를 바라보려면 `apps/host/proxy.config.local.json`을 만들어 본인 서버 주소만 적습니다. 이 파일은 `.gitignore` 처리되어 커밋되지 않습니다:

  ```json
  { "target": "http://192.168.0.x:8501" }
  ```

  이 파일이 있으면 모든 proxy 항목의 `target`이 해당 값으로 교체됩니다. `/api`·`/ws` 같은 proxy 대상 경로(context) 구조 변경만 공유본 `proxy.config.js`에서 합니다.

### 주의사항

- **절대 `npm install`이나 `yarn`을 사용하지 마세요.** 이 프로젝트는 pnpm 전용입니다. 다른 패키지 매니저를 사용하면 lock 파일이 꼬입니다.
- **`pnpm-lock.yaml`을 직접 수정하지 마세요.** 패키지를 추가/제거할 때는 `pnpm add` / `pnpm remove` 명령을 사용하세요.
- lock 파일에 충돌이 발생하면, `ag-grid-enterprise` 관련 패치 정보(`patchedDependencies`, `patch_hash`)가 유지되는지 반드시 확인하세요.

---

## 2. 프로젝트 구조 이해하기

### 전체 아키텍처

이 프로젝트는 **turborepo(pnpm workspace) 모노레포** + **Rsbuild(rspack) + Module Federation** 기반의 마이크로 프론트엔드입니다. (2026-07 Nx+Webpack에서 전환 — 배경·성능 비교는 [doc/plans/platform/turborepo-rsbuild-migration/](plans/platform/turborepo-rsbuild-migration/INDEX.md) 참조)

```
bt-admin-fe/
├── apps/                    # 애플리케이션들
│   ├── host/                # 🏠 Host App (메인 셸)
│   ├── manager/             # 👤 매니저 (사용자 관리, 대시보드)
│   └── fca/                 # 🤖 ForCus AI (봇 관리)
├── libs/                    # 공유 라이브러리들
│   ├── shared-ui/           # 🎨 재사용 UI 컴포넌트
│   ├── shared-api/          # 🔌 공통 API 및 타입
│   ├── shared-store/        # 📦 전역 상태 관리 (Zustand)
│   └── shared-util/         # 🔧 유틸리티 함수
├── doc/                     # 📚 프로젝트 문서
└── scripts/                 # 🛠️ 빌드/서빙 스크립트
```

### Module Federation이란?

쉽게 말해, **여러 개의 독립적인 React 앱을 하나의 큰 앱처럼 합쳐주는 기술**입니다.

- **Host App** (`apps/host`): 로그인, 사이드바 등 공통 UI를 담당하는 "껍데기" 앱
- **Remote Apps** (`apps/manager`, `apps/fca`): 각자의 기능을 담당하는 독립 앱

Host가 Remote들을 런타임에 불러오기 때문에, 각 팀이 독립적으로 개발·배포할 수 있습니다.

> **내가 작업할 앱은 어디?**
> 대부분의 경우 `apps/fca` 또는 `apps/manager` 내부에서 작업하게 됩니다.
> 공통 컴포넌트를 수정할 때만 `libs/` 폴더를 건드립니다.

### 앱 내부 구조 (Feature 기반)

각 앱은 **기능(Feature) 단위**로 폴더를 나눕니다. 아래 구조가 **표준**이며, **`apps/fca`가 레퍼런스 구현**입니다. 신규 remote 생성 및 기존 remote 점검(`/update-remote`) 시 이 구조를 기준으로 정규화합니다.

```
apps/<remote>/src/app/         # apps/fca 가 레퍼런스 구현
├── pages/                     # 📄 페이지 컴포넌트 (라우트에 1:1 매핑)
│   ├── bot-config/            # 라우트 그룹 폴더 (kebab-case)
│   │   ├── BotList.tsx        # /<remote>/bot-config/bot/list
│   │   ├── BotCreate.tsx      # /<remote>/bot-config/bot/create
│   │   ├── BotDetail.tsx      # /<remote>/bot-config/bot/:serviceId
│   │   └── variants/          # 화면 커스터마이징 변형 (필요 시)
│   └── dashboard/
│       └── BotDashboard.tsx
├── features/                  # ⚙️ 기능별 로직
│   ├── bot-config/            # 도메인 feature
│   │   ├── api/               # API 함수
│   │   ├── components/        # UI 컴포넌트 (Card, Toolbar, Drawer 등)
│   │   ├── constants/         # 상수 정의
│   │   ├── hooks/             # 커스텀 훅 (Query, Store)
│   │   ├── tabs/              # 상세 페이지 탭 컴포넌트
│   │   ├── types/             # 타입 정의 (index.ts barrel + 도메인별 파일)
│   │   └── utils/             # 유틸리티 함수
│   ├── dashboard/
│   └── router/                # 🧭 라우팅 보조 모듈 (도메인 feature 아님)
├── routes.tsx                 # 라우팅 정의 (20장 참조)
└── app.tsx                    # 앱 루트 컴포넌트
```

#### pages vs features 차이점

| 구분 | `pages/`                                      | `features/`                                               |
| ---- | --------------------------------------------- | --------------------------------------------------------- |
| 역할 | 라우트에 1:1 매핑되는 페이지                  | 페이지에서 사용하는 로직·컴포넌트                         |
| 크기 | 가능한 간결하게 (조립만)                      | 실제 비즈니스 로직이 여기에                               |
| 예시 | `BotList.tsx` — 데이터 불러와서 테이블 렌더링 | `features/bot-config/components/BotCard.tsx` — 봇 카드 UI |

**pages는 "무엇을 보여줄지"를 결정하고, features는 "어떻게 보여줄지"를 담당합니다.**

#### features 하위 폴더별 역할

| 폴더          | 역할                              | 필수 여부 | 파일명 규칙                                      |
| ------------- | --------------------------------- | --------- | ------------------------------------------------ |
| `api/`        | 서버 API 호출 함수                | 거의 필수 | `<feature>Api.ts`                                |
| `components/` | UI 컴포넌트                       | 필요 시   | `<Feature>Card.tsx`, `<Feature>Toolbar.tsx` 등   |
| `constants/`  | 상수 정의                         | 필요 시   | `<feature>Constants.ts`                          |
| `hooks/`      | TanStack Query 훅, Zustand 스토어 | 거의 필수 | `use<Feature>Queries.ts`, `use<Feature>Store.ts` |
| `tabs/`       | 상세 페이지의 탭 컴포넌트         | 필요 시   | `<Feature>BasicInfo.tsx` 등                      |
| `types/`      | TypeScript 타입/인터페이스        | 거의 필수 | `index.ts` + 도메인별 파일                       |
| `utils/`      | 헬퍼 함수                         | 필요 시   | `<feature>Utils.ts`                              |

> **모든 폴더를 다 만들어야 하나요?**
> 아닙니다. 필요한 것만 만드세요. 간단한 기능이면 `api/`, `hooks/`, `types/`만으로 충분할 수 있습니다.

#### `features/router/` — 라우팅 보조 모듈

`features/` 아래에 있지만 **도메인 feature가 아니라 라우팅 인프라 전용** 폴더입니다. `routes.tsx`가 의존하는 보조 모듈만 모으고, 도메인 로직(api·components·tabs 등)은 두지 않습니다.

| 파일/폴더                     | 역할                                                                       |
| ----------------------------- | -------------------------------------------------------------------------- |
| `<Remote>WsSessionEventHandler.tsx` | 루트 element로 쓰는 세션 이벤트 핸들러 (필요한 remote만)               |
| `pageVariantManifest.ts`      | 화면 커스터마이징 변형 등록 aggregator (19장 참조)                          |
| `querySelectors.ts`           | queryString 분기용 selector aggregator (`queryString 기반 메뉴 분기 가이드` 참조) |
| `selectors/`                  | 도메인 query selector 컴포넌트                                              |

#### 폴더 구조 정규화 체크포인트

신규 remote 생성·기존 remote 점검 시 아래를 확인합니다:

- **페이지**: `pages/<route-group>/<Page>.tsx` — 페이지 파일은 `PascalCase`, 라우트 그룹 폴더는 `kebab-case`
- **탭 컴포넌트**: 상세 페이지의 탭은 페이지가 아니므로 `pages/`가 아니라 `features/<feature>/tabs/`에 둠
- **타입**: `features/<feature>/types/` 아래에 `index.ts`(barrel export) + 도메인별 `<domain>.ts`. `<domain>.types.ts` 서픽스는 쓰지 않음 (4장 참조)
- **라우팅 보조 코드**: `features/router/`에 모으고 도메인 feature와 섞지 않음
- **빈 폴더 표시용 `.gitkeep`**: 폴더에 실제 파일이 들어오면 함께 제거 (잔재로 남기지 않음)

---

## 3. 새 기능 개발 체크리스트

새로운 기능을 개발할 때 아래 순서를 따르면 실수를 줄일 수 있습니다.

### Step 0: 라이브러리 기능 확인

코드를 작성하기 전에 **이미 사용 중인 라이브러리가 해당 기능을 제공하는지 먼저 확인**합니다. 디바운스·날짜 포맷팅·폼 유효성 검사·테이블 페이징·모달·드로어 등 일반적인 기능은 대부분 lodash·dayjs·date-fns·Ant Design·shadcn/ui·AG-Grid·TanStack Query·React Hook Form이 이미 제공합니다.

라이브러리가 제공하지 않거나 요구사항에 맞지 않을 때는 임의로 직접 구현하지 말고, 먼저 사용자에게 "라이브러리에 없는데 직접 구현해도 되는지" 확인한 뒤 승인을 받고 진행하세요. (자세한 안티패턴은 13장 "10. 라이브러리 기능 확인 없이 직접 구현" 참조)

### Step 1: 타입 정의

가장 먼저 데이터의 형태를 정의합니다. API 응답, 요청 데이터의 타입을 명확히 합니다.

```
features/<feature>/types/
├── index.ts          # barrel export
└── <domain>.ts       # 타입 정의
```

### Step 2: API 함수 작성

서버와 통신하는 함수를 작성합니다.

```
features/<feature>/api/
└── <feature>Api.ts
```

### Step 3: TanStack Query 훅 작성

API 함수를 감싸는 React 훅을 만듭니다.

```
features/<feature>/hooks/
└── use<Feature>Queries.ts
```

### Step 4: UI 컴포넌트 작성

화면에 표시할 컴포넌트를 만듭니다.

```
features/<feature>/components/
├── <Feature>Card.tsx
├── <Feature>Toolbar.tsx
└── ...
```

### Step 5: 페이지 컴포넌트 작성

위에서 만든 것들을 조립하는 페이지를 만듭니다.

```
pages/<feature>/
└── <Feature>List.tsx
```

페이지 컴포넌트 본문 시작부에서 **breadcrumb을 host store에 push**합니다. breadcrumb은 페이지 본문이 아니라 host의 SubHeader가 그리므로 페이지에는 별도의 헤더 컴포넌트를 두지 않습니다.

```typescript
import { useEffect } from 'react';
import type { BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';

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

  // ... 페이지 본문
}
```

동적 라벨(예: `:botName`)은 `setBreadcrumb(items, params)`의 두 번째 인자로 전달합니다. 자세한 규칙은 "페이지 레이아웃 가이드 → Breadcrumb 표준 절차" 참조.

### Step 6: 라우트 등록

`routes.tsx`에 페이지를 lazy loading으로 등록합니다.

```typescript
const FeatureList = lazy(() => import('./pages/<feature>/<Feature>List'));
```

### Step 7: 검증

```bash
# ESLint 검사
npx eslint --fix <수정한-파일-경로>

# 타입 검사 (전체)
pnpm check-types

# 또는 특정 앱만
npx tsc -p apps/<app-name>/tsconfig.app.json --noEmit
```

---

## 4. 타입 정의 가이드

### 기본 원칙

타입은 `features/<feature>/types/` 아래에 **도메인별로 파일을 분리**하고, `index.ts`에서 모아 내보냅니다(barrel export).

```
features/bot-config/types/
├── index.ts          # export * from './bot'; export * from './model'; ...
├── bot.ts            # 봇 관련 타입
├── model.ts          # 모델 관련 타입
└── entity.ts         # 개체 관련 타입
```

### 왜 파일을 분리하나요?

한 파일에 모든 타입을 넣으면 금방 수백 줄이 되어 찾기 어렵습니다.
도메인별로 분리하면 "봇 타입은 `bot.ts`에 있겠지"라고 직관적으로 찾을 수 있습니다.

### 왜 barrel export를 쓰나요?

import할 때 파일명을 일일이 기억할 필요 없이, `types` 폴더에서 한 번에 가져올 수 있습니다.

```typescript
// ✅ barrel export 덕분에 한 줄로 가능
import type { Bot, BotListItem, BotCreateDatas } from '../types';

// ❌ barrel export가 없다면 각 파일을 일일이 import
import type { Bot } from '../types/bot';
import type { BotListItem } from '../types/bot';
import type { BotCreateDatas } from '../types/bot';
```

### 서픽스(접미사) 규칙

같은 도메인이라도 **용도에 따라 타입이 다릅니다**. 서픽스로 구분합니다.

| 서픽스        | 용도             | 언제 쓰나요?                          | 예시             |
| ------------- | ---------------- | ------------------------------------- | ---------------- |
| (없음)        | 기본 도메인 타입 | API 응답의 기본 형태                  | `Bot`            |
| `ListItem`    | 목록 조회용      | 목록 API에서 일부 필드만 내려올 때    | `BotListItem`    |
| `Item`        | 상세 조회용      | 상세 API에서 기본 + 추가 정보가 올 때 | `BotItem`        |
| `CreateDatas` | 생성 요청용      | POST 요청 body에 보낼 데이터          | `BotCreateDatas` |
| `UpdateDatas` | 수정 요청용      | PATCH/PUT 요청 body에 보낼 데이터     | `BotUpdateDatas` |

### 실전 예시

```typescript
// features/bot-config/types/bot.ts

// 1. 기본 타입 — API에서 공통으로 사용하는 필드
export interface Bot {
  serviceId: string;
  serviceName: string;
  serviceDesc?: string; // '?'는 선택적(optional) 필드
  confidence: [number, number]; // 튜플 타입: [min, max]
  tags?: string[];
}

// 2. 목록용 — 목록 API는 serviceDesc, confidence를 안 내려줌
//    대신 conversationCount, updateTime을 추가로 내려줌
export type BotListItem = Omit<Bot, 'serviceDesc' | 'confidence'> & {
  conversationCount: number;
  updateTime: string;
};

// 3. 상세 조회용 — 기본 정보 + 스케줄 + 음성 설정 한꺼번에
export type BotItem = Bot & BotSchedule & BotVoice;

// 4. 생성용 — serviceId는 서버가 만들어주니까 제외
export type BotCreateDatas = Omit<Bot, 'serviceId' | 'workTime'> & BotVoice;

// 5. 수정용
export type BotBasicInfoUpdateDatas = Omit<Bot, 'workTime'>;
```

### 자주 쓰는 TypeScript 유틸리티 타입

| 유틸리티       | 설명                       | 예시                                                   |
| -------------- | -------------------------- | ------------------------------------------------------ |
| `Omit<T, K>`   | T에서 K 필드를 제거        | `Omit<Bot, 'serviceId'>` → serviceId 빼고 나머지       |
| `Pick<T, K>`   | T에서 K 필드만 선택        | `Pick<Bot, 'serviceName' \| 'tags'>` → 이 두 필드만    |
| `Partial<T>`   | T의 모든 필드를 선택적으로 | `Partial<Bot>` → 모든 필드가 `?`가 됨                  |
| `Required<T>`  | T의 모든 필드를 필수로     | `Required<Bot>` → 모든 `?`가 사라짐                    |
| `Record<K, V>` | 키-값 매핑 타입            | `Record<string, number>` → `{ [key: string]: number }` |

### 상태값·매핑 타입 — 상수 객체 + 파생 타입 패턴

여러 모듈에서 비교·매핑·순회되는 **도메인 상태값**(API enum, 처리 상태, 카테고리, 등급 등)은 인라인 union 리터럴(`type Status = 'success' | 'failed'`)로 박지 않고, `as const` 상수 객체를 SoT로 두고 거기서 타입을 파생합니다.

#### 기본 형태

```typescript
// features/training/types/training.ts

export const TRAIN_DIFF_STATUS = {
  ADDED: 'ADDED',
  MODIFIED: 'MODIFIED',
  DELETED: 'DELETED',
} as const;

// typeof + keyof typeof로 타입 추출
export type TrainDiffStatus = (typeof TRAIN_DIFF_STATUS)[keyof typeof TRAIN_DIFF_STATUS];
// → 'ADDED' | 'MODIFIED' | 'DELETED'
```

핵심은 `as const` — 이게 없으면 객체 값이 `string`으로 넓어져서 타입 추출이 의미 없어집니다.

#### 부가 매핑 결합

상태값에 라벨·색상·아이콘 같은 부가 메타데이터가 따라붙을 때 같은 모듈에 묶어 일관 관리합니다.

```typescript
// features/training/constants/trainingConstants.ts
import type { TrainDiffStatus } from '../types/training';
import { TRAIN_DIFF_STATUS } from '../types/training';

export const TRAIN_DIFF_STATUS_LABELS: Record<TrainDiffStatus, string> = {
  [TRAIN_DIFF_STATUS.ADDED]: '추가',
  [TRAIN_DIFF_STATUS.MODIFIED]: '수정',
  [TRAIN_DIFF_STATUS.DELETED]: '삭제',
};

export const TRAIN_DIFF_STATUS_COLORS: Record<TrainDiffStatus, string> = {
  [TRAIN_DIFF_STATUS.ADDED]: 'green',
  [TRAIN_DIFF_STATUS.MODIFIED]: 'blue',
  [TRAIN_DIFF_STATUS.DELETED]: 'red',
};
```

`Record<TrainDiffStatus, string>` 덕분에 상태값을 하나 추가하면 라벨·색상 매핑 누락을 TS 컴파일러가 즉시 잡습니다.

#### 런타임 활용

상수 객체는 런타임에 살아 있으므로 Select 옵션·검증·순회에 그대로 씁니다.

```typescript
// Select 옵션 자동 생성 — 상태값이 늘어나도 옵션이 자동 따라옴
const options = Object.values(TRAIN_DIFF_STATUS).map((status) => ({
  value: status,
  label: TRAIN_DIFF_STATUS_LABELS[status],
}));

// 값 검증
const isValidStatus = (value: string): value is TrainDiffStatus =>
  Object.values(TRAIN_DIFF_STATUS).includes(value as TrainDiffStatus);
```

#### 비교 시 사용

```typescript
// ❌ 문자열 직접 비교 — 오타 시 컴파일러가 잡지만, 사용처마다 매번 문자열을 적게 됨
if (diff.status === 'ADDED') { ... }

// ✅ 상수 참조 — Go to Definition으로 SoT 추적 가능, 리팩터링 안전
if (diff.status === TRAIN_DIFF_STATUS.ADDED) { ... }
```

#### 인라인 union을 써도 되는 경우

모든 상태값을 상수 객체로 뽑는 게 정답은 아닙니다. 다음과 같은 경우엔 인라인 union이 더 적절합니다.

```typescript
// ✅ 컴포넌트 prop의 좁은 variant union — 부가 매핑·런타임 활용 없음
type ButtonProps = {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
};

// ✅ 한 파일 내부 helper의 ad-hoc 시그니처
function format(mode: 'short' | 'long'): string { ... }
```

#### 선택 기준

| 상황 | 패턴 |
| --- | --- |
| 도메인 상태값(API enum 매핑) | **상수 객체** |
| 여러 모듈에서 비교·매핑·순회되는 값 | **상수 객체** |
| 라벨·색상·아이콘 등 부가 매핑이 따라붙는 값 | **상수 객체** |
| Select·Radio 옵션을 동적으로 생성해야 하는 값 | **상수 객체** |
| 컴포넌트 prop의 좁은 variant union(`size`, `variant`) | 인라인 union |
| 한 파일 내부 helper의 ad-hoc 타입 | 인라인 union |
| 외부 라이브러리 타입을 그대로 받는 자리 | 인라인 union 또는 import |

#### 트레이드오프 정리

**상수 객체 + 파생 타입**

- 장점: 값과 타입이 한 모듈에 묶인 SoT, 런타임 활용 가능(`Object.values`로 순회), 부가 매핑 결합 용이, IDE의 Go to Definition·리팩터링 안전, 오타 방지
- 단점: 코드 3~4줄로 늘어남, import 필요, 비교 시 표현이 약간 장황, 객체·타입 두 이름 작명 부담, 객체가 번들에 포함(보통 무시 가능)

**인라인 union 리터럴**

- 장점: 짧고 직관적, import 불필요, 번들에 0바이트(타입이라 런타임 소거)
- 단점: 여러 파일에 흩어지면 중복 정의 → 추가/변경 시 누락 위험, 런타임 사용 불가(부가 매핑이 필요해지면 결국 별도 상수 객체를 또 만들어야 함), SoT 추적 어려움

#### `enum`을 쓰지 않는 이유

TypeScript `enum`은 위 패턴의 또 다른 대안처럼 보이지만 이 프로젝트에서는 사용하지 않습니다.

- 일반 `enum`은 런타임에 객체 코드를 생성해 번들에 포함되며, 트리쉐이킹이 잘 안 됨
- `const enum`은 트리쉐이킹은 되지만 `isolatedModules`·`erasableSyntaxOnly` 환경에서 호환성 문제가 있음
- `as const` 객체 + `typeof` 패턴이 위 둘의 단점을 모두 피하면서 동일한 효과를 냄
- 공식 TypeScript 팀도 새 코드에는 `as const` 객체를 권장

#### 네이밍 규칙

| 대상 | 케이스 | 예시 |
| --- | --- | --- |
| 상수 객체 | `UPPER_SNAKE_CASE` | `TRAIN_DIFF_STATUS`, `BOT_DEPLOY_STATE` |
| 파생 타입 | `PascalCase` | `TrainDiffStatus`, `BotDeployState` |
| 라벨 매핑 | `<도메인>_LABELS` | `TRAIN_DIFF_STATUS_LABELS` |
| 색상 매핑 | `<도메인>_COLORS` | `TRAIN_DIFF_STATUS_COLORS` |
| 아이콘 매핑 | `<도메인>_ICONS` | `TRAIN_DIFF_STATUS_ICONS` |

---

## 5. API 연동 가이드

### 절대 규칙: apiClient 직접 사용 금지

```typescript
// ❌ 절대 이렇게 하지 마세요
import { apiClient } from '@/shared-util';

function BotList() {
  const [bots, setBots] = useState([]);

  useEffect(() => {
    apiClient.get('/bots').then((data) => setBots(data));
  }, []);

  return <div>{/* ... */}</div>;
}
```

**왜 안 되나요?**

1. **로딩 상태를 직접 관리해야 합니다** — `isLoading` 변수를 만들고, try-catch로 감싸고... 매번 반복됩니다.
2. **에러 처리가 누락됩니다** — 네트워크 에러, 서버 에러를 모두 수동으로 처리해야 합니다.
3. **캐싱이 없습니다** — 같은 데이터를 여러 컴포넌트에서 요청하면 매번 서버에 요청합니다.
4. **Race condition** — 컴포넌트가 언마운트된 후 API 응답이 오면 메모리 릭이 발생합니다.
5. **리페치가 어렵습니다** — 데이터를 수정한 후 목록을 다시 불러오려면 직접 코드를 작성해야 합니다.

TanStack Query는 이 모든 것을 자동으로 처리해줍니다.

### Step 1: API 함수 작성

```typescript
// features/user/api/userApi.ts
import { apiClient } from '@/shared-util';
import type { User, UserListItem, UserCreateDatas } from '../types';

export const userApi = {
  // 목록 조회
  getUsers: (params?: Record<string, unknown>) => apiClient.get<UserListItem[]>('/users', { params }),

  // 단건 조회
  getUser: (params?: Record<string, unknown>) => apiClient.get<User>(`/users/${params?.id}`),

  // 생성
  createUser: (data: UserCreateDatas) => apiClient.post<User>('/users', data),

  // 수정
  updateUser: (data: { id: string } & Partial<User>) => apiClient.patch<User>(`/users/${data.id}`, data),

  // 삭제
  deleteUser: (data: { id: string }) => apiClient.delete(`/users/${data.id}`),
};
```

**포인트:**

- 하나의 객체로 묶어서 `named export` 합니다.
- 제네릭(`<User>`)으로 응답 타입을 지정하면, 호출하는 곳에서 자동 완성이 됩니다.

### Step 2: Query Key Factory 정의

```typescript
// features/user/hooks/useUserQueries.ts
import { createAppQueryKeys } from '../../../shared/queryKeys';

// 실제 런타임 키는 '<앱 폴더명>:users'로 자동 스코프됨 (앱 간 캐시 키 충돌 방지)
export const userQueryKeys = createAppQueryKeys('users', {
  getUsers: (params?: Record<string, unknown>) => [params],
  getUser: (params?: Record<string, unknown>) => [params],
});
```

> `@lukemorales/query-key-factory`의 `createQueryKeys`를 앱에서 직접 import 하면 ESLint 에러가 난다. host 셸이 QueryClient 하나를 공유하므로, 앱마다 `src/app/shared/queryKeys.ts`의 `createAppQueryKeys`(앱 폴더명 자동 접두)를 써야 다른 앱과 키가 겹치지 않는다.

**왜 Query Key Factory를 쓰나요?**

TanStack Query는 **queryKey**로 캐시를 관리합니다. 키가 같으면 캐시된 데이터를 재사용하고, 키가 달라지면 새로 요청합니다.

```typescript
// ❌ 문자열로 직접 관리하면 오타 위험 + 일관성 깨짐
useQuery({ queryKey: ['users', 'list'], ... })
useQuery({ queryKey: ['user', 'list'], ... })  // 's' 빠뜨려서 다른 캐시

// ✅ Factory를 쓰면 자동 완성 + 일관된 키
useQuery({ queryKey: userQueryKeys.getUsers().queryKey, ... })
```

### Step 3: Query/Mutation 훅 작성

```typescript
// features/user/hooks/useUserQueries.ts (계속)
import { useQuery, useMutation } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { userApi } from '../api/userApi';
import type { User, UserListItem } from '../types';

// 목록 조회 훅
export const useGetUsers = ({ params, queryOptions }: QueryHookWithParamsOptions<UserListItem[]> = {}) => {
  return useQuery({
    queryKey: userQueryKeys.getUsers(params).queryKey,
    queryFn: () => userApi.getUsers(params),
    ...queryOptions, // 호출하는 곳에서 추가 옵션을 덮어쓸 수 있음
  });
};

// 단건 조회 훅
export const useGetUser = ({ params, queryOptions }: QueryHookWithParamsOptions<User> = {}) => {
  return useQuery({
    queryKey: userQueryKeys.getUser(params).queryKey,
    queryFn: () => userApi.getUser(params),
    ...queryOptions,
  });
};

// 생성 훅
export const useCreateUser = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: userApi.createUser,
    ...mutationOptions,
  });
};

// 수정 훅
export const useUpdateUser = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: userApi.updateUser,
    ...mutationOptions,
  });
};

// 삭제 훅
export const useDeleteUser = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: userApi.deleteUser,
    ...mutationOptions,
  });
};
```

**훅 네이밍 규칙:**

| 작업      | 패턴                 | 예시            |
| --------- | -------------------- | --------------- |
| 목록 조회 | `useGet<Feature>s`   | `useGetUsers`   |
| 단건 조회 | `useGet<Feature>`    | `useGetUser`    |
| 생성      | `useCreate<Feature>` | `useCreateUser` |
| 수정      | `useUpdate<Feature>` | `useUpdateUser` |
| 삭제      | `useDelete<Feature>` | `useDeleteUser` |

**파라미터 패턴:**

| 훅 종류     | 파라미터                   | 설명                                                          |
| ----------- | -------------------------- | ------------------------------------------------------------- |
| Query 훅    | `{ params, queryOptions }` | params: API에 넘길 파라미터, queryOptions: useQuery 추가 옵션 |
| Mutation 훅 | `{ mutationOptions }`      | useMutation 추가 옵션 (onSuccess, onError 등)                 |

### Step 4: 컴포넌트에서 사용

```typescript
// pages/user/UserList.tsx
import { useQueryClient } from '@tanstack/react-query';
import { useGetUsers, useCreateUser, userQueryKeys } from '../../features/user/hooks/useUserQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const UserList = () => {
  const queryClient = useQueryClient();

  // 📌 목록 조회 — 이 한 줄로 로딩/에러/캐싱이 모두 처리됨
  const { data: users, isLoading, error } = useGetUsers({});

  // 📌 생성 뮤테이션
  const createUser = useCreateUser({
    mutationOptions: {
      onSuccess: () => {
        // 사용자 생성 후 목록 캐시를 무효화 → 자동으로 다시 조회됨
        queryClient.invalidateQueries({
          queryKey: userQueryKeys.getUsers().queryKey,
        });
        toast.success('사용자가 생성되었습니다.');
      },
      onError: (error) => {
        toast.error('생성에 실패했습니다.');
      },
    },
  });

  // 📌 생성 실행
  const handleCreate = (userData: UserCreateDatas) => {
    createUser.mutate(userData);
  };

  if (isLoading) return <FallbackSpinner />;
  if (error) return <div>오류: {error.message}</div>;

  return <UserTable data={users} onCreate={handleCreate} />;
};
export default UserList;
```

### 캐시 무효화란?

TanStack Query는 서버에서 받은 데이터를 **캐시(임시 저장)**해둡니다.
사용자를 생성/수정/삭제한 후에는 캐시가 옛날 데이터이므로, "이 캐시는 더 이상 유효하지 않다"고 알려줘야 합니다.
그러면 TanStack Query가 자동으로 다시 서버에 요청해서 최신 데이터를 가져옵니다.

```typescript
// "users" 관련 모든 캐시를 무효화
queryClient.invalidateQueries({ queryKey: userQueryKeys.getUsers().queryKey });
```

---

## 6. 상태 관리 가이드

### 상태의 종류

이 프로젝트에서는 상태를 두 가지로 나눕니다:

| 종류                | 도구           | 어디에?                        | 예시                                            |
| ------------------- | -------------- | ------------------------------ | ----------------------------------------------- |
| **서버 상태**       | TanStack Query | `hooks/use<Feature>Queries.ts` | API에서 가져온 데이터 (사용자 목록, 봇 정보 등) |
| **클라이언트 상태** | Zustand        | `hooks/use<Feature>Store.ts`   | UI 상태 (사이드바 열림/닫힘, 선택된 탭 등)      |

### Zustand 스토어 작성법

모든 스토어에 `devtools` 미들웨어를 적용하여 Redux DevTools에서 상태를 확인할 수 있도록 합니다.

```typescript
// features/bot-config/hooks/useBotStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// 1. 인터페이스에 상태와 액션을 함께 정의
interface BotStore {
  // 상태
  selectedBotId: string | null;
  isDrawerOpen: boolean;

  // 액션 — 각 상태마다 set 메서드를 만듦
  setSelectedBotId: (id: string | null) => void;
  setIsDrawerOpen: (open: boolean) => void;
}

// 2. create로 스토어 생성 (devtools 미들웨어 적용)
export const useBotStore = create<BotStore>()(
  devtools(
    (set) => ({
      // 초기값
      selectedBotId: null,
      isDrawerOpen: false,

      // 액션 구현 — set()의 세 번째 인자로 액션 이름 지정
      setSelectedBotId: (id) => set({ selectedBotId: id }, false, 'setSelectedBotId'),
      setIsDrawerOpen: (open) => set({ isDrawerOpen: open }, false, 'setIsDrawerOpen'),
    }),
    { name: 'BotStore' }, // Redux DevTools에 표시될 스토어 이름
  ),
);
```

> **`set(상태, replace, 액션이름)` 인자 설명:**
>
> - **첫 번째**: 변경할 상태
> - **두 번째 `false`**: 기존 상태에 머지 (기본 동작, `true`이면 완전 교체)
> - **세 번째**: Redux DevTools에 표시될 액션 이름 (생략하면 "anonymous"로 표시)

**사용:**

```typescript
const MyComponent = () => {
  // 필요한 것만 꺼내 쓰기
  const selectedBotId = useBotStore((state) => state.selectedBotId);
  const setSelectedBotId = useBotStore((state) => state.setSelectedBotId);

  return (
    <button onClick={() => setSelectedBotId('bot-123')}>
      선택: {selectedBotId}
    </button>
  );
};
```

> **왜 `state.selectedBotId`처럼 하나씩 꺼내나요?**
> `const { selectedBotId, setSelectedBotId } = useBotStore();` 이렇게 전체를 꺼내면,
> 스토어의 **아무 값이나** 바뀔 때마다 이 컴포넌트가 리렌더링됩니다.
> 하나씩 꺼내면 **해당 값이 바뀔 때만** 리렌더링됩니다.

### 영속 스토어 (새로고침해도 유지)

로그인 정보처럼 새로고침 후에도 유지해야 하는 상태는 `persist` 미들웨어를 사용합니다.
`devtools`는 `persist`를 감싸는 형태로 적용합니다:

```typescript
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

interface RememberMeStore {
  data: { userAccount: string; rememberMe: boolean };
  setRememberMeData: (data: Partial<{ userAccount: string; rememberMe: boolean }>) => void;
}

export const useRememberMeStore = create<RememberMeStore>()(
  // ⚠️ ()가 하나 더 있음!
  devtools(
    persist(
      (set) => ({
        data: { userAccount: '', rememberMe: false },
        setRememberMeData: (newData) => set((state) => ({ data: { ...state.data, ...newData } }), false, 'setRememberMeData'),
      }),
      {
        name: 'remember-me-storage', // localStorage 키 이름
        storage: createJSONStorage(() => localStorage), // 또는 sessionStorage
      },
    ),
    { name: 'RememberMeStore' }, // Redux DevTools에 표시될 스토어 이름
  ),
);
```

> **주의:** `create<Store>()(devtools(persist(...)))` — 미들웨어 순서는 `devtools > persist`입니다. 제네릭 뒤에 `()`가 한 번 더 필요합니다. 빠뜨리면 타입 에러가 납니다.

### 흔한 실수: 서버 상태를 Zustand에 넣지 마세요

```typescript
// ❌ API 데이터를 Zustand에 저장
const useBotStore = create((set) => ({
  bots: [],
  setBots: (bots) => set({ bots }),
  fetchBots: async () => {
    const data = await apiClient.get('/bots');
    set({ bots: data });
  },
}));

// ✅ API 데이터는 TanStack Query가 관리
const { data: bots } = useGetBots({});
```

---

## 7. UI 컴포넌트 작성 가이드

### Export 규칙

| 대상                       | Export 방식      | 이유                                   |
| -------------------------- | ---------------- | -------------------------------------- |
| 컴포넌트                   | `default export` | React.lazy()가 default export를 기대함 |
| API 함수, 타입, 상수, 유틸 | `named export`   | 한 파일에서 여러 개를 내보내야 해서    |

```typescript
// ✅ 컴포넌트 — default export
const BotCard = ({ bot }: BotCardProps) => {
  return <Card>{/* ... */}</Card>;
};
export default BotCard;

// ✅ 타입 — named export
export interface BotCardProps {
  bot: BotListItem;
}

// ✅ 상수 — named export
export const BOT_STATUS_LABELS = { /* ... */ } as const;
```

### 페이지 컴포넌트는 반드시 Lazy Loading

모든 페이지 컴포넌트는 `routes.tsx`에서 `React.lazy`로 불러옵니다.
이렇게 하면 해당 페이지에 접근할 때만 코드가 다운로드되어 **초기 로딩 속도가 빨라집니다**.

```typescript
// routes.tsx
import { lazy } from 'react';

// ✅ lazy로 import
const BotList = lazy(() => import('./pages/bot-config/BotList'));
const BotCreate = lazy(() => import('./pages/bot-config/BotCreate'));

// ❌ 직접 import하면 모든 페이지가 한꺼번에 로드됨
// import BotList from './pages/bot-config/BotList';
```

### 사용 가능한 UI 라이브러리

이 프로젝트에는 세 가지 UI 라이브러리가 있습니다:

| 라이브러리     | 용도                                                   | Import 경로                   |
| -------------- | ------------------------------------------------------ | ----------------------------- |
| **Ant Design** | 메인 UI 라이브러리 (Form, Table, DatePicker, Modal 등) | `antd`                        |
| **shadcn/ui**  | 커스텀 컴포넌트 직접 개발 시 베이스                    | `@/components/ui/<component>` |
| **AG-Grid**    | 데이터 테이블                                          | `ag-grid-react`               |

> **어떤 걸 써야 하나요?**
>
> - **Ant Design**이 메인 UI 라이브러리입니다. 대부분의 UI 컴포넌트(Form, Button, Modal, DatePicker 등)는 Ant Design을 사용합니다.
> - 프로젝트에 특화된 **커스텀 컴포넌트를 직접 만들어야 할 때**는 **shadcn/ui**를 베이스로 개발합니다. shadcn/ui는 소스 코드를 직접 소유하므로 자유롭게 수정할 수 있습니다.
> - 데이터 테이블은 **AG-Grid**를 사용합니다.

### 커스텀 공통 컴포넌트

자주 쓰는 커스텀 컴포넌트들입니다:

```typescript
import { FallbackSpinner } from '@/components/custom/FallbackSpinner'; // 로딩 스피너
import { NoData } from '@/components/custom/NoData'; // 데이터 없음 표시
import { NotFound } from '@/components/custom/NotFound'; // 404 페이지
import { PageTabs } from '@/components/custom/PageTabs'; // 탭 네비게이션
```

> 페이지 breadcrumb은 host의 SubHeader가 그립니다. 페이지 컴포넌트는 본문 시작부에서 `useBreadcrumbStore`의 `setBreadcrumb`로 push하고 unmount 시 `clearBreadcrumb`로 정리합니다(상세 절차는 "페이지 레이아웃 가이드" 참조).

### 아이콘 사용 가이드

이 프로젝트는 아이콘 소스를 **lucide**와 **커스텀 SVG** 두 가지로 한정합니다. 화면마다 제각각 다른 아이콘 라이브러리를 끌어오거나, 컴포넌트 JSX에 raw `<svg>...</svg>` 마크업을 직접 박으면 일관성·검색성·번들 측면에서 모두 손해이므로 금지합니다.

#### 1순위 — lucide (`lucide-react`)

검색·추가·삭제·편집·화살표·다운로드 등 **범용 UI 아이콘은 lucide를 우선** 사용합니다. 등록 절차 없이 named import로 바로 씁니다.

```typescript
import { Search, Plus, Trash2 } from 'lucide-react';

<Button icon={<Plus size={16} />}>추가</Button>
```

lucide는 [lucide.dev/icons](https://lucide.dev/icons)에서 이름을 검색할 수 있고, 트리쉐이킹되어 사용한 아이콘만 번들에 포함됩니다.

#### 2순위 — 커스텀 SVG (`Icons.tsx`)

디자인팀이 제공한 자산이거나 lucide에 적절한 대체가 없는 **브랜드·도메인 전용 아이콘**만 커스텀 SVG로 추가합니다.

1. SVG 파일을 `libs/shared-ui/src/assets/images/icon/icon-<name>.svg`로 저장합니다. 파일명은 `icon-` 접두사 + kebab-case (예: `icon-chart-line.svg`).
2. [Icons.tsx](../libs/shared-ui/src/components/custom/Icons.tsx)에 export를 한 줄 추가합니다. svgr 설정에 의해 `ReactComponent`로 가져오면 React 컴포넌트가 됩니다.

   ```typescript
   export { ReactComponent as IconChartLine } from '../../assets/images/icon/icon-chart-line.svg';
   ```

3. 사용처에서 import해서 일반 컴포넌트처럼 렌더합니다.

   ```typescript
   import { IconChartLine } from '@/components/custom/Icons';

   <IconChartLine className="w-4 h-4" />
   ```

> 컴포넌트명은 `Icon<PascalCase>`, 파일명은 `icon-<kebab-case>.svg`로 일관되게 맞춥니다.

#### 별도 메커니즘을 따르는 두 가지 아이콘

위 규칙은 **일반 UI 아이콘**(버튼·라벨·상태 표시 등 코드에서 직접 배치하는 아이콘) 기준입니다. 아래 두 종류는 운영자가 어드민에서 선택하거나 remote 단위로 관리되는 별도 자산이므로 메커니즘이 다릅니다.

- **메뉴 트리 아이콘** — 사이드바 메뉴 항목 옆 아이콘. 운영자가 메뉴 관리 picker에서 선택하며, DB의 `iconKey`(`custom:IconMenuMain`, `lucide:Activity` 등)로 저장됩니다. picker·사이드바는 [menuIconRegistry.ts](../libs/shared-ui/src/components/custom/menuIconRegistry.ts)에 등록된 아이콘만 해석하므로, 새 메뉴 아이콘이 필요하면 레지스트리에 추가합니다. 상세는 "화면 커스터마이징(Variants) 가이드 → 아이콘 레지스트리도 동일 발상" 참조.
- **remote 뱃지 아이콘** — 사이드바 가장 왼쪽 60px 컬럼에서 remote 자체를 대표하는 아이콘. `icon-remote-<appId>.svg` 자산을 추가하고 `Icons.tsx` export + `PanelAppBadgeStrip`의 `APP_BADGE_ICONS`에 매핑하는 별도 절차가 있습니다. 상세는 "화면 커스터마이징(Variants) 가이드 → 수동 단계 — remote 앱 뱃지 아이콘 추가" 참조.

### useMemo / useCallback을 쓰지 마세요

이 프로젝트는 **React Compiler**를 사용합니다. 컴파일러가 자동으로 리렌더링을 최적화하므로, 수동으로 `useMemo`나 `useCallback`을 사용할 필요가 없습니다.

```typescript
// ❌ 불필요 — React Compiler가 알아서 최적화
const filteredBots = useMemo(() => bots.filter((b) => b.active), [bots]);
const handleClick = useCallback(() => {
  /* ... */
}, []);

// ✅ 그냥 작성
const filteredBots = bots.filter((b) => b.active);
const handleClick = () => {
  /* ... */
};
```

### 이벤트 핸들러는 추출하는 것을 권장합니다

컴포넌트 props에 콜백 함수를 전달할 때, `handle` 접두사로 시작하는 핸들러 함수를 별도로 선언한 뒤 전달하면 JSX가 간결해지고, 핸들러의 역할을 이름만으로 파악할 수 있습니다.

```typescript
// 💡 인라인 함수를 직접 전달하면 JSX가 길어질 수 있습니다
<ChangePasswordDialog
  onClose={() => {
    setPendingLoginResponse(null);
    setPasswordPolicy(undefined);
    form.resetFields();
  }}
  onError={(error) => {
    Log.error('Password change failed:', error);
  }}
/>

// ✅ 핸들러로 추출하면 깔끔하고 역할이 명확해집니다
const handleClose = () => {
  setPendingLoginResponse(null);
  setPasswordPolicy(undefined);
  form.resetFields();
};

const handleError = (error: Error) => {
  Log.error('Password change failed:', error);
};

<ChangePasswordDialog
  onClose={handleClose}
  onError={handleError}
/>
```

> **네이밍 규칙**: 핸들러 함수명은 `handle`로 시작하는 것을 권장합니다.
> 예: `handleSubmit`, `handleClose`, `handleDelete`, `handlePasswordChange`

---

## 8. 모달/드로어 패턴

### 왜 forwardRef + useImperativeHandle을 쓰나요?

모달이나 드로어는 **부모 컴포넌트에서 "열어라", "닫아라"를 명령**해야 합니다.
일반적인 props 방식(`isOpen={true}`)도 가능하지만, 이 프로젝트에서는 **명령형(imperative) 패턴**을 사용합니다.

**장점:**

- 부모에서 열기/닫기 상태를 관리할 필요 없음
- 열 때 필요한 데이터를 함께 전달 가능
- 모달/드로어 내부에서 상태를 독립적으로 관리

### 구현 패턴

#### 1단계: Ref 인터페이스 정의

```typescript
// features/user/components/UserDrawer.tsx

// 부모가 호출할 수 있는 메서드를 정의
export interface UserDrawerRef {
  open: (params: { userId?: string }) => void; // userId가 있으면 편집, 없으면 생성
  close: () => void;
}
```

#### 2단계: 드로어 컴포넌트 작성

```typescript
import { forwardRef, useImperativeHandle, useState } from 'react';
import { Drawer } from 'antd';

interface DrawerState {
  open: boolean;
  userId?: string;
}

const UserDrawer = forwardRef<UserDrawerRef>((_, ref) => {
  const [state, setState] = useState<DrawerState>({ open: false });
  const isEditMode = !!state.userId;  // userId가 있으면 편집 모드

  // 부모가 ref를 통해 호출할 수 있는 메서드 노출
  useImperativeHandle(ref, () => ({
    open: (params) => setState({ open: true, ...params }),
    close: () => setState((prev) => ({ ...prev, open: false })),
  }));

  return (
    <Drawer
      title={isEditMode ? '사용자 수정' : '사용자 생성'}
      open={state.open}
      onClose={() => setState((prev) => ({ ...prev, open: false }))}
    >
      {/* 폼 내용 */}
    </Drawer>
  );
});

// ⚠️ forwardRef 사용 시 displayName 필수
UserDrawer.displayName = 'UserDrawer';
export default UserDrawer;
```

#### 3단계: 부모에서 사용

```typescript
import { useRef } from 'react';
import UserDrawer, { type UserDrawerRef } from '../components/UserDrawer';

const UserList = () => {
  const drawerRef = useRef<UserDrawerRef>(null);

  return (
    <div>
      {/* 생성 버튼 — userId 없이 열기 */}
      <button onClick={() => drawerRef.current?.open({})}>
        사용자 생성
      </button>

      {/* 편집 버튼 — userId와 함께 열기 */}
      <button onClick={() => drawerRef.current?.open({ userId: 'user-123' })}>
        수정
      </button>

      {/* 드로어 컴포넌트 */}
      <UserDrawer ref={drawerRef} />
    </div>
  );
};
```

> **`?.` (옵셔널 체이닝)을 쓰는 이유:**
> `drawerRef.current`가 `null`일 수 있어서 안전하게 호출하기 위함입니다.

---

## 9. AG-Grid 사용 가이드

AG-Grid는 대량의 데이터를 표 형태로 보여주는 라이브러리입니다.

### 기본 사용법

```typescript
import { AgGridReact } from 'ag-grid-react';
import type { ColDef } from 'ag-grid-community';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const UserTable = ({ data, isLoading }: UserTableProps) => {
  // 1. 공통 그리드 옵션 가져오기
  const { gridOptions } = useAggridOptions();

  // 2. 컬럼 정의
  const columnDefs: ColDef<UserListItem>[] = [
    { headerName: '이름', field: 'name', flex: 1 },
    { headerName: '이메일', field: 'email', flex: 2 },
    {
      headerName: '상태',
      field: 'status',
      maxWidth: 120,
      cellRenderer: (params) => (
        <Badge variant={params.value === 'active' ? 'default' : 'secondary'}>
          {params.value}
        </Badge>
      ),
    },
  ];

  return (
    <AgGridReact
      rowData={data}
      columnDefs={columnDefs}
      getRowId={(params) => params.data.id}  // 각 행의 고유 ID
      gridOptions={gridOptions}
      loading={isLoading}
    />
  );
};
```

### ColDef 주요 속성

| 속성           | 설명                 | 예시               |
| -------------- | -------------------- | ------------------ |
| `headerName`   | 헤더에 표시할 텍스트 | `'이름'`           |
| `field`        | 데이터 객체의 키     | `'name'`           |
| `flex`         | 남은 공간 비율 배분  | `flex: 1` (비율 1) |
| `maxWidth`     | 최대 너비 (px)       | `maxWidth: 120`    |
| `hide`         | 숨김 컬럼 (ID 등)    | `hide: true`       |
| `editable`     | 편집 가능 여부       | `editable: true`   |
| `cellRenderer` | 커스텀 셀 렌더링     | 함수 또는 컴포넌트 |
| `cellEditor`   | 커스텀 셀 에디터     | 컴포넌트           |
| `sortable`     | 정렬 가능 여부       | `sortable: false`  |
| `filter`       | 필터 가능 여부       | `filter: false`    |

### 주의사항

- **`getRowId`는 반드시 지정하세요.** 지정하지 않으면 행이 추가/삭제될 때 깜빡임이 발생합니다.
- **`ColDef` 제네릭에 row 데이터 타입을 지정하세요.** `ColDef<UserListItem>[]` — 이렇게 하면 `field`에 자동 완성이 됩니다.

### SSRM(Server-Side Row Model) — 서버 페이징 그리드

백엔드가 `page`/`size` 단위로 페이징을 지원하고 데이터 양이 한 번에 로드하기 부담스러운 화면(수천 건 이상)은 ClientSide가 아닌 **SSRM(Server-Side Row Model)**을 사용합니다. AG-Grid Enterprise 기능이며, 프로젝트는 `libs/shared-ui/src/lib/aggridSetup.ts`가 `AllEnterpriseModule`을 등록해두어 즉시 사용 가능합니다.

#### 언제 쓰나요?

- 백엔드가 `{ items, page, size, total }` 형태로 페이지 응답을 줄 때
- 화면이 그리드 중심이라 사용자 인터랙션(페이지 이동·행 선택·검색 변경)과 데이터 패칭이 밀접하게 묶일 때
- 데이터가 수천 건 이상이거나 사용자가 페이지를 자주 왔다 갔다 할 때

수십~수백 건 고정 데이터(통계 페이지 등 한 번 로드 후 클라이언트에서 끝나는 화면)는 ClientSide로 충분합니다. SSRM은 명시적 선택.

#### 왜 TanStack Query를 같이 쓰지 않나요?

- TanStack Query 캐시 단위는 **쿼리 키(요청 파라미터 객체)**, SSRM 캐시 단위는 **행 범위(블록)**. 작동 단위가 다르고 같은 데이터가 이중으로 저장됩니다.
- 두 캐시를 병용하면 검색 변경 시 양쪽을 모두 무효화해야 하고 진실의 원천(source of truth)이 모호해집니다.
- SSRM 페이지는 `useGet<Feature>` 훅을 빼고 datasource의 `getRows`에서 `apiClient`를 직접 호출하는 게 표준입니다.

#### 표준 골격 — 자식 그리드 컴포넌트

레퍼런스 구현: [`apps/fca/src/app/features/tracking/components/BotDialogHistoryTable.tsx`](apps/fca/src/app/features/tracking/components/BotDialogHistoryTable.tsx).

```typescript
import React, { useEffect, useMemo, useRef } from 'react';
import type { ColDef, GridApi, GridOptions, GridReadyEvent, IServerSideDatasource } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { xxxApi } from '../api/xxxApi';
import type { XxxItem, XxxSearchRequest } from '../types/xxx.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const PAGE_SIZE = 50;

interface XxxTableProps {
  searchParams: XxxSearchRequest;
  searchVersion: number;                       // 검색 버튼 클릭마다 증가 — refresh 트리거
  onRowDoubleClick: (data: XxxItem) => void;
  selectedRowId?: string;
  onLoadingChange?: (loading: boolean) => void;
  onTotalRowsChange?: (total: number) => void;
}

const XxxTable: React.FC<XxxTableProps> = ({
  searchParams, searchVersion, onRowDoubleClick, selectedRowId, onLoadingChange, onTotalRowsChange,
}) => {
  const { gridOptions } = useAggridOptions();
  const gridApiRef = useRef<GridApi<XxxItem> | null>(null);
  const searchParamsRef = useRef(searchParams);

  // ① 최신 검색조건을 datasource 클로저가 항상 읽도록 ref 동기화
  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  // ② datasource는 1회만 생성 — useMemo([]). 클로저가 ref를 통해 최신 검색조건을 읽음
  const serverSideDatasource = useMemo<IServerSideDatasource>(
    () => ({
      getRows: async (params) => {
        const startRow = params.request.startRow ?? 0;
        const endRow = params.request.endRow ?? startRow + PAGE_SIZE;
        const size = endRow - startRow;
        const page = Math.floor(startRow / size);
        try {
          onLoadingChange?.(true);
          const res = await xxxApi.getList({ ...searchParamsRef.current, page, size });
          params.success({ rowData: res.items, rowCount: res.total });
          onTotalRowsChange?.(res.total);
        } catch {
          params.fail();
        } finally {
          onLoadingChange?.(false);
        }
      },
    }),
    [onLoadingChange, onTotalRowsChange],
  );

  // ③ 검색 버튼 클릭마다 캐시 purge + 1페이지로 reset
  useEffect(() => {
    if (!gridApiRef.current) return;
    gridApiRef.current.refreshServerSide({ purge: true });
    gridApiRef.current.deselectAll?.();
  }, [searchVersion]);

  // ④ 외부 selectedRowId 변경 시 행 강조 즉시 반영
  useEffect(() => {
    gridApiRef.current?.redrawRows();
  }, [selectedRowId]);

  const handleGridReady = (event: GridReadyEvent<XxxItem>) => {
    gridApiRef.current = event.api;
  };

  const columnDefs: ColDef<XxxItem>[] = useMemo(() => [/* ... */], []);

  const finalGridOptions = useMemo<GridOptions<XxxItem>>(
    () => ({
      ...gridOptions,
      rowModelType: 'serverSide',
      paginationPageSize: PAGE_SIZE,
      cacheBlockSize: PAGE_SIZE,                                                      // ⚠️ paginationPageSize와 일치 필수
      defaultColDef: { ...gridOptions.defaultColDef, sortable: false } as ColDef<XxxItem>,
      getRowId: (p) => `${p.data.id}`,                                                // 반드시 지정
      rowStyle: { cursor: 'pointer' },
      onRowDoubleClicked: (event) => event.data && onRowDoubleClick(event.data),
      rowClassRules: {
        'bg-blue-50': (p) => !!selectedRowId && !!p.data && `${p.data.id}` === selectedRowId,
      },
    }),
    [gridOptions, selectedRowId, onRowDoubleClick],
  );

  return (
    <div className="w-full h-full">
      <AgGridReact<XxxItem>
        columnDefs={columnDefs}
        gridOptions={finalGridOptions}
        serverSideDatasource={serverSideDatasource}
        onGridReady={handleGridReady}
      />
    </div>
  );
};

export default XxxTable;
```

#### 표준 골격 — 부모 페이지 컴포넌트

```typescript
const XxxListPage: React.FC = () => {
  // 검색조건만 보유. page/size 키는 두지 말 것 (그리드가 자체 결정)
  const [searchParams, setSearchParams] = useState<XxxSearchRequest>({
    fromDate: dayjs().startOf('day').format(DATETIME_FORMAT),
    toDate: dayjs().endOf('day').format(DATETIME_FORMAT),
  });
  const [searchVersion, setSearchVersion] = useState(0);          // 검색 트리거 카운터
  const [totalRows, setTotalRows] = useState(0);                  // 빈 데이터 체크용
  const [isListLoading, setIsListLoading] = useState(false);      // SearchForm spinner용
  const [selectedRowId, setSelectedRowId] = useState<string | undefined>();

  const handleSearch = (newParams: XxxSearchRequest) => {
    setSearchParams(newParams);
    setSearchVersion((v) => v + 1);     // 검색 클릭 = 카운터 +1 → 그리드 refresh 트리거
    setSelectedRowId(undefined);
  };

  const handleExcelDownload = async () => {
    if (totalRows === 0) {              // 그리드가 콜백으로 알려준 total 활용
      toast.warning('다운로드할 데이터가 없습니다.');
      return;
    }
    // ... 다운로드 로직
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        <XxxSearchForm onSearch={handleSearch} isLoading={isListLoading} />
        <div className="w-full h-full">
          <XxxTable
            searchParams={searchParams}
            searchVersion={searchVersion}
            onRowDoubleClick={handleRowClick}
            selectedRowId={selectedRowId}
            onLoadingChange={setIsListLoading}
            onTotalRowsChange={setTotalRows}
          />
        </div>
      </div>
    </div>
  );
};
```

#### 핵심 규칙 / 함정 체크리스트

| 항목 | 규칙 | 누락 시 증상 |
|---|---|---|
| `cacheBlockSize` ↔ `paginationPageSize` | 반드시 일치 | 한 페이지 보려고 백엔드를 N번 호출 |
| `getRowId` | 반드시 지정 (PK 단일 또는 트리플 키) | 페이지 이동 후 행 강조 깜빡임 |
| `rowData` prop | **제거 필수** | 콘솔 경고 + 동작 이상 (SSRM과 충돌) |
| `loading` prop | 제거 — SSRM은 자체 로딩 UI 사용 | 이중 로딩 오버레이 |
| 검색 트리거 | `searchVersion` 카운터 (객체 의존성 X) | useEffect 무한 트리거 또는 미동작 |
| 검색 시 refresh | `refreshServerSide({ purge: true })` | 검색해도 1페이지로 안 돌아가고 잔존 캐시가 매칭 |
| datasource 생성 | `useMemo([])`로 1회 + `searchParamsRef` | 매 렌더 재생성 시 캐시·블록 동작 불안정 |
| 정렬 | 백엔드 sort 미지원이면 `defaultColDef.sortable: false` override | 헤더 클릭 시 잘못된 결과 |
| `pagination: false`/`statusBar: undefined` 잔존 | 둘 다 제거(useAggridOptions 기본값 활용) | AggridPagination 안 보임 |
| TanStack Query 병용 | 금지 — `getRows` 안에서 apiClient 직접 호출 | 캐시 이중화 + 무효화 동기화 부담 |
| `params.fail()` 누락 | try/catch 안에서 반드시 호출 | 네트워크 실패 시 그리드 영원히 로딩 |
| `selectedRowId` 강조 | `useEffect([selectedRowId])` + `redrawRows()` | rowClassRules가 즉시 반영 안 됨 |

#### ClientSide와의 차이

| 항목 | ClientSide (기본) | SSRM |
|---|---|---|
| `rowModelType` | `'clientSide'` (생략 시 기본) | `'serverSide'` |
| 데이터 전달 | `rowData` prop으로 전체 | `serverSideDatasource` prop |
| 페이지네이션 | 그리드가 메모리에서 자름 | 그리드가 page 단위로 fetch |
| 캐시 단위 | 없음 (전체 보유) | 행 범위 블록 |
| 정렬·필터 | 클라이언트 처리 | 백엔드 처리 (sort/filter 파라미터 필요) |
| 적합 데이터 크기 | 수십~수백 건 | 수천 건 이상 |

기존 ClientSide 그리드는 변경 없이 유지합니다. SSRM은 백엔드가 페이지 API를 제공하고 데이터 규모가 크다는 두 조건을 동시에 만족할 때만 채택하세요.

---

## 10. Import 경로 규칙

### 핵심 규칙 2가지

1. **같은 앱 내부**: 상대 경로 (`./`, `../../`)
2. **공유 라이브러리**: `@` 별칭 경로

```typescript
// 📁 apps/fca/src/app/pages/bot-config/BotList.tsx 내부에서

// ✅ 같은 앱 내부 → 상대 경로
import BotCard from '../../features/bot-config/components/BotCard';
import { useGetBots } from '../../features/bot-config/hooks/useBotQueries';

// ✅ 공유 라이브러리 → @ 별칭
import { Button } from '@/components/ui/button';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { cn } from '@/lib/utils';
import { toast } from '@/shared-util';
import { useAuthStore } from '@/shared-store';
```

### 자주 쓰는 Import 별칭 요약

```typescript
// 🎨 UI 컴포넌트 (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

// 🧩 커스텀 컴포넌트
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { NoData } from '@/components/custom/NoData';
import { NotFound } from '@/components/custom/NotFound';

// 🔧 유틸리티
import { cn } from '@/lib/utils'; // 클래스 이름 병합 유틸
import { Log } from '@/log'; // 로깅
import { toast } from '@/shared-util'; // 토스트 알림

// 📦 상태 관리
import { useAuthStore } from '@/shared-store';
```

### 흔한 실수

```typescript
// ❌ 전체 경로로 import — 너무 길고 유지보수 어려움
import { Button } from 'libs/shared-ui/src/components/shadcn/button';

// ✅ 별칭 사용
import { Button } from '@/components/ui/button';

// ❌ 공유 라이브러리를 상대 경로로 import
import { toast } from '../../../../libs/shared-util/src/index';

// ✅ 별칭 사용
import { toast } from '@/shared-util';
```

---

## 11. 네이밍 규칙 총정리

### 파일명

| 대상       | 규칙                           | 예시                                 |
| ---------- | ------------------------------ | ------------------------------------ |
| 컴포넌트   | PascalCase                     | `BotCard.tsx`, `UserDrawer.tsx`      |
| 페이지     | PascalCase                     | `BotList.tsx`, `BotDetail.tsx`       |
| 훅         | camelCase + `use` 접두사       | `useBotQueries.ts`, `useBotStore.ts` |
| API        | camelCase + `Api` 접미사       | `botApi.ts`, `userApi.ts`            |
| 타입       | camelCase                      | `bot.ts`, `model.ts`                 |
| 타입 index | -                              | `index.ts`                           |
| 상수       | camelCase + `Constants` 접미사 | `dashboardConstants.ts`              |
| 유틸리티   | camelCase + `Utils` 접미사     | `botUtils.ts`                        |

### 변수/함수명

| 대상              | 규칙                           | 예시                                               |
| ----------------- | ------------------------------ | -------------------------------------------------- |
| 컴포넌트          | PascalCase                     | `const BotCard = () => {}`                         |
| 일반 함수/변수    | camelCase                      | `const handleSubmit = () => {}`                    |
| 상수              | UPPER_SNAKE_CASE               | `const MAX_RETRY_COUNT = 3`                        |
| API 객체          | camelCase + Api                | `export const botApi = {}`                         |
| Query Key         | camelCase + QueryKeys          | `export const botQueryKeys = createAppQueryKeys(...)` |
| Zustand 스토어 훅 | camelCase + use 접두사 + Store | `export const useBotStore = create(...)`           |

### 타입/인터페이스명

| 대상        | 규칙                     | 예시                             |
| ----------- | ------------------------ | -------------------------------- |
| 기본 타입   | PascalCase               | `Bot`, `User`                    |
| 목록 아이템 | PascalCase + ListItem    | `BotListItem`                    |
| 상세 아이템 | PascalCase + Item        | `BotItem`                        |
| 생성 데이터 | PascalCase + CreateDatas | `BotCreateDatas`                 |
| 수정 데이터 | PascalCase + UpdateDatas | `BotUpdateDatas`                 |
| Props       | PascalCase + Props       | `BotCardProps`                   |
| Ref         | PascalCase + Ref         | `EntityDrawerRef`                |
| 상태 Union  | PascalCase               | `TrainStatus`, `TrainDiffStatus` |

---

## 12. 자주 쓰는 유틸리티

### 로깅 — `Log`

`console.log` 대신 프로젝트 전용 로거를 사용합니다.

```typescript
import { Log } from '@/log';

Log.debug('onFinish', values); // 디버그 (개발 중 확인용)
Log.warn('onFinishFailed', errorInfo); // 경고
```

> **왜 console.log를 안 쓰나요?**
> 프로덕션 빌드 시 로그를 일괄 제거하거나 레벨별로 필터링할 수 있기 때문입니다.

### 토스트 알림 — `toast`

사용자에게 피드백을 줄 때 사용합니다.

```typescript
import { toast } from '@/shared-util';

toast.success('저장되었습니다.');
toast.error('오류가 발생했습니다.');
toast.warning('학습이 완료된 모델만 배포할 수 있습니다.');

// 옵션
toast.warning('자동으로 닫히지 않습니다.', { autoClose: false }); // ms 숫자 또는 false(수동 닫기만)
toast.error('중복 방지', { toastId: 'error-401' }); // 같은 id가 떠 있는 동안 재발행 무시
```

외부 라이브러리 없이 자체 구현입니다. 알림은 좌하단에 스택으로 쌓이며 위아래 버튼으로 넘겨보거나 "펼치기"로 전체 목록을 볼 수 있고, hover 시 자동 닫힘 타이머가 일시정지됩니다.

- **발행**: 어디서든 `toast.*` 호출 (위 예시). 상태는 `useToastStore`(`@/shared-util`)가 관리
- **렌더**: 앱 루트에 1회 마운트하는 `ToastProvider`(`@/components/custom/ToastProvider`)가 담당. host `app.tsx`와 campaign `StandaloneApp.tsx`에 이미 마운트돼 있으므로 일반 페이지 작업에서는 신경 쓸 필요 없음
- **새 standalone 셸을 만들 때**: 루트에 `<ToastProvider />`를 마운트해야 알림이 보인다. 상단 고정 헤더가 있는 셸이면 `headerHeight`(px)를 전달해 펼침 목록이 헤더를 침범하지 않게 한다

### 클래스 이름 병합 — `cn`

Tailwind CSS 클래스를 조건부로 조합할 때 사용합니다.

```typescript
import { cn } from '@/lib/utils';

// 조건부 클래스
<div className={cn('p-4 rounded', isActive && 'bg-blue-500', isDisabled && 'opacity-50')}>
```

> **왜 `cn`을 쓰나요?**
> `cn`은 내부적으로 `clsx` + `tailwind-merge`를 사용합니다.
> Tailwind 클래스 충돌을 자동으로 해결해줍니다.
> 예: `cn('p-2', 'p-4')` → `'p-4'` (뒤의 것이 이김)

### 확인 모달 — `useModal`

삭제 등 위험한 작업 전에 사용자 확인을 받을 때 사용합니다.

```typescript
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const MyComponent = () => {
  const modal = useModal();

  const handleDelete = () => {
    // 삭제 확인 모달 (미리 정의된 스타일)
    modal.confirm.delete({
      onOk: () => deleteMutation.mutate({ id: selectedId }),
    });
  };

  const handleDeploy = () => {
    // 커스텀 확인 모달
    modal.confirm.execute({
      options: {
        title: '배포 확인',
        okText: '배포',
        cancelText: '취소',
      },
      onOk: () => deployMutation.mutate({ id: selectedId }),
    });
  };

  return (/* ... */);
};
```

---

## 13. 흔한 실수 & 안티패턴

### 1. apiClient 직접 호출

```typescript
// ❌ 가장 흔한 실수
useEffect(() => {
  apiClient.get('/bots').then(setData);
}, []);

// ✅ TanStack Query 훅 사용
const { data } = useGetBots({});
```

### 2. useMemo / useCallback 사용

```typescript
// ❌ React Compiler가 있으므로 불필요
const filtered = useMemo(() => items.filter((i) => i.active), [items]);

// ✅ 그냥 작성
const filtered = items.filter((i) => i.active);
```

### 3. 서버 상태를 useState로 관리

```typescript
// ❌ 로딩, 에러, 캐시를 수동으로 관리해야 함
const [users, setUsers] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  setLoading(true);
  apiClient
    .get('/users')
    .then(setUsers)
    .catch(setError)
    .finally(() => setLoading(false));
}, []);

// ✅ TanStack Query가 모두 관리
const { data: users, isLoading, error } = useGetUsers({});
```

### 4. 잘못된 Import 경로

```typescript
// ❌ 공유 라이브러리를 상대 경로로
import { Button } from '../../../../libs/shared-ui/src/components/shadcn/button';

// ✅ 별칭 사용
import { Button } from '@/components/ui/button';

// ❌ 같은 앱 내부를 @ 별칭으로 (동작은 하지만 컨벤션 위반)
import { BotCard } from '@/app/fca/src/app/features/bot-config/components/BotCard';

// ✅ 같은 앱 내부는 상대 경로
import BotCard from '../../features/bot-config/components/BotCard';
```

### 5. 컴포넌트를 named export

```typescript
// ❌ React.lazy()가 default export를 기대
export const BotList = () => {
  /* ... */
};

// ✅ default export
const BotList = () => {
  /* ... */
};
export default BotList;
```

### 6. 타입 파일 한 곳에 다 모으기

```typescript
// ❌ 하나의 거대한 타입 파일
// types.ts (500줄짜리...)
export interface Bot {
  /* ... */
}
export interface Model {
  /* ... */
}
export interface Intent {
  /* ... */
}
export interface Entity {
  /* ... */
}
// ...

// ✅ 도메인별 분리 + barrel export
// types/bot.ts
export interface Bot {
  /* ... */
}

// types/model.ts
export interface Model {
  /* ... */
}

// types/index.ts
export * from './bot';
export * from './model';
```

### 7. npm / yarn 사용

```bash
# ❌ 절대 사용 금지
npm install some-package
yarn add some-package

# ✅ pnpm 사용
pnpm add some-package
```

### 8. forwardRef에 displayName 누락

```typescript
// ❌ React DevTools에서 "Anonymous"로 표시됨
const MyDrawer = forwardRef<MyDrawerRef>((_, ref) => {
  /* ... */
});
export default MyDrawer;

// ✅ displayName 추가
const MyDrawer = forwardRef<MyDrawerRef>((_, ref) => {
  /* ... */
});
MyDrawer.displayName = 'MyDrawer';
export default MyDrawer;
```

### 9. Zustand 스토어 전체 구독

```typescript
// ❌ 스토어의 어떤 값이든 바뀌면 리렌더링
const { selectedBotId } = useBotStore();

// ✅ 필요한 값만 구독 — selectedBotId가 바뀔 때만 리렌더링
const selectedBotId = useBotStore((state) => state.selectedBotId);
```

### 10. 라이브러리 기능 확인 없이 직접 구현

이미 사용 중인 라이브러리(Ant Design, shadcn/ui, AG-Grid, TanStack Query, React Hook Form, date-fns, dayjs, lodash 등)가 제공하는 기능을 알아보지 않고 직접 만들면, 라이브러리가 이미 처리하는 엣지 케이스(접근성, 키보드 네비게이션, 타임존, locale 등)를 빠뜨리기 쉽고 유지보수 부담만 늘어납니다.

```typescript
// ❌ 디바운스를 직접 구현
const [debouncedValue, setDebouncedValue] = useState(value);
useEffect(() => {
  const t = setTimeout(() => setDebouncedValue(value), 300);
  return () => clearTimeout(t);
}, [value]);

// ✅ lodash가 제공
import { debounce } from 'lodash';

// ❌ 날짜 포맷팅을 수동으로
const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-...`;

// ✅ dayjs가 제공
import dayjs from 'dayjs';
const formatted = dayjs(date).format('YYYY-MM-DD HH:mm');

// ❌ 폼 유효성·에러 메시지를 useState로 직접 관리
const [name, setName] = useState('');
const [nameError, setNameError] = useState('');
// ...

// ✅ Ant Design Form의 rules 사용
<Form.Item name="name" rules={[{ required: true, message: '이름을 입력해 주세요' }]}>
  <Input />
</Form.Item>
```

**원칙**: 라이브러리에 해당 기능이 있는지 먼저 확인할 것. 없거나 요구사항에 맞지 않으면 임의로 직접 구현하지 말고, 사용자에게 직접 구현 진행 여부를 확인한 뒤 진행할 것.

### 11. 도메인 상태값을 인라인 union 리터럴로 정의

```typescript
// ❌ 인라인 union — 사용처마다 문자열 직접 비교, 부가 매핑 시 SoT 이중화
export type TrainDiffStatus = 'ADDED' | 'MODIFIED' | 'DELETED';

if (diff.status === 'ADDED') { ... } // 오타 위험, Go to Definition 추적 불가

// ✅ 상수 객체 + 파생 타입 — 값과 타입이 한 SoT, 런타임 활용 가능
export const TRAIN_DIFF_STATUS = {
  ADDED: 'ADDED',
  MODIFIED: 'MODIFIED',
  DELETED: 'DELETED',
} as const;
export type TrainDiffStatus = (typeof TRAIN_DIFF_STATUS)[keyof typeof TRAIN_DIFF_STATUS];

if (diff.status === TRAIN_DIFF_STATUS.ADDED) { ... }
```

여러 모듈에서 비교·매핑·순회되는 도메인 상태값은 반드시 상수 객체 패턴을 사용. 단, 컴포넌트 prop의 좁은 variant(`size?: 'sm' | 'md' | 'lg'`)나 한 파일 내부 helper의 ad-hoc 타입은 인라인 union이 더 적절. 상세 기준은 4장 "상태값·매핑 타입 — 상수 객체 + 파생 타입 패턴" 참조.

---

## 14. 개발 워크플로우

### 일상적인 개발 흐름

```bash
# 1. 최신 코드 받기
git pull origin master

# 2. 작업 브랜치 생성
git checkout -b feat/add-user-search

# 3. 의존성 설치 (다른 사람이 패키지를 추가했을 수 있으므로)
pnpm install

# 4. 개발 서버 실행
pnpm run serve

# 5. 코드 수정...

# 6. ESLint 검사
npx eslint --fix <수정한-파일>

# 7. 타입 검사
npx tsc -p apps/<앱-이름>/tsconfig.app.json --noEmit

# 8. 변경 파일 스테이징
git add <파일들>

# 9. 커밋 (반드시 pnpm commit 사용)
pnpm commit

# 10. 푸시
git push origin feat/add-user-search
```

### 자주 쓰는 개발 명령어

> **스크립트 우선 사용**: 서빙은 `pnpm serve`, 빌드·배포 산출물 조립은 `pnpm build`(둘 다 대화형 앱 선택)를 우선 사용하세요. 조립 없는 raw 빌드는 `pnpm build:raw`, turbo의 특정 옵션이 필요한 경우에만 `npx turbo run` 직접 명령을 사용하세요.
> **새 Remote 생성은 반드시 생성기 사용**: `pnpm gen remote`만 사용하세요. Module Federation 설정, 포트·serve 메뉴·host 로더·remotes.d.ts 등록 자동화가 포함되어 있어 수동 생성 시 정상 동작하지 않을 수 있습니다.

```bash
# 개발 서버 (우선 사용)
pnpm serve                  # 대화형으로 실행할 Remote 선택

# 빌드
pnpm build                  # 대화형 선택 → turbo 빌드 + 배포 트리 조립 (dist/deploy + remotes/)
pnpm build all              # 전체 (비대화형 — 번호·이름·all 인자 지원)
pnpm build:raw              # turbo raw 빌드 전체 (조립 없음)
npx turbo run build --filter=@bridgetec/ui-remote-fca   # fca 앱만 raw 빌드

# 린트
pnpm lint                   # 전체 린트 (루트 eslint.config.mjs)
npx eslint apps/fca         # fca 앱만 린트

# 타입 검사
npx tsc -p apps/fca/tsconfig.app.json --noEmit   # fca 앱 타입 검사
pnpm check-types            # 전체 타입 검사 (turbo)

# 테스트
pnpm test                   # Vitest (루트 단일 설정)

# shadcn/ui 컴포넌트 추가
pnpm run shadcn:add button  # button 컴포넌트 추가
```

### 커밋 전 확인사항

- [ ] ESLint 오류 없음 (`npx eslint --fix <파일>`)
- [ ] TypeScript 오류 없음 (`npx tsc -p apps/<앱>/tsconfig.app.json --noEmit`)
- [ ] 개발 서버에서 화면이 정상 동작함
- [ ] 새로 추가한 의존성이 있으면 `pnpm add`로 설치했는지 확인
- [ ] Import 경로 규칙을 지켰는지 확인

### 커밋 가이드

이 프로젝트는 **commitizen + cz-git**을 사용하여 일관된 커밋 메시지를 작성합니다.
커밋 시 반드시 아래 명령어를 사용하세요:

```bash
# pnpm script 사용
pnpm commit

# 또는 직접 실행
pnpm exec git-cz
```

#### 지원하는 커밋 타입

| 이모지 | 타입          | 설명                | 사용 예시                     |
| ------ | ------------- | ------------------- | ----------------------------- |
| 🎉     | `🎉 init`     | 프로젝트 초기화     | 프로젝트 생성, 초기 설정      |
| ✨     | `✨ feat`     | 새로운 기능 추가    | 새로운 기능 구현              |
| 📦️    | `📦️ chore`   | 빌드 및 구조 수정   | 의존성 업데이트, 설정 변경    |
| 💄     | `💄 design`   | UI/UX 디자인 변경   | 스타일 수정, 레이아웃 변경    |
| 🐛     | `🐛 fix`      | 버그 수정           | 버그 수정, 오류 해결          |
| ✅     | `✅ test`     | 테스트 코드 추가    | 테스트 작성, 테스트 수정      |
| 🚀     | `🚀 deploy`   | 배포 관련           | 배포 설정, 배포 스크립트      |
| 🔨     | `🔨 refactor` | 코드 리팩터링       | 코드 구조 개선, 최적화        |
| 🚚     | `🚚 rename`   | 파일/폴더 이름 변경 | 파일명 변경, 폴더명 변경      |
| 📚     | `📚 docs`     | 문서 업데이트       | README 수정, 문서 작성        |
| 🔥     | `🔥 remove`   | 코드/파일 삭제      | 불필요한 코드 제거, 파일 삭제 |

#### 커밋 메시지 형식

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

- **Type**: 위의 타입 중 하나를 선택 (이모지 포함)
- **Scope**: 변경사항의 범위 (선택사항)
- **Subject**: 50자 이내의 간결한 설명
- **Body**: 상세한 설명 (선택사항)
- **Footer**: 이슈 번호 등 (선택사항)

#### 예시

```
✨feat(auth): add login functionality
🐛fix(ui): resolve button alignment issue
📚docs(readme): update installation guide
🔨refactor(utils): simplify date formatting function
💄design(header): improve navigation layout
🚀deploy(ci): add automated deployment pipeline
```

#### Husky & commitlint

이 프로젝트는 Husky를 통해 커밋 전에 자동으로 commitlint 검사를 수행합니다.
다음과 같은 커밋 메시지는 commitlint 검사에서 제외됩니다:

- **자동 생성 커밋**: `Merge branch ...`, `Merge pull request ...`, `Revert "..."`, `chore(deps): ...`
- **특별한 상황**: `WIP: ...`, `Initial commit`, `wip: ...`

---

## 15. 디버깅 팁

### React Query Devtools

개발 서버 실행 중 화면 하단에 React Query Devtools 버튼이 있습니다.
클릭하면 현재 캐시된 쿼리, 상태, 데이터를 모두 확인할 수 있습니다.

**활용법:**

- API 호출이 됐는지 확인 → "fresh" / "stale" / "fetching" 상태 확인
- 캐시된 데이터 확인 → 쿼리를 클릭하면 응답 데이터가 보임
- 캐시 무효화 테스트 → 수동으로 refetch 가능

### Redux DevTools (Zustand 상태 디버깅)

모든 Zustand 스토어에 `devtools` 미들웨어가 적용되어 있어, Redux DevTools 확장 프로그램으로 상태를 실시간 확인할 수 있습니다.

**사전 준비:** Chrome 웹 스토어에서 [Redux DevTools](https://chromewebstore.google.com/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd) 확장 프로그램 설치

**사용법:**

1. 개발자도구(F12) 열기
2. **Redux** 탭 선택
3. 상단 드롭다운에서 스토어 선택 (AuthStore, MenuStore 등)

**주요 기능:**

- **State 탭**: 현재 스토어의 전체 상태를 트리 구조로 확인
- **Action 탭**: `set()` 호출 시마다 어떤 액션이 발생했는지 기록 (예: `setUserInfo`, `setMenuConfigs`)
- **Diff 탭**: 이전 상태와 현재 상태의 차이점 표시
- **Time Travel**: 과거 특정 시점의 상태로 되돌려서 확인 가능

> Redux DevTools는 프로덕션 빌드에서 자동으로 비활성화됩니다.

### 브라우저 개발자 도구

- **Network 탭**: API 요청/응답 확인, 상태 코드, 응답 시간
- **Console 탭**: `Log.debug()`로 찍은 로그 확인
- **Components 탭** (React DevTools): 컴포넌트 트리, props, state 확인
- **Redux 탭** (Redux DevTools): Zustand 스토어 상태, 액션 히스토리, 상태 diff 확인

### 자주 만나는 에러와 해결법

#### `Module not found: Can't resolve '@/components/ui/...'`

→ 경로 별칭이 잘못되었거나, 해당 컴포넌트가 아직 설치되지 않았습니다.

```bash
# shadcn/ui 컴포넌트 추가
pnpm run shadcn:add <component-name>
```

#### `TypeError: Cannot read properties of undefined`

→ API 응답이 아직 안 왔는데 데이터에 접근하고 있습니다.

```typescript
// ❌
<div>{data.name}</div>

// ✅ 로딩 상태 체크
if (isLoading) return <FallbackSpinner />;
<div>{data?.name}</div>
```

#### `Objects are not valid as a React child`

→ 객체를 직접 렌더링하려고 했습니다.

```typescript
// ❌
<div>{user}</div>

// ✅ 필요한 속성을 꺼내서 렌더링
<div>{user.name}</div>
```

#### ESLint 에러로 커밋 실패

→ Husky가 커밋 전에 자동으로 ESLint를 실행합니다.

```bash
# 해당 파일의 ESLint 오류 수정
npx eslint --fix <파일-경로>

# 수정 후 다시 add & commit
git add <파일>
pnpm commit
```

#### `Shared module is not available for eager consumption`

→ Module Federation 관련 에러입니다. 보통 shared 라이브러리 버전 불일치가 원인입니다.

```bash
# node_modules 삭제 후 재설치
rm -rf node_modules
pnpm install
```

---

## 16. 상수 정의 패턴

상수는 `features/<feature>/constants/` 아래에 정의합니다.

```typescript
// features/dashboard/constants/dashboardConstants.ts

// 단순 값 상수
export const GRID_COLS = 12;
export const REFRESH_INTERVAL = 3000;

// 객체 상수는 as const로 불변 처리
export const CHART_COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#F06548',
} as const;

// 라벨 매핑 — Record<키타입, 값타입> 사용
export const STATUS_LABELS: Record<TrainStatus, string> = {
  0: '미학습',
  1: '학습중',
  2: '학습완료',
  3: '학습실패',
};
```

> **`as const`가 뭔가요?**
> 객체의 모든 값을 읽기 전용(readonly)으로 만들어서, 실수로 값을 변경하는 것을 방지합니다.
> 또한 타입이 `string`이 아닌 `'#3B82F6'` 같은 리터럴 타입이 됩니다.

---

## 17. 페이지 레이아웃 가이드

### 콘텐츠 영역은 반드시 시각적으로 구분하세요

이 프로젝트의 페이지 배경은 회색 계열입니다. 이 배경 위에 버튼, 입력 필드, 테이블 같은 UI 요소를 직접 배치하면 요소가 공중에 떠 있는 것처럼 보여 완성도가 떨어집니다.

UI 요소는 반드시 **흰색 배경 컨테이너**(`bg-white bt-shadow`)나 **Card 컴포넌트**로 감싸서, 콘텐츠 영역이 배경과 명확히 구분되도록 해주세요.

> **왜 `bt-shadow`를 쓰나요?**
> 프로젝트 전역에 정의된 커스텀 box-shadow 클래스입니다. 흰색 배경과 함께 사용하면 콘텐츠 영역이 배경에서 살짝 떠오르는 효과를 주어 시각적 계층을 만들어 줍니다.

### 화면 패턴별 표준 레이아웃

프로젝트의 페이지들은 화면이 수행하는 기능에 따라 몇 가지 정형 패턴으로 묶입니다. 같은 패턴에 속하는 화면들은 **동일한 외곽 골격**을 공유해야 사용자가 어느 메뉴를 들어가도 일관된 경험을 받습니다. 새 화면을 만들 때는 먼저 어떤 패턴에 해당하는지 정하고 그 패턴의 골격을 그대로 따르세요. 여기에 없는 새로운 패턴이 필요하면 이 섹션에 항목을 추가합니다.

### 화면 패턴: 검색·필터 + 그리드 목록

상단에 검색 조건/필터를, 하단에 AG-Grid를 두는 가장 흔한 목록 페이지 패턴입니다. `apps/manager`의 `UserList`/`ClientList`/`WorkHistoryList`, `apps/fca`의 `BotDialogHistory`/`DecryptLog`/`BotRealtime`, 통계 페이지(`call-bot/*`, `nlu/*`) 등이 모두 이 패턴을 따릅니다.

#### 핵심 원칙

**필터와 그리드를 단일 흰색 래퍼 하나로 묶고, 그 안에서 `gap-5`로 영역을 분리합니다.** 필터와 그리드를 각각 별개의 `bg-white bt-shadow` 박스로 띄우는 구조는 사용하지 않습니다. 두 영역은 의미상 같은 "목록 화면"이므로 시각적으로도 한 덩어리로 인지되어야 합니다.

#### 표준 골격

```typescript
const breadcrumb: BreadcrumbProps['items'] = [
  { title: '...', path: '/...' },
  { title: '...', path: '/...' },
];

const SomeListPage: React.FC = () => {
  // ⓪ breadcrumb store push — host SubHeader가 그리므로 페이지 본문에는 별도 헤더를 두지 않는다
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  // ... 그 외 hooks, queries, handlers

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ① 흰색 래퍼 — 필터·그리드를 모두 품는다 */}
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        {/* ② 필터·액션 헤더 */}
        <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
          <div className="flex items-center w-full gap-3">
            <Select ... />
            <Input ... />
          </div>
          <div className="flex items-center gap-2.5">
            <Button type="primary" onClick={handleCreate}>추가</Button>
          </div>
        </header>

        {/* ③ 그리드 */}
        <div className="w-full h-full">
          <AgGridReact rowData={data} columnDefs={columnDefs} gridOptions={gridOptions} />
        </div>
      </div>

      {/* ④ Drawer·Modal은 흰색 래퍼 밖, 외곽 컨테이너 안쪽 */}
      <SomeDetailDrawer ref={drawerRef} />
    </div>
  );
};
```

#### 영역별 규칙

| 영역             | 역할                                | 표준 클래스                                                                          |
| ---------------- | ----------------------------------- | ------------------------------------------------------------------------------------ |
| **외곽 컨테이너**    | 페이지 전체 골격                  | `flex flex-col gap-4 w-full h-full`                                                  |
| **흰색 래퍼**    | 필터·그리드를 묶는 단일 컨테이너    | `flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5`                           |
| **필터·액션 헤더** | 인라인 필터 + 우측 액션 버튼          | `<header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">` |
| **그리드**       | AG-Grid 컨테이너                    | `w-full h-full` (배경·그림자 금지)                                                   |
| **Drawer/Modal** | 상세·생성·편집용                    | 흰색 래퍼 밖, 외곽 컨테이너 안쪽에 배치                                              |

#### Breadcrumb 표준 절차

페이지의 breadcrumb은 **페이지 본문에 그리지 않습니다**. host 레이아웃의 `BreadcrumbSlot`이 SubHeader 우측에 그리고 있으므로, 각 페이지는 mount 시 `useBreadcrumbStore`에 push하고 unmount 시 clear하는 책임만 갖습니다.

##### path 컨벤션

표준 remote인 fca를 레퍼런스로 삼아 다음 세 가지를 지킵니다.

1. **모든 leaf에 자기 자신을 가리키는 path를 부여**합니다. leaf까지 path가 있어야 (가) 사용자가 다른 곳으로 이동했다가 돌아올 때 breadcrumb 클릭으로 복귀할 수 있고, (나) 탭 형제 이동(아래 "동적 라벨" 항 참조)을 자연스럽게 지원할 수 있습니다. 액션 leaf(`'추가'`, `'등록'`, `'수정'` 등)도 자기 path를 부여해야 합니다.
2. **자체 페이지가 없는 카테고리/그룹 항목(비-leaf)에도 그 그룹의 라우트 path를 그대로 부여**합니다(예: `{ title: '관리', path: '/fca/bot-config' }`, `{ title: '봇', path: '/fca/bot-config/bot' }`). `path` 키 자체를 생략해 비링크 텍스트로 렌더하는 것은 fca의 표준이 아닙니다. **이 컨벤션은 routes의 "index redirect" 규칙(라우팅 가이드 → "3. index redirect")과 짝을 이뤄 작동합니다** — 사용자가 카테고리 라벨을 클릭하면 그 그룹의 `{ index: true, element: <Navigate to="<default>" replace /> }`가 자동으로 기본 하위 페이지로 안내합니다. 즉 카테고리에 path를 부여할 수 있는 전제는 "그 카테고리의 라우트 그룹이 index redirect를 갖는다"는 점이며, 라우트 측에서 index redirect를 빠뜨리면 카테고리 클릭이 빈 화면/NotFound로 떨어지므로 항상 짝으로 점검하세요. `path` 생략은 라우트가 아예 정의되지 않은 임의 가상 라벨처럼 진입할 path가 실제로 없는 예외 케이스 한정입니다.
3. **`path`는 절대 경로(`/<remote>/...`)만 사용**합니다. `../` 같은 상대 경로는 사용하지 마세요. breadcrumb은 라우트 깊이가 다른 페이지들 사이에서도 동일 항목을 가리킬 수 있어야 하는데, 상대 경로는 현재 path 기준으로 해석되어 같은 라벨이라도 페이지마다 다른 곳으로 가게 됩니다(예: `'../list'`가 깊은 라우트에서는 의도와 다르게 동작).
4. **remote 이름 라벨은 페이지에서 작성하지 않습니다.** host의 `BreadcrumbSlot`이 `useCurrentRemote().appName`을 읽어 Home 아이콘 다음·페이지 카테고리 앞에 **자동 prepend**합니다(비링크 텍스트). 페이지는 자기 도메인 카테고리부터 시작하세요. 이 prepend 항목은 `MenuConfig.appName`이 single source of truth이므로 사이드바 뱃지 툴팁(`PanelAppBadgeStrip`)·패널 헤더(`PanelAppSection`/`PanelMega`)와 자동 일치합니다.

   ```ts
   // ❌ 페이지에서 remote 이름 라벨을 직접 작성 (중복 — host가 또 prepend함)
   [{ title: 'IPRON' }, { title: '회선관리' }, { title: '국선관리', path: '/ipron/line/endpoint' }]

   // ✅ 카테고리부터 시작 — host가 [🏠] > [appName] > 페이지 items 순으로 합성
   [{ title: '회선관리' }, { title: '국선관리', path: '/ipron/line/endpoint' }]
   ```

   호스트 합성 결과 예시: `🏠 > IPRON > 회선관리 > 국선관리`

   > 주의: 카테고리 라벨에 우연히 remote 이름과 유사한 단어가 들어가는 경우(예: manager의 `'시스템'`, fca의 `'관리'`)는 그대로 둡니다. appName은 remote 식별을 담당하고, 그 다음 카테고리 라벨은 도메인 분류이므로 의미가 다릅니다.

##### 정적 breadcrumb

페이지 파일 상단에 `breadcrumb` 상수를 모듈 레벨로 두고, 컴포넌트 본문 시작부에서 push/clear합니다.

```typescript
import { useEffect } from 'react';
import type { BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';

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
```

##### 동적 라벨 (fetch 결과로 채워지는 항목)

title을 `:paramName` 형태로 적고 `setBreadcrumb(items, params)`의 두 번째 인자로 치환값을 전달합니다. BreadcrumbSlot이 자동으로 치환하며, 치환된 항목은 강조 스타일로 렌더됩니다. fetch 결과가 deps에 들어가야 라벨이 갱신됩니다.

```typescript
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

> **형제 탭 이동 — query path 합성**: 상세 페이지가 query string으로 탭을 구분하는 구조(`?tab=tab2`)라면, 형제 탭을 가리키는 breadcrumb 항목의 `path`에 query를 직접 합성합니다. 사용자가 한 탭에서 다른 탭으로 breadcrumb 클릭만으로 이동할 수 있습니다.
>
> ```typescript
> const items: BreadcrumbProps['items'] = [
>   { title: '관리', path: '/fca/bot-config' },
>   { title: '모델', path: '/fca/bot-config/model' },
>   { title: ':modelName', path: `/fca/bot-config/model/${modelId}` },
>   { title: '의도', path: `/fca/bot-config/model/${modelId}?tab=tab2` },     // ← 형제 탭으로 이동
>   { title: ':intentName', path: `/fca/bot-config/model/${modelId}/intent/${intentId}` },
> ];
> ```

##### 분기 케이스 (isPublic 등)

같은 페이지 컴포넌트가 분기에 따라 다른 breadcrumb을 가져야 할 때, **분기 결과의 성질에 따라 두 가지 갈래** 중 하나를 선택합니다.

**갈래 A — 분기 결과가 모두 정적인 경우: 모듈 스코프 두 변수 + useEffect에서 삼항 선택.** 분기마다 변하는 동적 값(`useParams` 등)이 없으면 두 breadcrumb을 미리 모듈 상수로 정의하고 useEffect는 선택만 합니다. 가장 가벼운 패턴이며, fca의 `ModelList`·`ModelCreate`가 이 구조를 따릅니다.

```typescript
const privateBreadcrumb: BreadcrumbProps['items'] = [
  { title: '관리', path: '/fca/bot-config' },
  { title: '모델', path: '/fca/bot-config/model' },
  { title: '모델 목록', path: '/fca/bot-config/model/list' },
];
const publicBreadcrumb: BreadcrumbProps['items'] = [
  { title: '공용', path: '/fca/global' },
  { title: '공용 모델', path: '/fca/global/model' },
  { title: '공용 모델 목록', path: '/fca/global/model' },
];

useEffect(() => {
  setBreadcrumb(isPublic ? publicBreadcrumb : privateBreadcrumb);
  return () => clearBreadcrumb();
}, [isPublic, setBreadcrumb, clearBreadcrumb]);
```

**갈래 B — 분기 결과가 동적 값(`:modelName`, `${modelId}` 등)을 포함하는 경우: useEffect 내부에서 삼항으로 items를 합성.** 동적 값을 모듈 스코프에서 참조할 수 없으므로 useEffect 안에서 구성하고, 분기 키와 동적 값 모두를 deps에 포함합니다. fca의 `ModelDetail`·`IntentDetail`·`EntityDetail`·`EvaluationDetail`이 이 구조입니다.

```typescript
useEffect(() => {
  const items: BreadcrumbProps['items'] = isPublic
    ? [
        { title: '공용', path: '/fca/global' },
        { title: '공용 모델', path: '/fca/global/model' },
        { title: ':modelName', path: `/fca/global/model/${modelId}` },
      ]
    : [
        { title: '관리', path: '/fca/bot-config' },
        { title: '모델', path: '/fca/bot-config/model' },
        { title: ':modelName', path: `/fca/bot-config/model/${modelId}` },
      ];
  setBreadcrumb(items, { modelName: model?.modelName ?? '-' });
  return () => clearBreadcrumb();
}, [isPublic, modelId, model?.modelName, setBreadcrumb, clearBreadcrumb]);
```

##### 핵심 규칙

- breadcrumb push용 `useEffect`는 **본문 시작부**에 두세요. early-return으로 로딩 분기되는 페이지도 hook 순서가 깨지지 않도록 가장 위에 위치.
- cleanup의 `clearBreadcrumb()`를 빠뜨리면 다른 페이지로 이동했을 때 이전 breadcrumb이 잠깐 남습니다.
- 부모(redirect-only 그룹 등)는 `path` 없이 두면 BreadcrumbSlot이 비링크 텍스트로 렌더해 클릭이 자연스럽게 비활성됩니다.

#### 검색 영역이 복잡할 때 — 전용 컴포넌트로 분리

검색 폼이 다단(여러 행)이거나 Collapsible(접힘) 동작·엑셀 다운로드 등 자체 로직을 갖는 경우, 검색 영역만 전용 컴포넌트(`<XxxSearchForm />`, `<XxxSearchBar />`)로 분리합니다. 단, 그 컴포넌트는 **자기 안에 흰색 배경/그림자/외부 여백을 두지 않습니다**. 흰색 래퍼는 부모가 책임지므로, 자식은 콘텐츠 레이아웃만 담당합니다.

```typescript
// ✅ 자식 컴포넌트는 배경 없이 콘텐츠만
const BotDialogHistorySearchForm: React.FC<Props> = ({ onSearch, ... }) => {
  return (
    <div className="flex flex-col gap-3">
      {/* 1행: 검색일자, 봇, 의도, 신뢰구간 */}
      <div className="flex items-center gap-4"> ... </div>
      {/* 2행: 사용자 ID, ANI 등 */}
      <div className="flex items-center gap-4"> ... </div>
    </div>
  );
};

// ❌ 자식이 자기 배경/그림자/여백을 들고 있으면 부모 래퍼와 이중으로 떠 보인다
<div className="flex flex-col gap-3 p-5 bg-white bt-shadow mb-4"> ... </div>
```

부모 페이지 쪽 사용:

```typescript
<div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
  <BotDialogHistorySearchForm onSearch={handleSearch} ... />
  <div className="w-full h-full">
    <BotDialogHistoryTable rowData={data} ... />
  </div>
</div>
```

자식 그리드 컴포넌트(`BotDialogHistoryTable` 등)도 마찬가지로 자기 루트에 `bg-white bt-shadow`를 두지 않고 `flex flex-col w-full h-full`만 부여합니다.

#### Collapsible 필터 (통계 페이지 패턴)

통계 페이지처럼 필터 항목이 많아 접고 펴는 UI가 필요할 때는 `Collapsible` 컴포넌트를 사용하되, 흰색 래퍼·`gap-5` 골격은 동일하게 유지합니다. 필터 헤더 자체는 `flex flex-col gap-3`로 다행 구성합니다(인라인 한 줄 헤더와 다른 점).

```typescript
<div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
  <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
    <header className="flex flex-col gap-3">
      {/* 항상 보이는 1행 필터 */}
      <div className="flex items-start gap-3"> ... </div>
      <CollapsibleContent>
        {/* 추가 필터 행 */}
      </CollapsibleContent>
    </header>
  </Collapsible>
  <div className="w-full h-full">
    <AgGridReact ... />
  </div>
</div>
```

#### 흔한 실수

- ❌ 필터와 그리드를 각각 `bg-white bt-shadow` 박스로 분리 → ✅ 단일 래퍼에 `gap-5`로 묶기
- ❌ 자식 검색/그리드 컴포넌트 안에 또 `bg-white bt-shadow` 추가 → ✅ 자식은 배경 없이 콘텐츠만 담당
- ❌ 필터 헤더에 고정 높이 `h-[76px]` 부여 → ✅ 콘텐츠에 따라 자연스러운 높이로 두기 (`flex-wrap`만 처리)
- ❌ Drawer/Modal을 흰색 래퍼 안쪽에 배치 → ✅ 외곽 컨테이너 직속(흰색 래퍼 형제)에 두기
- ❌ 모바일 전용 카드 뷰를 별도 분기로 유지 → ✅ AG-Grid 자체의 반응형 동작에 맡기고 분기 제거 (과거에 `lg:hidden`/`max-lg:hidden`로 분리하던 패턴은 폐기됨)

### Card 그리드 레이아웃

데이터를 카드 형태로 나열할 때는 CSS Grid의 `auto-fill`을 활용해 반응형 레이아웃을 구성합니다:

```typescript
<div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4 w-full overflow-y-auto">
  {botList.map((bot) => (
    <BotCard key={bot.serviceId} {...bot} />
  ))}
</div>
```

각 카드가 최소 350px 너비를 유지하면서 화면 크기에 따라 자동으로 열 수가 조정됩니다.

---

## 18. 폼(Form) 작성 가이드

### 왜 Ant Design Form을 쓰나요?

데이터를 추가하거나 수정하는 페이지에서는 여러 입력 필드의 값을 수집하고, 유효성을 검사하고, 서버에 전송해야 합니다. 이런 작업을 `useState`로 필드마다 개별 관리하면 코드가 금방 복잡해집니다.

Ant Design의 `Form`을 사용하면 이런 부분을 선언적으로 처리할 수 있습니다:

- **값 수집**: `onFinish` 콜백에서 모든 필드 값을 한 번에 받음
- **유효성 검사**: `rules`로 선언만 하면 자동으로 검증 + 에러 메시지 표시
- **초기값 세팅**: `initialValues`나 `form.setFieldsValue()`로 일괄 설정
- **리셋**: `form.resetFields()` 한 줄로 모든 필드 초기화

### 기본 구조

```typescript
import { Form, Input, Select } from 'antd';
import type { FormProps } from 'antd';

const MyCreatePage = () => {
  const [form] = Form.useForm<MyFormValues>();

  // 폼 제출 성공 시 (모든 유효성 검사 통과)
  const onFinish: FormProps<MyFormValues>['onFinish'] = (values) => {
    // values에 모든 필드 값이 담겨 있음
    createMutation.mutate(values);
  };

  // 폼 제출 실패 시 (유효성 검사 실패)
  const onFinishFailed: FormProps<MyFormValues>['onFinishFailed'] = (errorInfo) => {
    const firstError = errorInfo.errorFields?.[0]?.errors?.[0];
    toast.error(firstError ?? '입력 항목을 확인해주세요.');
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      initialValues={{ status: 'ACTIVE' }}
    >
      <Form.Item
        name="username"
        label="이름"
        required
        hasFeedback
        rules={[
          { required: true, message: '이름을 입력하세요.' },
          { max: 50, message: '최대 50자까지 입력 가능합니다.' },
        ]}
      >
        <Input placeholder="이름을 입력하세요." />
      </Form.Item>

      <Form.Item
        name="roleId"
        label="역할"
        required
        hasFeedback
        rules={[{ required: true, message: '역할을 선택해 주세요.' }]}
      >
        <Select
          options={roleOptions}
          showSearch
          optionFilterProp="label"
          placeholder="역할을 선택하세요."
        />
      </Form.Item>

      <Button type="primary" htmlType="submit">
        저장
      </Button>
    </Form>
  );
};
```

> **`layout="vertical"`이 뭔가요?**
> 레이블이 입력 필드 **위에** 표시되는 레이아웃입니다. 이 프로젝트에서 주로 사용하는 방식입니다.
> `"horizontal"`(레이블이 왼쪽)이나 `"inline"`(한 줄에 나열)도 있지만, 대부분의 경우 vertical이 적합합니다.

### 주요 속성 설명

#### Form.Item의 자주 쓰는 props

| prop            | 역할                               | 예시                            |
| --------------- | ---------------------------------- | ------------------------------- |
| `name`          | 폼 데이터의 키 이름                | `name="username"`               |
| `label`         | 필드 위에 표시되는 레이블          | `label="이름"`                  |
| `required`      | 필수 표시(\*) UI만 추가            | `required`                      |
| `hasFeedback`   | 유효성 검사 아이콘(✓, ✕) 표시      | `hasFeedback`                   |
| `rules`         | 유효성 검사 규칙 배열              | 아래 참고                       |
| `tooltip`       | 레이블 옆 물음표 도움말            | `tooltip="로그인에 사용됩니다"` |
| `valuePropName` | boolean 컴포넌트(Switch 등)에 필요 | `valuePropName="checked"`       |

#### 자주 쓰는 유효성 검사 rules

```typescript
rules={[
  { required: true, message: '필수 입력 항목입니다.' },
  { min: 3, message: '최소 3자 이상 입력해주세요.' },
  { max: 100, message: '최대 100자까지 입력 가능합니다.' },
  { pattern: /^[a-zA-Z0-9_]+$/, message: '영문, 숫자, 언더스코어만 입력 가능합니다.' },
]}
```

공통으로 자주 쓰는 규칙은 shared-util에서 가져올 수 있습니다:

```typescript
import { emailRule, phoneRule } from '@/shared-util';

// 이메일 필드
<Form.Item name="email" label="이메일" rules={[emailRule]}>
  <Input placeholder="예: user@example.com" />
</Form.Item>

// 전화번호 필드
<Form.Item name="phone" label="전화번호" rules={[phoneRule]}>
  <Input placeholder="예: 010-1234-5678" />
</Form.Item>
```

### 수정 페이지에서 기존 데이터 불러오기

수정 페이지나 상세 탭에서는 서버에서 가져온 데이터를 폼에 채워 넣어야 합니다. `form.setFieldsValue()`를 사용합니다:

```typescript
const { data: bot } = useGetBot({ params: { serviceId } });

// API 응답이 오면 폼에 값 세팅
useEffect(() => {
  if (!bot) return;
  form.setFieldsValue({
    serviceName: bot.serviceName,
    serviceDesc: bot.serviceDesc,
    confidence: bot.confidence,
  });
}, [bot, form]);
```

> **`initialValues`와 `setFieldsValue`의 차이**
>
> - `initialValues`: 폼이 처음 렌더링될 때 한 번만 적용됩니다. 이미 값을 알고 있을 때 사용합니다. (예: 생성 페이지에서 기본값)
> - `setFieldsValue()`: 폼이 렌더링된 후에 동적으로 값을 채워 넣습니다. API 응답을 기다려야 할 때 사용합니다. (예: 수정 페이지)

### Drawer에서의 폼 관리

Drawer에서 폼을 사용할 때는 **열릴 때 초기화**, **닫힐 때 리셋**하는 생명주기를 관리해야 합니다.
리셋 없이 Drawer를 다시 열면 이전에 입력했던 값이 그대로 남아 있을 수 있습니다.

```typescript
const [form] = Form.useForm();

useEffect(() => {
  if (!open) return;

  // Drawer가 열릴 때: 기존 데이터가 있으면 폼에 세팅
  if (initialData) {
    form.setFieldsValue({
      category: initialData.category,
      value: initialData.value,
    });
  }

  // Drawer가 닫힐 때: 폼 리셋
  return () => form.resetFields();
}, [initialData, form, open]);
```

### 실시간 폼 값 감시 — Form.useWatch

폼 값이 바뀔 때마다 UI를 업데이트해야 하는 경우(예: Summary 사이드바, 조건부 필드 표시) `Form.useWatch`를 사용합니다:

```typescript
// 전체 폼 값 감시
const formValues = Form.useWatch([], form);

// 특정 필드만 감시
const selectedType = Form.useWatch('entityType', form);

// 감시한 값에 따라 UI 분기
{selectedType === 'PATTERNS' && (
  <Form.Item name="pattern" label="패턴">
    <Input placeholder="정규식을 입력하세요." />
  </Form.Item>
)}
```

### 흔한 실수

#### useState로 각 필드를 따로 관리

```typescript
// ❌ 필드가 늘어날수록 관리가 어려워짐
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [role, setRole] = useState('');
const [status, setStatus] = useState('ACTIVE');

const handleSubmit = () => {
  if (!name) {
    toast.error('이름을 입력하세요.');
    return;
  }
  if (!email) {
    toast.error('이메일을 입력하세요.');
    return;
  }
  createMutation.mutate({ name, email, role, status });
};

// ✅ Form으로 통합 관리
const [form] = Form.useForm();

const onFinish = (values) => {
  createMutation.mutate(values); // 유효성 검사는 rules가 알아서 처리
};
```

#### Drawer를 닫을 때 resetFields를 빠뜨림

Drawer가 닫혔다가 다시 열릴 때 이전에 입력한 값이 잔존하는 문제가 생길 수 있습니다. `useEffect`의 cleanup 함수에서 `form.resetFields()`를 호출해주세요.

---

## 19. 화면 커스터마이징(Variants) 가이드

테넌트(고객사)별로 동일 메뉴 path에서 서로 다른 화면 컴포넌트를 렌더해야 하는 시나리오를 데이터 기반으로 처리하기 위한 패턴입니다. 운영자가 메뉴 관리 어드민에서 picker로 변형을 선택하면, 그 path 진입 시 선택된 컴포넌트가 렌더됩니다.

### 왜 이 패턴인가

**문제**: 같은 "봇 목록" 화면이지만 A 은행은 대출 컬럼이 추가된 표를, B 통신사는 회선 정보 컬럼이 있는 표를 보고 싶다.

**잘못된 접근**:

- path 분리(`/bot/list-bank-a`, `/bot/list-carrier`) → URL이 테넌트 내부 사정을 노출, 매뉴얼·딥링크 호환성 깨짐, 메뉴 데이터 모델이 복잡해짐
- 컴포넌트 내부에 if/else 분기 → 한 파일이 모든 테넌트 분기를 떠안아 비대해짐

**올바른 접근**: path는 의도(`/bot/list`)를 표현, element만 데이터 기반으로 교체. 코드 변경 없이 운영자가 어드민에서 변형 적용·해제 가능.

### 전체 구조

```
┌──────────── 코드 (개발자 작성) ────────────┐
│                                              │
│  apps/<remote>/src/app/pages/.../            │
│   ├── BotList.tsx                  (기본)    │
│   ├── variants/BotListBankA.tsx    (변형)    │
│   └── BotList.variants.ts          (선언)    │
│                                              │
│         │ 모든 variants 파일을 한 곳에 모음  │
│         ▼                                    │
│  apps/<remote>/src/app/features/router/      │
│   pageVariantManifest.ts                     │
│         │ MF './PageVariantManifest' expose  │
│         ▼                                    │
└─────────┼────────────────────────────────────┘
          │
          ├── (어드민) host가 메타만 추출 → usePageVariantManifestStore
          │    → manager의 화면 지정 picker에서 카드 그리드로 표시
          │    → 운영자 선택 → DB의 page-variant row에 componentKey 저장
          │
          └── (사용자) host 부팅 시 화면 지정 API를 usePageVariantsStore에
              mirror → routes.tsx의 <DynamicElement>가 componentKey 보고 변형 렌더
```

### 새 변형 추가 절차

#### Step 1: 변형 컴포넌트 작성

```
apps/fca/src/app/pages/bot-config/
├── BotList.tsx                    ← 기본
├── variants/
│   └── BotListBankA.tsx           ← 신규 작성
└── BotList.variants.ts
```

`variants/BotListBankA.tsx`는 기본 컴포넌트와 **동일한 prop·context·query key를 사용**해야 합니다. 데이터 fetching 형태가 본질적으로 다르면 variant가 아니라 별도 path로 분리하세요.

#### Step 2: 변형 정의 파일에 등록

`BotList.variants.ts`:

```ts
import { lazy } from 'react';
import type { PageVariantManifestConfig } from '@/components/custom/DynamicElement';

export const botListVariants: PageVariantManifestConfig = {
  appId: 'fca',
  path: 'bot-config/bot/list',
  defaultKey: 'default',
  components: {
    default: {
      // pv 소켓(createDefaultPageVariants)과 동일한 키·라벨 — 표준 컴포넌트
      label: '표준',
      component: lazy(() => import('./BotList')),
    },
    BotListBankA: {
      // ← 추가
      label: 'A 은행 전용',
      description: '대출 컬럼 + 컴플라이언스 뱃지',
      component: lazy(() => import('./variants/BotListBankA')),
    },
  },
};
```

#### Step 3: aggregator에 추가

`apps/<remote>/src/app/features/router/pageVariantManifest.ts`:

```ts
import type { PageVariantManifestConfig } from '@/components/custom/DynamicElement';
import { botListVariants } from '../../pages/bot-config/BotList.variants';

export const pageVariantManifest: Record<string, PageVariantManifestConfig> = {
  [botListVariants.path]: botListVariants,
  // ...
};
```

이미 등록된 path에 변형만 추가하는 경우엔 Step 3은 생략(기존 entry 재사용).

#### Step 4: routes.tsx의 pv 소켓을 variants config로 교체

모든 leaf는 이미 `pv('<화면 키>', Component)` 기본 소켓으로 래핑되어 있으므로(20장 참조), 해당 path가 처음 정식 변형을 갖게 되면 그 한 줄만 variants config 직접 전달로 교체합니다:

```tsx
// Before — 기본 소켓 (default 1개)
{ path: 'list', element: pv('bot-config/bot/list', BotList) },

// After — 정식 variants config
import { botListVariants } from './pages/bot-config/BotList.variants';
import DynamicElement from '@/components/custom/DynamicElement';

{ path: 'list', element: <DynamicElement variants={botListVariants} /> },
```

> ⚠️ `.variants.ts`의 `path` 값은 기존 `pv()`에 쓰던 화면 키와 **동일한 문자열**이어야 합니다. 키가 바뀌면 DB에 저장된 기존 지정·현장 커스텀 연결이 끊어집니다.

이미 variants config로 전환된 path에 변형만 추가하는 경우엔 Step 4도 생략.

#### Step 5: 운영자가 어드민에서 적용

배포 후 운영자가 **manager > 시스템 > 플랫폼 > 화면 지정** 메뉴에서:

1. 좌측 목록에서 대상 path(예: `fca / bot-config/bot/list`) 선택
2. 우측 카드 그리드에서 새 변형(`A 은행 전용`) 카드 선택 → 적용
3. 저장 → DB의 page-variant row에 `componentKey: 'BotListBankA'` 기록
4. 해당 path 진입 시 변형 컴포넌트가 렌더됨 (표준으로 되돌리려면 '표준' 카드 선택 → 적용)

### 변형이 sub 컴포넌트를 가질 때 — 폴더로 승격

route에 매핑되는 변형 컴포넌트(예: `BotDetail_TEST_A`)가 단일 파일에서 끝나지 않고, 그 내부에서 import하는 하위 컴포넌트(탭·드로어·카드 등)까지 별도 구현이 필요할 수 있습니다. 이때는 **변형을 폴더로 승격**해서 진입점과 sub 컴포넌트를 한 폴더에 격리합니다. variant 시스템은 sub 컴포넌트를 모르고 manifest에는 여전히 진입점 하나만 등록됩니다.

```
apps/fca/src/app/pages/bot-config/
├── BotDetail.tsx                         (정식 — 손대지 않음)
├── BotDetail.variants.ts                 (lazy import 경로 변경 없음)
└── variants/
    ├── BotList_TEST_A.tsx                ─ 단일 파일 variant는 그대로
    └── BotDetail_TEST_A/                 ★ sub 컴포넌트를 가진 variant는 폴더로
        ├── index.tsx                     ─ route 진입점(탭 골격)
        └── BotBasicInfo.tsx              ─ 이 variant 전용 sub 컴포넌트

apps/fca/src/app/features/bot-config/tabs/
└── BotBasicInfo.tsx                      (정식 — 손대지 않음)
```

`*.variants.ts`의 lazy 경로는 그대로 폴더를 가리킵니다 — 번들러가 `index.tsx`로 해석:

```ts
component: lazy(() => import('./variants/BotDetail_TEST_A')),
```

variant 내부에서는 자기 폴더 sub는 형제 상대 경로, 재사용하는 정식 sub는 원본 위치에서 그대로 import:

```tsx
// variants/BotDetail_TEST_A/index.tsx
import BotBasicInfo from './BotBasicInfo';                                        // 이 variant 전용
import BotVersionList from '../../../../features/bot-config/tabs/BotVersionList'; // 정식 그대로 재사용
```

#### sub 컴포넌트 위치 결정 기준

| 상황                                          | 위치                                              |
| --------------------------------------------- | ------------------------------------------------- |
| 단일 파일 variant                             | `pages/<feature>/variants/<Variant>.tsx`          |
| variant 전용 sub 컴포넌트가 있는 variant      | `pages/<feature>/variants/<Variant>/` 폴더로 승격 |
| 여러 variant가 실제로 공유하는 sub 컴포넌트   | `features/<feature>/tabs/variants/` (공유 발생 시에만, YAGNI) |

- variant 하나에서만 쓰는 sub 컴포넌트는 **무조건 그 variant 폴더 안에 격리**합니다. 정식 `features/<feature>/...`에 실험·테넌트 전용 코드가 섞이면 무엇이 정식인지 시간이 지날수록 흐려집니다.
- 검증 끝나고 variant를 제거할 땐 폴더 하나만 지우면 정식 구조에 잔재가 남지 않습니다.
- sub 컴포넌트도 정식 컴포넌트와 동일한 prop·context·query key 호환성 규칙을 그대로 따라야 합니다(같은 path 위에서 같은 라우트 컨텍스트로 동작해야 함).

### DynamicElement의 동작 원리

[libs/shared-ui/src/components/custom/DynamicElement.tsx](../libs/shared-ui/src/components/custom/DynamicElement.tsx):

```tsx
const DynamicElement = ({ variants }) => {
  // 1. usePageVariantsStore(화면 지정 API mirror)에서 이 (appId, path)의 componentKey 찾기
  const selectedKey = usePageVariantsStore((state) => state.variants[variants.appId]?.[variants.path]);

  // 2. 키 판정
  //    - 'site:' prefix → custom remote에서 런타임 로드 (현장 커스텀, CUSTOM_DEVELOPMENT_GUIDE 참조)
  //    - 정식 variant 키 → variants.components 매칭, 등록되지 않은 키면 defaultKey로 fallback
  //    - 미지정 → defaultKey (표준)
  const Component = resolve(selectedKey, variants);

  // 3. lazy 컴포넌트 참조 + Suspense
  return (
    <Suspense fallback={<FallbackSpinner />}>
      <Component />
    </Suspense>
  );
};
```

- DB의 `componentKey`가 코드에서 사라진 경우 → 자동으로 default 컴포넌트로 fallback (운영 안전)
- variants 컴포넌트는 lazy chunk로 분리되어 진입 시점에만 다운로드
- 실제 구현: [libs/shared-ui/src/components/custom/DynamicElement.tsx](../libs/shared-ui/src/components/custom/DynamicElement.tsx)

### Picker UI는 어떻게 알게 되는가

호스트 부팅 시:

1. `usePageVariantManifestLoader`가 각 remote의 `./PageVariantManifest` aggregator를 dynamic import
2. component 함수 참조는 버리고 메타(label/description/key)만 추출
3. `usePageVariantManifestStore.variants`에 저장

manager의 화면 지정 picker는 이 store에서 변형 매니페스트를 읽어 카드 그리드를 그립니다. 호스트는 변형 컴포넌트 chunk를 직접 받지 않으므로 가벼움.

> 별개로 `usePageVariantsLoader`(host)는 화면 지정 API의 지정값(appId/path → componentKey)을
> `usePageVariantsStore`에 mirror합니다 — DynamicElement가 lookup하는 쪽은 이 store입니다.

### 새 remote의 자동 등록

`pnpm gen remote`로 신규 remote를 생성하면 다음이 자동 처리됩니다:

- `apps/<new-remote>/src/app/features/router/pageVariantManifest.ts` 빈 aggregator 생성
- `module-federation.config.ts`에 `'./PageVariantManifest'` expose 항목 포함
- 호스트의 `usePageVariantManifestLoader` `VARIANT_LOADERS` 맵에 신규 remote 자동 등록

따라서 신규 remote는 별도 작업 없이 variants 인프라가 즉시 동작합니다.

### 수동 단계 — remote 앱 뱃지 아이콘 추가

remote 생성기(`pnpm gen remote`)가 자동 처리하지 못하는 유일한 후속 작업입니다. 사이드바 좌측 60px 컬럼([PanelAppBadgeStrip.tsx](../apps/host/src/app/features/layout/panel/PanelAppBadgeStrip.tsx))에 노출되는 remote별 뱃지 아이콘은 디자인 자산이 필요하므로 코드 생성만으로는 완성할 수 없습니다. 미등록 상태에서는 lucide의 `SquareDashed` placeholder가 fallback으로 표시되니, 신규 remote가 정식 메뉴에 들어가기 전 아래 절차로 교체하세요.

#### 절차

1. **디자인팀에 의뢰** — 제품 컨셉에 맞는 아이콘 SVG를 요청합니다. 기존 자산(`icon-remote-fca.svg`, `icon-remote-ipron.svg`)과 동일한 스펙(단색·여백·viewBox)을 유지하도록 가이드를 첨부하세요.
2. **SVG 배치** — 받은 파일을 `libs/shared-ui/src/assets/images/icon/icon-remote-<appId>.svg`로 저장합니다. 파일명의 `<appId>`는 생성기에 입력한 kebab-case 앱 이름과 일치해야 합니다.
3. **Icons.tsx에 export 추가** — [libs/shared-ui/src/components/custom/Icons.tsx](../libs/shared-ui/src/components/custom/Icons.tsx) 하단의 기존 `IconRemoteFca` / `IconRemoteIpron` export 옆에 동일한 패턴으로 한 줄 추가합니다.
   ```ts
   export { ReactComponent as IconRemote<AppId> } from '../../assets/images/icon/icon-remote-<app-id>.svg';
   ```
4. **PanelAppBadgeStrip의 `APP_BADGE_ICONS` 매핑 추가** — [PanelAppBadgeStrip.tsx](../apps/host/src/app/features/layout/panel/PanelAppBadgeStrip.tsx)의 `APP_BADGE_ICONS` 객체에 `<appId>: IconRemote<AppId>` 항목을 추가합니다. 키는 remote의 `appId`(kebab-case 그대로), 값은 3번에서 export한 컴포넌트입니다.
5. **확인** — 호스트를 띄워 사이드바 좌측 뱃지가 placeholder가 아닌 의도한 아이콘으로 그려지는지, hover 시 앱 이름이 옆으로 펼쳐지는 동작이 정상인지 확인합니다.

#### 주의

- **메뉴 아이콘과 혼동 금지**: 아래 "아이콘 레지스트리도 동일 발상"에서 다루는 `menuIconRegistry`는 메뉴 트리 항목별 아이콘(운영자가 picker에서 선택)을 위한 것입니다. remote 뱃지 아이콘은 사이드바 가장 왼쪽 컬럼에 remote 자체를 대표하는 별도 자산이므로 `menuIconRegistry`에는 등록할 필요가 없습니다.
- **fallback의 의미**: `SquareDashed`가 보인다면 4번 매핑이 누락된 상태입니다. 운영 환경에서도 동작은 하지만 신규 remote가 정식 출시되기 전 반드시 교체하세요.

### 아이콘 레지스트리도 동일 발상

화면 컴포넌트뿐 아니라 메뉴 아이콘도 운영자가 어드민에서 선택하는 구조를 따릅니다. [libs/shared-ui/src/components/custom/menuIconRegistry.ts](../libs/shared-ui/src/components/custom/menuIconRegistry.ts)에 사용 가능 아이콘이 등록되어 있고, DB의 `iconKey`(`custom:IconMenuMain` / `lucide:Activity` 등)에 따라 사이드바·picker가 해석합니다. 새 아이콘이 필요하면 레지스트리에 등록.

### 흔한 실수 / 안티패턴

#### prop이 다른 컴포넌트를 같은 variants 그룹에 등록

```tsx
// ❌ BotList는 props 없고 BotDetail은 :serviceId 필요 — 다른 path
components: {
  BotList: { ..., component: lazy(() => import('./BotList')) },
  BotDetail: { ..., component: lazy(() => import('./BotDetail')) }, // 잘못된 그룹
}
```

variants는 **같은 path 위에서 호환되는 컴포넌트**만 등록해야 합니다. URL 파라미터·라우트 컨텍스트가 다르면 별도 그룹.

#### 모든 path를 미리 DynamicElement로 변환

대부분의 page는 영영 변형이 필요 없습니다. 변형 요구사항이 실제로 생긴 page만 DynamicElement로 변환하세요. 미리 변환하면 boilerplate만 늘고 가치 없습니다.

#### aggregator에 import 추가를 빼먹음

신규 `*.variants.ts` 파일을 만들고 aggregator에 import를 안 넣으면 picker에 노출되지 않습니다. PR 리뷰 시 체크하거나 ESLint 룰로 검증할 수 있습니다.

#### variants에 등록되지 않은 키를 DB에 저장

DynamicElement는 등록 안 된 키를 만나면 default로 fallback하므로 화면이 깨지진 않지만, 운영자가 picker에서 다시 선택하기 전까진 의도와 다른 화면이 보일 수 있습니다. 변형 컴포넌트를 코드에서 제거할 땐 DB 마이그레이션도 함께 진행하세요.

## 20. 라우팅(routes.tsx) 가이드

각 remote의 라우팅은 `apps/<remote>/src/app/routes.tsx` **한 파일**에 정의합니다. **`apps/fca/src/app/routes.tsx`가 레퍼런스 구현**이며, 신규 remote 생성·기존 remote 점검(`/update-remote`) 시 이 컨벤션을 기준으로 정규화합니다.

### 파일 구조

routes.tsx는 위에서 아래로 네 블록으로 구성됩니다.

1. **import** — `react`, `react-router-dom`, `features/router/`의 라우팅 보조 모듈, `createPageVariantSocket`, `NotFound`
2. **lazy 페이지 선언** — 모든 페이지를 `React.lazy`로 선언
3. **변형 소켓 팩토리 선언** — `const pv = createPageVariantSocket('<appId>')` 1회
4. **`routes` 배열 export** — 라우트 트리

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
const BotDashboard = React.lazy(() => import('./pages/dashboard/BotDashboard'));

// 변형 소켓 — path 인자는 화면 식별 키(라우트 경로 그대로, 동적 세그먼트 포함)
const pv = createPageVariantSocket('fca');

export const routes = [
  {
    path: '/',
    element: <Outlet />, // 또는 remote별 세션 핸들러
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
      {
        path: 'dashboard',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="call-bot" replace /> },
          { path: 'call-bot', element: pv('dashboard/call-bot', BotDashboard) },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound homePath="/" /> }, // 항상 마지막
];
```

### 1. 페이지는 React.lazy로 지연 로드

- 모든 페이지 컴포넌트는 `const Xxx = React.lazy(() => import('./pages/...'))`로 **파일 상단에 선언**합니다.
- 선언 순서는 `routes` 트리에 등장하는 **라우트 그룹 순서**를 따라 묶습니다 (bot-config 페이지들 → dashboard 페이지들 → …). 트리와 선언부의 순서를 맞추면 추적이 쉽습니다.
- import 경로는 `./pages/...` **상대 경로**를 씁니다.
- ❌ 페이지를 직접 `import`하지 마세요. 모든 페이지가 첫 번째 청크에 포함되어 초기 로딩이 느려집니다.

#### 페이지 컴포넌트 네이밍은 기능명만

페이지 `.tsx` 파일명과 lazy 변수명은 **기능명만** 사용합니다. fca처럼 `<기능명>` 또는 `<기능명><역할>`(역할 = `List`·`Create`·`Detail` 등) 형태로 짓고, `Page`처럼 "페이지임"을 나타내는 군더더기 접미사를 붙이지 않습니다. 같은 화면을 어떤 remote는 `RoleCreatePage`, 어떤 remote는 `RoleCreate`로 짓는 불일치를 막기 위해 **fca를 기준으로 통일**합니다.

```typescript
// ❌ Page 접미사 — 모든 페이지가 "Page"라 변수명에 정보가 없음
const RoleCreatePage = React.lazy(() => import('./pages/iam/RoleCreatePage'));
const NodeListPage = React.lazy(() => import('./features/node-management/pages/NodeListPage'));
const AccountPolicyPage = React.lazy(() => import('./pages/account-policy/AccountPolicyPage'));

// ✅ 기능명만 — fca 기준
const RoleCreate = React.lazy(() => import('./pages/iam/RoleCreate'));
const NodeList = React.lazy(() => import('./pages/node-management/NodeList'));
const AccountPolicy = React.lazy(() => import('./pages/account-policy/AccountPolicy'));
```

> 파일명과 lazy 변수명, 그리고 컴포넌트 `default export` 이름 세 가지를 모두 동일하게 맞춥니다(예: `NodeList.tsx` → `const NodeList` → `export default NodeList`).

### 2. routes 배열 구조

- 라우트 트리는 `export const routes = [...]`로 **named export** 합니다.
- 최상위는 **단일 루트** `{ path: '/', element, children }` 하나입니다.
  - `element`: remote에 루트 레벨 세션·이벤트 핸들러가 있으면 그 컴포넌트(예: fca의 `FcaWsSessionEventHandler`), 없으면 `<Outlet />`.
- 2-depth 이상 라우트 그룹은 `{ path: '<group>', element: <Outlet />, children: [...] }`로 표현합니다.
- 실제 페이지를 그리는 leaf는 `{ path: '<page>', element: pv('<화면 키>', Page) }`입니다 (3번 참조).
- `routes` 배열의 **마지막 항목**은 항상 catch-all `{ path: '*', element: <NotFound homePath="/" /> }`입니다.

### 3. leaf 페이지는 변형 소켓(pv)으로 래핑

실제 화면을 그리는 leaf 라우트의 element는 컴포넌트를 직접 넣지 않고 `pv('<화면 키>', Component)` 변형 소켓으로 래핑합니다. 소켓이 있어야 운영자 화면 지정(정식 variant)과 현장 커스텀(custom remote 오버라이드)이 그 화면에 끼어들 수 있습니다. 소켓만 있는 화면은 picker 목록에 노출되지 않으므로(카탈로그 오염 없음) **모든 leaf에 일괄 적용**하는 것이 표준입니다.

- 파일 상단에 `const pv = createPageVariantSocket('<appId>')`를 **1회 선언**하고 leaf마다 사용합니다.
- 첫 번째 인자(화면 키)는 화면을 식별하는 **논리 키(SoT)** 입니다. DB의 page-variant row·custom remote exposes 키와 매칭됩니다.
- **화면 키 작명 규칙**: **라우트 경로를 그대로** 사용합니다. 동적 세그먼트도 `:paramId` 표기 그대로 포함합니다.
  - `bot-config/bot/:serviceId`, `cos/:cosId/edit`, `agent-config/knowledge/:documentId/eval/:evalId`
  - 그룹 index가 페이지(목록 등)를 직접 그리면 그룹 경로가 키: `cos`(index) → `cos`
  - 같은 화면의 별칭 라우트(index와 `list`가 같은 컴포넌트 등)는 **같은 키를 공유**하고, 메뉴 컨텍스트가 다른 복사 라우트(fca의 `bot-config/model` vs `global/model`)는 **키를 분리**합니다.
- **키는 한번 정하면 변경 금지**: 이후 라우트 경로나 파라미터명(`:serviceId` → `:botId` 등)이 리팩토링으로 바뀌어도 키는 옛 값을 유지합니다. 키가 경로와 어긋나는 것은 허용이지만, 키를 바꾸면 DB에 저장된 화면 지정·현장 커스텀 연결이 끊어집니다.
- 레이아웃 컴포넌트(`<Outlet />`을 그리는 `<Feature>DetailLayout` 등)와 `Navigate`/`NotFound`는 소켓 대상이 아닙니다.
- 현장 커스텀 메커니즘 전반은 [CUSTOM_DEVELOPMENT_GUIDE.md](CUSTOM_DEVELOPMENT_GUIDE.md) 참조.

### 4. index redirect

라우트 그룹에 직접 진입(예: `/bot-config`)했을 때 기본 하위 페이지로 보냅니다.

- 각 그룹 `children`의 **첫 항목**은 `{ index: true, element: <Navigate to="<default>" replace /> }`.
- 항상 `replace`를 붙여 히스토리에 빈 그룹 경로가 남지 않게 합니다.
- 동적 세그먼트 하위 그룹의 index는 부모로 복귀시킵니다: `{ index: true, element: <Navigate to=".." replace /> }`.

> **이 규칙은 breadcrumb의 비-leaf 클릭성과 짝을 이룹니다.** "Breadcrumb 표준 절차 → path 컨벤션"에 따라 fca는 자체 페이지가 없는 카테고리/그룹 항목에도 그 그룹의 path를 그대로 부여합니다(예: `{ title: '관리', path: '/fca/bot-config' }`). 사용자가 그 카테고리 라벨을 클릭했을 때 빈 화면으로 떨어지지 않는 것은, 여기서 정의한 index redirect가 자동으로 기본 하위 페이지로 안내해 주기 때문입니다. **그룹마다 index redirect를 빠뜨리지 마세요** — 빠뜨리면 같은 그룹 path를 가리키는 모든 페이지의 breadcrumb 카테고리 클릭이 일제히 빈 화면 또는 NotFound로 떨어집니다. 라우트 그룹을 신설/이동/리네임할 때는 항상 (a) index redirect 존재 여부, (b) redirect 타깃이 실재하는지, (c) 그 path를 쓰는 breadcrumb 항목들이 함께 업데이트됐는지 세 가지를 같이 점검하세요.

### 5. 동적 세그먼트와 상세 페이지

- 동적 파라미터는 `:paramId` 형태(**camelCase**)로 작성합니다: `:serviceId`, `:modelId`, `:intentId`.
- 탭 레이아웃이 필요한 상세 페이지는 `element`에 레이아웃 컴포넌트(`<Feature>DetailLayout`)를 두고, `children`에 탭·하위 라우트를 중첩합니다. 레이아웃 자체는 소켓 대상이 아니고, 그 안의 leaf 페이지들만 `pv`로 래핑합니다.

```typescript
{
  path: ':modelId',
  element: <ModelDetailLayout />, // 레이아웃 — 소켓 제외
  children: [
    { index: true, element: pv('bot-config/model/:modelId', ModelDetail) },
    {
      path: 'intent',
      children: [
        { index: true, element: <Navigate to=".." replace /> },
        { path: ':intentId', element: pv('bot-config/model/:modelId/intent/:intentId', IntentDetail) },
      ],
    },
  ],
}
```

### 6. 공통 라우트는 복사 작성

여러 path가 동일한 라우트 묶음을 공유하더라도 **각 path에 그대로 복사**합니다. 모듈 스코프 const + spread(`[...sharedXxxRoutes]`) 패턴은 사용하지 않습니다.

```typescript
// ✅ 권장 — 각 그룹에 명시적으로 복사 (화면 키는 메뉴 컨텍스트별로 분리)
{
  path: 'model',  // bot-config/model
  children: [
    { index: true, element: <Navigate to="list" replace /> },
    { path: 'list', element: pv('bot-config/model/list', ModelList) },
    { path: 'create', element: pv('bot-config/model/create', ModelCreate) },
    // ...
  ],
},
{
  path: 'model',  // global/model
  children: [
    { index: true, element: <Navigate to="list" replace /> },
    { path: 'list', element: pv('global/model/list', ModelList) },
    { path: 'create', element: pv('global/model/create', ModelCreate) },
    // ...
  ],
},

// ❌ 비권장 — spread 패턴
const sharedModelRoutes = [ /* ... */ ];
{ path: 'model', children: [...sharedModelRoutes] },
{ path: 'model', children: [...sharedModelRoutes] },
```

**왜 비권장인가**: spread는 코드 중복을 줄여주지만, 정적 분석 도구가 모듈 스코프 const 정의를 인라인 본문으로 따라가기 어렵습니다. routes.tsx를 입력으로 삼는 검증 스크립트(예: breadcrumb path가 실재 라우트에 매칭되는지 점검, group index redirect 누락 검출)가 부정확해지면 진짜 누락 케이스가 false positive에 묻혀 놓치기 쉽습니다. 또 routes.tsx는 한 파일에 정의되어 있고 페이지 추가·삭제 빈도가 높지 않아 복사 비용이 크지 않습니다. **두 그룹 모두 같은 패턴이면 둘 다 직접 작성**해 한눈에 비교 가능한 구조로 두세요. 향후 한쪽만 달라지는 변경이 생겨도 자연스럽게 분기됩니다.

### 7. path 네이밍

- 모든 path 세그먼트는 **kebab-case**: `bot-config`, `bot-dialog-history`, `call-bot`, `user-def`.
- 동적 세그먼트만 예외로 `:camelCase`.

### 8. 라우팅 보조 모듈은 features/router/

routes.tsx는 **라우트 트리 정의에만** 집중합니다. 세션 이벤트 핸들러, `DynamicElement`, variant manifest, query selector aggregator 등 라우팅 보조 코드는 `features/router/`에 두고 routes.tsx에서는 import만 합니다.

### variant·queryString 분기 path

- **화면 커스터마이징(variant)**: 정식 variant(2개 이상의 본사 관리 화면)를 갖는 path만 `pv` 대신 `<DynamicElement variants={...} />`를 직접 사용합니다. 변형 없는 leaf는 `pv` 소켓이 기본입니다. → 19장 참조
- **queryString 분기**: 같은 path를 queryString으로 분기하는 메뉴는 `handle.queryParams`를 선언합니다. `pv` 소켓과 `handle`은 같은 라우트 객체에 공존 가능합니다. → `queryString 기반 메뉴 분기 가이드` 참조

### 9. 탭 모델(메뉴 기준 탭 스트립)

이 셸은 화면 이동을 SubHeader의 **탭 스트립**으로 노출합니다(host `useTabSync`). 탭의 정체성은 url이 아니라 **메뉴를 눌러 발급된 탭 id**입니다.

- **탭 생성 = 메뉴 클릭만**: 사이드바·즐겨찾기·통합검색에서 메뉴 항목을 누르면 새 탭이 열립니다(`useOpenInNewTab`). **같은 화면을 또 눌러도 새 탭**이 생깁니다(중복 허용 — 탭마다 독립 상태).
- **페이지 이동은 탭을 만들지 않음**: 탭 안에서의 `navigate`(목록→상세, 삭제·생성·수정·취소 후 목록 복귀 등)는 **현재 활성 탭의 url·라벨만 바꿉니다**. 새 탭이 생기지 않습니다.
- **탭은 X로만 닫힘**: 탭 칩의 X(또는 우클릭 컨텍스트 메뉴의 닫기)로만 닫습니다. 활성 탭을 닫으면 인접 탭이 활성화됩니다.
- **상태 보존(keepAlive)**: 같은 remote 안에서 탭을 오가면 각 탭의 페이지 상태(입력·스크롤·그리드)가 보존됩니다(remote별 `KeepAliveBoundary`가 **활성 탭 id**를 캐시 키로 사용 → 같은 url 중복 탭도 각각 독립 보존).

따라서 페이지·탭 컴포넌트에서 이동할 때 **탭을 닫으려고 `{ replace: true }`를 붙일 필요가 없습니다**. 삭제 후 `navigate('../list')`만으로도 그 탭이 목록으로 바뀔 뿐, 죽은 url 탭이 남지 않습니다.

```typescript
const navigate = useNavigate();

// 삭제 완료 → 목록으로. 현재 탭이 목록으로 바뀐다(탭은 그대로 열려 있음, 새 탭 X).
const { mutate: deleteBot } = useDeleteBot({
  mutationOptions: {
    onSuccess: () => {
      toast.success('봇이 삭제되었습니다.');
      navigate('../list'); // 활성 탭 url만 갱신 — 죽은 탭도 안 남음
    },
  },
});
```

> `{ replace: true }`는 이제 탭 동작과 무관하며, **순수 브라우저 히스토리** 목적(예: 삭제된 상세로 뒤로가기 방지)일 때만 판단해서 사용합니다.
>
> ⚠️ **알려진 한계 — cross-remote 상태 보존**: 다른 remote로 갔다가 돌아오면 직전 remote 페이지가 재마운트되어 입력 상태가 유실될 수 있습니다(host 레벨 remote 모듈 keepAlive와 remote 내부 `KeepAliveBoundary` 중첩 이슈). 같은 remote 안의 탭 전환에서는 정상 보존됩니다.

### 10. 공개 라우트(handle.public) — 세션 없이 접근 가능한 화면

세션(로그인) 없이 접근해야 하는 화면(공개 전광판·롤링 등)은 **remote가 routes.tsx leaf에 스스로 선언**합니다. host의 경로 prefix 하드코딩(과거 SessionGuard `PUBLIC_PATH_PREFIXES`)을 대체한 메커니즘입니다.

```tsx
import type { RouteHandle } from '@/shared-store';

// 공개 leaf — handle.public 선언. <Chromeless> 래퍼는 두지 않는다(host가 강제).
{
  path: 'task-view-public/:layoutId/:displayId',
  handle: { public: true } satisfies RouteHandle,
  element: <TaskViewPublic />,
},
```

#### 동작 방식

- host의 `RouteShell`(`apps/host/src/app/features/router/RouteShell.tsx`)이 **문서 로드 시 진입 pathname으로 1회 판정**합니다. 첫 세그먼트가 remote id면 해당 remote의 `Routes`만 import해 public leaf와 매칭(`publicRoutes.ts`).
- `public` 판정 → `PublicRouteGate`: 세션 체크·개인화 쿼리(userInfo/navigation/WS ticket)·WS 세션 이벤트가 **트리에 아예 없는** 최소 트리. `Chromeless`를 강제해 chrome(헤더·사이드바·패널)이 노출되지 않습니다(chrome은 private 전용 데이터 의존이라 public에선 성립 불가).
- `private` 판정 → `PrivateRouteGate`: 기존 4단 가드(SessionGuard → SharedInfoProvider → RouteGuard → WsSessionEventHandler) 조립.

#### 핵심 규칙

- **leaf에만 유효**: 그룹(Outlet) route에 선언하면 host가 경고 로그 후 무시합니다(하위 전파 없음 — 과대 공개 방지).
- **fail-closed**: 판정 실패는 전부 private 처리 — pathname 이상(연속 슬래시 등), remote import 실패, 10s 타임아웃, 빈 routes(미기동 remote), 매칭 실패. 잘못돼도 "잠긴 화면이 더 잠기는" 방향으로만 틀립니다.
- **판정은 문서 로드당 1회, SPA 내부 이동은 재판정 없음**: public 화면 진입은 `window.open`(새 문서 로드)이 정상 경로입니다. 재판정하면 판정 대기 중 private 가드가 언마운트되어 Layout keep-alive가 파괴되므로 의도적으로 고정합니다.
- **`<Chromeless>` 래퍼 금지**: host `PublicRouteGate`가 강제하므로 중복. private+chromeless 화면(녹취 재생·워크플로우 편집기 등)은 여전히 자기 래퍼 필수(chromeless 화면 가이드 참조).
- **데이터 API 인증은 remote 책임**: host는 화면 접근만 개방합니다. 공개 화면이 호출하는 API의 인증(공개 토큰 등)은 remote가 스스로 처리해야 합니다.
- **세션이 있어도 public 트리**: 로그인 상태로 public 경로에 진입해도 public 트리로 렌더됩니다(세션 쿠키는 API 요청에 평소처럼 동봉 — "익명도 허용"이지 "익명 강제"가 아님).

레퍼런스: `apps/taskboard/src/app/routes.tsx`의 `task-rolling`·`task-view-public/:layoutId/:displayId` leaf.

### 정규화 체크리스트 (`/update-remote` 기준)

- [ ] 모든 페이지가 `React.lazy(() => import('./pages/...'))`로 선언되어 있다 (직접 import 없음)
- [ ] 페이지 `.tsx` 파일명·lazy 변수명이 기능명만 쓰고 `Page` 접미사가 없다 (fca 기준)
- [ ] `routes`가 named export이고, 최상위가 단일 `path: '/'` 루트다
- [ ] `const pv = createPageVariantSocket('<appId>')`가 파일 상단에 1회 선언되어 있다 (appId가 자기 remote와 일치)
- [ ] 모든 leaf 페이지 element가 `pv('<화면 키>', Component)` 소켓으로 래핑되어 있다 (레이아웃·Navigate·NotFound 제외)
- [ ] 화면 키가 라우트 경로 그대로다 (동적 세그먼트 `:paramId` 포함). 단, 키는 불변이므로 경로 변경으로 어긋난 기존 키는 위반이 아님 — 신규 작성분만 점검
- [ ] 2-depth 이상 그룹이 `element: <Outlet />` + `children`으로 표현된다
- [ ] 각 그룹 `children` 첫 항목이 `index` redirect(`Navigate ... replace`)다
- [ ] `routes` 배열 마지막 항목이 catch-all `{ path: '*', element: <NotFound homePath="/" /> }`다
- [ ] 모든 path 세그먼트가 kebab-case, 동적 세그먼트가 `:camelCase`다
- [ ] 라우팅 보조 코드가 `features/router/`에 있고 routes.tsx는 import만 한다
- [ ] 중복 라우트 묶음이 모듈 스코프 상수(spread)로 추출되어 있지 않고 각 path에 복사 작성되어 있다

---

## queryString 기반 메뉴 분기 가이드

### 왜 필요한가

같은 path를 여러 메뉴가 공유하면서 queryString으로 화면 분기를 하는 패턴이 있습니다. 예:

- 같은 대시보드 path(`/fca/dashboard`) + 메뉴마다 다른 위젯 preset(`?presetId=ops` / `?presetId=sales`)
- 같은 목록 path + 메뉴마다 다른 필터(`?status=active` / `?status=archived`)

이 흐름을 자유 입력으로 두면 운영자가 path 컬럼에 query를 손으로 작성해야 하고, 어떤 path가 어떤 query를 받는지 메뉴 폼이 알 수 없습니다. 이 메커니즘은 **routes.tsx에 query spec을 선언하면 메뉴 폼이 path 선택 시 자동으로 그에 맞는 selector UI를 띄워주는** 구조입니다.

### 전체 구조

```
┌──────────── 코드 (개발자 작성) ────────────┐
│                                              │
│  routes.tsx                                  │
│   handle.queryParams: [                      │
│     { key, label, selectorKey, ...extra }    │
│   ]                                          │
│         │                                    │
│         ▼                                    │
│  apps/<remote>/src/app/features/router/      │
│   ├── querySelectors.ts (aggregator)         │
│   │    - _selectors = { Xxx: lazy(...) }     │
│   │    - SelectorKeys = { Xxx: 'fca:Xxx' }   │
│   └── selectors/Xxx.tsx                      │
│         │ MF './QuerySelectors'로 expose     │
│         ▼                                    │
└─────────┼────────────────────────────────────┘
          │
          ├── (host 부팅) useQuerySelectorsLoader가 모든 remote의
          │    querySelectors를 로드 → '<appId>:<key>' prefix 적용 후
          │    useQuerySelectorsStore.registry에 적재
          │
          ├── (운영자) 메뉴 폼이 path 선택 → entry.queryParams 감지 →
          │    QuerySelectorRenderer가 registry lookup → selector 렌더 →
          │    선택값 + path를 'path?key=value'로 합성해 DB 저장
          │
          └── (사용자) 메뉴 클릭 → /path?key=value 이동 →
              컴포넌트가 useSearchParams로 query 읽어 화면 분기
```

### 책임 분리

| 영역 | 책임 |
|---|---|
| **routes.tsx의 handle.queryParams** | 메타데이터만 — "어떤 selector + 가벼운 식별자/필터" |
| **selector 컴포넌트** | UI 그리기 + 데이터 가져오기 (정적이면 spec.options 사용, 동적이면 useGetXxx 호출) |
| **메뉴 폼** | selectorKey로 컴포넌트 lookup해 동일 인터페이스로 렌더만 — selector 종류·데이터 fetching에 무지 |

### 두 종류의 selector

#### 1. 공통 selector (manager가 기본 제공)

옵션 데이터를 **routes.tsx의 spec에서 받는** 일반 selector. manager가 한 번 만들고 모든 remote가 공유합니다.

대표 예: `EnumSelector` — `spec.options`에 `{ value, label }[]`을 받아 그대로 Ant Select로 렌더.

```tsx
// routes.tsx
import { DefaultSelectorKeys } from '@/shared-store';

handle: {
  queryParams: [
    {
      key: 'status',
      label: '상태',
      selectorKey: DefaultSelectorKeys.EnumSelector,
      options: [
        { value: 'active', label: '활성' },
        { value: 'inactive', label: '비활성' },
      ],
    },
  ],
}
```

새 공통 selector 추가 시:
1. `apps/manager/src/app/features/router/selectors/Xxx.tsx` 작성 (default export)
2. `apps/manager/src/app/features/router/querySelectors.ts`의 `_selectors`에 lazy import + 키 등록
3. `libs/shared-store/src/lib/defaultSelectorKeys.ts`의 `DefaultSelectorKeys`에 `Xxx: 'manager:Xxx'` 항목 추가

#### 2. 도메인 selector (각 remote가 자체 제공)

옵션 데이터를 **selector 컴포넌트가 자체 정의/fetch하는** selector. 도메인 지식이 selector에 머무르므로 다른 remote와 의존성이 생기지 않습니다.

대표 예시 (가상): `PresetSelector` — fca의 useGetPresets로 preset 목록을 fetch해서 select 그림.

```tsx
// apps/fca/src/app/features/router/selectors/PresetSelector.tsx
import { Select } from 'antd';
import type { QuerySelectorProps } from '@/shared-store';
import { useGetPresets } from '../../preset/hooks/usePresetQueries';

export default function PresetSelector({ spec, value, onChange }: QuerySelectorProps) {
  const { data: presets = [], isLoading } = useGetPresets({
    params: { targetPath: spec.filter as string },
  });
  return (
    <Select
      value={value}
      onChange={(v) => onChange(v ?? undefined)}
      loading={isLoading}
      options={presets.map((p) => ({ value: p.presetId, label: p.name }))}
      allowClear
      placeholder="Preset 선택"
    />
  );
}
```

```ts
// apps/fca/src/app/features/router/querySelectors.ts (aggregator)
const _selectors = {
  PresetSelector: lazy(() => import('./selectors/PresetSelector')),
} satisfies Record<string, QuerySelectorComponent>;
```

```tsx
// routes.tsx
import { SelectorKeys } from './features/router/querySelectors';

handle: {
  queryParams: [
    {
      key: 'presetId',
      label: '대시보드 Preset',
      selectorKey: SelectorKeys.PresetSelector,
      filter: 'dashboard',  // selector가 spec.filter로 사용
    },
  ],
}
```

### 새 도메인 selector 추가 절차

1. **selector 컴포넌트 작성**: `apps/<remote>/src/app/features/router/selectors/Xxx.tsx` (default export, `QuerySelectorProps` 받음)
2. **aggregator 등록**: `apps/<remote>/src/app/features/router/querySelectors.ts`의 `_selectors`에 lazy import + 키 추가. `SelectorKeys.Xxx`가 자동으로 `'<appId>:Xxx'` 타입으로 noaaow됨
3. **routes.tsx에서 사용**: `import { SelectorKeys } from './features/router/querySelectors'` → `selectorKey: SelectorKeys.Xxx`

코드 변경은 셋이 끝. host loader, MF expose, store는 모두 자동.

### appId prefix와 SelectorKeys 상수

selectorKey 충돌 방지와 휴먼에러 방지를 위해 두 가지 강제:

1. **appId prefix 자동 적용**: host의 [useQuerySelectorsLoader.ts](../apps/host/src/app/features/router/hooks/useQuerySelectorsLoader.ts)가 각 remote의 querySelectors를 `<appId>:<key>` 형태로 변환해 store에 적재. fca의 EnumSelector와 manager의 EnumSelector가 자연스럽게 분리됨
2. **SelectorKeys 자동 생성**: 각 remote의 `querySelectors.ts`에서 `Object.fromEntries` + `satisfies` + literal type assertion 패턴으로 SelectorKeys 객체 자동 생성. routes.tsx에서 `SelectorKeys.Xxx`로 자동완성·타입체크 받음

```ts
const APP_ID = 'fca';

const _selectors = {
  PresetSelector: lazy(() => import('./selectors/PresetSelector')),
} satisfies Record<string, QuerySelectorComponent>;

export const querySelectors = _selectors;

// 자동: SelectorKeys.PresetSelector === 'fca:PresetSelector' (타입도 narrow)
export const SelectorKeys = Object.fromEntries(
  Object.keys(_selectors).map((k) => [k, `${APP_ID}:${k}`]),
) as { [K in keyof typeof _selectors]: `${typeof APP_ID}:${K & string}` };
```

### 새 remote의 자동 등록

`pnpm gen remote`로 신규 remote를 생성하면 다음이 자동 처리됩니다:

- `apps/<new-remote>/src/app/features/router/querySelectors.ts` 빈 aggregator 생성 (APP_ID는 새 앱 이름으로 자동 치환)
- `module-federation.config.ts`에 `'./QuerySelectors'` expose 항목 포함
- 호스트의 `useQuerySelectorsLoader` `SELECTOR_LOADERS` 맵에 신규 remote 자동 등록

따라서 신규 remote는 별도 작업 없이 querySelectors 인프라가 즉시 동작합니다 (selector를 추가하는 시점부터 registry에 기여).

### 메뉴 폼 동작

메뉴 등록·편집 폼([MenuDetailForm](../apps/manager/src/app/features/menu/components/MenuDetailForm.tsx), [MenuCreateDrawer](../apps/manager/src/app/features/menu/components/MenuCreateDrawer.tsx))은 다음을 자동 처리합니다:

- **path 변경 감지**: `useRemoteRoutesStore.routes`에서 entry를 찾아 `entry.queryParams` 추출
- **selector 동적 노출**: [QuerySelectorRenderer](../apps/manager/src/app/features/menu/selectors/QuerySelectorRenderer.tsx)가 spec.map → registry lookup → 컴포넌트 렌더 (Suspense로 lazy 로드 대비)
- **저장 시 합성**: 운영자 선택값을 `URLSearchParams`로 인코딩해 `path?key=value` 형태로 path 컬럼 저장
- **편집 시 분해**: 저장된 path에서 `?` 기준으로 base path와 queryValues 분리 → path Select와 selector에 각각 복원
- **queryValues 관리**: form 인스턴스 외부의 `useState`로 관리. Form.useWatch는 등록되지 않은 필드의 setFieldsValue 변경을 즉시 반영하지 않을 수 있어 별도 state로 분리한 것

핵심 유틸: [menuFormOptions.tsx](../apps/manager/src/app/features/menu/utils/menuFormOptions.tsx)의 `splitPathQuery`, `joinPathQuery`.

> 분기 값을 fetch 인자로 사용한다면 React Query 일반 규칙대로 queryKey에 포함시켜 메뉴별 캐시를 분리합니다(`createAppQueryKeys` factory에 인자로 받으면 자동 적용 — 별도 항목으로 박지 않고 일반 규칙을 따르면 충분).
>
> 메뉴 등록·편집 폼은 `handle.queryParams`에 선언된 모든 query를 무조건 필수 입력으로 검증합니다(빈 값 저장 불가). 선택적 query 키 케이스는 의도적으로 미지원이므로 `QueryParamSpec`에 `required` 같은 옵트인 옵션도 두지 않습니다 — 검증 로직은 [MenuCreateDrawer](../apps/manager/src/app/features/menu/components/MenuCreateDrawer.tsx) / [MenuDetailForm](../apps/manager/src/app/features/menu/components/MenuDetailForm.tsx)의 `handleSubmit`이 담당하고, 빈 selector 옆에 인라인 에러 메시지를 표시합니다([QuerySelectorRenderer](../apps/manager/src/app/features/menu/selectors/QuerySelectorRenderer.tsx)의 `errors` prop).
>
> 분기 메뉴 페이지의 breadcrumb은 leaf 항목 `path`에 현재 query 값을 직접 합성해 자기 자신을 가리키도록 작성합니다. 부모(상위) 항목은 redirect-only 그룹(`<Navigate to=... replace />`로 자식 leaf에 떨어지는 path)인 경우가 많은데, 이때 `path`에 query를 박아도 redirect 단계에서 query가 사라져 분기 컨텍스트가 깨집니다 — wrapper나 routes 구조 변경을 도입하지 않는 한 이 누락은 막을 수 없으므로 부모 항목은 `path`를 작성하지 않는 것을 권장합니다. host의 [BreadcrumbSlot](../apps/host/src/app/features/layout/components/BreadcrumbSlot.tsx)은 path 없는 항목을 비링크 텍스트(`<span>`)로 렌더하므로 시각적으로도 클릭 비활성임이 드러납니다.
>
> ```tsx
> // 페이지 본문 시작부에서 useBreadcrumbStore에 push (페이지 레이아웃 가이드 → Breadcrumb 표준 절차 참조).
> // 분기 query 값이 바뀔 때마다 leaf의 path를 다시 합성해야 하므로 deps에 분기 값을 포함시킨다.
> useEffect(() => {
>   const items: BreadcrumbProps['items'] = [
>     { title: '샘플' },                                                          // 부모 — path 폐기 → 비링크 텍스트
>     { title: '프리셋 데모', path: `/fca/sample/preset-demo?preset=${preset}` }, // leaf — 현재 query 합성
>   ];
>   setBreadcrumb(items);
>   return () => clearBreadcrumb();
> }, [preset, setBreadcrumb, clearBreadcrumb]);
> ```

### 주의사항 — 컴포넌트 remount 처리

같은 path를 여러 메뉴가 공유할 때 자동으로 처리되지 않는 핵심 사항입니다 — 메커니즘 위에서 작성자가 보완해야 합니다.

#### 왜 필요한가

같은 path를 query로 분기하는 두 메뉴(예: `?preset=sales`, `?preset=support`)를 클릭할 때 React Router는 같은 element 매칭이라 판단해 컴포넌트 인스턴스를 재사용합니다. `useSearchParams`로 새 query 값은 reactive하게 읽히지만, 다음 상태들은 그대로 남습니다:

- `useState` 값(폼 입력, 카운터, 펼침 상태 등)
- `useRef`로 잡고 있는 imperative 핸들·DOM 참조
- 진행 중이던 mutation·polling·timer
- AG-Grid 같은 imperative 컴포넌트의 내부 상태(컬럼 width, 정렬 순서 등)

운영자 입장에서 "다른 메뉴를 클릭한 결과로 새 화면이 떠야 한다"고 기대할 때 위 상태가 남아 있으면 혼란이 발생합니다.

#### 정공법: outer/inner 분할 + `key`

페이지 컴포넌트를 두 단으로 나눠, outer가 query 값을 읽고 inner의 `key`로 박습니다:

```tsx
export default function PresetDemo() {
  const [searchParams] = useSearchParams();
  const preset = searchParams.get('preset') ?? '';
  return <PresetDemoBody key={preset} />;
}

function PresetDemoBody() {
  // 기존 페이지 본체 — useState/useEffect/useRef/AG-Grid 등 자유롭게 사용
}
```

`key`가 변하면 React가 `PresetDemoBody`의 인스턴스를 unmount/remount하므로 위에 나열한 상태가 모두 초기화됩니다. fca의 [PresetDemo.tsx](../apps/fca/src/app/pages/sample/PresetDemo.tsx)가 검증 샘플로 마운트 시각·카운터를 표시해 동작을 즉시 확인할 수 있게 해둡니다.

#### 분기 키 문자열의 동기화

분기 키 문자열(`'preset'` 등)은 작성자가 다음 위치에 모두 박아야 합니다:

- routes.tsx의 `handle.queryParams[].key`
- 페이지 outer/inner의 `searchParams.get(...)`
- (있다면) TanStack Query key

세 군데를 사람이 맞추는 구조라 한 곳 빼먹어도 조용히 깨질 수 있지만, non-data router 환경에선 단일 출처(SoT)를 reactive하게 공유할 표준 방법이 없어 자동 동기화는 불가합니다. 키가 1~2개로 짧고 의미가 명확하면(예: `preset`, `mode`) 하드코딩이 가장 가볍고 권장됩니다. 다음 중 하나라도 해당되면 페이지 옆에 `<Page>.consts.ts` 같은 상수 모듈을 두고 routes·페이지·query key 모두 그 상수에서 import하는 것을 권장합니다:

- 같은 키가 여러 페이지에서 재사용됨
- 키 이름이 길거나 오타 위험이 있음
- 한 페이지의 분기 query 키가 2개 이상

상수 모듈 예시:

```ts
// PresetDemo.consts.ts
import { SelectorKeys } from '../../features/router/querySelectors';

export const PRESET_DEMO_QUERY_KEY = 'preset';
export const PRESET_DEMO_QUERY_PARAMS = [
  { key: PRESET_DEMO_QUERY_KEY, label: '프리셋', selectorKey: SelectorKeys.PresetSelector },
] as const;
```

```tsx
// routes.tsx
import { PRESET_DEMO_QUERY_PARAMS } from './pages/sample/PresetDemo.consts';
{
  path: 'preset-demo',
  element: pv('sample/preset-demo', PresetDemo),
  handle: { queryParams: PRESET_DEMO_QUERY_PARAMS },
}

// PresetDemo.tsx
import { PRESET_DEMO_QUERY_KEY } from './PresetDemo.consts';
const preset = searchParams.get(PRESET_DEMO_QUERY_KEY) ?? '';
```

페이지 본체(`PresetDemo.tsx`)가 아닌 별도 파일에 두는 이유: routes.tsx는 페이지를 `React.lazy`로 import해 청크를 분리하는데, 페이지 본체에서 메타데이터를 named export하면 라우터 빌드 단계에 페이지 첫 청크가 같이 로드되며 lazy 효과가 깨질 수 있습니다.

#### 적용이 필요한 케이스 / 불필요한 케이스

| 케이스 | 적용 |
| ------ | ---- |
| 폼/입력 state·카운터·펼침 등 자체 state 보유 | ✅ |
| AG-Grid·차트 등 imperative 내부 상태 보유 | ✅ |
| 진행 중 mutation·polling·timer 보유 | ✅ |
| `useSearchParams`로 query만 읽어 TanStack Query 호출하는 read-only 화면 | ❌ (state가 거의 없으면 불필요) |
| 같은 그리드를 보여주되 필터 preset만 다른 케이스 | ❌ (오히려 컬럼 width·스크롤 유지가 자연스러움) |

판단 기준: **"메뉴 A→B 전환이 새 화면 진입인가, 같은 화면의 필터 변경인가?"** 새 진입이면 적용, 필터 변경이면 그대로.

#### 왜 자동화 메커니즘이 없나

검토한 자동화 옵션이 모두 부적합했습니다:

- **React Router 자체 옵션**: `useMatches`로 `route.handle`을 읽어 자동 wrapping하는 방식. 이 프로젝트는 non-data router(`<BrowserRouter>` + `<Routes><Route>` JSX 패턴)이고 `useMatches`는 `createBrowserRouter` 전용이라 사용 불가. 라우터 마이그레이션 비용 대비 가치 부족.
- **host 레벨 wrapping**: host가 remote의 `./Module`(remote-entry 컴포넌트)을 통째로 마운트하는 MF 구조라, host에서 wrapping하면 remote 전체가 unmount/remount됨(사이드바·진행 중 react-query·WS 핸들러까지 다 destroy). 페이지만 정확히 remount하기 구조적으로 불가능.
- **remote의 routes.tsx에 wrapper 적용**: `<RemountByQueryOutlet triggerKeys="preset" />` 같은 wrapper를 부모 path에 두는 방안. 동기화 책임(`triggerKeys`와 `handle.queryParams.key`)이 결국 작성자에게 남고, 추상화 한 겹만 추가됨. inner key 패턴 대비 이득 없음.

결론적으로 React 본체의 `key` 메커니즘이 가장 단순하고 명료해 표준 패턴으로 채택했습니다. 컴포넌트 작성자가 outer/inner 분할로 직접 처리합니다.

### 흔한 실수 / 안티패턴

#### selectorKey를 문자열로 직접 박음

```tsx
// ❌ 오타·휴먼에러 위험
selectorKey: 'fca:PresetSelectror',

// ✅ 상수에서 import (자동완성 + 타입체크)
selectorKey: SelectorKeys.PresetSelector,
```

#### 도메인 selector를 manager에 둠

`PresetSelector`처럼 도메인 데이터에 결합된 selector를 manager에 두면 manager가 fca의 도메인 hook을 import하게 되어 의존성이 거꾸로 흐릅니다. 도메인 selector는 항상 그 도메인을 가진 remote에 둡니다.

#### 본질이 다른 화면을 query 분기로 묶음

queryString 분기는 **두 화면이 본질적으로 같은 자원·같은 prop·같은 query 형태인데 필터/모드만 다른 경우**에만 정당합니다. 화면 구조·데이터 형태·로직이 본질적으로 다른데 query로 분기하면 컴포넌트가 점점 비대해지고 분기가 새는 곳마다 버그가 납니다. 그런 경우엔 **path를 분리**(`/aoe/config/basic`, `/aoe/config/advanced`)하는 게 정공법입니다.

## chromeless 화면 가이드

인증은 필요하지만 host의 Layout 셸(헤더·사이드바·패널)이 없는 화면 — 녹취 재생 팝업, 감청 팝업, 워크플로우 편집기 같은 **새창/standalone** 화면 — 을 추가하기 위한 패턴입니다. chromeless 여부를 remote가 routes.tsx에서 스스로 선언하고, host는 한 줄도 건드리지 않습니다.

### 왜 이 패턴인가

**문제**: "인증은 필요한데 Layout은 없는 화면"을 추가할 때마다 host의 `app.tsx`에 전용 prefix 라우트(`/aoe-workflow`, `/vel-player`, `/vel-eavesdrop` 등)를 선언해야 했습니다.

**잘못된 접근**:

- host prefix 라우트로 분기(`/vel-player/*` → Layout 없이 `<Vel/>` 마운트) → "Layout을 씌울지" 결정이 host의 URL prefix에 박혀, chromeless 화면이 늘수록 `app.tsx`가 prefix 라우트로 오염됩니다. remote가 "이 화면은 chrome 없음"을 스스로 선언할 수단이 없어 매번 host 수정이 필요합니다.

**올바른 접근**: chromeless 신호를 `@/shared-store`의 `useLayoutStore`에 두고(host·remote 공유), remote가 routes.tsx leaf를 `Chromeless` 래퍼로 감싸 선언합니다. host의 `Layout`이 그 신호를 구독해 chrome을 조건부로 제거합니다. **신규 chromeless 화면 추가 시 host는 무수정**입니다.

> 참고: route `handle: { chromeless: true }` + `useMatches()`로 같은 목적을 달성할 수 있으나, `useMatches`는 `createBrowserRouter`(데이터 라우터) 전용입니다. 이 프로젝트는 non-data router(`useRoutes`)라 데이터 라우터 이관 비용이 커서, 스토어 기반 선언 방식을 채택했습니다.

### 전체 구조

```
┌──────────── 코드 (개발자 작성) ────────────┐
│                                              │
│  apps/<remote>/src/app/routes.tsx            │
│   { path: 'workflow/:agentId',               │
│     element: <Chromeless>{pv(...)}</Chromeless> }
│         │ Chromeless 래퍼가 useChromeless() 호출
│         ▼                                    │
│  libs/shared-store  useLayoutStore.chromeless │
│   (persist 제외 — 화면 mount/unmount로 토글) │
│         │                                    │
└─────────┼────────────────────────────────────┘
          │ host Layout이 구독
          ▼
  chromeless=true → 헤더/사이드바/패널/펼치기 버튼 제거,
                    본문만 full-bleed (ConfigProvider+App은 유지)
```

진입은 새창(`window.open('/<remote>/...')`)이 일반적이며, 같은 탭 네비게이션(`navigate`)도 가능합니다. 어느 쪽이든 host `/<remote>` 경로를 거쳐 Layout을 통과해야 신호가 닿습니다.

### 새 chromeless 화면 추가 절차

#### Step 1: routes.tsx leaf를 Chromeless로 감싼다

```tsx
import Chromeless from '@/components/custom/Chromeless';

const WorkflowEdit = React.lazy(() => import('./pages/workflow/WorkflowEdit'));

// 최종 경로 /aoe/workflow/:agentId — host /aoe 아래라 Layout을 거친다. pv 소켓 유지.
{ path: 'workflow/:agentId', element: <Chromeless>{pv('workflow/:agentId', WorkflowEdit)}</Chromeless> },
```

pv 소켓을 쓰지 않는 leaf면 `<Chromeless><Page /></Chromeless>`로 감쌉니다. **host에 별도 prefix 라우트를 만들지 않습니다.**

> **예외 — 공개 라우트(`handle: { public: true }`) leaf는 래퍼를 두지 않습니다.** host `PublicRouteGate`가 public 트리 전체에 Chromeless를 강제하므로 중복입니다. 이 가이드의 래퍼 규칙은 **인증이 필요한(private) chromeless 화면**에 적용됩니다. 공개 라우트는 "라우팅(routes.tsx) 가이드 → 공개 라우트(handle.public)" 참조.

#### Step 2: 진입 경로 작성

```tsx
// 새창 — Layout 통과 경로(/<remote>/...). 창 크기·named window 옵션은 그대로 유지
window.open(`/aoe/workflow/${agentId}`, '_blank', 'noopener,noreferrer');
```

#### Step 3: 페이지 컴포넌트

페이지에서 `ConfigProvider`/`App`로 다시 감싸지 않습니다(Layout chromeless 분기가 제공). 전체화면이 필요하면 `w-screen h-screen` 등 자체 클래스로 처리합니다(Layout chromeless main은 padding·배경 없는 full-bleed).

### 왜 Chromeless 래퍼인가 — 깜빡임 차단

`useChromeless()`는 `useLayoutEffect`로 mount 시 `chromeless`를 켭니다. 그런데 chromeless 페이지는 보통 `React.lazy`라, **페이지가 lazy 로딩되는 동안 Layout이 chromeless=false 상태로 chrome을 먼저 그립니다**. 페이지가 mount된 뒤에야 신호가 켜지므로, 래퍼 없이 페이지 내부에서 `useChromeless`를 호출하면 로딩 구간 내내 chrome이 보이는 깜빡임이 생깁니다(lazy suspend 구간이라 `useLayoutEffect`로도 못 막음 — 페이지가 아직 mount 전).

`Chromeless` 래퍼는 이 문제를 구조로 해결합니다:

```tsx
// libs/shared-ui/src/components/custom/Chromeless.tsx
export default function Chromeless({ children }: { children: ReactNode }) {
  useChromeless();
  return <Suspense fallback={<FallbackSpinner useFullScreen />}>{children}</Suspense>;
}
```

래퍼는 **non-lazy**라 Layout과 같은 커밋에 mount되고, lazy children의 suspend를 **자체 Suspense로 가둡니다**. 따라서 래퍼는 멈추지 않고, `useChromeless`의 `useLayoutEffect`가 페인트 직전에 chrome을 제거합니다 — chrome이 그려지기 전에 사라지므로 깜빡임이 없습니다.

### Layout은 단일 트리 — 재마운트 차단

`Layout`에서 chromeless를 **별도 return(다른 JSX 트리)으로 분기하면 안 됩니다**:

```tsx
// ❌ Outlet의 부모 사슬이 달라져 chromeless 토글 시 페이지가 언마운트+재마운트됨
if (chromeless) return <ConfigProvider><App><Outlet /></App></ConfigProvider>;
return <ConfigProvider><div><App><div><main><Outlet /></main></div></App></div></ConfigProvider>;
```

chromeless가 토글되는 순간(래퍼 mount 직후) Layout이 트리 A↔B로 바뀌고, `<Outlet/>`의 부모 사슬(`App>Outlet` vs `App>div>main>Outlet`)이 달라져 **페이지가 재마운트**됩니다. localStorage를 1회 읽고 즉시 삭제하는 페이지(예: 녹취 재생 player의 재생목록 전달)는 두 번째 mount에서 빈 값을 만나 `"재생할 녹취 정보가 없습니다"`로 깨집니다.

```tsx
// ✅ 단일 트리 유지 + chrome 조각만 조건부 렌더 → Outlet 위치 고정 → 재마운트 없음
return (
  <ConfigProvider ...>
    <div className="flex flex-col h-screen overflow-hidden">
      {!chromeCollapsed && !chromeless && (<><TopHeader /><SubHeader /></>)}
      <App className="flex-1 min-h-0 w-full overflow-hidden">
        <div className="flex w-full h-full">
          {!chromeless && pinned && <PanelAppBadgeStrip />}
          <main className={chromeless ? 'flex-1 min-w-0 h-full overflow-hidden' : 'flex-1 min-w-0 h-full p-4 overflow-y-auto bg-[#f3f3f9]'}>
            <Outlet />
          </main>
        </div>
      </App>
    </div>
    {!chromeless && <MenuPanel topOffset={topOffset} />}
  </ConfigProvider>
);
```

`{cond && <X/>}`는 falsy placeholder를 남겨 형제 위치가 보존되므로, chrome 조각을 조건부로 빼도 `<main>`·`<Outlet/>`은 같은 위치를 유지합니다.

### 흔한 실수 / 안티패턴

#### host에 전용 prefix 라우트 추가

```tsx
// ❌ 이 메커니즘이 없애려던 옛 방식 — host가 chromeless 화면마다 오염됨
<Route path="/aoe-workflow/:agentId" element={<AoeWorkflow />} />

// ✅ remote routes.tsx에서 선언, host 무수정
{ path: 'workflow/:agentId', element: <Chromeless>{pv('workflow/:agentId', WorkflowEdit)}</Chromeless> }
```

#### 페이지 내부에서 useChromeless 직접 호출

래퍼 없이 lazy 페이지 본문에서 `useChromeless()`를 호출하면 로딩 구간 깜빡임이 생깁니다. 항상 `Chromeless` 래퍼로 감싸세요.

#### 페이지에서 ConfigProvider/App 이중 래핑

Layout chromeless 분기가 antd 컨텍스트를 제공하므로, 페이지에서 다시 `ConfigProvider`/`App`로 감싸면 컨텍스트가 중첩됩니다. 감싸지 마세요.
