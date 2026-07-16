import * as fs from 'fs';
import * as path from 'path';
import type { PlopTypes } from '@turbo/gen';

/**
 * MF remote 앱 생성기 — 원본 BT-ADMIN-FE `pnpm create-remote` 상당.
 *
 * 실행: `pnpm gen remote` (대화형) 또는 `pnpm gen remote --args <name> <port>` (비대화형)
 *
 * 하는 일:
 *  1. apps/<name>/ 표준 골격 생성 (rsbuild 팩토리 호출 + MF 노출 4종 + routes 골격)
 *  2. 등록 지점 6곳 자동 패치:
 *     - tools/mf/app-ports.ts       APP_PORTS · REMOTE_NAMES
 *     - scripts/serve-host.js       REMOTE_APPS (대화형 serve 메뉴)
 *     - apps/host/.../useRemoteRoutesLoader.ts          ROUTE_LOADERS
 *     - apps/host/.../usePageVariantManifestLoader.ts   VARIANT_LOADERS
 *     - apps/host/.../useQuerySelectorsLoader.ts        SELECTOR_LOADERS
 *     - apps/host/src/remotes.d.ts  와일드카드 모듈 선언
 *  3. favicon.ico 복사 (manager 것 재사용)
 *
 * 생성 후 `pnpm install` 1회 필요 (워크스페이스 링크·devDeps 설치).
 */

const APP_PORTS_PATH = 'tools/mf/app-ports.ts';

/**
 * 저장소 루트 해석.
 * 대화형에서는 turbo가 answers에 turbo.paths.root를 주입하지만,
 * `--args` 비대화형 모드의 prompt validate 시점에는 주입 전이라 __dirname으로 폴백한다.
 */
function resolveRoot(answers?: unknown): string {
  const injected = (answers as { turbo?: { paths?: { root?: string } } } | undefined)?.turbo?.paths?.root;
  return injected ?? path.resolve(__dirname, '../..');
}

function readAppPorts(root: string): string {
  return fs.readFileSync(path.join(root, APP_PORTS_PATH), 'utf8');
}

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  // favicon은 바이너리라 add(텍스트 템플릿) 불가 — 커스텀 액션으로 복사
  plop.setActionType('copyFavicon', (answers) => {
    const { name } = answers as { name: string };
    const root = resolveRoot(answers);
    fs.copyFileSync(path.join(root, 'apps/manager/src/favicon.ico'), path.join(root, `apps/${name}/src/favicon.ico`));
    return `apps/${name}/src/favicon.ico 복사 완료`;
  });

  plop.setGenerator('remote', {
    description: 'MF remote 앱 생성 (골격 + host·serve·포트 등록 자동화)',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'remote 앱 이름 (소문자 시작, 소문자·숫자만):',
        validate: (input: string, answers) => {
          const root = resolveRoot(answers);
          if (!/^[a-z][a-z0-9]*$/.test(input)) return '소문자로 시작하고 소문자·숫자만 허용 (MF 모듈명·객체 키로 쓰임)';
          if (new RegExp(`^\\s{2}${input}:`, 'm').test(readAppPorts(root))) return `'${input}'은 APP_PORTS에 이미 존재함`;
          if (fs.existsSync(path.join(root, `apps/${input}`))) return `apps/${input} 폴더가 이미 존재함`;
          return true;
        },
      },
      {
        type: 'input',
        name: 'port',
        message: 'dev 서버 포트:',
        default: (answers: unknown) => {
          const ports = [...readAppPorts(resolveRoot(answers)).matchAll(/:\s*(\d{4}),/g)].map((m) => Number(m[1]));
          return String(Math.max(...ports) + 1);
        },
        validate: (input: string, answers) => {
          if (!/^\d{4,5}$/.test(input)) return '포트는 4~5자리 숫자';
          if (new RegExp(`:\\s*${input},`).test(readAppPorts(resolveRoot(answers)))) return `포트 ${input}은 이미 사용 중 (APP_PORTS 확인)`;
          return true;
        },
      },
    ],
    actions: [
      // ── 1. 앱 골격 ──────────────────────────────────────────────
      { type: 'add', path: '{{ turbo.paths.root }}/apps/{{name}}/package.json', templateFile: 'templates/remote/package.json.hbs' },
      { type: 'add', path: '{{ turbo.paths.root }}/apps/{{name}}/rsbuild.config.ts', templateFile: 'templates/remote/rsbuild.config.ts.hbs' },
      { type: 'add', path: '{{ turbo.paths.root }}/apps/{{name}}/module-federation.config.ts', templateFile: 'templates/remote/module-federation.config.ts.hbs' },
      { type: 'add', path: '{{ turbo.paths.root }}/apps/{{name}}/tsconfig.json', templateFile: 'templates/remote/tsconfig.json.hbs' },
      { type: 'add', path: '{{ turbo.paths.root }}/apps/{{name}}/tsconfig.app.json', templateFile: 'templates/remote/tsconfig.app.json.hbs' },
      { type: 'add', path: '{{ turbo.paths.root }}/apps/{{name}}/src/index.html', templateFile: 'templates/remote/src/index.html.hbs' },
      { type: 'add', path: '{{ turbo.paths.root }}/apps/{{name}}/src/main.ts', templateFile: 'templates/remote/src/main.ts.hbs' },
      { type: 'add', path: '{{ turbo.paths.root }}/apps/{{name}}/src/bootstrap.tsx', templateFile: 'templates/remote/src/bootstrap.tsx.hbs' },
      { type: 'add', path: '{{ turbo.paths.root }}/apps/{{name}}/src/remote-entry.ts', templateFile: 'templates/remote/src/remote-entry.ts.hbs' },
      { type: 'add', path: '{{ turbo.paths.root }}/apps/{{name}}/src/styles.css', templateFile: 'templates/remote/src/styles.css.hbs' },
      { type: 'add', path: '{{ turbo.paths.root }}/apps/{{name}}/src/app/app.tsx', templateFile: 'templates/remote/src/app/app.tsx.hbs' },
      { type: 'add', path: '{{ turbo.paths.root }}/apps/{{name}}/src/app/routes.tsx', templateFile: 'templates/remote/src/app/routes.tsx.hbs' },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/apps/{{name}}/src/app/features/router/pageVariantManifest.ts',
        templateFile: 'templates/remote/src/app/features/router/pageVariantManifest.ts.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/apps/{{name}}/src/app/features/router/querySelectors.ts',
        templateFile: 'templates/remote/src/app/features/router/querySelectors.ts.hbs',
      },
      { type: 'copyFavicon' },

      // ── 2. 포트 SoT 등록 (tools/mf/app-ports.ts) ─────────────────
      // APP_PORTS: 첫 번째 `\n};`(= APP_PORTS 닫힘) 직전에 항목 삽입
      {
        type: 'modify',
        path: '{{ turbo.paths.root }}/tools/mf/app-ports.ts',
        pattern: /\n\};/,
        template: '\n  {{name}}: {{port}},\n};',
      },
      // REMOTE_NAMES: 배열 끝에 추가 (host remotes 빌드 매핑 대상)
      {
        type: 'modify',
        path: '{{ turbo.paths.root }}/tools/mf/app-ports.ts',
        pattern: /\] as const;/,
        template: ", '{{name}}'] as const;",
      },

      // ── 3. serve 대화형 메뉴 등록 (scripts/serve-host.js) ─────────
      {
        type: 'modify',
        path: '{{ turbo.paths.root }}/scripts/serve-host.js',
        pattern: /const REMOTE_APPS = \[([^\]]*)\];/,
        template: "const REMOTE_APPS = [$1, '{{name}}'];",
      },

      // ── 4. host 로더 3종 등록 ────────────────────────────────────
      {
        type: 'modify',
        path: '{{ turbo.paths.root }}/apps/host/src/app/features/router/hooks/useRemoteRoutesLoader.ts',
        pattern: /(ROUTE_LOADERS: Record<string, \(\) => Promise<RoutesModule>> = \{[\s\S]*?)\n\};/,
        template: "$1\n  {{name}}: () => import('{{name}}/Routes') as unknown as Promise<RoutesModule>,\n};",
      },
      {
        type: 'modify',
        path: '{{ turbo.paths.root }}/apps/host/src/app/features/router/hooks/usePageVariantManifestLoader.ts',
        pattern: /(VARIANT_LOADERS: Record<string, \(\) => Promise<PageVariantManifestModule>> = \{[\s\S]*?)\n\};/,
        template: "$1\n  {{name}}: () => import('{{name}}/PageVariantManifest').catch(() => ({ pageVariantManifest: {} })) as Promise<PageVariantManifestModule>,\n};",
      },
      {
        type: 'modify',
        path: '{{ turbo.paths.root }}/apps/host/src/app/features/router/hooks/useQuerySelectorsLoader.ts',
        pattern: /(SELECTOR_LOADERS: Record<string, \(\) => Promise<SelectorsModule>> = \{[\s\S]*?)\n\};/,
        template: "$1\n  {{name}}: () => import('{{name}}/QuerySelectors').catch(() => ({ querySelectors: {} })) as Promise<SelectorsModule>,\n};",
      },

      // ── 5. remotes.d.ts 와일드카드 선언 추가 ─────────────────────
      {
        type: 'modify',
        path: '{{ turbo.paths.root }}/apps/host/src/remotes.d.ts',
        pattern: /\s*$/,
        template: "\ndeclare module '{{name}}/*' {\n  const Component: React.ComponentType;\n  export default Component;\n}\n",
      },

      (answers) =>
        [
          '',
          '다음 단계:',
          '  1. pnpm install            # 워크스페이스 링크·devDeps 설치',
          `  2. pnpm dev --filter=@bridgetec/ui-remote-${(answers as { name: string }).name}   # 단독 기동 확인`,
          '  3. pnpm serve              # host와 함께 기동 (메뉴에 자동 추가됨)',
          '',
          '⚠️ 메뉴 노출은 별도: 메뉴 관리(manager)에서 라우트 경로를 등록해야 화면에 뜬다.',
        ].join('\n'),
    ],
  });
}
