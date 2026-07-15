/**
 * MF remote entry URL에 basePath(root context)를 접두하는 런타임 플러그인.
 *
 * webpack.config.prod.ts의 remote entry는 루트 절대경로(`/remotes/<app>/remoteEntry.js`)로
 * 선언되는데, MF 런타임은 이를 base 태그가 아닌 origin 루트 기준으로 요청한다
 * (2026-07-15 스파이크 실측). 고객사가 앱을 root context(예: /bt-admin) 하위에 배포하면
 * 404가 되므로, 런타임 초기화 직전에 base 태그에서 파생한 basePath를 entry에 접두한다.
 *
 * ⚠️ 이 파일은 MF 가상 런타임 엔트리에 번들되어 앱 코드보다 먼저 실행된다.
 * '@/shared-util' 등 앱 모듈을 import하면 share scope 초기화 전에 로드되므로 금지 —
 * basePath 파생(getBasePath와 동일 규칙)을 인라인으로 유지한다.
 */
export default function basePathRuntimePlugin() {
  return {
    name: 'base-path-runtime-plugin',
    beforeInit<T extends { userOptions: { remotes?: Array<{ entry?: string }> } }>(args: T): T {
      const basePath = new URL(document.baseURI).pathname.replace(/\/+$/, '');
      if (basePath) {
        for (const remote of args.userOptions.remotes ?? []) {
          if (remote.entry?.startsWith('/')) {
            remote.entry = `${basePath}${remote.entry}`;
          }
        }
      }
      return args;
    },
  };
}
