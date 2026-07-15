# 마이그레이션 계획서 (BT-ADMIN-FE → turborepo + Rsbuild + Module Federation)

- 작성일: 2026-07-15
- 대상 저장소: `E:\dev\bt-admin-fe` (https://github.com/leehojae91/bt-admin-fe.git, main)
- 원본 저장소: `E:\dev\bt-admin-workspace\BT-ADMIN-FE` (Nx 21 + Webpack 5 + MF, master)
- 이력 문서: [MIGRATION-LOG.md](MIGRATION-LOG.md) — 실행 명령어·함정·게이트 실측 기록의 SoT. 이 계획서는 "남은 일"의 SoT.
- 선행 참고: 원본 저장소 `poc/nx23-rspack2` 브랜치 `doc/plans/platform/rspack-migration/` (rspack 시도 계획·진행 로그 — 이월 자산 출처)

> **이 문서 하나만 읽고도 다른 세션에서 이어받을 수 있도록 작성됨.** 새 세션은 §0 → §1 → 진행할 단계 순으로 읽고, 작업 후 MIGRATION-LOG.md에 이력을 남기고 이 문서의 체크박스를 갱신한다.

---

## 0. 한눈 요약

**무엇을**: FE 모노레포를 Nx+Webpack에서 turborepo+Rsbuild로 재구축. MF(Module Federation)는 유지.
**왜**: dev 기동·빌드 속도 (실측 — prod 3앱 병렬 7.6초, dev host 0.5초대 / 원본 webpack은 앱당 수십 초).
**현재**: PoC(host+fca+custom) 완료, 핵심 게이트 전부 통과. 남은 것은 잔여 게이트 3건 → remote 9개 확장 → 주변 정비 → 전환 판정.

## 1. 진행 현황 (2026-07-15 기준)

**완료 (커밋·푸시됨)**:

- [x] turborepo 골격 (create-turbo 공식 생성 → 예제 제거·버전 정합) — `02d0067`·`ab0f0d4`
- [x] 기반 구성: 루트 deps 전량 이관(단일 버전 정책), ag-grid-enterprise 패치, `tools/mf/`(app-ports·shared-config), tailwind v4, tsconfig paths — `3d721cc`
- [x] libs 4종(shared-ui·api·store·util) 복사 + global.css `@source` 4단계 교정 — `fb2bf13`
- [x] host·fca·custom 이관 (rsbuild.config 3종, MF config 번들러 중립화) — `2518d7e`
- [x] prod 빌드 게이트: 3앱 병렬 7.6초·경고 0 — `2518d7e`
- [x] dev 프록시 수정(전 경로 504 해소) + proxy.config.local.json 규약 이관 — `af546cb`·`0d6dacc`
- [x] **React Compiler 적용** (세션 WS 무한 재연결 해소 — 이 코드베이스에선 정합성 필수) — `702dfab`
- [x] **react-refresh 브리지 이월** (remote HMR 화면 재렌더 — 순정 결함 확정 후 사용자 승인) — `87a1d8d`
- [x] 브라우저 게이트: 로그인·fca 실화면(rspack 2 백지 크래시 없음)·세션 WS 안정·remote HMR 2연속·antd 테마(#405189)

**핵심 결정 기록**:

| 결정 | 내용 | 근거 |
| --- | --- | --- |
| Rsbuild 2.x (rspack 2 기반) | 유지 | 백지 크래시는 Nx 조합 한정으로 판명 — 브라우저 게이트 통과 |
| React Compiler | babel 플러그인으로 필수 적용 | Compiler 메모이제이션에 의존하는 effect deps 존재 (미적용 시 세션 WS 루프) |
| react-refresh 브리지 | host main.ts dev 전용 | rspack/rsbuild 진영 공식 해법 부재 (Vite `reactRefreshHost`만 존재). Rsbuild에 동등 옵션 생기면 삭제 |
| shared 전략 | `loaded-first` + react·react-dom singleton + eager dayjs + excluded(clsx·tailwind-merge·echarts·codemirror) | 원본 정책 + rspack 브랜치 검증분 |
| 포트 SoT | `tools/mf/app-ports.ts` | project.json 소멸 대체. ⚠️ campaign·custom 4209 중복은 원본 그대로 |
| deps 배치 | 루트 package.json 전량(단일 버전 정책), 앱은 rsbuild 계열 devDeps만 | 원본 관례 유지 |

## 2. 잔여 게이트 (P1) — 확장 전 확인 ✅ 전부 통과 (2026-07-15, 게이트 4차)

- [x] **P1-1. custom 실기동 검증**: 통과 — `[useSiteCustomLoader] custom remote 등록 완료 + overrides 로드`,
  MF 런타임 인스턴스에 custom 컨테이너 실재(host·custom·fca), 프록시 경유 remoteEntry 200.
  ⚠️ 부작용 실증: campaign(4209)이 custom dev 서버에 붙어 REFUSED 9→8건 — 포트 중복이 실제로 관측됨(§6 리스크)
- [x] **P1-2. LAN 접속**: 통과 — `MF_REMOTE_HOST=192.168.115.31`로 3서버 기동, IP 접속에서 로그인·fca 화면
  로드(entry가 IP로 조립됨)·HMR 반영·antd 테마 정상. **수정 1건**: fca·custom 서버가 기본값에서 IPv6
  루프백([::1])만 리슨해 IP 접속 거부 → `server.host: '0.0.0.0'` 명시(host 앱은 이미 있었음)
- [x] **P1-3. IDE 원자적 저장 이중 컴파일**: **재현되나 무해로 강등** — Claude Edit 도구(임시파일+rename)
  저장 시 컴파일 2회 발생하지만 hot-swap·상태 보존 정상, 풀 리로드 없음.
  Nx 브랜치의 "404→풀 리로드" 증상은 rsbuild에선 발생 안 함. 추가 조치 불필요

## 3. remote 9개 확장 이관 (P2) ✅ 완료 (2026-07-15, 게이트 5~6차)

대상: manager(4201)·ipron(4203)·aoe(4204)·stt(4205)·ivr(4206)·insight(4207)·taskboard(4208)·campaign(4209)·vel(4210)

**표준 절차 (fca 템플릿 복제, 앱당 반복)**:

1. `cp -r BT-ADMIN-FE/apps/<app>/src bt-admin-fe/apps/<app>/`
2. `apps/<app>/package.json` — fca 것 복사, name은 원본 `@bridgetec/ui-remote-<app>`·version 유지
3. `apps/<app>/module-federation.config.ts` — 원본에서 name·exposes만 발췌해 번들러 중립 재작성
4. `apps/<app>/rsbuild.config.ts` — fca 복제, `APP_PORTS.<app>`·uniqueName만 교체
5. `apps/<app>/tsconfig.json`·`tsconfig.app.json` — fca 것 그대로 복사
6. 빌드 확인: `cd apps/<app> && pnpm build`

**앱별 편차 체크리스트** — 2026-07-15 이관 완료(게이트 5차):

- [x] manager: dev sourceMap 편차는 미이관(rsbuild 기본값 사용 — 문제 시 재검토)
- [x] insight: `ignoreWarnings`(sql-formatter sourcemap) 팩토리 옵션으로 이관
- [x] taskboard: master에 global.css 중복 import 없음(확인 완료)
- [x] campaign: 포트 4209 중복 유지 — **실제 관측됨**(custom 기동 시 campaign이 custom 서버에 연결). 동시 dev 필요 시 재배정
- [x] aoe `./AgentChatPanel` expose + lexical deps, vel wavesurfer.js deps 이관.
      taskboard·vel의 `@/components/ui/sidebar` additionalShared는 사용처 없음 판정(브랜치 8953c09d) 이월 제외

**검증 매트릭스 (P2 완료 판정)**:

- [x] 12앱 prod 빌드 에러·경고 0 — **콜드 병렬 47.3초** (참고: 원본 host+ipron dev 기동만 272초)
- [x] dev 조합 기동: host+manager+ipron+insight 4서버 4초, ipron 국선관리 화면 진입 확인
- [x] antd 테마 #405189 — fca·ipron 화면 확인 (3곳째는 잔여 스윕에서)
- [x] ag-grid 패치 해시 보존 (pnpm-lock `patch_hash` 실재 확인)
- [x] AG-Grid **데이터 있는** 화면 렌더 — manager 사용자 목록 20행 + Enterprise 워터마크
      요소는 존재하나 `display:none`(실표시 없음 = 패치 유효). insight 검색 아이템 13행도 확인
- [x] echarts — insight 대시보드 view(헬스보드): canvas 3·echarts 인스턴스 6 렌더, 에러 0.
      (stt 워드클라우드 화면은 미확인 — self-bundle 정책 자체는 렌더로 유효성 확인)
- [x] codemirror — insight 검색 아이템 편집기 `.cm-editor` 렌더·편집 가능,
      "Unrecognized extension value" 에러 0. (aoe 워크플로우 속성 패널은 미확인 — 동일 정책)
- [x] manager 화면 지정(picker) — 화면 렌더·콘솔 0. variant 카드 0건은 variant 보유
      remote(fca 등) 미기동 조건 탓(자연) — 카드 노출 확인은 fca 동시 기동 시 재확인
- 참고: 대시보드 view 진입 시 `/ws/proxy/insight/monitoring` WS 1회 실패 후 재연결
  (LIVE 지표 수신 정상 — 폭풍 아님, 무해 기록)
- [x] 브라우저 콘솔 크래시 0 — 단 ipron EndpointList "Maximum update depth" 에러는
      **원본(master) 실기동 대조로 원본 잠복 버그 판정**(이관 회귀 아님, 화면 동작엔 지장 없음).
      뿌리: `EndpointList.tsx:132` 구조분해 기본값 `= []` + :251 effect setState.
      → **원본 저장소 수정 제안 후속 항목**(P3-9)

추가 발견·교정: React Compiler 적용 범위를 jsx/tsx → 전 소스 ts/tsx(node_modules 제외)로 확장
+ `target: '19'` 이관 — 원본 .babelrc는 .ts 커스텀 훅까지 컴파일했음(동일 범위 복원).

## 4. 주변 정비 (P3)

- [x] **P3-1. serve 대화형 스크립트**: 완료(2026-07-15) — `scripts/serve-host.js`, turbo `--filter` 기반.
      원본 UX 전부 이식(메뉴·LAN 감지·SERVE_NO_OPEN·serve-host.local.json). `pnpm serve 2` 실검증
- [x] **P3-2. remote 생성기**: 완료(2026-07-15) — `pnpm gen remote`(turbo gen). 골격 14파일 +
      등록 지점 6곳(APP_PORTS·REMOTE_NAMES·serve 메뉴·host 로더 3종·remotes.d.ts) 자동 패치.
      gentest 앱으로 실검증(check-types·build·host 빌드 통과) 후 롤백. create-custom 상당은
      **보류 판정**: custom 앱은 단일 운반체로 이미 이관 완료, 고객사별 복제 생성은 P4 본선
      승격 후 실수요 발생 시 remote 생성기 확장으로 대응
- [x] **P3-3. typecheck**: 완료(2026-07-15) — 앱별 `check-types`(tsc 직접) + turbo, **12앱 전부
      통과(24.2초)**. 과정에서 tslib 누락·typescript 5.9 유출·@xyflow 드리프트 회귀 3건을
      원본 대조로 잡아 의존성 정합으로 해결(소스 무변경 — 상세 LOG 참조)
- [x] **P3-4. eslint·husky·commitlint**: 완료(2026-07-15) — 원본 flat config를 Nx 레이어만 제거하고
      루트 단일 `eslint.config.mjs`로 이관(실질 규칙 동일). husky 훅 3종(pre-commit lint-staged·
      commit-msg commitlint·post-rewrite 타입검사, origin/main 교정) + commitlint(이모지 타입·
      scope=apps 디렉토리 SoT) + cz-git + typecheck-staged.js 이관. **스캐폴드 packages/
      (eslint-config·typescript-config)는 미사용 확정(자기 참조뿐) — 삭제는 사용자 확인 대기**
- [x] **P3-5. 테스트**: 완료(2026-07-15) — **Vitest 전환**(사용자 결정: 원본 테스트 실질 0건).
      루트 vitest.config.ts(jsdom·네이티브 tsconfigPaths), smoke 4케이스 통과, `pnpm test`
- [x] **P3-6. prod 배포 산출물 구조**: 완료(2026-07-15) — `pnpm build:deploy`(scripts/build-deploy.js,
      원본 build-selective 상당·turbo 캐시 활용) → dist/deploy + remotes/<name>/ 조립,
      `pnpm serve:prod` 스모크 통과(index·remoteEntry×2·SPA fallback·config.js 전부 200)
- [x] **P3-7. basePath(root context) 게이트**: 완료(2026-07-15) — /bt-admin 하위 서빙 + base href
      치환으로 브라우저 실측: host 청크·API·remote entry 10개 전부 /bt-admin 접두 200,
      loadRemote('manager/Routes') 실로드 성공. runtime plugin 원본 c10756ae 규격 동작 확인
- [ ] **P3-8. 문서**: README 확충, AGENTS.md(신규 repo용 지침 — 원본과 차이점: 명령어·구조·스킬 인덱스 재작성) — 사용자 요청 시
- [ ] **P3-9. 원본 잠복 버그 수정 제안**: ipron `EndpointList.tsx` "Maximum update depth"
      (구조분해 기본값 `= []` + effect setState 루프 — 게이트 5차에서 원본 재현 확인).
      수정은 원본 저장소에서(신규 repo에서 고치면 소스 드리프트) — effect 제거하고 useMemo 파생 권장

## 5. 전환 판정 (P4)

### P4-1. 기능 동등성 체크리스트 (게이트 1~8차 실측 매핑)

| 항목 | 상태 | 근거(게이트) |
| --- | --- | --- |
| 로그인 | ✅ | 1차(실계정 로그인·메인 진입) |
| 로그아웃 | ✅ | 9차(사용자 메뉴→로그아웃→/login 복귀) |
| WS 세션 | ✅ | 1차(Compiler 적용 후 재연결 0 안정) |
| WS proxy | ✅ | 6차(insight 모니터링 LIVE 수신) |
| 대표 화면 — fca | ✅ | 1차(봇 목록 실데이터) |
| 대표 화면 — ipron | ✅ | 5차(국선관리·endpoint) |
| 대표 화면 — manager | ✅ | 6차(사용자 목록 AG-Grid 20행·화면 지정) |
| 대표 화면 — insight | ✅ | 6차(대시보드 echarts·검색 아이템 codemirror) |
| 대표 화면 — taskboard | ✅(공개 라우트로) | 8차(task-view-public 렌더) |
| 대표 화면 — aoe | ✅ | 9차(Agent 목록 실데이터 30건) — 최초 진입 1회 크래시는 아래 기록 참조 |
| 대표 화면 — ivr | ✅ | 9차(End Point 관리 — 국선 27건·멤버 그리드) |
| 대표 화면 — campaign | ✅ | 9차(dashboard→campaign-current 리다이렉트·위젯 렌더) |
| 대표 화면 — vel | ✅ | 9차(녹취 검색 20건 조회) |
| 대표 화면 — stt | ✅ | 9차(STT 검색 실데이터) |
| fca 대시보드(echarts·wordcloud self-bundle) | ✅ | 9차(canvas 4개·에러 0) |
| 탭 모델(keep-alive) | ✅ | 9차(STT 탭 입력값 → fca 탭 전환 → 복귀 시 보존 실측) |
| page variant manifest | ✅ | 7차(로드 로그) + 9차(picker에서 IPRON skill-assign 카드 2종 노출·선택 렌더) |
| query selector | ✅ | 7차(useQuerySelectorsLoader 로드) |
| custom 동적 등록·오버라이드 | ✅ | 4차(컨테이너 실로드·overrides 로그) |
| chromeless | ✅ | 8차(공개 라우트에서 크롬 요소 제거 강제 확인) |
| 공개 라우트 | ✅ | 8차(비로그인 /taskboard/board/task-view-public 진입·remote 렌더) |
| AG-Grid Enterprise 패치 | ✅ | 6차(워터마크 display:none) |
| antd 커스텀 테마 | ✅ | 3차(#405189 파편화 없음) |
| LAN(MF_REMOTE_HOST) | ✅ | 4차(IP 진입·HMR) |
| basePath(root context) | ✅ | 7차(전 자원 /bt-admin 접두) |
| 신규 발견(원본 대조 필요·낮은 위험) | 기록 | ① antd cssVar 경고(전 화면 공통 1회 — antd 계열 경고 원본 동일 전례) ② stt 검색 useForm 미연결 경고 ③ aoe 최초 진입 1회 `factory is undefined(@radix-ui/react-slot)`+HMR disposed — 리로드 후 정상·풀로드/SPA 재진입 모두 재현 실패(dev 전용 일시 현상 판정, 재발 시 조사) ④ campaign `/api/bff/campaign-option-campaign` 500 — BE 응답 오류(FE 요청 경로 정상) |

### P4-2. 속도 비교표 (2026-07-15 실측, 동일 머신)

| 항목 | 원본 (Nx 21+Webpack 5) | 신규 (turbo+Rsbuild 2) | 비고 |
| --- | --- | --- | --- |
| prod 콜드 빌드 11앱 | **269s** (`--parallel=6`, 캐시·Nx Cloud 스킵) | **46.1s** (turbo 병렬, 캐시 없음) | 약 5.8배. 원본 측정 중 신규 dev 서버 11개 idle 병존(간섭 미미 추정 — dev 272s 실측과 규모 일치) |
| prod 캐시 히트 12앱 | 54s (Nx Cloud 원격 캐시) | **0.07s** (FULL TURBO 로컬) | 원본은 원격 캐시 다운로드 비용 포함 |
| dev 기동 (host+ipron) | **272s** | 4s급(4서버 4s 실측) | 약 68배 |
| dev 기동 전체 11앱 | 미실측(272s 이상 추정) | **29.8s** (콜드, 병렬) | 원본은 전체 동시 기동 관행 없음(무거워서) |
| HMR remote 반영 | 동작(수치 미실측) | 즉시 반영·상태 보존(3차 2연속) | 브리지 이월 후 완전 동작 |
| dev 메모리 (host+ipron) | **4.85GB** (15개 프로세스 — webpack 2.2GB·fork-ts-checker 1.6GB·nx daemon 포함) | **0.91GB** (3개 — host 318MB·ipron 547MB·turbo 70MB) | 약 5.3배. WorkingSet 합산, 기동 후 idle 15초 |
| dev 메모리 (전체 11앱) | 미실측(비현실적 — 2앱에 4.85GB) | **6.19GB** (14개 — remote당 550~650MB·host 307MB) | 전체 동시 기동이 원본 2앱보다 +1.3GB 수준 |

### P4-3. 판정·후속

- [x] 잔여 실측: 완료(2026-07-15, 게이트 9차) — aoe·ivr·campaign·vel·stt 대표 화면, 로그아웃,
      탭 모델(상태 보존), picker variant 카드 전부 통과. **P4-1 체크리스트 전 항목 ✅**
- [ ] 팀 합의: 신규 repo를 본선으로 승격할지, 원본 repo에 역이식할지 결정
- [ ] 승격 시 미이관 자산 처리 (아래 목록)

### P4-4. 승격 시 미이관 자산 목록 (원본 → 신규)

| 자산 | 내용 | 처리 방침(제안) |
| --- | --- | --- |
| `doc/` | DEVELOPER_GUIDE.md(164K)·CUSTOM_DEVELOPMENT_GUIDE.md·manuals/·plans/ | 이관 + nx/webpack 언급 부분 개정 |
| `.claude/skills/` 14종 + commands/ | add-api·add-form·add-grid 등 작업 스킬 | 이관 필수 — 명령어(nx 기반)·경로 재작성 |
| `AGENTS.md` (53.8K) | 작업 유형별 스킬 인덱스 포함 지침 | P3-8과 통합 재작성 |
| `Jenkinsfile` + `infra/` | Dockerfile·nginx.conf·k8s/ | 빌드 명령을 build:deploy로 교체해 이관 |
| `scripts/create-custom.js` | 고객사별 custom 생성 | 보류 판정 유지(P3-2) — 실수요 시 |
| `components.json` | shadcn 설정 | 이관(shadcn:add 스크립트와 세트) |
| `.github/`·`.editorconfig`·`.gitattributes`·`.npmrc`·`.env`·`.gitmojirc` | 저장소 부속 설정 | 선별 이관 |
| `ds-bundle/`·`.design-sync/` | claude.ai/design 동기화 자산 | 디자인 동기화 계속 쓰면 이관 |
| git 이력 | 원본 커밋 이력 | 신규는 fresh start — 원본 저장소 보존(아카이브)으로 이력 참조 |

## 6. 리스크·주의

| 리스크 | 대응 |
| --- | --- |
| react-refresh 브리지 = 생태계 결함 보정 | dev 전용·prod 무영향. Rsbuild `reactRefreshHost` 동등 옵션 등장 시 삭제 (업스트림 요청 검토 — 후속) |
| rspack 2 계열 MF+HMR 버그 리포트 존재 (web-infra-dev/rspack#9322·#11735) | 버전 업그레이드 시 HMR 게이트 재실행 습관화 |
| campaign·custom 포트 중복(4209) | 동시 기동 요구 발생 시 재배정 (원본과 합의 필요 — 양쪽 동일 이슈) |
| 원자적 저장 이중 컴파일 (P1-3) | 재현 시 watchOptions 튜닝 검토 — rspack 브랜치에서도 미해결이었음 |
| 원본 master 후속 커밋과의 소스 드리프트 | 확장 이관(P2) 직전 원본 최신화 후 복사. 전환 판정(P4)까지 원본이 본선 |

## 7. 롤백

- PoC 저장소는 원본과 완전 분리 — 실패 시 저장소 폐기로 종결, 원본 무손상.
- 단계별 커밋 유지 중 — 부분 롤백은 커밋 단위 revert.
