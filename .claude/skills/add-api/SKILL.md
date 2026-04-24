---
name: add-api
description: TanStack Query와 커스텀 훅 패턴으로 feature의 API 계층을 작성한다. apiClient 정의, Query Key Factory, 쿼리/뮤테이션 훅, 컴포넌트 사용법, 캐시 무효화까지 포함. 새 feature의 API·쿼리 훅 작성, apiClient 직접 호출 코드 리팩터링, 뮤테이션 후 캐시 무효화 설계 시 사용.
---

# add-api

이 저장소의 API 통합(TanStack Query + 커스텀 훅) 작성 절차. "API 훅 만들어줘", "쿼리 훅 추가", "TanStack Query 연결" 등의 요청 시 이 절차를 따른다.

## 핵심 규칙

1. **apiClient 직접 사용 금지**: 컴포넌트에서 `apiClient`를 직접 import 하지 말고 반드시 커스텀 훅을 경유한다.
2. **Query Key Factory**: `@lukemorales/query-key-factory`의 `createQueryKeys` 사용.
3. **훅 파라미터 규약**
   - 쿼리 훅: `{ params, queryOptions }` — 타입 `QueryHookWithParamsOptions<T>`
   - 뮤테이션 훅: `{ mutationOptions }` — 타입 `MutationHookOptions`
4. **훅 네이밍**: `useGet<Feature>s`(목록), `useGet<Feature>`(단건), `useCreate<Feature>`, `useUpdate<Feature>`, `useDelete<Feature>`.
5. **캐시 무효화**: 뮤테이션 훅 내부가 아니라, **호출하는 컴포넌트에서** `mutationOptions.onSuccess`로 `queryClient.invalidateQueries`를 처리한다.

## 파일 배치

```
features/<feature>/
├── api/
│   └── <feature>Api.ts           # apiClient 호출을 객체로 묶어 named export
└── hooks/
    └── use<Feature>Queries.ts    # queryKeys + 쿼리/뮤테이션 훅 정의
```

## 1. API 함수 정의

`apps/<remote>/src/app/features/<feature>/api/<feature>Api.ts`:

```typescript
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

- 객체로 묶어 **named export** (`export const userApi = { ... }`).
- 함수명은 `getXxx`, `createXxx`, `updateXxx`, `deleteXxx`.

## 2. TanStack Query 훅 정의

`apps/<remote>/src/app/features/<feature>/hooks/use<Feature>Queries.ts`:

```typescript
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

// 쿼리 훅 — { params, queryOptions } 패턴
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

// 뮤테이션 훅 — { mutationOptions } 패턴
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

## 3. 컴포넌트 사용

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { useGetUsers, useCreateUser, userQueryKeys } from '../../features/user/hooks/useUserQueries';

export function UserList() {
  const queryClient = useQueryClient();
  const { data: users, isLoading, error } = useGetUsers({});
  const createUser = useCreateUser({
    mutationOptions: {
      onSuccess: () => {
        // 뮤테이션 후 캐시 무효화 — 컴포넌트에서 처리
        queryClient.invalidateQueries({ queryKey: userQueryKeys.getUsers().queryKey });
      },
    },
  });

  if (isLoading) return <FallbackSpinner />;
  if (error) return <div>Error: {error.message}</div>;

  return <UserTable data={users} />;
}
```

### ❌ 잘못된 예 — 컴포넌트가 apiClient 직접 호출

```typescript
const [users, setUsers] = useState([]);
useEffect(() => {
  apiClient.get('/users').then(setUsers);
}, []);
```

## 체크리스트

- [ ] `api/<feature>Api.ts`에 함수들을 객체로 묶어 named export 했는가?
- [ ] `hooks/use<Feature>Queries.ts`에 `createQueryKeys`로 queryKeys 정의했는가?
- [ ] 쿼리 훅은 `{ params, queryOptions }`, 뮤테이션 훅은 `{ mutationOptions }` 시그니처인가?
- [ ] 훅 네이밍이 `useGet<Feature>s` / `useGet<Feature>` / `useCreate/Update/Delete<Feature>` 규약을 따르는가?
- [ ] 컴포넌트에서 `apiClient`를 직접 import 한 곳은 없는가?
- [ ] 뮤테이션 후 캐시 무효화가 컴포넌트의 `mutationOptions.onSuccess`에서 처리되는가?
- [ ] 파일 수정 후 `npx eslint --fix <file-path>`를 실행했는가?
