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
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { User, UserListItem, CreateUserDto } from '../types/user.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const userApi = {
  // 목록 조회 — ApiResponse<{ items: T[] }>로 감싸고 return부에서 items 추출
  getUsers: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiResponse<{ items: UserListItem[] }>>('/users', { params });
    return response.data?.data?.items ?? [];
  },
  // 단건 조회 — ApiResponse<T>로 감싸고 return부에서 data 추출
  getUser: async (id: string) => {
    const response = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
    return response.data?.data;
  },
  // 생성/수정/삭제 — 반환 본문을 쓰지 않으면 엔벨로프 제네릭 생략 가능
  createUser: (data: CreateUserDto) => apiClient.post('/users', data),
  updateUser: (id: string, data: Partial<User>) => apiClient.patch(`/users/${id}`, data),
  deleteUser: (id: string) => apiClient.delete(`/users/${id}`),
};
```

- 객체로 묶어 **named export** (`export const userApi = { ... }`).
- 함수명은 `getXxx`, `createXxx`, `updateXxx`, `deleteXxx`.

### 응답 타입 — 단일 엔벨로프 `ApiResponse<T>`

- 모든 BFF 응답은 HTTP 본문이 `{ data: T }` 한 겹으로 감싸여 온다. `@/shared-util`의 **단일 엔벨로프 타입 `ApiResponse<T>`** 로 받는다. axios 응답까지 합치면 실제 접근 경로는 `response.data.data`.
- `ApiResponse<T>`는 바깥 엔벨로프 한 겹만 보장한다. 안쪽 `T`의 형태는 엔드포인트마다 다르므로 **각 api 함수가 직접 명시**한다 — 목록은 `ApiResponse<{ items: T[] }>`, 단건은 `ApiResponse<T>`.
- 데이터 추출은 **api 함수의 return부에서 직접** 한다 — 목록 `return response.data?.data?.items ?? [];`, 단건 `return response.data?.data;`.
- `ListResponse`/`DetailResponse`/`StatListResponse` 같은 별도 응답 타입이나 `extractList`/`extractDetail` 같은 추출 유틸을 **새로 만들지 않는다**. 응답 규격은 `ApiResponse<T>` 하나로 통일한다.
- `Blob`/`ArrayBuffer` 등 엔벨로프로 감싸이지 않는 비-JSON 응답은 제네릭에 해당 타입을 그대로 지정한다.

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
- [ ] 응답을 `ApiResponse<T>`로 감싸고 return부에서 `data`(목록은 `items`)를 추출했는가?
- [ ] `hooks/use<Feature>Queries.ts`에 `createQueryKeys`로 queryKeys 정의했는가?
- [ ] 쿼리 훅은 `{ params, queryOptions }`, 뮤테이션 훅은 `{ mutationOptions }` 시그니처인가?
- [ ] 훅 네이밍이 `useGet<Feature>s` / `useGet<Feature>` / `useCreate/Update/Delete<Feature>` 규약을 따르는가?
- [ ] 컴포넌트에서 `apiClient`를 직접 import 한 곳은 없는가?
- [ ] 뮤테이션 후 캐시 무효화가 컴포넌트의 `mutationOptions.onSuccess`에서 처리되는가?
- [ ] 파일 수정 후 `npx eslint --fix <file-path>`를 실행했는가?
