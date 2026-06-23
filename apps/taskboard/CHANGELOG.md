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
