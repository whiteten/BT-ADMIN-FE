# Manager App

> 작성일: 2025-02-25

Module Federation **Remote** 애플리케이션입니다. 사용자 관리, 권한 관리 등 관리자 기능을 제공합니다.

- **패키지**: `@bridgetec/ui-remote-manager`
- **포트**: 4201

## 주요 기능

- 사용자 관리 (CRUD, 역할 할당)
- IAM 관리 (계정·권한 관리, 탭별 상세)
- 클라이언트 관리
- 메뉴 관리
- 계정 정책 관리
- BFF 플로우 관리
- 작업 이력 조회

## 구조

```
src/app/
├── features/
│   ├── account-policy/   # 계정 정책
│   ├── bff-flow/         # BFF 플로우 (api, components, hooks, types)
│   ├── client/           # 클라이언트 관리
│   ├── iam/              # IAM (api, components, hooks, tabs, types)
│   ├── menu/             # 메뉴 관리
│   ├── sidebar/          # 사이드바 메뉴 설정 (MenuConfig expose)
│   ├── user/             # 사용자 관리
│   ├── user-resource/    # 사용자 리소스
│   └── workHistory/      # 작업 이력
├── pages/
└── routes.tsx
```

## Module Federation 설정

```typescript
{
  name: 'manager',
  exposes: {
    './Module': './src/remote-entry.ts',
    './MenuConfig': './src/app/features/sidebar/menu-config.ts'
  }
}
```

Host 앱에서 `manager/Module`로 라우팅되며, `manager/MenuConfig`로 사이드바 메뉴를 등록합니다.

## 개발

```bash
# Host와 함께 시작 (권장)
pnpm run serve

# Manager만 단독 실행
npx nx serve manager
```
