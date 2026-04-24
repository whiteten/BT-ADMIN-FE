# CLAUDE.md

이 파일은 Claude Code(claude.ai/code)가 이 저장소의 코드를 작업할 때 참고하는 가이드입니다.

# 중요 지침

반드시 한국어로 답변할 것.
**프론트엔드 작업 경로 준수**: 모든 프론트엔드 관련 작업(소스 수정, 빌드, pnpm install 등)은 반드시 이 저장소 경로(**`C:\Users\user\git\BT-ADMIN-FE`**)에서 수행해야 합니다. 백엔드 저장소 하위의 폴더를 사용하지 마십시오.
문서 파일(*.md)이나 README 파일을 선제적으로 생성하지 말 것. 사용자가 명시적으로 요청한 경우에만 생성.
TypeScript 또는 JavaScript 파일을 수정한 후에는 반드시 `npx eslint --fix <file-path>`를 실행하여 코드 품질과 일관성을 보장할 것.
자동으로 커밋하지 말 것. 사용자가 명시적으로 요청한 경우에만 커밋.
이 프로젝트는 **React Compiler**를 사용합니다. 컴파일러가 자동으로 리렌더링을 최적화하므로, 명시적으로 필요한 경우가 아니면 `useMemo`나 `useCallback`을 사용하지 말 것.
`pnpm-lock.yaml`에는 `ag-grid-enterprise` 패치 정보(`patchedDependencies`, `patch_hash`)가 포함되어 있으므로, lock 파일 수정·충돌 해결 시 해당 내용이 제거되지 않도록 주의할 것. 패치가 누락되면 AG-Grid Enterprise 라이선스 관련 동작에 영향을 줄 수 있음. 또한 pnpm 메이저 버전이 다르면 lock 파일 포맷과 패치 해시가 달라질 수 있으므로, 필수 환경 요구사항에 명시된 pnpm 버전을 준수할 것.
커밋 메시지 작성 시 타이틀은 간결하게 작성하고, 반드시 본문(body)에 변경 사항의 상세 내용을 포함할 것. 타이틀만으로 커밋을 생성하지 말 것.
커밋 메시지 작성 전에 반드시 `git diff --staged`(또는 `git diff`)를 실행하여 변경된 소스를 직접 비교·확인한 후, 실제 변경 내용에 기반하여 커밋 메시지를 작성할 것. 변경 사항을 확인하지 않고 추측으로 커밋 메시지를 작성하지 말 것.

## 필수 환경 요구사항

아래 항목은 프로젝트 실행 전 **직접 설치**가 필요합니다:

| 항목        | 버전     |
| ----------- | -------- |
| **Node.js** | v22.17.0 |
| **pnpm**    | 10.29.2  |

> Nx, TypeScript, Webpack 등 나머지 도구는 `package.json`에 버전이 명시되어 있으며, `pnpm install` 시 자동 설치됩니다.

## 프로젝트 아키텍처

**Nx 모노레포**이며, **Module Federation**을 사용하여 마이크로 프론트엔드를 구축합니다. 워크스페이스 구성:

### 애플리케이션

- **Host App** (`apps/host`): Remote 앱들을 통합하는 메인 셸 애플리케이션
  - 로그인 페이지
  - 사이드바 내비게이션이 있는 메인 레이아웃
- **Remote Apps**:
  - `apps/manager`: 매니저 (사용자 관리, 대시보드)
  - `apps/fca`: ForCus AI (봇 관리 기능)

### 라이브러리

- **Shared UI** (`libs/shared-ui`): 재사용 가능한 React 컴포넌트
  - shadcn/ui 컴포넌트 (Badge, Button, Card, Dialog, Table 등)
  - 커스텀 컴포넌트 (AggridNoRowsOverlay, AggridRowDataSidebar, FallbackSpinner, Icons, NoData, NotFound, PageHeader, PageTabs 등)
- **Shared API** (`libs/shared-api`): 여러 앱에서 공통으로 사용하는 API 및 타입 (역할, 네비게이션, 북마크 등)
- **Shared Store** (`libs/shared-store`): Zustand를 사용한 상태 관리
- **Shared Util** (`libs/shared-util`): 유틸리티 함수 및 헬퍼

### Module Federation 구조

- 각 Remote 앱은 `module-federation.config.ts`를 통해 모듈을 노출
- Host 앱은 이 Remote들을 통합하고 라우팅
- 모든 앱은 일관성을 위해 동일한 라이브러리를 공유

## 개발 명령어

빌드와 개발 서버 실행은 프로젝트 스크립트(`pnpm run build`, `pnpm run serve`)를 우선 사용할 것. 스크립트에는 대화형 앱 선택, 의존성 확인 등 추가 로직이 포함되어 있으며, 특정 앱만 실행하는 것도 스크립트 내에서 선택 가능. Nx의 특정 옵션이 필요한 경우에만 `npx nx` 직접 명령을 사용.
새 Remote 생성 시 반드시 `pnpm run create-remote` 스크립트를 사용할 것. Module Federation 설정, 라우팅 등록 등 추가 로직이 포함되어 있어 수동 생성 시 정상 동작하지 않을 수 있음.

### 빌드

```bash
# 프로젝트 빌드 (대화형 선택) — 우선 사용
pnpm run build
# 실행: node scripts/build-selective.js
# 특정 앱 또는 전체 앱을 선택하여 빌드 가능

# 특정 프로젝트 직접 빌드
npx nx build <project-name>

# 여러 프로젝트 빌드
npx nx run-many --target=build --projects=host,manager
```

### 개발 서버

```bash
# Host 애플리케이션 시작 (모든 마이크로 프론트엔드 서빙) — 우선 사용
pnpm run serve
# 실행: node scripts/serve-host.js

# 특정 프로젝트 서빙
npx nx serve <project-name>

# 프로덕션 빌드 서빙
pnpm run serve:prod
# 실행: pnpm exec serve dist/apps/host -l 4200 -s
```

### 린팅 및 타입 검사

```bash
# 전체 프로젝트 린트
npx nx run-many --target=lint --all

# 전체 프로젝트 타입 검사
npx nx run-many --target=typecheck --all

# 특정 프로젝트 린트
npx nx lint <project-name>
```

### 테스트

```bash
# 전체 테스트 실행
npx nx run-many --target=test --all

# 특정 프로젝트 테스트
npx nx test <project-name>
```

### 컴포넌트 추가

```bash
# shared-ui 라이브러리에 shadcn/ui 컴포넌트 추가
pnpm run shadcn:add <component-name>
# 사용: cross-env TS_NODE_PROJECT=tsconfig.base.json npx shadcn@latest add
```

### 새 Remote 생성

```bash
# 새 마이크로 프론트엔드 생성 (반드시 스크립트 사용)
pnpm run create-remote
# 실행: node scripts/create-remote.js
# Module Federation 설정, 라우팅 등록 등 추가 로직 포함 — 수동 생성 시 정상 동작하지 않을 수 있음
```

## 기술 스택

### 핵심 기술

- **프레임워크**: React 19 with TypeScript 5.8
- **빌드 도구**: Webpack 5 with @module-federation/enhanced
- **모노레포**: Nx 21.3.5
- **패키지 관리자**: pnpm

### UI 및 스타일링

- **스타일링**: Tailwind CSS v4 with PostCSS
- **UI 컴포넌트**:
  - shadcn/ui with Radix UI primitives
  - Ant Design v6
  - AG-Grid Enterprise (데이터 테이블)
- **아이콘**: Lucide React
- **테마**: next-themes (다크 모드 지원)

### 상태 및 폼

- **상태 관리**: Zustand (`zustand`)
- **서버 상태**: TanStack Query (`@tanstack/react-query`)
- **폼 관리**: React Hook Form (`react-hook-form`) with Zod (`zod`) validation
- **라우팅**: React Router DOM 6.29 (`react-router-dom`)

### 유틸리티

- `clsx` & `tailwind-merge`: 클래스 이름 유틸리티
- `date-fns` & `dayjs`: 날짜 처리
- `lodash`: 유틸리티 함수

### 코드 품질 도구

- **테스트**: Jest with Testing Library
- **린팅**: ESLint 9 with TypeScript, React, Prettier 플러그인
- **포맷팅**: Prettier
- **Git Hooks**: Husky with lint-staged (스테이징된 파일에 ESLint 및 TypeScript 검사 자동 실행)
- **커밋 컨벤션**: Commitizen with cz-git, commitlint
- **TypeScript**: 엄격한 타입 검사 활성화

## API 통합 가이드라인

API 통합 시 반드시 **TanStack Query**와 커스텀 훅을 사용합니다. 컴포넌트에서 `apiClient`를 직접 호출하지 마세요.

### API 함수 정의 예시

```typescript
// apps/manager/src/app/features/user/api/userApi.ts
import { apiClient } from '@/shared-util';
import type { User, CreateUserDto } from '../types/user.types';

export const userApi = {
  getUsers: () => apiClient.get<User[]>('/users'),
  getUser: (id: string) => apiClient.get<User>(`/users/${id}`),
  createUser: (data: CreateUserDto) => apiClient.post<User>('/users', data),
  updateUser: (id: string, data: Partial<User>) => apiClient.patch<User>(`/users/${id}`, data),
  deleteUser: (id: string) => apiClient.delete(`/users/${id}`),
};
```

### TanStack Query 훅 예시

쿼리 키 관리에 `@lukemorales/query-key-factory`를 사용합니다:

```typescript
// apps/manager/src/app/features/user/hooks/useUserQueries.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { userApi } from '../api/userApi';
import type { User, UserListItem } from '../types/user.types';

// 팩토리 패턴으로 쿼리 키 정의
export const userQueryKeys = createQueryKeys('users', {
  getUsers: (params?: Record<string, unknown>) => [params],
  getUser: (params?: Record<string, unknown>) => [params],
});

// 쿼리 훅 - { params, queryOptions } 패턴 사용
export const useGetUsers = ({ params, queryOptions }: QueryHookWithParamsOptions<UserListItem[]> = {}) => {
  return useQuery({
    queryKey: userQueryKeys.getUsers(params).queryKey,
    queryFn: () => userApi.getUsers(params),
    ...queryOptions,
  });
};

export const useGetUser = ({ params, queryOptions }: QueryHookWithParamsOptions<User> = {}) => {
  return useQuery({
    queryKey: userQueryKeys.getUser(params).queryKey,
    queryFn: () => userApi.getUser(params),
    ...queryOptions,
  });
};

// 뮤테이션 훅 - { mutationOptions } 패턴 사용
export const useCreateUser = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: userApi.createUser,
    ...mutationOptions,
  });
};

export const useUpdateUser = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: userApi.updateUser,
    ...mutationOptions,
  });
};

export const useDeleteUser = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: userApi.deleteUser,
    ...mutationOptions,
  });
};
```

### 컴포넌트 사용 예시

```typescript
// apps/manager/src/app/pages/user/UserList.tsx
import { useQueryClient } from '@tanstack/react-query';
import { useGetUsers, useCreateUser, userQueryKeys } from '../../features/user/hooks/useUserQueries';

export function UserList() {
  const queryClient = useQueryClient();
  const { data: users, isLoading, error } = useGetUsers({});
  const createUser = useCreateUser({
    mutationOptions: {
      onSuccess: () => {
        // 뮤테이션 후 캐시 무효화
        queryClient.invalidateQueries({ queryKey: userQueryKeys.useGetUsers().queryKey });
      },
    },
  });

  // ❌ 잘못된 방법 - apiClient 직접 호출
  // const [users, setUsers] = useState([]);
  // useEffect(() => { apiClient.get('/users').then(setUsers); }, []);

  // ✅ 올바른 방법 - 커스텀 훅 사용
  if (isLoading) return <FallbackSpinner />;
  if (error) return <div>Error: {error.message}</div>;

  return <UserTable data={users} />;
}
```

### 핵심 규칙

1. **apiClient 직접 사용 금지**: 컴포넌트에서 `apiClient`를 직접 import하여 사용하지 말 것
2. **Query Key Factory**: `@lukemorales/query-key-factory`의 `createQueryKeys` 사용
3. **훅 파라미터**: 쿼리 훅은 `{ params, queryOptions }`, 뮤테이션 훅은 `{ mutationOptions }` 사용
4. **훅 네이밍**: `useGet<Feature>s` (목록), `useGet<Feature>` (단건), `useCreate<Feature>`, `useUpdate<Feature>`, `useDelete<Feature>`
5. **캐시 무효화**: 컴포넌트에서 `mutationOptions.onSuccess`를 통해 처리

## 커밋 가이드라인

이 프로젝트는 **commitizen** + cz-git을 사용합니다. 사람이 직접 커밋할 때는 `pnpm commit`(대화형)을 사용하세요.

**Claude가 커밋 메시지를 작성할 때**: [.claude/skills/commit/SKILL.md](.claude/skills/commit/SKILL.md) 스킬을 사용합니다. 카테고리(이모지) 전체 목록, scope 판정 규칙(remote 명칭 사용 / feature명 금지), 단계별 절차 등 상세 규칙은 모두 해당 스킬에 정리되어 있습니다.

## 파일 구조 컨벤션

### 애플리케이션

- `apps/*/src/app/` - 메인 애플리케이션 컴포넌트
- `apps/*/src/app/pages/` - 페이지 컴포넌트
- `apps/*/src/app/features/` - 기능별 로직 및 타입
- `apps/*/src/remote-entry.ts` - Module Federation 진입점
- `apps/*/module-federation.config.ts` - Module Federation 설정
- `apps/*/webpack.config.ts` - Webpack 설정

### 라이브러리

- `libs/shared-ui/src/components/shadcn/` - shadcn/ui 컴포넌트
- `libs/shared-ui/src/components/custom/` - 커스텀 재사용 컴포넌트
- `libs/shared-ui/src/lib/utils.ts` - UI 유틸리티 함수 (cn 등)
- `libs/shared-store/src/` - 전역 상태 관리
- `libs/shared-util/src/` - 공유 유틸리티 함수

### Feature 디렉토리 구조

각 feature 폴더는 아래 구조를 따릅니다. 모든 하위 폴더가 필수는 아니며, 필요한 것만 생성합니다:

```
features/<feature>/
├── api/
│   └── <feature>Api.ts           # API 함수 정의
├── components/
│   ├── <Feature>Card.tsx         # UI 컴포넌트
│   ├── <Feature>Toolbar.tsx      # 툴바 컴포넌트
│   ├── <Feature>Drawer.tsx       # 드로어 (추가/편집)
│   └── <Feature>Modal.tsx        # 모달
├── constants/
│   └── <feature>Constants.ts     # 상수 정의
├── hooks/
│   ├── use<Feature>Queries.ts    # TanStack Query 훅
│   └── use<Feature>Store.ts      # Zustand 스토어 (필요 시)
├── tabs/
│   └── <Feature>*.tsx            # 상세 페이지 탭 컴포넌트
├── types/
│   ├── index.ts                  # barrel export
│   ├── <domain>.ts               # 도메인별 타입 파일
│   └── ...
└── utils/
    └── <feature>Utils.ts         # 유틸리티 함수 (필요 시)
```

#### tabs/ 디렉토리

상세 페이지에서 탭으로 분리되는 컴포넌트는 `tabs/` 폴더에 배치합니다:

```typescript
// pages/bot-config/BotDetail.tsx
import BotBasicInfo from '../../features/bot-config/tabs/BotBasicInfo';
import BotEnvList from '../../features/bot-config/tabs/BotEnvList';
import BotVersionList from '../../features/bot-config/tabs/BotVersionList';

const tabItems = [
  { key: 'basic', label: '기본 정보', children: <BotBasicInfo /> },
  { key: 'env', label: '환경 설정', children: <BotEnvList /> },
  { key: 'version', label: '버전 관리', children: <BotVersionList /> },
];
```

## Import 경로 컨벤션

### 경로 해석 규칙

1. **같은 앱 내부**: **상대 경로** 사용

   ```typescript
   // apps/manager/src/app/pages/user/UserDetail.tsx 내부에서
   import { UserCard } from './UserCard';
   import { userApi } from '../../features/user/api';
   ```

2. **다른 앱 또는 라이브러리에서**: **`@` 별칭이 있는 절대 경로** 사용
   ```typescript
   // 공유 라이브러리를 import하는 모든 앱에서
   import { Button } from '@/components/ui/button';
   import { PageHeader } from '@/components/custom/PageHeader';
   ```

### 경로 별칭 (`tsconfig.base.json`에 정의)

라이브러리에서 import할 때는 항상 가장 짧은 별칭을 사용하세요:

| 전체 경로                                | 사용할 별칭             |
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

### 일반적인 Import 예시

```typescript
// UI 컴포넌트 (shadcn)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';

// 커스텀 컴포넌트
import { PageHeader } from '@/components/custom/PageHeader';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

// 유틸리티
import { cn } from '@/lib/utils';
import { Log } from '@/log';
import { toast } from '@/shared-util';

// 상태 관리
import { useAuthStore } from '@/shared-store';
```

## 코딩 컨벤션

### 컴포넌트 Export 패턴

- **컴포넌트**: `default export` 사용
- **API 함수, 유틸리티, 타입, 상수**: `named export` 사용

```typescript
// ✅ 컴포넌트 - default export
const BotCard = ({ bot }: BotCardProps) => {
  return <Card>{/* ... */}</Card>;
};
export default BotCard;

// ✅ forwardRef 컴포넌트 - default export + displayName
const EntityDrawer = forwardRef<EntityDrawerRef>((_, ref) => {
  // ...
});
EntityDrawer.displayName = 'EntityDrawer';
export default EntityDrawer;

// ✅ API 함수 - named export (객체 형태)
export const botApi = {
  getBots: async (params?: Record<string, unknown>) => { /* ... */ },
  getBot: async (params?: Record<string, unknown>) => { /* ... */ },
};

// ✅ 타입 - named export
export interface Bot { /* ... */ }
export type BotListItem = Omit<Bot, 'serviceDesc'>;

// ✅ 상수 - named export
export const CHART_COLORS = { /* ... */ } as const;
```

### 타입 정의 컨벤션

타입 파일은 `features/<feature>/types/` 아래에 도메인별로 분리하고, `index.ts`에서 barrel export합니다.

#### 파일 구조

```
features/<feature>/types/
├── index.ts          # barrel export (export * from './bot'; ...)
├── bot.ts            # 봇 관련 타입
├── model.ts          # 모델 관련 타입
├── intent.ts         # 인텐트 관련 타입
└── entity.ts         # 엔티티 관련 타입
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

// 상태 Union 타입
export type TrainStatus = 0 | 1 | 2 | 3;
export type TrainDiffStatus = 'ADDED' | 'MODIFIED' | 'DELETED';
```

### 이벤트 핸들러 패턴

컴포넌트 props에 콜백 함수를 전달할 때, 인라인 함수를 직접 작성하지 말고 `handle` 접두사로 시작하는 핸들러 함수를 선언한 뒤 전달합니다.

```typescript
// ❌ 인라인 함수를 직접 전달
<ChangePasswordDialog
  onClose={() => {
    setPendingLoginResponse(null);
    setPasswordPolicy(undefined);
    form.resetFields();
  }}
/>

// ✅ 핸들러로 추출 후 전달
const handleClose = () => {
  setPendingLoginResponse(null);
  setPasswordPolicy(undefined);
  form.resetFields();
};

<ChangePasswordDialog onClose={handleClose} />
```

### 모달/드로어 제어 패턴

모달과 드로어는 `forwardRef` + `useImperativeHandle`을 사용하여 부모에서 명령형으로 제어합니다.

#### Ref 인터페이스 정의

```typescript
// Ref 타입은 컴포넌트 파일 상단에 export
export interface EntityDrawerRef {
  open: (params: { modelId: string; entityData?: EntityListItem }) => void;
  close: () => void;
}
```

#### 컴포넌트 구현

```typescript
interface DrawerState {
  open: boolean;
  modelId: string;
  entityData?: EntityListItem; // 편집 모드 시 데이터
}

const EntityDrawer = forwardRef<EntityDrawerRef>((_, ref) => {
  const [state, setState] = useState<DrawerState>({ open: false, modelId: '' });
  const isEditMode = !!state.entityData;

  useImperativeHandle(ref, () => ({
    open: (params) => setState({ open: true, ...params }),
    close: () => setState((prev) => ({ ...prev, open: false })),
  }));

  return (
    <Drawer open={state.open} onClose={() => setState((prev) => ({ ...prev, open: false }))}>
      {/* ... */}
    </Drawer>
  );
});
EntityDrawer.displayName = 'EntityDrawer';
export default EntityDrawer;
```

#### 부모 컴포넌트에서 사용

```typescript
const drawerRef = useRef<EntityDrawerRef>(null);

// 열기
drawerRef.current?.open({ modelId: '123' });

// 편집 모드로 열기
drawerRef.current?.open({ modelId: '123', entityData: selectedEntity });

// JSX
<EntityDrawer ref={drawerRef} />
```

### AG-Grid 사용 패턴

#### 기본 설정

`useAggridOptions` 훅으로 공통 그리드 옵션을 적용합니다:

```typescript
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const { gridOptions, sideBar } = useAggridOptions();

<AgGridReact
  rowData={data}
  columnDefs={columnDefs}
  getRowId={(params) => params.data.id}
  gridOptions={{
    ...gridOptions,
    // 필요 시 추가 옵션 오버라이드
    editType: 'fullRow',
    readOnlyEdit: true,
    suppressClickEdit: true,
  }}
  loading={isLoading}
  onGridReady={handleGridReady}
/>
```

#### ColDef 정의

타입 파라미터로 row 데이터 타입을 지정합니다:

```typescript
const columnDefs: ColDef<IntentSentenceListItem>[] = [
  // 숨김 ID 컬럼
  { headerName: 'ID', field: 'sentenceId', hide: true },

  // 편집 가능 컬럼 (커스텀 에디터)
  {
    headerName: '문장',
    field: 'sentence',
    flex: 3,
    editable: true,
    cellEditor: InputTextCellEditor,
    cellEditorParams: { placeholder: '문장을 입력하세요.' },
  },

  // 커스텀 렌더러 컬럼
  {
    headerName: '학습상태',
    field: 'trainStatus',
    maxWidth: 120,
    cellStyle: { display: 'flex', alignItems: 'center' },
    cellRenderer: (params) => <TrainStatusBadge status={params.value} />,
  },

  // 액션 버튼 컬럼
  {
    headerName: '',
    colId: 'actions',
    maxWidth: 100,
    sortable: false,
    filter: false,
    suppressHeaderMenuButton: true,
    cellRenderer: ActionCellRenderer,
    cellRendererParams: { onSave: handleSave, onDelete: handleDelete },
  },
];
```

#### 커스텀 셀 에디터

```typescript
interface InputTextCellEditorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  cellStartedEdit?: boolean;
}

const InputTextCellEditor = ({ value = '', onValueChange, placeholder, cellStartedEdit }: InputTextCellEditorProps) => {
  const inputRef = useRef<InputRef>(null);

  useEffect(() => {
    if (cellStartedEdit) inputRef.current?.focus();
  }, [cellStartedEdit]);

  return <Input ref={inputRef} value={value} onChange={(e) => onValueChange(e.target.value)} placeholder={placeholder} />;
};
```

### Zustand 스토어 컨벤션

feature 단위의 로컬 상태는 `hooks/use<Feature>Store.ts`에 정의합니다.

#### 핵심 규칙

- 상태 값을 직접 변경하지 않고, 반드시 `set` 메서드를 통해 업데이트
- 각 상태 필드마다 대응하는 `set<Field>` 메서드를 정의
- 단일 인터페이스에 상태와 액션을 함께 정의
- 모든 스토어에 `devtools` 미들웨어를 적용하고, `set()` 호출 시 액션 이름을 지정

#### 기본 스토어

```typescript
// libs/shared-store/src/lib/useMenuStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface MenuStore {
  menuConfigs: MenuConfig[];
  isLoading: boolean;
  setMenuConfigs: (menuConfigs: MenuConfig[]) => void;
  setIsLoading: (isLoading: boolean) => void;
}

export const useMenuStore = create<MenuStore>()(
  devtools(
    (set) => ({
      menuConfigs: [],
      isLoading: false,
      setMenuConfigs: (menuConfigs) => set({ menuConfigs }, false, 'setMenuConfigs'),
      setIsLoading: (isLoading) => set({ isLoading }, false, 'setIsLoading'),
    }),
    { name: 'MenuStore' },
  ),
);
```

`set()` 인자 구조: `set(상태, replace, 액션이름)`

- **두 번째 인자 `false`**: 상태를 교체(replace)하지 않고 머지(merge) (기본 동작)
- **세 번째 인자**: Redux DevTools Action 탭에 표시될 이름 (생략하면 "anonymous"로 표시)

#### 영속 스토어 (localStorage / sessionStorage)

`localStorage`나 `sessionStorage`에 상태를 유지해야 할 경우, `zustand/middleware`의 `persist` + `createJSONStorage`를 사용합니다. `devtools`는 `persist`를 감싸는 형태로 적용합니다:

```typescript
// apps/host/src/app/features/auth/hooks/useRememberMeStore.ts
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

interface RememberMeData {
  userAccount: string;
  tenant: string;
  rememberMe: boolean;
}

interface RememberMeStore {
  data: RememberMeData;
  setRememberMeData: (data: Partial<RememberMeData>) => void;
  clearRememberMeData: () => void;
}

const initialData: RememberMeData = {
  userAccount: '',
  tenant: '',
  rememberMe: false,
};

export const useRememberMeStore = create<RememberMeStore>()(
  devtools(
    persist(
      (set) => ({
        data: initialData,
        setRememberMeData: (newData) =>
          set(
            (state) => ({
              data: { ...state.data, ...newData },
            }),
            false,
            'setRememberMeData',
          ),
        clearRememberMeData: () => set({ data: initialData }, false, 'clearRememberMeData'),
      }),
      {
        name: 'remember-me-storage', // 스토리지 키
        storage: createJSONStorage(() => localStorage), // 또는 sessionStorage
      },
    ),
    { name: 'RememberMeStore' },
  ),
);
```

영속 스토어 작성 시 포인트:

1. **`create<Store>()(devtools(persist(...)))`**: `devtools`가 `persist`를 감싸는 순서로 작성
2. **`initialData`를 별도 상수로 분리**: `clear` 시 초기값으로 리셋
3. **`Partial<Data>`로 부분 업데이트 지원**: 전체 데이터를 넘기지 않아도 됨
4. **`name` (persist)**: 스토리지에 저장되는 키 이름
5. **`name` (devtools)**: Redux DevTools에 표시되는 스토어 이름
6. **`storage`**: `createJSONStorage(() => localStorage)` 또는 `createJSONStorage(() => sessionStorage)`

### 유틸리티 사용 패턴

#### 로깅

```typescript
import { Log } from '@/log';

Log.debug('onFinish', values); // 디버그 로그
Log.warn('onFinishFailed', errorInfo); // 경고 로그
```

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

### 페이지 Lazy Loading 패턴

모든 페이지 컴포넌트는 `React.lazy`로 지연 로드합니다. 라우트 파일(`routes.tsx`)에서 import합니다:

```typescript
// apps/fca/src/app/routes.tsx
import { lazy } from 'react';

const BotList = lazy(() => import('./pages/bot-config/BotList'));
const BotCreate = lazy(() => import('./pages/bot-config/BotCreate'));
const BotDetail = lazy(() => import('./pages/bot-config/BotDetail'));
const ModelList = lazy(() => import('./pages/bot-config/ModelList'));
const BotDashboard = lazy(() => import('./pages/dashboard/BotDashboard'));

export const routes = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="main" replace /> },
      {
        path: 'bot-config/bot',
        children: [
          { path: 'list', element: <BotList /> },
          { path: 'create', element: <BotCreate /> },
          { path: ':serviceId', element: <BotDetail /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound homePath="/fca" /> },
];
```

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

### UI 레이아웃 규칙

레이아웃 배경(회색 계열) 위에 버튼, 입력 필드, 테이블 등의 UI 요소를 직접 배치하지 말 것. 배경과의 시각적 분리가 없으면 요소가 부유하는 느낌을 주어 완성도가 떨어집니다. 반드시 `bg-white bt-shadow` 컨테이너, `Card` 등으로 감싸 콘텐츠 영역을 명확히 구분할 것.

```typescript
// ❌ 레이아웃 배경 위에 UI 요소 직접 배치
<div className="flex flex-col gap-4 w-full h-full">
  <PageHeader breadcrumb={breadcrumb} />
  <Select ... />
  <Input ... />
  <Button type="primary">추가</Button>
  <AgGridReact rowData={data} columnDefs={columnDefs} />
</div>

// ✅ 툴바와 테이블을 각각 배경 컨테이너로 감싸서 영역 구분
<div className="flex flex-col gap-4 w-full h-full">
  <PageHeader breadcrumb={breadcrumb} />
  <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
    <div className="flex gap-2 w-full items-center">
      <Select ... />
      <Input ... />
    </div>
    <Button type="primary">추가</Button>
  </div>
  <div className="w-full h-full bg-white bt-shadow">
    <AgGridReact rowData={data} columnDefs={columnDefs} />
  </div>
</div>
```

### 데이터 추가/수정 폼 패턴

데이터를 추가하거나 수정하는 UI를 구성할 때는 **Ant Design Form** 활용을 권장합니다. `useState`로 필드를 개별 관리하기보다 `Form.useForm`으로 폼 상태를 통합 관리하는 방향을 지향합니다.

#### 기본 구조

```typescript
import { Form, Input, Select } from 'antd';
import type { FormProps } from 'antd';

const [form] = Form.useForm<MyFormValues>();

const onFinish: FormProps<MyFormValues>['onFinish'] = (values) => {
  createMutation.mutate(values);
};

const onFinishFailed: FormProps<MyFormValues>['onFinishFailed'] = (errorInfo) => {
  const firstError = errorInfo.errorFields?.[0]?.errors?.[0];
  toast.error(firstError ?? '입력 항목을 확인해주세요.');
};

<Form form={form} layout="vertical" onFinish={onFinish} onFinishFailed={onFinishFailed} initialValues={{ status: 'ACTIVE' }}>
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
</Form>
```

#### 수정 페이지/탭 — API 데이터로 폼 초기화

```typescript
const { data } = useGetBot({ params: { serviceId } });

useEffect(() => {
  if (!data) return;
  form.setFieldsValue({
    serviceName: data.serviceName,
    serviceDesc: data.serviceDesc,
  });
}, [data, form]);
```

#### Drawer에서의 폼 초기화/리셋

Drawer에서 폼을 사용할 때는 열릴 때 데이터를 세팅하고, 닫힐 때 리셋하는 흐름을 권장합니다:

```typescript
useEffect(() => {
  if (!open) return;
  if (initialData) {
    form.setFieldsValue({ category: initialData.category, value: initialData.value });
  }
  return () => form.resetFields();
}, [initialData, form, open]);
```

#### 권장 사항

1. **Form.useForm 활용**: `useState`로 필드를 개별 관리하기보다 폼 인스턴스로 통합 관리
2. **layout="vertical"**: 레이블이 입력 필드 위에 오는 수직 레이아웃 선호
3. **rules로 유효성 검사**: `required`, `min`, `max`, `pattern` 등 선언적으로 정의
4. **hasFeedback**: 유효성 검사 결과 아이콘(✓, ✕)을 필드에 표시하여 사용자 피드백 제공
5. **onFinishFailed**: 첫 번째 에러 메시지를 `toast.error`로 안내
6. **수정 시 초기화**: `form.setFieldsValue()`로 API 데이터를 폼에 세팅
7. **Drawer 닫힐 때**: `form.resetFields()`로 폼 상태 초기화
