import * as fs from 'fs';
import * as path from 'path';
import type { ModuleFederationConfig } from '@nx/module-federation';
import { createSharedConfig } from '../../tools/webpack/webpack-shared-config';

const config: ModuleFederationConfig = {
  name: 'host',
  /*
   * 워크스페이스 내부 remote는 이름(문자열)만 적습니다. Nx가 각 앱의
   * project.json(serve.options.port)에서 포트를 읽어 주소를 해석합니다.
   *
   * ⚠️ 이 배열은 반드시 "인라인 배열 리터럴"로 유지할 것.
   * `nx g @nx/react:remote`(= pnpm run create-remote)가 새 remote를 이 배열에
   * 자동 추가하는데, Nx는 `remotes:` 값이 배열 리터럴일 때만 인식합니다.
   * 변수 참조·삼항식 등으로 바꾸면 자동 등록이 조용히 실패합니다.
   *
   * 외부(사내망 등) IP 접속용 주소 변환은 아래 applyRemoteHostOverride()가
   * 후처리로 담당하므로, 이 배열에 IP/포트를 직접 적을 필요는 없습니다.
   */
  remotes: ['manager', 'fca', 'ipron', 'aoe', 'stt', 'ivr', 'insight', 'taskboard'],
  shared: createSharedConfig(),
  additionalShared: [['@/shared-store', { singleton: true, strictVersion: true, requiredVersion: false }]],
};

/**
 * 외부(사내망 등) IP 접속용 remote 주소 변환.
 *
 * remote를 이름(문자열)만 두면 Nx가 `http://localhost:<port>`로 해석하는데,
 * 다른 PC에서 IP로 host에 접속하면 그 `localhost`는 "접속한 PC 자신"을 가리켜
 * remote 로딩이 실패합니다. `serve-host.js`가 LAN IP를 자동 감지해
 * `MF_REMOTE_HOST` 환경변수로 넘겨주면, 각 remote를
 * `[이름, http://<IP>:<port>]` 튜플로 변환합니다. 포트는 각 앱의
 * project.json(targets.serve.options.port)에서 읽으므로 하드코딩하지 않습니다.
 *
 * 환경변수가 없으면(일반 로컬 개발) 문자열 배열을 그대로 둡니다.
 */
const applyRemoteHostOverride = (mfConfig: ModuleFederationConfig): void => {
  const remoteHost = process.env.MF_REMOTE_HOST?.trim();
  if (!remoteHost) return;

  const readRemotePort = (app: string): number => {
    const projectJsonPath = path.resolve(__dirname, '..', app, 'project.json');
    const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
    const port = projectJson?.targets?.serve?.options?.port;
    if (!port) throw new Error(`[module-federation] ${app}/project.json 에서 serve 포트를 찾지 못했습니다.`);
    return port;
  };

  mfConfig.remotes = (mfConfig.remotes ?? []).map((remote) => {
    const name = typeof remote === 'string' ? remote : remote[0];
    return [name, `http://${remoteHost}:${readRemotePort(name)}`];
  });
};

applyRemoteHostOverride(config);

/**
 * Nx requires a default export of the config to allow correct resolution of the module federation graph.
 **/
export default config;
