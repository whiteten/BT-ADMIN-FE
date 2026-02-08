# FCA 앱 분석

## 1. 라우팅 구조

| 경로 | 컴포넌트 | 파일 위치 | 설명 |
|------|----------|-----------|------|
| `/` | `Navigate` | `apps/fca/src/app/routes.tsx:65` | `/main`으로 리다이렉트 |
| `/main` | `Main` | `apps/fca/src/app/pages/main/Main.tsx` | 메인 페이지 |
| `/bot-config/bot/list` | `BotList` | `apps/fca/src/app/pages/bot-config/BotList.tsx` | 봇 목록 |
| `/bot-config/bot/create` | `BotCreate` | `apps/fca/src/app/pages/bot-config/BotCreate.tsx` | 봇 생성 |
| `/bot-config/bot/:serviceId` | `BotDetail` | `apps/fca/src/app/pages/bot-config/BotDetail.tsx` | 봇 상세 (6탭) |
| `/bot-config/model/list` | `ModelList` | `apps/fca/src/app/pages/bot-config/ModelList.tsx` | 모델 목록 |
| `/bot-config/model/create` | `ModelCreate` | `apps/fca/src/app/pages/bot-config/ModelCreate.tsx` | 모델 생성 |
| `/bot-config/model/:modelId` | `ModelDetail` | `apps/fca/src/app/pages/bot-config/ModelDetail.tsx` | 모델 상세 (6탭) |
| `/bot-config/model/:modelId/intent/:intentId` | `IntentDetail` | `apps/fca/src/app/pages/bot-config/IntentDetail.tsx` | 의도 상세 (2탭) |
| `/bot-config/model/:modelId/entity/:entityId` | `EntityDetail` | `apps/fca/src/app/pages/bot-config/EntityDetail.tsx` | 개체 상세 (2탭) |
| `/bot-config/model/:modelId/evaluation/:evalId` | `EvaluationDetail` | `apps/fca/src/app/pages/bot-config/EvaluationDetail.tsx` | 평가 상세 (3탭) |
| `/global/model/list` | `ModelList` | `apps/fca/src/app/pages/bot-config/ModelList.tsx` | 공용 모델 목록 (isPublic=true) |
| `/global/model/create` | `ModelCreate` | `apps/fca/src/app/pages/bot-config/ModelCreate.tsx` | 공용 모델 생성 |
| `/global/model/:modelId` | `ModelDetail` | `apps/fca/src/app/pages/bot-config/ModelDetail.tsx` | 공용 모델 상세 |
| `/global/aoe/config` | `AoeConfig` | `apps/fca/src/app/pages/global/AoeConfig.tsx` | AOE 설정 (2탭) |
| `/global/aoe/faq/:agentId` | `FaqDetail` | `apps/fca/src/app/pages/global/FaqDetail.tsx` | FAQ 상세 (1탭) |
| `/statistics/call-bot/service` | `ServiceStatistics` | `apps/fca/src/app/pages/statistics/call-bot/ServiceStatistics.tsx` | 서비스 통계 |
| `/statistics/call-bot/dialog` | `DialogStatistics` | `apps/fca/src/app/pages/statistics/call-bot/DialogStatistics.tsx` | 대화 통계 |
| `/statistics/call-bot/slot` | `SlotStatistics` | `apps/fca/src/app/pages/statistics/call-bot/SlotStatistics.tsx` | 슬롯 통계 |
| `/statistics/nlu/intent` | `IntentStatistics` | `apps/fca/src/app/pages/statistics/nlu/IntentStatistics.tsx` | 의도 통계 |
| `/statistics/nlu/entity` | `EntityStatistics` | `apps/fca/src/app/pages/statistics/nlu/EntityStatistics.tsx` | 개체 통계 |
| `/statistics/nlu/keyword` | `KeywordStatistics` | `apps/fca/src/app/pages/statistics/nlu/KeywordStatistics.tsx` | 키워드 통계 |

---

## 2. 봇 관리 (Bot)

### 2.1 봇 목록 (BotList)
- **파일**: `apps/fca/src/app/pages/bot-config/BotList.tsx`
- **검색 조건**:
  | 필터 컬럼 | 설명 |
  |-----------|------|
  | `serviceName` | 봇 이름 |
  | `serviceVer` | 버전 |
  | `modelName` | NLU 모델 |
  | `tags` | 태그 |
- **UI 컴포넌트**: `BotCard` (카드 그리드 형태)
- **액션 버튼**: 추가 (봇 생성 페이지로 이동)
- **카드 액션**: 상세 보기, 삭제, 모델 상세 보기, 대화편집 (IFE 편집기)

### 2.2 봇 생성 (BotCreate)
- **파일**: `apps/fca/src/app/pages/bot-config/BotCreate.tsx`
- **폼 필드**:
  | 필드명 | 타입 | 필수 | 설명 |
  |--------|------|------|------|
  | `serviceName` | Input | O | 봇 이름 (영문, 한글, 숫자, 언더스코어, 공백만 허용) |
  | `serviceDesc` | TextArea | X | 봇 설명 |
  | `modelId` | Select | O | NLU 모델 선택 |
  | `confidence` | Slider (range) | O | 신뢰도 (0~100 범위) |
  | `tags` | Select (tags mode) | X | 태그 (Enter로 추가) |
  | `sttId` | Select | O | STT 선택 |
  | `ttsId` | Select | O | TTS 선택 |
  | `ttsSpeaker` | Input | X | TTS 화자 |
  | `ttsSpeed` | Number | O | TTS 속도 |
  | `ttsVolume` | Number | O | TTS 볼륨 |
  | `ttsPitch` | Number | O | TTS 피치 |

### 2.3 봇 상세 (BotDetail)
- **파일**: `apps/fca/src/app/pages/bot-config/BotDetail.tsx`
- **URL 파라미터**: `serviceId`
- **탭 구조**:
  | 탭 ID | 라벨 | 컴포넌트 | 파일 위치 |
  |-------|------|----------|-----------|
  | tab1 | 기본정보 | `BotBasicInfo` | `apps/fca/src/app/features/bot-config/tabs/BotBasicInfo.tsx` |
  | tab2 | 봇버전/배포 | `BotVersionList` | `apps/fca/src/app/features/bot-config/tabs/BotVersionList.tsx` |
  | tab3 | 스케쥴 | `BotSchedule` | `apps/fca/src/app/features/bot-config/tabs/BotSchedule.tsx` |
  | tab4 | STT&TTS | `BotVoice` | `apps/fca/src/app/features/bot-config/tabs/BotVoice.tsx` |
  | tab5 | 환경변수 | `BotEnvList` | `apps/fca/src/app/features/bot-config/tabs/BotEnvList.tsx` |
  | tab6 | AOE | `BotAoe` | `apps/fca/src/app/features/bot-config/tabs/BotAoe.tsx` |

#### 2.3.1 기본정보 탭 (BotBasicInfo)
- **필드**: serviceName(disabled), serviceVer(읽기전용), serviceDesc, modelId, confidence, tags
- **액션 버튼**: 저장, 삭제

#### 2.3.2 봇버전/배포 탭 (BotVersionList)
- **그리드 컬럼**: 버전, 버전명, 시나리오파일, 변경내용, 작업자, 작업일시, 삭제
- **검색 필터**: 버전, 버전명, 변경내용
- **액션 버튼**: 버전추가, 대화편집, 배포, 배포설정
- **Drawer/Modal**: BotVersionDrawer, BotDeployConfigDrawer, BotVersionPublishResultModal

---

## 3. 모델 관리 (Model)

### 3.1 모델 목록 (ModelList)
- **파일**: `apps/fca/src/app/pages/bot-config/ModelList.tsx`
- **검색 조건**: 모델 이름 (`modelName`)
- **UI 컴포넌트**: `ModelCard` (카드 그리드 형태)
- **액션 버튼**: 추가 (공용 모델에서는 숨김)

### 3.2 모델 생성 (ModelCreate)
- **파일**: `apps/fca/src/app/pages/bot-config/ModelCreate.tsx`
- **폼 필드**:
  | 필드명 | 타입 | 필수 | 설명 |
  |--------|------|------|------|
  | `modelName` | Input | O | 모델 이름 (공백 불가) |
  | `expansion1` | TextArea | X | 모델 설명 |

### 3.3 모델 상세 (ModelDetail)
- **파일**: `apps/fca/src/app/pages/bot-config/ModelDetail.tsx`
- **URL 파라미터**: `modelId`
- **툴바**: `ModelToolbar` (학습, 배포 등)
- **탭 구조**:
  | 탭 ID | 라벨 | 컴포넌트 | 파일 위치 |
  |-------|------|----------|-----------|
  | tab1 | 기본정보 | `ModelBasicInfo` | `apps/fca/src/app/features/bot-config/tabs/ModelBasicInfo.tsx` |
  | tab2 | 의도 | `ModelIntentList` | `apps/fca/src/app/features/bot-config/tabs/ModelIntentList.tsx` |
  | tab3 | 개체 | `ModelEntityList` | `apps/fca/src/app/features/bot-config/tabs/ModelEntityList.tsx` |
  | tab4 | 평가 | `ModelEvaluationList` | `apps/fca/src/app/features/bot-config/tabs/ModelEvaluationList.tsx` |
  | tab5 | 재학습 | `ModelRetrainList` | `apps/fca/src/app/features/bot-config/tabs/ModelRetrainList.tsx` |
  | tab6 | 스냅샷 | `ModelSnapshotList` | `apps/fca/src/app/features/bot-config/tabs/ModelSnapshotList.tsx` |

### 3.4 의도 상세 (IntentDetail)
- **파일**: `apps/fca/src/app/pages/bot-config/IntentDetail.tsx`
- **URL 파라미터**: `modelId`, `intentId`
- **탭 구조**: 기본정보, 의도문장

### 3.5 개체 상세 (EntityDetail)
- **파일**: `apps/fca/src/app/pages/bot-config/EntityDetail.tsx`
- **URL 파라미터**: `modelId`, `entityId`
- **탭 구조**: 기본정보, 유사어

### 3.6 평가 상세 (EvaluationDetail)
- **파일**: `apps/fca/src/app/pages/bot-config/EvaluationDetail.tsx`
- **URL 파라미터**: `modelId`, `evalId`
- **탭 구조**: 기본정보, 평가 문장, 평가 결과

---

## 4. 공용 기능 (Global)

### 4.1 AOE 설정 (AoeConfig)
- **파일**: `apps/fca/src/app/pages/global/AoeConfig.tsx`
- **탭 구조**: 기본정보 (AOE URL), FAQ (FAQ Agent 카드 목록)

### 4.2 FAQ 상세 (FaqDetail)
- **파일**: `apps/fca/src/app/pages/global/FaqDetail.tsx`
- **URL 파라미터**: `agentId`
- **그리드 컬럼**: 질의문, 답변, 상태, 수정일, 삭제
- **액션 버튼**: Import, Export, 추가, 적용

---

## 5. 통계 (Statistics)

### 5.1 서비스 통계 (ServiceStatistics)
- **파일**: `apps/fca/src/app/pages/statistics/call-bot/ServiceStatistics.tsx`
- **검색 조건**: 시간 단위, 날짜 범위, 봇서비스
- **그리드 컬럼**: 날짜, 봇서비스, 진입수, 완결수, 완결율, 상담연결수, 진입별 상담연결율, 완결별 상담연결율, 질의수

### 5.2~5.6 기타 통계
- 대화 통계, 슬롯 통계, 의도 통계, 개체 통계, 키워드 통계
- 모두 시간 단위 + 날짜 범위 + 필터 기반 검색
- 엑셀 다운로드 지원

---

## 6. API 훅 정리

### Bot API (useBotQueries.ts)
| 훅 이름 | BFF 엔드포인트 | 메소드 |
|---------|---------------|--------|
| `useGetBots` | `/bot-list` | GET |
| `useGetBot` | `/bot-detail` | GET |
| `useCreateBot` | `/bot-create` | POST |
| `useUpdateBot` | `/bot-update` | PUT |
| `useDeleteBot` | `/bot-delete` | DELETE |
| `useUpdateBotVoice` | `/bot-stt-tts-update` | PUT |
| `useUpdateBotSchedule` | `/bot-schedule-update` | PUT |
| `useGetBotVersions` | `/bot-version-list` | GET |
| `usePublishBotVersion` | `/bot-version-publish` | POST |

### Model API (useModelQueries.ts)
| 훅 이름 | BFF 엔드포인트 | 메소드 |
|---------|---------------|--------|
| `useGetModels` | `/model-list` | GET |
| `useGetModel` | `/model-detail` | GET |
| `useCreateModel` | `/model-create` | POST |
| `useUpdateModel` | `/model-update` | PUT |
| `useDeleteModel` | `/model-delete` | DELETE |
| `useTrainModel` | `/model-train` | POST |
| `useDeployModel` | `/model-deploy` | POST |

### Statistics API (useStatisticsQueries.ts)
| 훅 이름 | BFF 엔드포인트 | 메소드 |
|---------|---------------|--------|
| `useGetServiceStatList` | `/stat-bot-service` | GET |
| `useGetDialogStatList` | `/stat-bot-dialog` | GET |
| `useGetSlotStatList` | `/stat-bot-slot` | GET |
| `useGetIntentStatList` | `/stat-nlu-intent` | GET |
| `useGetEntityStatList` | `/stat-nlu-entity` | GET |
| `useGetKeywordStatList` | `/stat-nlu-keyword` | GET |

---

## 7. 메뉴 구조

```
FOCUS AI (fca)
├── 메인 (/main)
├── 봇 관리
│   ├── 봇 (/bot-config/bot/list)
│   └── 모델 (/bot-config/model/list)
├── 공용
│   ├── 공용모델 (/global/model/list)
│   └── AOE 확장 (/global/aoe/config)
└── 통계
    ├── 콜봇 통계
    │   ├── 서비스 통계 (/statistics/call-bot/service)
    │   ├── 대화 통계 (/statistics/call-bot/dialog)
    │   └── 슬롯 통계 (/statistics/call-bot/slot)
    └── NLU 통계
        ├── 의도 통계 (/statistics/nlu/intent)
        ├── 개체 통계 (/statistics/nlu/entity)
        └── 키워드 통계 (/statistics/nlu/keyword)
```
