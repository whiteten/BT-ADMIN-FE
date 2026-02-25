# Host App

> 작성일: 2025-02-25

Module Federation **Host** 애플리케이션입니다. Remote 앱(manager, fca)을 통합하고, 인증·레이아웃·라우팅을 담당합니다.

- **패키지**: `@bridgetec/ui-host`
- **포트**: 4200

## 역할

- 로그인 / 세션 관리
- 사이드바 내비게이션 및 메인 레이아웃
- Remote 앱 라우팅 통합
- CSRF Guard, Route Guard
- WebSocket 세션 이벤트 처리

## 구조

```
src/app/
├── features/
│   ├── auth/          # 로그인·인증 (API, hooks, types)
│   ├── common/        # 세션, 네비게이션, WebSocket
│   ├── layout/        # LNB, Header, Footer
│   ├── management/    # 역할 관리 쿼리
│   └── router/        # CsrfGuard, RouteGuard, SharedInfoProvider
├── pages/
│   └── Login.tsx
└── routes.tsx
```

## Module Federation 설정

```typescript
{
  name: 'host',
  remotes: ['manager', 'fca'],
  shared: createSharedConfig(),
  additionalShared: ['@/components/ui/sidebar', '@/shared-store']
}
```

## 개발

```bash
# Host + 모든 Remote 함께 시작
pnpm run serve

# Host만 단독 실행
npx nx serve host
```
