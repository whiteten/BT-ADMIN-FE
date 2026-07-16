# BT Admin FE

Bridgetec 관리자 프론트엔드 — turborepo(pnpm workspace) + Rsbuild 기반의 마이크로 프론트엔드 애플리케이션입니다.
Module Federation으로 Host 셸 위에 여러 Remote 앱을 통합합니다.

## 빠른 시작

```bash
pnpm install      # 의존성 설치 (npm·yarn 사용 금지, pnpm 전용)
pnpm run serve    # 개발 서버 시작 (대화형 앱 선택)
pnpm run build    # 프로덕션 빌드
```

> 처음이라면 [doc/DEVELOPER_GUIDE.md](doc/DEVELOPER_GUIDE.md)의 "환경 설정"부터 읽으세요.
>
> 백엔드 proxy는 `apps/host/proxy.config.local.json`을 만들어 개인 서버를 지정합니다 (커밋 금지 — 상세는 가이드 참조).

## 필수 환경

| 항목        | 버전     |
| ----------- | -------- |
| **Node.js** | v22.17.0 |
| **pnpm**    | 10.29.2  |

> 나머지 도구(turbo, TypeScript, Rsbuild 등)는 `package.json`에 버전이 명시되어 있으며 `pnpm install` 시 자동 설치됩니다.

## 프로젝트 구조

```
bt-admin-fe/
├── apps/
│   ├── host/         # Host 앱 (셸·인증·레이아웃)  port:4200
│   ├── manager/      # Remote  port:4201
│   ├── fca/          # Remote  port:4202
│   ├── ipron/        # Remote  port:4203
│   ├── aoe/          # Remote  port:4204
│   ├── stt/          # Remote  port:4205
│   ├── ivr/          # Remote  port:4206
│   └── insight/      # Remote  port:4207
├── libs/
│   ├── shared-ui/    # 공통 UI 컴포넌트 (shadcn/ui, 커스텀)
│   ├── shared-api/   # 공통 API (역할, 네비게이션, 즐겨찾기)
│   ├── shared-store/ # 전역 상태 관리 (Zustand)
│   └── shared-util/  # 유틸리티 (API 클라이언트, 로깅, 토스트)
└── scripts/          # 빌드·서빙·Remote 생성 스크립트
```

> `apps/fca`가 폴더 구조의 **레퍼런스 구현**입니다. 신규 Remote는 반드시 `pnpm gen remote`로 생성하세요.

## 주요 명령어

| 명령어                   | 설명                                            |
| ------------------------ | ----------------------------------------------- |
| `pnpm serve`             | 개발 서버 시작 (대화형 앱 선택)                  |
| `pnpm build`             | 프로덕션 빌드 (turbo, 캐시 활용)                 |
| `pnpm build:deploy`      | 빌드 + 배포 트리 조립 (dist/deploy + remotes/)   |
| `pnpm serve:prod`        | 배포 트리(dist/deploy) 서빙 (:4200)              |
| `pnpm gen remote`        | 새 Remote 앱 생성 (MF 설정·host 등록 자동 구성)  |
| `pnpm run shadcn:add`    | shared-ui에 shadcn/ui 컴포넌트 추가              |
| `pnpm commit`            | Commitizen 대화형 커밋                           |

린트는 `pnpm lint`(전량 eslint), 타입 검사는 `pnpm check-types`(전 앱 tsc), 테스트는 `pnpm test`(Vitest)로 실행합니다.

## 기술 스택

React 19 · TypeScript 5.8 · turborepo · Rsbuild 2 (rspack, Module Federation) ·
Tailwind CSS v4 · shadcn/ui · Ant Design v6 · AG-Grid Enterprise ·
TanStack Query · Zustand · React Hook Form + Zod · React Router DOM 6

> 빌드 체계 전환(Nx+Webpack → turborepo+Rsbuild) 배경·과정·성능 비교는
> [doc/plans/platform/turborepo-rsbuild-migration/](doc/plans/platform/turborepo-rsbuild-migration/INDEX.md) 참조.

## Claude Code 기반 개발

이 프로젝트는 [Claude Code](https://claude.com/claude-code)를 활용한 AI 협업 개발을 전제로 구성되어 있습니다.
저장소 안에 에이전트가 따라야 할 규약과 반복 작업 자동화가 함께 들어 있습니다.

| 위치                  | 역할                                                              |
| --------------------- | ----------------------------------------------------------------- |
| `CLAUDE.md`           | 에이전트가 따라야 할 프로젝트 규약·아키텍처·코딩 컨벤션 지침       |
| `.claude/skills/`     | 반복 작업용 스킬 — `add-api`, `add-drawer`, `add-form`, `add-grid`, `add-store`, `commit` |
| `.claude/commands/`   | 슬래시 커맨드 — `/update-remote` (remote 앱 구조 점검·정규화)      |

> 새 API 계층, Drawer, 폼, 그리드, 스토어를 추가하거나 커밋 메시지를 작성할 때는 해당 스킬의 패턴을 따릅니다.
> 코딩 규약 자체는 `CLAUDE.md`와 [doc/DEVELOPER_GUIDE.md](doc/DEVELOPER_GUIDE.md)가 단일 출처입니다.

## 문서 안내

이 README는 프로젝트 개요와 실행 방법만 담습니다. 깊은 내용은 아래 문서를 참조하세요.

- **[doc/DEVELOPER_GUIDE.md](doc/DEVELOPER_GUIDE.md)** — 개발자 온보딩. 코딩 규약·패턴·아키텍처 상세 가이드
- **[CLAUDE.md](CLAUDE.md)** — Claude Code 작업 지침 (위 "Claude Code 기반 개발" 참조)
