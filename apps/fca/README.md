# FCA App (Focus AI)

> 작성일: 2025-02-25

Module Federation **Remote** 애플리케이션입니다. 챗봇 관리, 대시보드, 통계 등 Focus AI 관련 기능을 제공합니다.

- **패키지**: `@bridgetec/ui-remote-fca`
- **포트**: 4202

## 주요 기능

- 봇 설정 관리 (CRUD, 모델·인텐트·엔티티 관리)
- 대시보드 (차트, 실시간 모니터링)
- 글로벌 설정 (공통 설정 관리, 탭별 상세)
- 통계 조회

## 구조

```
src/app/
├── features/
│   ├── bot-config/    # 봇 설정 (api, components, hooks, tabs, types)
│   ├── dashboard/     # 대시보드 (api, components, constants, hooks, types, utils)
│   ├── global/        # 글로벌 설정 (api, components, hooks, tabs, types)
│   ├── router/        # 라우팅
│   ├── sidebar/       # 사이드바 메뉴 설정 (MenuConfig expose)
│   └── statistics/    # 통계 (api, hooks, types)
├── pages/
│   └── bot-config/
└── routes.tsx
```

## Module Federation 설정

```typescript
{
  name: 'fca',
  exposes: {
    './Module': './src/remote-entry.ts',
    './MenuConfig': './src/app/features/sidebar/menu-config.ts'
  }
}
```

Host 앱에서 `fca/Module`로 라우팅되며, `fca/MenuConfig`로 사이드바 메뉴를 등록합니다.

## 개발

```bash
# Host와 함께 시작 (권장)
pnpm run serve

# FCA만 단독 실행
npx nx serve fca
```
