# BT Admin FE

> 작성일: 2025-02-25

Bridgetec 관리자 프론트엔드 — Nx 모노레포 기반의 마이크로 프론트엔드 애플리케이션입니다.

## 아키텍처

[Module Federation](https://module-federation.io/)을 사용하여 Host-Remote 구조로 구성되어 있습니다.

```
bt-admin-fe/
├── apps/
│   ├── host/         # Host 앱 (셸, 인증, 레이아웃)     :4200
│   ├── manager/      # Remote - 매니저 (사용자·권한 관리)  :4201
│   └── fca/          # Remote - Focus AI (봇·대시보드)    :4202
├── libs/
│   ├── shared-ui/    # 공통 UI 컴포넌트 (shadcn/ui, 커스텀)
│   ├── shared-api/   # 공통 API (역할, 네비게이션, 북마크)
│   ├── shared-store/ # 전역 상태 관리 (Zustand)
│   └── shared-util/  # 유틸리티 (API 클라이언트, 로깅, 토스트)
└── scripts/          # 빌드·서빙·Remote 생성 스크립트
```

## 필수 환경

| 항목        | 버전     |
| ----------- | -------- |
| **Node.js** | v22.17.0 |
| **pnpm**    | 10.29.2  |

## 시작하기

```bash
# 의존성 설치
pnpm install

# 개발 서버 시작 (Host + 모든 Remote)
pnpm run serve

# 프로덕션 빌드
pnpm run build
```

## 주요 명령어

| 명령어                  | 설명                                  |
| ----------------------- | ------------------------------------- |
| `pnpm run serve`        | 개발 서버 시작 (대화형 앱 선택)       |
| `pnpm run build`        | 프로덕션 빌드 (대화형 앱 선택)        |
| `pnpm run serve:prod`   | 프로덕션 빌드 결과물 서빙 (:4200)     |
| `pnpm run create-remote`| 새 Remote 앱 생성 (MF 설정 자동 구성) |
| `pnpm run shadcn:add`   | shared-ui에 shadcn/ui 컴포넌트 추가   |
| `pnpm commit`           | Commitizen 대화형 커밋                |
| `pnpm run graph`        | Nx 의존성 그래프 시각화               |

### Nx 직접 명령

```bash
# 특정 앱 서빙
npx nx serve <app-name>

# 린트
npx nx run-many --target=lint --all

# 타입 검사
npx nx run-many --target=typecheck --all

# 테스트
npx nx run-many --target=test --all
```

## 기술 스택

| 영역           | 기술                                          |
| -------------- | --------------------------------------------- |
| 프레임워크     | React 19, TypeScript 5.8                      |
| 빌드           | Webpack 5, @module-federation/enhanced        |
| 모노레포       | Nx 21                                         |
| 스타일링       | Tailwind CSS v4, shadcn/ui, Ant Design v6     |
| 데이터 테이블  | AG-Grid Enterprise                            |
| 서버 상태      | TanStack Query                                |
| 클라이언트 상태| Zustand                                       |
| 폼             | React Hook Form + Zod                         |
| 라우팅         | React Router DOM 6                            |
| 코드 품질      | ESLint 9, Prettier, Husky, lint-staged        |
| 커밋 관리      | Commitizen + cz-git, commitlint               |
| E2E 테스트     | Playwright                                    |

## 경로 별칭

`tsconfig.base.json`에 정의된 주요 별칭입니다.

| 별칭                      | 실제 경로                                  |
| ------------------------- | ------------------------------------------ |
| `@/components/ui/*`       | `libs/shared-ui/src/components/shadcn/*`   |
| `@/components/custom/*`   | `libs/shared-ui/src/components/custom/*`   |
| `@/lib/utils`             | `libs/shared-ui/src/lib/utils`             |
| `@/shared-util`           | `libs/shared-util/src/index.ts`            |
| `@/shared-api`            | `libs/shared-api/src/index.ts`             |
| `@/shared-store`          | `libs/shared-store/src/index.ts`           |
| `@/log`                   | `libs/shared-util/src/lib/log.ts`          |
