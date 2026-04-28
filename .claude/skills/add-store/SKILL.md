---
name: add-store
description: Zustand 스토어 작성 패턴. devtools 미들웨어와 액션 네이밍, 필드별 setter 정의, 영속 스토어(persist + createJSONStorage for localStorage/sessionStorage) 구성. 새 feature 로컬 상태 스토어, 전역 스토어, 브라우저 스토리지에 유지되는 스토어 작성 시 사용.
---

# add-store

이 저장소의 Zustand 스토어 작성 절차. "스토어 만들어줘", "Zustand 상태 추가", "localStorage로 상태 유지" 등의 요청 시 이 절차를 따른다.

## 핵심 규칙

1. 상태 값은 직접 변경하지 말고 반드시 `set` 메서드 경유.
2. 각 상태 필드마다 **대응하는 `set<Field>` 메서드**를 정의.
3. 단일 인터페이스에 **상태 + 액션을 함께** 정의.
4. 모든 스토어에 **`devtools`** 미들웨어 적용.
5. `set()` 호출 시 세 번째 인자로 **액션 이름**을 지정해 Redux DevTools에서 식별 가능하게.
6. 영속 스토어는 `devtools(persist(...))` 순서로 감싼다.

## 파일 배치

- **Feature 로컬 상태**: `apps/<remote>/src/app/features/<feature>/hooks/use<Feature>Store.ts`
- **전역 공유 상태**: `libs/shared-store/src/lib/use<Name>Store.ts`

## 1. 기본 스토어

```typescript
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

### `set()` 인자 구조

`set(상태, replace, 액션이름)`

- **두 번째 인자 `false`**: 상태를 교체(replace)하지 않고 머지(merge). 기본 동작.
- **세 번째 인자**: Redux DevTools Action 탭에 표시될 이름. 생략 시 "anonymous"로 표시되므로 **반드시 지정**.

## 2. 영속 스토어 (localStorage / sessionStorage)

브라우저 스토리지에 상태를 유지해야 하면 `persist` + `createJSONStorage`를 사용한다. **`devtools`가 `persist`를 감싸는** 순서로 작성:

```typescript
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

### 영속 스토어 작성 포인트

1. `create<Store>()(devtools(persist(...)))` — 감싸는 순서 주의.
2. `initialData`를 별도 상수로 분리 → `clear` 시 초기값 리셋에 재사용.
3. 부분 업데이트를 지원하려면 setter 인자 타입을 `Partial<Data>`로.
4. `name` (persist): 스토리지 키.
5. `name` (devtools): Redux DevTools 표시 이름.
6. `storage`: `createJSONStorage(() => localStorage)` 또는 `sessionStorage`.

## 체크리스트

- [ ] 상태 필드마다 대응하는 `set<Field>` 메서드가 있는가?
- [ ] 상태 + 액션이 단일 인터페이스에 정의되어 있는가?
- [ ] `devtools` 미들웨어와 스토어 이름이 적용되어 있는가?
- [ ] 모든 `set()` 호출에 세 번째 인자로 액션 이름을 지정했는가?
- [ ] 영속 스토어라면 `devtools(persist(...))` 순서, `initialData` 분리, `createJSONStorage` 사용이 맞는가?
- [ ] 파일 수정 후 `npx eslint --fix <file-path>`를 실행했는가?
