# 프론트엔드 코드 스타일 비교 문서

> 이호재 (메인 개발자) vs 임상정/bingbang2 코드 스타일 비교

## 요약

| 항목 | 이호재 (메인 개발자) | 임상정/bingbang2 | 권장 |
|------|---------------------|------------------|------|
| Drawer/Modal 패턴 | forwardRef + useImperativeHandle | 직접 상태 관리 | 이호재 패턴 |
| MutationHookOptions 제네릭 | 생략 (타입 추론) | 명시적 선언 | 임상정 패턴 |
| Query Invalidation | 컴포넌트에서 직접 | Hook 내부 자동 | 프로젝트별 |
| Query Key 정의 | `[params]` 배열 | 명시적 키 이름 | 이호재 패턴 |
| API 파라미터 타입 | `Record<string, unknown>` | 구체적 타입 | 임상정 패턴 |
| JSDoc 주석 | 최소화 | 상세 (flow 문서화) | 임상정 패턴 |
| PagedResponse 정의 | 미정의 (필요시) | 로컬 정의 | 공통화 권장 |

---

## 1. Drawer/Modal 컴포넌트 패턴

### 이호재 패턴 (권장)
```tsx
// BotVersionDrawer.tsx
export interface BotVersionDrawerRef {
  open: (params: { serviceId: string; serviceVer?: string }) => void;
  close: () => void;
}

interface DrawerState {
  open: boolean;
  serviceId: string;
  serviceVer?: string;
}

const BotVersionDrawer = forwardRef<BotVersionDrawerRef>((_, ref) => {
  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    serviceId: '',
    serviceVer: undefined,
  });

  useImperativeHandle(ref, () => ({
    open: (params) => {
      setDrawerState({
        open: true,
        serviceId: params.serviceId,
        serviceVer: params.serviceVer,
      });
    },
    close: () => {
      setDrawerState((prev) => ({ ...prev, open: false }));
    },
  }));
  // ...
});

export default BotVersionDrawer;
```

### 임상정 패턴
Drawer/Modal 컴포넌트에서 forwardRef 패턴을 사용하지 않고 직접 props로 상태 관리하는 경향.

### 차이점 분석
- **이호재**: `forwardRef` + `useImperativeHandle`로 ref 기반 API 제공
- **임상정**: 별도 Drawer 컴포넌트 없이 페이지에서 직접 상태 관리

### 권장사항
이호재 패턴 사용. 이유:
1. 부모-자식 간 결합도 감소
2. Drawer/Modal 상태를 컴포넌트 내부로 캡슐화
3. 재사용성 향상
4. 일관된 API 제공 (`ref.open()`, `ref.close()`)

---

## 2. Query Hooks 패턴

### 2.1 MutationHookOptions 제네릭 타입

#### 이호재 패턴
```tsx
// useBotQueries.ts
export const useCreateBot = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: botApi.createBot,
    ...mutationOptions,
  });
};
```

#### 임상정 패턴 (권장 - CLAUDE.local.md 규칙)
```tsx
// useUserQueries.ts
export const useCreateUser = ({
  mutationOptions
}: MutationHookOptions<User, UserRequest> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys._def });
    },
    ...mutationOptions,
  });
};
```

#### 차이점 분석
- **이호재**: 제네릭 타입 생략 → `onSuccess` 콜백의 `response`가 `unknown` 타입
- **임상정**: `MutationHookOptions<ResponseType, RequestType>` 명시 → 타입 안전성 확보

#### 권장사항
임상정 패턴 사용 (CLAUDE.local.md 규칙).

---

### 2.2 Query Invalidation 위치

#### 이호재 패턴
```tsx
// BotVersionDrawer.tsx (컴포넌트 내부)
const { mutate: createBotVersion } = useCreateBotVersion({
  mutationOptions: {
    onSuccess: () => {
      toast.success('버전이 추가되었습니다.');
      queryClient.invalidateQueries({
        queryKey: botQueryKeys.getBotVersions({ serviceId }).queryKey
      });
      handleClose();
    },
  },
});
```

#### 임상정 패턴
```tsx
// useUserQueries.ts (훅 내부)
export const useCreateUser = ({ mutationOptions }: MutationHookOptions<User, UserRequest> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys._def });
    },
    ...mutationOptions,
  });
};
```

#### 차이점 분석
- **이호재**: 컴포넌트에서 `onSuccess` 시 명시적으로 invalidate
- **임상정**: 훅 내부에서 자동 invalidate 후, 사용자 콜백도 실행

#### 권장사항
프로젝트 상황에 따라 선택:
- 일관된 캐시 무효화가 필요하면 → 임상정 패턴
- 컴포넌트별 다른 동작이 필요하면 → 이호재 패턴

---

### 2.3 Query Key 정의

#### 이호재 패턴
```tsx
// useBotQueries.ts
export const botQueryKeys = createQueryKeys('bots', {
  getBots: (params?: Record<string, unknown>) => [params],
  getBot: (params?: Record<string, unknown>) => [params],
  getBotVersions: (params?: Record<string, unknown>) => [params],
});
```

#### 임상정 패턴
```tsx
// useUserQueries.ts
export const userQueryKeys = createQueryKeys('users', {
  getUsers: () => ['all'],
  searchUsers: (params?: Record<string, unknown>) => [params],
  getUser: (id?: number) => [id],
  getUserByUsername: (username?: string) => [username],
});
```

#### 차이점 분석
- **이호재**: 모든 키에 `params` 객체 사용
- **임상정**: 용도별로 다른 키 구조 (`['all']`, `[id]`, `[params]`)

#### 권장사항
이호재 패턴 사용. 이유:
1. 일관된 패턴
2. params 기반 캐시 관리 용이
3. 새 쿼리 추가 시 패턴 고민 불필요

---

## 3. API Layer 패턴

### 3.1 파라미터 타입 정의

#### 이호재 패턴
```tsx
// botApi.ts
export const botApi = {
  getBots: async (params?: Record<string, unknown>): Promise<BotListItem[]> => {
    const response = await apiClient.get<ListResponse<BotListItem>>('/bot-list', { params });
    return extractList(response);
  },
  updateBot: async ({ params, data }: {
    params: Record<string, unknown>;
    data: BotBasicInfoUpdateDatas
  }) => {
    const response = await apiClient.put('/bot-update', data, { params });
    return response;
  },
};
```

#### 임상정 패턴 (권장)
```tsx
// userApi.ts
export const userApi = {
  getUser: async (userId: number): Promise<User> => {
    const response = await apiClient.get<DetailResponse<User>>('/user-detail', {
      params: { userId }
    });
    return extractDetail(response);
  },
  updateUser: async ({ userId, data }: {
    userId: number;
    data: UserRequest
  }): Promise<User> => {
    const response = await apiClient.put<DetailResponse<User>>('/user-update', data, {
      params: { userId }
    });
    return extractDetail(response);
  },
};
```

#### 차이점 분석
- **이호재**: `Record<string, unknown>` 범용 타입 사용
- **임상정**: 구체적 파라미터 타입 (`userId: number`, `data: UserRequest`)

#### 권장사항
임상정 패턴 사용. 이유:
1. 타입 안전성
2. IDE 자동완성 지원
3. 컴파일 타임 오류 감지

---

### 3.2 JSDoc 문서화

#### 이호재 패턴
```tsx
// botApi.ts - 주석 최소화
export const botApi = {
  getBots: async (params?: Record<string, unknown>): Promise<BotListItem[]> => {
    // ...
  },
};
```

#### 임상정 패턴 (권장)
```tsx
// userApi.ts - 상세 문서화
/**
 * BFF Aggregation Flow를 통한 API 클라이언트
 * 모든 API는 반드시 BFF를 통해서만 호출 (bingbang2.md 규칙 참고)
 *
 * 등록된 flow:
 * - user-list: GET /api/manager/users
 * - user-detail: GET /api/manager/users/{userId}
 */
const apiClient = new ApiClient({ serviceURL: '/bff' });

export const userApi = {
  /**
   * 사용자 목록 조회 (전체 조회, 페이징 없음)
   * @flow user-list
   */
  getUsers: async (): Promise<User[]> => {
    // ...
  },
};
```

#### 차이점 분석
- **이호재**: 코드 자체가 문서
- **임상정**: JSDoc + @flow 태그로 BFF flow 명시

#### 권장사항
임상정 패턴 사용 (특히 BFF flow 문서화).

---

## 4. 컴포넌트 구조 패턴

### 4.1 List 페이지 구조

#### 공통 패턴 (이호재 & 임상정)
```tsx
export default function SomeList() {
  const { gridOptions } = useAggridOptions();
  const navigate = useNavigate();
  const modal = useModal();

  const [filterColumn, setFilterColumn] = useState('...');
  const [searchValue, setSearchValue] = useState('');

  const { data, isLoading } = useGetSomething();
  const { mutate: deleteSomething } = useDeleteSomething({
    mutationOptions: {
      onSuccess: () => {
        toast.success('삭제되었습니다.');
      },
    },
  });

  const columnDefs: ColDef<SomeType>[] = [...];

  const filteredList = useMemo(() => {
    if (!data) return [];
    if (!searchValue.trim()) return data;
    // 필터링 로직
  }, [data, filterColumn, searchValue]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader title="..." breadcrumb={...} />
      {/* Filter */}
      <div className="flex items-center justify-between...">
        <Select ... />
        <Input ... />
        <Button onClick={handleCreate}>추가</Button>
      </div>
      {/* Grid */}
      <AgGridReact ... />
    </div>
  );
}
```

### 차이점: Drawer ref 사용

#### 이호재 패턴
```tsx
// BotVersionList.tsx
const versionDrawerRef = useRef<BotVersionDrawerRef>(null);
const deployConfigDrawerRef = useRef<BotDeployConfigDrawerRef>(null);
const publishResultModalRef = useRef<BotVersionPublishResultModalRef>(null);

// 사용
versionDrawerRef.current?.open({ serviceId });

// JSX
<BotVersionDrawer ref={versionDrawerRef} />
<BotDeployConfigDrawer ref={deployConfigDrawerRef} />
<BotVersionPublishResultModal ref={publishResultModalRef} />
```

#### 임상정 패턴
```tsx
// UserList.tsx
// Drawer를 별도 컴포넌트로 분리하지 않음
// 또는 라우팅으로 처리 (navigate)

const handleEdit = (userId: number | undefined) => {
  if (userId) {
    navigate(`../${userId}`);
  }
};
```

#### 권장사항
이호재 패턴 사용 (Drawer ref 패턴).

---

### 4.2 모바일 대응

#### 임상정 패턴 (추가됨)
```tsx
// UserList.tsx
return (
  <div className="flex flex-col gap-4 w-full h-full">
    {/* Grid View - Desktop */}
    <div className="max-lg:hidden w-full h-full bg-white bt-shadow">
      <AgGridReact ... />
    </div>

    {/* Card View - Mobile */}
    <div className="lg:hidden w-full h-full overflow-y-auto">
      {isLoading ? (
        <FallbackSpinner />
      ) : filteredList.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 p-2">
          {filteredList.map((user) => (
            <UserInfoCard key={user.id} userInfo={user} ... />
          ))}
        </div>
      ) : (
        <NoData message="조회된 데이터가 없습니다." />
      )}
    </div>
  </div>
);
```

#### 이호재 패턴
모바일 대응 없음 (ag-Grid만 사용).

#### 권장사항
요구사항에 따라 선택. 모바일 지원 필요시 임상정 패턴.

---

## 5. Type 정의 패턴

### 5.1 PagedResponse 정의 위치

#### 이호재 패턴
필요시 타입 정의, 공통 타입 활용.

#### 임상정 패턴
```tsx
// useUserQueries.ts - 로컬 정의
interface PagedResponse<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}
```

#### 권장사항
공통 타입은 `@/shared-util`에 정의하고 import.

---

### 5.2 Response 타입 일관성

#### 이호재 패턴
```tsx
// botApi.ts
getBots: async (params?: Record<string, unknown>): Promise<BotListItem[]>
createBot: async (data: BotCreateDatas) => {
  const response = await apiClient.post('/bot-create', data);
  return response;  // 반환 타입 미명시
}
```

#### 임상정 패턴
```tsx
// userApi.ts
getUsers: async (): Promise<User[]>
createUser: async (data: UserRequest): Promise<User>  // 명시적 반환 타입
```

#### 권장사항
모든 API 함수에 반환 타입 명시 (임상정 패턴).

---

## 6. Import 및 Export 패턴

### 공통
```tsx
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
```

### 차이점: Query Key Export

#### 이호재 패턴
```tsx
export const botQueryKeys = createQueryKeys('bots', {...});
```

#### 임상정 패턴
```tsx
export const userQueryKeys = createQueryKeys('users', {...});
```

→ 동일 패턴

---

## 7. 정리: 통합 권장 스타일

### 필수 적용 사항

1. **Drawer/Modal**: forwardRef + useImperativeHandle 패턴 (이호재)
2. **MutationHookOptions**: 제네릭 타입 명시 (임상정 - CLAUDE.local.md 규칙)
3. **API 파라미터**: 구체적 타입 사용 (임상정)
4. **API 문서화**: JSDoc + @flow 태그 (임상정)
5. **반환 타입**: 모든 API 함수에 명시 (임상정)

### 선택적 적용 사항

1. **Query Invalidation**: 프로젝트 상황에 따라 선택
2. **모바일 대응**: 요구사항에 따라 선택

---

## 부록: 체크리스트

### 새 기능 개발 시 확인 사항

- [ ] Drawer/Modal은 forwardRef 패턴으로 구현했는가?
- [ ] MutationHookOptions에 제네릭 타입을 명시했는가?
- [ ] API 함수에 구체적 파라미터 타입을 사용했는가?
- [ ] API 함수에 JSDoc과 @flow 태그를 추가했는가?
- [ ] 모든 API 함수에 반환 타입을 명시했는가?
- [ ] Query Key는 `[params]` 패턴을 따르는가?
