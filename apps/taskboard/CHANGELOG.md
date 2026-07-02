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

## 2026-06-30 — 세션N

### task-create: 구역(섹션) UX 개선 + 롤링전광판 구역별 설정 추가

#### 1. `WidgetActionsMenu` — 톱니바퀴 팝업 구역 UI 재설계
- `ALL_SECTION_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')` 모듈 상수 추가
- 팝업이 뷰포트 하단에 잘릴 것 같으면(spaceBelow < 260px) `bottom` 방향으로 뒤집어 열리도록 flip 로직 추가(`menuPos` 타입을 `{ top?: number; bottom?: number; right: number }` 로 변경)
- "구역" 행: ▶ 화살표(트리 메뉴 스타일) — 클릭 시 인라인 펼침(`sectionExpanded` state). 복사/삭제와 동일한 행 구조
- A·B·C 항상 기본 표시(미정의면 dashed 점선 칩) + 정의된 구역은 solid 칩 — 클릭으로 배정/해제 토글
- `+ D` 버튼: 다음 알파벳 자동 추가 및 배정
- `newSectionInput` state 제거, `sectionExpanded` state로 대체

#### 2. 왼쪽 패널 구역 관리 UI 재설계
- `newSectionName` state 제거
- 텍스트 입력 + 추가 버튼 → A·B·C 기본 칩 + 정의된 구역 × 삭제 + `+ D` 버튼으로 교체
- 관련 파일: `pages/board/TaskCreate.tsx`

#### 3. TaskList.tsx — 전광판 실행 시 구역 부분 배정 허용 + 기타 fallback
- `ETC_KEY = '__etc'` 상수 추가
- `buildSectionUrl`: 모든 구역 배정 필수 → 1개 이상 배정 시 실행 가능으로 완화
- "기타 (미지정 구역)" 드롭다운 추가 — 구역 미배정 위젯의 fallback 뷰 그룹 지정
- 관련 파일: `pages/board/TaskList.tsx`

#### 4. TaskView.tsx — `__etc` fallback 적용
- `effectiveSelection` 에 `?? sectionSelections['__etc']` fallback 추가
- 관련 파일: `pages/board/TaskView.tsx`

#### 5. 롤링전광판 구역별 설정 지원
- `RollingLayout` 인터페이스에 `sectionSelections?: Record<string, TaskboardDisplaySelection>` 추가
- `LayoutScreen.renderWidget`: 위젯 `sectionKey` 기준으로 구역별 selection 적용 (`?? sectionSelections['__etc'] ?? selection` 폴백)
- `TaskMgmt.tsx RunOptionsView`:
  - `RunOptions`에 `perLayoutSectionMap: Record<number, Record<string, number>>` 추가
  - 섹션이 있는 레이아웃 슬롯은 구역별 드롭다운 + 기타 드롭다운으로 UI 분기
  - `buildLayouts()`: 섹션 모드/단일 모드 혼합 처리
  - `handleStartNewWindow()`: 섹션 모드 슬롯은 `layoutId:s:sectionKey:displayId:...` 형식으로 URL 인코딩
  - `encodeSectionSlot()` 헬퍼 함수 추가 (`__etc` → `_` 단축)
- `TaskRolling.tsx`:
  - URL 파싱: `layoutId:s:sectionKey:displayId:...` 섹션 모드 파싱 추가
  - 파싱 결과를 `RollingLayout.sectionSelections`에 세팅
- 관련 파일: `features/board/components/RollingDisplay.tsx`, `pages/board/TaskMgmt.tsx`, `pages/board/TaskRolling.tsx`

---

## 2026-06-30

### 공개 URL 401 리다이렉트 버그 수정

- **원인**: `apps/host`의 `useApiErrorHandler`가 `api-error` 이벤트(401)를 수신하면 공개 경로 여부와 무관하게 `/login`으로 이동. `SessionGuard`는 public path를 올바르게 우회하지만, `useGetSession` 호출로 발생한 401 이벤트가 이 핸들러에 도달.
- **수정**: `publicAuth.ts`에 `useSuppressApiError401` 훅 신규 추가.
  - `window.addEventListener(API_ERROR_EVENT, handler, capture=true)`로 등록 — bubble 단계의 `useApiErrorHandler`보다 먼저 실행됨.
  - 401 이벤트일 때 `stopImmediatePropagation()`으로 이후 핸들러 차단.
- `TaskViewPublic.tsx`: `useSuppressApiError401()` 훅 호출 추가.
- `TaskRolling.tsx`: `useSuppressApiError401()` 훅 호출 추가.
- **apps/host 수정 없음** — `apps/taskboard` 내에서만 해결.
- 관련 파일: `features/board/api/publicAuth.ts`, `pages/board/TaskViewPublic.tsx`, `pages/board/TaskRolling.tsx`

## 2026-06-17

### CTI WebSocket 다중 구독 일반화
- `useCtiqWebSocket.ts`: 단일 hashKey 구독 → `subscriptions: {hashKey, ids}[]` 배열을 한 연결로 동시 구독하도록 재작성(`CtiWsSubscription`, `CtiWsDataByHashKey` 신규 export, 기존 `CtiqQueueRecord`는 `CtiqRecord`로 이름 변경). 큐/그룹/상담사(상담사는 그룹별로 `IC:AGENT:{groupId}:{mediaType}` hashKey가 갈라짐)를 React Hook 규칙(동적 개수만큼 훅 호출 불가) 위반 없이 한 훅으로 처리하기 위함.
- `ctiRedisApi.ts`: `CtiAgentRow`에 `groupId` 필드 추가(BE `CtiAgentDto`엔 이미 있었으나 FE 타입에 누락돼 있었음) — 상담사 WS hashKey(`IC:AGENT:{groupId}:{mediaType}`) 합성에 필요.

## 2026-06-23 세션38

### task-create: 비선택 위젯 경계 표시 (항상 dashed outline)
- **원인**: `CanvasWidgetFree`·`CanvasWidgetGrid` 모두 `isSelected`가 false일 때 outline CSS가 빈 문자열이라 위젯 영역이 안 보였음.
- **수정**: 비선택 상태에도 `[outline-style:dashed] outline outline-1 outline-white/30` 적용 — 잠금 여부와 관계없이 항상 흐릿한 점선 테두리로 위젯 경계 표시.
- 관련 파일: `src/app/pages/board/TaskCreate.tsx` (CanvasWidgetFree line ~1287, CanvasWidgetGrid line ~1414)

### task-view: 그리드 모드 간격(gridMargin)·여백(containerPadding) view에 반영
- **원인**: `fromGridItem()`이 그리드 좌표→%로 단순 비율 변환(gridX/GRID_COLS×100)만 해서 gridMargin/containerPadding을 완전히 무시. TaskView에서 이 %를 absolute 위치로 쓰면 margin=0인 것과 동일하게 렌더되어 위젯들이 구석으로 붙었음.
- **수정**: TaskView.tsx에 `VIEW_GRID_COLS/ROWS` 상수 추가, layoutJson의 `layoutMode`·`gridMargin`·`containerPadding`을 파싱해 `getGridAdjustedPos()` 헬퍼로 역산. gridMode이면 각 위젯의 저장된 %를 그리드 좌표(gx/gy/gw/gh)로 역산한 뒤 실제 픽셀 위치를 %로 재계산해 absolute style에 적용.
- 관련 파일: `src/app/pages/board/TaskView.tsx`

## 2026-06-23 세션38

### 스포이드 — HTTP 환경 폴백 구현 (캔버스 배경 이미지 픽셀 샘플링)

배경: 고객사 HTTP 배포 환경에서도 스포이드를 사용할 수 있어야 한다는 요구. EyeDropper API는 Secure Context
전용이라 HTTP에서는 API 자체가 없어 코드로 우회 불가.

- **방식**: HTTPS/localhost면 기존 EyeDropper 그대로, HTTP면 보드 배경 이미지를 offscreen canvas에 그린 뒤
  클릭 좌표 픽셀 색상을 샘플링하는 클릭 모드로 폴백. html2canvas 없이 `new Image()` + `canvas.getContext('2d')`만 사용.
- **UX**: HTTP 접속 시 스포이드 버튼 클릭 → "보드 위를 클릭하여 색상을 추출하세요. ESC로 취소" 토스트 →
  보드 전체에 crosshair 커서 오버레이(z-[500]) → 클릭 시 배경 PNG에서 픽셀 추출 → 색상 적용 → 모드 해제.
  ESC 키로 취소 가능(Delete 키 핸들러에 Escape 분기 추가).
- **object-contain 보정**: 배경 이미지가 `object-contain`으로 렌더되어 레터박스가 생기므로,
  클릭 좌표를 이미지 실제 픽셀 좌표로 변환 시 imgAspect/boardAspect 비교로 offsetX/offsetY 보정 적용.
- **한계**: 배경 이미지에서만 추출 가능 (위젯 텍스트/배경 색상 클릭 추출 불가). 이미지가 cross-origin이면
  `img.onerror`에서 "서버 CORS 설정 확인" 토스트. 같은 서버에서 서비스하는 고객사 HTTP 환경은 same-origin이라 문제없음.
- **신규 state**: `colorPickingMode: { field, widgetId } | null`
- **신규 함수**: `sampleColorFromBoardClick(e)` — 클릭 좌표 → 이미지 픽셀 → hex 변환
- 관련 파일: `src/app/pages/board/TaskCreate.tsx`
- 검증: `npx nx run taskboard:lint` 0 errors, `typecheck-staged.js` 통과. **브라우저 실측 미실시**.

## 2026-06-23 세션37

### 스포이드 — "Chrome/Edge 전용" 안내가 떴는데 Chrome/Edge에서도 안 되던 원인
배경: 사용자가 Chrome/Edge 둘 다에서 스포이드를 눌러도 "Chrome/Edge 브라우저에서만 지원됩니다" 토스트가
뜬다고 제보.

- **원인**: `EyeDropper`는 `crypto.randomUUID()`와 같은 종류의 **secure context(HTTPS 또는
  localhost) 전용 API**(AGENTS.md에 이미 같은 함정이 `createUUID` 관련해서 기록돼 있음) — HTTP+IP로
  접속하는 개발계에서는 Chrome/Edge여도 `window.EyeDropper` 자체가 존재하지 않음. 기존 코드는
  `'EyeDropper' in window` 단일 체크라 "브라우저 미지원"과 "비보안 접속이라 API가 안 노출됨"을 구분
  못 해서, 실제로는 HTTP 접속 때문인데 메시지는 "Chrome/Edge에서만 지원"이라고 떠서 더 헷갈리게 했음.
- **수정**: `window.isSecureContext` 체크를 추가해 분기 — `false`면(HTTP+IP 접속 등) "보안 연결
  (HTTPS) 또는 localhost에서만 동작합니다" 메시지로 정확히 안내. `true`인데도 `EyeDropper`가 없으면
  (Firefox/Safari) 기존 "Chrome/Edge 전용" 메시지 유지.
- **한계**: 코드로 HTTP 환경에서 EyeDropper를 동작시킬 방법은 없음(브라우저 보안 정책) — 실제로
  쓰려면 운영 환경을 HTTPS로 접속하거나, 개발 중이면 `localhost`로 접속해야 함.
- 관련 파일: `src/app/pages/board/TaskCreate.tsx` (`handlePickColorFromScreen`)
- 검증: `npx eslint --fix` + `typecheck-staged.js` 둘 다 통과(기존 경고만 유지). 실제로 HTTP/HTTPS
  양쪽에서 메시지가 다르게 뜨는지 확인은 미실시.

## 2026-06-23 세션36

### useCtiqWebSocket — 5초마다 재구독하던 걸 "구독 1회 + 서버 푸시 델타 병합"으로 변경
배경: BE(`CtiqWebSocketHandler`, BT-ADMIN-SERVICE-TASKBOARD 쪽 작업)를 "구독 1회 + 변경분만 푸시"
구조로 재설계하면서 FE도 짝을 맞춤. 기존엔 `ws.onopen`에서 1회 보낸 뒤 `setInterval(send, 5000)`로
**같은 구독 메시지를 5초마다 반복 전송**했고, 서버 응답도 항상 "요청한 모든 id의 전체 값"이라
`setDataByHashKey(msg.data)`로 통째로 교체해도 무방했음. BE가 이제 변경분만 보내므로 그대로 두면
안 바뀐 id가 매번 사라져버림.

- **재전송 루프 제거**: `sendTimer`/`intervalMs` 삭제 — `ws.onopen`에서 구독을 1번만 전송. 화면
  (디스플레이) 전환으로 `subscriptions`(→`subsKey`)가 바뀌면 effect가 재실행되어 소켓을 새로 맺고
  다시 1회 구독.
- **델타 병합**: `onmessage`에서 더 이상 `setDataByHashKey(msg.data)`로 통째 교체하지 않고, 들어온
  hashKey의 id들만 기존 상태 위에 머지(`next[hashKey] = {...prev[hashKey], ...idMap}`) — 이번
  주기에 응답이 없던 id는 직전 값을 그대로 유지.
  - 구독이 바뀌는 시점(effect 재실행)엔 `setDataByHashKey({})`로 먼저 리셋 — 이전 화면에서 구독하던
    hashKey의 값이 새 화면 상태에 남아있지 않게.
- `useCtiqWebSocket(subscriptions, intervalMs)` → `useCtiqWebSocket(subscriptions)` — 더 이상 쓰는
  곳 없는 `intervalMs` 파라미터 제거(TaskView.tsx/RollingDisplay.tsx 둘 다 인자 없이 호출 중이라
  호출부 변경 불필요).
- 관련 파일: `src/app/features/board/hooks/useCtiqWebSocket.ts`
- BE 쪽 변경: `BT-ADMIN-SERVICE-TASKBOARD/CHANGELOG.md` 참조(`CtiqWebSocketHandler` 재설계)
- 검증: `npx eslint --fix` + `typecheck-staged.js` 둘 다 통과. 실제 브라우저에서 델타 수신 시
  안 바뀐 위젯 값이 사라지지 않는지, 화면 전환 시 이전 값이 잔류하지 않는지 확인 필요.

## 2026-06-30 세션6

### task-create 3건 수정

#### 1. 빈 행 숨기기 — 테이블 위젯에서만 표시
- **원인**: `hideEmptyRows` 토글이 `['table-queue','table-group','table-agent','table-redis']` 조건 블록 밖에 있어 모든 위젯에서 표시됐음.
- **수정**: 해당 토글 div를 테이블 위젯 조건 블록(`selectedWidget.item.tableConfig` 존재 확인 포함) 안으로 이동.
- 관련 파일: `TaskCreate.tsx` (~line 4916)

#### 2. 섹션 배정 UI를 톱니바퀴 메뉴로 이동
- **배경**: 섹션을 왼쪽 패널에서 추가해도 위젯에 어떻게 배정하는지 찾기 어려운 UX 문제.
- **변경**:
  - `WidgetActionsMenu` (톱니바퀴 팝업) 하단에 "구역" 섹션 추가.
    - 등록된 구역 이름이 번호 칩(`1. A센터`, `2. B센터` …)으로 표시 — 클릭하면 토글 배정(재클릭 시 해제).
    - 새 구역명 입력 + [추가] 버튼 — 클릭 시 구역 생성 AND 이 위젯에 즉시 배정. Enter 키도 동작.
  - `w-40` → `w-52`로 팝업 폭 확대.
  - 우측 패널의 섹션 드롭다운(기존 방식) 제거.
  - `CanvasWidgetFree` / `CanvasWidgetGrid` 두 컴포넌트에 `sections`, `onSectionChange`, `onAddSection` props 추가.
- 관련 파일: `TaskCreate.tsx` (`WidgetActionsMenu`, `CanvasWidgetFreeProps`, `CanvasWidgetGridProps`, 호출 사이트)

- 검증: `npx eslint --fix` 에러 0.

## 2026-06-30 세션5

### 섹션(Section) 기능 구현 — 한 레이아웃에서 여러 뷰 그룹을 구역별로 할당

**배경**: A센터(ㄱ,ㄴ,ㄷ그룹)와 B센터(ㄹ,ㅁ,ㅂ그룹)처럼 한 전광판 화면 안에서 영역별로 다른 뷰 그룹 데이터를 보여야 하는 요구.

#### 1. 타입 및 유틸 (`taskboard.types.ts`)
- `DroppedWidget`에 `sectionKey?: string` 필드 추가 — 위젯이 속한 섹션 키 (미설정 시 공통 위젯).
- `parseLayoutSections(layoutJson?)` 신규 함수 — `layoutJson`에서 `sections` 배열(string[]) 추출.

#### 2. 편집 화면 (`TaskCreate.tsx`)
- `sections: string[]` / `newSectionName: string` state 추가.
- `isDirty` 비교에 `sections` 포함.
- `updateWidgetMeta`의 Pick 타입에 `'sectionKey'` 추가.
- `handleSave` 시 `layoutJson`에 `sections` 포함(비어있으면 필드 생략).
- **위젯 미선택 패널 — 섹션 관리 UI**: 섹션 이름 입력 + 추가(+) 버튼, 등록된 섹션 목록 + 삭제(×) 버튼.
- **위젯 선택 패널 — 섹션 드롭다운**: `sections.length > 0`일 때 "타이틀 표시" 위에 드롭다운 표시. 옵션: "공통 (모든 섹션)" + 등록된 섹션들.

#### 3. 목록/실행 팝오버 (`TaskList.tsx`)
- `DisplayPickerPopover`에 섹션 모드 분기 추가.
  - `hasSections` 감지 (`parseLayoutSections` 사용).
  - **섹션 모드**: `sectionDisplayMap(섹션키→displayId)` state, 섹션별 뷰 그룹 선택 드롭다운.
  - `buildSectionUrl()` — 모든 섹션에 뷰 그룹이 지정된 경우 `?s=A:1,B:2,C:3` URL 생성.
  - "새창으로 실행" / "공개 링크 복사" 버튼 (모든 섹션 선택 완료 시 활성화).
  - **단일 모드**: 기존 동작 그대로 유지.

#### 4. 실행 화면 (`TaskView.tsx`)
- `SectionSelections = Record<string, TaskboardDisplaySelection>` 타입 추가.
- `SingleLayoutView` props에 `sectionSelections?: SectionSelections` 추가.
- WS 구독: 모든 섹션 selection을 합산한 `selectedQueueIds/GroupIds/AgentIds`로 단일 소켓 구독.
- `renderWidget`: `widget.sectionKey`가 있으면 해당 섹션의 selection을 `effectiveSelection`으로 사용, 없으면 기본 selection 사용.
- `TaskView` 진입점: `?s=A:1,B:2,C:3` 파라미터 파싱 → `sectionSelections` 조립 → `SingleLayoutView`에 전달.
- `useSearchParams` import 추가.

#### 5. 라우팅 (`routes.tsx`)
- 기존: `task-view/:layoutId/:displayId` (displayId 필수)
- 추가: `task-view/:layoutId` — 섹션 모드에서 `?s=` 쿼리로만 접근하는 경우 처리.

- 관련 파일: `features/board/types/taskboard.types.ts`, `pages/board/TaskCreate.tsx`, `pages/board/TaskList.tsx`, `pages/board/TaskView.tsx`, `src/app/routes.tsx`
- 검증: `npx eslint --fix` 에러 0, 경고 28개(모두 기존 코드 사전 존재 항목). BE 변경 없음.

## 2026-06-30 세션4

### 좌측 패널 UI 개선 3건

#### 1. Redis 섹션 헤더 명칭 변경
- "Redis 해시 키" → "Redis" 로 축약.
- 관련 파일: `TaskCreate.tsx` (`RedisHashSection` 섹션 헤더 span)

#### 2. 외부 API · DB Query → "외부 항목" 섹션으로 분리
- 기존: `FixedItemsSection`(위젯 항목) 말단에 `ExternalApiSection`·`DbQuerySection` 직접 삽입.
- 변경: 두 섹션을 `FixedItemsSection`에서 제거하고, 초록색 인디케이터 닷을 가진 접을 수 있는 독립 섹션 `ExternalItemsSection`(외부 항목)으로 분리. 좌측 패널 렌더링: `RedisHashSection → FixedItemsSection → ExternalItemsSection`.
- 관련 파일: `TaskCreate.tsx` (`ExternalItemsSection` 신규, `FixedItemsSection` 내 두 섹션 제거, 메인 패널 렌더 추가)

#### 3. 전광판 목록 — 새 창으로 열기 버튼 추가
- 뷰 그룹 선택 팝오버에서 기존 [이름 클릭 → 현재 탭 이동] 외에, 각 행 우측에 외부링크(↗) 아이콘 버튼 추가.
- 클릭 시 `window.open(viewPath, 'taskview_{layoutId}_{displayId}', 'noopener,noreferrer')` — 같은 레이아웃/뷰의 창이 이미 열려 있으면 그 창을 포커스.
- 관련 파일: `TaskList.tsx` (`DisplayPickerPopover` 내 각 뷰 그룹 행)
- 검증: `npx eslint --fix` 에러 0.

## 2026-06-30 세션3

### ExternalApi 위젯 — 요청 헤더 설정 기능 추가

- **기능**: 외부 API 호출 시 커스텀 HTTP 헤더를 지정할 수 있게 함. 형식은 Linux curl `-H` 스타일 — 한 줄에 헤더 하나, `Key: Value`. 빈 줄·`#` 주석 줄은 무시.
- **타입**: `CallDataItem.externalApiHeaders?: string` 필드 추가 (`taskboard.types.ts`)
- **API**: `taskboardApi.testExternalApiUrl(url)` → `testExternalApiUrl({ url, headers? })` 시그니처 변경 (`taskboardApi.ts`)
- **TaskCreate.tsx**:
  - `ExternalApiSection`: `headers` 상태 추가, URL 입력 아래에 헤더 textarea 추가, `handleTest`·`handleAdd` 에 headers 전달
  - `ExternalApiWidgetProps`: `onUpdate` 타입 + UI textarea 추가, `handleRetest`에 headers 전달
  - `updateWidgetExternalApi` 타입에 `externalApiHeaders` 추가
- **TaskView.tsx**: `subscribeExternalApi(url, intervalMs, headers?, onValue)` 시그니처 변경. 같은 URL이라도 헤더가 다르면 별도 캐시 엔트리(`url\0headers` 키). `useEffect` deps에 `externalApiHeaders` 추가.
- **백엔드** (`ExternalApiTestController.java`): `RestTemplate.getForEntity` → `exchange(url, GET, HttpEntity(httpHeaders), Object.class)`로 교체. `ExternalApiTestRequest`에 `headers` 필드 추가, `parseHeaders()` 메서드로 `Key: Value` 파싱 → `HttpHeaders` 구성.
- 관련 파일: `taskboard.types.ts`, `taskboardApi.ts`, `TaskCreate.tsx`, `TaskView.tsx`, `ExternalApiTestRequest.java`, `ExternalApiTestController.java`
- 검증: `npx eslint --fix` 에러 0.

## 2026-06-30 세션2

### PIVOT 방식 변경 — 자동 강제 → 사용자 수동 설정

- **변경 전**: `IC:GROUP:REASON:*` 해시를 쓰면 무조건 PIVOT 모드로 강제 전환.
- **변경 후**: `tableConfig.pivot.rowKey` + `pivot.colKey` 가 모두 설정됐을 때만 PIVOT 활성화. 빈값이면 flat 테이블로 원시 데이터 표시. 해시 종류와 무관하게 수동 설정.
- **UI 추가**: 속성 패널 `table-redis` 전용 "PIVOT" 섹션 — 행 키/컬럼 키/값 키 세 가지 입력 필드. 모두 비우면 flat 표시로 복귀.
- **WS 구독**: PIVOT 모드(`rowKey+colKey` 설정)이거나 `IC:GROUP:REASON:*` 계열이면 컬럼 필터 없이 전체 수신 유지.
- 관련 파일: `RedisTableWidget.tsx` (PIVOT 트리거 `if (groupReason)` → `if (pivotCfg?.rowKey && pivotCfg?.colKey)`, `collectRedisTableWsSubscriptions` 판단 로직), `TaskCreate.tsx` (PIVOT 섹션 UI)
- 검증: `npx eslint` 에러 0.

## 2026-06-30

### 버그 수정 3건

#### 1. PIVOT 행 번호 컬럼(`__rowNum`) 미표시 수정
- **원인**: PIVOT 렌더 경로가 라인 428의 `__rowNum` 주입 전에 `return`으로 빠져나가므로, 컬럼 목록에 `__rowNum`을 추가해도 PIVOT 테이블에서는 항상 무시됐음.
- **수정**: PIVOT 섹션에 `pivotRowNumCol` 변수를 추가하고, 컬럼 목록에 `__rowNum`이 있으면 헤더 `<th>`와 각 데이터 행의 첫 번째 `<AnimatedTableCell>`로 `ri + 1` 렌더.
- 관련 파일: `src/app/features/board/components/RedisTableWidget.tsx`

#### 2. 빈 행 숨기기 옵션 신규 (`hideEmptyRows`)
- **배경**: `IC:CTIQ:0` 같이 Redis에 ID만 등록되고 실데이터가 없는 행이 많은 해시에서 의미 없는 빈 행이 수십 개 렌더됨.
- **로직**: 설정된 컬럼(가상 키 `__rowNum`/`__id`/`__systemId` 제외) 중 하나라도 비어있지 않은 행만 표시.
- **UI**: 속성 패널 "행 번호 컬럼 표시" 아래에 "빈 행 숨기기" 토글 추가.
- 관련 파일: `taskboard.types.ts` (`hideEmptyRows` 필드), `RedisTableWidget.tsx` (필터 로직), `TaskCreate.tsx` (토글 UI)
- 검증: `npx eslint` 에러 0.

## 2026-06-29 (7)

### 버그 수정 — IC:GROUP:REASON PIVOT 행/컬럼 추출 오류

- **원인**: PIVOT 코드가 `IC:GROUP:REASON:{groupId}:{mediaType}` 다중 키 구조(그룹별 분리)를 전제로 설계됐으나, 실제 데이터는 `IC:GROUP:REASON:0` 단일 해시에 모든 `(NODE_ID × REASON_CODE)` 조합이 들어 있는 구조.
  - `extractGroupIdFromGroupReasonKey('IC:GROUP:REASON:0')` → 1-세그먼트라 그룹 ID 없이 풀 키 반환 → **행 1개만 생성**
  - `uniqueCols = Object.keys(hash)` → 해시 필드키(`0000053` 등 `{NODE_ID}{REASON_CODE}` 합성값) → **컬럼 헤더 쓰레기**
- **수정**: PIVOT 행/컬럼을 해시 구조가 아닌 **entry JSON 값** 에서 읽도록 전면 재작성.
  - `pivotColKey` 변수 추가 (`tableConfig.pivot.colKey ?? 'REASON_CODE'`)
  - `uniqueCols` = 각 entry 의 `pivotColKey` 필드값 집합 (숫자 정렬) → `'0','1','2',...,'12'`
  - `pivotMap` = entry 의 `pivotRowKey`(NODE_ID) × `pivotColKey`(REASON_CODE) → `pivotValueKey`(AGENT_CNT) 합산
  - 결과: 행 = NODE_ID (1,2,3,5,6,99), 컬럼 = REASON_CODE (0~12), 셀 = AGENT_CNT
- **기본값**: `rowKey='NODE_ID'`, `colKey='REASON_CODE'`, `valueKey='AGENT_CNT'` — 별도 설정 없이 동작.
- 관련 파일: `src/app/features/board/components/RedisTableWidget.tsx` (PIVOT 섹션 ~line 196)
- 검증: `npx eslint --fix` 에러 0.

## 2026-06-29 (6)

### 버그 수정 2건

#### 1. ExternalApi 위젯 — 같은 URL 중복 REST 호출 제거

- **원인**: `TaskView.tsx`의 `ViewValueWidget`이 컴포넌트 단위로 `setInterval`을 소유해, 같은 `externalApiUrl`을 쓰는 위젯이 N개면 N개의 타이머가 동시에 돌았음.
- **수정**: 모듈 레벨 pub-sub 캐시(`externalApiCache: Map<url, {raw, subscribers, timer}>`) + `subscribeExternalApi(url, intervalMs, onValue)` 헬퍼 추가. 첫 구독자가 타이머를 생성하고 fetch 결과를 `subscribers.forEach`로 브로드캐스트, 후속 구독자는 기존 타이머를 공유하며 `raw` 캐시 값을 즉시 수신. 마지막 구독자가 unsubscribe하면 타이머 제거. `ViewValueWidget.useEffect`를 기존 `setInterval` → `subscribeExternalApi` 반환값(cleanup)으로 교체.
- **효과**: 같은 URL의 위젯 N개 → REST 호출 1회/인터벌.
- 관련 파일: `src/app/pages/board/TaskView.tsx` (모듈 레벨 `externalApiCache`, `subscribeExternalApi` 신규, `ViewValueWidget.useEffect` 수정)
- 검증: `npx eslint --fix` 에러 0.

#### 2. 테이블 위젯 — 행 번호 컬럼 표시 옵션

- **기능**: 테이블 속성 패널에 "행 번호 컬럼 표시 (#)" 토글 추가. ON이면 컬럼 목록 앞에 `{ key: '__rowNum', label: '#', width: '6%', align: 'center' }` 추가, OFF이면 제거.
- **캔버스 미리보기**: `TableWidget` 내 `sampleRows`는 `__rowNum`을 포함하지 않으므로, `col.key === ROW_NUMBER_COLUMN_KEY`일 때 `ri + 1`을 셀 값으로 직접 렌더하도록 수정.
- **실행화면**: `RedisTableWidget.tsx`가 이미 `rows.map((row, i) => ({ ...row, __rowNum: i + 1 }))`를 계산하므로 별도 수정 없이 동작.
- 관련 파일: `src/app/pages/board/TaskCreate.tsx` (`TableWidget` 캔버스 셀 렌더 + 속성 패널 토글)
- 검증: `npx eslint --fix` 에러 0.

## 2026-06-29 (4)

### 버그 수정 — executeDbQuery BFF 응답 언래핑 오류

- **원인**: BFF `DynamicAggregationService.invokeStepWithContentTypeCheck()`는 single-step JSON 응답이 List일 때 `{ "value": [...] }` 맵으로 감싸서 `ApiResponse.ok(data)`를 반환한다. 따라서 FE의 `response.data?.data`는 배열이 아닌 `{ value: [...] }` 객체가 되어, `Array.isArray()` 검사 실패 → "쿼리 결과가 없습니다 (0건)" 토스트 출력 + `extractDbQueryResult`/`extractDbResult`가 `String(vals[0])` = "[object Object]" 반환.
- **수정**: `taskboardApi.ts`의 `executeDbQuery` 반환 전에 `{ value: [...] }` 래퍼를 감지해 내부 배열을 꺼내 반환하도록 수정. 영향 범위 — `handleFetchColumns`(컬럼 조회), `DbQuerySection.handleTest`(테스트), `ExternalApi db: URL` REST 폴링, `DbQueryWidgetProps.handleRetest`(재테스트) 전부 커버.
- **3번 API 콜 원인**: 버튼 클릭 1회 + TaskView ExternalApi `db:custom1` 위젯 2개가 동시에 폴링 — 별도 버그 아님.
- 관련 파일: `features/board/api/taskboardApi.ts`
- 검증: `npx eslint --fix` 에러 0.

## 2026-06-29 (3)

### DbQuery 위젯 — WS push 전환 + 컬럼 조회 UX + WS 재연결 감소

#### TaskCreate.tsx — DbQueryWidgetProps 개선
- **"컬럼 조회" 버튼 신규**: `handleFetchColumns()` — `taskboardApi.executeDbQuery(key)` 호출 후 `Object.keys(result[0])`로 실제 컬럼명 목록을 수집, `fetchedColumns` state에 저장.
- **컬럼 입력 드롭다운 전환**: `fetchedColumns.length > 0`이면 `<select>`로 전환(조회된 컬럼명 선택), 조회 전엔 기존 text 입력 그대로.
- **재테스트 오류 표시**: `handleRetest()`에서 catch한 실제 오류 메시지(`retestError`)를 "쿼리 실행 실패: {메시지}" 형태로 화면에 표시. 이전엔 에러가 있어도 빈 상태로만 남았음.
- **갱신 주기 입력 제거**: WS push(약 5초 고정)로 전환하면서 "갱신 주기(초)" 입력 필드 삭제. 대신 "실행화면에서 WebSocket으로 실시간 수신합니다 (갱신 주기: 약 5초)" 안내 문구 표시.
- **dbQueryKey 변경 시 컬럼 목록 초기화**: `dbQueryKey` 변경 시 `fetchedColumns = []`로 리셋해 이전 키의 컬럼이 잔류하지 않게.

#### redisValue.ts — `collectDbQueryWsSubscriptions` 신규
- DbQuery 위젯(`category==='DbQuery'`)의 고유 `dbQueryKey`를 수집해 WS 구독 목록(`CtiWsSubscription`) 반환.
- `hashKey: 'DB:QUERY'`, `ids: [key1, key2, ...]` 형태 — 여러 DbQuery 위젯도 단일 구독 1건으로 묶음.

#### TaskView.tsx — DB:QUERY WS 데이터 수신 + WS 재연결 감소
- **REST 폴링 제거**: `ViewValueWidget` 내부의 `dbQueryValue` useState + useEffect(REST 폴링) 완전 삭제.
- **WS 데이터 읽기**: `redisData?.['DB:QUERY']?.[widget.item.dbQueryKey!]`를 `Record<string, string>`으로 읽어 `dbQueryColumn`으로 값 추출(대소문자 폴백 포함). 컬럼 미지정 시 첫 번째 값 사용.
- **`isMasterLoading` 게이트**: `queueLoading || agentLoading || groupLoading`이 true인 동안 `subscriptions = []` — 마스터 데이터 3개가 모두 로드된 뒤 1회만 WS 연결. 기존엔 각 쿼리가 순서대로 완료될 때마다 subscriptions가 바뀌어 WS가 최대 3번 재연결됐음.
- **`collectDbQueryWsSubscriptions` 연동**: subscriptions 구성에 DbQuery 위젯 구독 추가.

#### RollingDisplay.tsx — DB:QUERY WS 데이터 수신 + WS 재연결 감소
- `RollingPlayer`에도 동일한 `isMasterLoading` 게이트 적용(위와 같은 이유).
- `RollingValueWidget`: `isDbQuery`/`dbRecord`/`dbQueryValue` 계산 추가 — `redisData?.['DB:QUERY']?.[key]`에서 읽음. `displayValue`에 DbQuery 분기 추가(`isEtcClock ? … : isDbQuery ? dbQueryValue : …`).

- 관련 파일: `src/app/pages/board/TaskCreate.tsx`, `src/app/pages/board/TaskView.tsx`, `src/app/features/board/components/RollingDisplay.tsx`, `src/app/features/board/utils/redisValue.ts`
- 검증: `npx eslint --fix` 에러 0, `npx tsc --noEmit -p apps/taskboard/tsconfig.app.json` 에러 0. **브라우저 실측 미실시** — BE TASKBOARD 재시작 후 확인 필요.
- BE 쪽 변경: `BT-ADMIN-SERVICE-TASKBOARD/CHANGELOG.md` 참고 (`TaskboardDbQueryPoller` 신규, `CtiqWebSocketHandler` DB:QUERY 처리).

## 2026-06-29 (2)

### 기능 — ExternalApi 위젯에서 DB 쿼리 호출 (`db:custom1` 프리픽스)

- **`taskboardApi.executeDbQuery(key)` 신규**: `GET /taskboard-db-query?key=customN` — yml에 등록된 커스텀 DB 쿼리 실행
- **`TaskView.tsx` 수정** (ValueWidget 컴포넌트): `fetchValue` 내부에 `db:` 프리픽스 탐지 추가.
  `externalApiUrl`이 `db:`로 시작하면 `executeDbQuery(url.slice(3))` 호출, 아니면 기존 `testExternalApiUrl` 호출
- **`TaskCreate.tsx` 수정** (ExternalApiAddForm, ExternalApiSettings 컴포넌트):
  - `handleTest`: `db:` 시작이면 `executeDbQuery`로 분기
  - `handleRetest`: `db:` 시작이면 `executeDbQuery`로 분기
  - URL 입력 placeholder에 `db:custom1` 예시 추가
- eslint 에러 0, `tsc --noEmit -p tsconfig.app.json` 에러 0
- BE 쪽 변경: `BT-ADMIN-SERVICE-TASKBOARD/CHANGELOG.md` 참고 (TaskboardDbQueryController + yml + V95 마이그레이션)
- **사용 방법**: TaskCreate 외부 API 위젯 URL에 `db:custom1` 입력 → BE의 `application-taskboard-queries.yml`의 `custom1.sql` 실행 → 결과(List<Map>) 반환 → `externalApiJsonPath`로 원하는 값 추출
- **재시작 필요**: BE TASKBOARD 재기동 + V95 Flyway 마이그레이션 적용 필요

## 2026-06-29

### WebSocket 프레임 초과 수정(BE) + 외부 API 위젯 신규(FE)

#### BE — CtiqWebSocketHandler 분할 전송 (BT-ADMIN-SERVICE-TASKBOARD)
- **원인**: BFF의 `ReactorNettyWebSocketClient`가 `maxFramePayloadLength = 256 KB`로 프록시하는데,
  와일드카드 hashKey(`IC:GROUP:REASON:0` 등)가 37개 실제 키로 확장된 초기 스냅샷이 단일 프레임으로
  전송돼 BFF에서 `content length exceeded 262144 bytes` 오류로 프록시 거부됨.
- **수정**: `CtiqWebSocketHandler.java`에 `MAX_CHUNK_BYTES = 200KB` 상수 추가.
  - `forceFull=true`(초기 스냅샷): hashKey 단위로 1건씩 별도 프레임으로 전송(`sendChunk` 반복).
  - `forceFull=false`(5초 diff): 200KB 임계치 단위로 청크 분할 후 전송(`sendChunked` 추가).
- 관련 파일: `BT-ADMIN-SERVICE-TASKBOARD/.../CtiqWebSocketHandler.java`

#### FE — 외부 API 위젯 신규 (TaskCreate.tsx)
- `CallDataItem.category`에 `'ExternalApi'` 추가 + 전용 필드 3개 신규:
  - `externalApiUrl?: string` — full URL
  - `externalApiJsonPath?: string` — 점 표기법 경로 (예: `data.score`)
  - `externalApiSampleJson?: string` — CORS 차단 시 수동 입력 폴백 JSON
- **`ExternalApiSection` 컴포넌트**(좌측 팔레트 "외부 API" 섹션):
  - URL 입력 + "테스트" 버튼 → `fetch(url)` 후 JSON 수신 성공 시 키 경로 목록(flattenJsonPaths, depth≤3)
    선택 또는 직접 입력으로 표시 값 경로 지정.
  - 실패(CORS/네트워크) 시 textarea로 샘플 JSON 직접 입력.
  - "추가" 버튼으로 `DraggableSourceItem` 목록에 추가(캔버스로 드래그 가능).
- **`ExternalApiWidgetProps` 컴포넌트**(우측 속성 패널, `category==='ExternalApi'` 일 때):
  - URL/값경로/샘플 JSON 편집 + "재테스트" 버튼(미리보기 값 갱신).
- `getWidgetDataSourcePath`: `ExternalApi` 케이스 추가 (`외부 API > {url}`).
- `updateWidgetExternalApi` 핸들러 추가.
- `WidgetContent`: 별도 분기 불필요 — `sampleValue` fallback 그대로 사용.
- 관련 파일: `src/app/features/board/types/taskboard.types.ts`,
  `src/app/pages/board/TaskCreate.tsx`
- 검증: `npx eslint --fix` — 에러 0, 기존 경고 7건만 유지. **브라우저 실측 미실시** — 사용자가
  직접 확인 필요(URL 테스트, 키 경로 선택, 캔버스 드래그, 우측 패널 재테스트).

#### FE — 외부 API 갱신 주기 설정 (TaskCreate.tsx)
- `CallDataItem.externalApiIntervalSec?: number` 신규 필드 추가 (기본 30초).
- **`ExternalApiSection`**(좌측 팔레트):
  - "위젯 이름" 입력 아래에 "갱신 주기(초)" 숫자 입력 추가(기본 30, 범위 5~3600).
  - "추가" 버튼 클릭 시 `externalApiIntervalSec` 값이 `CallDataItem`에 포함됨.
- **`ExternalApiWidgetProps`**(우측 속성 패널):
  - "갱신 주기 (초)" 숫자 입력 추가 — 캔버스에 배치된 위젯의 주기를 사후 수정 가능.
  - 안내 문구: "실행화면에서 이 간격으로 API를 자동 갱신합니다."
- `updateWidgetExternalApi` 핸들러의 Pick 타입에 `externalApiIntervalSec` 포함.
- 관련 파일: `src/app/features/board/types/taskboard.types.ts`,
  `src/app/pages/board/TaskCreate.tsx`
- 검증: `npx eslint --fix` — 에러 0, 경고 7건(기존 유지, 신규 없음). **브라우저 실측 미실시**.
- ⚠️ **미구현**: TaskView/RollingDisplay 실행화면에서 `externalApiIntervalSec`를 읽어
  `setInterval`로 실제 자동 갱신하는 로직은 별도 작업 예정.

### 소스 전체 검토 — 불필요한 코드 제거

#### `ctiRedisApi.ts` — `getRedisGroupValuesBatch` 제거
- WebSocket 마이그레이션 이전에 REST 배치 조회로 사용하던 `getRedisGroupValuesBatch` 함수 삭제.
- 정의는 `ctiRedisApi.ts`에 있었으나 코드베이스 전체에서 호출하는 곳이 없는 데드코드였음(Grep으로 확인).
- 관련 파일: `src/app/features/board/api/ctiRedisApi.ts`

#### `TaskBg.tsx` — 불필요한 `useCallback` 래퍼 제거
- `leafCells`/`dividers` 두 함수를 `useCallback`으로 감싸던 코드 제거.
  - 두 함수 모두 JSX 이벤트 핸들러로 전달되거나 `useEffect` 의존성 배열에 쓰이지 않고, 렌더·이벤트 핸들러 내에서 즉시 호출만 함 → 프로젝트 규칙(React Compiler 자동 최적화, `useCallback` 명시적 필요 없으면 금지)에 따라 제거.
  - `import`에서 `useCallback` 제거, 호출부를 `getLeafCells(...)` / `getNodeDividers(...)` 직접 호출로 교체.
- 검증: `npx eslint --fix` 에러 0(기존 경고 8건 유지), `npx tsc --noEmit -p apps/taskboard/tsconfig.app.json` 에러 0.
- 관련 파일: `src/app/pages/board/TaskBg.tsx`

## 2026-06-23 세션35

### WS 연결이 "1009 too big"으로 즉시 끊기던 진짜 원인 — buildSelectionIdsByHashKey 접두사 오매칭
배경: 그룹별 합계(groupBy) 추가 직후 "그 다음부터 다른 값들이 안 나온다"는 제보 + 서버 로그에
`CloseStatus[code=1009, reason=The decoded text message was too big for the output buffer ...]`로
WS 연결이 열리자마자 바로 끊기는 패턴. 사용자가 실제 구독 요청 페이로드를 캡처해서 확인한 결과
`IC:GROUP:REASON:2025001013:0`의 `ids`가 `IC:GROUP:0`(그룹 전체 compositeKey 140개)과 완전히
동일했고, 나머지 49개 형제 `IC:GROUP:REASON:*` 키는 정상(`["0000063"]` 1개)이었음 — 즉 groupBy
기능 자체가 아니라 **그 전부터 있던 접두사 매칭 버그**가 이번에 처음 터진 것으로 확인됨(타이밍상
groupBy 작업 중 "∑ 전체 합계"로 REASON 데이터셋을 처음 건드리면서 드러남).

- **원인**: `buildSelectionIdsByHashKey`의 `GROUP_HASH_PREFIX='IC:GROUP:'`/`QUEUE_HASH_PREFIX='IC:CTIQ:'`
  매칭이 단순 `hashKey.startsWith(prefix)`라서, `IC:GROUP:REASON:*`(이석사유, 완전히 다른 데이터셋)나
  `IC:CTIQ:TSPEC:`/`IC:CTIQ:WAIT:`/`IC:CTIQ:IN_TOT` 같은 "접두사는 같지만 그 안에 더 들어간(nested)"
  다른 데이터셋까지 일반 그룹/큐 테이블로 오인 — 거기에 마스터 전체 id 목록(그룹 compositeKey
  140개/큐 376개)을 그대로 끼워 넣어버림. 이 거대한 ids가 그 1개 hashKey의 WS 응답 페이로드를
  Tomcat 텍스트 버퍼 한도 이상으로 부풀려 연결 자체가 거부됐고, 소켓이 안 열리니 다른 모든 위젯
  값도 같이 안 나온 것.
- **수정**: 접두사 매칭에 "뒤에 남는 부분이 정확히 미디어타입 1개(콜론 없음)"인지 추가 검증(GROUP/
  QUEUE), AGENT는 "groupId:mediaType 정확히 2조각"인지 검증 — 조건에 안 맞으면 그 hashKey는 매칭
  대상에서 제외되어 위젯에 원래 바인딩된 단일 id(`redisField`)가 그대로 쓰임(하위 호환).
- 관련 파일: `src/app/features/board/utils/redisValue.ts`(`buildSelectionIdsByHashKey`)
- 검증: `npx eslint --fix` + `typecheck-staged.js` 둘 다 통과(기존 경고만 유지). 실제 WS 페이로드
  크기/연결 안정성 재확인은 미실시 — 사용자가 같은 위젯으로 재현해서 1009가 더 안 나는지 확인 필요.

## 2026-06-23 세션34

### 행 식별자 컬럼 자유화 + 단일값 Redis 위젯에도 그룹별 합계 추가
1. **행 식별자 고정 해제**: "+ 행 ID 컬럼 추가" 버튼(항상 `key:'__id'`만 추가)을 제거 — 이제 일반
   "필드명/표시명 + 추가" 입력에 `CTIQ_NAME`/`GROUP_NAME` 같은 임의 필드든, 해시 field 자체(예약어
   `__id`)든 똑같이 자유롭게 타이핑해서 추가. 플레이스홀더에 두 방식 다 안내(table-redis일 때만).
2. **단일값 Redis 위젯에 그룹별 합계 추가**: 세션33에서 Redis 테이블에만 있던 "그룹별 합계"를 단일값
   위젯에도 적용해달라는 요청. `CallDataItem.groupBy`(신규 — `byKey`/`aggKey`/`matchValue`) 추가 —
   redisField로 행 1개를 직접 가리키는 대신, 해시 전체를 byKey로 묶어 matchValue와 일치하는 그룹의
   aggKey 합계를 숫자 1개로 보여줌(예: `REASON_CODE`='5'인 그룹의 `AGENT_CNT` 합계). 그룹화 로직은
   테이블과 동일한 `groupSumRedisHashEntries()`(`redisValue.ts`로 추출해 공용화)를 재사용.
   `TaskView.tsx`/`RollingDisplay.tsx`의 단일값 위젯(`ViewValueWidget`/`RollingValueWidget`)에
   `useGetRedisHashEntries`로 5초 폴링 + 합계 계산을 추가해 `displayValue`를 대체. TaskCreate 디자인
   캔버스는 원래도 라이브 데이터를 안 보여주는 정적 미리보기라 이번에도 손대지 않음(설정 UI만 추가).
   속성 패널에 "그룹별 합계" 토글 + 기준 필드/일치값/합계 필드 입력 3개 추가(테이블의 그룹별 합계
   UI와 동일 패턴, `updateWidgetItemGroupBy` 신규).
- 관련 파일: `src/app/pages/board/TaskCreate.tsx`(컬럼 입력 플레이스홀더, 그룹별 합계 UI+핸들러),
  `src/app/pages/board/TaskView.tsx`, `src/app/features/board/components/RollingDisplay.tsx`,
  `src/app/features/board/utils/redisValue.ts`(`groupSumRedisHashEntries` 추출),
  `src/app/features/board/components/RedisTableWidget.tsx`(공용 헬퍼로 교체),
  `src/app/features/board/types/taskboard.types.ts`(`CallDataItem.groupBy`)
- 검증: `npx eslint --fix`(신규 경고 2건은 `??`로 정리 후 재실행해 기존 경고만 남김) +
  `typecheck-staged.js` 둘 다 통과. 실제 브라우저 동작 확인은 미실시.

## 2026-06-23 세션33

### Redis 테이블 — 행 ID 컬럼, 스크롤, 컬럼 계산식, 그룹별 합계 + 기본 현황표 3종 팔레트 제거
1. **기본 현황표 제거**: 큐/그룹/상담사 현황표(`table-queue`/`table-group`/`table-agent`)를
   `TABLE_WIDGET_ITEMS` 팔레트 배열에서 제거 — 이제 팔레트엔 "Redis 테이블"만 남음. 렌더링/매핑
   코드(`buildLiveTableRows`, 미디어타입 select 목록 등)는 그대로 둠 — 이미 저장된 레이아웃이 그
   3종을 참조 중이면 깨지지 않게.
2. **Redis 테이블 보강**:
   - 행이 많을 때 잘리던 문제 — 테이블 wrapper를 `overflow-hidden` → `overflow-y-auto`로 변경(스크롤
     지원).
   - "행 ID 컬럼 추가" 버튼 신규 — 예약 키(`__id`)를 직접 타이핑해야 했던 걸 원클릭으로. 누르면
     `key: '__id'`(해시 field 자체) 컬럼이 추가됨.
3. **컬럼 계산식**: `TableColumn.calc`(신규 타입 `TableColumnCalc`/`TableColumnCalcOperand`) — 계산식
   위젯과 동일한 수식 평가기(`evaluateFormula`)를 재사용하되, 피연산자가 캔버스 위젯이 아니라 **같은
   행의 다른 JSON 필드명**이라는 점만 다름. 속성 패널의 컬럼 ⚙ 편집기에 "계산식" 토글 추가 — 켜면
   수식 입력 + 변수(A,B,C...) 드롭존이 뜨고, 좌측 탐색기에서 Redis 필드를 드롭존에 드래그하면
   `operand.field`가 그 필드명으로 채워짐(계산식 위젯의 🔗 드래그 UX와 동일 패턴,
   `TableColCalcOperandDropZone` 신규). `handleDragEnd`에 `table-col-operand-` 드롭 처리 분기 추가.
4. **그룹별 합계(Group By)**: `tableConfig.groupBy: { byKey, aggKey }` 신규 — 해시의 모든 행을 펼치는
   대신 `byKey` 필드값으로 묶어서 `aggKey`를 합산한 1행씩만 보여줌(예: `IC:GROUP:REASON:{groupId}:
   {mediaType}`에서 `REASON_CODE`별 `AGENT_CNT` 합계 — 사용자가 실제로 요청한 "선택한 그룹의 사유별
   상담사 수 합계" 케이스). 속성 패널에 토글 + 기준 필드/합계 필드 입력 2개 추가.
- **사용자가 공유한 "이상한 Redis 데이터 형식"에 대한 확인 요청**: 붙여준 값이 `{"AGENT_CNT":0,...}`
  같은 JSON 중괄호 없이 11개씩 끊어진 숫자 나열이었는데, 그 순서(AGENT_CNT, CENTER_ID, DB_UPDATE_SEC,
  DB_UPDATE_TIME, DI_UPDATE_TIME, GROUP_ID, GROUP_NAME, MEDIA_TYPE, NODE_ID, REASON_CODE,
  SERVICE_MEDIA_TYPE)가 `IC-REDIS-spec.md`의 `IC:GROUP:REASON:*`(DS_GROUP_NRDY_ASPEC) 컬럼 정의와
  정확히 일치함 — 이 앱의 다른 모든 IC:* 데이터셋과 동일하게 실제 Redis에는 JSON으로 저장돼 있을
  가능성이 높고, 사용자가 GUI 툴에서 여러 행의 값을 복사할 때 중괄호/키 라벨이 빠진 채 붙여넣어진
  것으로 추정됨(코드 변경 없음 — Redis GUI에서 단일 행 값 하나만 다시 확인 요청, 중괄호 있으면 그룹별
  합계 기능 그대로 쓰면 됨, 진짜 JSON이 아니면 별도 파서 추가 필요).
- 관련 파일: `src/app/pages/board/TaskCreate.tsx`(팔레트, 컬럼 계산식/그룹별 합계 핸들러+UI,
  `TableColCalcOperandDropZone`, `handleDragEnd`), `src/app/features/board/components/RedisTableWidget.tsx`
  (`ROW_ID_COLUMN_KEY` export, 그룹별 합계/계산식 행 빌드, 스크롤), `src/app/features/board/types/taskboard.types.ts`
  (`TableColumnCalc`, `TableColumnCalcOperand`, `tableConfig.groupBy`)
- 검증: `npx eslint --fix` + `typecheck-staged.js` 둘 다 통과(신규 에러 없음). 실제 브라우저에서
  계산식 드래그-바인딩, 그룹별 합계 결과, 스크롤 동작 확인은 미실시.

## 2026-06-23 세션32

### "Redis 테이블" 위젯 신규 — 임의 해시키 1개를 DB 마스터 조인 없이 통째로 테이블로
배경: 큐/그룹/상담사 현황표(table-queue/group/agent)는 DB 마스터 목록과 조인하는 고정 구조라 그
3종 외의 임의 Redis 해시(예: 다른 솔루션이 적재한 키)는 테이블로 못 보여줬음. "현황표 없이, 해시키를
직접 넣고 행/열을 직접 지정하는 테이블을 추가하고 싶다(미디어타입 선택 UI는 없어도 됨)"는 요청에
따라 신규 위젯 타입으로 분리.

- **`RedisTableWidget.tsx`(신규)**: `item.redisHashKey`(예: `"IC:CTIQ:0"` — 미디어타입까지 문자열에
  그대로 포함, 별도 선택 UI 없음) 1개를 `useGetRedisHashEntries()`로 5초 주기 통째로 조회(REST
  HGETALL 기반 — WS처럼 미리 알아야 하는 `ids` 목록이 필요 없어 "이 해시에 실제로 존재하는 field
  전부"가 그대로 행이 됨, DB 마스터 조인 없음). 각 행의 JSON을 파싱해 `tableConfig.columns`에 정의된
  필드만 추출. 행 ID 자체를 보고 싶으면 컬럼 key를 예약어 `__id`로 추가하면 그대로 표시.
- **팔레트**: "Redis 테이블"(`id:'table-redis'`, `category:'Redis'`, `tableConfig: {columns:[], sampleRows:[]}`)
  신규 — 큐/그룹/상담사 현황표 옆에 추가.
- **속성 패널**: `table-redis`일 때만 "Redis 해시키" 입력칸 노출. 기존 "테이블 컬럼" 섹션(+ 세션31의
  컬럼별 정렬/천단위/임계치 스타일 편집기)을 `table-queue/group/agent`뿐 아니라 `table-redis`에도
  동일하게 적용(조건 목록에 추가) — 직접 타이핑 또는 좌측 탐색기에서 필드 드래그(세션29에서 만든
  "테이블 위젯에 드래그로 컬럼 추가" 기능이 `tableConfig` 존재 여부만 보는 범용 로직이라 별도 수정
  없이 그대로 동작).
- **렌더링 3곳**: `TaskCreate.tsx`(디자인 캔버스)/`TaskView.tsx`/`RollingDisplay.tsx` 모두
  `isRedisTableWidget(widget)`이면 `buildLiveTableRows`(큐/그룹/상담사 전용) 대신 `RedisTableWidget`로
  분기.
- 관련 파일: `src/app/features/board/components/RedisTableWidget.tsx`(신규),
  `src/app/pages/board/TaskCreate.tsx`(팔레트 항목, 속성 패널, `updateWidgetRedisHashKey`),
  `src/app/pages/board/TaskView.tsx`, `src/app/features/board/components/RollingDisplay.tsx`
- 검증: `npx eslint --fix` + `typecheck-staged.js` 둘 다 통과(신규 에러 없음). 실제 브라우저에서
  해시키 입력→컬럼 드래그→행 표시까지 동작 확인은 미실시. 스타일(요청대로 이번엔 보류)은 세션31에서
  만든 컬럼별 정렬/천단위/임계치 편집기가 이미 그대로 적용되니 추후 필요시 그것부터 사용 가능.

## 2026-06-23 세션31

### 테이블 위젯 — 컬럼별 스타일(정렬/천단위/임계치 색상) 지원
배경: "테이블 리스트도 스타일리쉬하게 꾸밀 수 있어야 하는데 어렵다"는 요청. 행 소스(테이블 종류별
DB 마스터+WS 매핑)는 이미 안정적으로 동작 중이라 그대로 두고, 단일값 위젯에 이미 있던 스타일
옵션(정렬/천단위/임계치 색상) 중 핵심만 컬럼 단위로 재사용하는 방향으로 합의 후 진행.

- **`TableColumn`(타입)**: `align?`, `useThousandSep?`, `thresholdEnabled?`, `thresholds?` 필드 추가.
- **`getThresholdColor()`(`widgetVisualStyle.ts`)**: 파라미터 타입을 `WidgetStyle` 전체에서
  `Pick<WidgetStyle, 'thresholdEnabled' | 'thresholds'>`로 좁혀 `TableColumn`에도 그대로 재사용 가능하게
  변경(동작 동일, 기존 호출부 영향 없음).
- **렌더링 3곳 동일 적용**: `TaskCreate.tsx`(`TableWidget`, 디자인 캔버스 샘플 데이터), `TaskView.tsx`
  (`ViewTableWidget`), `RollingDisplay.tsx`(`RollingTableWidget`) — `<th>`/`<td>` 모두 `col.align`을
  반영하고, 셀 값은 `formatWidgetValue(value, col.useThousandSep)`로 포맷, 색상은
  `getThresholdColor(value, col)`로 계산.
- **속성 패널 UI**: 테이블 컬럼 목록의 각 행에 ⚙ 토글 추가 — 누르면 그 컬럼 전용 스타일 편집기(좌/중/우
  정렬 버튼, 천단위 토글, 임계치 색상 토글 + 단일값 위젯과 동일한 "≥ 기준값 + 색상 + 삭제" 규칙
  목록 CRUD)가 펼쳐짐. `updateWidgetTableColumn`/`add·update·removeColumnThresholdRule` 신규.
- 관련 파일: `src/app/features/board/types/taskboard.types.ts`(`TableColumn`),
  `src/app/features/board/utils/widgetVisualStyle.ts`(`getThresholdColor`),
  `src/app/pages/board/TaskCreate.tsx`(`TableWidget`, 속성 패널, 컬럼 CRUD 핸들러),
  `src/app/pages/board/TaskView.tsx`(`ViewTableWidget`),
  `src/app/features/board/components/RollingDisplay.tsx`(`RollingTableWidget`)
- 검증: `npx eslint --fix` + `typecheck-staged.js` 둘 다 통과(신규 에러 없음, 기존 경고만 유지). 실제
  브라우저에서 컬럼별 정렬/천단위/임계치가 디자인 캔버스·실행화면·로테이션 3곳 모두 일치하게
  보이는지 확인은 미실시.

## 2026-06-23 세션30

### NE/NW 리사이즈 핸들 아이콘이 SE/SW와 다른 글리프 스타일이던 것 수정
세션27에서 NE/NW 핸들을 추가할 때 SE/SW(긴 대각선 + 모서리 쪽 짧은 평행 대각선 + 발 — "이중 줄무늬"
스타일)와 다르게 NE/NW는 단순 "L자 꼭지점 괄호" 스타일로 그려서 위/아래 핸들 모양이 안 맞았음(NE는
괄호를 엉뚱하게 NW 자리에 그리는 좌표 실수도 있었음). SE/SW의 path를 y축 반사로 정확히 계산해
NE="M7 7L1 1M7 4L4 1M7 1H4", NW="M1 7L7 1M1 4L4 1M1 1H4"로 교체 — 이제 4개 핸들이 전부 동일한
스타일(긴 대각선 1개 + 자기 코너 쪽 짧은 평행 대각선 + 발 1개)로 보인다.
- 관련 파일: `src/app/pages/board/TaskCreate.tsx` (`CanvasWidgetFree`의 NE/NW 핸들 SVG)
- 검증: `npx eslint --fix` 통과(신규 없음).

## 2026-06-23 세션29

### 공지 키 그룹 위젯 부재, 슬라이드 속도 설정, 테이블 위젯 컬럼 드래그 추가
1. **"여러 건 슬라이드"가 항상 1건씩 낱개로만 동작하던 진짜 원인**: 좌측 팔레트의 공지사항 항목이
   DB의 공지 하나하나를 **개별 `noticeId`로 고정된 위젯**으로만 드래그할 수 있었음(`FixedItemsSection`
   의 `activeNotices.map(...)` → `noticeId: notice.noticeId`). `AnnouncementWidget`이 지원하는
   "noticeKey로 묶어서 회전" 모드용 위젯(= `noticeId` 없이 `noticeKey`만 갖는 위젯)을 캔버스에 **만들
   방법 자체가 팔레트에 없었음** — 그래서 같은 키의 공지를 여러 개 드래그해도 결국 낱개 위젯 N개가
   생겨 각자 따로 노는 것처럼 보였던 것. 팔레트에 `id:'etc-announcement'`(`noticeId` 미지정) "공지
   그룹(키 그룹)" 항목을 신규로 추가 — 이걸 캔버스에 놓고 속성 패널에서 공지 키를 고르면 그 키의
   공지 전체가 한 위젯에서 회전 표시된다. 기존 개별 항목은 "1건 고정" 용도로 라벨만 구분해 유지.
2. **슬라이드 속도 설정**: `DroppedWidget.slideIntervalSec`(초, 기본 5) 신규 — 공지사항 위젯(키
   그룹/1건 고정 공통) 속성 패널에 입력 추가. `AnnouncementWidget`의 회전 전환 주기와 마퀴
   `animationDuration`(전환 주기×2.4 — 기존 5초/12초 기본값 비율 유지) 둘 다 이 값을 따라가도록 연결.
3. **테이블 위젯에 Redis 필드 드래그로 컬럼 추가**: 기존엔 속성 패널에 필드명/표시명을 직접 타이핑
   해야만 컬럼이 추가됐음. `handleDragEnd`에 분기 추가 — 좌측 Redis 항목을 캔버스의 테이블형 위젯
   (table-queue/group/agent, `item.tableConfig` 존재) 위에 직접 드롭하면 위젯을 통째로 바꾸는 기존
   동작 대신 그 필드(`redisJsonField` 우선, 없으면 `redisField`)를 컬럼으로 추가(`addWidgetTableColumn`
   재사용 — WS 구독 columns에도 그대로 반영됨). 예: `CTIQ_NAME`을 끌어다 놓으면 그 칼럼이, 이어서
   `SUM_CONN_CNT`/`SUM_ABDN_CNT`를 끌어다 놓으면 각각 값 칸으로 추가됨. 기존 "+ 추가" 수동 입력도
   그대로 유지(드래그 방식과 둘 다 사용 가능).
- 관련 파일: `src/app/pages/board/TaskCreate.tsx`(`FixedItemsSection`, `handleDragEnd`,
  `updateWidgetMeta`, 속성 패널 슬라이드 속도 입력), `src/app/features/board/components/AnnouncementWidget.tsx`,
  `src/app/features/board/types/taskboard.types.ts`(`DroppedWidget.slideIntervalSec`)
- 검증: `npx eslint --fix` + `typecheck-staged.js` 둘 다 통과(신규 에러 없음). 실제 브라우저에서 키
  그룹 위젯 생성→회전, 슬라이드 속도 반영, 테이블 위젯 드래그 추가 동작 확인은 미실시.

## 2026-06-23 세션28

### 위젯 옵션 팝오버 클리핑 수정(포탈) + 행 정렬/애니메이션 + 공지 슬라이드 = 회전 ∧ 마퀴
1. **팝오버 클리핑**: 위젯이 작을 때 팝오버가 다 안 보이던 원인 확정 — 위젯 컨테이너가
   `backdrop-blur`(filter)+`overflow:hidden`을 같이 갖고 있어서, `absolute`는 물론 `position:fixed`도
   filter가 만드는 containing block에 갇혀 클리핑됨(z-index를 올려도 소용없는 이유 — 애초에
   페인트 영역 밖으로 못 나가는 문제라 stacking 순서 문제가 아니었음). `document.body`로
   `createPortal` 렌더링하도록 변경해 위젯 크기와 완전히 무관하게 항상 온전히 표시되도록 수정.
   위치는 ⚙ 버튼의 `getBoundingClientRect()` 기준으로 계산.
2. **행 정렬**: 복사/삭제/계산식 3개 메뉴 행을 전부 `h-8`로 통일(기존엔 패딩만 같고 높이 보장이
   없어 미세하게 들쭉날쭉했음). "계산식 변수로 드래그" → **"계산식"**으로 축약.
3. **등장 애니메이션**: `widgetVisualStyle.ts`의 공용 CSS(`VALUE_CHANGE_ANIMATION_CSS`)에
   `tbMenuPopIn` 키프레임 추가(스케일 0.92→1 + 살짝 위에서 떨어지며 페이드인, `cubic-bezier(0.34,
   1.56, 0.64, 1)`로 끝에 살짝 튕기는 느낌) — 팝오버에 `tb-menu-pop-in` 클래스로 적용.
4. **공지 "슬라이드" 의미 정정**: 사용자가 처음 의도한 슬라이드는 "여러 건 중 1건씩 회전 표시"가
   아니라 **"글자가 영역 안에서 가로로 흘러가는 마퀴(ticker) 효과"**였음 — 두 가지 다 채택하기로
   확정("여러 건 회전"도 구조적으로 이미 가능하고 유용하니 같이 유지). `AnnouncementWidget.tsx`에
   `tb-marquee-track` CSS(컨테이너 폭만큼 `padding-left`로 오른쪽 바깥에서 시작해 `translateX(-100%)`로
   왼쪽까지 흘러나가는 무한 루프, 12초 주기) 추가 — `displayType==='slide'`인 공지는 (1) 여러 건이면
   세션26에서 만든 회전 로직으로 5초마다 1건씩 바뀌고, (2) 표시되는 동안 그 글자 자체가 마퀴로
   흘러감. 1건뿐이어도 마퀴 덕분에 "고정처럼 안 보이는" 동적인 느낌을 준다.
- 관련 파일: `src/app/pages/board/TaskCreate.tsx`(`WidgetActionsMenu`, `WidgetRefHandle`),
  `src/app/features/board/utils/widgetVisualStyle.ts`(`VALUE_CHANGE_ANIMATION_CSS`),
  `src/app/features/board/components/AnnouncementWidget.tsx`
- 검증: `npx eslint --fix` + `typecheck-staged.js` 둘 다 통과(신규 에러 없음). 실제 브라우저에서
  포탈 위치 보정·마퀴 속도감 확인은 미실시 — 텍스트가 너무 빨리/느리게 흐르면 12초 값 조정 가능.

## 2026-06-23 세션27

### TaskCreate 위젯 — 리사이즈 핸들 4방향 + 액션 버튼을 톱니바퀴 팝오버로 통합
배경: 캔버스에서 위젯을 선택했을 때 (1) 리사이즈 핸들이 하단좌우(SE/SW) 2곳뿐이라 상단에서 크기를
못 줄이고, (2) 항상 떠 있는 복사/삭제/🔗(계산식 변수 드래그) 3개 버튼이 어수선하다는 요청.

- **리사이즈 4방향**: `ResizeHandle` 타입을 `'se'|'sw'` → `'se'|'sw'|'ne'|'nw'`로 확장.
  `snapResizeToGuides()`/포인터무브 리사이즈 계산을 "서쪽 핸들이면 x/w를 반대쪽 고정으로 계산,
  북쪽 핸들이면 y/h를 반대쪽 고정으로 계산"하는 공용 로직으로 재작성(기존엔 항상 위쪽 고정이라
  SE/SW만 가능했음). `CanvasWidgetFree`에 NE/NW 핸들 DOM 추가. 그리드 모드는 react-grid-layout이
  네이티브로 `'ne'|'nw'` 핸들 축을 지원해 `resizeConfig.handles`에 추가만 하면 됨.
- **액션 버튼 → 톱니바퀴 팝오버**: `WidgetActionsMenu` 신규 컴포넌트 — 위젯 우상단(코너 리사이즈
  핸들과 겹치지 않게 안쪽으로 오프셋)에 ⚙ 버튼만 hover 시 노출, 클릭하면 위젯 위로 팝오버(복사/삭제,
  계산식 위젯이 아니면 구분선 아래 "🔗 계산식 변수로 드래그" 행 추가) 표시. 바깥 클릭 시 닫힘. 열려
  있는 동안은 `group-hover` 의존을 끄고 강제로 보이게 처리해 — 🔗 드래그 시작 중에 마우스가 살짝
  벗어나 메뉴가 사라지는 것을 방지.
- `WidgetRefHandle`은 기존 단독 아이콘 버튼에서 팝오버 내부 메뉴 행(아이콘+라벨) 형태로 변경 —
  `useDraggable` 훅 자체는 그대로라 드래그 동작 동일.
- `CanvasWidgetFree`/`CanvasWidgetGrid` 둘 다 동일하게 적용.
- 관련 파일: `src/app/pages/board/TaskCreate.tsx`
  (`ResizeHandle`, `snapResizeToGuides`, `handleResizeStart`/포인터무브 리사이즈 로직,
  `WidgetRefHandle`, `WidgetActionsMenu` 신규, `CanvasWidgetFree`, `CanvasWidgetGrid`)
- 검증: `npx eslint --fix` 통과(기존 경고 외 신규 없음), `typecheck-staged.js` 통과. 실제 브라우저
  동작(4방향 리사이즈 체감, 팝오버 위치/겹침) 확인 미실시.

## 2026-06-23 세션26

### 공지사항 위젯 — 실시간 반영 + 표시기간(시작/종료일)·슬라이드 미구현 수정
배경: 전광판 실행 중 공지사항을 수정해도 화면에 안 반영되고, "표시 유형(슬라이드/고정)"·"표시 기간"은
동작 안 하는데 "사용 여부"만 어설프게라도 동작한다는 제보. `AnnouncementWidget.tsx`를 보니 실제로
`useGetNoticeList`/`useGetNoticeListByKey`에 `refetchInterval`이 없어 마운트 후 재조회가 안 됐고,
`notice.useYn`만 필터링하고 `alwaysActiveYn`/`startDt`/`endDt`/`displayType`는 전부 읽지도 않고
있었음 — "사용 여부"만 동작한 게 정확히 맞았던 상황.

- **실시간 반영**: 두 쿼리에 `refetchInterval` 추가. 처음엔 슬라이드 전환 주기(5초)와 같은 값을
  썼다가, "공지는 자주 안 바뀌는데 5초마다 받아올 필요 있나, WS 푸시가 어울리나?"는 사용자 질문에
  맞춰 데이터 재조회 주기(`NOTICE_REFETCH_INTERVAL_MS`=1분)와 슬라이드 UX 전환 주기
  (`SLIDE_INTERVAL_MS`=5초)를 분리된 별도 상수로 정리. WS 푸시는 변경 빈도(관리자가 가끔 수정) 대비
  새 채널을 구축하는 비용이 안 맞아 폴링으로 결정 — 빈도가 늘면 재검토 여지를 주석으로 남김.
- **표시 기간 미적용 수정**: `isWithinDisplayWindow(notice, now)` 신규 — `alwaysActiveYn='Y'`면 항상
  표시, 아니면 `startDt`~`endDt`(종료일은 그날 23:59:59까지 포함, 한쪽이 비어있으면 그쪽은 무제한)
  범위 안에서만 표시. `useYn` 필터에 이 체크를 추가로 결합.
- **슬라이드 미구현 수정**: `displayType==='fixed'`는 항상 같이 표시(`fixedNotices`), `displayType
  ==='slide'`는 여러 건이어도 한 번에 1건씩 `SLIDE_INTERVAL_MS` 주기로 돌려가며 표시
  (`slideNotices`+`slideIndex` state) — fixed 아래에 현재 슬라이드 1건을 이어붙여서 렌더. (참고:
  notice마다 displayType이 개별 필드라 "위젯 전체가 슬라이드 모드"가 아니라 "그 공지가 슬라이드에
  포함되는지"로 해석 — 위젯 단위로 다르게 동작하길 원하시면 말씀해주세요.)
- 관련 파일: `src/app/features/board/components/AnnouncementWidget.tsx`
- 검증: `npx eslint --fix` 통과(에러 없음). 실제 브라우저 동작 확인 미실시.

## 2026-06-23 세션25

### 공지사항 update/delete가 BFF에서 "No static resource" 404로 막히던 진짜 원인
배경: BFF에 `taskboard-noticeupdate`/`taskboard-noticedelete` FLOW를 등록했는데도 사용자가 로그
(`DELETE /api/bff/taskboard-noticedelete/8 => ... NoResourceFoundException: 404 NOT_FOUND "No static
resource api/bff/taskboard-noticedelete/8"`)를 보내며 BFF→TASKBOARD로 안 넘어간다고 재문의.

- **원인**: `DynamicAggregationController`의 쓰기 라우트는 `@PostMapping("/{flow}")`/`@DeleteMapping("/{flow}")`처럼
  **`/api/bff/` 뒤에 단일 path segment(flow명)만** 매칭한다. 그런데 `taskboardApi.ts`의
  `updateNotice`/`deleteNotice`가 다른 모든 update/delete(배경/레이아웃/디스플레이/롤링그룹)와 다르게
  `noticeId`를 query param이 아니라 **URL 경로에 직접 붙여서**(`/taskboard-noticedelete/${noticeId}`)
  보내고 있었음 — 그래서 `/api/bff/taskboard-noticedelete/8`은 path segment가 2개라 `{flow}` 패턴에
  안 걸리고 Spring이 정적 리소스 핸들러로 떨어뜨려 그 404가 난 것. FLOW 등록 자체는 문제 없었음(매칭
  자체가 안 일어났던 것).
- `DynamicAggregationService`는 백엔드로 보낼 step URI의 `{noticeId}` 같은 path placeholder를
  **원래 BFF 요청의 query param**(`buildAndExpand(vars)`)으로 채운다 — 그래서 정상 동작하는
  `deleteDisplay`(`apiClient.delete('/taskboard-display-delete', { params: { displayId } })`) 등은 전부
  query param 방식.
- **수정**: `taskboardApi.ts`의 `updateNotice`/`deleteNotice`/`getNoticeListByKey`를 동일하게 query param
  방식으로 변경(`{ params: { noticeId } }` / `{ params: { noticeKey } }`, flow명도 path segment 없는
  고정 문자열로). 백엔드에 보낼 마이그레이션 SQL(`taskboard-noticeupdate`/`taskboard-noticedelete` STEP의
  `{noticeId}` placeholder)은 이전에 안내한 내용 그대로 유효 — FE가 query param으로 보내면 BFF가 그
  값을 placeholder에 채워 백엔드 실제 경로(`/api/taskboard/taskboard-noticeUpdate/{noticeId}`)로 정상
  변환됨.
- 관련 파일: `src/app/features/board/api/taskboardApi.ts`
- 검증: `npx eslint --fix` 통과(에러/경고 없음). 마이그레이션 SQL을 아직 안 적용했다면 그것도 같이
  적용 필요 — FE만 고쳐도 BFF에 FLOW가 없으면 여전히 404.

## 2026-06-23 세션24

### 내보내기/가져오기 — boardTitle(레이아웃 이름) 누락 수정
배경: 사용자가 "내보내기→가져오기가 100% 복사가 안 되는 것 같다"고 문의. `handleExport`/`handleImport`와
`handleSave`가 실제로 DB에 저장하는 `layoutJson` 필드 구성을 대조해본 결과, `layoutMode`/`gridMargin`/
`containerPadding`/`guides`/`showGuides`/`widgets`는 셋 다 동일하게 다뤄 위젯·캔버스 설정 자체는
JSON 직렬화라 수치 손실 없이 완전히 복원되는 것을 확인 — 다만 **`boardTitle`(레이아웃 이름)만 export
JSON에 안 들어가고 있었음**(DB 저장 시엔 별도 컬럼이라 문제 없지만, "파일로 내보내서 다른 보드에
가져오기" 케이스에서는 제목이 빠짐).

- `handleExport`: exportData에 `boardTitle` 추가
- `handleImport`: `raw.boardTitle`이 있으면 `setBoardTitle()`로 복원(없는 구버전 파일은 하위 호환으로
  현재 제목 유지)
- 위젯 배열(`droppedWidgets`) 자체는 `id` 그대로 보존되어 계산식 위젯의 `operand.widgetId` 참조 등도
  깨지지 않음 확인 — 이쪽은 원래도 100% 복원되고 있었음
- 관련 파일: `src/app/pages/board/TaskCreate.tsx` (`handleExport`, `handleImport`)
- 검증: `npx eslint --fix` 통과(기존 경고 외 신규 없음). 실제 내보내기→가져오기 라운드트립 브라우저
  확인은 미실시 — 제목 외에 추가로 안 맞는 부분이 있으면 구체적으로(어떤 속성이 달라지는지) 알려주시면
  바로 확인 가능.

## 2026-06-23 세션23

### 선택 하이라이트 outline-offset 제거 + 계산식 위젯 "검증" 버튼 + "%" 단위 옵션
1. **outline-offset 제거**: 세션22에서 추가한 선택 하이라이트(`outline outline-2 ... outline-offset-2`)가
   "생각보다 더 밖으로 잡힌다"는 피드백 — `outline-offset-2`(2px 바깥 간격)를 제거해 위젯 테두리에 바로
   붙도록 수정. `CanvasWidgetFree`/`CanvasWidgetGrid` 둘 다 동일 적용.
2. **계산식 수식 "검증" 버튼**: `redisValue.ts`의 `evaluateFormula` 파서를 `evaluateFormulaOrThrow`(에러
   메시지 포함, throw)로 추출하고, 기존 `evaluateFormula`는 그걸 try/catch로 감싸는 얇은 래퍼로 변경
   (동작 동일, 하위 호환). 신규 `validateFormula(formula, declaredVars)` — 선언된 변수 전부에 샘플값
   1을 대입해 수식 문법만 검사(`{ ok:true, sampleResult }` 또는 `{ ok:false, message }`). `TaskCreate.tsx`
   수식 입력 옆에 "검증" 버튼 추가 — 클릭 시 `toast.success`/`toast.error`로 성공(샘플 결과값 포함)/실패
   (구체적 에러 메시지: "정의되지 않은 변수: X", "괄호가 닫히지 않았습니다" 등) 알림.
3. **계산식 위젯 "%" 단위 옵션**: `CalcConfig`에 `showPercent?: boolean`, `percentFontScale?: number`
   (값 폰트 크기 대비 배율, 기본 0.65) 추가. 설정 패널에 "% 표시" 토글 + (켜졌을 때만) "% 크기" 입력
   추가. 렌더링은 `TaskCreate.tsx`(`WidgetContent`)/`TaskView.tsx`(`ViewValueWidget`)/`RollingDisplay.tsx`
   (`RollingValueWidget`) 3곳 모두 기존 `widget.item.unit` 표시 패턴과 동일하게 — `%` span은 폰트 패밀리를
   명시하지 않아 부모로부터 상속(요청대로 "폰트는 같이 쓰고") + `fontSize`만 `percentFontScale`로 별도 조절.
- 관련 파일: `src/app/pages/board/TaskCreate.tsx`, `src/app/pages/board/TaskView.tsx`,
  `src/app/features/board/components/RollingDisplay.tsx`, `src/app/features/board/utils/redisValue.ts`,
  `src/app/features/board/types/taskboard.types.ts` (`CalcConfig`)
- 검증: `npx eslint --fix` 통과(기존 경고 외 신규 에러 없음). 실제 브라우저 동작 확인 미실시.

## 2026-06-22 세션22

### 캔버스 위젯 선택 하이라이트 — 진짜 원인은 inline boxShadow가 ring을 덮어쓰던 것
배경: 세션20에서 선택 시 테두리 색을 흰색→파란색(`ring-2 ring-[#0f5b9e]`)으로 바꿨는데도 사용자가
"클릭해도 아무 반응이 없다"고 재확인. 원인 추적 결과 — `getWidgetVisualStyle()`가 위젯마다
`boxShadow`(그림자 프리셋)를 **inline style**로 항상 채워 넣는데, Tailwind의 `ring-*`/`shadow-*`
유틸리티도 결국 `box-shadow` CSS 속성을 컴파일하는 것이라 **inline style이 항상 클래스를 덮어써서**
선택 시 ring이 시각적으로 전혀 반영되지 않았음(흰색이든 파란색이든 색상과 무관하게 애초에 안 그려짐).

- `CanvasWidgetFree`/`CanvasWidgetGrid` 선택 하이라이트를 `ring`(box-shadow 기반) → `outline`(별도
  CSS 속성, box-shadow와 충돌 없음) 기반으로 교체: `outline outline-2 outline-[#0f5b9e] outline-offset-2`
  (잠금 상태는 `outline-amber-400` 유지).
- 관련 파일: `src/app/pages/board/TaskCreate.tsx` (`CanvasWidgetFree`, `CanvasWidgetGrid`, `replace_all`)
- 검증: `npx eslint --fix` 통과(기존 경고 외 신규 없음). 실제 브라우저 확인 미실시 — `outline`은
  `box-shadow`와 별개 속성이라 위젯 자체 그림자 설정과 무관하게 항상 그려져야 함.

## 2026-06-22 세션21

### 단일값 Redis 위젯 — GROUP 전용이던 "디스플레이 선택값 기준 합산"을 CTIQ/AGENT까지 일반화
배경: 사용자가 GROUP 단일값 위젯은 "데이터 출처" 표시상 특정 compositeKey(`2026001272000005`)에
고정된 것처럼 보이는데 실제로는 디스플레이 선택값(그룹 전체)을 합산해서 보여주고, CTIQ는 정말로
드래그한 그 1개 id에 영원히 고정된다는 비대칭을 짚음 — 원인을 추적해보니 `redisValue.ts`에
`isGroupHashKey()`/`GROUP_HASH_PREFIX`로 **GROUP만 특별 취급**하는 하드코딩이 남아있었음
(`buildGroupIdsByHashKey`가 `IC:GROUP:` 접두사만 처리). "미디어타입 쓰는 부분은 전부 같은 방식으로
동작해야 한다"는 요청에 따라 GROUP 전용 로직을 GROUP/CTIQ/AGENT 공통 로직으로 일반화.

- **`redisValue.ts`**: `isGroupHashKey()`/`buildGroupIdsByHashKey(widgets, groupRows, selectedGroupIds)`
  제거 → `SelectionListContext`(큐/그룹/상담사 마스터 리스트 + 각 선택값을 한데 묶은 컨텍스트 타입)를
  받는 `buildSelectionIdsByHashKey(widgets, ctx)`로 교체. 캔버스에서 쓰이는 모든 Redis hashKey를 모은
  뒤, 접두사별로 분기:
  - `IC:GROUP:` → 그룹 컴포지트키(선택 없으면 전체, 있으면 그 그룹들만) 합산 — 기존 동작 그대로
  - `IC:CTIQ:` → 큐 ID(선택 없으면 전체 큐, 있으면 선택된 큐만) 합산 — **신규**
  - `IC:AGENT:{groupId}:{mediaType}` → 키에 박힌 그룹 소속 상담사 중 선택값에 해당하는 ID들 합산 — **신규**
  - 그 외 접두사(다른 솔루션이 적재하는 임의의 키 등)는 매핑 대상이 아니므로 기존처럼 드래그 시점에
    고정된 단일 id 그대로 사용(하위 호환)
  - `getRedisDisplayValue`/`getWidgetNumericValue`/`getOperandNumericValue`/`getCalcDisplayValue`/
    `collectRedisWsSubscriptions`의 파라미터명도 `groupIdsByHashKey` → `selectionIdsByHashKey`로 변경
    (의미가 GROUP 전용이 아니게 됐으므로) — 이 5개 함수 자체는 원래도 prefix를 모르는 generic
    `Record<string,string[]>` 소비자였어서 내부 로직 변경 없음.
- **`TaskView.tsx`/`RollingDisplay.tsx`**: `buildSelectionIdsByHashKey` 호출부 3곳(단일 디스플레이
  `SingleLayoutView`, 로테이션 슬라이드 `LayoutScreen`, 로테이션 전체 구독 `RollingPlayer`)에 큐/상담사
  마스터 리스트·선택값을 추가로 넘기도록 수정. 변수/prop명도 전부 `selectionIdsByHashKey`로 일관되게
  변경.
- 관련 파일: `src/app/features/board/utils/redisValue.ts`, `src/app/pages/board/TaskView.tsx`,
  `src/app/features/board/components/RollingDisplay.tsx`
- 검증: `npx eslint --fix` 통과(기존 경고 외 신규 에러 없음, 기존에 없던 미사용 변수/오타 없음 확인).
  실제 브라우저에서 CTIQ/AGENT 단일값 위젯이 전체 선택 기준으로 합산되는지는 사용자 확인 필요.
- **남은 부분**: `TaskCreate.tsx`의 `getWidgetDataSourcePath()`(좌측 패널 "데이터 출처" 표시 문구)는
  디자인 캔버스에 살아있는 데이터가 없어 손대지 않음 — 여전히 `해시키 > 키값 > 필드` 그대로 보여주는데,
  이건 "드래그 시점에 어떤 컬럼을 고를지 보여주는 샘플"이라는 의도라 실제 런타임엔 그 키값이 무시되고
  선택값 기준으로 합산된다는 점이 문구만으로는 안 드러남 — 필요하면 후속으로 GROUP/CTIQ/AGENT 위젯의
  문구에 "(전체 선택값 합산)" 같은 안내를 추가하는 게 좋을 듯.

## 2026-06-22 세션20

### 캔버스 위젯 선택 하이라이트 색상 강화
배경: `CanvasWidgetFree`/`CanvasWidgetGrid`에 선택 시 `ring-2 ring-white` 하이라이트가 이미 있었지만,
배경이 밝은(흰색 계열) 위젯에서는 흰 테두리가 거의 안 보여서 "지금 어떤 위젯이 선택돼 있는지" 구분이
어렵다는 요청.

- 잠금 안 된 상태의 선택 링 색상을 `ring-white` → 앱 기본색 `ring-[#0f5b9e]`(+ `shadow-[0_0_0_3px_rgba(15,91,158,0.25)]`)로 변경. 잠금 상태의 amber 하이라이트는 기존 그대로 유지(이미 충분히 잘 보였음).
- 위젯의 X/Y/W/H 좌표 라벨(선택 시 좌상단에 뜨는 작은 배지)은 기존 그대로 — 별도 변경 없음.
- 관련 파일: `src/app/pages/board/TaskCreate.tsx` (`CanvasWidgetFree`, `CanvasWidgetGrid` 두 곳 동일 패턴, `replace_all`로 일괄 변경)
- 검증: `npx eslint --fix` 통과(기존 경고 외 신규 없음). 실제 브라우저 확인 미실시.

## 2026-06-22 세션19

### CTIQ WS 구독 "선택 없음 = 전체" 폴백 추가 — GROUP과의 비대칭 진짜 원인
배경: 사용자가 실제 WS 구독 요청 페이로드를 캡처해서 보여줌 — `IC:GROUP:0`은 `ids` 140개가 그대로
실리는데 `IC:CTIQ:0`은 `ids: ["2025001074"]` 1개만 실려서 나감(서버가 자르는 게 아니라 **클라이언트가
보내는 시점부터** 1개). Redis/DB ID 정합성도 사용자가 직접 확인해서 문제 없음을 확인 — 즉 진짜 원인은
FE의 구독 생성 로직 차이였음.

- **원인**: `TaskView.tsx`/`RollingDisplay.tsx` 둘 다 GROUP은 `groupCompositeKeys` 계산 시
  `allSelectedGroupIds.length === 0 || ...includes(...)` 형태로 **"선택값이 비어있으면(아무것도
  명시적으로 고르지 않았으면) 전체"**를 이미 처리하고 있었는데, QUEUE는 `selectedQueueIds.length > 0
  ? ids: selectedQueueIds : []` — 즉 선택값이 비어있으면 그냥 구독 자체를 안 보내거나(0개), 선택값에
  뭐가 들어있든 그 값 그대로만 보냄. 디스플레이의 저장된 `selectionJson.queueIds`가 (이전 테스트
  단계에서 만들어진) 단일 ID 1개였던 디스플레이를 보고 있었던 것으로 추정 — GROUP은 같은 상황에서도
  "비어있으면 전체" 폴백 덕에 정상으로 보였던 것.
- **수정**: `TaskView.tsx`에 `needsQueue`(GROUP/AGENT처럼 캔버스에 큐 위젯이 있을 때만 구독)와
  `queueIdsForSub`(`selectedQueueIds.length > 0 ? selectedQueueIds : queueRows.map(q => q.ctiqId)`)를
  추가해 WS 구독에서만 GROUP과 동일한 "선택 없음=전체" 규칙을 적용(행 표시용 `selectedQueueIds`
  자체는 기존 로직 그대로 유지 — 거긴 이미 같은 폴백이 있었음). `RollingDisplay.tsx`도 `allQueueIds`
  계산에 동일하게 `allSelectedQueueIds.length > 0 ? allSelectedQueueIds : queueRows.map(...)` 폴백 추가.
- 관련 파일: `src/app/pages/board/TaskView.tsx`, `src/app/features/board/components/RollingDisplay.tsx`
- 검증: `npx eslint --fix` 통과(기존 경고 외 신규 에러 없음). 실제 디스플레이 저장값이 진짜 빈
  배열이었는지(이번 수정으로 해결됨) 혹은 단일 ID가 명시적으로 저장돼 있었는지(이 경우 "표시값 설정"
  패널에서 큐 드롭다운을 다시 열어 "전체 선택" 클릭 → 저장까지 눌러야 함)는 사용자 확인 필요.

## 2026-06-22 세션18

### Redis 탐색기 트리 — "해시그룹" 펼침 시 마지막 구분자(0/10/IN_TOT 등) 개별 키도 같이 보이게
배경: task-create 좌측 Redis 탐색기에서 `IC:CTIQ` 같은 노드를 펼치면 자식이 전부 leaf(`IC:CTIQ:0`,
`IC:CTIQ:10`, `IC:CTIQ:IN_TOT`)라서 `isHashGroup`으로 인식돼 대표 키(첫 번째 자식) 하나의 JSON
필드만 보여주고 나머지 세그먼트(0/10/IN_TOT)는 트리에서 숨겨졌음. 사용자가 "마지막 구분자 단계까지
보이게 해달라"고 요청.

- **`TaskCreate.tsx` `RedisTreeNode`**: 기존엔 `hasChildren && !isHashGroup`일 때만 자식을 재귀
  렌더링해서 해시그룹 노드는 자식이 화면에 전혀 안 나왔음. 조건을 `hasChildren`(해시그룹 여부 무관)으로
  바꿔 해시그룹이어도 자식(개별 full key) 노드를 그대로 펼쳐서 보여주도록 수정. 렌더 순서도 "그룹
  대표 키의 합산용 필드 아이템" → "개별 자식 노드(0/10/IN_TOT 등, 각각 클릭하면 그 키 하나만의
  필드를 보여줌)" 순으로 정리.
- **하위 호환**: `isHashGroup`의 본래 목적(형제 키 전체를 합산하는 `hashSiblingKeys` 드래그 아이템)은
  그대로 유지 — 그룹 대표 필드 아이템은 여전히 위에 보이고, 새로 추가된 개별 자식 노드는 비집계
  단일 키 드래그용으로 별도 제공. 즉 "합산해서 쓰기"와 "특정 미디어타입(0/10/IN_TOT)만 보기"를 둘 다
  같은 트리에서 고를 수 있게 됨.
- **후속 수정 (같은 세션)**: 위 1차 버전은 해시그룹을 펼치면 대표 키의 JSON 필드(컬럼값)가 *바로*
  자동으로 fetch→렌더돼서, 사용자 입장에선 "개별 키 3개가 보이다가 갑자기 컬럼값들로 바뀌어버린다"는
  피드백을 받음 — 펼침 직후 개별 키 목록과 대표 키의 컬럼 로딩이 같은 자리에서 순서대로 나타나
  목록이 바뀐 것처럼 보였던 것. `RedisTreeNode`에 `showAggregate` state를 추가해 "∑ 전체 합계"
  버튼(개별 키 목록 위, 별도 행)을 명시적으로 눌러야만 대표 키의 합산 필드 아이템이 뜨도록 분리.
  버튼을 누르지 않으면 펼침 직후엔 개별 키(`0`/`10`/`IN_TOT`) 목록만 보이고 자동으로 아무것도
  fetch되지 않음.
- 관련 파일: `src/app/pages/board/TaskCreate.tsx` (`RedisTreeNode`)
- 검증: `npx eslint --fix` 통과(기존 경고 7건 외 신규 에러/경고 없음). 실제 브라우저 동작 확인 미실시.

## 2026-06-22 세션17

### Redis 해시키/필드 검색 — 클라이언트 병렬 색인 제거, 서버 캐시 기반으로 전환 (BE 연동)
세션15~16에서 검색창 포커스 시 클라이언트가 모든 해시키의 엔트리를 `Promise.all`로 병렬 조회해 색인을
만들던 방식이, 해시키가 많을 때 한꺼번에 수십~수백 개 요청이 나가 "페이지 전체가 느려진다"는 문제로
이어짐(사용자 직접 보고). 사용자가 "차라리 Spring Boot 기동할 때 메모리에 담아두면 빠를 것 같다"고
제안 → BE에 캐시를 추가하고 FE는 그 캐시를 그냥 받아오는 방식으로 교체.
- **FE 즉시 조치**: 클라이언트 측 `ensureFieldIndex`/`fieldIndex` state/`Promise.all` 병렬 조회 로직
  전부 제거(임시로 `fieldIndex=null`만 둬서 키 경로 검색만 동작하게 함) — 슬로우다운 즉시 해소.
- **BE 추가**(`BT-ADMIN-SERVICE-TASKBOARD`, 상세는 그쪽 CHANGELOG.md 참고): 해시 키 목록과 같은 시점
  (기동 `@PostConstruct` / `refresh=true` 새로고침)에 각 키의 컬럼명까지 미리 계산해 `redisHashColumnsCache`
  에 적재, 신규 엔드포인트 `GET /api/taskboard/redis/hash-columns`로 캐시를 즉시 반환(Redis 직접 조회
  없음). BFF AGG FLOW `taskboard-redis-hashcolumns` 신규 등록(`V92` 마이그레이션).
- **FE 재연동**: `ctiRedisApi.getRedisHashColumns()` + `useGetRedisHashColumns()` 훅 신규 추가,
  `useRefreshRedisHashKeys`가 새로고침 성공 시 `hashColumns` 쿼리도 같이 invalidate하도록 수정(새로고침
  버튼 하나로 키 목록 + 컬럼 캐시 둘 다 갱신). `RedisHashSection`이 이 훅으로 `fieldIndex`를 받아
  `filterRedisTree`에 그대로 전달 — 검색 시 별도 요청 없이 즉시 필터링됨.
- 관련 파일: `pages/board/TaskCreate.tsx`, `features/board/api/ctiRedisApi.ts`,
  `features/board/hooks/useTaskboardQueries.ts`
- 검증: `npx eslint --fix`(신규 에러 없음) + `npx tsc -p apps/taskboard/tsconfig.app.json --noEmit`
  (에러 없음). BE는 `./gradlew :BT-ADMIN-SERVICE-TASKBOARD:compileJava` BUILD SUCCESSFUL. **브라우저
  실측 미실시** — BFF가 V92 마이그레이션을 적용한 뒤(DB 반영 필요) `SUM_CONN_CNT` 검색이 즉시 동작하는지,
  새로고침 버튼이 키+컬럼 캐시를 같이 갱신하는지 사용자가 직접 확인 필요

## 2026-06-22 세션16

### Redis 해시키 검색이 필드명으로 안 찾아지던 버그 수정
세션15에서 추가한 필드명 색인이 `SUM_CONN_CNT`로 검색해도 안 잡혔던 원인 — "해시그룹"(예: `IC:CTIQ:0`,
`IC:GROUP:0`)은 해시 필드값 자체가 JSON이라, 진짜 컬럼명(`SUM_CONN_CNT` 등)은 그 JSON **안**에 있고
해시 필드명(`Object.keys(hashEntries)`)은 큐/그룹 ID 같은 식별자일 뿐이었음 — 그래서 색인이
`Object.keys(entries)`만 보고 있어서 정작 검색하고 싶은 컬럼명을 못 모았던 것. `RedisHashFieldItems`가
드래그 목록을 만들 때 쓰던 "첫 entry 값이 JSON이면 그 키들을 컬럼으로 본다" 로직을 `getRedisHashColumns()`
로 뽑아내 검색 색인(`ensureFieldIndex`)에서도 동일하게 사용하도록 수정 — 이제 `SUM_CONN_CNT`로 검색하면
그 컬럼을 가진 해시키(`IC:CTIQ:0` 등)가 바로 나옴.
- 관련 파일: `pages/board/TaskCreate.tsx`
- 검증: `npx eslint --fix`(신규 에러 없음) + `npx tsc -p apps/taskboard/tsconfig.app.json --noEmit`(에러
  없음). **브라우저 실측 미실시**

## 2026-06-22 세션15

### TaskCreate 4건 — 마우스 위치 붙여넣기, Redis 키/필드명 검색, 잠금 시 선택 위젯 강조, 하이라이트 영역 보정
1. **Ctrl+C/V 붙여넣기 위치를 마우스 커서 기준으로**: `lastCanvasMousePosRef`(ref, 렌더 유발 안 함)로
   `boardContainerRef` 위에서 마우스가 마지막으로 있던 좌표(%)를 `onPointerMove`로 계속 갱신.
   `pasteWidgetsFromClipboard`가 기존 "원본에서 3% 비껴 놓기" 대신, 복사한 위젯들 중 최소 x/y를 기준으로
   상대 배치를 유지한 채 그룹 전체를 마우스 좌표로 옮겨 붙여넣음(마우스가 캔버스 밖에 있었으면 기존 방식
   으로 폴백).
2. **좌측 Redis 해시키 목록에 검색 추가**: 키 경로(예: `IC:CTIQ:0`)뿐 아니라 `SUM_CONN_CNT` 같은
   **필드명**으로도 찾을 수 있음. 단, 필드는 해시키를 펼칠 때(`RedisHashFieldItems`)만 조회되는 lazy
   구조라 검색 시점엔 비어있을 수 있음 — 검색창 첫 포커스 시 모든 leaf 키의 필드명을 백그라운드로 한 번
   긁어와(`queryClient.fetchQuery`, 기존 훅과 같은 쿼리키라 캐시 공유) 인덱싱(`fieldIndex` state)한 뒤
   `filterRedisTree()`로 트리를 재귀 필터링, 검색 중엔 결과 경로를 보여주기 위해 강제 펼침(`forceExpand`).
   매칭은 공통 fuzzy 유틸(`fuzzyScore`, `@/shared-util`) 사용.
   **사용자 질문에 대한 답변**: 키 목록은 서버 기동 시 SCAN해서 캐싱하지만, 필드(해시 안의 값)는 트리를
   끝까지 펼칠 때만 조회하는 구조였음 — 이번 검색 기능은 그 구조를 바꾸지 않고 클라이언트에서 검색 시점에
   한 번 긁어오는 방식으로 우회. 사용자가 "필드값 전체를 부팅 시 긁어오는 게 어떻겠냐"고 제안했으나, 값
   (HGETALL) 전체 캐싱은 ①실시간 수치라 캐싱 즉시 stale ②키 많아지면 부팅 지연 우려로 비추천하고, 대신
   "필드 이름만(HKEYS, 훨씬 가벼움)"을 기존 키 목록 SCAN과 같은 시점에 캐싱하는 BE 변경을 대안으로 제안함
   (이번엔 미구현, 후속 작업 필요 시 진행).
3. **위젯 잠금 시 선택한 위젯 강조**: 잠금 중엔 호버 액션 버튼이 사라져서 어떤 위젯을 보고 있는지 표시가
   약해지는 문제 — 선택 링 스타일을 `locked && isSelected`일 때 기존 흐릿한 흰색 링 대신 `ring-amber-400`
   + 바깥쪽 amber 글로우(`shadow-[0_0_0_3px_...]`)로 강화해 잠금 상태에서도 선택 위젯이 뚜렷이 보이게 함.
4. **하이라이트 모션이 값 위치 세밀조정 영역을 못 채우던 문제**: `valueChangeAnimation: 'highlight'`가
   값 텍스트 div 자체에 배경색을 입혀서, `valueOffsetX/Y`로 텍스트가 옮겨가면 정작 사용자가 잡은 위젯
   박스 전체가 아니라 텍스트 주변에만 색이 칠해졌음. 텍스트 div에서 하이라이트 클래스/스타일을 떼어내고,
   위젯 박스 전체를 덮는 별도 오버레이 div(`absolute inset-0`, 텍스트보다 먼저 렌더해 아래에 깔림,
   `pointer-events-none`)로 옮겨 그림 — TaskCreate/TaskView/RollingDisplay 3곳 모두 동일하게 수정
   (TaskView/RollingDisplay는 오버레이 기준점을 잡기 위해 바깥 래퍼에 `relative` 추가). pulse/shake/
   bounce/flash는 기존처럼 텍스트에 그대로 적용(변경 없음).
- 관련 파일: `pages/board/{TaskCreate,TaskView}.tsx`, `features/board/components/RollingDisplay.tsx`
- 검증: `npx eslint --fix`(신규 에러 없음, 기존 경고만 잔존) + `npx tsc -p
  apps/taskboard/tsconfig.app.json --noEmit`(에러 없음). **브라우저 실측 미실시** — 4가지 모두 사용자가
  직접 확인 필요(특히 검색 인덱싱은 해시키 개수가 많을 경우 첫 포커스 시 다소 지연될 수 있음)

## 2026-06-22 세션14

### 위젯 잠금 시 마우스 커서가 "금지" 아이콘으로 보이던 문제 수정
자유모드에서 위젯이 잠겼을 때 위젯 본체에 `cursor-not-allowed`(브라우저 기본 차단/X 아이콘)를 줬는데,
잠금은 드래그·리사이즈만 막는 것이고 클릭으로 위젯을 선택해 우측 패널에서 스타일 설정은 그대로 바꿀 수
있어서 "아예 손댈 수 없다"는 오해를 주는 커서였음. `cursor-pointer`로 교체 — 여전히 클릭 가능한
인터랙티브 요소임을 정확히 표시.
- 관련 파일: `pages/board/TaskCreate.tsx`
- 검증: `npx eslint --fix`(신규 에러 없음) + `npx tsc -p apps/taskboard/tsconfig.app.json --noEmit`(에러
  없음). **브라우저 실측 미실시**

## 2026-06-22 세션13

### 위쪽 눈금자 서브픽셀 문제 — 사용자 실측 기반 추가 조치(paddingTop 제거)
세션12의 `transform` 조건부 제거로는 부족했음 — 사용자가 개발자도구로 직접 `padding-top: 16px`를
0으로 바꿔보고 "이렇게 하면 잘 나온다"고 확인 후 반영 요청. 눈금자 래퍼의 `paddingTop`을 완전히
제거(`paddingLeft`는 그대로 유지) — 위쪽 눈금자(16px 띠)는 더는 이미지 위쪽 별도 공간에 배치되지 않고
이미지 상단과 겹쳐서(오버레이로, z-index가 더 높아 위에 그려짐) 표시됨. 좌측 눈금자는 기존처럼
paddingLeft 공간에 배치되어 이미지와 겹치지 않음. 사용자가 만든 가이드 오버레이(z-150)는 항상 최상단
이라 영향 없음.
- 관련 파일: `pages/board/TaskCreate.tsx`
- 검증: `npx eslint --fix`(신규 에러 없음) + `npx tsc -p apps/taskboard/tsconfig.app.json --noEmit`(에러
  없음). **브라우저 실측 미실시(사용자가 직접 padding-top:0 테스트는 확인했으나 최종 빌드 기준 재확인
  필요)**

## 2026-06-22 세션12

### 위쪽 눈금자가 브라우저 줌 100%에서 거의 안 보이던 문제 — 실제 원인 확정 및 수정
사용자가 스크린샷(1.png)으로 직접 보여주며 확인 — "쪼그라들어 보인다"던 것은 위쪽 눈금자(왼쪽 눈금자와
같은 어두운 띠, 0/10/...100 눈금)였음. 브라우저 자체 줌(Ctrl+스크롤)이 100%일 때는 이 16px 고정 높이
띠가 거의 안 보일 정도로 얇아지고, 90%로 바꾸면 정상적으로 보임 — 전형적인 서브픽셀 라운딩 증상.
원인: 눈금자를 감싸는 래�퍼 div에 `transform: scale(zoom)`을 항상 적용하고 있었는데, `zoom`이 기본값
1(앱 자체 확대/축소 버튼을 안 누른 상태)이라도 `scale(1)`은 브라우저가 별도 컴포지팅 레이어를 생성하게
만들어, 그 레이어 안에서 16px 고정 높이 같은 정수 픽셀 요소가 브라우저 줌 배율에 따라 서브픽셀로
어긋나게 렌더링되는 경우가 있음. 조치: `zoom === 1`일 때는 `transform`/`transition` 자체를 style에서
빼서 컴포지팅 레이어를 생성하지 않게 함(앱 자체 확대/축소를 실제로 사용할 때만 transform 적용) —
가장 흔한 기본 상태(줌 안 만짐)에서 이 문제가 사라짐.
- 관련 파일: `pages/board/TaskCreate.tsx`
- 검증: `npx eslint --fix`(신규 에러 없음) + `npx tsc -p apps/taskboard/tsconfig.app.json --noEmit`(에러
  없음). **브라우저 실측 미실시** — 브라우저 줌 100%에서 위쪽 눈금자가 정상적으로(눈금/숫자 보이게)
  렌더되는지 사용자가 직접 확인 필요. 만약 그래도 재현되면 앱 자체 확대/축소를 0.25~2 단위가 아니라 실제
  사용 중인 zoom 값이 1이 아닌 다른 값(예: 1.0000001 같은 부동소수점 오차)인지도 같이 확인 필요.

## 2026-06-22 세션11

### 세션9~10 패딩/경계선 변경 원복 — 요구사항을 잘못 짚었음을 사용자가 확인
사용자가 실제 렌더된 HTML(`padding-top: 40px`)을 직접 캡처해 보여주며 "이쪽 부분은 처음으로 원복"
요청 + "내가 얘기한 건 HD로 했을 경우 위쪽 가이드라인이 쪼그라들어서 실선처럼 보이는 거였다, 잘못
수정했다"고 정정. 세션9~10에서 추가한 `TOP_GUIDE_GAP`(24px 기본 여백)·좌측 눈금자 위치 보정·캔버스
상단 경계선(고정 실선)을 전부 원복 — 바깥 패딩 `16px`(showGuides 시), 좌측 눈금자 `top-4`(원래 코드)로
복귀. `RULER_SIZE`/`TOP_GUIDE_GAP` 상수 제거. (세션8의 가이드 오버레이를 `DroppableBoard` 밖으로 옮긴
overflow-clip 수정과 `imageRatio` onLoad 갱신은 패딩/경계선과 무관한 별개 수정이라 그대로 유지.)
**다음 단계**: "HD 이미지일 때 위쪽 가이드라인이 쪼그라들어 실선처럼 보인다"는 현상을 정확히 재현하기
위해 사용자에게 스크린샷/더 구체적인 설명 요청 예정 — 지금까지 4차례 추측(이미지 비율, overflow 클리핑,
패딩 부족, 경계선 부재)이 모두 빗나갔으므로 추가 추측 대신 직접 확인 필요.
- 관련 파일: `pages/board/TaskCreate.tsx`
- 검증: `npx eslint --fix`(신규 에러 없음) + `npx tsc -p apps/taskboard/tsconfig.app.json --noEmit`(에러
  없음).

## 2026-06-22 세션10

### 세션9 후속 — 캔버스 상단 경계선을 좌측처럼 고정 실선으로 추가
- 세션9에서 위쪽에 빈 공간(TOP_GUIDE_GAP)은 생겼지만, 좌측 눈금자처럼 캔버스 경계를 표시하는 고정
  실선이 위쪽에는 없어서 눈금자 띠와 이미지 사이 빈 공간의 경계가 불분명했음. 좌측 눈금자가
  `borderRight: '1px solid #334155'`로 이미지 좌측 경계를 항상 표시하는 것과 동일하게, 이미지 상단 경계
  (`top: RULER_SIZE + TOP_GUIDE_GAP`, 즉 boardContainerRef 시작 위치)에 `left-4 right-0 h-px bg-slate-700`
  고정 실선을 추가. 사용자가 만든 가이드(드래그 가능, 청록색)와는 별개로 항상 표시되는 캔버스 경계
  기준선.
- 관련 파일: `pages/board/TaskCreate.tsx`
- 검증: `npx eslint --fix`(신규 에러 없음) + `npx tsc -p apps/taskboard/tsconfig.app.json --noEmit`(에러
  없음). **브라우저 실측 미실시** — 상단 경계선이 좌측 눈금자 경계선과 같은 높이/정렬로 보이는지 사용자가
  직접 확인 필요

## 2026-06-22 세션9

### 세션8 후속 정정 2건 — 버튼 명칭 변경, 가이드 여백 재수정(눈금자-이미지 정합 버그 동반 수정)
1. **"전체 잠금" → "위젯 잠금"으로 버튼 명칭 변경**: 동작은 동일(`canvasLocked`), 툴바 버튼 라벨/title
   텍스트만 변경.
2. **가이드라인 위쪽 쏠림 — 세션8 패딩 확대(16→32px)로도 개선이 안 됨, 재분석 후 원인 확정**: 세션8에서
   바깥 패딩만 32px로 늘렸을 뿐 좌측 눈금자(`top-4`=16px 고정, `bottom-0`)는 그대로 둬서, 눈금자의
   0~100% 구간이 실제 이미지의 0~100% 구간보다 16px 더 길게 잡히는 정합 버그가 새로 생겼었음(눈금자 눈금
   위치가 실제 가이드 라인 위치와 미세하게 어긋남). 사용자가 "여전히 똑같다"고 재현 → 구조를 정리해
   `RULER_SIZE`(16px, 눈금자 띠 두께)와 `TOP_GUIDE_GAP`(24px, 전광판 이미지 위쪽 기본 여백)을 명시적
   상수로 분리: 바깥 래퍼 `paddingTop = RULER_SIZE + TOP_GUIDE_GAP`(40px), 상단 눈금자는 여전히
   `top:0, height:16px`로 캔버스 맨 위 고정, **좌측 눈금자의 top을 `RULER_SIZE + TOP_GUIDE_GAP`(40px)로
   내려서 이미지 상단(paddingTop)과 정확히 같은 위치에서 시작**하도록 수정 — 이제 눈금자 0~100%가 항상
   이미지 0~100%와 정확히 일치하면서, 눈금자 띠(16px)와 이미지 사이에 24px의 명확한 빈 공간이 생겨
   맨 위 가까이 만든 가이드 라벨이 그 공간에 표시됨(가로 패딩은 다시 16px로 되돌림 — 이번엔 위쪽만
   요청받음).
- 관련 파일: `pages/board/TaskCreate.tsx`
- 검증: `npx eslint --fix`(신규 에러 없음) + `npx tsc -p apps/taskboard/tsconfig.app.json --noEmit`(에러
  없음). **브라우저 실측 미실시** — 맨 위쪽 가이드 라벨이 이제 보이는지, 눈금자 눈금이 실제 가이드 위치와
  정확히 맞는지 사용자가 직접 확인 필요

## 2026-06-22 세션8

### 세션7 정정 2건 — 가이드라인 쏠림 실제 원인, 위젯 잠금을 위젯별→캔버스 전체 단위로 변경
1. **가이드라인 위쪽 쏠림 — 세션7의 이미지 비율(`imageRatio`) 수정으로는 해결 안 됨, 진짜 원인 확인**:
   `DroppableBoard` 컴포넌트 자체가 `rounded-xl overflow-hidden`인데, 가이드 오버레이(`{guides}`)를 그
   안쪽(`guides` prop)에 자식으로 렌더하고 있었음 — 가이드 라벨이 선 반대쪽에 그려질 때 쓰는 음수
   top/left 오프셋(예: 수평 라벨 `top:'-11px'`, 수직 라벨 `left:'-20px'`)이 캔버스 가장자리, 특히 위쪽
   가까이 만든 가이드일수록 이 overflow-hidden 경계에 잘려 잘 안 보였던 것. 이미지 비율과는 무관한
   구조적 클리핑 버그였음. 조치: 가이드 오버레이를 `DroppableBoard` 밖, `boardContainerRef`(overflow
   클리핑 없음) 바로 아래 형제로 이동(`guides` prop 제거, `<><DroppableBoard>...</DroppableBoard>
   {guidesOverlay}</>` 구조로 변경) — 이제 어느 가장자리에서도 라벨이 잘리지 않음. 추가로 사용자 요청대로
   눈금자 바깥 패딩을 16px→32px로 늘려(눈금자 자체는 여전히 16px) 가장자리 가이드 라벨이 숨 쉴 공간을
   확보. (세션7의 `imageRatio` onLoad 갱신 자체는 비-16:9 이미지 letterbox 정합성 측면에서 유효한
   개선이라 되돌리지 않고 유지)
2. **위젯 잠금: 위젯별 → 캔버스 전체 단위로 변경**: 세션7에 추가한 위젯별 Lock 토글(캔버스 호버 버튼 +
   우측 패널 스위치, `DroppedWidget.locked`)을 전부 제거하고, 상단 툴바의 자유/그리드 모드 토글·되돌리기
   /다시실행 버튼 옆에 "전체 잠금" 버튼 하나로 교체(`canvasLocked` 로컬 state, zoom처럼 저장 대상 아님).
   켜면 모든 위젯의 자유모드 드래그·리사이즈 핸들·방향키 이동(단일/다중)·그리드모드 RGL 자체 드래그/
   리사이즈(`static: canvasLocked`)가 한꺼번에 차단됨. `CanvasWidgetFree`/`CanvasWidgetGrid`는 위젯별
   `locked` 대신 부모가 내려주는 `locked: boolean` prop만 받음.
- 관련 파일: `pages/board/TaskCreate.tsx`, `features/board/types/taskboard.types.ts`(`locked` 필드 제거)
- 검증: `npx eslint --fix`(신규 에러 없음) + `npx tsc -p apps/taskboard/tsconfig.app.json --noEmit`(에러
  없음). **브라우저 실측 미실시** — 가이드라인이 모든 가장자리에서 안 잘리는지, 전체 잠금 켰을 때 자유/
  그리드 모드 양쪽에서 모든 위젯이 실제로 안 움직이는지 사용자가 직접 확인 필요

## 2026-06-22 세션7

### TaskCreate 3건 — 위젯 잠금, 값-위치 세밀조정+애니메이션 합성, 배경이미지 비율별 가이드라인 보정
1. **위젯 잠금(Lock)**: `DroppedWidget.locked?: boolean` 신규. 캔버스 위젯 호버 액션 줄에 Lock/Unlock 토글
   버튼 추가(잠그면 항상 노출, 삭제/복사 버튼은 숨김), 우측 패널에도 "위치/크기 잠금" 스위치 추가.
   잠금 시: 자유모드 드래그(`onPointerDown`)·리사이즈 핸들 숨김·방향키 이동(단일/다중 선택 모두)·그룹
   드래그(다중 선택 중 잠긴 위젯은 같이 안 끌려옴)를 모두 차단. 그리드 모드는 `toGridItem()`이 `static:
   widget.locked === true`를 반환해 react-grid-layout 자체 드래그/리사이즈를 비활성화.
   복사/붙여넣기를 반복하다 의도치 않게 0.1%씩 밀리는 사고를 막기 위한 요청 — 한 번 자리 잡은 위젯은
   잠가두면 이후 어떤 경로로도(드래그/리사이즈/방향키/그룹이동) 움직이지 않음
2. **값 텍스트 위치 세밀조정 ↔ 값변경 애니메이션 합성**: 직전 세션에 추가한 `valueOffsetX/Y`가
   `pulse`/`shake`/`bounce` 애니메이션 재생 중에는 keyframe의 자체 `transform`이 덮어써서 텍스트가
   원점으로 순간 복귀했다가 되돌아오는 것처럼 보이는 문제 확인(사용자가 "애니메이션을 주면 박스 전체가
   움직이는 것처럼 보인다"고 보고한 현상의 원인). `widgetVisualStyle.ts`의 keyframes를 전부
   `translate(var(--tb-offset-x,0px), var(--tb-offset-y,0px))`를 베이스로 깔고 그 위에 모션을 합성하도록
   재작성, 신규 `getValueOffsetStyle(style)`가 `--tb-offset-x/y` CSS 변수 + 베이스 transform을 함께
   반환하도록 분리. TaskCreate/TaskView/RollingDisplay 3곳 모두 기존의 별도 `transform: translate(...)`
   인라인 코드를 제거하고 `getValueOffsetStyle()` 호출로 교체 — 이제 오프셋과 애니메이션이 항상 같은
   좌표계를 공유해 애니메이션 중에도 글자만 모션을 타고 박스/오프셋 기준점은 그대로 유지됨
3. **HD 등 16:9가 아닌 배경 이미지에서 세로 가이드라인이 위로 쏠리는 문제**: 원인은 TaskCreate 편집기
   캔버스 컨테이너(`boardContainerRef`)가 실제 업로드 이미지의 실제 비율을 한 번도 읽지 않고
   `imageRatio` state를 하드코딩 기본값 `'16/9'`로만 사용하던 것 — 배경 이미지가 정확히 16:9가 아니면
   `object-contain` 레터박싱으로 실제 보이는 이미지 영역과 가이드라인 좌표계(컨테이너 기준 %)가 어긋남.
   FHD 이미지는 대체로 16:9라 우연히 안 보였을 뿐, 어긋남 자체는 모든 비-16:9 이미지에 동일하게 있던
   구조적 문제. `DroppableBoard`의 배경 `<img>`에 `onLoad` 핸들러를 추가해 `naturalWidth/naturalHeight`로
   `imageRatio`를 실제 이미지 비율로 갱신하도록 수정 — 이제 어떤 해상도/비율의 이미지든 캔버스 박스가
   실제 이미지 비율과 항상 일치해 가이드라인이 정확한 위치에 표시됨. (TaskView/RollingDisplay 실행화면은
   `object-fill`로 이미지를 박스에 맞춰 늘려서 그리는 별도 방식이라 이 문제 자체가 없음 — 확인만 하고
   미수정)
- 관련 파일: `pages/board/{TaskCreate,TaskView}.tsx`, `features/board/components/RollingDisplay.tsx`,
  `features/board/{types/taskboard.types.ts,utils/widgetVisualStyle.ts}`
- 검증: `npx eslint --fix`(신규 에러 없음, 기존 경고만 동일하게 잔존) + `npx tsc -p
  apps/taskboard/tsconfig.app.json --noEmit`(에러 없음). **브라우저 실측 미실시** — 특히 비-16:9 이미지
  업로드 후 가이드라인 정렬, 애니메이션+오프셋 동시 적용 시 움직임, 잠금 상태에서 드래그/리사이즈/방향키
  전부 막히는지는 사용자가 직접 확인 필요

## 2026-06-22 세션6

### TaskCreate 4건 — 사용자 지정 시계, 스포이드, 값 위치 세밀조정, 데이터 출처 표기 보강
1. **사용자 지정 시계 포맷**: 기존 3종(날짜/시간/날짜+시간) 옆에 "사용자 지정"(`etc-custom`) 추가. 신규
   `clockFormat?: string`(`DroppedWidget`)에 `yyyy/mm/dd/hh24/mi/ss` 토큰 포맷 문자열 저장(기본값
   `yyyy년 mm월 dd일 hh24시 mi분 ss초`). 신규 유틸 `features/board/utils/clockFormat.ts`의
   `formatCustomClock(date, format)`가 토큰만 치환하고 나머지 글자(공백, "년"/"월" 등)는 그대로 둠.
   TaskCreate/TaskView/RollingDisplay 3곳의 `ETC_CLOCK_IDS` 세트와 `getLiveValue()`에 동일하게 반영,
   TaskCreate 우측 패널에 포맷 입력창 + 토큰 안내 + 실시간 미리보기 추가
2. **텍스트/배경 색상 스포이드**: 브라우저 `EyeDropper` API(Chrome/Edge) 사용 — 화면의 배경 이미지를 포함해
   어디서든 클릭한 픽셀의 색상을 그대로 가져와 적용. 미지원 브라우저(Firefox/Safari)는 토스트로 안내, 기존
   `<input type="color">` 직접 선택은 그대로 유지. `핸들러: handlePickColorFromScreen('color'|'bgColor', widgetId)`
3. **값 텍스트 위치 세밀조정**: `WidgetStyle.valueOffsetX/valueOffsetY`(px) 신규 — `valueAlign`(좌/중/우)으로
   큰 정렬을 잡은 뒤 1px 단위로 미세 이동 가능. 우측 패널에 ▲▼◀▶ 방향패드 + X/Y 직접입력 + 초기화 버튼 추가.
   적용은 `transform: translate(x, y)`로 TaskCreate/TaskView/RollingDisplay 3곳 모두 동일하게.
   ⚠️ 알려진 제약: `valueChangeAnimation`이 `pulse`/`shake`/`bounce`(transform 기반 모션)일 때는 애니메이션
   재생 중 이 offset transform과 충돌해 순간적으로 위치가 튈 수 있음(`flash`/`highlight`는 opacity/배경색만
   바꿔서 충돌 없음) — 두 기능을 동시에 강하게 쓰는 조합은 비권장, 필요해지면 후속으로 키프레임에 offset을
   합성하는 방식으로 개선 가능
4. **WS 구독/breadcrumb 문의 확인 결과**: 사용자가 캡처한 요청(`IC:CTIQ:0`/`IC:CTIQ:10`/`IC:CTIQ:IN_TOT`
   3개 + `IC:GROUP:0` 1개)과 응답(`IC:CTIQ:IN_TOT`가 빈 객체)은 **버그가 아님** — `queueMediaTypes`가
   `tableQueueWidgets`/`queueChartWidgets`에 설정된 모든 고유 `mediaType`의 합집합이라, 미디어타입이 다른
   큐 위젯을 3개 등록했으면 그대로 3개 구독이 나가는 게 정상(`TaskView.tsx`/`RollingDisplay.tsx` 동일 로직).
   `IN_TOT` 빈 응답은 해당 큐가 그 미디어타입 해시에 필드가 없다는 뜻으로, Redis/BE 쪽 데이터 유무 문제.
   다만 "task-create에서 IC:CTIQ까지만 보이고 미디어타입이 안 보인다"는 지적은 실제 보강 포인트였음 —
   `getWidgetDataSourcePath()`가 `table-queue`/`table-group`/`table-agent`/`chart-bar-queue`/
   `chart-line-trend`일 때 그동안 `리스트 위젯 > {label}`로만 표시하던 것을, 위젯에 설정된 `item.mediaType`을
   반영해 `리스트 위젯 > 큐 현황표 (Redis 해시키 > IC > CTIQ > 10)`처럼 실제 구독 대상까지 보이게 수정.
   (단일 Redis 필드를 드래그한 값 위젯의 `redisHashKey`는 이미 `IC:CTIQ:0`처럼 미디어타입을 포함해 저장되고
   있어 그 경로는 원래도 정상 — 짧게 보였던 건 테이블/차트 위젯 한정 케이스였음)
- 관련 파일: `pages/board/{TaskCreate,TaskView}.tsx`, `features/board/components/RollingDisplay.tsx`,
  `features/board/{types/taskboard.types.ts,utils/clockFormat.ts(신규)}`
- 검증: `npx eslint --fix`(신규 에러 없음) + `npx tsc -p apps/taskboard/tsconfig.app.json --noEmit`(에러 없음).
  **브라우저 실측 미실시** — 특히 스포이드는 Chrome/Edge에서만 동작하므로 사용 브라우저 확인 필요

## 2026-06-22 세션5

### TaskCreate 캔버스 확대/축소(+/−) 버튼 추가
- `zoom` state(기본 1, 0.25~2.0, 10%p 단위) 신규 — 저장 대상이 아닌 순수 보기 편의 기능이라 `layoutJson`에는
  포함하지 않음(새로고침/재진입 시 100%로 초기화)
- 툴바에 되돌리기/다시실행 그룹 옆에 "−  100%  +" 버튼 그룹 추가. 가운데 퍼센트 버튼 클릭 시 100%로 즉시 초기화
- 눈금자+캔버스를 함께 감싸는 외부 래퍼에 `transform: scale(zoom)`만 적용 — 레이아웃 박스 자체 크기는 안 바뀌므로
  드래그/리사이즈 좌표 계산(`getBoundingClientRect()` 기반 비율 계산이라 스케일 무관하게 정확)과 폰트
  스케일(`ResizeObserver.contentRect` 기반 `containerWidth` — transform 영향 안 받음)에 전혀 영향 없음
- 캔버스 영역 컨테이너를 `overflow-hidden` → `overflow-auto`로 변경해, 확대해서 캔버스가 영역보다 커져도
  스크롤로 잘린 부분을 볼 수 있게 함

### 후속 수정 — 확대 시 좌상단으로 스크롤이 안 닿던 버그
**증상**: 사용자가 확인해보니 확대한 다음 다른 모서리(예: 좌상단 → 우상단)로 스크롤 이동이 안 됨.
**원인**: 캔버스 래퍼를 `flex items-center justify-center`로 중앙 정렬한 채로 `transform: scale()`을
적용해서, 중앙에서 사방으로 커지는 구조가 됐음. 브라우저는 overflow 컨테이너에서 콘텐츠의 "끝(bottom/right)"
방향 overflow만 스크롤로 닿게 해주고 "시작(top/left)" 방향 overflow는 스크롤로 못 닿는 게 기본 동작이라,
중앙에서 사방으로 커지면 절반(좌/상 방향 증가분)은 스크롤해도 영영 보이지 않음.
**조치**: `zoom > 1`일 때는 외부 컨테이너의 flex 중앙정렬을 끄고, 캔버스 래퍼에 `origin-top-left`를 줘서
좌상단을 고정점으로 우/하 방향으로만 커지게 변경(`mx-auto`로 가로 중앙 위치는 유지). 이제 어느 방향으로 확대해도
스크롤로 전부 닿을 수 있음. `zoom <= 1`(기본/축소)일 때는 기존처럼 flex 중앙정렬 유지(회귀 없음).
- 관련 파일: `pages/board/TaskCreate.tsx`
- 검증: `npx eslint --fix`(신규 에러 없음) + `npx tsc -p apps/taskboard/tsconfig.app.json --noEmit`(에러 없음).
  **브라우저 실측 미실시** — 확대 후 스크롤로 사방 모서리에 전부 닿는지, 드래그·리사이즈 좌표가 어긋나지
  않는지 사용자가 직접 확인 필요

## 2026-06-22 세션4

### TaskCreate 전체(바깥) 스크롤 버그 수정 — h-screen → h-full
**증상**: task-create 화면에서 좌측(위젯 팔레트)/가운데(캔버스)/우측(스타일 패널) 각자 내부 스크롤은 정상인데,
그 바깥에 페이지 전체가 스크롤되는 영역이 하나 더 생겨서 내리면 3단 레이아웃 전체가 같이 밀려 내려감.
- **원인**: host의 콘텐츠 슬롯(`apps/host/.../Layout.tsx`)이 `<main className="flex-1 h-full p-4
  overflow-y-auto">`로 `<Outlet/>`을 감싸는데, TaskCreate의 루트가 그 안에서 `h-screen`(뷰포트 100vh 고정)을
  쓰고 있었음. host 상단 바 등 다른 영역이 이미 일부 높이를 쓰고 있어 `main`의 실제 가용 높이는 100vh보다
  작은데, TaskCreate가 그와 무관하게 100vh를 그대로 요구하니 `main`(`overflow-y-auto`)이 통째로 스크롤
  컨테이너가 되어버린 것 — 사용자가 본 "전체 스크롤"이 바로 이 `main`.
- **조치**: 루트 div를 `h-screen` → `h-full`로 변경. React Router `<Outlet/>`은 별도 DOM 래퍼를 만들지
  않으므로(App.tsx의 Suspense/useRoutes도 마찬가지) TaskCreate 루트의 실제 DOM 부모는 host의 `<main>`이고,
  `main`이 이미 구체적인 높이를 갖고 있어 `h-full`이 정확히 그 높이로 맞춰짐 → 바깥 스크롤 제거, 내부 3단
  패널의 기존 `overflow-y-auto`/`overflow-hidden`은 그대로 유지되어 각자 독립적으로 스크롤됨
- apps/host는 건드리지 않음(개인 작업 범위 — apps/taskboard 자체 수정만으로 해결됨)
- 관련 파일: `pages/board/TaskCreate.tsx`
- 검증: `npx eslint`(신규 에러 없음) + `npx tsc -p apps/taskboard/tsconfig.app.json --noEmit`(에러 없음).
  **브라우저 실측 미실시** — 사용자가 직접 스크롤 동작 확인 필요

## 2026-06-22 세션3

### TaskCreate 캔버스 헤더 — 큐/그룹/상담사 미리보기 바 제거 + 위젯 데이터 출처 표시
1. **미리보기 전용 멀티선택 바 완전 제거**: 캔버스 상단의 "큐리스트/상담그룹/상담사" 멀티선택 바(저장 안 되고
   캔버스 미리보기에만 쓰이던 것)를 삭제. 이 화면은 위젯 배치/스타일만 설정하는 화면으로 한정한다는 사용자
   요청. 같이 정리된 것: `selectedQueueIds`/`selectedGroupIds`/`selectedAgentIds` state, 드롭다운 open
   state·ref 3쌍, `useGetCtiQueueList`/`useGetCtiAgentList`/`useGetCtiGroupList` 훅 호출, 외부 클릭 닫기
   useEffect, `toggleQueue`/`toggleAllQueues` 등 토글 핸들러 6개, `queueItems`/`agentItems`/`groupItems`
   변환, `savedMeta`의 `selectedQueueIds/selectedGroupIds/selectedAgentIds` 복원 필드, `MultiSelectDropdown`
   import. (참고: `useGetCtiMediaTypeList`/`mediaTypeItems`는 위젯 단위 미디어타입 설정에 별도로 쓰여서 유지)
2. **위젯 데이터 출처 표시**: 위젯 선택 시 우측 패널 X/Y/W/H 입력 아래에 "이 위젯이 실제로 바라보는 데이터"
   경로를 표시. 신규 `getWidgetDataSourcePath(item)` — Redis 위젯은 `Redis 해시키 > {hashKey 콜론 분해} >
   {redisField} > {redisJsonField?}`, 계산식은 "계산식 위젯", 공지는 "공지사항 > #id" 또는 "키 선택형", 시계는
   "기타 > 시계 > {label}", 테이블/차트는 "리스트 위젯 > {label}" / "차트 위젯 > {label}"
- 관련 파일: `pages/board/TaskCreate.tsx`
- 검증: `npx eslint --fix`(신규 에러 없음) + `npx tsc -p apps/taskboard/tsconfig.app.json --noEmit`(에러 없음).
  **브라우저 실측 미실시**

## 2026-06-22 세션2

### 위젯 Ctrl+C/Ctrl+V — 다른 브라우저 창(같은 출처)으로도 복사·붙여넣기
사용자 요청: 창 2개를 띄워놓고 한쪽 캔버스에서 위젯을 복사해 다른 쪽 캔버스에 붙여넣고 싶음.
- **저장 매체로 시스템 Clipboard API 대신 `localStorage` 채택** — `navigator.clipboard.readText()`는 secure
  context(HTTPS/localhost)가 필요해서 HTTP+IP로 접속하는 이 프로젝트 개발계에서 동작 안 함(기존
  `createUUID` 유틸을 둔 이유와 동일한 제약). `localStorage`는 같은 출처면 별도 창/탭 사이에도 공유되고
  보안 컨텍스트 제약이 없어 더 안정적.
- `copySelectedWidgets()` — 선택된 위젯(들)을 `{ source, widgets }` 형태로 `localStorage` 키
  `taskboard-widget-clipboard-v1`에 저장. `pasteWidgetsFromClipboard()` — 저장된 값을 읽어 source 마커로
  형식 검증 후, 각 위젯에 새 id 부여 + 기존 `duplicateWidget`과 동일한 +3% 오프셋을 적용해 캔버스에 추가하고
  붙여넣은 위젯들을 선택 상태로 만듦
- `Ctrl+C`/`Ctrl+V` 전역 keydown 핸들러 추가(기존 Ctrl+Z/Delete/방향키 단축키와 동일한 패턴 — input/select/
  textarea에 포커스 있을 때는 가로채지 않음). 다중 선택 상태에서 Ctrl+C 하면 선택된 위젯 전체가 함께 복사됨
- 관련 파일: `pages/board/TaskCreate.tsx`
- 검증: `npx eslint --fix`(신규 에러 없음) + `npx tsc -p apps/taskboard/tsconfig.app.json --noEmit`(에러 없음).
  **브라우저 실측 미실시** — 창 2개 띄워서 실제로 복사/붙여넣기 되는지 사용자가 직접 확인 필요

## 2026-06-22

### "AI 생성" → "자동생성" 명칭 통일 + 하이라이트 색상 사용자 지정
1. **명칭 변경**(`TaskBg.tsx`): "png 자동생성 (AI)" → "png 자동생성"(괄호 제거), "AI 생성" → "자동생성"(카드 뱃지,
   모달 2단계 라벨, "다음 단계" 버튼, 자동생성 파일명 접두사 `AI생성_` → `자동생성_`, 코드 주석 1곳)
2. **값 변경 애니메이션 "하이라이트" 색상 사용자 지정**: 기존엔 keyframes(`tbValHighlight`)에 노란색이
   `rgba(255,214,51,0.85)`로 고정 박혀 있었음. `WidgetStyle.highlightColor?: string` 추가, keyframes의
   `background-color`를 `var(--tb-highlight-color, rgba(255,214,51,0.85))`로 변경(미지정 시 기존 노란색 유지),
   신규 `getValueAnimationStyle(style)` 헬퍼가 `highlightColor` 설정 시에만 CSS 변수를 인라인 style로 주입.
   TaskCreate.tsx 스타일 패널에서 "하이라이트" 선택 시에만 색상 picker(`<input type="color">`) 노출.
   TaskCreate(미리보기)/TaskView/RollingDisplay 3곳 모두 적용.
- 관련 파일: `pages/board/{TaskBg,TaskCreate,TaskView}.tsx`, `features/board/components/RollingDisplay.tsx`,
  `features/board/{types/taskboard.types.ts,utils/widgetVisualStyle.ts}`
- 검증: `npx eslint --fix`(신규 에러 없음) + `npx tsc -p apps/taskboard/tsconfig.app.json --noEmit`(에러 없음).
  **브라우저 실측 미실시**

## 2026-06-21

### 코드 리뷰 후속 조치 — 버그 3건 + FE 데드코드 정리 2건
배경: fork agent로 TASKBOARD FE+BE 전체 리뷰 수행 후, 사용자가 1/2/3/6/7/8번 항목 진행을 승인.

[버그 수정]
- **#1/#3 task-mgmt 롤링 재생 시 table-group 컬럼 누락**: `RollingDisplay.tsx`의 `LayoutScreen.renderWidget`이
  `groupHashRtsFallback`으로 보강한 `tableColumns`을 계산해놓고 `RollingTableWidget`에 전달하지 않던 버그.
  `RollingTableWidget`에 `ViewTableWidget`(TaskView.tsx)과 동일한 `columns` override prop 추가 + 호출부에서
  `columns={tableColumns}` 전달. task-view에서는 보이던 자동추론 컬럼이 task-mgmt 롤링에서는 안 보이던 증상 해결.
- **#2 "1000단위 콤마" 토글이 실행화면에서 무동작**: `formatWidgetValue`를 TaskCreate.tsx 로컬 함수에서
  `widgetVisualStyle.ts` 공용 유틸로 이동 + 숫자 문자열도 처리하도록 개선(기존엔 `typeof value === 'number'`만
  체크해서, 실행화면의 Redis/계산식 값처럼 문자열로 내려오는 값에는 애초에 적용될 수 없는 구조였음). `TaskView.tsx`
  `ViewValueWidget` / `RollingDisplay.tsx` `RollingValueWidget`의 `{displayValue}` 직접 출력을
  `{formatWidgetValue(displayValue, widget.style.useThousandSep)}`로 교체.

[FE 데드코드 정리]
- **#8 `WidgetStyle` 미사용 필드 6개 제거**: `widgetLayout`/`titleBgColor`/`valueBgColor`/`valueColor`/`titleIcon`/
  `valueFontScale` — 세 렌더러(TaskCreate/TaskView/RollingDisplay) 어디서도 안 읽던 "분리형 레이아웃" 미완성
  기능 흔적(`taskboard.types.ts`).
- **#7 `useGetRedisHashFields` + `ctiRedisApi.getRedisHashFields` 제거**: 앱 전체 호출처 0건 확인(2026-06-15 즈음
  `getRedisHashEntries`로 대체된 듯). `useTaskboardQueries.ts`의 훅·쿼리키, `ctiRedisApi.ts`의 API 함수 삭제.
  ⚠️ **BE 쪽 `/redis/hash-fields/**` 컨트롤러 엔드포인트(`TaskBoardController.getRedisHashFields`)와
  `TaskBoardService.selectRedisHashFields`는 이번에 안 지움** — FE 호출자가 없어져 같이 고아가 됐을 가능성이 높지만
  사용자가 명시 승인한 항목(#7)이 FE 한정이라 BE 컨트롤러는 별도 확인 후 정리 권장.
- 관련 파일: `pages/board/{TaskCreate,TaskView}.tsx`, `features/board/components/RollingDisplay.tsx`,
  `features/board/{types/taskboard.types.ts,utils/widgetVisualStyle.ts,api/ctiRedisApi.ts,hooks/useTaskboardQueries.ts}`
- 검증: `npx eslint --fix`(신규 에러 없음) + `npx tsc -p apps/taskboard/tsconfig.app.json --noEmit`(에러 없음).
  **브라우저 실측 미실시**

## 2026-06-20 세션3

### task-mgmt 5건 UI/UX 개선
1. **헤더 설명문 제거**: `TaskMgmt.tsx`/`TaskList.tsx`/`TaskNotice.tsx` 메인 타이틀(`<h1>`) 아래 설명 `<p>` 삭제.
   `TaskBg.tsx`는 확인해보니 원래 메인 헤더에 설명문이 없어서(이미 타이틀만) 변경 대상 없음.
2. **롤링 순서 — 드래그로 재정렬**: `@dnd-kit/sortable`(이미 워크스페이스에 있는 의존성, host
   `FavoriteBar`/`SortableFavoriteChip` 패턴 그대로 적용) 도입. 위/아래 버튼 제거, X(제거) 버튼은 유지.
   `SortableRollingSlotRow` 신규 컴포넌트(드래그 핸들 `GripVertical` 아이콘). 같은 전광판이 여러 번 들어갈 수
   있어 배열 인덱스로는 dnd-kit이 항목을 안정적으로 추적 못 하므로, 상태 모델을 `number[]` → `{uid, layoutId}[]`
   (`RollingSlot`, `createUUID`로 슬롯마다 고유 uid 부여)로 변경. 저장 시에는 `slots.map(s => s.layoutId)`로
   풀어서 기존과 동일한 단순 배열 포맷 유지(BE/DB 영향 없음)
3. **롤링 간격 3~60초 → 3~180초**: range/number 입력 두 곳의 min/max, 라벨 텍스트 동시 수정
4. **삭제 확인을 모달로 통일**: `TaskMgmt.tsx`(그룹 삭제)·`TaskNotice.tsx`(공지 삭제) 둘 다 `window.confirm` →
   `TaskBg.tsx`/`TaskList.tsx`와 동일한 모달 패턴(`deleteTarget` state + `fixed inset-0` 오버레이 +
   `IconTrash` + 취소/삭제 버튼)으로 교체
5. **그룹 카드 그리드 4열로**: `GroupListView`의 `lg:grid-cols-3` → `lg:grid-cols-4`(넓은 화면에서 3개일 때
   남는 빈 공간 해소). `md:grid-cols-2`는 그대로 유지(화면 줄어도 2개 유지 요청 그대로)
- 관련 파일: `pages/board/{TaskMgmt,TaskList,TaskNotice}.tsx`
- 검증: `npx eslint --fix`(신규 에러 없음) + `npx tsc -p apps/taskboard/tsconfig.app.json --noEmit`(에러 없음).
  **브라우저 실측 미실시** — 특히 드래그 재정렬은 코드 리뷰만으로는 실제 동작감(스냅, 터치 등)을 확신할 수
  없어 사용자가 직접 확인 필요

## 2026-06-20 세션2

### 폰트 크기 48px → 96px 확장 + 실행 화면 반응형 폰트 스케일링 버그 발견·수정
**사용자 피드백**: "폰트크기 단계를 96px까지 늘려달라" + "반응형으로 만든 건데 화면 크기에 따라 글씨 크기가 같이
안 바뀌는 구조인 것 같다"는 의심 제기. 확인 결과 실제로 버그였음.

- **FONT_SIZES 확장**: `[10..48]`(12단계) → `[10,12,14,16,18,20,24,28,32,36,42,48,56,64,72,80,88,96]`(18단계,
  48 이후 8px 단위로 추가). 네이티브 `<select>`라 옵션 추가 외 UI 변경 불필요(`TaskCreate.tsx`)
- **근본 원인**: TaskCreate 편집기 캔버스는 `fontScale = containerWidth / DESIGN_WIDTH(1024)`를 계산해
  `getWidgetVisualStyle(style, fontScale)`로 위젯 폰트를 실제 캔버스 폭에 비례해 그리고 있었음(`CanvasWidgetFree`/
  `CanvasWidgetGrid`). 그런데 **실제 실행 화면(TaskView.tsx `ViewValueWidget`/`ViewTableWidget`/`ViewChartWidget`,
  RollingDisplay.tsx `RollingValueWidget`/`RollingTableWidget`/`RollingChartWidget`)은 fontScale 없이
  `widget.style.fontSize`를 그대로 px로 박아 그리고 있어서**, 편집기에서 본 비율과 실제 모니터에서 보이는 비율이
  어긋났음 — 화면(모니터) 크기가 디자인 기준폭(1024px)과 다르면 글자가 의도보다 작거나 크게 보임. 사용자가
  의심한 그대로의 버그.
- **수정**: `widgetVisualStyle.ts`에 `DESIGN_WIDTH` 상수를 공용으로 export(기존 TaskCreate.tsx 로컬 중복 제거,
  세 파일이 모두 같은 기준값 사용하도록 단일화). 신규 훅 `hooks/useResponsiveFontScale.ts`
  (`useResponsiveFontScale(imgRatio)`) — 배경 이미지 비율 기준 실제 렌더 폭(`min(100vw, imgRatio*100vh)`)을
  `DESIGN_WIDTH`와 비교한 배율을 반환(resize 이벤트로 갱신)
- `TaskView.tsx`/`RollingDisplay.tsx`: `SingleLayoutView`/`LayoutScreen`에서 `fontScale = useResponsiveFontScale(imgRatio)`
  계산 후 `ViewValueWidget`/`ViewTableWidget`/`ViewChartWidget`(및 Rolling 쪽 동일 3종)에 prop으로 전달, 컨테이너의
  `getWidgetVisualStyle(widget.style)` 호출도 `getWidgetVisualStyle(widget.style, fontScale)`로 변경. 차트 위젯의
  recharts 축/툴팁/범례 폰트(기존 하드코딩 8px/10px)도 같은 배율 적용해 위젯 내 텍스트 크기 일관성 유지
- `AnnouncementWidget.tsx`는 별도 수정 없음 — 내부 텍스트가 `em` 단위라 컨테이너(`getWidgetVisualStyle`)의
  `fontSize`가 스케일되면 자동으로 같이 커짐/작아짐
- 관련 파일: `widgetVisualStyle.ts`, `hooks/useResponsiveFontScale.ts`(신규), `pages/board/{TaskCreate,TaskView}.tsx`,
  `features/board/components/RollingDisplay.tsx`
- 검증: `npx eslint --fix`(신규 에러 없음) + `npx tsc -p apps/taskboard/tsconfig.app.json --noEmit`(에러 없음).
  **브라우저 실측 미실시** — 다른 화면 크기(예: 편집기 창 vs 실제 전광판 모니터)에서 같은 레이아웃을 띄워
  글자 비율이 일치하는지 사용자가 직접 확인 필요

## 2026-06-20

### TaskCreate 위젯 스타일 — 값 변경 애니메이션 + 임계치 색상 추가
- **타입**: `WidgetStyle`에 `valueChangeAnimation?: 'none'|'pulse'|'flash'|'shake'|'bounce'|'highlight'`,
  `thresholdEnabled?: boolean`, `thresholds?: WidgetThresholdRule[]`(`{min,color}[]`) 추가(`taskboard.types.ts`)
- **공용 유틸**(`widgetVisualStyle.ts`): `VALUE_CHANGE_ANIMATIONS`(옵션 6개: 없음/펄스/깜빡임/흔들림/튀어오름/
  하이라이트), `VALUE_CHANGE_ANIMATION_CSS`(keyframes 문자열), `getValueAnimationClass(animation)`,
  `getThresholdColor(value, style)`(thresholdEnabled+thresholds 기준 오름차순 평가, 마지막 매칭 색상 반환,
  숫자 파싱 안 되면 undefined → 기본 색상 유지) 신규
- **신규 훅**(`hooks/useValueChangeAnimation.ts`): `useValueChangeKey(value)` — 값이 실제로 바뀔 때만
  1씩 증가하는 key 반환. 이 key를 값 렌더 엘리먼트의 React `key`로 써서 값이 바뀔 때만 remount시켜
  CSS 애니메이션이 매번 처음부터 재생되게 함(불필요한 리렌더로 애니메이션 오발동 방지)
- **TaskCreate.tsx**: 우측 스타일 패널에 "값 변경 애니메이션"(6버튼) / "임계치 색상"(on-off 토글 +
  기준값·색상 행 추가/삭제 UI, `addThresholdRule`/`updateThresholdRule`/`removeThresholdRule` 신규) 섹션 추가.
  테이블/차트/공지 위젯에는 숨김(기존 "값 정렬"/"1000단위 콤마"와 동일 조건). 캔버스 미리보기(`WidgetContent`)에도
  바로 적용해 확인 가능. 페이지 최상단에 `VALUE_CHANGE_ANIMATION_CSS` `<style>` 1회 주입
- **TaskView.tsx**(`ViewValueWidget`) / **RollingDisplay.tsx**(`RollingValueWidget`): 동일하게
  `useValueChangeKey` + `getThresholdColor` + `getValueAnimationClass` 적용, 기존 `<style>` 태그에
  `VALUE_CHANGE_ANIMATION_CSS` 병합 주입(TaskView는 cursor 스타일과 합침, RollingDisplay는 `TRANSITION_CSS`와 합침)
- **저장 경로 확인**: `handleSave`에서 `widgets: droppedWidgets`를 통째로 `JSON.stringify`(필드 화이트리스트 없음) →
  새 style 필드도 별도 코드 변경 없이 layoutJson에 자동 포함됨. BE/DB 스키마 변경 불필요(기존 CLOB 컬럼 그대로)
- **TaskList.tsx 영향 없음 확인**: 이 화면은 위젯을 실제로 렌더링하지 않고 `parseLayoutWidgets(...).length`로
  위젯 개수만 뱃지로 표시 — 이번 변경과 무관, 코드 변경 안 함
- 관련 파일: `taskboard.types.ts`, `widgetVisualStyle.ts`, `hooks/useValueChangeAnimation.ts`(신규),
  `pages/board/{TaskCreate,TaskView}.tsx`, `features/board/components/RollingDisplay.tsx`
- 검증: `npx eslint --fix`(신규 에러 없음) + `npx tsc -p apps/taskboard/tsconfig.app.json --noEmit`(에러 없음).
  코드 경로 추적으로 저장→TaskView→RollingDisplay 3곳 모두 같은 데이터를 같은 방식으로 읽는 것 확인.
  **브라우저 실측은 로그인 정보 부재로 미실시** — 사용자가 직접 확인 필요(체크리스트는 작업 완료 보고에 기재)

## 2026-06-19 세션5

### TaskMgmt 그룹 편집 "롤링 순서" 박스 — 길어지면 자체 스크롤
**증상**: 같은 전광판 여러 번 추가가 가능해진 뒤로, 순서를 4개 이상 등록하면 박스가 높이 제한 없이 계속 늘어나 우측 패널을 밀어내고 그 아래 "전환 효과"/"롤링 간격"이 화면 밖으로 가려지는 문제.
- 두 가지 방식(① 순서 박스만 내부 스크롤 ② 전체 패널을 계속 늘려서 패널 자체 스크롤) 중 ①을 선택 — 전환효과/간격이 항상 보이는 쪽이 더 안정적인 UX라서.
- `GroupEditView`의 "선택된 전광판 순서" 리스트 wrapper에 `max-h-52 overflow-y-auto` 추가, 바깥 박스는 `flex-shrink-0`으로 고정해 더 이상 무한정 늘어나지 않게 함
- 관련 파일: `pages/board/TaskMgmt.tsx`
- 검증: `npx eslint`(신규 에러 없음, 기존 경고만) + `npx tsc -p apps/taskboard/tsconfig.app.json --noEmit`(에러 없음). **브라우저 실측 미실시**

## 2026-06-19 세션4

### TaskMgmt 롤링 그룹 — 같은 전광판 여러 번 추가 지원
**배경**: 롤링 순서를 만들 때 좌측 썸네일 클릭이 토글(`includes`면 제거)이라 같은 전광판을 두 번 이상 넣을 수 없었음.
- `GroupEditView`: `toggleLayout` → `addLayout`(클릭 시 항상 끝에 추가, 중복 허용)으로 교체. 제거/순서 변경은 우측 "롤링 순서" 목록에서만 — `removeLayoutAt(index)`, `moveLayout(index, ±1)` 신규(`lucide` `ChevronUp/ChevronDown/X` 아이콘 버튼)
- 좌측 썸네일의 단일 순번 뱃지(`indexOf+1`, 중복 시 첫 항목만 표시되던 한계)를 `layoutCounts` 기반 "추가된 횟수" 뱃지(`✓` 또는 `×N`)로 교체
- `selectedLayouts` 계산을 `{ layout, originalIndex }`로 바꿔, 화면에 보이는 목록 인덱스와 실제 `selectedLayoutIds` 배열 인덱스가 어긋나지 않도록(레이아웃이 삭제돼 못 찾는 항목이 필터링되는 경우도 안전)
- `RunOptionsView`("개별 선택" 모드): `perLayoutDisplayId`를 `layoutId` 키 → **자리(occurrence) 인덱스** 키로 변경 — 같은 전광판이 여러 자리에 들어가도 자리마다 다른 뷰 그룹을 고를 수 있게 함. select 라벨에 `N.` 자리 번호 표기 추가해 어떤 자리인지 구분
- `RollingGroup.displayIds`(실제로는 레이아웃ID 순서 배열, 컬럼명은 레거시)는 이미 일반 JSON 배열이라 중복값 저장 자체엔 문제 없었음 — DB/BE 변경 불필요, FE 선택 UI만 수정
- ⚠️ localStorage `taskboard-rolling-run-options:{groupId}`의 `perLayoutDisplayId` 키 의미가 layoutId→occurrence index로 바뀌어, 기존에 저장된 값은 새 의미로 잘못 해석될 수 있음(서버 데이터 영향 없음, 실행 옵션 모달에서 다시 고르면 정정됨 — 무시 가능한 수준)
- 관련 파일: `pages/board/TaskMgmt.tsx`
- 검증: `npx eslint --fix`(신규 에러 없음, 기존 경고만 남음) + `npx tsc -p apps/taskboard/tsconfig.app.json --noEmit`(에러 없음). **브라우저 실측 미실시** — 사용자가 직접 확인 필요

## 2026-06-19 세션3

### 뷰 그룹 관리 화면(TaskDisplayManage) UI 개선
- **카드/목록 보기 모드 추가**: 헤더에 `LayoutGrid`/`List`(lucide) 토글 버튼 신규, `viewMode` state(grid 기본값)로 카드형 그리드 ↔ 한 줄 목록 전환
- **저장된 선택값 요약 표시**: `SelectionSummary` 컴포넌트 신규 — 큐/상담그룹/상담사 각 카테고리에서 선택된 값이 있을 때만 색상 칩으로 노출, 이름 최대 2개 미리보기 + 나머지는 `+N`으로 축약(`title` 속성에 전체 목록 hover 툴팁). 이름 매핑은 `useGetCtiQueueList/GroupList/AgentList`를 메인 컴포넌트로 끌어올려 `Map<id,name>` 3개 구성 후 카드/목록 양쪽에 prop으로 전달
- 목록 행/카드의 편집·삭제 버튼을 텍스트 버튼 → `IconEdit`/`IconTrash`(TaskList.tsx와 동일 아이콘) 아이콘 버튼으로 통일
- 카드 본문에 `truncate` 누락돼 있던 이름 표시도 함께 보강(저번 세션 overflow 수정과 같은 패턴)

### MultiSelectDropdown 공용 컴포넌트 비주얼 개선 (TaskDisplayManage/TaskCreate/TaskView 표시값 설정 패널 전체 적용)
- 트리거 버튼: 텍스트 화살표(▲▼) → lucide `ChevronDown`(열림 시 회전), 선택 개수를 원형 뱃지로 좌측에 고정 표시
- 버튼 라벨에서 선택된 항목 이름을 콤마로 길게 이어붙이던 방식 제거 → `"N개 선택됨"` / `"전체 선택됨"`으로 단순화(긴 이름 합쳐질 때 잘리던 문제도 같이 해소)
- 드롭다운 패널: 네이티브 체크박스 → shadcn `Checkbox`(Radix 기반)로 교체하면서도, 큐(cyan)/그룹(violet)/상담사(emerald) 카테고리별 색상 아이덴티티는 유지 — Tailwind v4의 `bg-(--css-var)` 화살표 구문으로 인라인 CSS 변수(`--ms-accent`)를 체크 상태 배경색에 연결
- 검색 입력에 lucide `Search` 아이콘 추가, rounded-xl + shadow-xl로 패널 깊이감 보강
- 관련 파일: `pages/board/TaskDisplayManage.tsx`, `features/board/components/MultiSelectDropdown.tsx`
- 검증: `npx eslint`(신규 경고/에러 없음) + `npx tsc -p apps/taskboard/tsconfig.app.json --noEmit`(에러 없음). **브라우저 실측 미실시** — 사용자가 직접 확인 필요

## 2026-06-19 세션2

### 전체 화면 "텍스트 삐져나옴" 버그 일괄 수정 — `min-w-0` 누락 패턴
**원인**: flex row 안에서 `truncate`(또는 `flex-1 truncate`)를 쓴 자식 요소에 `min-w-0`을 같이 안 주면, flex item의 기본 `min-width: auto`(콘텐츠 크기) 때문에 브라우저가 실제로는 줄여주지 않아 텍스트가 ellipsis 없이 옆 버튼/뱃지를 밀어내거나 박스 밖으로 삐져나간다(Tailwind `truncate`의 잘 알려진 함정). 사용자가 보고한 "이름: AI생성_커스텀 레이아웃_FHD_1098" 같은 긴 자동생성 이름이 대표 사례.
- `TaskBg.tsx`: 배경 카드 제목(`item.pageName`) 줄 — 제목 wrapper에 `min-w-0`, "사용중/미사용" 뱃지에 `flex-shrink-0` 추가
- `TaskMgmt.tsx`: 그룹 편집 화면 "롤링 순서" 리스트 항목(`l.layoutName`)에 `flex-1 min-w-0`, 그룹 카드 제목(`group.groupName`)에 `min-w-0` 추가
- `TaskNotice.tsx`: 공지 목록 제목(`notice.title`)에 `flex-1 min-w-0` 추가
- `TaskDisplayManage.tsx`: 뷰 그룹 카드 이름(`d.displayName`) — wrapper에 `min-w-0`, 이름 자체에 `truncate` 추가(원래 truncate 자체가 없었음)
- `MultiSelectDropdown.tsx`: 버튼 라벨(`btnLabel`)·드롭다운 항목 이름(`item.name`)에 `min-w-0` 추가 — 큐/그룹/상담사 다중선택 시 이름이 길게 합쳐지면(`selectedIds.map(...).join(', ')`) 버튼 폭(`w-[180px]`)을 넘어가던 문제
- `TaskCreate.tsx`: 좌측 콜데이터 팔레트 항목 라벨, Redis Hash 트리 노드 라벨, 계산식 위젯 변수 드롭존 라벨, 우측 패널 선택 위젯 제목, 테이블 컬럼 라벨 — 총 5곳에 `min-w-0` 추가
- `TaskView.tsx` / `RollingDisplay.tsx`: 전광판 실행 화면 상단 컨트롤 바 — `표시 이름(displayName) (레이아웃 이름)` 텍스트가 길면 우측 톱니바퀴/전체화면 아이콘과 겹치던 문제. 좌측 그룹에 `min-w-0 overflow-hidden`, 이름에 `truncate`, 우측 아이콘 그룹에 `flex-shrink-0` 추가
- 위 패턴이 아닌 `flex-col` 컨테이너 안의 `truncate`(예: `TableWidget`/`AnnouncementWidget`의 위젯 제목)는 cross-axis stretch로 폭이 이미 100%라 버그 없음 — 확인만 하고 변경 안 함
- 검증: `npx eslint --fix`(신규 에러 없음) + `npx tsc -p apps/taskboard/tsconfig.app.json --noEmit`(에러 없음). **브라우저 실측은 미실시**(로그인 정보 없어 스크린샷 못 찍음) — 사용자가 직접 확인 필요
- 관련 파일: `pages/board/{TaskBg,TaskMgmt,TaskNotice,TaskDisplayManage,TaskCreate,TaskView}.tsx`, `features/board/components/{MultiSelectDropdown,RollingDisplay}.tsx`

## 2026-06-19

### "뷰 그룹" 매핑 구조 완전 제거 — 전광판(레이아웃)과 뷰 그룹(선택값)을 독립된 두 풀로 분리
**배경**: 2026-06-17~18에 만든 `TaskboardDisplayLayout`(레이아웃↔디스플레이 N:M 연결 테이블) 구조가, 실제로는 "전광판마다 디스플레이를 미리 연결해 둬야만 실행 시 선택지에 나타나는" 1:N 귀속 UX가 되어버림(task-list 플레이 버튼, task-mgmt 롤링 실행의 "개별" 모드 둘 다 동일 증상). 사용자 피드백: "전광판과 디스플레이관리는 맵핑되는 구조가 아니어야 한다 — 전광판은 전광판대로 가고 거기에 디스플레이 그룹 리스트가 입혀지는 형식". 결정: 연결 테이블/조인 개념을 FE에서 완전히 제거하고, task-view URL이 `layoutId`+`displayId`를 직접 받아 그 자리에서 두 풀을 조합하도록 변경. 같은 세션에서 "디스플레이"라는 용어도 "뷰 그룹"으로 전면 변경(사용자가 "디스플레이"는 화면/모니터로 오해하기 쉽다고 지적).

- **routes.tsx**: `task-view/:displayId` → `task-view/:layoutId/:displayId`로 변경(기존에 모니터에 띄워둔 task-view URL이 있다면 새로 발급 필요 — 변경 전 사용자에게 확인받음)
- **TaskView.tsx**: `useGetTaskboardDisplayLayoutDetail` 조인 조회 제거 → `useGetTaskboardLayoutList()`/`useGetTaskboardDisplayList()` 두 목록을 직접 fetch해서 `layoutId`/`displayId`로 각각 find. "디스플레이 설정" 톱니바퀴 패널 저장 후 refetch 대상도 displayList로 변경
- **TaskList.tsx**: `DisplayPickerPopover`가 `useGetTaskboardDisplayLayoutList({layoutId})`(레이아웃에 연결된 것만) 대신 `useGetTaskboardDisplayList()`(전체 풀) 사용. 선택 즉시 `/task-view/${layoutId}/${displayId}`로 이동(사전 연결/자동생성 단계 없음)
- **TaskMgmt.tsx**: `RunOptionsView`의 "개별 선택" 모드에서 `screenList`(조인 목록) 필터링 제거 → 전체 `displayList`를 모든 레이아웃에 동일하게 노출. `screenList`/`useGetTaskboardDisplayLayoutList` 의존성 전부 제거
- **TaskDisplayManage.tsx**: "연결된 전광판" 칩 + `LayoutLinkSection`(전광판 추가/해제 UI) 전체 삭제. 레이아웃 목록 조회도 더 이상 필요 없어 제거
- **dead code 정리**: `taskboardApi.ts`/`useTaskboardQueries.ts`/`taskboard.types.ts`에서 `TaskboardDisplayLayout`/`TaskboardDisplayLayoutDetail` 타입, `getDisplayLayoutList/Detail`·`createDisplayLayout`·`deleteDisplayLayout` API 함수, `useGetTaskboardDisplayLayoutList/Detail`·`useCreate/DeleteTaskboardDisplayLayout` 훅 전부 삭제(FE에서 더 이상 호출하는 곳이 없어짐)
- **용어 변경**: 사용자 노출 텍스트의 "디스플레이" → "뷰 그룹"으로 전부 교체(TaskList/TaskMgmt/TaskDisplayManage/TaskCreate/TaskView). 단, 코드 식별자(`TaskboardDisplay`, `displayId`, `/taskboard-display-*` 엔드포인트 등)는 BE 스키마와의 호환을 위해 그대로 유지 — 표시 라벨만 변경
- **⚠️ BE 미정리 항목**: `TB_TK_TASKBOARD_DISPLAY_LAYOUT` 테이블/`TaskboardDisplayLayout` 엔티티/`/taskboard-display-layout-*` BFF 엔드포인트(V89 마이그레이션)는 이번 FE 변경으로 더 이상 호출되지 않지만, BE 코드/DB는 그대로 남겨둠(마이그레이션 변경은 사전 확인 필요 사항이라 미진행). 필요 시 별도로 정리 논의
- 관련 파일: `routes.tsx`, `pages/board/{TaskView,TaskList,TaskMgmt,TaskDisplayManage,TaskCreate}.tsx`, `features/board/{api/taskboardApi.ts,hooks/useTaskboardQueries.ts,types/taskboard.types.ts,components/RollingDisplay.tsx}`
- 검증: `npx eslint --fix`(대상 파일 전체, 기존 경고 외 신규 에러 없음) + `npx tsc -p apps/taskboard/tsconfig.app.json --noEmit`(에러 없음). 브라우저 수동 확인은 미실시 — 다음 세션에서 실제 모니터 URL 재발급 + task-list/task-mgmt 양쪽 실행 확인 필요

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

## 2026-06-24

### 기능 — TaskCreate 테이블형 위젯: 행/열 간격, 컬럼 순서·숨김, 정렬/TOP N
- 사용자 요청 5건 처리: ①행 간격 조절 ②열 간격 조절 ③컬럼 순서 변경 ④컬럼 표시 ON/OFF ⑤숫자 컬럼 기준 정렬 + TOP N(3/5/10/20)
- `taskboard.types.ts`: `TableColumn.hidden?: boolean`(숨김, 설정값은 유지) 추가, `CallDataItem.tableConfig`에 `rowGap?`/`colGap?`(px, border-spacing)/`sortKey?`/`sortOrder?`('asc'|'desc')/`limit?`(TOP N, 미지정 시 기본 20) 추가
- 행/열 간격: `<table>`을 `border-collapse: collapse`(tailwind 클래스) → 인라인 `border-collapse: separate` + `border-spacing: {colGap}px {rowGap}px`로 전환해 해결 — 컬럼별 padding을 건드리지 않고 셀 사이 여백만 조절. `TaskCreate.tsx`(`TableWidget`, 캔버스 미리보기) / `TaskView.tsx`(`ViewTableWidget`) / `RollingDisplay.tsx`(`RollingTableWidget`) 3곳 동일 적용
- 컬럼 순서: `TableColumn[]` 배열 순서가 그대로 표시 순서(모든 렌더 지점이 `cfg.columns.map`을 그대로 따름) — 우측 패널 컬럼 목록에 ▲▼ 버튼(`moveWidgetTableColumn`) 추가해 배열 순서 자체를 바꾸도록 구현(드래그 reorder는 미구현 — 전역 `DndContext`와의 충돌 위험을 피해 버튼 방식으로 한정)
- 컬럼 숨김: `updateWidgetTableColumn(id, key, { hidden })`으로 토글(👁/🙈 버튼). 행 데이터(`buildLiveTableRows`)는 숨긴 컬럼도 그대로 계산해 보관(다른 컬럼의 계산식이 참조할 수 있으므로) — 렌더 시점(`ViewTableWidget`/`RollingTableWidget`/캔버스 `TableWidget`)에서만 `columns.filter(c => !c.hidden)`로 제외
- 정렬/TOP N: 우측 패널에 정렬 기준 컬럼 select + 오름차순/내림차순 + TOP 3/5/10/20 버튼 신규(`updateWidgetTableConfig`로 tableConfig에 직접 patch). 실데이터 적용은 `TaskView.tsx`/`RollingDisplay.tsx`의 `buildLiveTableRows`를 수정 — 기존 `filtered.slice(0, 20).map(...)`(자르고 나서 행 변환) 순서를 `filtered.map(...)` → `applySortAndLimit(result, sortConfig)`(행 변환 후 정렬+자르기)로 바꿔, 정렬 기준 값이 변환 후 컬럼 값(WS 실시간 값) 기준으로 정확히 매겨지도록 함
- 적용 범위: table-queue/table-group/table-agent/table-redis 전부(차트 전환 시에는 영향 없음, table-redis는 그룹별 합계와 별개로 동작)
- `npx tsc --noEmit`/`npx eslint --fix` 통과(경고 0건 추가). **브라우저 실측 미실시** — 행/열 간격 슬라이더 값 변화, 컬럼 순서 변경·숨김 토글, 정렬+TOP N이 TaskCreate 미리보기와 실제 task-view/롤링 양쪽에서 동일하게 보이는지 사용자가 직접 확인 필요
- 관련 파일: `features/board/types/taskboard.types.ts`, `pages/board/TaskCreate.tsx`, `pages/board/TaskView.tsx`, `features/board/components/RollingDisplay.tsx`

### 수정/추가 — table-redis 간격·사용여부·정렬 미반영 버그 수정 + 컬럼명 숨기기 + 셀 단위 값 변경 애니메이션
- **버그 원인 확인**: 사용자가 "행/열 간격이 안 먹는다"고 보고 → `table-redis`(`item.id==='table-redis'`) 위젯은 위 기능 추가 당시 수정한 `TableWidget`/`ViewTableWidget`/`RollingTableWidget`이 아니라 **완전히 별도인 `RedisTableWidget.tsx`**로 렌더링되고 있었음(`isRedisTableWidget()` 분기, `TaskCreate.tsx:1004`/`TaskView.tsx`/`RollingDisplay.tsx` 공통). 우측 패널에는 table-redis도 조건에 포함돼 있어 설정은 저장됐지만 렌더러가 `rowGap`/`colGap`/`hidden`/`sortKey`/`sortOrder`/`limit`을 전혀 참조하지 않아 화면에 반영되지 않았던 것 — `RedisTableWidget.tsx`에 동일 로직(정렬+limit, `visibleColumns` 필터, `border-collapse:separate`+`border-spacing`) 추가로 해결
- **TOP N 기본값 정합성 재검토**: table-queue/group/agent는 원래부터 코드에 `.slice(0, 20)`이 하드코딩돼 있어 "기본 20개 cap"이 실제 동작이었지만, table-redis는 원래 전체 행을 보여줬음(cap 없음) — 신규 TOP N 기능을 붙이면서 4종이 다른 기본값을 가지면 패널의 "TOP 20 선택됨" 표시가 redis에서는 거짓이 되는 문제 발견. **모든 테이블 타입의 기본값을 "전체 표시"로 통일**(`limit` 미지정 시 cap 없음) — `TaskView.tsx`/`RollingDisplay.tsx`의 `applySortAndLimit`에서 강제 20 cap 제거, 패널에 "전체" 버튼 추가(3/5/10/20과 동일 그룹). ⚠️ **동작 변경**: 기존에 table-queue/group/agent 위젯은 항상 20개로 잘려서 보였는데, 이제 한도를 직접 설정하지 않으면 전체 데이터가 그대로 보임 — 이미 만들어둔 위젯 화면이 갑자기 더 많은 행을 보여줄 수 있음(필요 시 TOP N에서 명시적으로 20 선택)
- **용어 변경**: 컬럼 목록의 👁/🙈("컬럼 숨기기"/"컬럼 표시") 토글을 ☑/☐("컬럼 사용"/"컬럼 사용 안 함")으로 변경 — 동작은 동일(컬럼 자체를 표/실행화면에서 완전히 제외), 사용자 피드백("이 기능은 좋은데 이름을 컬럼 사용여부로")에 따른 명칭만 정정
- **신규 — 컬럼명 숨기기(`TableColumn.hideLabel`)**: 사용자가 의도한 "숨기기"는 별도 개념이었음 — 위젯의 "타이틀 숨기기"처럼 **헤더의 컬럼명 텍스트만 숨기고 데이터(셀 값)는 계속 표시**. 컬럼 ⚙ 펼침 패널에 토글 추가(`updateWidgetTableColumn(id, key, { hideLabel })`). `TableWidget`/`ViewTableWidget`/`RollingTableWidget`/`RedisTableWidget` 4곳 모두 `<th>` 내용을 `{!col.hideLabel && col.label}`로 변경(헤더 셀·테두리·너비는 유지, 텍스트만 비움)
- **신규 — 테이블 셀 단위 값 변경 애니메이션**: "왜 테이블엔 값 변경 애니메이션/값 위치 세밀조정이 안 보이냐"는 질문에 답변 — 두 기능 모두 "숫자 1개"를 보여주는 단일값 위젯 전용으로 설계돼 있었음(`valueOffsetX/Y`는 한 텍스트를 픽셀 이동시키는 개념이라 행이 N개인 테이블엔 적용 대상이 불명확하고, 렌더 코드도 두 옵션을 전혀 참조하지 않아 패널에 노출해도 무동작이었음). 사용자 확인 결과 "값 변경 애니메이션"만 셀 단위로 추가 결정(위치 세밀조정은 컬럼 정렬(`align`)과 중복돼 보류)
  - 신규 공유 컴포넌트 `features/board/components/AnimatedTableCell.tsx` — `useValueChangeKey(value)`로 셀 값이 바뀔 때만 그 셀 하나가 펄스/깜빡임/흔들림/튀어오름/하이라이트(`widget.style.valueChangeAnimation`, 위젯 전체에 동일 설정 적용) 재생. 기존 단일값 위젯의 `getValueAnimationClass`/`getValueAnimationStyle`(하이라이트는 `<td>` 전체를 덮는 오버레이) 그대로 재사용 — 신규 keyframes 없음
  - `TableWidget`(TaskCreate 미리보기)/`ViewTableWidget`(TaskView)/`RollingTableWidget`(RollingDisplay)/`RedisTableWidget` 4곳의 `<td>` 렌더를 `<AnimatedTableCell>`로 교체
  - 우측 패널 "값 변경 애니메이션" 노출 조건을 `displayType !== 'table' && displayType !== 'chart'` → `displayType !== 'chart'`로 완화(테이블도 노출, 차트는 여전히 제외)
- `npx tsc --noEmit`/`npx eslint --fix` 통과(경고 0건 추가). **브라우저 실측 미실시** — table-redis 간격이 실제로 보이는지, 컬럼명숨기기가 데이터는 유지한 채 헤더만 비우는지, 테이블 셀 애니메이션이 실시간 값 변경 시 재생되는지, TOP N "전체" 기본값 변경 후 기존 queue/group/agent 위젯들이 의도와 다르게 너무 많은 행을 보여주지 않는지 사용자가 직접 확인 필요
- 관련 파일: `features/board/types/taskboard.types.ts`, `pages/board/TaskCreate.tsx`, `pages/board/TaskView.tsx`, `features/board/components/RollingDisplay.tsx`, `features/board/components/RedisTableWidget.tsx`, `features/board/components/AnimatedTableCell.tsx`(신규)

### 수정 — 컬럼명 숨기기를 표 전체 단위로 변경, 컬럼별 열 간격 + 마우스 드래그, 테이블 애니메이션 transform 버그
- **컬럼명 숨기기를 컬럼 단위 → 표 전체 단위로 변경**: 사용자가 "컬럼명숨기기는 통으로 움직이니까 낱개로 말고 전체로"라고 피드백 → `TableColumn.hideLabel`(컬럼별) 제거, `tableConfig.hideColumnLabels`(표 전체 1개 토글)로 교체. 우측 패널의 컬럼별 ⚙ 펼침에 있던 토글을 제거하고, "표 간격" 섹션 안에 표 전체용 스위치 1개로 통합. `TableWidget`/`ViewTableWidget`/`RollingTableWidget`/`RedisTableWidget` 4곳의 `<th>` 조건을 `!col.hideLabel` → `!cfg.hideColumnLabels`(또는 그 동치)로 교체
- **컬럼별 열 간격 + 캔버스 마우스 드래그**: `TableColumn.colGap?: number` 신규(컬럼별 오버라이드, 미지정 시 `tableConfig.colGap`를 표 전체 기본값으로 사용). 구현 방식을 `border-spacing`(표 전체 균일값, 컬럼별 분리 불가) → `border-spacing: 0 {rowGap}px`(가로 0, 세로만) + 각 `<th>/<td>`의 `paddingRight`로 변경(컬럼마다 다른 값 가능). TaskCreate 캔버스 표 헤더의 각 컬럼 우측 경계에 보이지 않는 드래그 핸들(`cursor-col-resize`, hover 시 파란 줄)을 추가해 마우스로 직접 그 컬럼의 간격을 조절 가능 — `TableColumnGapContext`(React Context) 신규: `TableWidget`이 `CanvasWidgetFree`/`CanvasWidgetGrid`/`WidgetContent`를 거쳐 깊이 중첩돼 있어 각 컴포넌트 prop 시그니처를 건드리는 prop drilling 대신, `TaskCreate` 컴포넌트 최상단(`DndContext` 내부)에서 `Provider`로 `updateWidgetTableColumn(id, key, { colGap })`을 주입하고 `TableWidget`이 `useContext`로 바로 사용. 드래그 핸들의 `onPointerDown`은 `e.stopPropagation()`으로 캔버스 위젯 이동 핸들러(부모 div의 `onPointerDown`)가 같이 발동하지 않게 분리. 실행화면(`TaskView`/`RollingDisplay`/`RedisTableWidget`)에는 마우스 드래그 UI 없음(읽기 전용 화면이라 TaskCreate에서 설정한 값만 그대로 반영)
- **테이블 셀 애니메이션 중 펄스/흔들림/튀어오름 무동작 버그 수정**: 원인은 CSS 스펙 — `transform`은 `display: inline`인 비대체(non-replaced) 인라인 요소에는 적용되지 않음(스펙상 명시된 동작). `AnimatedTableCell`이 값을 감싸는 `<span>`에 별도 display를 안 줘서 기본값 `inline`이었고, opacity 기반(깜빡임)·별도 오버레이 div(하이라이트)만 동작하고 transform 기반 3종(펄스/흔들림/튀어오름)은 전부 무시되고 있었음 → 그 `<span>`에 `display: 'inline-block'` 추가로 해결
- `npx tsc --noEmit`/`npx eslint --fix` 통과(경고 0건 추가, 빈 화살표 함수 에러 1건은 `() => undefined`로 수정). **브라우저 실측 미실시** — 표 전체 컬럼명 숨기기 스위치, 캔버스에서 마우스로 컬럼 경계 드래그 시 그 컬럼만 간격이 바뀌는지, 펄스/흔들림/튀어오름 애니메이션이 테이블 셀에서 재생되는지 사용자가 직접 확인 필요
- 관련 파일: `features/board/types/taskboard.types.ts`, `pages/board/TaskCreate.tsx`, `pages/board/TaskView.tsx`, `features/board/components/RollingDisplay.tsx`, `features/board/components/RedisTableWidget.tsx`, `features/board/components/AnimatedTableCell.tsx`

### 수정 — 컬럼 간격 드래그 핸들이 안 보이는 문제 + table-redis에도 드래그 핸들 누락
- **핸들 시인성 문제**: 드래그 핸들을 `hover:bg-.../40`로만 만들어 평상시 완전히 투명했고, 그 핸들이 `opacity: 0.7`이 걸린 `<th>`의 자식이라 hover 색상까지 같이 흐려져서 사실상 안 보였음(사용자 보고: "드래그 UI가 보이지않아") → `<th>`에서 opacity를 빼고 라벨 텍스트만 별도 `<span style={{opacity:0.7}}>`로 감싸 핸들은 영향 안 받게 분리, 핸들 내부에 항상 보이는 얇은 세로선(평상시 40% 불투명도) + hover 시 두꺼워지고 100% 불투명+파란색으로 변하는 2단 구성으로 교체(`group`/`group-hover` 패턴)
- **table-redis(`RedisTableWidget.tsx`) 드래그 핸들 누락**: 직전 작업(행/열 간격 버그 수정)에서 또 발견된 것과 같은 원인 — TaskCreate 캔버스에서도 `table-redis` 위젯은 `TableWidget`이 아니라 `RedisTableWidget`으로 렌더링되는데, 마우스 드래그 핸들은 `TableWidget`에만 추가했었음. `TableColumnGapContext`를 `TaskCreate.tsx` 안에 두지 않고 별도 파일 `features/board/components/TableColumnGapContext.ts`로 분리해 양쪽에서 공유하도록 변경, `RedisTableWidget`에 `editable?: boolean`(기본 false) prop 추가해 TaskCreate 호출부(`<RedisTableWidget widget={widget} editable />`)에서만 핸들이 보이고 TaskView/RollingDisplay(읽기 전용 실행화면)에는 안 보이게 함
- `npx tsc --noEmit`/`npx eslint --fix` 통과(에러 0, 경고 추가 없음). **브라우저 실측 미실시** — table-queue/group/agent와 table-redis 양쪽 모두 캔버스에서 컬럼 경계에 마우스를 올리면 얇은 선이 항상 보이고, 드래그하면 그 컬럼만 간격이 바뀌는지 사용자가 직접 확인 필요
- 관련 파일: `pages/board/TaskCreate.tsx`, `features/board/components/RedisTableWidget.tsx`, `features/board/components/TableColumnGapContext.ts`(신규)

### 수정 — 컬럼 간격 드래그 가능 범위가 너무 좁음
- 사용자가 핸들 동작은 확인됐지만 "좌우 영역이 너무 좁다, 쭉쭉 움직일 수 있게"라고 피드백 → `COLUMN_GAP_MAX`를 60 → 400(px)으로 상향(드래그·숫자 입력 둘 다 적용). 드래그 자체는 마우스 이동 px를 1:1로 그대로 반영하던 로직이라 체감 폭이 좁았던 원인은 순전히 60px 캡이었음
- 관련 파일: `features/board/components/TableColumnGapContext.ts`, `pages/board/TaskCreate.tsx`

### 수정 — 컬럼 간격을 더 늘려도 캡(400px)에 또 걸림 + 전광판 고정폭 안에서 텍스트가 깨지는 문제
- 사용자가 "원하는 만큼 안 움직인다"고 재차 피드백 → `COLUMN_GAP_MAX`를 400 → 9999(사실상 무제한, 음수만 차단)로 재상향
- 동시에 사용자가 "전광판 UI는 고정폭에 무조건 맞아야 하니, 간격을 쭉쭉 늘리는 대신 그로 인해 칸이 좁아져서 글자가 넘치면 줄바꿈/깨짐 대신 '...'으로 잘리게 해달라"고 요구 → 표 레이아웃을 `table-layout: auto`에서 **`table-layout: fixed`**로 전환(4곳: `TableWidget`/`ViewTableWidget`/`RollingTableWidget`/`RedisTableWidget`). `table-layout:auto`에서는 `white-space:nowrap`인 셀의 최소 너비가 "줄바꿈 없는 전체 텍스트 너비"가 돼서 컬럼이 그 아래로는 절대 안 줄어들어(`text-overflow:ellipsis`를 줘도 트리거가 안 됨) 간격을 늘리면 표가 위젯 폭을 넘어 그냥 잘려버렸던 것 — `fixed`로 바꾸면 전체 표 폭(=위젯 폭, 고정)을 컬럼들이 정해진 비율로만 나눠 갖고, 한 컬럼의 패딩(간격)이 늘어나면 그 컬럼 자신의 내용 영역만 줄어들어 ellipsis가 정상 동작
- `AnimatedTableCell`의 값 `<span>`과 4곳의 헤더 라벨 `<span>`에 `display:'block', width:'100%', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis'` 적용(헤더는 `opacity:0.7`도 이 span으로 이동)
- ⚠️ **side effect**: `width`를 지정 안 한 컬럼(현재 UI에 컬럼별 너비 설정 기능이 없어 전부 이 경우)은 `table-layout:auto`일 때 텍스트 길이에 비례해 자동으로 너비가 잡혔는데, `fixed`로 전환하면서 **그런 컬럼들은 남은 폭을 균등분할**로 받게 됨 — 기존에 떠 있는 표 위젯들의 컬럼 비율이 이전과 달라 보일 수 있음(예: "이름" 컬럼이 길어도 더 넓게 안 잡힘). 컬럼별 너비 직접 지정 UI는 아직 없음(`TableColumn.width`는 타입에만 존재) — 필요하면 추후 요청
- `npx tsc --noEmit`/`npx eslint --fix` 통과(에러 0, 경고 추가 없음). **브라우저 실측 미실시** — 간격을 끝까지 드래그했을 때 옆 컬럼 텍스트가 정상적으로 "..."로 잘리는지, 기존 표 위젯들의 컬럼 비율이 허용 가능한 수준으로 바뀌었는지 사용자가 직접 확인 필요
- 관련 파일: `features/board/components/TableColumnGapContext.ts`, `features/board/components/AnimatedTableCell.tsx`, `pages/board/TaskCreate.tsx`, `pages/board/TaskView.tsx`, `features/board/components/RollingDisplay.tsx`, `features/board/components/RedisTableWidget.tsx`

### 재설계 — 컬럼 "간격(padding)" 드래그 → 컬럼 "너비(width)" 드래그로 전환
- 사용자가 "A-----------B-C, A----------------B-C-D 이렇게 하고 싶은데 잘 안 된다"고 재현 → 원인 확인: `colGap`은 한 컬럼의 우측 **padding**만 키우는 방식이라 `table-layout:fixed`에서는 옆 컬럼들의 위치/너비에 전혀 영향을 못 줌(각 컬럼은 자기 몫의 고정폭 안에서 padding만 먹고, 형제 컬럼은 안 움직임) — "A를 넓히면 B·C가 따라서 좁아지며 붙는" 효과 자체가 애초에 안 나오는 설계였음
- **TableColumn.colGap/tableConfig.colGap 완전 제거**, 기존에 타입에만 있던 `TableColumn.width`(CSS width 문자열)를 실제로 드래그 대상으로 사용 — 드래그하면 그 컬럼의 `width`를 `"32.5%"` 같은 표 전체 대비 비율로 직접 설정. `table-layout:fixed`에서 너비를 지정 안 한 컬럼들은 남은 폭을 자기들끼리 균등분할하므로, 한 컬럼 너비를 늘리면 나머지가 자동으로 좁아지며 다닥다닥 붙는 — 사용자가 원한 "A-----B-C" 패턴이 정확히 이 메커니즘으로 나옴
- 드래그 측정 방식 변경: 기존엔 `dragRef`로 시작 gap 값만 들고 px delta를 더하는 식이었는데, 이제는 `e.currentTarget.closest('th'|'table')`로 드래그 시작 시점의 실제 렌더된 th/table 픽셀 너비를 측정해 시작 비율(%)을 구하고, 그 위에 마우스 이동 px를 표 너비 기준 %로 환산해 더함(`handleColumnResizePointerDown`, `TableColumnGapContext.ts`로 이동해 `TableWidget`/`RedisTableWidget` 양쪽이 공유 — 기존엔 각자 비슷한 핸들러를 중복 작성했었음) — ref 불필요, 드래그 중 표 크기가 안 변한다는 전제로 매 move마다 재계산 없이 시작 시점 1회만 측정
- `COLUMN_GAP_MIN/MAX` → `COLUMN_WIDTH_MIN_PERCENT(5)`/`COLUMN_WIDTH_MAX_PERCENT(90)`로 교체(컬럼이 0%나 100%까지 가는 극단은 차단)
- TaskCreate 우측 패널 "표 간격" 섹션을 "표 설정"으로 정리 — 행 간격(px) 입력만 남기고 "기본 열 간격" 입력은 제거(열 너비는 캔버스 드래그가 유일한 조절 방법), 안내문을 새 동작에 맞게 수정
- `AnimatedTableCell`의 `gapRight` prop 제거(더 이상 컬럼 패딩을 동적으로 더하지 않음 — 기본 padding `1px 3px`로 고정)
- `npx tsc --noEmit`/`npx eslint --fix` 통과(에러 0, 경고는 사전 존재하던 것만 남음 — 새로 만든 안내문의 raw 쌍따옴표는 `&ldquo;`/`&rdquo;`로 교체해 경고 제거). **브라우저 실측 미실시** — A 컬럼을 넓게 드래그했을 때 B·C·D가 실제로 좁아지며 붙는지, 너비%가 의도한 비율로 유지되는지 사용자가 직접 확인 필요
- 관련 파일: `features/board/types/taskboard.types.ts`, `features/board/components/TableColumnGapContext.ts`, `features/board/components/AnimatedTableCell.tsx`, `pages/board/TaskCreate.tsx`, `pages/board/TaskView.tsx`, `features/board/components/RollingDisplay.tsx`, `features/board/components/RedisTableWidget.tsx`

### 기능 — 테이블 행 구분선 표시/두께 옵션 + 헤더-데이터 사이 줄 영구 제거
- 사용자 요청 2건: ①표 테두리(선)를 켜고 끄고 두께를 조절하는 옵션 ②컬럼명과 데이터 사이의 줄은 항상 안 보이게
- `tableConfig.showBorder?: boolean`(기본 true)/`borderWidth?: number`(기본 1px) 신규 — 데이터 행 사이 구분선(`<td>`의 `borderBottom`)에 적용. `AnimatedTableCell`에 `borderBottom` prop 추가(기본값 `1px solid rgba(255,255,255,0.08)` 유지, 호출부가 `showBorder===false`면 `'none'`을 넘김)
- TaskCreate 우측 패널 "표 설정"에 "행 구분선 표시" 토글 + (켜져 있을 때만) "구분선 두께(px)" 입력(1~5) 추가
- 헤더(`<th>`)의 `borderBottom: \`1px solid ${widget.style.color}40\`` 는 옵션과 무관하게 4곳(`TableWidget`/`ViewTableWidget`/`RollingTableWidget`/`RedisTableWidget`) 전부에서 완전히 제거 — 사용자가 "이 줄은 그냥 안 보였으면 한다"고 명확히 요청했으므로 토글 대상에 넣지 않고 코드에서 삭제
- `npx tsc --noEmit`/`npx eslint --fix` 통과(에러 0, 경고 추가 없음). **브라우저 실측 미실시** — 행 구분선 토글/두께가 실제 반영되는지, 헤더-데이터 사이 줄이 완전히 사라졌는지 사용자가 직접 확인 필요
- 관련 파일: `features/board/types/taskboard.types.ts`, `features/board/components/AnimatedTableCell.tsx`, `pages/board/TaskCreate.tsx`, `pages/board/TaskView.tsx`, `features/board/components/RollingDisplay.tsx`, `features/board/components/RedisTableWidget.tsx`

### 수정 — 컬럼 너비 드래그 핸들이 너무 작아서 안 보임
- 사용자가 "버튼이 너무 작아서 안 보인다"고 피드백 → 히트 영역을 `w-3`(12px)→`w-5`(20px)로 키우고, 평상시에도 항상 보이는 막대를 `w-px`(1px)·`opacity-40`(hover 시에만 보이던 수준)에서 `w-1.5`(6px)·`opacity-70`+`shadow-sm`으로 키워 hover 없이도 컬럼 경계가 또렷이 보이게 함(hover 시 `w-2`·완전 불투명으로 한 번 더 강조). `TableWidget`(TaskCreate)/`RedisTableWidget` 양쪽 동일 적용
- `npx tsc --noEmit`/`npx eslint --fix` 통과(에러 0, 경고 추가 없음). **브라우저 실측 미실시** — 핸들이 평상시에도 잘 보이는지 사용자가 직접 확인 필요
- 관련 파일: `pages/board/TaskCreate.tsx`, `features/board/components/RedisTableWidget.tsx`

### 수정 — 컬럼 리사이즈 시 다른 컬럼도 같이 바뀌는 문제, 표 위쪽 빈 공간, border 색이 사실상 안 보이던 문제
- 사용자 보고 3건: ①"B를 바꾸면 A,C까지 전부 바뀐다"(원하는 동작: B만/그 옆만) ②컬럼 수와 무관하게 위젯 위쪽에 공간이 너무 많이 남음 ③행 구분선 border를 켜고 두께를 올려도 적용이 안 되는 것처럼 보임
- **① 컬럼 리사이즈 — 드래그 대상 외 전부 동결**: 원인 — 너비를 지정 안 한 컬럼들은 `table-layout:fixed`에서 남은 공간을 자기들끼리 동적으로 균등분할하므로, B 하나만 width%를 줘도 너비 미지정인 A·C가 같이 재계산되며 따라 움직였음. `handleColumnResizePointerDown`(`TableColumnGapContext.ts`)을 재작성 — 드래그 시작 시점에 그 행의 **모든** 컬럼의 현재 렌더 너비(%)를 읽어 전부 명시값으로 고정(동결)한 뒤, 드래그 중에는 **드래그한 컬럼과 바로 다음 컬럼 두 개만** 합이 일정하게 유지되도록 주고받음(B 늘어난 만큼 C만 줄어듦, A는 동결값 그대로 안 바뀜). 이 매칭을 위해 각 `<th>`에 `data-col-key={col.key}` 추가(컬럼 키를 DOM에서 다시 찾기 위함, `TableWidget`/`RedisTableWidget` 양쪽)
- **② 표 위쪽 빈 공간 — border-spacing의 부작용 제거**: 원인 — 행 간격(rowGap)을 `border-collapse:separate`+`border-spacing` 세로값으로 구현했었는데, CSS 스펙상 border-spacing은 행 사이뿐 아니라 **표 테두리~첫 행 사이/마지막 행~표 테두리 사이에도 똑같이 적용**돼서, rowGap을 조금만 키워도 헤더 위에 똑같은 만큼의 빈 공간이 생겼던 것(컬럼 수와는 무관 — 그래서 컬럼을 지우든 말든 똑같이 남아 있었음). `border-spacing` 방식을 버리고 각 행 `<th>`/`<td>`(`AnimatedTableCell`)의 `paddingBottom: 1 + rowGap`으로 교체 — 헤더 위쪽엔 패딩을 안 줘서 그 부작용이 사라지고, 행 사이 간격은 그대로 유지됨. `borderCollapse`도 `separate`→`collapse`로 단순화(더 이상 border-spacing이 필요 없으므로)
- **③ border 색상이 사실상 안 보이던 문제**: `showBorder`/`borderWidth`는 정상 적용되고 있었지만 색상이 `rgba(255,255,255,0.08)`(흰색 8% 불투명도)로 고정돼 있어서 두께를 올려도 거의 안 보였음(밝은 배경에서는 더 안 보임) — 헤더 줄이 쓰던 `${widget.style.color}40`(위젯 글자색 기준 약 25% 불투명도) 방식으로 통일해 두께를 올리면 실제로 또렷해지게 함
- `AnimatedTableCell`에 `paddingBottom?: number`(기본 1) prop 추가, 4곳(`TableWidget`/`ViewTableWidget`/`RollingTableWidget`/`RedisTableWidget`) 모두 `rowPaddingBottom = 1 + (cfg.rowGap ?? 0)`을 계산해 `<th>`와 `AnimatedTableCell` 양쪽에 전달하도록 통일
- `npx tsc --noEmit`/`npx eslint --fix` 통과(에러 0, 경고 추가 없음). **브라우저 실측 미실시** — B만 드래그했을 때 A가 안 바뀌는지(C만 줄어드는지), 표 위쪽 빈 공간이 사라졌는지, border 두께를 올렸을 때 실제로 진해지는지 사용자가 직접 확인 필요
- 관련 파일: `features/board/components/TableColumnGapContext.ts`, `features/board/components/AnimatedTableCell.tsx`, `pages/board/TaskCreate.tsx`, `pages/board/TaskView.tsx`, `features/board/components/RollingDisplay.tsx`, `features/board/components/RedisTableWidget.tsx`

### 수정 — 차트 전환 안 됨, 컬럼명 숨겨도 공간 남음, 세로 정렬 옵션 부재, 폰트 미적용
- 사용자 보고 4건
- **① 차트 기능 안 됨**: 원인 — `TaskCreate.tsx`/`TaskView.tsx`/`RollingDisplay.tsx` 세 곳 모두 위젯 렌더 분기에서 `isRedisTableWidget(widget)` 체크가 `displayType==='chart'` 체크보다 먼저였음. `table-redis` 위젯은 id 기준으로 항상 `RedisTableWidget`(표만 그림)으로 빠져버려서, 우측 패널 "표시 방식"을 차트로 바꿔도 절대 차트가 안 그려지는 구조적 버그였음(기능을 추가하다 빠진 게 아니라 표시 방식 토글 기능 자체가 처음부터 redis 테이블에는 안 통하게 돼 있었음). 세 파일 모두 차트 분기를 redis 체크보다 앞으로 옮겨서 해결
- **② 컬럼명 전체 숨겨도 헤더 자리 공간이 남음**: `hideColumnLabels`가 켜져도 `<th>`에 `rowGap` 기반 `paddingBottom`과 기본 `padding`이 그대로 남아 있어서 빈 헤더 행이 자리를 차지했음(rowGap이 크면 그만큼 더) → `hideColumnLabels`일 때 `<th>` padding 전부 0 + 라벨 `<span>`에 `fontSize:0, lineHeight:0` 추가로 헤더 행을 실질적으로 0높이까지 접어서 첫 데이터 행이 맨 위로 올라오게 함(4곳 모두 적용)
- **③ 세로 정렬(위/중간/아래) 옵션 신규**: 기존엔 가로 정렬(좌/중/우)만 있었음 — `TableColumn.verticalAlign?: 'top'|'middle'|'bottom'`(기본 'middle') 신규, 컬럼 ⚙ 패널에 "가로"/"세로" 두 줄로 분리해 추가. `AnimatedTableCell`/4곳 `<th>` 모두 `verticalAlign` 적용 — 행 간격이 커서 행이 높아졌을 때 내용을 어디에 둘지 컬럼별로 선택 가능
- **④ 폰트(서체/굵기) 미적용**: `<table>` 태그에는 `fontFamily`가 있었지만 자손 `<td>`/`<th>`/내부 `<span>`에는 명시값이 전혀 없어 상속에만 의존하고 있었고, **`fontWeight`는 테이블 어디에도 전달되는 경로 자체가 없어 위젯의 "폰트 굵기" 설정이 항상 무시되고 있었음**(서체가 안 먹는 것처럼 보인 것도 이 누락과 겹쳐서 체감됐을 가능성) — `AnimatedTableCell`의 `<td>`와 4곳의 `<th>`에 `fontFamily`/`fontWeight`(헤더는 `fontWeight:600` 고정 유지, `fontFamily`만 추가)를 명시값으로 직접 지정해 상속 체인에 의존하지 않게 함
- `npx tsc --noEmit`/`npx eslint --fix` 통과(에러 0, 경고 추가 없음). **브라우저 실측 미실시** — table-redis 위젯을 차트로 전환했을 때 실제로 그려지는지(데이터 없이 빈 차트일 수 있음 — 별도 이슈), 컬럼명 숨김 시 데이터가 맨 위로 붙는지, 세로 정렬 3종, 폰트 굵기/서체 변경이 테이블에 실제로 반영되는지 사용자가 직접 확인 필요
- 관련 파일: `features/board/types/taskboard.types.ts`, `features/board/components/AnimatedTableCell.tsx`, `pages/board/TaskCreate.tsx`, `pages/board/TaskView.tsx`, `features/board/components/RollingDisplay.tsx`, `features/board/components/RedisTableWidget.tsx`

### 수정 — TaskCreate에서 차트 여전히 안 나옴 + 세로 정렬 무동작 근본 원인 해결
- 사용자가 "task-create에서: ①차트 여전히 안 나옴 ②위/가운데/아래 안 먹음 ③폰트 여전히 안 먹음"이라고 재보고
- **① 차트 — table-redis는 정적 sampleData가 항상 빈 배열이라 dispatcher 순서를 고쳐도 빈 차트만 보였던 것**: `table-redis`는 `tableConfig: { columns: [], sampleRows: [] }`로 항상 비어 있어(실시간 Redis fetch로만 채워짐) `buildChartSampleData`가 절대 데이터를 못 만듦 — 직전 수정(dispatcher 순서)은 필요했지만 충분하지 않았음. `ChartWidget`을 `features/board/components/ChartWidget.tsx`로 분리하고 `dataOverride` prop을 추가, `RedisTableWidget`이 이미 계산해둔 실시간 `rows`(정렬·limit·그룹합계까지 반영됨)를 `buildChartDataFromRows()`로 `{name,value}`로 변환해 직접 넘겨주도록 변경. dispatcher는 다시 `isRedisTableWidget`을 먼저 체크하도록 되돌리고(3개 파일 모두), `RedisTableWidget` 내부에서 `displayType==='chart'`일 때 표 대신 `<ChartWidget dataOverride=.../>`를 렌더하도록 분기 추가 — table-queue/group/agent는 기존 경로(`buildLiveChartData`) 그대로 유지, 영향 없음
- **② 세로 정렬(위/중간/아래) 진짜 원인**: 행 간격(rowGap)을 셀의 `paddingBottom`으로 구현했던 게 문제 — padding은 콘텐츠 박스 **바깥**의 고정 여백이라 `vertical-align`이 분배할 수 있는 "여유 공간" 자체가 없었음(여백이 항상 아래쪽에 박혀 있어 위/중간/아래를 바꿔도 시각적으로 차이가 안 났음). `padding` 대신 `height`(테이블 셀에서는 콘텐츠가 더 작을 때 명세상 "최소 높이"로 동작)를 셀에 직접 줘서, 그 안에서 `vertical-align`이 실제로 콘텐츠 위치를 위/중간/아래로 옮길 수 있게 함. `AnimatedTableCell`의 `paddingBottom` prop을 `rowHeight`로 교체(`height: rowHeight || undefined`), 4곳의 `<th>`도 동일하게 `paddingBottom`→`height`로 교체(헤더 라벨 숨김 시 0 처리 로직은 그대로 유지)
- **③ 폰트**: 코드 재검토 결과 직전 수정(`AnimatedTableCell`/`<th>`에 `fontFamily`/`fontWeight` 명시)은 정상이고 별도 누락은 못 찾음 — 위 ②번 수정과 같은 파일을 또 손보는 김에 회귀가 없는지 다시 확인함(있음). 이번에도 안 보이면 폰트 패밀리/굵기 변경 시 어떤 컬럼·어느 화면(편집기 미리보기 vs 실제 실행화면)에서 안 보이는지 더 구체적인 재현 정보 필요
- `npx tsc --noEmit`/`npx eslint --fix` 통과(에러 0, 경고 추가 없음). **브라우저 실측 미실시** — table-redis를 차트로 전환 시 실제 Redis 데이터로 그려지는지, rowGap을 키운 뒤 세로 정렬 위/중간/아래가 실제로 다르게 보이는지 사용자가 직접 확인 필요
- 관련 파일: `features/board/components/ChartWidget.tsx`(신규), `features/board/components/AnimatedTableCell.tsx`, `features/board/components/RedisTableWidget.tsx`, `pages/board/TaskCreate.tsx`, `pages/board/TaskView.tsx`, `features/board/components/RollingDisplay.tsx`

### 수정 — 빌드 에러(CHART_COLORS_LIST 미정의)
- 직전 작업에서 `ChartWidget`을 분리하면서 `TaskCreate.tsx`가 `CHART_COLORS_LIST`를 더 이상 로컬에 갖고 있지 않게 됐는데, 차트 색상 패널(개별 컬러 피커 기본값 계산 2곳)이 여전히 그 이름을 직접 참조하고 있어 빌드 실패(`TS2304`) — import에 `CHART_COLORS_LIST` 추가로 해결
- `npx tsc --noEmit`/`npx eslint --fix` 통과(에러 0)
- 관련 파일: `pages/board/TaskCreate.tsx`

### 기능 — Redis 키 패턴(필드형/키형) 자동탐지 + table-redis 다중 키 조회
- 배경(대화로 설계): CTI Redis 데이터가 ①시스템ID:미디어타입 ②미디어타입:시스템ID 등 위치가 제각각이고, 시스템ID가 해시 "필드"인 경우(예: `IC:CTIQ:0` 안에 큐ID들이 필드)와 "키 세그먼트"인 경우(예: `IC:GROUP:REASON:{groupId}:{mediaType}`처럼 시스템ID별로 키가 따로 존재)가 섞여 있어 하드코딩 없이 처리하는 방법을 논의 — 결론: 미디어타입은 값 집합(0/10/20/40)이 고정이라 하드코딩, 시스템ID 위치(필드/키)는 설정 화면에서 1회 자동탐지 후 위젯에 저장, 실행 화면(전광판)은 저장값만 읽어 분기(런타임 재탐지·하드코딩 없음)
- `features/board/utils/redisKeyPattern.ts` 신규: `parseTrailingMediaType()`(미디어타입은 위치 무관하게 "있으면 항상 마지막 세그먼트"라는 값 기반 규칙으로 탐지), `findSiblingKeys()`(미디어타입을 뗀 나머지가 세그먼트 1개만 다른 "형제 키" 탐색 — 새 SCAN 없이 BE가 이미 캐싱해 내려준 전체 해시키 목록만 사용), `detectRedisKeyPattern()`(형제가 있으면 keyed, 없는데 그 키 자체가 존재하면 fields, 둘 다 아니면 unknown), `extractSystemIdSegment()`(형제 키에서 baseKey 대비 다른 세그먼트=시스템ID 값 추출)
- `taskboard.types.ts`: `CallDataItem.redisKeyPattern?: 'fields' | 'keyed'` 신규(설정 화면 탐지 결과 저장용, 미지정 시 'fields')
- `useTaskboardQueries.ts`: `useGetRedisHashEntriesMulti(hashKeys, refetchInterval?)` 신규 — `useQueries`로 키 개수가 매 렌더마다 달라져도(Rules of Hooks 제약 없이) 여러 해시키를 한 번에 조회. 결과는 입력 순서와 동일한 배열
- TaskCreate.tsx: table-redis의 "Redis 해시키" 입력 아래에 "시스템ID 위치" 자동탐지 패널 신규 — 입력한 키 기준으로 형제 키 개수까지 보여주고, "탐지 결과로 저장" 버튼으로 `redisKeyPattern`을 위젯에 저장
- `RedisTableWidget.tsx` 전면 수정: 기존 단일 `useGetRedisHashEntries(hashKey)` 호출을 제거하고, `redisKeyPattern==='keyed'`면 `[hashKey, ...형제키들]`을 `useGetRedisHashEntriesMulti`로 한 번에 조회 → 키마다 행을 따로 뽑아(`buildRowsForEntries`로 기존 행 생성 로직 그대로 재사용) 합치고, 각 행에 `SYSTEM_ID_COLUMN_KEY`('__systemId') 컬럼으로 어느 시스템ID에서 왔는지 태그. `redisKeyPattern==='fields'`(기본값, 기존 동작)는 `categoryKeys=[hashKey]` 하나뿐이라 동일하게 동작(회귀 없음)
- `npx tsc --noEmit`/`npx eslint --fix` 통과(에러 0, 경고 추가 없음 — 비-null 단언 2건은 로컬 변수로 추출해서 제거). **브라우저 실측 미실시** — table-redis에서 keyed로 저장한 위젯이 형제 키들을 실제로 다 가져와서 합치는지, `__systemId` 컬럼을 추가하면 값이 제대로 나오는지 사용자가 직접 확인 필요
- 관련 파일: `features/board/utils/redisKeyPattern.ts`(신규), `features/board/types/taskboard.types.ts`, `features/board/hooks/useTaskboardQueries.ts`, `pages/board/TaskCreate.tsx`, `features/board/components/RedisTableWidget.tsx`

### 기능 — 테두리에 컬럼별 세로선 추가 + table-redis 실시간 통신 방식 확인
- 사용자 요청 2건: ①border를 켜면 가로선(행 구분선)만 생기는데 컬럼별 세로선도 추가 ②table-redis 실행 화면 데이터가 소켓이 아니라 REST API로 도는 것 같은데 확인
- **① 세로선**: `AnimatedTableCell`에 `borderRight` prop 신규(기본 'none'). `showBorder`/`borderWidth` 설정값을 그대로 재사용해 `cellBorderRight = cellBorderBottom`로 가로선과 동일한 두께·색으로 통일. 마지막 컬럼은 'none'으로 넘겨 표 바깥쪽에 선이 남지 않게 함. 4곳(`TableWidget`/`ViewTableWidget`/`RollingTableWidget`/`RedisTableWidget`) `<th>`/`AnimatedTableCell` 호출부 모두에 `colIdx` 기준으로 동일 적용
- **② 확인 결과**: 사용자 의심이 맞음 — `RedisTableWidget.tsx`(table-redis 위젯, TaskCreate/TaskView/RollingDisplay 어디서 쓰든 동일 컴포넌트)는 `useGetRedisHashEntriesMulti`(`REDIS_TABLE_REFETCH_MS = 5000`)로 **5초 간격 REST 폴링**을 하고 있음 — table-queue/group/agent와 단일값 Redis 위젯은 이미 `useCtiqWebSocket`으로 통합됐는데 table-redis만 처음부터 REST 폴링으로 남아있던 것. WS 핸들러는 이미 임의 hashKey를 지원하도록 일반화돼 있어 기술적으로 전환 가능 — 사용자에게 전환 여부 확인 후 진행하기로 함(이번엔 코드 변경 없음, 확인만)
- `npx tsc --noEmit`/`npx eslint --fix` 통과(에러 0, 경고 추가 없음). **브라우저 실측 미실시** — border를 켰을 때 컬럼 사이 세로선이 실제로 보이는지 사용자가 직접 확인 필요
- 관련 파일: `features/board/components/AnimatedTableCell.tsx`, `pages/board/TaskCreate.tsx`, `pages/board/TaskView.tsx`, `features/board/components/RollingDisplay.tsx`, `features/board/components/RedisTableWidget.tsx`

### 기능 — table-redis REST 폴링 → WebSocket 전환 ("필요한 컬럼만" 구독)
- 배경: 사용자가 "전광판→BE 데이터 통신은 전부 WebSocket으로"라고 요구. table-redis는 field(행) 목록을 미리 모른다는 점이 걸림돌이라(WS 프로토콜이 `ids` 명시를 요구) BE에 와일드카드 구독을 먼저 추가(`BT-ADMIN-SERVICE-TASKBOARD/CHANGELOG.md` 참고: `CtiRedisPoller.getAllFieldIds()`, `CtiqWebSocketHandler` `ids:["*"]` 지원)
- `RedisTableWidget.tsx` 전면 수정: `useGetRedisHashEntriesMulti`(REST, 직전 작업에서 추가했던 것) 호출 제거하고 `useCtiqWebSocket`으로 교체. `categoryKeys`(fields면 1개, keyed면 형제 키까지) 각각을 `{hashKey, ids:['*'], columns: neededColumns}` 구독으로 변환
- **"필요한 컬럼만"**: 신규 `collectNeededColumns(columns, groupBy)` — 표시 컬럼의 key를 그대로 모으되, calc 컬럼은 자기 key가 아니라 `calc.operands[].field`(수식이 실제로 참조하는 JSON 필드)를, groupBy(그룹별 합계) 모드면 표시 컬럼과 무관하게 byKey/aggKey 두 개만 모아서 WS 구독의 `columns` 필터로 전달 — BE가 전체 JSON 대신 이 필드들만 추려서 보냄
- WS는 이미 파싱된 객체(`CtiqRecord`)로 데이터를 내려주므로(REST의 raw JSON 문자열과 다름) `buildRowsForEntries`에서 `JSON.parse` 단계를 제거. `groupSumRedisHashEntries`(`redisValue.ts`)가 REST(raw 문자열)/WS(파싱된 객체) 양쪽을 다 받을 수 있게 시그니처를 `Record<string, string | Record<string, unknown>>`로 일반화(내부에서 타입 분기)
- 직전 작업에서 추가했던 `useGetRedisHashEntriesMulti`(REST, `useQueries` 기반)는 더 이상 호출하는 곳이 없어져 죽은 코드가 되므로 같이 제거(`useTaskboardQueries.ts`, `useQueries` import도 함께 정리)
- **예외 — 형제 키 탐색용 해시키 "목록" 조회(`useGetRedisHashKeys`)는 REST로 유지**: 이건 실시간 데이터가 아니라 BE가 캐싱해둔 스키마 메타 정보(TaskCreate 좌측 탐색기와 동일 캐시) 조회라 사용자가 말한 "데이터 전송"의 범위에 안 들어간다고 판단 — 다르게 생각하면 알려달라고 안내함
- `npx tsc --noEmit`/`npx eslint --fix` 통과(에러 0, 경고 추가 없음). **브라우저 실측 미실시** — table-redis가 실제로 WS로 실시간 갱신되는지(특히 fields/keyed 양쪽, groupBy 모드 포함) 사용자가 직접 확인 필요
- 관련 파일: `features/board/components/RedisTableWidget.tsx`, `features/board/hooks/useTaskboardQueries.ts`, `features/board/utils/redisValue.ts`. BE 짝 파일: `BT-ADMIN-SERVICE-TASKBOARD/web/service/CtiRedisPoller.java`, `web/controller/CtiqWebSocketHandler.java`

### 수정 — TaskCreate 컬럼 등록 시 실제 필드명 자동완성 추가
- 사용자 보고 2건: ①"테이블 등록할 때 필요한 컬럼 키값을 등록해서 써야 될 거 같다" ②"데이터 조회할 때 테이블형식이 다시 안 나온다"
- **② 원인**: WS `columns` 필터가 BE에서 서버사이드로 적용되므로, BE 재시작 안 됐거나(가장 가능성 높음 — BT-ADMIN-SERVICE-TASKBOARD 쪽 기록 참고) 등록한 필드명이 실제 Redis 데이터 키와 다르면 데이터가 안 보일 수 있음. BE에 안전장치(컬럼 매칭 실패 시 전체 반환) 추가는 BE 쪽에서 처리
- **① 대응**: table-redis의 "테이블 컬럼" 필드명 입력에 **실제 그 해시키에 존재하는 필드명 자동완성**(`<datalist>`)을 추가 — 이미 좌측 탐색기 검색에 쓰던 `useGetRedisHashColumns()` 캐시를 재사용(새 조회 없음). 임의로 타이핑해서 키가 어긋나는 일을 줄이기 위함. 입력란 위에 "실제 존재하는 필드명만 골라 써야 데이터가 보입니다" 안내문 추가(해당 해시키에 캐싱된 필드명이 있을 때만 노출)
- `npx tsc --noEmit`/`npx eslint --fix` 통과(에러 0, 경고 추가 없음). **브라우저 실측 미실시** — BE 재시작 후 table-redis 데이터가 다시 보이는지, 자동완성이 실제 필드명을 제안하는지 사용자가 직접 확인 필요
- 관련 파일: `pages/board/TaskCreate.tsx`. BE 짝 파일: `BT-ADMIN-SERVICE-TASKBOARD/web/controller/CtiqWebSocketHandler.java`

## 2026-06-26

### 버그 수정 — table-group-reason 위젯에서 이석사유(REASON_CODE)가 테이블에 표시되지 않는 문제
- **근본 원인**: `IC:GROUP:REASON:{groupId}:{mediaType}` 해시는 hash **field key 자체**가 사유코드(예: `"001"`, `"002"`)이고 JSON 값에는 `AGENT_CNT` 등만 있다. 그런데 `table-group-reason` 프리셋이 `groupBy: { byKey: 'REASON_CODE', aggKey: 'AGENT_CNT' }`를 설정해서 Redis JSON *값 안에서* REASON_CODE를 찾으려 했음 → JSON에 REASON_CODE 키가 없어 전체 항목이 빈 key(`''`)로 묶임 → 테이블 REASON_CODE 컬럼이 항상 빈 값
- **수정**: `TABLE_GROUP_REASON_WIDGET_ITEMS` 프리셋에서 `groupBy` 제거, `{ key: 'REASON_CODE' }` 컬럼을 `{ key: ROW_ID_COLUMN_KEY }` (`__id` — field key 예약어)로 교체. 기존 `__systemId` 컬럼(그룹ID)은 유지 — `extractSystemIdSegment`가 Redis 키 세그먼트 차이로 그룹ID를 추출해 채워줌
- **부가 개선**: `collectNeededColumns`에서 `__id`(`ROW_ID_COLUMN_KEY`)뿐 아니라 `__systemId`(`SYSTEM_ID_COLUMN_KEY`)와 `__rowNum`(`ROW_NUMBER_COLUMN_KEY`)도 WS 구독 columns 필터에서 제외 — 이 3개는 FE가 내부적으로 계산하는 가상 컬럼으로 Redis JSON 필드가 아니므로 BE에 보내도 의미가 없음. 이제 `table-group-reason`의 WS 구독 columns는 `['AGENT_CNT']`만 전달되어 더 효율적
- `npx tsc --noEmit -p apps/taskboard/tsconfig.app.json` 에러 0, `npx eslint --fix` 경고만(기존 파일 기존 경고, 신규 없음)
- **BE 변경 없음** — BE(`CtiRedisPoller`/`CtiqWebSocketHandler`)는 임의 hashKey를 이미 완전히 지원, 이번 변경은 FE 프리셋 설정만
- 관련 파일: `pages/board/TaskCreate.tsx` (GROUP_REASON_WIDGET_ITEMS), `features/board/components/RedisTableWidget.tsx` (collectNeededColumns)

### IC 데이터 트리 고도화 — task-create 좌측 패널에서 가변 세그먼트(GROUP_ID 등) 숨기기
- **문제**: `IC:AGENT:{GROUP_ID}:{MEDIA_TYPE}`, `IC:GROUP:REASON:{GROUP_ID}:{MEDIA_TYPE}` 계열 키가 트리에 그대로 나열되어 GROUP_ID가 중간 노드로 노출됨 — 사용자는 "미디어타입과 값 컬럼만 보이게" 요청
- **구현 방식**: IC 섹션에만 적용, 다른 데이터(IC:CTIQ, IC:GROUP 등)에는 무영향
  - `collapseIcGroupSegment(key)`: `IC:AGENT:{G}:{M}` → `IC:AGENT:{M}`, `IC:GROUP:REASON:{G}:{M}` → `IC:GROUP:REASON:{M}` 축약 함수 신규 추가 (MEDIA_TYPE이 마지막 세그먼트임을 `MEDIA_TYPE_LABELS` 키로 검증)
  - `IcActualKeyContext`: 축약된 트리 키(예: `IC:AGENT:0`) → 실제 Redis 키 목록(`IC:AGENT:G1:0`, `IC:AGENT:G2:0`, ...) 매핑 Context 신규
  - `RedisHashSection`: `useMemo`로 `icActualKeyMap`, `treeHashKeys`, `collapsedFieldIndex` 계산 후 `groupRedisKeys`에 축약 키 목록만 전달. JSX를 `IcActualKeyContext.Provider`로 감쌈
  - `RedisHashFieldItems`: `useContext(IcActualKeyContext)`로 실제 키 조회 → `actualHashKey`(대표 키)로 데이터 fetch, `resolvedSiblingKeys`를 `callItem.hashSiblingKeys`에 전달해 WS 구독에 모든 그룹의 동일 미디어타입 키가 집계됨
  - `fieldIndex`도 축약 키 기준으로 재매핑(`collapsedFieldIndex`)하여 검색(필드명 매칭)이 IC:AGENT:0 축약 노드에서도 정상 동작
- `npx tsc --noEmit -p apps/taskboard/tsconfig.app.json` 에러 0, `npx eslint --fix` 경고만(신규 없음)
- **BE 변경 없음**
- 관련 파일: `pages/board/TaskCreate.tsx` (collapseIcGroupSegment, IcActualKeyContext, RedisHashFieldItems, RedisHashSection)

### 수정 — table-redis 위젯이 화면당 자기 WS 소켓을 따로 여는 문제(F12 Network에 ctiq 소켓 2개) + 소켓 경로명 변경
- 사용자가 F12 Network 탭에서 "ctiq" 소켓이 2개 뜨는 걸 확인하고 지적. 원인: `RedisTableWidget`이 자기 내부에서 직접 `useCtiqWebSocket`을 호출하고 있었음 — TaskView/RollingDisplay/TaskCreate는 이미 화면당 단일 `useCtiqWebSocket` 연결로 큐/그룹/상담사/단일값 Redis 위젯을 구독하는데, table-redis 위젯만 이 공유 연결에 안 끼고 자기 혼자 별도 연결을 또 여는 구조였음(위젯 개수만큼 소켓이 늘어나는 구조이기도 했음)
- `RedisTableWidget.tsx`: 컴포넌트가 더 이상 `useCtiqWebSocket`을 직접 호출하지 않음 — `dataByHashKey`를 필수 prop으로 받도록 변경. 대신 신규 `collectRedisTableWsSubscriptions(widgets, allHashKeys)`를 export — 캔버스/화면에 있는 모든 table-redis 위젯의 구독을 한 번에 모아 반환(병합은 기존 `mergeWsSubscriptions` 재사용)
- `TaskCreate.tsx`/`TaskView.tsx`/`RollingDisplay.tsx` 3곳 모두: 자기 화면의 기존 단일 WS 구독 목록에 `collectRedisTableWsSubscriptions(...)`의 결과를 합쳐서 같은 소켓으로 받고, 받은 `dataByHashKey`를 `RedisTableWidget`에 prop으로 내려줌. TaskCreate는 `WidgetContent`가 별도 컴포넌트라 `CanvasWidgetFree`/`CanvasWidgetGrid` → `WidgetContent` → `RedisTableWidget`까지 prop을 그대로 통과시켜야 했음(TaskView/RollingDisplay는 `renderWidget`이 메인 컴포넌트의 클로저라 prop 전달 없이 바로 참조 가능)
- 결과: 화면이 무슨 위젯을 몇 개 갖고 있든 화면당 WS 소켓은 항상 1개
- **추가로 같이 요청받음 — 소켓 경로명 변경**: "ctiq"라는 이름이 Network 탭에 그대로 보이는데, 이 소켓이 이제 큐/그룹/상담사뿐 아니라 table-redis(임의 Redis 해시) 데이터까지 전부 나르므로 이름이 안 맞는다는 지적 → 경로를 `/ws/ctiq` → **`/ws/taskboard-rt`**로 변경(URL 경로만 — `CtiqWebSocketHandler`/`useCtiqWebSocket` 등 내부 클래스·함수명은 리네임 범위가 커서 이번엔 유지, 주석에 사유 기록). BFF `/ws/proxy/**`는 경로를 그대로 릴레이하는 범용 프록시라 BFF 쪽 수정은 불필요
- `npx tsc --noEmit -p apps/taskboard/tsconfig.app.json`(주의: 루트 `tsconfig.json`은 `files:[]`/`include:[]`라 `--noEmit`이 사실상 아무것도 검사 안 함 — 이번에 발견. **앞으로는 `tsconfig.app.json`을 직접 지정해야 함**)/`npx eslint --fix` 통과(에러 0, 경고 추가 없음). BE `compileJava` BUILD SUCCESSFUL
- **재시작 필요(BE) + 브라우저 실측 미실시** — BE 재기동 후 F12 Network에 소켓이 1개(이름 `taskboard-rt`)로 보이는지, table-redis 데이터가 정상 갱신되는지 사용자가 직접 확인 필요

### IC:GROUP:REASON 테이블 PIVOT 렌더링 — 이석사유코드를 동적 컬럼으로 변환
- **배경**: IC:GROUP:REASON 해시 데이터가 기존에는 "노드+사유코드 조합 1개 = 행 1개"로 여러 행으로 나열됐으나 사용자가 "사유코드별로 PIVOT해서 행=노드, 열=사유코드" 형태를 요구
- **핵심 설계 결정**: 사유코드 목록은 프로젝트마다 가변(4개/10개/30개 등), DB나 별도 설정 없이 실시간 WS 수신 데이터에서 REASON_CDE 유니크 값을 추출해 컬럼 자동 생성
- **구현** (`RedisTableWidget.tsx`):
  - `groupReason !== null`(hashKey가 `IC:GROUP:REASON:` 패밀리)이면 PIVOT 렌더링으로 조기 return
  - PIVOT 키: `rowKey='NODE_ID'`, `colKey='REASON_CDE'`, `valueKey='AGENT_CNT'` — `tableConfig.pivot` 설정으로 재지정 가능(기본값)
  - `categoryKeys`(실제 그룹별 Redis 해시 키 목록) 전체의 entries를 flat하게 모아 유니크 REASON_CDE 추출 → 숫자 오름차순 정렬 → 동적 컬럼 헤더 생성
  - `pivotMap: Map<NODE_ID, Map<REASON_CDE, AGENT_CNT>>` 구성 → NODE_ID 오름차순으로 행 렌더
  - `tableConfig.columns`에 `key===REASON_CDE값`인 항목이 있으면 그 label/width/align을 해당 동적 컬럼에 재사용(선택적 스타일 오버라이드), 없으면 REASON_CDE 코드 그대로 헤더로 표시
  - `AnimatedTableCell` 재사용 — 기존 단일값 애니메이션·임계치 색상이 PIVOT 셀에도 동일하게 적용
- **타입 추가** (`taskboard.types.ts`): `tableConfig.pivot?: { rowKey?: string; colKey?: string; valueKey?: string }` — PIVOT 대상 필드 재지정 가능
- **BE 변경 없음** — BE가 이미 raw 데이터를 올바르게 전송 중, FE 렌더링 레이어만 변경
- 관련 파일: `features/board/types/taskboard.types.ts`, `features/board/components/RedisTableWidget.tsx`
- **브라우저 실측 미실시** — IC:GROUP:REASON 해시 데이터가 있을 때 PIVOT 테이블이 맞게 그려지는지 사용자가 직접 확인 필요. 확인 포인트: ①사유코드 열 수가 실제 데이터의 REASON_CDE 종류 수와 일치하는지 ②행이 NODE_ID별로 하나씩 나오는지 ③셀 값이 AGENT_CNT인지
- 관련 파일: `features/board/components/RedisTableWidget.tsx`, `features/board/hooks/useCtiqWebSocket.ts`, `pages/board/TaskCreate.tsx`, `pages/board/TaskView.tsx`, `features/board/components/RollingDisplay.tsx`. BE 짝 파일: `BT-ADMIN-SERVICE-TASKBOARD/web/config/TaskboardWebSocketConfig.java`, `web/config/TaskBoardSecurityConfig.java`

### 버그 수정 — IC:GROUP:REASON PIVOT 렌더링 3종 버그(탐지/데이터/빈 테이블)
- **버그1 — PIVOT 트리거 안 됨**: `parseGroupReasonHashKey('IC:GROUP:REASON:0')`이 `null` 반환 — 함수가 `IC:GROUP:REASON:{groupId}:{mediaType}` (세그먼트 2개) 형식만 허용하고, 사용자가 입력하는 와일드카드 형식 `IC:GROUP:REASON:{mediaType}` (세그먼트 1개)를 거부했음. 수정: 세그먼트 1개일 때도 `{ mediaType: rest[0] }` 반환하도록 허용
- **버그2 — 실제 그룹 키를 못 찾음**: `resolveCategoryKeys`가 `findSiblingKeys`로 `IC:GROUP:REASON:G1:0`를 찾으려 했으나, 기존 형제 탐색 로직은 "미디어타입 제거 후 세그먼트 수가 같아야 형제"라는 조건이 있어 세그먼트가 1개 더 많은 실제 그룹 키를 형제로 인식하지 못했음. 수정: `findGroupReasonKeys(mediaType, allHashKeys)` 신규 함수 — `IC:GROUP:REASON:{x}:{mediaType}` 패턴과 일치하는 키를 `allHashKeys`에서 직접 수집. `resolveCategoryKeys`가 GROUP_REASON 패밀리일 때 이 함수를 우선 사용
- **버그3 — PIVOT 데이터 추출 방식 불일치**: 기존 구현이 JSON 값에서 `NODE_ID`(행 키)와 `REASON_CDE`(컬럼 키)를 읽으려 했으나, 실제 Redis 구조는 **hash field key 자체가 사유코드**, JSON 값은 `{AGENT_CNT:N}` 뿐. 결과적으로 유니크 컬럼 목록이 항상 비어서 테이블이 빈 상태로 렌더됐음. 수정: 행 = `extractGroupIdFromGroupReasonKey(categoryKey)` (해시 키에서 그룹ID 추출, 신규 함수), 컬럼 = `Object.keys(dataByHashKey[key])` (hash field key = 사유코드), 셀 = `entry[pivotValueKey]`(`AGENT_CNT`)
- **부가 수정 — WS columns 필터**: `collectRedisTableWsSubscriptions`에서 컬럼 설정 없을 때 `columns:[]`를 보내던 것을 `columns:undefined`로 변경(빈 배열을 BE에 보내면 "컬럼 없음"으로 해석될 수 있는 방어적 처리)
- **신규 함수** (`redisValue.ts`): `findGroupReasonKeys(mediaType, allKeys)`, `extractGroupIdFromGroupReasonKey(key)`
- **BE 변경 없음**
- 관련 파일: `features/board/utils/redisValue.ts`, `features/board/components/RedisTableWidget.tsx`
- **브라우저 실측 미실시** — `IC:GROUP:REASON:0` 입력 시 ①PIVOT 테이블이 나오는지 ②각 행이 그룹ID인지 ③컬럼이 사유코드(001/002/…)로 자동 생성되는지 ④셀 값이 AGENT_CNT인지 사용자가 직접 확인 필요. 추가 확인: task-view에서 `targetGroupIds`가 있을 때 해당 그룹만 행으로 나오는지

## 2026-06-29

### DbQuery 전용 위젯 신규 + [object Object] 버그 수정

**DbQuery 위젯 신규 (category: 'DbQuery')**
- `taskboard.types.ts`: `CallDataItem`의 `category` union에 `'DbQuery'` 추가, `dbQueryKey`/`dbQueryColumn`/`dbQueryIntervalSec` 필드 신규
- `TaskCreate.tsx`:
  - `DB_QUERY_KEYS` 상수 (`custom1`~`custom10`) + `extractDbQueryResult()` 헬퍼 함수 추가
  - `DbQuerySection` 컴포넌트 신규 — 좌측 팔레트 "DB Query" 섹션 (키 드롭다운 → 테스트 → 컬럼 선택 → 추가)
  - `DbQueryWidgetProps` 컴포넌트 신규 — 우측 속성 패널 (키/컬럼/주기 편집 + 재테스트)
  - `updateWidgetDbQuery()` 함수 신규
  - `FixedItemsSection`에 `<DbQuerySection />` 등록
  - 우측 패널 dispatch에 `DbQuery` 분기 추가
  - `getWidgetDataSourcePath()`에 DbQuery 케이스 추가
- `TaskView.tsx`:
  - `extractDbResult()` 헬퍼 함수 신규 — 배열/단일행 유연 처리, 컬럼명 대소문자 자동 변환
  - `ViewValueWidget`: `isDbQuery` 상태 + useEffect(폴링) + `dbQueryValue` state 추가
  - `displayValue` 계산에 `isDbQuery` 분기 추가

**[object Object] 버그 수정 (ExternalApi `db:` 프리픽스)**
- `TaskView.tsx` `ViewValueWidget`의 `fetchValue`: `db:` 프리픽스 URL인 경우 기존 dot-path reduce 대신 `extractDbResult()` 사용 → DB 쿼리가 배열을 반환할 때 `[object Object]` 로 표시되던 버그 수정
- 기존 HTTP API는 기존 로직 유지(하위 호환)

- 관련 파일: `features/board/types/taskboard.types.ts`, `pages/board/TaskCreate.tsx`, `pages/board/TaskView.tsx`
- ESLint 0 errors / TypeScript 0 errors 확인 완료
- **브라우저 실측 미실시** — ① DbQuery 위젯을 팔레트에서 테스트·추가·드래그·캔버스 배치하는 흐름 ② 실행화면에서 주기적 폴링으로 값이 갱신되는지 ③ `db:custom1` ExternalApi 위젯에서 값이 올바르게 표시되는지 사용자가 직접 확인 필요

## 2026-07-02

### TaskDbQueryRun.tsx (TASK-DB-QUERY 화면) 3건 개선
- **파라미터 있어도 뷰그룹용 저장 가능**: `isSavable`에서 `params.length === 0` 조건 제거(컬럼이 VALUE/NAME인지만 검사). 저장 시 params 값이 비어있으면 차단(고정값으로 얼려 저장되므로). `handleSave`가 `params`를 함께 전송(BE `TaskboardDbQueryDefRequest.params` 신규 필드)
- **결과 스크롤 점진 표시**: `visibleRows` state(초기 30, `VISIBLE_ROWS_STEP=30`) 도입. 결과 패널 `onScroll`에서 스크롤이 바닥 80px 이내로 오면 `visibleRows` 증가 → 전체 결과(최대 2000건, BE도 함께 상향)를 한번에 DOM에 그리지 않고 스크롤에 따라 점진 렌더. 새 쿼리 실행 시 `visibleRows` 30으로 리셋
- **레이아웃 스크롤 고정**: 최상위 컨테이너 `h-screen flex flex-col overflow-hidden`으로 변경, 헤더 `flex-shrink-0`, 좌/우 패널 `overflow-y-auto min-h-0`(좌측), 결과 패널은 라벨 고정 + 내부 `div`만 `overflow-auto`로 분리(테이블 헤더 `sticky top-0`) → 결과가 많아져도 페이지 전체가 아니라 결과 영역 안에서만 스크롤됨
- ESLint --fix 0 errors (기존 코드 스타일의 `any` 경고 다수는 사전 존재)
- `npx nx typecheck taskboard` 태스크가 이 워크스페이스에 등록되어 있지 않아 미실행 — **정식 경로(`C:\Users\user\git\BT-ADMIN-FE`)에서 typecheck 확인 필요**
- **브라우저 실측 미실시** — 저장 버튼 활성화 흐름, 스크롤 점진 로딩, 레이아웃 고정 여부 사용자가 직접 확인 필요
- 관련 파일: `pages/board/TaskDbQueryRun.tsx`, `features/board/api/taskboardApi.ts`, `features/board/hooks/useTaskboardQueries.ts`, `features/board/types/taskboard.types.ts`
- BE 쌍(`ROWNUM` → JDBC `setMaxRows` 전환 포함)은 `BT-ADMIN-SERVICE-TASKBOARD/CHANGELOG.md` 2026-07-02 항목 참고

### TaskDbQueryRun.tsx — 저장된 뷰그룹 체크박스 쿼리 수정(편집) 기능 추가
- 저장된 쿼리 목록 각 항목에 연필(수정) 아이콘 버튼 추가(`Pencil`, lucide) — 클릭 시 `handleEdit`이 sql/params/queryName/description을 편집기에 복원하고 `editingId` 세팅, 결과는 초기화(재실행 필요)
- 편집 중에는 SQL 에디터 상단에 amber 배너("저장된 쿼리를 편집 중입니다 — 실행 후 저장하면 덮어씁니다.") + 취소 버튼(`handleCancelEdit`) 표시, 저장된 목록에서도 해당 항목 amber 하이라이트
- 저장 버튼: `editingId` 유무에 따라 `useCreateDbQueryDef`/`useUpdateDbQueryDef` 분기(`saveMutation`), 라벨도 "저장"/"수정"으로 분기
- `useUpdateDbQueryDef` 훅 신규(`useTaskboardQueries.ts`), `taskboardApi.updateDbQueryDef` 신규(기존 update 계열 컨벤션대로 `apiClient.post` + `params: { id }` 사용, PUT 아님)
- `DbQueryDef` 타입에 `params?: DbQueryParam[]` 추가(BE `TaskboardDbQueryDefDto`가 저장된 파라미터를 함께 내려줌)
- ESLint --fix 0 errors
- **브라우저 실측 미실시** — 수정 버튼 클릭 → 편집기 복원 → 재실행 → 저장(덮어쓰기) 흐름 사용자가 직접 확인 필요
- 관련 파일: `pages/board/TaskDbQueryRun.tsx`, `features/board/api/taskboardApi.ts`, `features/board/hooks/useTaskboardQueries.ts`, `features/board/types/taskboard.types.ts`
- BE 쌍(PUT 엔드포인트, `paramsJson` 응답 포함)은 `BT-ADMIN-SERVICE-TASKBOARD/CHANGELOG.md` 2026-07-02 항목 참고

### TaskDisplayManage.tsx(task-display) — 뷰그룹 등록 시 TASK-DB-QUERY 등록 데이터 선택 가능하도록 연결
- **배경**: `DbQueryDef`(TASK-DB-QUERY에서 VALUE/NAME 두 컬럼으로 저장한 쿼리)는 애초에 "뷰그룹 체크박스 옵션 소스"로 설계돼 있었으나(타입 주석·BE 컨트롤러 주석 참고), 정작 `TaskDisplayManage.tsx`의 뷰 그룹 등록 폼은 큐/상담그룹(CTI 실시간 리스트)만 선택 가능했고 저장된 `DbQueryDef`는 어디서도 쓰이지 않던 미완결 상태였음 — 이번에 그 연결 고리를 완성
- `taskboard.types.ts`: `TaskboardDisplaySelection`에 `dbQuerySelections?: Record<number, string[]>` 필드 추가(dbQueryId → 선택된 VALUE 배열)
- `useTaskboardQueries.ts`: `useGetDbQueryDefOptionsMulti(ids)` 신규 — `useQueries`로 저장된 `DbQueryDef` 개수만큼 동적으로 옵션(VALUE/NAME) 조회
- `TaskDisplayManage.tsx`:
  - `extractNameValueItems()` 신규 — 쿼리 실행 결과 rows에서 VALUE/NAME 컬럼을 대소문자 무시로 찾아 `MultiSelectDropdown` items(`{id,name}`)로 변환
  - `DisplayForm`: `useGetDbQueryDefList()` + `useGetDbQueryDefOptionsMulti()`로 저장된 쿼리 목록을 가져와, 큐/상담그룹 드롭다운 아래에 쿼리별 `MultiSelectDropdown` 행을 동적으로 렌더링(드롭다운 열림상태는 `openDbQueryId` 단일 state + `dbQueryDropdownRefs`(Map) 관리). 선택값은 `dbQuerySelections` state에 저장 후 `handleSubmit`에서 `selectionJson`에 포함(빈 배열은 필터링)
  - 저장된 쿼리가 없을 때 "TASK-DB-QUERY 화면에서 VALUE/NAME 쿼리를 등록하면 여기 선택 항목으로 추가됩니다" 안내문 표시
  - `SelectionSummary`: `dbQueryDefs`/`dbQueryNameMaps` prop 추가해 카드/목록 요약 칩에도 쿼리별 선택값 노출(색상 `#b45309`, 큐=cyan·상담그룹=violet과 구분)
  - 메인 `TaskDisplayManage` 컴포넌트에서도 동일하게 `useGetDbQueryDefList`/`useGetDbQueryDefOptionsMulti`로 이름 매핑을 만들어 두 `SelectionSummary` 호출부(카드형/목록형)에 전달
- **범위 밖(미착수)**: 이번 작업은 등록 화면(선택지 노출·저장)까지만 — 전광판 실행화면(`TaskView.tsx`/`RollingDisplay.tsx`)에서 이 `dbQuerySelections`를 실제 위젯 데이터에 반영(필터링/조회)하는 런타임 연동은 별도 작업 범위. 필요 시 후속 요청으로 진행
- ESLint --fix 0 errors, `npx tsc --noEmit -p apps/taskboard/tsconfig.app.json` 0 errors (정식 경로 `C:\Users\user\git\BT-ADMIN-FE`가 없는 환경이라 이 F: 사본에서 검증함 — 정식 경로에서 한 번 더 확인 필요)
- **브라우저 실측 미실시** — 뷰그룹 등록 폼에서 TASK-DB-QUERY 저장 쿼리가 드롭다운으로 뜨는지, 선택 후 저장·재편집 시 값이 복원되는지, 카드/목록 요약 칩에 정상 표시되는지 사용자가 직접 확인 필요
- 관련 파일: `pages/board/TaskDisplayManage.tsx`, `features/board/hooks/useTaskboardQueries.ts`, `features/board/types/taskboard.types.ts`
- BE 변경 없음(기존 `TaskboardDbQueryDefController`의 `/db-query-def`, `/db-query-def/{id}/options` 엔드포인트 그대로 재사용)
