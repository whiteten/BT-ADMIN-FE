# 현장 커스터마이징(custom remote) 개발 가이드

본사 표준 화면을 **원본 소스 수정 없이** 현장(고객사)별 커스텀 화면으로 교체하는 방법을 설명합니다.
이 프로젝트를 처음 보는 개발자가 현장 커스텀 화면 1개를 만들어 운영 반영하는 데 필요한 모든 절차를 담았습니다.

> 전체 프로젝트 구조·공통 코딩 컨벤션은 [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)와 [AGENTS.md](../AGENTS.md)를 먼저 참고하세요.

---

## 1. 개요

### 무엇을 할 수 있나

- 기존 remote 앱(fca 등)의 특정 화면을 현장 전용 컴포넌트로 **통째로 교체**할 수 있습니다.
- 교체는 운영자가 관리 화면에서 **명시적으로 지정했을 때만** 적용되며, 지정하지 않은 화면은 항상 본사 표준 화면이 렌더됩니다.
- 커스텀 코드는 `apps/custom` 한 곳에만 작성합니다. **본사 원본 소스(apps/fca 등)는 일절 수정하지 않습니다.**

### 정식 variant와는 다른 개념입니다

이 프로젝트에는 화면을 바꾸는 메커니즘이 두 가지 있습니다. 둘 다 같은 소켓(`DynamicElement`) 위에서 동작하고 같은 picker에서 지정하지만, **관리 주체와 코드의 소속이 다른 별개 개념**입니다.

| | 정식 variant (본사 관리) | 현장 커스텀 (이 문서의 주제) |
| --- | --- | --- |
| 관리 주체 | 본사 — git 추적, 정식 배포 | 현장 — 자체 형상관리 (본사 repo에 없음) |
| 코드 위치 | 원본 remote 내부 (`pages/.../variants/`) | `apps/custom/src/app/overrides/` |
| 배포 | 본사 정기 배포에 포함 | 현장이 `remotes/custom/`에 독립 배포 |
| picker 노출 경로 | remote의 `pageVariantManifest` 등록 | custom의 `site-manifest.ts` 등록 |
| componentKey | variant 키 (예: `compact`) | `site:<appId>/<path>` |
| 용도 | 여러 현장이 공통으로 쓸 공식 화면 변형 | 특정 현장 전용 화면 |

> 어떤 커스텀이 여러 현장에서 반복 요구되면, 본사가 정식 variant로 승격해 제품에 편입하는 것이 자연스러운 수순입니다. 정식 variant 작성 절차는 [AGENTS.md](../AGENTS.md)의 "화면 커스터마이징(Variants) 패턴"을, 두 메커니즘의 공존·승격 시 주의점은 이 문서 8장을 참조하세요.

### 핵심 아이디어

`apps/custom`은 라우트를 가진 일반 업무 remote가 아니라, **"오버라이드 컴포넌트 운반체"** 입니다.
이 때문에 "모든 remote"를 대상으로 하는 본사 도구·작업에서 custom은 **항상 제외 대상**입니다 — `/update-remote` 점검, `pnpm run build`(build-selective)·`pnpm serve`(serve-host) 목록, 매뉴얼 생성(generate-manual), routes.tsx 일괄 정규화 등. 빌드·실행은 5장의 전용 절차를 따릅니다.

- host의 빌드 설정(remotes 배열)에 등록되어 있지 않아 **빌드 타임에 host는 custom의 존재를 모릅니다.**
- host가 부팅할 때 고정 경로 `/remotes/custom/remoteEntry.js`를 HEAD 요청으로 확인하고,
  - **파일이 있으면** → Module Federation 런타임 API로 동적 등록 (현장 커스텀 활성)
  - **파일이 없으면(404)** → 아무 일도 일어나지 않음 (표준 동작)
- 따라서 현장은 **custom만 빌드해서 웹서버에 올리면** 되고, 내리면 즉시 표준으로 복귀합니다. 본사 정기 배포와 충돌하지 않습니다.

---

## 2. 동작 원리

### 전체 흐름

```
[부팅]
host ──HEAD──> /remotes/custom/remoteEntry.js
  ├─ 404        → 표준 동작 (커스텀 기능 전체 비활성)
  └─ 200        → registerRemotes()로 런타임 등록
                  ├─ SiteManifest 로드 → 오버라이드 목록을 store에 적재
                  │                      (manager '화면 지정' picker에 '커스텀' 카드로 노출)
                  └─ 컴포넌트 loader를 store에 주입

[운영자 적용]
manager > 시스템 > 플랫폼 > 화면 지정
  └─ 대상 path 선택 → '커스텀' 카드 선택 → 적용
     → DB에 componentKey 'site:<appId>/<path>' 저장

[사용자 진입]
사용자가 해당 화면 접속
  └─ DynamicElement(라우트 소켓)가 componentKey 판정
     ├─ 'site:' prefix  → custom remote에서 컴포넌트 런타임 로드  ← 현장 커스텀
     ├─ variant 키      → 본사 정식 variant 렌더
     └─ 미지정          → 표준 컴포넌트 렌더
```

로드 실패·미배포 등 모든 예외 상황에서 **표준 화면으로 fallback**하므로, 커스텀 때문에 화면이 죽는 일은 없습니다.

### 핵심 구성요소

| 구성요소 | 위치 | 역할 |
| --- | --- | --- |
| `DynamicElement` / `createPageVariantSocket` | [libs/shared-ui/src/components/custom/DynamicElement.tsx](../libs/shared-ui/src/components/custom/DynamicElement.tsx) | 라우트 element 자리에 끼우는 소켓. componentKey를 보고 표준/variant/커스텀 중 무엇을 렌더할지 판정 |
| 소켓 선언 (`pv(...)`) | 각 remote의 `routes.tsx` (예: [apps/fca/src/app/routes.tsx](../apps/fca/src/app/routes.tsx)) | 페이지별로 `pv('<화면 키>', Component)` 한 줄로 소켓 설치 |
| `useSiteCustomLoader` | [apps/host/src/app/features/router/hooks/useSiteCustomLoader.ts](../apps/host/src/app/features/router/hooks/useSiteCustomLoader.ts) | 부팅 시 custom remote 존재 확인·동적 등록·loader 주입 |
| `useSiteCustomStore` | [libs/shared-store/src/lib/useSiteCustomStore.ts](../libs/shared-store/src/lib/useSiteCustomStore.ts) | host가 주입한 loader와 오버라이드 목록을 보관하는 singleton 스토어 |
| `site-manifest.ts` | [apps/custom/src/app/site-manifest.ts](../apps/custom/src/app/site-manifest.ts) | 이 현장이 보유한 오버라이드 목록(SoT). picker 카드 메타 제공 |
| 화면 지정 picker | [apps/manager/src/app/pages/page-variant/PageVariantManagement.tsx](../apps/manager/src/app/pages/page-variant/PageVariantManagement.tsx) | 운영자가 path별로 표준/variant/커스텀을 지정하는 관리 화면 |
| dev 프록시 | [apps/host/proxy.config.js](../apps/host/proxy.config.js) | 개발 시 `/remotes/custom` 요청을 custom dev 서버(4209)로 우회 |

### 화면 키(path) — 모든 것을 연결하는 식별자

화면 1개는 `<appId>/<path>` 형태의 **논리 키**로 식별됩니다. 예: `fca/bot-config/bot/list`

이 키는 실제 URL이 아니라 식별자이며, 아래 네 곳에서 **반드시 같은 문자열**이어야 합니다:

| 위치 | 형태 | 예시 |
| --- | --- | --- |
| routes.tsx 소켓 선언 | `pv('<path>', ...)` (appId는 팩토리에 바인딩) | `pv('bot-config/bot/list', BotList)` |
| custom exposes 키 | `'./<appId>/<path>'` | `'./fca/bot-config/bot/list'` |
| site-manifest.ts 키 | `'<appId>/<path>'` | `'fca/bot-config/bot/list'` |
| DB componentKey (picker가 저장) | `'site:<appId>/<path>'` | `'site:fca/bot-config/bot/list'` |

> 키는 라우트 경로를 그대로 사용하며, 동적 세그먼트도 `:serviceId` 표기 그대로 포함합니다(예: `fca/bot-config/bot/:serviceId`).
> 키는 한번 정해지면 라우트가 리팩토링되어도 바뀌지 않는 불변 식별자이므로, 어떤 화면의 키가 무엇인지는
> 경로를 추측하지 말고 **대상 remote의 routes.tsx에서 `pv(` 선언을 찾아** 확인합니다.

---

## 3. 사전 준비

1. 필수 환경: **Node.js v22.17.0 / pnpm 10.29.2** ([AGENTS.md](../AGENTS.md) "필수 환경 요구사항" 참조)
2. 저장소 클론 후 `pnpm install`
3. 백엔드 API 서버 접속 가능 환경 (개발 프록시 설정은 DEVELOPER_GUIDE 참조)

---

## 4. 개발 절차 (step-by-step)

`fca`의 봇 목록 화면(`fca/bot-config/bot/list`)을 커스텀한다고 가정한 예시입니다.

### Step 1. 대상 화면의 키 확인

대상 remote의 `routes.tsx`에서 소켓 선언을 찾습니다.

```tsx
// apps/fca/src/app/routes.tsx
const pv = createPageVariantSocket('fca');
...
{ path: 'list', element: pv('bot-config/bot/list', BotList) },
```

→ 화면 키는 `fca/bot-config/bot/list`.

> 소켓(`pv`)이 설치되지 않은 화면은 커스텀할 수 없습니다. 이 경우 본사에 소켓 추가를 요청해야 합니다(9장 참조).

### Step 2. 오버라이드 사본 작성 — 미러 구조

`apps/custom/src/app/overrides/<appId>/` 아래에 **원본 remote의 `src/` 이하 디렉터리 구조를 그대로 미러링**해서 사본을 만듭니다.

```
원본:  apps/fca/src/app/pages/bot-config/BotList.tsx
사본:  apps/custom/src/app/overrides/fca/app/pages/bot-config/BotList.tsx
                                    └────── apps/fca/src/ 이하를 그대로 미러 ──────┘
```

미러 구조를 지키는 이유는 **원본 파일의 상대 경로 import를 수정 없이 그대로 쓰기 위해서**입니다.
페이지가 상대 경로로 import하는 feature 파일(컴포넌트·훅·api·타입)과 에셋도 같은 규칙으로 함께 복사합니다.

```
apps/custom/src/app/overrides/fca/
├── app/
│   ├── pages/bot-config/BotList.tsx                  ← 교체 대상 (여기를 수정)
│   └── features/bot-config/
│       ├── components/BotCard.tsx                    ← BotList가 상대 경로로 쓰는 의존성
│       ├── hooks/useBotQueries.ts
│       ├── api/botApi.ts
│       └── types/...
└── assets/images/icon/...                            ← 상대 경로로 참조하는 svg 등
```

- `@` 별칭 import(`@/shared-store`, `@/components/custom/...` 등)는 복사 없이 그대로 동작합니다.
- 복사가 끝나면 사본을 자유롭게 수정합니다. 사본 전체가 현장 소유 코드입니다.

### Step 3. exposes 등록

[apps/custom/module-federation.config.ts](../apps/custom/module-federation.config.ts)의 `exposes`에 화면 키를 등록합니다.

```ts
exposes: {
  './SiteManifest': './src/app/site-manifest.ts',          // 고정 — 건드리지 않음
  './fca/bot-config/bot/list': './src/app/overrides/fca/app/pages/bot-config/BotList.tsx',
},
```

### Step 4. site-manifest 등록

[apps/custom/src/app/site-manifest.ts](../apps/custom/src/app/site-manifest.ts)에 같은 키로 메타를 등록합니다.
여기에 등록해야 운영자 picker에 '커스텀' 카드가 노출됩니다.

```ts
export const siteOverrides: Record<string, SiteOverrideMeta> = {
  'fca/bot-config/bot/list': {
    label: '봇 목록 (커스텀)',
    description: '표준 봇 목록에 ○○ 기능을 추가한 커스텀 화면',
  },
};
```

> ⚠️ Step 3의 exposes 키(`./` prefix 있음)와 Step 4의 manifest 키(`./` 없음)는 항상 1:1로 함께 추가/제거합니다.

### Step 5. 로컬 실행·확인

터미널 2개로 실행합니다:

```bash
# 터미널 1 — host + 대상 remote (대화형 선택)
pnpm serve          # host, fca 선택

# 터미널 2 — custom remote (별도 실행, 포트 4209)
npx nx serve custom
```

- `pnpm serve`(serve-host.js)는 custom을 지원하지 않으므로 **custom은 반드시 별도 터미널**로 띄웁니다.
- host의 dev 프록시가 `/remotes/custom` 요청을 4209로 우회합니다. custom 서버를 안 띄우면 HEAD 체크가 실패해 표준으로 동작합니다(평소 개발에 영향 없음).
- exposes·site-manifest 변경은 custom dev 서버가 자동 리빌드하며, **host 브라우저 새로고침**으로 반영됩니다.

### Step 6. 화면 적용 (운영자 지정)

1. host 접속 → **manager > 시스템 > 플랫폼 > 화면 지정** 메뉴 진입
2. 좌측 목록에서 대상 path 선택 (커스텀이 배포된 path에는 보라색 `커스텀` 태그 표시)
3. 우측 카드 그리드에서 **'커스텀' 카드** 선택 → **적용**
4. 해당 화면으로 이동해 커스텀 화면이 렌더되는지 확인

표준으로 되돌리려면 같은 화면에서 **'표준'(기본) 카드** 선택 → 적용.

---

## 5. 빌드·배포

### 빌드

```bash
npx nx build custom
# 산출물: dist/apps/custom/
```

custom은 본사 빌드 스크립트(`pnpm run build` / build-selective.js)의 앱 목록에 포함되지 않습니다. **현장이 직접 위 명령으로 빌드합니다.**

### 배포 (도커 운영 환경 기준)

운영 환경에서 FE 정적 리소스는 **BFF 컨테이너가 서빙**합니다. host·기존 remote는 BFF jar 안에 내장되지만, **custom 번들은 jar에 넣지 않고 외부 마운트 디렉터리에 배치**합니다. BFF가 `/remotes/custom/**` 요청만 외부 디렉터리(`app.custom-remote-path`, 기본 `/app/svc-conf/remotes/custom`)에서 읽어 응답합니다.

설치 호스트(운영 서버)의 디렉터리 구조:

```
install_btadmin/
├── docker-compose.yml
└── services/bff/
    └── conf/                        ← 컨테이너 /app/svc-conf 로 read-only 마운트
        ├── config.js                ← 런타임 FE 설정 (기존)
        └── remotes/custom/          ← custom 번들 배치 위치 (dist/apps/custom/* 전체)
            ├── remoteEntry.js
            └── *.js ...
```

배포 절차:

1. 현장 개발 PC에서 빌드: `npx nx build custom` → `dist/apps/custom/`
2. 산출물 전체를 운영 서버의 `install_btadmin/services/bff/conf/remotes/custom/`에 복사
3. 끝 — **BFF 컨테이너 재기동 불필요**. 사용자 브라우저 새로고침 시 적용

운영 시나리오:

- **활성화**: 위 경로에 번들 배치 → HEAD 200 → host가 custom remote 동적 등록
- **갱신**: 같은 경로에 새 빌드 산출물 덮어쓰기 → 즉시 반영 (remoteEntry.js가 no-cache라 새로고침만으로 새 번들 로드)
- **비활성화(긴급 회수)**: `remotes/custom/` 폴더 삭제(또는 이름 변경) → HEAD 404 → 전 화면 표준 복귀. DB의 `site:` 지정값은 남아 있어도 무해(로더 미주입 시 표준 fallback)
- 본사가 BFF 이미지를 재배포해도 마운트 디렉터리는 호스트에 있으므로 커스텀은 유지됩니다

동작 메커니즘 (BFF):

- 마운트가 read-only(`:ro`)지만 호스트→컨테이너 방향 파일 변경은 실시간 반영됨 (BFF는 읽기만 하므로 충분)
- BFF는 매 요청마다 파일 존재를 확인 — 캐시·재기동 이슈 없음
- 미배포·파일 없음은 BFF가 404로 응답하므로 별도 웹서버 설정(SPA fallback 예외 등) 불필요
- 배치 경로를 바꿔야 하면 BFF 환경변수 `APP_CUSTOM_REMOTE_PATH`로 오버라이드

> 참고: BFF 없이 별도 웹서버(nginx 등)가 정적 리소스를 서빙하는 변형 구성이라면, host 정적 루트 기준 `remotes/custom/`에 업로드하되 `/remotes/` 하위 미존재 파일에 대해 SPA fallback(`index.html` 200)이 아닌 **404가 반환되는지** 반드시 확인하세요. 200이 반환되면 custom 미배포 상태를 감지하지 못합니다.

---

## 6. 제약사항·주의

### 공유 라이브러리는 "소비만" 가능 (consume-only)

custom은 모든 공유 라이브러리를 `import: false`(fallback 번들 없음)로 빌드합니다. 즉 react, antd, `@/shared-*` 등은 **host가 공급하는 인스턴스를 그대로 사용**합니다.

- 오버라이드 코드가 쓰는 공유 라이브러리는 **제품(host·기존 remote)에서도 사용 중인 것이어야** 합니다. 제품에 없는 공유 모듈을 쓰면 런타임 로드가 실패합니다.
- 라이브러리 버전을 현장에서 바꿀 수 없습니다.
- **`apps/custom/webpack.config.ts`의 consume-only 설정을 절대 제거하지 마세요.** 일반 remote처럼 공급자로 합류하면 React 인스턴스가 2개가 되어 앱 전체가 깨집니다(Invalid hook call). 상세한 이유는 해당 파일 주석 참조.

### 오버라이드 컴포넌트의 책임

- 오버라이드는 표준 컴포넌트와 **같은 라우트 자리에 끼워지므로** 같은 컨텍스트(useParams, 쿼리스트링 등)를 받습니다. 표준과 동일한 전제(API, 권한, breadcrumb 등록 등)를 지켜야 합니다.
- breadcrumb은 표준 페이지처럼 `useBreadcrumbStore`로 직접 등록합니다(AGENTS.md "페이지 Breadcrumb 패턴" 참조).
- 본사가 원본 화면·API를 변경하면 **사본 갱신 책임은 현장에 있습니다.** 업그레이드 시 원본 diff를 확인해 사본에 반영하세요.

### 형상관리(git)

- `apps/custom/src/app/overrides/`는 **gitignore 대상**입니다. 본사 저장소에는 올라가지 않으며, **현장이 자체적으로 형상관리**합니다.
- `module-federation.config.ts`(exposes)와 `site-manifest.ts`는 본사 저장소에 **빈 상태로 추적**됩니다. 현장에서 등록 항목을 채운 수정분은 로컬에 유지하고 본사로 push하지 않습니다.

### 커스텀이 불가능한 것

- 소켓(`pv`)이 설치되지 않은 화면 (본사에 소켓 추가 요청)
- 메뉴·레이아웃·로그인 등 host 영역
- 새 라우트(신규 화면) 추가 — 커스텀은 기존 화면의 "교체"만 지원

---

## 7. 트러블슈팅

| 증상 | 원인 / 확인 |
| --- | --- |
| picker에 '커스텀' 태그·카드가 안 보임 | custom 미기동(dev) 또는 미배포(운영), site-manifest 미등록. 브라우저 콘솔에서 `custom remote 등록 완료` 로그·`/remotes/custom/remoteEntry.js` 응답 코드 확인 |
| 커스텀을 적용했는데 표준 화면이 나옴 | exposes 키와 화면 키 불일치(`./` prefix 포함 여부 확인). 콘솔에 `custom remote에 '...'가 노출되어 있지 않아` 경고가 찍힘 |
| `Invalid hook call` / `useMemoCache` 에러 | consume-only 설정이 깨짐 — `apps/custom/webpack.config.ts` 변경 여부 확인 |
| 런타임 로드 실패 경고 후 표준 fallback | 오버라이드가 제품에 없는 공유 모듈을 사용. import 목록 점검 |
| dev에서 HEAD 체크가 계속 404 | custom dev 서버(4209) 미기동, 또는 `apps/host/proxy.config.js`의 `/remotes/custom` 프록시 설정 확인 |
| 운영에서 custom 내렸는데 계속 로드 시도 | 웹서버 SPA fallback이 `/remotes/` 경로에 200을 반환하는지 확인(5장 주의사항) |

---

## 8. 본사 개발자 참고

### 소켓(pv) 설치 — 커스텀 가능 화면 늘리기

remote의 `routes.tsx`에서 leaf 페이지 element를 `pv()`로 감싸면 그 화면이 커스텀 가능해집니다.

```tsx
import { createPageVariantSocket } from '@/components/custom/DynamicElement';

const pv = createPageVariantSocket('<appId>');   // 파일 상단에 한 번
const BotList = React.lazy(() => import('./pages/bot-config/BotList')); // 기존 lazy 선언 그대로

{ path: 'list', element: pv('bot-config/bot/list', BotList) },
```

- 소켓만 설치된 화면은 picker 목록에 **노출되지 않습니다**(카탈로그 오염 없음). 현장 custom이 해당 키를 노출했을 때만 목록에 합류합니다.
- 레이아웃 컴포넌트(Outlet 렌더)는 소켓 대상에서 제외합니다.
- 현재 적용 범위: **전 remote의 모든 leaf 페이지** (fca·manager·ipron·aoe·insight·ivr·stt·taskboard). 신규 페이지 추가 시에도 leaf는 `pv` 래핑이 기본입니다 — [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) "20. 라우팅(routes.tsx) 가이드" 참조

### 정식 variant와의 관계

본사가 관리하는 정식 화면 변형(variant)은 별개 메커니즘으로 공존합니다:

- 정식 variant가 생기면 `<Page>.variants.ts`로 승격해 `pageVariantManifest`에 등록하고, 해당 라우트만 `<DynamicElement variants={...} />`를 직접 사용 (AGENTS.md "화면 커스터마이징(Variants) 패턴" 참조)
- 승격 시 **path 키 문자열은 `pv()`에 쓰던 것과 동일하게 유지**해야 기존 지정·커스텀 연결이 끊어지지 않습니다
- picker에서는 정식 variant 카드와 '커스텀' 카드가 같은 그리드에 나란히 노출됩니다

---

## 9. 관련 파일 한눈에 보기

```
apps/custom/
├── module-federation.config.ts        # exposes 등록 (현장 수정)
├── webpack.config.ts                  # consume-only 설정 (수정 금지)
├── webpack.config.prod.ts
└── src/app/
    ├── site-manifest.ts               # 오버라이드 목록 SoT (현장 수정)
    ├── overrides/                     # 현장 산출물 (gitignore, 현장 자체 형상관리)
    ├── app.tsx / routes.tsx           # 단독 serve용 진입점 (수정 불필요)
    └── ...

apps/host/
├── proxy.config.js                                        # dev: /remotes/custom → 4209
└── src/app/features/router/
    ├── SharedInfoProvider.tsx                             # 부팅 시 loadSiteCustom 호출
    └── hooks/useSiteCustomLoader.ts                       # 동적 등록·loader 주입

libs/
├── shared-ui/src/components/custom/DynamicElement.tsx    # 소켓·판정 로직·pv 팩토리
└── shared-store/src/lib/useSiteCustomStore.ts            # loader·오버라이드 목록 store

apps/manager/src/app/pages/page-variant/PageVariantManagement.tsx   # 화면 지정 picker
```
