import type { ModuleFederationConfig } from '@nx/module-federation';
import { createSharedConfig } from './webpack-helpers';

const config: ModuleFederationConfig = {
  name: 'host',
  /**
   * To use a remote that does not exist in your current Nx Workspace
   * You can use the tuple-syntax to define your remote
   *
   * remotes: [['my-external-remote', 'https://nx-angular-remote.netlify.app']]
   *
   * You _may_ need to add a `remotes.d.ts` file to your `src/` folder declaring the external remote for tsc, with the
   * following content:
   *
   * declare module 'my-external-remote';
   *
   */
  /*
   * 워크스페이스 내부 remote는 이름(문자열)만 적으면 됩니다.
   * Nx가 각 앱의 project.json(serve.options.port)에서 포트를 자동으로 읽어
   * 주소를 해석하므로, 여기에 포트/주소를 따로 적을 필요가 없습니다.
   *
   * [외부 접속 시 임시 수정 방법]
   * remote를 다른 PC/서버에서 서빙하고 host만 로컬에서 띄울 때는
   * 해당 항목을 [이름, 주소] 튜플 형태로 바꿔주세요. 예시:
   *
   *   remotes: [
   *     ['manager', 'http://192.168.115.27:4201'],
   *     ['fca', 'http://192.168.115.27:4202'],
   *     ['ipron', 'http://192.168.115.27:4203'],
   *   ],
   *
   * 작업이 끝나면 다시 문자열 형태로 되돌립니다.
   */
  remotes: ['manager', 'fca', 'ipron', 'aoe'],
  shared: createSharedConfig(),
  additionalShared: [
    ['@/components/ui/sidebar', { singleton: true, strictVersion: true, requiredVersion: false }],
    ['@/shared-store', { singleton: true, strictVersion: true, requiredVersion: false }],
  ],
};

/**
 * Nx requires a default export of the config to allow correct resolution of the module federation graph.
 **/
export default config;
