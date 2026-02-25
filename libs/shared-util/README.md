# shared-util

> 작성일: 2025-02-25

모든 앱에서 공유하는 **유틸리티 함수** 라이브러리입니다.

## Import

```typescript
import { apiClient, toast } from '@/shared-util';
import { Log } from '@/log';
```

## 구조

```
src/
├── lib/
│   ├── apiClient.ts        # Axios 기반 API 클라이언트
│   ├── log.ts              # 로깅 유틸리티 (Log.debug, Log.warn 등)
│   ├── toast.ts            # 토스트 알림 (success, error, warning)
│   ├── util.ts             # 기타 유틸리티 함수
│   ├── validation.ts       # 유효성 검사 헬퍼
│   ├── webSocketClient.ts  # WebSocket 클라이언트
│   └── types/
│       ├── api.types.ts    # API 관련 타입
│       └── query.types.ts  # TanStack Query 훅 옵션 타입
└── index.ts
```

## 주요 모듈

### apiClient

HTTP 요청을 위한 Axios 기반 클라이언트입니다. 컴포넌트에서 직접 사용하지 않고, feature API 함수에서 사용합니다.

```typescript
// features/<feature>/api/<feature>Api.ts 에서 사용
import { apiClient } from '@/shared-util';

export const userApi = {
  getUsers: (params) => apiClient.get('/users', { params }),
  createUser: (data) => apiClient.post('/users', data),
};
```

### Log

환경별 로깅 유틸리티입니다.

```typescript
import { Log } from '@/log';

Log.debug('디버그 메시지', data);
Log.warn('경고 메시지', errorInfo);
```

### toast

토스트 알림 유틸리티입니다.

```typescript
import { toast } from '@/shared-util';

toast.success('저장되었습니다.');
toast.error('오류가 발생했습니다.');
toast.warning('주의가 필요합니다.');
```

### Query 타입

TanStack Query 커스텀 훅에서 사용하는 옵션 타입입니다.

```typescript
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
```
