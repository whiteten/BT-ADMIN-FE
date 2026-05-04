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

### 주의사항

- **절대 `npm install`이나 `yarn`을 사용하지 마세요.** 이 프로젝트는 pnpm 전용입니다. 다른 패키지 매니저를 사용하면 lock 파일이 꼬입니다.
- **`pnpm-lock.yaml`을 직접 수정하지 마세요.** 패키지를 추가/제거할 때는 `pnpm add` / `pnpm remove` 명령을 사용하세요.
- lock 파일에 충돌이 발생하면, `ag-grid-enterprise` 관련 패치 정보(`patchedDependencies`, `patch_hash`)가 유지되는지 반드시 확인하세요.

---

## 2. 프로젝트 구조 이해하기

### 전체 아키텍처

이 프로젝트는 **Nx 모노레포** + **Module Federation** 기반의 마이크로 프론트엔드입니다.

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

각 앱은 **기능(Feature) 단위**로 폴더를 나눕니다.

```
apps/fca/src/app/
├── pages/                   # 📄 페이지 컴포넌트 (라우트에 매핑)
│   ├── bot-config/
│   │   ├── BotList.tsx      # /fca/bot-config/bot/list
│   │   ├── BotCreate.tsx    # /fca/bot-config/bot/create
│   │   └── BotDetail.tsx    # /fca/bot-config/bot/:serviceId
│   └── dashboard/
│       └── BotDashboard.tsx
├── features/                # ⚙️ 기능별 로직
│   ├── bot-config/
│   │   ├── api/             # API 함수
│   │   ├── components/      # UI 컴포넌트 (Card, Toolbar, Drawer 등)
│   │   ├── constants/       # 상수 정의
│   │   ├── hooks/           # 커스텀 훅 (Query, Store)
│   │   ├── tabs/            # 상세 페이지 탭 컴포넌트
│   │   ├── types/           # 타입 정의
│   │   └── utils/           # 유틸리티 함수
│   └── dashboard/
├── routes.tsx               # 라우팅 설정
└── app.tsx                  # 앱 진입점
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

---

## 3. 새 기능 개발 체크리스트

새로운 기능을 개발할 때 아래 순서를 따르면 실수를 줄일 수 있습니다.

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
npx nx run-many --target=typecheck --all

# 또는 특정 앱만
npx nx typecheck <app-name>
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
└── entity.ts         # 엔티티 관련 타입
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
import { createQueryKeys } from '@lukemorales/query-key-factory';

export const userQueryKeys = createQueryKeys('users', {
  getUsers: (params?: Record<string, unknown>) => [params],
  getUser: (params?: Record<string, unknown>) => [params],
});
```

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
import { PageHeader } from '@/components/custom/PageHeader'; // 페이지 상단 헤더
import { FallbackSpinner } from '@/components/custom/FallbackSpinner'; // 로딩 스피너
import { NoData } from '@/components/custom/NoData'; // 데이터 없음 표시
import { NotFound } from '@/components/custom/NotFound'; // 404 페이지
import { PageTabs } from '@/components/custom/PageTabs'; // 탭 네비게이션
```

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
import { PageHeader } from '@/components/custom/PageHeader';
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
import { PageHeader } from '@/components/custom/PageHeader';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { NoData } from '@/components/custom/NoData';

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
| Query Key         | camelCase + QueryKeys          | `export const botQueryKeys = createQueryKeys(...)` |
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
```

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
npx nx typecheck <앱-이름>

# 8. 변경 파일 스테이징
git add <파일들>

# 9. 커밋 (반드시 pnpm commit 사용)
pnpm commit

# 10. 푸시
git push origin feat/add-user-search
```

### 자주 쓰는 개발 명령어

> **스크립트 우선 사용**: 빌드와 서빙은 `pnpm run build`, `pnpm run serve` 스크립트를 우선 사용하세요. 스크립트에는 대화형 앱 선택, 의존성 확인 등 추가 로직이 포함되어 있으며, 특정 앱만 실행하는 것도 스크립트 내에서 선택 가능합니다. Nx의 특정 옵션이 필요한 경우에만 `npx nx` 직접 명령을 사용하세요.
> **새 Remote 생성은 반드시 스크립트 사용**: `pnpm run create-remote`만 사용하세요. Module Federation 설정, 라우팅 등록 등 추가 로직이 포함되어 있어 수동 생성 시 정상 동작하지 않을 수 있습니다.

```bash
# 개발 서버 (우선 사용)
pnpm run serve              # 대화형으로 실행할 Remote 선택

# 빌드 (우선 사용)
pnpm run build              # 대화형으로 빌드할 앱 선택
npx nx build fca            # fca 앱만 빌드 (특정 앱만 필요할 때)

# 린트
npx nx lint fca             # fca 앱 린트
npx nx run-many --target=lint --all  # 전체 린트

# 타입 검사
npx nx typecheck fca        # fca 앱 타입 검사
npx nx run-many --target=typecheck --all  # 전체 타입 검사

# shadcn/ui 컴포넌트 추가
pnpm run shadcn:add button  # button 컴포넌트 추가
```

### 커밋 전 확인사항

- [ ] ESLint 오류 없음 (`npx eslint --fix <파일>`)
- [ ] TypeScript 오류 없음 (`npx nx typecheck <앱>`)
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

```typescript
// ❌ 이렇게 하면 요소들이 회색 배경 위에 둥둥 떠 보입니다
<div className="flex flex-col gap-4 w-full h-full">
  <PageHeader breadcrumb={breadcrumb} />
  <Select ... />
  <Input ... />
  <Button type="primary">추가</Button>
  <AgGridReact rowData={data} columnDefs={columnDefs} />
</div>
```

```typescript
// ✅ 툴바와 테이블이 각각 흰색 배경으로 감싸져 있어 깔끔합니다
<div className="flex flex-col gap-4 w-full h-full">
  <PageHeader breadcrumb={breadcrumb} />

  {/* 필터/액션 바 */}
  <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
    <div className="flex gap-2 w-full items-center">
      <Select ... />
      <Input ... />
    </div>
    <Button type="primary">추가</Button>
  </div>

  {/* 데이터 테이블 */}
  <div className="w-full h-full bg-white bt-shadow">
    <AgGridReact rowData={data} columnDefs={columnDefs} />
  </div>
</div>
```

### 목록 페이지의 기본 구조

프로젝트의 목록 페이지들은 대체로 아래 세 영역으로 구성됩니다:

| 영역             | 역할                            | 스타일                                       |
| ---------------- | ------------------------------- | -------------------------------------------- |
| **PageHeader**   | 브레드크럼 네비게이션           | 배경 없음 (투명)                             |
| **필터/액션 바** | 검색, 필터, 추가 버튼 등        | `bg-white bt-shadow`, 고정 높이 `h-[76px]`   |
| **콘텐츠**       | AG-Grid 테이블 또는 Card 그리드 | `bg-white bt-shadow` 또는 개별 Card 컴포넌트 |

> **왜 `bt-shadow`를 쓰나요?**
> 프로젝트 전역에 정의된 커스텀 box-shadow 클래스입니다. 흰색 배경과 함께 사용하면 콘텐츠 영역이 배경에서 살짝 떠오르는 효과를 주어 시각적 계층을 만들어 줍니다.

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
│   pageVariants.ts                            │
│         │ MF './PageVariants'로 expose       │
│         ▼                                    │
└─────────┼────────────────────────────────────┘
          │
          ├── (어드민) host가 메타만 추출 → usePageVariantsStore
          │    → 메뉴 관리 picker에서 카드 그리드로 표시
          │    → 운영자 선택 → DB의 menu row에 componentKey 저장
          │
          └── (사용자) routes.tsx의 <DynamicElement>가
              menuStore의 componentKey 보고 변형 렌더
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
import type { PageVariantConfig } from '@/components/custom/DynamicElement';

export const botListVariants: PageVariantConfig = {
  appId: 'fca',
  path: 'bot-config/bot/list',
  defaultKey: 'BotList',
  components: {
    BotList: {
      label: '기본 봇 목록',
      description: '표준 카드 그리드',
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

`apps/<remote>/src/app/features/router/pageVariants.ts`:

```ts
import { botListVariants } from '../../pages/bot-config/BotList.variants';
import type { PageVariantConfig } from '@/components/custom/DynamicElement';

export const pageVariants: Record<string, PageVariantConfig> = {
  [botListVariants.path]: botListVariants,
  // ...
};
```

이미 등록된 path에 변형만 추가하는 경우엔 Step 3은 생략(기존 entry 재사용).

#### Step 4: routes.tsx의 element를 DynamicElement로 전환

해당 path가 처음 변형을 갖는 거라면 routes.tsx에서 정적 element를 DynamicElement로 교체:

```tsx
// Before
{ path: 'list', element: <BotList /> },

// After
import { botListVariants } from './pages/bot-config/BotList.variants';
import DynamicElement from '@/components/custom/DynamicElement';

{ path: 'list', element: <DynamicElement variants={botListVariants} /> },
```

이미 DynamicElement를 사용 중이면 Step 4도 생략.

#### Step 5: 운영자가 어드민에서 적용

배포 후 운영자가 메뉴 관리 화면에서:

1. 해당 메뉴(예: "봇 목록")를 트리에서 선택
2. "화면파일 변경" Select에서 새 변형(`BotListBankA`) 선택
3. 저장 → DB의 menu row에 `componentKey: 'BotListBankA'` 기록
4. 다음 로그인부터 그 테넌트 사용자는 변형 컴포넌트를 보게 됨

### DynamicElement의 동작 원리

[libs/shared-ui/src/components/custom/DynamicElement.tsx](../libs/shared-ui/src/components/custom/DynamicElement.tsx):

```tsx
const DynamicElement = ({ variants }) => {
  // 1. menuStore에서 이 path의 componentKey 찾기
  const selectedKey = useMenuStore((s) => {
    const config = s.menuConfigs.find((c) => c.appId === variants.appId);
    return config ? findComponentKey(config.menus, variants.path) : undefined;
  });

  // 2. 키 유효성: 등록되지 않은 키면 defaultKey로 fallback
  const resolvedKey = selectedKey && variants.components[selectedKey] ? selectedKey : variants.defaultKey;

  // 3. lazy 컴포넌트 참조 + Suspense
  const Component = variants.components[resolvedKey].component;
  return (
    <Suspense fallback={<FallbackSpinner />}>
      <Component />
    </Suspense>
  );
};
```

- DB의 `componentKey`가 코드에서 사라진 경우 → 자동으로 default 컴포넌트로 fallback (운영 안전)
- variants 컴포넌트는 lazy chunk로 분리되어 진입 시점에만 다운로드

### Picker UI는 어떻게 알게 되는가

호스트의 `SharedInfoProvider` 부팅 시:

1. 각 remote의 `./PageVariants` aggregator를 dynamic import
2. `usePageVariantsLoader`가 component 함수 참조는 버리고 메타(label/description/key)만 추출
3. `usePageVariantsStore.variants`에 저장

메뉴 관리 폼은 store에서 변형 매니페스트를 읽어 picker 옵션을 그립니다. 호스트는 변형 컴포넌트 chunk를 직접 받지 않으므로 가벼움.

### 새 remote의 자동 등록

`pnpm run create-remote`로 신규 remote를 생성하면 다음이 자동 처리됩니다:

- `apps/<new-remote>/src/app/features/router/pageVariants.ts` 빈 aggregator 생성
- `module-federation.config.ts`에 `'./PageVariants'` expose 항목 포함
- 호스트의 `usePageVariantsLoader` `VARIANT_LOADERS` 맵에 신규 remote 자동 등록

따라서 신규 remote는 별도 작업 없이 variants 인프라가 즉시 동작합니다.

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

`pnpm run create-remote`로 신규 remote를 생성하면 다음이 자동 처리됩니다:

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

### 짚어둘 함정

같은 path를 여러 메뉴가 공유할 때 다음이 자동으로 처리되지 않습니다 — 메커니즘 위에서 별도로 보완해야 합니다:

#### 1. 메뉴 active 하이라이트 중복

[MenuItem.tsx의 isMenuActive](../apps/host/src/app/features/layout/components/MenuItem.tsx)가 pathname만 비교하므로, 같은 path를 가진 두 메뉴가 동시에 active로 표시됩니다. queryString 분기 메뉴를 도입한다면 path + search를 같이 비교하도록 보완 필요:

```ts
const isMenuActive = (menuPath: string, location: { pathname: string; search: string }, appId: string) => {
  const [menuPathname, menuSearch = ''] = menuPath.split('?');
  // pathname 비교 후 menuSearch가 있으면 currentParams에 menuParams가 부분 포함되는지 확인
  if (menuSearch) {
    const menuParams = new URLSearchParams(menuSearch);
    const currentParams = new URLSearchParams(location.search);
    return [...menuParams].every(([k, v]) => currentParams.get(k) === v);
  }
  return true;
};
```

#### 2. 컴포넌트 remount 안 됨

메뉴 A → 메뉴 B 클릭 시 React Router는 같은 element라 컴포넌트를 재사용합니다. form state·scroll position·진행 중이던 mutation이 그대로 남아 의도와 다른 동작을 합니다. 강제 remount:

```tsx
export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const presetId = searchParams.get('presetId') ?? '';
  return <DashboardInner key={presetId} presetId={presetId} />;
}
```

#### 3. TanStack Query key에 query 값 포함 필수

```ts
export const dashboardQueryKeys = createQueryKeys('dashboard', {
  config: (params: { presetId: string }) => ({
    queryKey: [params],  // presetId가 key에 들어감 → 메뉴 전환 시 자동 fetch
    queryFn: () => dashboardApi.getConfig(params),
  }),
});
```

안 하면 메뉴 전환 후에도 이전 데이터가 그대로 보입니다.

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
