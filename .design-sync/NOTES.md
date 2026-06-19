# design-sync NOTES — BT Admin Design System

이 레포(`libs/shared-ui`)는 표준 디자인 시스템 패키지가 아니라 Nx 모노레포 내부 라이브러리다(자체 `package.json`/dist/build target 없음, Storybook 없음). 그래서 변환기 표준 경로(synth-entry)가 통하지 않아 **자체 선빌드(`.design-sync/build-dist.mjs`)로 스크래치 "publish 패키지"를 만들어 변환기에 `--entry`로 먹이는** 비표준 파이프라인을 쓴다.

## 재동기화 절차 (순서 중요)

```bash
# 1. 스테이징 스크립트 갱신 + fork 심링크(클론마다)
SKILL=<design-sync skill base>
cp -r "$SKILL"/package-build.mjs "$SKILL"/package-validate.mjs "$SKILL"/package-capture.mjs "$SKILL"/resync.mjs "$SKILL"/lib "$SKILL"/storybook .ds-sync/
(cd .ds-sync && npm i esbuild ts-morph @types/react @tailwindcss/cli@4 esbuild-plugin-svgr)   # 클론마다
ln -sfn ../.ds-sync/node_modules .design-sync/node_modules

# 2. .d.ts 트리 (props 품질) — 레포 tsc
node node_modules/typescript/bin/tsc -p libs/shared-ui/tsconfig.lib.json \
  --declaration --emitDeclarationOnly --outDir .design-sync/.cache/ds-dts --skipLibCheck

# 3. Tailwind v4 정적 CSS — shared-ui로 스코프 한정 (source(none) + @source)
#    .cache/tw-input.css 는 global.css 에서 @source 라인을 ../../libs/shared-ui/src 한정으로 치환한 것
./.ds-sync/node_modules/.bin/tailwindcss -i .design-sync/.cache/tw-input.css -o .design-sync/.cache/ds-styles.css

# 4. 스크래치 dist 패키지 빌드 (svgr + @별칭 + react external)
node .design-sync/build-dist.mjs --dts-dir .design-sync/.cache/ds-dts --css-file .design-sync/.cache/ds-styles.css
#    → component-src-map.json 도 출력됨. config 의 componentSrcMap 에 머지(그룹 교정용):
node -e "const fs=require('fs');const c=JSON.parse(fs.readFileSync('.design-sync/config.json','utf8'));c.componentSrcMap=require('./.design-sync/.cache/component-src-map.json');fs.writeFileSync('.design-sync/config.json',JSON.stringify(c,null,2)+'\n')"

# 5. 변환기 + 검증 (렌더검증은 playwright 미설치라 --no-render-check)
node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules ./node_modules --out ./ds-bundle
node .ds-sync/package-validate.mjs ./ds-bundle --no-render-check
```

## 핵심 결정 / 함정

- **`config.entry`** = `.design-sync/.cache/dist-pkg/index.mjs` (스크래치 패키지). PKG_DIR 은 여기서 walkup → `bt-shared-ui`.
- **svgr**: 변환기 내부 esbuild 는 `.svg` 를 dataurl 로만 처리해 Icons.tsx 의 `export { ReactComponent }` 에서 번들이 깨진다. 그래서 build-dist 가 자체 svgr 플러그인(@svgr/core, `exportType:'named', namedExport:'ReactComponent'`)으로 **선번들**한다. Icons·MenuIconPicker 정상 포함됨.
- **antd v6 = CSS-in-JS** (런타임 주입) → 별도 antd CSS 불필요.
- **305 컴포넌트**: shadcn 플랫 컴파운드(CardHeader, DialogContent 등)가 모두 top-level export 라 카운트가 큼. 전부 실제 import 가능 컴포넌트. componentSrcMap 으로 그룹(custom/shadcn) 교정.
- **props**: cva `VariantProps`(예: Button 의 variant/size)는 tsc `.d.ts` 평탄화로 일부 누락된다. 필요 시 `cfg.dtsPropsFor.<Name>` 로 손수 보강.
- **/tmp 경로 주의**: git-bash `/tmp` ≠ Windows. tsc/tailwind 산출물은 `.design-sync/.cache/` (Windows 경로)에 둘 것.

## antd 포함 (primary 토킷)

이 프로젝트 primary는 antd(앱 546파일·2531회 import). shared-ui엔 antd re-export가
없어 기본 추출엔 안 잡힘 → build-dist가 **실사용 빈도 상위 antd 39개를 명시 re-export**
(`export { X as AntX } from 'antd'`)로 번들에 합침. `Ant` 접두사(shadcn 이름 충돌 회피).

- **기본 on** (`--no-antd`로 끔). 목록은 `ANTD_COMPONENTS`(build-dist.mjs).
- **`export *`(antd 전체) 금지** — 5MB 초과. 명시 re-export라야 esbuild가 트리셰이킹.
- **용량 측정**: antd 49 전부 = _ds_bundle.js ~5.46MB(초과). 39개 = ~5.0MB(OK, 여유 ~227KB).
- **제외 10개**(저가치/중복/저빈도): Table(AG-Grid 표준과 중복)·Transfer·Tree·TreeSelect·
  AutoComplete·Pagination·Result·List·Splitter·FloatButton. 무거운 핵심은 rc-picker(DatePicker·
  TimePicker)와 Table. 더 넣으려면 5MB 한도 재측정 필수(서버측 제한, 못 늘림).
- **그룹**: antd는 src 없어 `src/antd/Ant<n>.tsx` 빈 스텁을 생성해 group='antd'로 묶음
  (스텁은 그룹·발견용, 번들 실체는 index.mjs의 진짜 antd). componentSrcMap에도 antd 포함.
- **props**: antd 자체 `.d.ts`(node_modules/antd)에서 ts-morph가 추출. 복잡 제네릭은 거칠 수 있음.
- antd 컴파운드(AntForm.Item·AntSelect.Option 등)는 카드 없지만 네임스페이스로 사용 가능.

## Known render warns

- `[RENDER_SKIPPED]` — playwright 미설치(사용자 선택). 매 동기화 예상되는 정상 경고.

## Re-sync risks (다음 실행이 주의할 것)

- **프리뷰 미작성**: 현재 305개 전부 **floor 카드**(이름+타입정의만). 단독 렌더 가능한 컴포넌트의 rich 프리뷰는 미작성 — 후속 작업. `.design-sync/previews/<Name>.tsx` 작성 후 재빌드·재업로드하면 점진 보강됨.
- **렌더 미검증**: playwright 미설치로 프리뷰 시각 검증이 기계적으로 안 됨. 품질 확인은 claude.ai/design 또는 `.review.html` 육안.
- **conventions.md**: `readmeHeader` 로 README 에 합쳐짐. shared-ui 의 토큰/클래스 변경 시 이름이 어긋날 수 있으니 재검증.
- **component-src-map.json**: build-dist 가 매번 재생성. config 머지 단계를 빠뜨리면 그룹이 전부 흐트러진다(서브컴포넌트가 정상 그룹 못 찾음).
