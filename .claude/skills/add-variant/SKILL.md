---
name: add-variant
description: 정식 화면 변형(page variant) 작성 절차. 같은 path에서 테넌트별로 다른 컴포넌트를 렌더하는 본사 관리 변형 — variant 컴포넌트 작성, <Page>.variants.ts 선언, pageVariantManifest 등록, routes.tsx DynamicElement 교체까지. "변형 추가", "variant 만들어줘", 특정 화면의 테넌트별 분기 요청 시 사용. 특정 현장 전용 커스텀은 이 스킬이 아니라 custom remote(doc/CUSTOM_DEVELOPMENT_GUIDE.md, pnpm run create-custom) 대상.
---

# add-variant

이 저장소의 정식 화면 변형(page variant) 작성 절차. "변형 추가해줘", "A 테넌트용 화면 만들어줘" 등의 요청 시 이 절차를 따른다.

## 0. 판정 — variant가 맞는가

작성 전 반드시 판정한다:

| 상황 | 결론 |
| --- | --- |
| 여러 현장에서 공통으로 쓸 공식 변형, 본사 git으로 관리 | ✅ 이 스킬 (정식 variant) |
| 특정 현장 전용, 현장이 자체 형상관리 | ❌ custom remote — `pnpm run create-custom`, [CUSTOM_DEVELOPMENT_GUIDE.md](../../../doc/CUSTOM_DEVELOPMENT_GUIDE.md) |
| 기본 컴포넌트와 prop·context·query key가 본질적으로 다름 | ❌ variant 아님 — 별도 path로 분리 |
| queryString으로 같은 골격에 preset만 분기 | ❌ queryString 메뉴 분기 패턴 (AGENTS.md 참조) |

variant는 기본 컴포넌트와 **동일한 라우트 컨텍스트(useParams·쿼리스트링)·동일한 query key**를 사용해야 한다.

## 핵심 구조

```
apps/<remote>/src/app/pages/<route-group>/
├── BotList.tsx                       ← 기본 (손대지 않음)
├── BotList.variants.ts               ← 변형 선언 (페이지 옆 co-location)
└── variants/
    ├── BotListBankA.tsx              ← 단일 파일 variant
    └── BotDetailBankA/               ← 전용 sub 컴포넌트가 있으면 폴더로 승격
        ├── index.tsx                 ← route 진입점
        └── BotBasicInfo.tsx          ← 이 variant 전용 sub

apps/<remote>/src/app/features/router/pageVariantManifest.ts   ← aggregator (MF './PageVariantManifest' expose)
```

## Step 1. 변형 컴포넌트 작성

- 단일 파일: `pages/<route-group>/variants/<VariantName>.tsx`
- 전용 sub 컴포넌트(탭·드로어 등)가 필요하면 `variants/<VariantName>/` 폴더로 승격, 진입점은 `index.tsx`
  - 자기 폴더 sub는 형제 상대 경로로 import, 재사용하는 정식 sub는 원본 위치에서 그대로 import
  - variant 전용 코드를 정식 `features/<feature>/...`에 섞지 말 것 (제거 시 폴더 하나만 삭제되도록 격리)
- breadcrumb(`useBreadcrumbStore`)·레이아웃 규칙 등 페이지 표준 패턴은 기본 컴포넌트와 동일하게 따른다

## Step 2. `<Page>.variants.ts` 선언

페이지 옆에 co-location. 타입은 `PageVariantManifestConfig`(`@/components/custom/DynamicElement`).

```ts
// apps/fca/src/app/pages/bot-config/BotList.variants.ts
import { lazy } from 'react';
import type { PageVariantManifestConfig } from '@/components/custom/DynamicElement';

export const botListVariants: PageVariantManifestConfig = {
  appId: 'fca',
  path: 'bot-config/bot/list', // ⚠️ 기존 pv() 화면 키와 동일한 문자열 — 변경 금지
  defaultKey: 'default',
  components: {
    default: {
      label: '표준',
      component: lazy(() => import('./BotList')),
    },
    BotListBankA: {
      label: 'A 은행 전용',
      description: '대출 컬럼 + 컴플라이언스 뱃지',
      component: lazy(() => import('./variants/BotListBankA')),
    },
  },
};
```

규칙:

- **`path`는 routes.tsx의 `pv()`에 쓰던 화면 키 그대로** (동적 세그먼트 `:paramId` 포함). 키가 바뀌면 DB 저장 지정·현장 커스텀 연결이 끊어짐
- **`defaultKey: 'default'` + label `'표준'`** — pv 소켓(`createDefaultPageVariants`)과 동일한 의미 유지. default 컴포넌트는 기존 routes.tsx의 lazy 선언과 같은 파일을 가리킴
- variant 키는 PascalCase 컴포넌트명 (예: `BotListBankA`). DB `componentKey`로 저장되는 식별자이므로 한번 정하면 변경 금지
- `label`/`description`은 운영자 picker 카드에 노출되는 문구

## Step 3. aggregator 등록

`apps/<remote>/src/app/features/router/pageVariantManifest.ts`:

```ts
import type { PageVariantManifestConfig } from '@/components/custom/DynamicElement';
import { botListVariants } from '../../pages/bot-config/BotList.variants';

export const pageVariantManifest: Record<string, PageVariantManifestConfig> = {
  [botListVariants.path]: botListVariants,
};
```

- 빠뜨리면 picker에 카드가 노출되지 않음 (흔한 실수)
- 이미 등록된 path에 변형만 추가하는 경우 이 단계 생략

## Step 4. routes.tsx 소켓 교체

해당 path가 처음 정식 변형을 갖게 될 때 한 줄만 교체:

```tsx
// Before — 기본 소켓
{ path: 'list', element: pv('bot-config/bot/list', BotList) },

// After — variants config 직접 전달
import DynamicElement from '@/components/custom/DynamicElement';
import { botListVariants } from './pages/bot-config/BotList.variants';

{ path: 'list', element: <DynamicElement variants={botListVariants} /> },
```

- 기존 `const BotList = React.lazy(...)` 선언은 variants.ts가 자체 lazy를 가지므로 다른 라우트에서 안 쓰면 제거
- 이미 `<DynamicElement variants={...} />`로 전환된 path에 변형만 추가하면 이 단계 생략

## Step 5. 적용 확인

1. 빌드·serve 후 manager의 메뉴 관리(화면 지정) picker에 새 variant 카드 노출 확인
2. 운영자가 카드 선택 → DB menu row에 `componentKey: '<variant 키>'` 저장 → 해당 path 진입 시 변형 렌더
3. DB의 componentKey가 코드에서 사라져도 default로 자동 fallback (운영 안전)

## 체크리스트

- [ ] variant 판정 통과 (custom·별도 path·queryString 분기가 아닌가)
- [ ] variant가 기본과 동일한 prop·context·query key를 사용하는가
- [ ] `path`가 기존 pv 화면 키와 정확히 동일한가
- [ ] `defaultKey: 'default'` + 표준 컴포넌트 등록했는가
- [ ] aggregator(`pageVariantManifest.ts`)에 import + 등록했는가
- [ ] routes.tsx 소켓을 `<DynamicElement variants={...} />`로 교체했는가
- [ ] variant 전용 sub 컴포넌트를 variant 폴더 안에 격리했는가
