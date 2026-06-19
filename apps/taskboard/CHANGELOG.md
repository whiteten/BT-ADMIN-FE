# apps/taskboard 변경 이력

> 이 문서는 누적 기록입니다. 사용자가 명시적으로 삭제를 요청하지 않는 한 기존 항목을 지우거나 요약하지 않고 새 항목을 아래에 추가(append)합니다.
> 형식: `## YYYY-MM-DD` 날짜 헤더 아래에 작업 항목을 bullet로 작성.

## 사용법

```markdown
## 2026-06-12

### 기능/변경 제목
- 무엇을 변경했는지
- 관련 파일: `src/app/pages/board/task-xxx.tsx`
- (필요 시) 남은 작업 / 확인 필요 사항
```

---

## 2026-06-17

### CTI WebSocket 다중 구독 일반화
- `useCtiqWebSocket.ts`: 단일 hashKey 구독 → `subscriptions: {hashKey, ids}[]` 배열을 한 연결로 동시 구독하도록 재작성(`CtiWsSubscription`, `CtiWsDataByHashKey` 신규 export, 기존 `CtiqQueueRecord`는 `CtiqRecord`로 이름 변경). 큐/그룹/상담사(상담사는 그룹별로 `IC:AGENT:{groupId}:{mediaType}` hashKey가 갈라짐)를 React Hook 규칙(동적 개수만큼 훅 호출 불가) 위반 없이 한 훅으로 처리하기 위함.
- `ctiRedisApi.ts`: `CtiAgentRow`에 `groupId` 필드 추가(BE `CtiAgentDto`엔 이미 있었으나 FE 타입에 누락돼 있었음) — 상담사 WS hashKey(`IC:AGENT:{groupId}:{mediaType}`) 합성에 필요.

### 전광판 "디스플레이(보기 인스턴스)" 분리 — 레이아웃(위젯 디자인) : 디스플레이(선택값) = 1:N
**배경**: BE와 동일(`BT-ADMIN-SERVICE-TASKBOARD/CHANGELOG.md` 참조). 상세 설계: `C:\Users\KTK\.claude\plans\lazy-forging-coral.md`.

- `taskboard.types.ts`: `TaskboardDisplaySelection`, `TaskboardDisplay`, `TaskboardDisplayDetail` 타입 추가
- `taskboardApi.ts` / `useTaskboardQueries.ts`: Display CRUD API 함수 5개 + 훅 5개(`useGetTaskboardDisplayList/Detail`, `useCreate/Update/DeleteTaskboardDisplay`) 추가 — 기존 layout/rollinggroup과 같은 파일에 같은 패턴으로 추가(별도 파일로 안 쪼갬, 기존 컨벤션 따름)
- `features/board/components/MultiSelectDropdown.tsx` 신규 — `TaskCreate.tsx`에 inline으로 있던 컴포넌트를 추출해 `TaskDisplayManage`/`TaskView` 설정 패널에서도 재사용
- `routes.tsx`: `task-view/:displayId`(URL param 추가 — 기존엔 `useLocation().state`로만 레이아웃을 전달받아 새로고침하면 화면이 깨졌음), `board/task-display`(`TaskDisplayManage`) 라우트 추가
- `TaskCreate.tsx`: `handleSave`에서 `selectedQueueIds/selectedGroupIds/selectedAgentIds/selectedMediaTypeIds`를 저장 `layoutJson`에서 제외(이제 Display가 따로 보관). 상단 멀티선택 바는 "미리보기 전용" 라벨 추가, 캔버스 미리보기에만 사용
- `TaskDisplayManage.tsx` 신규 — 레이아웃 선택 → 디스플레이(이름+큐/그룹/상담사/미디어타입) 생성/수정/삭제 화면
- `TaskList.tsx`: ▷ 버튼이 이제 레이아웃을 직접 미리보기(`LayoutViewModal`)하지 않고, 그 레이아웃에 속한 **디스플레이 선택 팝업**을 띄워 `/taskboard/board/task-view/:displayId`로 이동. `LayoutViewModal`/`ModalTableWidget`/`ModalChartWidget`/`ModalValueWidget`/`buildLiveTableRows`/`buildLiveChartData`(약 480줄, `TaskView.tsx`와 거의 동일한 중복 구현이었음) 삭제
- `TaskView.tsx`: `useLocation().state.layout` → `useParams<{displayId}>()` + `useGetTaskboardDisplayDetail`로 전면 전환. 톱니바퀴 아이콘 추가(`DisplaySettingsPanel`) — 화면에서 바로 큐/그룹/상담사/미디어타입 선택값을 수정하고 즉시 저장. 큐/그룹/상담사 실시간 데이터를 REST 5초 폴링에서 WS(다중 구독)로 전환. 상담사는 `agentRows`를 `groupId`별로 묶어 그룹별 hashKey로 분리 구독
- `RollingDisplay.tsx`: 새 WS 훅 시그니처에 맞춰 `LayoutScreen`/`RollingPlayer`의 큐 실시간 데이터 경로 수정(`wsQueues`→`ctiqWsData`), 미디어타입별 hashKey 분리 구독 반영. **TaskMgmt.tsx의 롤링그룹 기능은 이번에 Display 모델로 전환하지 않음** — 아래 "확인 필요" 참조

### 리뷰 중 발견해 수정한 버그
- `TaskDisplayManage.tsx`에서 디스플레이 생성 시 `tenantId`를 안 보내고 있었음. `TB_TK_TASKBOARD_DISPLAY.TENANT_ID`가 `NOT NULL`인데 BE가 빈 문자열로 기본값 처리해도 Oracle은 빈 문자열을 NULL로 취급해 INSERT가 실패했을 것 — `TaskCreate.tsx`와 동일하게 `useAuthStore`의 `userInfo.tenant`를 보내도록 수정.

### WS 컬럼 필터링 + 마스터 목록 5초 폴링 중단 (사용자 피드백 반영)
- **컬럼 필터링**: WS 구독에 `columns?: string[]` 추가(`CtiWsSubscription`). BE `CtiqWebSocketHandler`가 `columns` 지정 시 raw JSON에서 그 컬럼만 추려 전송(`BT-ADMIN-SERVICE-TASKBOARD/CHANGELOG.md` 참조). `TaskView.tsx`가 각 위젯(table-queue/table-group/table-agent + 큐 차트)이 실제 쓰는 컬럼만 모아 구독 — 예: 그룹 위젯에 groupId/RTS_READY/RTS_LOGIN만 등록했으면 그 컬럼만 옴(커스텀 컬럼 없는 자동추론 모드는 전체 컬럼 그대로 받아야 해서 그 경우만 미필터).
- **마스터 목록 폴링 중단**: `TaskView.tsx`/`RollingDisplay.tsx`의 `useGetCtiQueueList/AgentList/GroupList`가 기본 5초 자동갱신이었음 — 실시간 KPI는 이제 WS로 오므로 이 목록(이름/그룹핑용 정적 데이터)은 `refetchInterval: false`로 마운트 시 1회만 조회하도록 변경.
- 좌측 트리에서 드래그한 **범용 Redis 단일값 위젯**(`category: 'Redis'`)은 이번 변경과 무관 — 그 경로는 의도적으로 "해시 통째로 둘러보기" 용도라 컬럼 필터링도 WS 전환도 적용 안 됨. 30개 그룹을 한 화면에 집계하려면 이 위젯이 아니라 **table-group(상담그룹 현황표) + 디스플레이 선택**을 써야 함.

### 테이블 컬럼 편집 UI + 롤링 그룹 디스플레이 전환 (사용자 피드백 반영)
- **테이블 컬럼 편집 UI 추가**: `TaskCreate.tsx` 오른쪽 스타일 패널에 table-queue/table-group/table-agent 위젯 전용 컬럼 추가/삭제 UI 신설(`addWidgetTableColumn`/`removeWidgetTableColumn`). 여기서 입력한 필드명(예: `RTS_LOGIN`)이 그대로 WS 구독 `columns`로 쓰여 그 컬럼만 받아온다 — 이전엔 이 UI가 없어서 기본 컬럼(`name/agents/talk/rts_ready`)만 쓸 수 있었고, 커스텀 컬럼이 없으니 컬럼 필터링 자체가 항상 비활성화됐던 문제를 해결.
- **롤링 그룹(TaskMgmt.tsx)을 레이아웃이 아닌 디스플레이 단위로 전환**: `RollingGroup.layoutIds` → `displayIds`로 의미 변경(DB 컬럼명은 `LAYOUT_IDS` 그대로 유지, BE/FE 필드명만 정정). `GroupEditView`가 레이아웃 대신 디스플레이(레이아웃+선택값) 목록에서 고르도록 변경. `RollingDisplay.tsx`의 `RollingLayout`에 `displayId`/`selectionJson` 추가, `RollingPlayer`가 로테이션에 포함된 모든 디스플레이의 큐/그룹/상담사 선택값+위젯 컬럼을 합산해 WS(큐/그룹/상담사 전부) 구독 — 이전엔 큐만, 그것도 레이아웃에 더 이상 저장되지 않는 옛 임베디드 선택값을 읽고 있어 동작하지 않았음.

### WS 구독을 "캔버스에 실제로 쓰는 위젯이 있을 때만" 하도록 변경 (사용자 피드백 — 구독 메시지가 너무 큼)
- `TaskView.tsx`/`RollingDisplay.tsx`: 디스플레이에 큐/그룹/상담사가 선택돼 있어도, 그 레이아웃 캔버스에 `table-queue`/`chart-bar-queue`/`chart-line-trend`(큐), `table-group`/`chart-donut-group`(그룹), `table-agent`/`chart-pie-agent`(상담사) 위젯이 **하나도 없으면 그 종류는 WS 구독 자체를 생성하지 않음**(`needsQueue`/`needsGroup`/`needsAgent`). 이전엔 디스플레이 선택값만 보고 무조건 구독해서, 위젯이 없는 그룹/상담사까지 컬럼 필터 없이 전체 데이터를 끌어오고 있었음 — "그룹 138개를 구독했는데 컬럼이 하나도 안 걸러진다"는 증상의 실제 원인이 이거였음(table-group 위젯이 캔버스에 없었음).

### 확인 필요 / 후속 결정 필요
- **WS 구독 재전송 비효율**: 현재 5초마다 동일한 큰 subscriptions 배열(id 수백 개)을 통째로 재전송하는 구조라, 선택 큐/그룹/상담사 수가 많으면 매 전송이 큼. 서버가 세션별 구독을 기억하고 클라이언트가 매번 재전송하지 않아도 되도록(구독 1회 + 서버가 주기적으로 push) 바꾸는 게 다음 최적화로 고려해볼 만함 — 필요하면 별도로 진행.
- **TaskMgmt.tsx(롤링 그룹) 회귀 가능성**: `RollingPlayer`는 여전히 각 레이아웃의 `layoutJson`에 박혀있던 `selectedQueueIds`/`selectedMediaTypeIds`를 읽어 큐 실시간을 구성하는데, 이번 변경으로 `TaskCreate.tsx`가 더 이상 그 값을 `layoutJson`에 저장하지 않음. **앞으로 TaskCreate에서 새로 만들거나 다시 저장하는 레이아웃은 롤링 그룹에서 큐 실시간이 안 나오게 됨**(기존에 이미 저장된 레이아웃은 재저장 전까지는 영향 없음). 롤링 그룹도 Display 개념으로 옮길지, 별도 선택 UI를 둘지 결정 필요.
- **기존(이전에 만든) 레이아웃에는 Display가 하나도 없음**: `TaskList.tsx`의 ▷ 버튼이 이제 "등록된 디스플레이가 없습니다"만 보여줌. 기존 레이아웃을 실제로 띄우려면 `디스플레이 관리`에서 레이아웃별로 최소 1개씩 디스플레이를 직접 만들어야 함(자동 마이그레이션 없음).
- 상담사 위젯의 `AGENT_STATUS`/`SUM_ANSW_CNT` 등 WS 필드명은 다른 위젯(HealthBoardWidget) 코드에서 확인한 이름을 그대로 가져온 추정값 — 실제 운영 Redis 데이터로 확인 필요.
- V89 마이그레이션 + BFF 라우팅은 로컬 DB/BFF가 없어 직접 기동 테스트는 못 했음.

---

## 2026-06-16 (4)

### IC:GROUP 그룹별 Redis 집계 — 전용 API 신설 (group-values-batch)

**배경**: 기존 `getRedisHashFieldsBatch`는 해시 첫 번째 field의 JSON을 flat하게 펼친 "컬럼 구조 샘플"을 반환하는 용도였음. table-group 위젯의 그룹별 RTS 집계에는 compositeKey별 실제 값이 필요하여 별도 API 신설.

**FE**:
- `ctiRedisApi.ts`: `getRedisGroupValuesBatch(request: {hashKeys, compositeKeys, columns})` 추가
  - 반환: `{hashKey → {compositeKey → {column → value}}}`
- `TaskView.tsx`:
  - `groupRedisData` state 추가 (`Record<string, Record<string, Record<string, number>>>`)
  - `groupHashKeys`를 `uniqueHashKeys`에서 제거 (기존 캔버스/계산식 위젯 폴링과 분리)
  - `fetchGroupRedisData` + 5초 폴링 useEffect 추가
  - `buildLiveTableRows` 시그니처에 `groupRedisData` 파라미터 추가, 호출 시 전달
  - table-group default 블록: `?.[ck] ?? 0` → `?.[ck]?.[col.key.toUpperCase()] ?? 0` 수정
- `TaskList.tsx`, `RollingDisplay.tsx`: 동일 패턴 적용
- 관련 파일: `apps/taskboard/src/app/features/board/api/ctiRedisApi.ts`, `pages/board/TaskView.tsx`, `pages/board/TaskList.tsx`, `features/board/components/RollingDisplay.tsx`

**BE**: `apps/taskboard/CHANGELOG.md(BE)` 참조

---

## 2026-06-16 (3)

### 미디어타입 선택 추가 — IC:GROUP:{compositeKey}:{mediaType} Redis 키 지원
- `CtiMediaTypeRow` interface 추가 (`ctiRedisApi.ts`): mediaType(키 접미사), mediaAlias(표시명)
- `getCtiMediaTypeList` API 추가: BFF AGG flow `taskboard-redis-media-type` 호출 (TB_IC_MEDIA_USAGE 조회)
- `useGetCtiMediaTypeList` 훅 추가 (`useTaskboardQueries.ts`): staleTime 10분 (정적 마스터 데이터)
- `TaskCreate.tsx` 변경:
  - `savedMeta.selectedMediaTypeIds?: string[]` 추가 (레이아웃 JSON 저장/복원)
  - `selectedMediaTypeIds` state + `mediaTypeDropdownOpen` + `mediaTypeDropdownRef` 추가
  - 상단 선택 바에 미디어타입 MultiSelectDropdown 추가 (오렌지색, 상담사 우측)
  - 저장 메타에 `selectedMediaTypeIds` 포함
- `TaskView.tsx`, `TaskList.tsx`, `RollingDisplay.tsx(LayoutScreen)` 변경:
  - `parsedMeta.selectedMediaTypeIds` 추출
  - `mediaTypes` 계산: 선택 없으면 전체 미디어타입 사용
  - `groupHashKeys`: `IC:GROUP:${ck}:${mt}` 형태로 미디어타입별 키 생성
  - `buildLiveTableRows` `mediaTypes?` 파라미터 추가 → `rts_ready` 집계 시 `IC:GROUP:${ck}:${mt}` 키 사용
- `RollingDisplay.tsx(RollingPlayer)`: `useGetCtiMediaTypeList` + `allMediaTypes` + 현재 레이아웃 `selectedMediaTypeIds` 파싱 → LayoutScreen에 전달
- BE 쪽 변경: `BT-ADMIN-SERVICE-TASKBOARD/CHANGELOG.md` 참조

---

## 2026-06-16 (2)

### HTTP 414 수정 — getRedisHashFieldsBatch GET → POST 변환
- `ctiRedisApi.ts`: `apiTaskboard.get('/taskboard-redis-hashfields-batch', { params: { hashKeys: ... } })` → `apiTaskboard.post('/taskboard-redis-hashfields-batch', hashKeys)` (JSON 배열을 body로 전송)
- BE 쪽 변경: `BT-ADMIN-SERVICE-TASKBOARD/CHANGELOG.md` 참조

---

## 2026-06-16

### 상담그룹 — TB_CC_NODETENANTMASTER JOIN 기반 복합키(compositeKeys) + table-group RTS_READY 합산
- `CtiGroupRow` 인터페이스 변경 (`ctiRedisApi.ts`):
  - `nodeId` 제거 → `compositeKeys: string[]` 추가 (각 nodeId별 `IC:GROUP:{groupId10}{nodeId6}` 복합키 목록)
  - index signature를 `string | number | string[]`로 확장
- `table-group` 위젯 기본 컬럼에 `{ key: 'rts_ready', label: 'RTS준비' }` 추가 (`TaskCreate.tsx`)
- `groupItems.id` / `toggleAllGroups` 원복: groupId 단독 (멀티선택 드롭다운은 그룹 단위 표시)
- `buildLiveTableRows`에 `redisData?: RedisLiveData` 파라미터 추가, `rts_ready` 케이스 처리:
  - `(group.compositeKeys ?? []).reduce((sum, ck) => sum + Number(redisData?.[IC:GROUP:{ck}]?.RTS_READY ?? 0), 0)` 합산
  - 적용 파일: `TaskView.tsx`, `TaskList.tsx`, `features/board/components/RollingDisplay.tsx`
- Redis 배치 폴링 키 확장: 기존 위젯 키 + 그룹 노드 복합키(`IC:GROUP:*`) 포함
  - `groupHashKeys = groupRows.flatMap(g => compositeKeys.map(ck => IC:GROUP:{ck}))` → `uniqueHashKeys`에 합산
  - 동일 패턴 `TaskView.tsx`, `TaskList.tsx`, `RollingDisplay.tsx(LayoutScreen)` 적용
- BE 쪽 변경: `BT-ADMIN-SERVICE-TASKBOARD/CHANGELOG.md` 참조

---

## 2026-06-12

### 공지사항 위젯 공통화 + 실제 연동
- `features/board/components/AnnouncementWidget.tsx` 신규 생성: `isAnnouncementWidget()` 헬퍼 + `AnnouncementWidget` 컴포넌트를 TaskCreate(편집 캔버스)/TaskView(전체화면 뷰)/TaskList(미리보기 모달)/RollingDisplay(롤링 재생)에서 공통 사용하도록 추출
  - 기존에는 TaskCreate에만 로컬로 존재해서, 실제 전시 화면(TaskView/TaskList/RollingDisplay)에서는 공지 위젯이 빈 값/sampleValue로 표시되던 문제 수정
  - `widget.item.noticeId`(개별 공지 고정) / `widget.noticeKey`(공지 키 기준 서버 필터, `useGetNoticeListByKey` 사용) / 둘 다 없으면 전체 활성 공지 표시
- TaskCreate.tsx: 로컬 `AnnouncementWidget` 함수 제거, 공통 컴포넌트로 교체
- TaskView.tsx, TaskList.tsx, RollingDisplay.tsx: `renderWidget`에 `isAnnouncementWidget` 분기를 최우선으로 추가
- 관련 파일: `features/board/components/AnnouncementWidget.tsx`(신규), `pages/board/TaskCreate.tsx`, `pages/board/TaskView.tsx`, `pages/board/TaskList.tsx`, `features/board/components/RollingDisplay.tsx`

### 버그 수정 — TaskList 미리보기 모달의 Redis 집계 로직 불일치
- `TaskList.tsx`의 `ModalValueWidget.getRedisValue()`가 구식 단일 해시 조회만 지원하고 있어, `hashSiblingKeys` 기반 합계/최대/최소 집계(`TaskView.tsx`의 `ViewValueWidget.getRedisValue()`)와 결과가 달랐던 문제 수정
- `getRedisValue()`를 `ViewValueWidget`과 동일한 hashSiblingKeys 기반 집계 로직으로 재작성
- `LayoutViewModal`의 `uniqueHashKeys`를 `hashSiblingKeys` 포함하도록 변경하고, `fetchRedisData`를 `ctiRedisApi.getRedisHashFieldsBatch()` 1회 배치 호출로 변경 (기존: 위젯별 `getRedisHashFields` 개별 호출)
- 관련 파일: `pages/board/TaskList.tsx`

### 버그 수정 — RollingDisplay(롤링 재생)에 Redis 라이브 데이터 연동 누락
- `RollingDisplay.tsx`의 `RollingValueWidget`이 Redis 카테고리 위젯에 대해 라이브 데이터 조회 없이 정적 `sampleValue`만 표시하던 문제 수정
- `LayoutScreen`에 `redisData` state + `uniqueHashKeys`(hashSiblingKeys 포함) + `fetchRedisData`(배치 조회, 5초 폴링)를 `TaskView.tsx`의 `SingleLayoutView`와 동일하게 추가
- `RollingValueWidget`에 `redisData` prop을 추가하고 `getRedisValue()`를 hashSiblingKeys 기반 집계 로직으로 구현 (`ViewValueWidget.getRedisValue()`와 동일)
- 관련 파일: `features/board/components/RollingDisplay.tsx`

### 미사용 OAuth2 클라이언트 관련 타입 제거
- `taskboard.types.ts`에서 TASKBOARD와 무관한 OAuth2 클라이언트 관리 타입(`ClientBackendResponse`, `Client`, `ClientCreateRequest`, `ClientUpdateRequest`)과 `transformClientResponse`, `transformToBackendFormat`, 빈 `export class Taskboard {}` 제거 (apps/taskboard 내 미사용 확인 후 삭제)
- 관련 파일: `features/board/types/taskboard.types.ts`
- 참고: `useGetNoticeListByKey` 훅 및 BE `GET /taskboard-noticeList/{noticeKey}` 엔드포인트는 위 공지사항 위젯 공통화 작업에서 실제로 사용되므로 삭제하지 않음

### 버그 수정 — TaskCreate Redis Hash 탐색기 좌측 목록의 'sample' 항목 노출
- `RedisHashFieldItems`에서 만들어진 `displayItems`에 `jsonKey`가 `sample`(대소문자 무시)인 항목이 포함되어, 좌측 Redis 항목 목록에 실제 json key가 아닌 'sample' 항목이 빨간 점과 함께 노출되던 문제 수정
- `displayItems`를 빌드한 뒤 `jsonKey.trim().toLowerCase() !== 'sample'`로 필터링하여 실제 json key 항목만 드래그 목록에 노출되도록 변경
- 관련 파일: `pages/board/TaskCreate.tsx`

### 조사 — TaskList 전광판 실행 시 "flow not found: taskboard-redis-hashfields-batch" 오류
- BFF aggregation flow `taskboard-redis-hashfields-batch`는 BE 마이그레이션 `V85__add_redis_hash_fields_batch_flow.sql`에 이미 등록되어 있음 (코드 변경 불필요)
- `DatabaseAggregationFlowProvider`가 기동 시점에 DB(`TB_BT_CM_AGG_FLOW_MST/STEP`)에서 flow 목록을 캐시에 로드하므로, V85가 DB에 아직 적용되지 않았거나 적용 후 BFF 캐시가 갱신되지 않은 환경 문제로 추정
- 해결: MIGRATION 서비스 재기동(V85 적용) + BFF 재기동(또는 `POST /api/bff/management/flows/refresh` 호출)로 캐시 재로드 필요 — 코드/마이그레이션 추가 작업 없음

## 2026-06-15

### 버그 수정 — "텍스트만 보이기"(투명 배경) 위젯이 전광판 실행/미리보기/롤링에서 모자이크(블러+테두리)로 보임
- TaskView/TaskList/RollingDisplay의 위젯 컨테이너가 위젯의 `style`(bgColor/borderWidth/borderRadius/opacity/shadow 등)을 무시하고 항상 `rounded-lg shadow-xl backdrop-blur-sm border border-white/10` + 일부 인라인 스타일만 적용하던 문제 수정
  - 그 결과 "텍스트만 보이기"(배경 투명) 위젯도 항상 `backdrop-blur-sm` + 흐릿한 흰 테두리가 적용되어, 실행 화면에서 텍스트 뒤에 모자이크(프로스트 글래스) 사각형이 보였음 (편집 캔버스 미리보기와 불일치)
- TaskCreate.tsx에 있던 `SHADOW_PRESETS`/`getWidgetVisualStyle()`를 신규 공통 유틸 `features/board/utils/widgetVisualStyle.ts`로 추출하고 `isTransparentBg()` 헬퍼 추가
- TaskCreate.tsx(편집 캔버스), TaskView.tsx(전광판 실행), TaskList.tsx(미리보기 모달), RollingDisplay.tsx(`LayoutScreen`, 롤링 재생)에서 위젯 컨테이너를 `getWidgetVisualStyle(widget.style)` + `isTransparentBg(widget.style)` 기반으로 통일
  - 배경이 투명한 위젯은 `backdrop-blur-sm`/`shadow-xl`/테두리 클래스를 적용하지 않음
  - `borderRadius`/`opacity`/`shadow`/`border` 등 위젯 스타일 옵션이 4곳(편집/실행/미리보기/롤링)에서 동일하게 반영됨
- 관련 파일: `features/board/utils/widgetVisualStyle.ts`(신규), `pages/board/TaskCreate.tsx`, `pages/board/TaskView.tsx`, `pages/board/TaskList.tsx`, `features/board/components/RollingDisplay.tsx`

### 기능 추가 — 롤링 전환효과 6종 추가 (모자이크/와이프/회전/기본/바운스/랜덤)
- `RollingDisplay.tsx`의 `TRANSITION_OPTIONS`(기존 9종: 페이드/슬라이드4/줌2/블러/플립)에 6종 추가
  - `mosaic`(모자이크): `mask-image: radial-gradient` + `mask-size`를 큰 도트→작은 도트로 애니메이션 + 블러 페이드 — "모래알이 모여 이미지가 되는" 하프톤 디졸브 효과
  - `wipe`(와이프): `clip-path: inset()`을 좌→우로 줄여 커튼이 열리듯 화면을 드러내는 효과 (기존 슬라이드와 달리 콘텐츠 자체는 이동하지 않음)
  - `rotateIn`(회전): 2D `rotate(-10deg) scale(0.85)` → `rotate(0) scale(1)` + 페이드 — 살짝 기울어진 상태에서 정위치로 회전하며 안착 (기존 `flip`의 3D `rotateY`와는 구분되는 효과)
  - `none`(기본): 애니메이션 없이 즉시 전환(`animation: ''`) — 모션이 거슬리는 환경을 위한 옵션
  - `bounce`(바운스): 위에서 떨어지며 살짝 튕기는 오버슈트 효과(`translateY` 다단 keyframe)
  - `random`(랜덤): 매 전환(`currentIndex` 변경)마다 `RANDOM_TRANSITION_POOL`(=`none` 제외 전체 옵션)에서 하나를 무작위로 골라 적용. `RollingPlayer`에 `randomAnimation` state + `useEffect([transitionType, currentIndex])`로 전환 도중 애니메이션이 바뀌지 않도록 전환 시작 시점에 1회만 재추첨
- `TRANSITION_ANIMATION`/`TRANSITION_PREVIEW_ANIMATION`/`TRANSITION_CSS`/`TRANSITION_PREVIEW_CSS`에 각 효과의 실재생용 keyframes + TaskMgmt 미리보기용 2초 루프 keyframes 추가 (`random` 미리보기는 여러 모션이 섞인 느낌의 `pvRandom`으로 표현)
- TaskMgmt.tsx의 `GroupEditView` 전환효과 선택 그리드는 `TRANSITION_OPTIONS`를 동적으로 매핑하므로 별도 코드 변경 없이 총 15종이 노출됨 (3x5 그리드로 자동 확장)
- 관련 파일: `features/board/components/RollingDisplay.tsx`

### 버그 수정 — 전광판 실행 시 값 위젯 하단에 등록 화면에는 없던 색상 줄(bar) 표시
- `TaskView.tsx`(`ViewValueWidget`), `TaskList.tsx`(`ModalValueWidget`), `RollingDisplay.tsx`(`RollingValueWidget`)의 값 영역 아래에 `<div className="w-full h-0.5 rounded mt-1" style={{ backgroundColor: widget.item.color }} />`(아이템 색상 줄)가 있었으나, TaskCreate.tsx 편집 캔버스(`WidgetContent`)에는 동일 요소가 없어 등록 화면과 실행/미리보기/롤링 화면이 불일치하던 문제 수정
- 3개 파일에서 해당 색상 줄 div를 제거하여 편집 캔버스와 동일하게 통일
- 관련 파일: `pages/board/TaskView.tsx`, `pages/board/TaskList.tsx`, `features/board/components/RollingDisplay.tsx`

### 버그 수정 — Redis 집계 방식(MAX/MIN/∑) 표시가 실제 위젯에 노출됨
- TaskCreate.tsx 편집 캔버스(`WidgetContent`)에서만 `widget.item.category === 'Redis' && hashSiblingKeys && aggregation !== 'none'`일 때 값 옆에 `∑`/`MAX`/`MIN` 뱃지를 표시하던 코드를 제거
- TaskView/TaskList/RollingDisplay에는 해당 뱃지가 원래 없었으므로, 편집 캔버스에서도 제거하여 "실제 데이터 화면에는 집계 방식 표시가 보이지 않음"으로 통일
- 관련 파일: `pages/board/TaskCreate.tsx`

### 버그 수정 — 전광판 실행 시 값(value) 정렬이 항상 좌측 고정
- `TaskView.tsx`(`ViewValueWidget`), `TaskList.tsx`(`ModalValueWidget`), `RollingDisplay.tsx`(`RollingValueWidget`)의 값 영역에 `widget.style.valueAlign`이 전혀 적용되지 않아, TaskCreate에서 "중앙"/"우측"으로 설정해도 실행 시 항상 좌측 정렬로 표시되던 문제 수정 (타이틀 영역은 `titleAlign`이 정상 적용되고 있었음)
- 3개 파일의 값 영역 `style`에 `textAlign: widget.style.valueAlign ?? 'left'` 추가
- 관련 파일: `pages/board/TaskView.tsx`, `pages/board/TaskList.tsx`, `features/board/components/RollingDisplay.tsx`

### 조사 — TaskCreate Redis 해시 그룹 집계(`hashSiblingKeys`)가 동작하지 않는 것처럼 보이는 현상
- `useGetRedisHashKeys()` → BE `GET /api/taskboard/redis/hash-keys`(`TaskBoardService.selectRedisHashKeys()`)는 하드코딩된 목록이 아니라, 연결된 Redis에 대해 매번 `SCAN`을 수행해 타입이 HASH인 키를 전부 반환함. 즉, 현재 Redis에 `IC:CTIQ:0` 외 다른 HASH 키가 없다면 트리에도 `IC:CTIQ:0` 하나만 나타남 (코드 동작은 정상)
  - 참고: `CtiRedisPoller.java`의 `CTIQ_HASH_KEY = "IC:CTIQ:0"` 폴링은 전광판 실시간 위젯(WebSocket)용 별도 캐시이며, 이 Redis 해시 탐색기 목록과는 무관함
- `groupRedisKeys()`의 `isHashGroup` 판정은 "마지막 세그먼트만 다르고 나머지 경로가 동일한 여러 Redis 키"를 하나의 "해시 그룹"으로 묶는 방식. `IC:CTIQ:0` 키 1개만 있으면 `CTIQ` 노드가 자식 1개(`0`)인 "해시 그룹(×1)"으로 인식되어 `hashSiblingKeys = ["IC:CTIQ:0"]`(길이 1)이 생성됨 → `hashSiblingKeys.length > 0` 조건은 만족하여 집계 방식 UI 자체는 노출되지만, 집계 대상 키가 1개뿐이라 sum=max=min=동일 값이 되어 "집계 방식이 없는 것처럼" 보임
- 즉, 코드 결함이 아니라 **현재 Redis에 다중 키 해시 그룹 데이터가 없어서** 집계 효과를 체감할 수 없는 상태. `SYSTEM:DISK:0`/`SYSTEM:DISK:1`/`SYSTEM:DISK:2`처럼 마지막 세그먼트만 다른 HASH 키를 여러 개 추가하면 `DISK` 노드가 `HASH ×3` 해시 그룹으로 인식되어 `hashSiblingKeys` 길이 3이 되고, sum/max/min 집계 결과가 서로 다르게 나와 정상 동작을 확인할 수 있음
- `SYSTEM:DISK:*` 테스트 데이터는 실제 Redis 인스턴스에 키를 추가해야 하므로 FE/BE 코드 변경 대상이 아님 — 현재 세션 환경에서는 Redis 접근 불가(redis-cli/docker 미설치)로 직접 추가하지 못함, 사용자에게 시드 명령 안내

### 기능 추가 — Redis 집계 '평균' 추가 + 해시키 캐싱/새로고침 + "계산식" 위젯 신설
- **공통 유틸 추출**: `features/board/utils/redisValue.ts` 신규 생성
  - `getRedisDisplayValue(widget, redisData)`: TaskView/TaskList/RollingDisplay에 중복 존재하던 `getRedisValue()`를 통합. aggregation 미설정 시 단일 hashKey 필드값, 설정 시 `hashSiblingKeys`(없으면 `[redisHashKey]`)를 대상으로 sum/max/min/avg 계산
  - `getWidgetNumericValue(widget, redisData)`: Redis 위젯은 `getRedisDisplayValue` 결과, 그 외는 `sampleValue`를 숫자로 변환
  - `evaluateFormula(formula, vars)`: `+ - * / ()`와 단일/다중 문자 변수를 지원하는 안전한 재귀하강 수식 파서(eval 미사용). 오류/미정의 변수/미완성 수식이면 `null`
  - `getCalcDisplayValue(widget, widgets, redisData)`: 계산식 위젯의 `calc.formula`와 `calc.operands`(바인딩된 widgetId)로 변수 맵을 만들어 `evaluateFormula` 실행, `calc.decimals`(기본 1) 자리로 반올림. operand 미바인딩/대상 위젯 없음/NaN이면 `'—'`
  - `CALC_WIDGET_ITEM`: 팔레트의 "계산식" 위젯 정의(`category: 'Calc'`)
  - TaskView.tsx/TaskList.tsx/RollingDisplay.tsx의 로컬 `getRedisValue()`/`RedisLiveData` 타입을 제거하고 위 유틸로 교체 (`ViewValueWidget`/`ModalValueWidget`/`RollingValueWidget`을 `{ widget, widgets, redisData }` 시그니처로 통일, `renderWidget`에서 `widgets={widgets}` 전달)
- **항목 1 — Redis 집계 '평균' + 노출 조건 완화**: `taskboard.types.ts`의 `DroppedWidget.aggregation`에 `'avg'` 추가. TaskCreate.tsx 속성 패널의 "집계 방식" 블록을 `category === 'Redis' && !!item.redisHashKey`일 때 항상 노출(기존: `hashSiblingKeys` 존재 시에만 노출)하도록 조건 완화하고 `⌀ 평균` 버튼 추가. 라벨에 현재 집계 대상 키 개수(`N개 키` / `1개 키`) 표시
- **항목 2 — Redis 해시키 목록 캐싱 + 새로고침**:
  - BE `TaskBoardService.java`: 기존 매 호출 SCAN 방식의 `selectRedisHashKeys()`를 `@PostConstruct initRedisHashKeysCache()`(기동 시 1회 SCAN → `redisHashKeysCache`에 적재) + `selectRedisHashKeys()`(캐시 반환) + `refreshRedisHashKeys()`(재SCAN 후 캐시 갱신·반환)로 분리. 실제 SCAN 로직은 private `scanRedisHashKeys()`로 이동(내용 동일)
  - BE `TaskBoardController.java`: `GET /api/taskboard/redis/hash-keys`에 `refresh`(기본 false) 쿼리 파라미터 추가 — `refresh=true`면 `refreshRedisHashKeys()`, 아니면 `selectRedisHashKeys()`(캐시) 호출
  - FE `ctiRedisApi.ts`의 `getRedisHashKeys(refresh?)`에 `refresh` 파라미터 추가(BFF가 GET 쿼리 파라미터를 그대로 포워딩하므로 BFF flow 변경 불필요)
  - FE `useTaskboardQueries.ts`: `useRefreshRedisHashKeys()` 뮤테이션 훅 신규 — `getRedisHashKeys(true)` 호출 후 `ctiRedisQueryKeys.hashKeys()` 쿼리 캐시를 결과로 갱신
  - TaskCreate.tsx `RedisHashSection`: 기존 `refetch` 버튼을 `useRefreshRedisHashKeys()`로 교체, 새로고침 중 `↻` 아이콘 회전 애니메이션 표시
- **항목 3 — "계산식" 위젯 신설**: 캔버스에 배치된 다른 위젯을 드래그해 변수(A, B, C...)로 바인딩하고, 자유 수식(`A * 1.5 + B`)을 입력해 결과를 표시하는 위젯
  - `taskboard.types.ts`: `CallDataItem.category`에 `'Calc'` 추가, `CalcOperand`(`{ var, widgetId? }`)/`CalcConfig`(`{ formula, operands, decimals? }`) 인터페이스 추가, `DroppedWidget.calc?: CalcConfig` 추가
  - TaskCreate.tsx 팔레트: "테이블" 섹션 아래 "계산식" 섹션 신설, `CALC_WIDGET_ITEM`을 `DraggableSourceItem`으로 노출
  - TaskCreate.tsx `DragInfo`에 `{ type: 'widget-ref'; widgetId; label }` 추가 — 캔버스 위젯 hover 시 노출되는 `🔗` 드래그 핸들(`WidgetRefHandle`, Calc 위젯 자신은 제외)에서 시작
  - `handleDragEnd`: (1) 팔레트의 계산식 위젯을 캔버스에 드롭하면 `calc: { formula: '', operands: [] }`로 초기화된 새 위젯 생성 (2) `🔗` 핸들을 속성 패널의 변수 드롭존(`calc-operand-{calcWidgetId}-{var}`)에 드롭하면 해당 operand의 `widgetId`를 연결
  - 속성 패널에 계산식 위젯 전용 섹션 추가: 수식 입력(모노스페이스), 변수 목록(`CalcOperandDropZone` — 각 변수 옆에 바인딩된 위젯 라벨/빈 드롭존 + 삭제 버튼), "+ 변수 추가"(A→Z 자동 할당, `updateWidgetCalc`/`addCalcOperand`/`removeCalcOperand`), 소수점 자릿수 입력, 수식 결과 미리보기
  - `WidgetContent`에 `widgets: DroppedWidget[]` prop 추가(`CanvasWidgetFree`/`CanvasWidgetGrid` → `WidgetContent`로 스레딩), `category === 'Calc'`이면 `getCalcDisplayValue(widget, widgets)`를 표시값으로 사용
  - `DragOverlay`에 `widget-ref` 타입 미리보기(`🔗 + 라벨`) 분기 추가
- 관련 파일: `features/board/utils/redisValue.ts`(신규), `features/board/types/taskboard.types.ts`, `pages/board/TaskCreate.tsx`, `pages/board/TaskView.tsx`, `pages/board/TaskList.tsx`, `features/board/components/RollingDisplay.tsx`
- 짝 폴더(BT-ADMIN-SERVICE-TASKBOARD) 연관: `TaskBoardService.java`, `TaskBoardController.java` (해당 CHANGELOG.md에도 기록)
- 코드 변경 없음 (조사만 수행)

### 기능 추가 — 계산식 위젯 변수를 캔버스 미배치 Redis 항목에서 직접 바인딩
- 기존 계산식 위젯의 변수(operand)는 캔버스에 이미 배치된 위젯을 `🔗` 핸들로 드래그해야만 연결할 수 있어, "계산에만 쓰고 화면에는 표시하지 않을 Redis 항목"도 캔버스에 위젯으로 깔아야 하는 문제가 있었음. 좌측 Redis 해시키 팔레트 항목을 변수 드롭존에 직접 드래그해도 반응이 없던 현상의 원인이기도 함
- `taskboard.types.ts`: `CalcOperand`에 `source?: CallDataItem`(캔버스 배치 없이 직접 참조하는 Redis 해시 필드)과 `aggregation?: 'none' | 'sum' | 'max' | 'min' | 'avg'`(source가 `hashSiblingKeys`를 가질 때의 집계 방식) 추가
- `redisValue.ts`:
  - `getRedisDisplayValue(widget, redisData)`의 파라미터 타입을 `DroppedWidget`에서 `RedisValueHost`(= `Pick<DroppedWidget, 'item' | 'aggregation'>`)로 좁혀, `DroppedWidget`뿐 아니라 `{ item: operand.source, aggregation: operand.aggregation }` 형태의 합성 객체도 그대로 전달 가능
  - `getOperandNumericValue(operand, widgets, redisData)` 신규: `operand.source`가 있으면 캔버스 배치 여부와 무관하게 그 값을 사용(Redis면 `getRedisDisplayValue`, 아니면 `sampleValue`), 없으면 기존처럼 `operand.widgetId`로 캔버스 위젯을 찾아 `getWidgetNumericValue` 사용. `getCalcDisplayValue`의 operand 순회 로직을 이 함수 호출로 교체(미바인딩 판정도 `!widgetId && !source`로 확장)
  - `collectRedisHashKeys(widgets)` 신규: 캔버스 위젯의 `item`뿐 아니라 각 위젯 `calc.operands[].source`까지 순회하여 폴링 대상 Redis 해시키 목록(`hashSiblingKeys` 펼침 포함)을 수집. TaskView/TaskList/RollingDisplay 3곳에 중복돼 있던 `uniqueHashKeys` 산출 로직을 이 함수로 통합
- `TaskCreate.tsx`:
  - `handleDragEnd`: `calc-operand-{calcWidgetId}-{varName}` 드롭존 처리를 함수 앞쪽으로 이동하여 드래그 타입별로 분기 — `widget-ref`(🔗 핸들)는 기존과 동일하게 `operand.widgetId`를 연결, `source`(좌측 팔레트의 Redis 항목, `category === 'Redis' && redisHashKey` 조건)는 `operand.source`(+`aggregation: 'none'`)를 연결
  - `CalcOperandDropZone`을 재작성하여 드롭존 안내 문구를 "🔗 위젯 또는 Redis 항목을 여기로 드래그"로 변경하고, `operand.source.hashSiblingKeys`가 있을 때만 보이는 집계 방식 선택 UI(없음/∑/↑/↓/⌀) 추가
  - `updateCalcOperandAggregation(id, varName, aggregation)` 헬퍼 신규 — source 바인딩된 변수의 집계 방식 변경
  - 속성 패널 변수 목록의 라벨 해석을 `op.widgetId`(캔버스 위젯 라벨/`(삭제된 위젯)`) 또는 `op.source`(Redis 항목 라벨)로 분기, 안내 문구를 "캔버스 위젯의 🔗 또는 좌측 Redis 항목을 드래그해서 연결"로 변경
- `TaskView.tsx`/`TaskList.tsx`/`RollingDisplay.tsx`: 각 파일에 중복 구현돼 있던 `uniqueHashKeys` 계산을 `collectRedisHashKeys(widgets)` 호출로 교체 — 캔버스에 배치되지 않은 source 바인딩 Redis 항목도 실시간 폴링 대상에 포함되어 계산식이 stale한 `sampleValue`로 fallback되지 않도록 함
- 관련 파일: `features/board/types/taskboard.types.ts`, `features/board/utils/redisValue.ts`, `pages/board/TaskCreate.tsx`, `pages/board/TaskView.tsx`, `pages/board/TaskList.tsx`, `features/board/components/RollingDisplay.tsx`

## 2026-06-18

### 버그 수정 — 단일값 Redis 위젯이 `taskboard-redis-hashfields-batch` 폴링 데이터를 받으면서도 화면에 반영 안 됨
- 원인: BE `selectRedisHashFieldsBatch()`가 design-time 필드 탐색기용 메서드를 재사용해 "해시그룹"(`IC:GROUP:0`처럼 한 hashKey에 compositeKey가 여러 개 들어있는 구조)에서 임의의 compositeKey 하나만 평탄화돼 응답되던 문제. 위젯에 바인딩된 `redisField`(compositeKey)로 못 찾아 항상 sampleValue만 표시됨
- BE 수정(`BT-ADMIN-SERVICE-TASKBOARD/CHANGELOG.md` 참고): `selectRedisHashFieldsRaw()` 신규로 평탄화 없는 raw 응답 보장

### 개선 — 응답 크기 축소 (hashKey당 실제 바인딩된 field만 요청)
- 위 수정 직후 확인된 문제: `IC:GROUP:0`처럼 수백 개 compositeKey가 들어있는 hashKey를 HGETALL로 통째로 받아오다 보니, 위젯이 실제 쓰는 field 1~2개를 위해 매 5초마다 거대한 응답이 내려옴(등록한 컬럼 RTS_LOGOUT/RTS_NOTREADY/RTS_READY/RTS_IB_BUSY 외 전체값까지 포함)
- `redisValue.ts`: `collectRedisHashKeys(widgets): string[]` → `collectRedisHashFieldRequests(widgets): { hashKey, fields }[]`로 교체. 위젯의 `item`/`calc.operands[].source`를 순회하며 hashKey별로 실제 바인딩된 `redisField`(compositeKey)만 모음(`hashSiblingKeys` 펼침 포함)
- `ctiRedisApi.ts`: `getRedisHashFieldsBatch(hashKeys: string[])` → `getRedisHashFieldsBatch(items: { hashKey, fields }[])`로 파라미터 변경, BE에 field 단위 조회를 요청
- `TaskView.tsx`/`RollingDisplay.tsx`: 두 곳의 `fetchRedisData`(5초 폴링)를 `collectRedisHashFieldRequests` + 새 `getRedisHashFieldsBatch` 시그니처로 교체
- 짝 폴더(BT-ADMIN-SERVICE-TASKBOARD) 연관: `RedisHashFieldsBatchItem` DTO 신규, `TaskBoardService`/`TaskBoardController`가 field 단위 HGET을 지원하도록 변경 (해당 CHANGELOG.md 참고)
- 참고: 단일값 Redis 위젯은 "특정 한 compositeKey(그룹)의 값"을 보여주는 구조이며, 여러 그룹을 합산("집계값")하는 기능은 현재 구조에 없음 — 필요 시 별도 작업으로 분리 논의 필요
- 관련 파일: `features/board/utils/redisValue.ts`, `features/board/api/ctiRedisApi.ts`, `pages/board/TaskView.tsx`, `features/board/components/RollingDisplay.tsx`

### 기능 추가 — task-create 필드 탐색기에서 "해시그룹" compositeKey(그룹/큐/상담사) 직접 선택
- 배경: `IC:GROUP:0`처럼 한 hashKey 안에 compositeKey가 여러 개 들어있고 값이 각각 JSON인 "해시그룹" 구조에서, 기존 필드 탐색기는 BE가 평탄화해서 보여준 첫 compositeKey의 컬럼명을 그대로 `redisField`에 저장했음 — 사용자가 어떤 그룹을 보는지 선택할 길이 없었고, 실제로는 Redis HGETALL이 반환하는 순서상 임의의 한 그룹을 보고 있던 것(불안정)
- `ctiRedisApi.ts`: `getRedisHashEntries(hashKey)` 신규 — 평탄화 없이 원본 field(compositeKey)→raw JSON 그대로 반환
- `useTaskboardQueries.ts`: `useGetRedisHashEntries` 훅 + `ctiRedisQueryKeys.hashEntries` 키 추가
- `TaskCreate.tsx`의 `RedisHashFieldItems` 재작성:
  - `useGetRedisHashFields` → `useGetRedisHashEntries`로 교체
  - compositeKey가 2개 이상이고 값이 JSON이면("해시그룹") `<select>`로 compositeKey를 직접 선택하게 하고(라벨은 GROUP_NAME/AGENT_NAME/CTIQ_NAME/QUEUE_NAME/NAME 중 있는 필드 + field id), 선택된 compositeKey의 JSON 컬럼만 드래그 아이템으로 노출
  - compositeKey가 1개뿐이거나 값이 JSON이 아닌 평문 hash는 선택 UI 없이 그대로 필드를 바인딩(기존 동작 유지)
  - 두 경우 모두 `redisField`에 실제 Redis HASH field(=선택된 compositeKey 또는 평문 필드명)가 저장되어 런타임 배치 조회(`getRedisHashFieldsBatch`)와 정확히 일치
- ⚠️ 이 변경 이전에 만든 단일값 Redis 위젯(해시그룹 대상)은 `redisField`에 컬럼명이 잘못 저장돼 있으므로, task-create에서 다시 드래그해 재바인딩해야 함
- 짝 폴더(BT-ADMIN-SERVICE-TASKBOARD) 연관: `GET /api/taskboard/redis/hash-entries/{hashKey}` 신규 엔드포인트 + `V90__add_redis_hash_entries_flow.sql` (해당 CHANGELOG.md 참고)
- 관련 파일: `features/board/api/ctiRedisApi.ts`, `features/board/hooks/useTaskboardQueries.ts`, `pages/board/TaskCreate.tsx`

### 개선 — task-create 필드 탐색기 compositeKey 선택 UI 제거 (요청에 따라 되돌림)
- 위 기능에서 추가한 `<select>` compositeKey 선택 UI 제거 — "해시그룹" 키여도 디자인 시점에는 JSON 컬럼(메트릭)만 보여주고 첫 entry를 컬럼 목록 샘플로만 사용. "어떤 그룹을 보여줄지"는 디스플레이 설정에서 결정
- 관련 파일: `pages/board/TaskCreate.tsx`

## 2026-06-18 (2)

### 기능 추가 — 디스플레이(선택값 그룹핑)를 레이아웃에서 분리 (N:M)
- 배경: 디스플레이가 `layoutId` FK로 레이아웃 1개에 고정돼 있어서, 같은 큐/그룹/상담사 선택값을 다른 전광판(레이아웃)에도 쓰려면 매번 새로 만들어야 했음. 실제로 레이아웃 2개에 디스플레이 4건이 쌓여 사용자가 "왜 4개로 보이냐"고 혼란을 겪음
- 짝 폴더(BT-ADMIN-SERVICE-TASKBOARD) 연관: `TaskboardDisplay`에서 `layoutId` 제거, 신규 `TaskboardDisplayLayout`(그룹핑×레이아웃 N:M 연결, `displayLayoutId`가 화면 인스턴스 단일 ID) + `V91__split_taskboard_display_layout.sql`(해당 CHANGELOG.md 참고)
- **타입**(`taskboard.types.ts`): `TaskboardDisplay`에서 `layoutId`/`layoutName` 제거. 신규 `TaskboardDisplayLayout`(`displayLayoutId, displayId, displayName, selectionJson, layoutId, layoutName`), `TaskboardDisplayLayoutDetail`(TaskView용, `displayId` 포함 — 설정 패널이 그룹핑을 수정할 때 필요)
- **API**(`taskboardApi.ts`): `getDisplayList()`(layoutId 인자 제거), `createDisplay`(layoutId 안 보냄), `getDisplayDetail` 제거. 신규 `getDisplayLayoutList({displayId?, layoutId?})`, `getDisplayLayoutDetail`, `createDisplayLayout`, `deleteDisplayLayout`
- **훅**(`useTaskboardQueries.ts`): 위 API에 맞춰 `useGetTaskboardDisplayList`(인자 없음), `useGetTaskboardDisplayLayoutList`, `useGetTaskboardDisplayLayoutDetail`, `useCreateTaskboardDisplayLayout`, `useDeleteTaskboardDisplayLayout` 추가/조정
- **`TaskDisplayManage.tsx` 전면 재작성**: 상단 "레이아웃 선택" 드롭다운으로 필터링하던 구조 제거. 그룹핑(`TaskboardDisplay`) 목록을 그대로 보여주고, 카드마다 "연결된 전광판" 칩(`LayoutLinkSection` 신규) + "+ 전광판 추가" 드롭다운으로 레이아웃을 자유롭게 연결/해제
- **`TaskList.tsx`**: 디스플레이 선택 팝오버(`DisplayPickerPopover`)가 `useGetTaskboardDisplayLayoutList({layoutId})`로 그 레이아웃에 연결된 화면 인스턴스만 보여주고, 재생 버튼은 `displayLayoutId`로 이동
- **`TaskView.tsx`**: `useGetTaskboardDisplayDetail` → `useGetTaskboardDisplayLayoutDetail`로 교체. route param(`:displayId` 세그먼트명은 유지)이 이제 `displayLayoutId`를 의미. `DisplaySettingsPanel`은 `detail.displayId`(그룹핑 ID)로 그대로 선택값 수정
- **`TaskMgmt.tsx`**: `GroupEditView`/`GroupListView`/`GroupThumbnails`가 `displayList` 대신 `screenList`(`useGetTaskboardDisplayLayoutList()`)를 사용. `RollingGroup.displayIds`는 그대로 JSON 배열 컬럼이지만 이제 `displayLayoutId` 값들을 담음(마이그레이션이 ID를 재사용해 기존 롤링그룹 데이터 변경 불필요). **요청하신 "그룹핑 선택 시 연결된 전광판 전체 선택" UX 추가** — 화면 선택 리스트를 그룹핑 단위로 묶고, 그룹핑 제목을 누르면 그 그룹핑에 연결된 화면 전체가 한꺼번에 토글됨(`toggleSelectGroup`)
- **`RollingDisplay.tsx`**: 슬라이드 인디케이터 dot의 React key가 `l.layoutId`였던 걸 `l.displayId`(=displayLayoutId)로 수정 — 같은 레이아웃을 여러 그룹핑이 공유하면(N:M 구조에서 흔해짐) 같은 롤링 그룹에 동일 layoutId가 중복될 수 있어 key 충돌이 날 수 있었음(기존에도 잠재했던 버그)
- 관련 파일: `features/board/types/taskboard.types.ts`, `features/board/api/taskboardApi.ts`, `features/board/hooks/useTaskboardQueries.ts`, `pages/board/TaskDisplayManage.tsx`, `pages/board/TaskList.tsx`, `pages/board/TaskView.tsx`, `pages/board/TaskMgmt.tsx`, `features/board/components/RollingDisplay.tsx`

### 개선 — TaskMgmt 롤링그룹 편집 UX를 "전광판 우선 → 디스플레이 선택" 구조로 재설계
- 문제: 그룹핑(디스플레이) 단위로 화면을 묶어 보여주던 첫 시도가 "전광판 2개 × 디스플레이 2개 = 4장"으로 보여 직관적이지 않았음. 사용자가 원한 흐름은 "전광판을 먼저 고르고, 그 전광판에 보여줄 디스플레이를(여러 개 가능) 고르는" 방향
- `GroupEditView` 전면 재작성: 좌측에 전광판(레이아웃) 목록을 두고 클릭으로 롤링에 포함할 전광판을 선택 → 선택된 전광판 카드 아래에 그 전광판에 연결된 디스플레이 체크박스 목록이 펼쳐지며 여러 개 멀티선택 가능. 선택 순서 = 전광판 선택 순서 → 그 안에서 디스플레이 선택 순서
- **localStorage 기억** 추가: `loadStoredDisplayIds`/`saveStoredDisplayIds` — `taskboard-rolling-display-selection:{layoutId}` 키로 전광판별 마지막 디스플레이 선택을 저장. 같은 전광판을 다른 롤링그룹에서 다시 선택해도 이전에 고른 디스플레이가 기본값으로 세팅됨(요청하신 "ID랑 맵핑해서 기존 선택값 세팅" 그대로 구현, 범위는 layoutId 전역)
- `RollingGroup.displayIds`는 여전히 화면 인스턴스(`displayLayoutId`) 배열 — 기존 그룹 편집 시 `screenList`에서 역으로 layoutId/displayId 묶음을 복원해 좌측 패널에 그대로 재현
- 관련 파일: `pages/board/TaskMgmt.tsx`

### 기능 추가 — 좌측 트리 단일값 Redis 위젯도 REST 폴링 대신 WS로 통합
- 배경: "task-create에서 등록한 해시키/필드는 다 WS로 받아야 하는 거 아니냐"는 문제 제기. 백엔드 `CtiqWebSocketHandler`는 처음부터 임의의 hashKey/field를 지원하도록 일반화돼 있었고(`CtiRedisPoller`가 처음 보는 hashKey도 즉시 폴링), 단일값 Redis 위젯이 REST 5초 폴링을 쓰던 건 순전히 FE 쪽 설계 선택이었음 — 백엔드 제약이 아니므로 WS로 통합 가능
- `redisValue.ts`:
  - 데이터 타입을 REST 원본 문자열 맵(`RedisLiveData`)에서 WS 응답 타입(`CtiWsDataByHashKey`, 이미 파싱된 객체)으로 전환
  - `readJsonField()` 신규 — WS 응답(객체 또는 raw 문자열 둘 다)에서 컬럼값을 꺼내는 공통 헬퍼로 `toNumericField`/`getRedisDisplayValue` 단순화
  - `collectRedisHashFieldRequests`(REST 배치 요청 빌더) → `collectRedisWsSubscriptions`(WS 구독 빌더, `CtiWsSubscription[]` 반환)로 교체
  - `mergeWsSubscriptions()` 신규 — 같은 hashKey를 가리키는 여러 구독(큐/그룹/상담사 KPI + 단일값 위젯)을 하나로 합침(`CtiqWebSocketHandler`가 같은 hashKey 두 번째 구독으로 응답을 덮어쓰는 문제 방지). columns 중 하나라도 미지정(전체 필요)이면 합쳐진 구독도 필터 없이 전체 요청
- `TaskView.tsx`(`SingleLayoutView`): REST 폴링(`fetchRedisData`/`useState(redisData)`/`useEffect` 인터벌) 완전 제거. `collectRedisWsSubscriptions(widgets)` 결과를 큐/그룹/상담사 구독과 `mergeWsSubscriptions`로 합쳐 **하나의 `useCtiqWebSocket` 호출**로 통일. `hasLiveSelection`(○연결중/●실시간 배지 노출 조건)도 `selection` 값이 아니라 실제 `subscriptions.length`로 판단하도록 수정 — 단일값 Redis 위젯만 있어도 이제 배지가 정상 표시됨
- `RollingDisplay.tsx`: `LayoutScreen`의 자체 REST 폴링 제거, `RollingPlayer`가 로테이션 내 모든 레이아웃의 단일값 Redis 구독(`collectRedisWsSubscriptions(allWidgets)`)까지 합쳐 기존 큐/그룹/상담사 WS 소켓 하나에 태움(슬라이드 전환마다 재연결되지 않고 계속 유지됨)
- `ctiRedisApi.ts`: 더 이상 쓰이지 않는 `getRedisHashFieldsBatch` 함수 제거(REST 배치 폴링 자체가 없어졌으므로)
- ⚠️ BE의 `POST /api/taskboard/redis/hash-fields-batch`(`selectRedisHashFieldsBatch`) 엔드포인트는 이제 FE에서 호출하는 곳이 없음 — 당장 지우지 않고 남겨둠(필요 시 별도로 정리)
- 관련 파일: `features/board/utils/redisValue.ts`, `pages/board/TaskView.tsx`, `features/board/components/RollingDisplay.tsx`, `features/board/api/ctiRedisApi.ts`

### 개선 — IC:GROUP:* 단일값 위젯이 보여줄 그룹을 디스플레이 선택값(groupIds) 기준으로 결정
- 배경: WS로 통합한 직후에도 `IC:GROUP:0`에서 한 그룹(compositeKey)만 내려와서 의아했음 — 원인은 위젯이 design-time에 "임의로 첫 번째로 발견된 compositeKey 1개"를 고정 저장해 그것만 구독했기 때문. 사용자가 원한 동작은 "디스플레이 관리에 설정된 그룹 목록(selection.groupIds) 기준으로 보여주는 것" — table-group 위젯과 같은 규칙
- `redisValue.ts`: `isGroupHashKey()`(`IC:GROUP:` 접두사 판별), `buildGroupIdsByHashKey(widgets, groupRows, selectedGroupIds)` 신규 — 캔버스에 있는 Redis 위젯이 가리키는 `IC:GROUP:{mediaType}` 키마다, 디스플레이 선택값에 해당하는 그룹들의 compositeKey 목록을 계산(선택값이 비어있으면 전체 그룹, table-group 위젯과 동일 규칙)
- `getRedisDisplayValue`/`getWidgetNumericValue`/`getOperandNumericValue`/`getCalcDisplayValue`/`collectRedisWsSubscriptions`에 `groupIdsByHashKey` 파라미터 추가 — 있으면 위젯에 고정 저장된 `redisField`(compositeKey 1개) 대신 그 그룹들의 값을 합산(그룹 1개면 그 값, 여러 개면 합)해서 구독·표시
- `TaskView.tsx`/`RollingDisplay.tsx`: `buildGroupIdsByHashKey`로 계산한 결과를 WS 구독(`collectRedisWsSubscriptions`)과 렌더(`ViewValueWidget`/`RollingValueWidget`) 양쪽에 전달. `RollingDisplay.tsx`는 로테이션 전체 슬라이드의 선택값 합집합으로 넉넉히 구독해두고(`RollingPlayer`), 각 슬라이드는 자기 자신의 선택값으로 그중 필요한 것만 다시 골라 읽음(`LayoutScreen`)
- 관련 파일: `features/board/utils/redisValue.ts`, `pages/board/TaskView.tsx`, `features/board/components/RollingDisplay.tsx`

### 개선 — 롤링그룹: "디스플레이 등록"을 "전광판 등록 + 실행 시점 디스플레이 선택"으로 분리
- 배경: 직전 설계는 롤링그룹 만들 때 전광판마다 디스플레이를 같이 골라 저장했는데, 사용자가 원한 흐름은 "등록은 전광판 순서만 정하고, 실행할 때마다 어떤 디스플레이로 보여줄지 고르는" 것 — 같은 그룹을 다른 디스플레이 조합으로 여러 번 실행할 수 있어야 함
- `TaskBoardRollingGroup.DISPLAY_IDS`(JSON 배열, FK 없는 단순 CLOB) 컬럼의 의미를 "화면 인스턴스 id 목록" → **"전광판(레이아웃) id 목록"**으로 재해석(BE 컬럼/마이그레이션 변경 없음 — 단순 문자열 컬럼이라 FE에서 담는 JSON 내용만 바뀜)
- `GroupEditView`: 전광판(레이아웃)만 순서대로 클릭해서 선택하는 단순한 그리드로 되돌림(디스플레이 체크박스 제거). 저장 시 `displayIds`에 선택한 layoutId 배열을 그대로 저장
- **`RunOptionsView` 신규** — "롤링 시작" 클릭 시 먼저 뜨는 실행 옵션 모달:
  - "전체 전광판에 같은 디스플레이 적용" 체크박스 — 켜면 모든 보드에 적용할 디스플레이 1개를 드롭다운(전체 `TaskboardDisplay` 목록)에서 선택
  - 끄면 전광판마다 개별로 디스플레이를 선택(그 전광판에 이미 연결된 디스플레이만 노출, `TaskboardDisplayLayout` 기준)
  - **localStorage 기억**: `taskboard-rolling-run-options:{groupId}` 키로 마지막에 선택한 옵션(전체적용 여부 + 선택값)을 그룹별로 저장 → 같은 그룹을 다시 실행하면 직전 선택이 기본값으로 채워짐
  - 시작 시 `resolveRollingLayout(layout, display)`로 레이아웃+디스플레이(selectionJson)를 바로 합성 — 화면 인스턴스(`TaskboardDisplayLayout`) 링크가 없어도("전체 적용" 모드에서 처음 매칭되는 조합도) 그대로 재생 가능(별도 링크 생성 불필요, 렌더에는 레이아웃 JSON + 디스플레이 selectionJson만 필요하므로)
- `RollingDisplay.tsx`: 슬라이드 인디케이터 dot의 React key를 `l.displayId`(이제 "전체 적용" 모드에서 여러 슬라이드가 같은 displayId를 가질 수 있어 중복 가능) → 배열 인덱스로 변경
- 관련 파일: `pages/board/TaskMgmt.tsx`, `features/board/components/RollingDisplay.tsx`
