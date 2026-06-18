# apps/taskboard 진행 상황

> Claude Code 세션이 꺼져도 다음 세션에서 이 파일을 먼저 읽고 이어서 작업합니다.
> "진행 중 작업"이 있으면 그것을 최우선으로 이어가고, 완료되면 `CHANGELOG.md`로 옮긴 뒤 이 파일은 "없음" 상태로 비웁니다.

## 진행 중 작업

없음

<!--
작업이 생기면 아래 형식으로 작성:

### <작업명> (시작: YYYY-MM-DD)
- 목표:
- 완료된 단계:
  -
- 남은 단계 / 다음에 할 일:
  -
- 막힌 점 / 확인 필요:
  -
- 관련 파일:
  -
- 짝 폴더(BT-ADMIN-SERVICE-TASKBOARD) 연관 여부:
-->

## 마지막 업데이트

- 2026-06-12: 초기 템플릿 생성
- 2026-06-12: 공지사항 위젯 공통화(AnnouncementWidget) + 실제 연동, RollingDisplay Redis 라이브 데이터 연동, TaskList Redis 집계 로직 수정, OAuth2 미사용 타입 제거 완료 → CHANGELOG.md 기록
- 2026-06-15: "텍스트만 보이기" 위젯 모자이크(블러+테두리) 버그 수정(widgetVisualStyle 공통 유틸 추출 + TaskCreate/TaskView/TaskList/RollingDisplay 적용), 롤링 전환효과 6종 추가(모자이크/와이프/회전/기본/바운스/랜덤, 총 15종) 완료 → CHANGELOG.md 기록
- 2026-06-15: 전광판 실행 시 값 위젯 하단 색상 줄 제거, Redis 집계 뱃지(MAX/MIN/∑) 노출 제거, 값(value) 정렬(valueAlign) 미적용 수정(TaskView/TaskList/RollingDisplay) 완료. Redis 해시 그룹 집계가 동작 안 하는 것처럼 보이는 원인 조사(코드 결함 아님, 다중 키 테스트 데이터 부재) → CHANGELOG.md 기록
- 2026-06-15: Redis 집계 '평균' 추가 + 집계 방식 UI 노출 조건 완화, Redis 해시키 목록 BE 캐싱(@PostConstruct) + FE 새로고침 버튼, "계산식" 위젯 신설(캔버스 위젯 🔗 드래그 → 변수 바인딩 + 자유 수식 입력) 완료. getRedisValue() 중복 제거하여 redisValue.ts 공통 유틸로 통합 → CHANGELOG.md 기록
- 2026-06-15: 계산식 위젯 변수를 캔버스 미배치 Redis 항목에서 직접 바인딩 가능하도록 개선(`CalcOperand.source`/`aggregation` 추가, `getOperandNumericValue`/`collectRedisHashKeys` 신규, `handleDragEnd`에서 좌측 팔레트 Redis 드래그를 변수 드롭존에서 처리, source 바인딩 시 집계(없음/∑/↑/↓/⌀) 선택 UI 추가, TaskView/TaskList/RollingDisplay의 Redis 폴링 키 수집을 `collectRedisHashKeys`로 통합) 완료 → CHANGELOG.md 기록
- 2026-06-16: 상담그룹 compositeKeys + RTS_READY 합산 완료, HTTP 414 수정(getRedisHashFieldsBatch GET → POST) 완료 → CHANGELOG.md 기록
- 2026-06-16: Redis 키 구조 수정 — IC:GROUP:{compositeKey}:{mediaType} 방식(잘못됨) → IC:GROUP:{mediaType} 해시 키에서 field={compositeKey}로 조회(올바름). TaskView/TaskList/RollingDisplay의 groupHashKeys 및 default 블록 3파일 모두 수정 완료
- 2026-06-18: 디스플레이(선택값 그룹핑)를 레이아웃에서 분리하는 N:M 구조 전환 완료 — TaskDisplayManage.tsx 전면 재작성, TaskList/TaskView/TaskMgmt/RollingDisplay가 displayLayoutId 기준으로 동작 → CHANGELOG.md 기록
- 2026-06-18: TaskMgmt 롤링그룹 편집 UX를 "전광판 우선 선택 → 디스플레이 멀티선택" 구조로 재설계, layoutId별 localStorage 기억 추가 → CHANGELOG.md 기록
- 2026-06-18: 디스플레이/전광판 실행화면 표시값 설정 모달의 큐/상담그룹/상담사 한 줄 정렬이 깨지던 버그 수정(TaskDisplayManage.tsx, TaskView.tsx) — 각 항목을 별도 행으로 분리
- 2026-06-18: 좌측 트리 단일값 Redis 위젯을 REST 5초 폴링에서 WS로 통합 완료(`collectRedisWsSubscriptions`/`mergeWsSubscriptions` 신규, TaskView/RollingDisplay가 단일값 위젯도 큐/그룹/상담사와 같은 WS 소켓으로 구독) → CHANGELOG.md 기록
- 2026-06-18: IC:GROUP:* 단일값 위젯이 디스플레이 선택값(selection.groupIds) 기준으로 그룹을 보여주도록 개선(`buildGroupIdsByHashKey` 신규, 여러 그룹 선택 시 합산) → CHANGELOG.md 기록
- 2026-06-18: 롤링그룹을 "전광판 등록 + 실행 시점 디스플레이 선택" 구조로 재설계 — GroupEditView는 전광판 순서만 선택, `RunOptionsView` 신규(전체 적용/전광판별 개별 선택, groupId별 localStorage 기억) → CHANGELOG.md 기록. apps/taskboard 정식 경로(C:\Users\user\git\BT-ADMIN-FE)가 없는 환경이라 이 F: 사본에서 tsc/eslint로 검증함 — 정식 경로에서 한 번 더 확인 필요
