---
name: add-api
description: TanStack Query와 커스텀 훅 패턴으로 feature의 API 계층을 작성한다. apiClient 정의, Query Key Factory, 쿼리/뮤테이션 훅, 컴포넌트 사용법, 캐시 무효화까지 포함. 새 feature의 API·쿼리 훅 작성, apiClient 직접 호출 코드 리팩터링, 뮤테이션 후 캐시 무효화 설계 시 사용.
---

# add-api

이 저장소의 API 통합(TanStack Query + 커스텀 훅) 작성 절차. "API 훅 만들어줘", "쿼리 훅 추가", "TanStack Query 연결" 등의 요청 시 이 절차를 따른다.

## 핵심 규칙

1. **apiClient 직접 사용 금지**: 컴포넌트에서 `apiClient`를 직접 import 하지 말고 반드시 커스텀 훅을 경유한다.
2. **Query Key Factory**: 각 앱 `src/app/shared/queryKeys.ts`의 **`createAppQueryKeys`** 사용. 키에 `<앱 폴더명>:` 스코프가 자동 접두되어 앱 간 캐시 키 충돌(host 셸이 QueryClient를 공유)을 막는다. `@lukemorales/query-key-factory`의 `createQueryKeys`를 직접 import 하면 ESLint 에러(`no-restricted-imports`).
3. **훅 파라미터 규약**
   - 쿼리 훅: `{ params, queryOptions }` — 타입 `QueryHookWithParamsOptions<T>`
   - 뮤테이션 훅: `{ mutationOptions }` — 타입 `MutationHookOptions`
4. **훅 네이밍**: `useGet<Feature>s`(목록), `useGet<Feature>`(단건), `useCreate<Feature>`, `useUpdate<Feature>`, `useDelete<Feature>`.
5. **캐시 무효화**: 뮤테이션 훅 내부가 아니라, **호출하는 컴포넌트에서** `mutationOptions.onSuccess`로 `queryClient.invalidateQueries`를 처리한다.
6. **쿼리 키 하드코딩 금지**: `queryKey: ['users', id]`처럼 배열 리터럴을 직접 쓰지 말 것 — 앱 스코프 접두가 빠져 무효화가 빗나간다. 조회·무효화 모두 팩토리 산출물(`xxxQueryKeys.getUsers(params).queryKey`, 부분 매칭은 `xxxQueryKeys.getUsers._def`)만 사용한다.

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
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { userApi } from '../api/userApi';
import type { User, UserListItem } from '../types/user.types';

// 팩토리 패턴으로 쿼리 키 정의 — 실제 런타임 키는 '<앱 폴더명>:users'로 자동 스코프됨
export const userQueryKeys = createAppQueryKeys('users', {
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

## 4. 403 권한 없음(FORBIDDEN) 처리

백엔드는 각 API에 `@PreAuthorize`로 권한을 걸어 권한 없는 요청에 **403 + 응답 본문 `code: "FORBIDDEN"`**(메시지 "접근 권한이 없습니다")을 내려준다. 메뉴가 안 내려온 화면을 URL로 강제 접근해도, 그 안의 데이터 API가 403으로 막아 빈 화면만 노출된다(데이터 유출 아님).

> ⚠️ **403은 CSRF 토큰 만료와 의미가 겹친다.** `apiClient`는 403을 받으면 기본적으로 CSRF 토큰 재발급 후 재시도하는데, 권한 없음 403은 `code === 'FORBIDDEN'`으로 구분해 재발급을 건너뛰고 곧장 에러 핸들러로 보낸다. 이 분기는 `apiClient.ts` + `useApiErrorHandler.ts`에 이미 구현돼 있으니 **api 함수·훅에서 별도 처리할 필요 없다.**

### 기본 동작 (대부분 추가 작업 불필요)

전역 핸들러(`useApiErrorHandler`)가 403 FORBIDDEN을 요청 메서드 기준으로 자동 처리한다:

| 요청 | 기본 동작 | 의미 |
| --- | --- | --- |
| **GET** | `/forbidden` 페이지로 이동 | 페이지 진입 조회 거부 = 화면 자체를 못 봄 |
| **POST/PUT/DELETE 등** | 토스트로만 안내 | 액션 거부 = 화면은 유지 |

대부분은 이 기본값으로 충분하므로 **api 함수·훅에 아무것도 추가하지 않는다.**

### 특정 페이지에서 기본 동작을 뒤집을 때 — `redirectOnForbidden`

기본과 다르게 처리해야 하는 **특정 화면**에서만(POST로 body에 조건을 실어 "조회"하므로 GET처럼 이동시키고 싶다 / GET 부가조회라 이동 막고 토스트만 원한다) 사용처가 `requestConfig.redirectOnForbidden`(boolean)을 주입한다. `ApiRequestConfig`(`@/shared-util`)에 이미 정의돼 있다.

- **명시값 우선, 미지정 시 GET=이동·그 외=토스트.** `false`로 주면 GET이어도 토스트만, `true`로 주면 POST여도 이동.
- 값은 **항상 사용처(컴포넌트)가 결정**한다. api 함수·훅은 통로로 전달만 하고 값을 하드코딩하지 않는다.

쓸 화면이 없으면 통로도 뚫지 않는다. 필요한 그 한 쌍(api 함수 1곳 + 훅 1곳)만 인라인으로 통로를 추가한다(공용 타입 `QueryHookWithParamsOptions`는 건드리지 않는다):

```typescript
// ① api 함수 — 두 번째(get/delete) 또는 세 번째(post/put) 인자로 config를 받아 전달만 한다
import ApiClient, { type ApiResponse, type ApiRequestConfig } from '@/shared-util';

getUsers: async (params?: Record<string, unknown>, config?: ApiRequestConfig) => {
  const response = await apiClient.get<ApiResponse<{ items: UserListItem[] }>>('/users', { params, ...config });
  return response.data?.data?.items ?? [];
},

// ② 훅 — 공용 타입에 인라인 교차(&)로 requestConfig만 더해 받아 전달한다
import type { ApiRequestConfig } from '@/shared-util';

export const useGetUsers = ({
  params,
  queryOptions,
  requestConfig,
}: QueryHookWithParamsOptions<UserListItem[]> & { requestConfig?: ApiRequestConfig } = {}) => {
  return useQuery({
    queryKey: userQueryKeys.getUsers(params).queryKey,
    queryFn: () => userApi.getUsers(params, requestConfig),
    ...queryOptions,
  });
};

// ③ 사용처(특정 페이지) — 여기서만 값을 정한다
useGetUsers({ params, requestConfig: { redirectOnForbidden: false } });
```

## 체크리스트

- [ ] `api/<feature>Api.ts`에 함수들을 객체로 묶어 named export 했는가?
- [ ] 응답을 `ApiResponse<T>`로 감싸고 return부에서 `data`(목록은 `items`)를 추출했는가?
- [ ] `hooks/use<Feature>Queries.ts`에 앱 스코프 헬퍼 `createAppQueryKeys`(`../../../shared/queryKeys`)로 queryKeys 정의했는가? (`createQueryKeys` 직접 import는 ESLint 에러)
- [ ] 조회·무효화에 배열 리터럴 쿼리 키를 하드코딩한 곳은 없는가? (팩토리 `.queryKey`/`._def`만 사용)
- [ ] 쿼리 훅은 `{ params, queryOptions }`, 뮤테이션 훅은 `{ mutationOptions }` 시그니처인가?
- [ ] 훅 네이밍이 `useGet<Feature>s` / `useGet<Feature>` / `useCreate/Update/Delete<Feature>` 규약을 따르는가?
- [ ] 컴포넌트에서 `apiClient`를 직접 import 한 곳은 없는가?
- [ ] 뮤테이션 후 캐시 무효화가 컴포넌트의 `mutationOptions.onSuccess`에서 처리되는가?
- [ ] 403 권한 처리는 기본 동작(GET 이동 / 그 외 토스트)으로 충분한가? 기본을 뒤집어야 하는 특정 페이지에서만 `requestConfig.redirectOnForbidden` 통로를 뚫었는가(api 함수·훅에 값 하드코딩 금지)?
- [ ] 파일 수정 후 `npx eslint --fix <file-path>`를 실행했는가?
