# shared-api

> 작성일: 2025-02-25

여러 앱에서 공통으로 사용하는 **API 함수 및 타입** 라이브러리입니다.

## Import

```typescript
import { sharedApi } from '@/shared-api';
import type { NaviMenu, RoleListItem } from '@/shared-api';
```

## 구조

```
src/
├── lib/
│   ├── shared-api.ts     # 공통 API 함수
│   └── types/
│       ├── favorite.type.ts  # 즐겨찾기 타입
│       ├── iam.types.ts      # IAM 타입 (역할 등)
│       ├── navi.types.ts     # 네비게이션 타입
│       └── index.ts
└── index.ts              # Barrel export
```

## 제공 API

`sharedApi`는 카테고리별로 API 함수와 `queryKeys`를 함께 제공합니다.

### role

| 함수 / 키 | 설명 |
| --- | --- |
| `sharedApi.role.getRoles(params)` | 역할 목록 조회 |
| `sharedApi.role.getRole(params)` | 역할 단건 조회 |
| `sharedApi.role.queryKeys` | `createQueryKeys('sharedApi:role', ...)` |

### common

| 함수 / 키 | 설명 |
| --- | --- |
| `sharedApi.common.getSession(params)` | 세션 조회 (health check) |
| `sharedApi.common.getNavigation(params)` | 네비게이션 데이터 조회 |
| `sharedApi.common.queryKeys` | `createQueryKeys('sharedApi:common', ...)` |

### favorite

| 함수 | 설명 |
| --- | --- |
| `sharedApi.favorite.createFavorite({ params, data })` | 즐겨찾기 생성 |
| `sharedApi.favorite.updateFavorite({ params, data })` | 즐겨찾기 수정 |
| `sharedApi.favorite.deleteFavorite(params)` | 즐겨찾기 삭제 |

## 사용 예시

각 카테고리의 `queryKeys`를 TanStack Query 훅에서 직접 사용합니다.

```typescript
import { useQuery } from '@tanstack/react-query';
import { sharedApi } from '@/shared-api';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import type { Role } from '@/shared-api';

export const useGetRoles = ({ params, queryOptions }: QueryHookWithParamsOptions<Role[]> = {}) => {
  return useQuery({
    queryKey: sharedApi.role.queryKeys.getRoles(params).queryKey,
    queryFn: () => sharedApi.role.getRoles(params),
    ...queryOptions,
  });
};
```
