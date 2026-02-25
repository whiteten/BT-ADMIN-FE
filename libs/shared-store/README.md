# shared-store

> 작성일: 2025-02-25

[Zustand](https://zustand-demo.pmnd.rs/)를 사용한 **전역 상태 관리** 라이브러리입니다.

## Import

```typescript
import { useAuthStore, useMenuStore, useNavigationStore } from '@/shared-store';
```

## 구조

```
src/
├── lib/
│   ├── useAuthStore.ts         # 인증 상태
│   ├── useMenuStore.ts         # 메뉴 설정 상태
│   └── useNavigationStore.ts   # 네비게이션 상태
├── types/
└── index.ts
```

## 스토어

| 스토어               | 용도                                  |
| -------------------- | ------------------------------------- |
| `useAuthStore`       | 로그인 사용자 정보, 인증 토큰 등      |
| `useMenuStore`       | 사이드바 메뉴 설정 (Remote별 메뉴 통합) |
| `useNavigationStore` | 현재 네비게이션 경로, 브레드크럼 등    |

## 사용 예시

```typescript
import { useAuthStore } from '@/shared-store';

const MyComponent = () => {
  const { user, setUser } = useAuthStore();
  // ...
};
```

## 참고

- 이 라이브러리(`libs/shared-store`)는 Module Federation을 통해 Host-Remote 간 공유되는 **전역 상태**를 포함합니다.
- 앱 내부에서 props drilling 방지 등 로컬 목적의 스토어는 각 앱의 `features/<feature>/hooks/use<Feature>Store.ts`에 정의합니다.
