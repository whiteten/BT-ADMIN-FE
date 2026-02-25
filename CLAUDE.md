# CLAUDE.md

이 파일은 Claude Code(claude.ai/code)가 이 저장소의 코드를 작업할 때 참고하는 가이드입니다.

# 중요 지침

반드시 한국어로 답변할 것.
문서 파일(\*.md)이나 README 파일을 선제적으로 생성하지 말 것. 사용자가 명시적으로 요청한 경우에만 생성.
TypeScript 또는 JavaScript 파일을 수정한 후에는 반드시 `npx eslint --fix <file-path>`를 실행하여 코드 품질과 일관성을 보장할 것.
자동으로 커밋하지 말 것. 사용자가 명시적으로 요청한 경우에만 커밋.
이 프로젝트는 **React Compiler**를 사용합니다. 컴파일러가 자동으로 리렌더링을 최적화하므로, 명시적으로 필요한 경우가 아니면 `useMemo`나 `useCallback`을 사용하지 말 것.

## 프로젝트 아키텍처

**Nx 모노레포**이며, **Module Federation**을 사용하여 마이크로 프론트엔드를 구축합니다. 워크스페이스 구성:

### 애플리케이션

- **Host App** (`apps/host`): 마이크로 프론트엔드를 소비하는 메인 셸 애플리케이션
  - 로그인 페이지
  - 사이드바 내비게이션이 있는 메인 레이아웃
- **Remote Apps**:
  - `apps/manager`: 매니저 (사용자 관리, 대시보드)
  - `apps/fca`: Focus AI (봇 관리 기능)

### 라이브러리

- **Shared UI** (`libs/shared-ui`): 재사용 가능한 React 컴포넌트
  - 47개의 shadcn/ui 컴포넌트 (Badge, Button, Card, Dialog, Table 등)
  - 커스텀 컴포넌트 (AggridNoRowsOverlay, AggridRowDataSidebar, FallbackSpinner, Icons, NoData, NotFound, PageHeader, PageTabs)
- **Shared Store** (`libs/shared-store`): Zustand를 사용한 상태 관리
- **Shared Util** (`libs/shared-util`): 유틸리티 함수 및 헬퍼

### Module Federation 구조

- 각 Remote 앱은 `module-federation.config.ts`를 통해 모듈을 노출
- Host 앱은 이 Remote들을 소비하고 라우팅
- 모든 앱은 일관성을 위해 동일한 라이브러리를 공유

## 개발 명령어

### 빌드

```bash
# 프로젝트 빌드 (대화형 선택)
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
# Host 애플리케이션 시작 (모든 마이크로 프론트엔드 서빙)
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
# 새 마이크로 프론트엔드 생성
pnpm run create-remote
# 실행: node scripts/create-remote.js
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

- **상태 관리**: Zustand
- **서버 상태**: TanStack Query (React Query)
- **폼 관리**: React Hook Form with Zod validation
- **라우팅**: React Router DOM 6.29

## API 통합 가이드라인

API 통합 시 반드시 **TanStack Query**와 커스텀 훅을 사용합니다. 컴포넌트에서 `apiClient`를 직접 호출하지 마세요.

### 파일 구조

```
apps/*/src/app/features/<feature>/
├── api/
│   └── <feature>Api.ts         # API 함수 정의
├── hooks/
│   └── use<Feature>Queries.ts  # TanStack Query 훅
└── types/
    └── <feature>.types.ts      # 타입 정의
```

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

### 개발 도구

- **테스트**: Jest with Testing Library
- **린팅**: ESLint 9 with TypeScript 지원
- **포맷팅**: Prettier
- **Git Hooks**: Husky with lint-staged
- **커밋 컨벤션**: Commitizen with cz-git

## 커밋 가이드라인

이 프로젝트는 일관된 커밋 메시지를 위해 **commitizen** + cz-git을 사용합니다. 항상 다음 명령어를 사용하세요:

```bash
pnpm commit
```

지원되는 커밋 타입: 🎉 init, ✨ feat, 📦️ chore, 💄 design, 🐛 fix, ✅ test, 🚀 deploy, 🔨 refactor, 🚚 rename, 📚 docs, 🔥 remove

### Scope 작성 규칙

- **단일 remote 작업**: scope에 해당 remote 명칭을 작성 (예: `fca`, `manager`, `host`)
- **여러 remote 작업**: scope를 비워둠

```bash
# 단일 remote 작업 예시
✨feat(fca): TTS 발화자 입력 유효성 검사 추가

# 여러 remote 작업 예시
✨feat: 공통 컴포넌트 스타일 수정
```

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

## 코드 품질

프로젝트는 다음을 통해 코드 품질을 강제합니다:

- **lint-staged**: 스테이징된 파일에 ESLint 및 TypeScript 검사 실행
- **Husky**: 자동 검사를 위한 pre-commit 훅
- **commitlint**: 일관된 커밋 메시지 형식 보장
- **TypeScript**: 엄격한 타입 검사 활성화
- **ESLint**: React, TypeScript, Prettier 플러그인으로 설정

## 주요 의존성

### UI 라이브러리

- `@radix-ui/*`: Radix UI 프리미티브 전체 세트
- `ag-grid-react`: 엔터프라이즈 기능이 포함된 데이터 그리드
- `antd`: Ant Design 컴포넌트 (v6)
- `lucide-react`: 아이콘 라이브러리
- `recharts`: 차트 라이브러리
- `echarts` & `echarts-for-react`: 차트 라이브러리
- `cmdk`: 커맨드 메뉴 컴포넌트
- `sonner`: 토스트 알림

### 유틸리티

- `clsx` & `tailwind-merge`: 클래스 이름 유틸리티
- `date-fns` & `dayjs`: 날짜 처리
- `lodash`: 유틸리티 함수
- `zod`: 스키마 유효성 검사
