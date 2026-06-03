---
name: generate-manual
description: 모든 remote 화면을 실제 브라우저로 띄워 스크린샷을 찍고, 화면 코드를 읽어 클라이언트(운영자)용 사용자 매뉴얼(Markdown)을 자동 생성한다. 기본 화면 + 탭 + 생성/편집 드로어·모달 + 목록→상세 진입까지 캡처. "메뉴얼 만들어줘", "사용자 매뉴얼 생성", "유저 매뉴얼 만들어줘", 특정 앱(fca, ipron 등) 매뉴얼 작성·갱신 시 사용.
---

# generate-manual

모든 remote 앱(목록은 `apps/`에서 동적 발견 — 신규 추가분 자동 반영)의 모든 화면을 순회하며 스크린샷 + 기능 설명이 담긴 사용자 매뉴얼을 만든다. 사용자 추가 입력은 최소화한다 — 설정 파일만 준비되면 "메뉴얼 만들어줘" 한마디로 전체 실행된다.

**매뉴얼 산출 구조**: remote 1개당 매뉴얼 md 1개(`{outputDir}/{appId}/README.md`)를 만들고, 최상위에 이들을 **목차/링크로 모으는 최종 인덱스 md**(`{outputDir}/README.md`)를 둔다. 인덱스는 각 remote 매뉴얼로 가는 링크 + 한 줄 요약만 담고, 실제 본문·스크린샷은 각 remote md에만 존재한다(중복 본문 없음).

**대상 remote 지정**: 인자로 appId를 주면 그 앱만 생성한다. 여러 개를 공백으로 나열하면 그 앱들만 생성한다(예: `generate-manual fca`, `generate-manual fca ipron stt`). 인자가 없으면 사용자에게 어떤 remote를 생성할지 물어 선택받는다. 지정한 앱만 (재)생성하되, **최종 인덱스는 이번에 생성한 앱 + `{outputDir}`에 이미 존재하는 다른 앱 매뉴얼을 함께 모아** 갱신한다(미지정 앱의 기존 md·링크는 보존).

**remote 목록은 하드코딩하지 않는다**: 어떤 remote가 있는지는 `apps/` 디렉토리에서 동적으로 발견한다(`apps/<app>/src/app/routes.tsx`가 있는 디렉토리 = remote, host는 자동 제외). 선택지·검증·기본 대상 모두 이 동적 목록을 SoT로 쓴다. 명령은 `node .claude/skills/generate-manual/scripts/extract-routes.mjs --list-apps`(줄바꿈) 또는 `--list-apps --json`. 신규 remote가 추가되면 스킬·스크립트 수정 없이 자동으로 목록에 포함된다.

> 산출물은 운영자/클라이언트가 읽는 문서다. 개발 용어(컴포넌트·props·훅·API·remote·Variant·BFF·OAuth·그리드/컬럼·드로어·마법사 등) 금지, 화면에서 보이는 한글 라벨과 동작 위주로 상세하게 쓴다. 금지어→권장 표현 매핑과 예외(화면에 보이는 약어는 풀어 설명 후 유지)는 [reference/login-and-capture.md](reference/login-and-capture.md) "5-1. 금지어 → 권장 표현 매핑" 참조.

## 핵심 규칙

- **캡처는 `chrome-devtools-mcp`로만** 수행한다. 새 자동화 라이브러리(Playwright 등) 도입 금지.
- **화면 목록은 `extract-routes.mjs` 산출 매니페스트의 `fullUrl`을 사용**한다. URL을 직접 조합하지 않는다.
- **설명은 반드시 해당 화면의 실제 코드(`componentFile` + 참조 feature)를 읽고** 작성한다. 추측 금지.
- **진행 상태를 파일로 추적**(`.manual-progress.json`)해 중단 후 재개를 지원한다. 라우트 1개 완료마다 갱신.
- **갱신 기준 기록**(`.manual-meta.json`): 매뉴얼 생성 직후 "어느 커밋·날짜 기준으로 만들었는지"를 앱별로 스탬프한다. 이후 소스가 바뀌면 이 기준과 화면별 import 의존성을 비교해 **어떤 화면 문서가 오래됐는지**를 자동 점검할 수 있다(아래 "갱신 점검(staleness)" 참조). 이 파일은 경량(앱당 수백 바이트)이라 **매뉴얼과 함께 커밋**한다(`.manual-progress.json`과 달리 gitignore 하지 않음).
- **부수효과 주의**: 캡처 중 생성/편집 드로어는 열어 스크린샷만 찍고 **저장하지 말고 취소/닫기**. 삭제 버튼은 누르지 않는다.
- 백엔드(`E:\dev\BT-ADMIN`)는 사용자 소유다. 스킬은 프론트만 기동/종료하고 백엔드는 건드리지 않는다. 백엔드 주소(API baseURL)는 하드코딩하지 말고 **`apps/host/proxy.config.local.json`의 `target` 값**에서 해석한다. 이 파일이 없으면 `apps/host/proxy.config.js`의 기본값(`http://localhost:8080`)을 사용한다. dev 서버(4200)가 `/api`·`/ws`를 이 target으로 프록시하므로, 스킬은 백엔드를 직접 호출하지 않고 프론트를 통해 로그인·데이터를 조회한다.

## 사전 준비물

- `manual.config.json` (이 스킬 폴더): `manual.config.example.json`을 복사해 `login` 채움. 없으면 복사 안내 후 중단.
- 백엔드가 실행 중이어야 함(로그인·데이터 조회 필수). 백엔드 주소는 `apps/host/proxy.config.local.json`의 `target`(없으면 `proxy.config.js` 기본값 `http://localhost:8080`)을 따른다. 해당 주소가 응답하지 않으면 사용자에게 "백엔드(`<해석된 target>`)가 응답하지 않습니다" 1줄 고지 후 중단.

---

## 절차

### 0. 설정 로드 · 사전 점검
1. `manual.config.json` 읽기. 없으면: "`manual.config.example.json`을 `manual.config.json`으로 복사하고 로그인 정보를 입력하세요" 안내 후 중단.
2. `login.userAccount`/`password`가 비어 있으면 중단(또는 사용자에게 1회 질의).
3. **대상 remote 확정**:
   - 먼저 `node .claude/skills/generate-manual/scripts/extract-routes.mjs --list-apps`를 실행해 **실제 remote 목록을 동적으로 확보**한다(하드코딩 목록 사용 금지). 이 목록이 선택지·검증·기본값의 SoT.
   - 인자로 appId가 1개 이상 주어졌으면 그 앱들로 한정(공백 구분, 예: `fca ipron`). 발견 목록에 없는 값은 무시하고 사용자에게 1줄 고지(유효한 것만 진행, 전부 무효면 중단).
   - 인자가 없으면 발견된 목록을 **선택지로 제시해 사용자에게 어떤 remote를 생성할지 물어**본다. `manual.config.json`의 `targetApps`가 비어 있지 않으면 그 앱들을 기본 선택으로 제안하고, 비어 있으면(또는 없으면) 발견된 전체를 기본 선택으로 제안한다. 사용자가 고른 앱만 대상으로 한다.
4. **백엔드 주소 해석**: `apps/host/proxy.config.local.json`이 있으면 그 `target` 값을, 없으면 `apps/host/proxy.config.js`의 기본값(`http://localhost:8080`)을 백엔드 주소로 확정한다. dev 서버는 `/api`·`/ws`를 이 주소로 프록시한다. 해석한 주소를 사용자에게 "백엔드(`<해석된 target>`)가 실행 중이어야 합니다" 형태로 1줄 고지한다.

### 1. 프론트엔드 기동
1. `node scripts/serve-host.js {serveSelection}` 를 **`run_in_background`로** 실행(기본 `serveSelection="1"` = 전체 remote). `--open`으로 브라우저가 떠도 무방.
2. `localhost:4200`(host)이 응답할 때까지 **폴링 대기**. 고정 `sleep` 금지 — HTTP 200 확인 루프(예: `curl`/`Invoke-WebRequest`로 4200 응답 확인)로 준비 완료를 판정. 초기 빌드는 수 분 걸릴 수 있으므로 넉넉한 타임아웃. host가 런타임에 remote를 통합하므로 **준비 판정 게이트는 host(4200)** 하나면 충분하다.
   - 특정 remote 포트가 필요하면 하드코딩하지 말고 `apps/<app>/project.json`의 serve `port`(또는 dev 서버 기동 로그의 `listening at ...:<port>`)에서 읽는다. host는 4200 고정.

### 2. 로그인
- `reference/login-and-capture.md`의 "1. 로그인 흐름"을 따른다. `{baseUrl}/login` 이동 → 아이디/비밀번호(+테넌트) 입력 → `로그인` 클릭 → `/` 도달 확인.
- 테넌트 선택·비밀번호 변경·로그인 실패 분기는 레퍼런스 규칙대로 처리(자동 처리 불가 시 사용자 보고 후 중단).
- 캡처 시작 전 `resize_page`로 뷰포트를 설정값(기본 1920×1080)으로 맞춘다.

### 3. 라우트 매니페스트 생성
1. `node .claude/skills/generate-manual/scripts/extract-routes.mjs {targetApps...} --out .claude/skills/generate-manual/_routes.json` 실행.
2. 산출 JSON의 `apps[appId]` 배열을 캡처 대상으로 사용. 각 항목: `fullUrl, dynamic, params, componentName, componentFile, isList, enterFromUrl`.
3. **건너뛰기(skip) 판정 — progress와 staleness를 함께 본다**:
   - **최초 생성 / 중단 후 재개**: `{outputDir}/.manual-progress.json`의 완료 `fullUrl`을 건너뛴다(재개).
   - **기존 매뉴얼 갱신(refresh)**: 먼저 `node .claude/skills/generate-manual/scripts/manual-staleness.mjs <app>`로 "갱신 필요" 목록을 구하고, **그 목록의 `fullUrl`만 (재)작성 대상**으로 삼는다(나머지 최신 화면은 건너뜀).
   - **통합 규칙**: 실제로 건너뛰는 화면은 **"progress에 완료 + staleness 최신"인 것뿐**이다. progress에 완료로 적혀 있어도 staleness가 "갱신 필요"로 판정한 화면은 **다시 작성**한다(= git 변경이 progress의 skip을 무효화한다). 메타에 없던 신규 라우트는 변경 파일에 걸려 자연히 "갱신 필요"로 잡히므로 새로 생성된다.

### 4. 화면별 캡처 루프
앱 단위로 순차 진행하고, 각 라우트마다:

1. **코드 정독**: `componentFile`과 그 페이지가 import하는 `features/<feature>/...`(탭/드로어/그리드 컬럼/폼 필드/상수 라벨)를 읽어 ① 화면 용도 ② 조작 가능한 기능 ③ 항목 의미를 파악. 이게 설명 텍스트의 근거다.
2. **기본 화면 캡처**:
   - `dynamic: false` → `navigate_page`로 `fullUrl` 이동 → `wait_for` 로딩 완료 → `__base` 스크린샷.
   - `dynamic: true` → `enterFromUrl`(목록)로 이동 → 첫 행 클릭으로 상세 진입(레퍼런스 3-2) → `__detail` 스크린샷. 데이터 0건이면 스킵 + 매뉴얼에 사유 표기.
3. **상호작용 캡처**(레퍼런스 3-1·3-3):
   - 탭이 있으면 각 탭 전환 캡처(`__tab-<label>` / 상세는 `__detail-tab-<label>`).
   - 주요 버튼(`추가/등록/생성/편집`)으로 생성·편집 드로어/모달 열기 → `__create`/`__edit` 캡처 → **취소/닫기**.
   - 요소 부재·데이터 없음은 graceful skip(매뉴얼엔 사유를 적지 말고 해당 섹션 생략 또는 기능만 기술).
   - **개발 서버 오류 오버레이(`removeChild`) 주의**: 라우트 이동·탭 전환·상세 진입 직후 화면이 검게 덮이며 `Cannot read properties of null (reading 'removeChild')` 오버레이가 뜨면, dev HMR 일시 오류이므로 `navigate_page` reload 후 다시 캡처한다(검은 화면 컷은 폐기). 상세 레퍼런스 3-6.
4. **매뉴얼 섹션 작성**: 해당 앱 `{outputDir}/{appId}/README.md`(remote당 md 1개)에 화면 섹션을 append. 각 앱 md는 **독립적으로 읽히는 한 편의 문서**다 — 파일 첫 화면 캡처 전에 md 상단에 `# '<앱 표시 라벨>' 사용자 매뉴얼` 제목 + 한 줄 개요 + **작성 기준 라인** + (선택) 화면 목차를 한 번 쓰고, 이후 화면별 섹션을 이어 붙인다.
   - **고객(운영자)에게 보일 문서다 — 개발/운영 메타 안내는 본문에 넣지 않는다**: "알려진 한계", "권한·환경에 따라 다르게 보일 수 있음", "예시 데이터가 없어 캡처 생략", "최고 권한 계정 권장" 같은 **제작 과정 고지나 면책 문구를 매뉴얼 본문(서두 포함)에 쓰지 않는다**. 이런 한계는 스킬이 내부적으로 인지하는 제약일 뿐, 제품 설명서에는 어울리지 않는다. 데이터가 없어 빈 화면을 캡처한 경우에도 사유를 적지 말고, 해당 화면의 용도·기능을 정상 기준으로 담담히 기술한다(필요하면 그 화면 섹션을 생략).
   - **작성 기준 라인**: 제목·개요 바로 아래에 `> 작성 기준: <오늘 날짜> · 기준 커밋 <git rev-parse --short HEAD>` 형태의 인용줄을 둔다(예: `> 작성 기준: 2026-06-02 · 기준 커밋 0e361bd9`). 읽는 사람이 "이 문서가 언제·어느 코드 기준인지" 알 수 있게 하며, 6번에서 기록하는 `.manual-meta.json`의 값과 동일해야 한다(같은 실행의 HEAD/날짜).
   - **앱 제목은 기술 ID(appId)가 아니라 화면에 보이는 라벨(`appName`)을 작은따옴표로 감싸 쓴다**(예: `# 'ForCus AI' 사용자 매뉴얼`, `# '설정' 사용자 매뉴얼`). 라벨은 해당 앱 화면의 breadcrumb "Home" 바로 옆 텍스트(`useCurrentRemote().appName`, 내비게이션 API 런타임값)에서 캡처 중 그대로 읽는다. **폴더명·이미지 경로·진행파일 키는 기술 ID(`{appId}`)를 그대로 유지**한다(라벨은 테넌트/환경마다 달라질 수 있으므로 식별자로 쓰지 않는다). 라벨을 읽지 못하면 appId를 임시 제목으로 쓰고 1줄 표기. 화면 섹션 구성: **제목(breadcrumb 화면명) → 스크린샷(상대경로 `images/...`) → 화면을 설명하는 자연스러운 문단 → (필요한 화면만) `사용 방법` 번호 절차 → (표가 필요한 화면만) `화면 항목` 표**. 「이 화면은 무엇인가 / 무엇을 할 수 있는가」 같은 정형화된 질문형 소제목은 쓰지 않는다(제품 설명서 톤). 작성 원칙은 레퍼런스 "5. 설명 작성 원칙". 같은 앱을 재생성할 때는 그 앱 md를 처음부터 새로 쓴다(append로 중복 누적 금지).
5. **진행 갱신**: `.manual-progress.json`에 완료 `fullUrl` 기록.

### 5. 최종 인덱스 작성 (remote md 모으기)
- `{outputDir}/README.md`를 **모든 remote 매뉴얼을 모으는 최종 목차**로 작성/갱신한다(🏠 전체 매뉴얼 목차). 구성: 각 앱 매뉴얼 링크(`{appId}/README.md`) + 한 줄 요약 표. 실제 본문·스크린샷은 인덱스에 넣지 않고 각 앱 md만 가리킨다.
- **인덱스 표의 앱 이름 칸도 기술 ID가 아니라 화면 라벨(`appName`)을 작은따옴표로 감싸 표기**한다(예: `'설정'`, `'ForCus AI'`). 링크 경로(`{appId}/README.md`)·표 정렬 키는 `{appId}`를 그대로 쓴다. 라벨은 각 앱 md 제목에서 재사용(같은 값).
- **모으기 규칙(머지)**: 인덱스는 이번에 생성한 앱만이 아니라 `{outputDir}` 아래 `{appId}/README.md`가 **실제로 존재하는 모든 앱**을 행으로 포함한다(이전 실행으로 만든 다른 앱 매뉴얼 보존). 따라서 일부 remote만 지정해 돌려도 최종 인덱스에는 기존 + 신규가 함께 모인다. 표 순서는 `extract-routes.mjs --list-apps`가 주는 순서(serve 포트 오름차순)를 따르고, md가 없는 앱은 행에서 제외.

### 6. 갱신 기준 메타 기록 (staleness 베이스라인)
- 이번에 생성/갱신한 앱들에 대해 `node .claude/skills/generate-manual/scripts/manual-staleness.mjs --write-meta <생성한 appId...>`를 실행한다. 현재 HEAD 커밋·오늘 날짜를 `{outputDir}/.manual-meta.json`에 앱별로 스탬프한다(미지정 앱의 기존 기준은 보존·병합).
- 이 값은 4번에서 각 README 상단에 적은 **작성 기준 라인**과 동일해야 한다(같은 실행의 HEAD/날짜).
- 메타는 경량(앱당 수백 바이트)이므로 매뉴얼 산출물과 **함께 커밋**한다(gitignore 하지 않음). 이래야 다른 시점·다른 사람이 "이 문서가 그 커밋 이후로 오래됐는지"를 점검할 수 있다.

### 7. 정리
1. 1번에서 띄운 dev 서버(백그라운드)를 종료한다.
2. **포트가 실제로 해제됐는지 검증**한다(`netstat`로 4200 등 LISTEN 해제 확인). 종료 메시지만 믿지 말 것.
3. 백엔드는 사용자 소유이므로 종료하지 않는다.
4. `_routes.json`(임시 매니페스트)은 남겨도 무방하나, 원하면 정리.

---

## 산출물 구조

```
{outputDir}/                      # 기본 doc/manuals
├── README.md                     # 최종 인덱스 — 모든 remote md를 링크·요약으로 모음
├── {appId}/                      # remote 1개당 1폴더
│   ├── README.md                 # 앱 매뉴얼 md 1개(독립 문서, 화면별 섹션)
│   └── images/<route-slug>__<state>.png
├── .manual-meta.json             # (커밋함) 앱별 작성 기준 커밋·날짜 — staleness 점검 베이스라인
└── .manual-progress.json         # (gitignore) 재개용 진행 상태
```

- remote별 매뉴얼: `{appId}/README.md` 1개씩 (본문 + `images/`).
- 최종 통합본: `{outputDir}/README.md` — 위 remote md들을 목차/링크로 모은 인덱스(본문 중복 없음).
- 갱신 기준: `{outputDir}/.manual-meta.json` — 앱별 `baseCommit`·`generatedAt`만 담은 경량 파일(매뉴얼과 함께 커밋).

스크린샷 파일명·상태 접미사 규칙은 `reference/login-and-capture.md` "4. 스크린샷 저장 규칙" 참조.

## 갱신 점검(staleness)

매뉴얼은 한 번 만들고 끝이 아니라, 소스가 바뀌면 어느 화면 설명이 낡았는지 추적할 수 있어야 한다. `manual-staleness.mjs`가 이를 자동화한다.

**원리**: 각 화면(`componentFile`)이 직접/간접으로 import 하는 repo 내부 소스(`apps/`·`libs/`)를 `extract-routes.mjs --with-deps`가 의존성 클로저(`backingFiles`)로 산출한다. 6번에서 기록한 기준 커밋 이후 변경된 파일(커밋 + 워킹트리)과 이 집합을 교집합해, 변경이 닿은 화면을 가려낸다.

**판정**:
- 변경 파일이 그 화면의 `apps/` 소스면 → **갱신 필요**(강한 신호: 화면 코드 직접 변경).
- `libs/` 공유 소스만 걸리면 → **검토 권장**(약한 신호: 공유 요소 변경, 화면 영향은 사람이 확인). 공유 라이브러리 변경은 수십 개 화면을 동시에 건드릴 수 있으므로 강한 신호와 분리한다.
- 둘 다 없으면 → **최신**.

> 코드 변경이 곧 화면 변경은 아니다(리팩터링 등). 이 도구는 "다시 봐야 할 후보"를 좁혀줄 뿐, 재캡처·재작성 여부의 최종 판단은 사람이 한다.

**사용**:
```bash
# 점검: 메타에 기록된 모든 앱(또는 특정 앱)
node .claude/skills/generate-manual/scripts/manual-staleness.mjs            # 전체
node .claude/skills/generate-manual/scripts/manual-staleness.mjs fca        # fca 만
node .claude/skills/generate-manual/scripts/manual-staleness.mjs --json     # 기계 판독용 JSON

# 가정(what-if): 특정 파일들을 바꾸면 어떤 화면이 영향받는지(계획용)
node .claude/skills/generate-manual/scripts/manual-staleness.mjs --changed apps/fca/.../BotList.tsx fca
```

**갱신 워크플로우**:
1. `manual-staleness.mjs <app>`로 "갱신 필요" 화면 목록을 구한다.
2. `generate-manual <app>`을 다시 돌리되, 4번 캡처 루프에서 **그 목록의 `fullUrl`만** (재)캡처·재작성한다. 나머지 최신 화면은 건너뛴다(절차 3의 "통합 규칙": progress에 완료로 적혀 있어도 staleness가 "갱신 필요"면 다시 작성 — git 변경이 skip을 무효화).
3. 갱신한 화면의 README 섹션과 **작성 기준 라인**을 현재 날짜·커밋으로 고친다.
4. 6번(`--write-meta <app>`)을 다시 실행해 `.manual-meta.json`의 기준 커밋을 현재로 갱신한다(다음 점검의 새 베이스라인).

> "검토 권장"(공유 요소만 변경)은 자동 재작성 대상이 아니다. 사람이 해당 화면을 열어 실제로 바뀌었는지 확인한 뒤, 바뀌었으면 위 1~4를 똑같이 적용한다.

## 알려진 한계 (스킬 내부용 — 매뉴얼 본문에는 쓰지 않는다)

아래는 캡처 범위에 대한 **제작 측 제약**이다. 작업자(스킬)가 인지하고 작업 결과를 가늠하는 용도이며, **고객용 매뉴얼 본문·서두·인덱스 어디에도 적지 않는다**(제품 설명서에 면책·제작 고지를 넣지 않음).

- **variants / queryString 분기 화면**: 런타임 메뉴(DB `componentKey`) 의존이라 정적 열거 불가 → 로그인 계정에 노출되는 기본 화면만 캡처된다.
- **메뉴 권한 종속**: 캡처 가능 화면은 로그인 계정 권한에 따른다. 누락을 줄이려면 최고권한 계정으로 실행 권장.
- **동적 데이터 의존 상세**: 목록에 데이터가 없으면 상세/탭 캡처는 생략한다(매뉴얼에 "데이터 없음" 같은 사유를 적지 말고, 해당 화면 섹션 자체를 생략하거나 빈 화면 그대로 기능만 기술).

## 빠른 검증(스모크)
- 먼저 `generate-manual taskboard`(라우트 6개)로 1개 앱만 돌려 `doc/manuals/taskboard/README.md`와 `doc/manuals/README.md`(인덱스에 taskboard 행 추가)가 정상 생성되는지(스크린샷 실물·설명 톤·인덱스 링크) 확인한 뒤, 필요한 remote만 추가로 지정해(예: `generate-manual fca ipron`) 돌리거나 전체를 돌린다. 일부만 돌려도 인덱스에는 기존 앱이 보존된 채 새 앱이 합쳐지는지 확인.
