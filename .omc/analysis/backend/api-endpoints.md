# Backend API 분석

## 개요

BT-ADMIN-BE 백엔드는 두 가지 주요 서비스로 구성됩니다:
- **BT-ADMIN-SERVICE-FCA**: 봇 관리, NLU 모델 관리, 통계 API
- **BT-ADMIN-SERVICE-MANAGER**: 사용자, 역할, 권한, 메뉴 관리

---

## 1. FCA 서비스 API

### 1.1 봇 관리 API (ServiceBotController)
- **Base Path**: `/api/fca/bot`

| 메소드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/fca/bot` | 봇 서비스 생성 |
| GET | `/api/fca/bot/{serviceId}` | 봇 서비스 단건 조회 |
| GET | `/api/fca/bot` | 봇 서비스 목록 조회 |
| PUT | `/api/fca/bot/{serviceId}` | 봇 서비스 수정 |
| DELETE | `/api/fca/bot/{serviceId}` | 봇 서비스 삭제 |
| POST | `/api/fca/bot/{serviceId}/versions` | 서비스 버전 생성 |
| GET | `/api/fca/bot/{serviceId}/versions` | 서비스 버전 목록 조회 |
| PUT | `/api/fca/bot/{serviceId}/stt-tts` | STT/TTS 설정 수정 |
| PUT | `/api/fca/bot/{serviceId}/schedule` | 스케줄 설정 수정 |
| GET | `/api/fca/bot/{serviceId}/deploy-config` | 배포 설정 조회 |
| POST | `/api/fca/bot/{serviceId}/versions/{serviceVer}/publish` | 시나리오 배포 |
| GET | `/api/fca/bot/{serviceId}/slee-config` | 환경변수 목록 조회 |
| POST | `/api/fca/bot/{serviceId}/slee-config/{systemId}/apply` | 환경변수 적용 |

### 1.2 NLU 모델 관리 API (NluModelController)
- **Base Path**: `/api/fca/models/nlu`

| 메소드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/fca/models/nlu` | NLU 모델 생성 |
| GET | `/api/fca/models/nlu/{modelId}` | NLU 모델 조회 |
| GET | `/api/fca/models/nlu` | NLU 모델 목록 조회 |
| PUT | `/api/fca/models/nlu/{modelId}` | NLU 모델 수정 |
| DELETE | `/api/fca/models/nlu/{modelId}` | NLU 모델 삭제 |

### 1.3 의도(Intent) 관리 API
- **Base Path**: `/api/fca/models/nlu/{modelId}/intents`

| 메소드 | 경로 | 설명 |
|--------|------|------|
| POST | `.../{modelId}/intents` | Intent 생성 |
| GET | `.../{modelId}/intents` | Intent 목록 조회 |
| GET | `.../{modelId}/intents/{intentId}` | Intent 단건 조회 |
| PUT | `.../{modelId}/intents/{intentId}` | Intent 수정 |
| DELETE | `.../{modelId}/intents/{intentId}` | Intent 삭제 |
| POST | `.../{modelId}/intents/{intentId}/sentences` | 학습문장 생성 |
| GET | `.../{modelId}/intents/{intentId}/sentences` | 학습문장 목록 조회 |
| GET | `.../{modelId}/intents/export` | Intent 목록 엑셀 Export |
| POST | `.../{modelId}/intents/import` | Intent 목록 엑셀 Import |

### 1.4 개체(Entity) 관리 API
- **Base Path**: `/api/fca/models/nlu/{modelId}/entities`

| 메소드 | 경로 | 설명 |
|--------|------|------|
| GET | `.../{modelId}/entities` | 엔티티 목록 조회 |
| POST | `.../{modelId}/entities` | 엔티티 생성 |
| GET | `.../{modelId}/entities/{entityId}` | 엔티티 단건 조회 |
| PUT | `.../{modelId}/entities/{entityId}` | 엔티티 수정 |
| DELETE | `.../{modelId}/entities/{entityId}` | 엔티티 삭제 |
| GET | `.../{modelId}/entities/{entityId}/values` | 엔티티 값 목록 |

### 1.5 스냅샷 관리 API
- **Base Path**: `/api/fca/models/nlu/{modelId}/snapshots`

| 메소드 | 경로 | 설명 |
|--------|------|------|
| GET | `.../{modelId}/snapshots` | 스냅샷 목록 조회 |
| POST | `.../{modelId}/snapshots` | 스냅샷 생성 |
| DELETE | `.../{modelId}/snapshots/{modelVersion}` | 스냅샷 삭제 |
| POST | `.../{modelId}/snapshots/{modelVersion}/restore` | 스냅샷 복원 |
| GET | `.../{modelId}/snapshots/{snapshotVersion}/compare/{compareVersion}` | 스냅샷 비교 |

### 1.6 평가 관리 API
- **Base Path**: `/api/fca/models/nlu/{modelId}/evaluations`

| 메소드 | 경로 | 설명 |
|--------|------|------|
| POST | `.../{modelId}/evaluations` | 평가셋 생성 |
| GET | `.../{modelId}/evaluations` | 평가셋 목록 조회 |
| GET | `.../{modelId}/evaluations/{evalId}` | 평가셋 단건 조회 |
| DELETE | `.../{modelId}/evaluations/{evalId}` | 평가셋 삭제 |
| GET | `.../{modelId}/evaluations/{evalId}/questions` | 평가문장 목록 |
| GET | `.../{modelId}/evaluations/{evalId}/results` | 평가결과 목록 |

### 1.7 AOE/FAQ 관리 API
- **Base Path**: `/api/fca/aoe`

| 메소드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/fca/aoe/agent` | AOE Agent 목록 조회 |
| POST | `/api/fca/aoe/basic` | AOE 연동 URL 설정 |
| GET | `/api/fca/aoe/basic` | AOE 연동 설정 조회 |
| GET | `/api/fca/aoe/faq/agent` | FAQ Agent 목록 조회 |
| POST | `/api/fca/aoe/faq/{aoeAgentId}` | FAQ 생성 |
| GET | `/api/fca/aoe/faq/{aoeAgentId}` | FAQ 목록 조회 |
| PUT | `/api/fca/aoe/faq/{aoeAgentId}/{faqId}` | FAQ 수정 |
| DELETE | `/api/fca/aoe/faq/{aoeAgentId}/{faqId}` | FAQ 삭제 |
| POST | `/api/fca/aoe/faq/agent/{aoeAgentId}/apply` | FAQ 적용 |

### 1.8 통계 API (StatisticsController)
- **Base Path**: `/api/fca/statistics`

| 메소드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/fca/statistics/bot-service` | 봇 서비스 통계 |
| GET | `/api/fca/statistics/bot-dialog` | 봇 대화 통계 |
| GET | `/api/fca/statistics/bot-slot` | 봇 슬롯 통계 |
| GET | `/api/fca/statistics/nlu-intent` | NLU 의도 통계 |
| GET | `/api/fca/statistics/nlu-entity` | NLU 개체 통계 |
| GET | `/api/fca/statistics/nlu-keyword` | NLU 키워드 통계 |

---

## 2. Manager 서비스 API

### 2.1 사용자 관리 API (UserController)
- **Base Path**: `/api/manager/users`

| 메소드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/manager/users` | 사용자 생성 |
| PUT | `/api/manager/users/{userId}` | 사용자 수정 |
| DELETE | `/api/manager/users/{userId}` | 사용자 삭제 |
| GET | `/api/manager/users/{userId}` | 사용자 단건 조회 |
| GET | `/api/manager/users` | 사용자 목록 조회 |
| GET | `/api/manager/users/search` | 사용자 검색 |
| PUT | `/api/manager/users/{userId}/password` | 비밀번호 변경 |
| PUT | `/api/manager/users/{userId}/reset-password` | 비밀번호 초기화 |

### 2.2 역할 관리 API (RoleController)
- **Base Path**: `/api/manager/roles`

| 메소드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/manager/roles` | 역할 생성 |
| PUT | `/api/manager/roles/{roleId}` | 역할 수정 |
| DELETE | `/api/manager/roles/{roleId}` | 역할 삭제 |
| GET | `/api/manager/roles/{roleId}` | 역할 단건 조회 |
| GET | `/api/manager/roles` | 역할 목록 조회 |

### 2.3 권한 관리 API (PermissionController)
- **Base Path**: `/api/manager/permissions`

| 메소드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/manager/permissions` | 메뉴별 권한 목록 |
| GET | `/api/manager/permissions/auths` | 권한 Flat 목록 |
| POST | `/api/manager/permissions` | 권한 생성 |
| DELETE | `/api/manager/permissions/{authId}` | 권한 삭제 |

### 2.4 계정 정책 API (AccountPolicyController)
- **Base Path**: `/api/manager`

| 메소드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/manager/account-policy` | 계정 정책 조회 |
| PUT | `/api/manager/account-policy` | 계정 정책 수정 |

### 2.5 작업 이력 API (WorkHistoryController)
- **Base Path**: `/api/manager/work-history`

| 메소드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/manager/work-history` | 작업이력 목록 조회 |
| GET | `/api/manager/work-history/{workId}` | 작업이력 상세 조회 |

### 2.6 로그인 감사 로그 API
- **Base Path**: `/api/manager/login-logs`

| 메소드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/manager/login-logs` | 로그인 이력 조회 |

---

## 3. 공통 응답 DTO

### ApiResponse<T>
```json
{
  "ok": true,
  "code": "OK",
  "message": "성공",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00+09:00",
  "requestId": "uuid"
}
```

### PagedResponse<T>
```json
{
  "items": [ ... ],
  "page": 0,
  "size": 20,
  "total": 100
}
```

---

## 4. 권한 코드

### FCA Service
| 권한 코드 | 설명 |
|----------|------|
| `fca:mgmt:bot:read` | 봇 관리 읽기 |
| `fca:mgmt:model:read` | 모델 관리 읽기 |
| `fca:cm:model:read` | 공용 모델 읽기 |
| `fca:cm:aoe-ext:read` | AOE 확장 읽기 |
| `fca:stats:service:read` | 서비스 통계 읽기 |
| `fca:stats:dialog:read` | 대화 통계 읽기 |
| `fca:stats:slot:read` | 슬롯 통계 읽기 |
| `fca:stats:intent:read` | 의도 통계 읽기 |
| `fca:stats:entity:read` | 개체 통계 읽기 |
| `fca:stats:keyword:read` | 키워드 통계 읽기 |

### Manager Service
| 권한 코드 | 설명 |
|----------|------|
| `manager:resource:user:read` | 사용자 관리 읽기 |
| `manager:resource:role:read` | 역할 관리 읽기 |
| `manager:resource:work-history:read` | 작업이력 읽기 |
