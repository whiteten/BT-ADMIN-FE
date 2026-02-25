# shared-ui

> 작성일: 2025-02-25

모든 앱에서 공유하는 **UI 컴포넌트 라이브러리**입니다.

## 구조

```
src/
├── components/
│   ├── shadcn/       # shadcn/ui 컴포넌트 (Radix UI 기반)
│   └── custom/       # 프로젝트 전용 커스텀 컴포넌트
├── hooks/            # 공통 UI 훅
├── lib/
│   └── utils.ts      # 유틸리티 (cn 등)
├── assets/           # 이미지, JSON 리소스
└── styles/           # 공통 스타일
```

## shadcn/ui 컴포넌트

`@/components/ui/*` 경로로 import합니다.

```typescript
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
```

컴포넌트 추가:

```bash
pnpm run shadcn:add <component-name>
```

## 커스텀 컴포넌트

`@/components/custom/*` 경로로 import합니다. 주요 예시:

```typescript
import { PageHeader } from '@/components/custom/PageHeader';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { NoData } from '@/components/custom/NoData';
```

전체 목록은 `src/components/custom/` 디렉토리를 참고하세요.

## 훅

| 훅                  | 설명                              |
| ------------------- | --------------------------------- |
| `useAggridOptions`  | AG-Grid 공통 옵션 (gridOptions, sideBar) |
| `useModal`          | 확인/삭제/실행 모달 헬퍼          |
| `useMobile`         | 모바일 뷰포트 감지                |
