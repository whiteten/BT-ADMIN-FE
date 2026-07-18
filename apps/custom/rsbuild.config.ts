import { createRemoteRsbuildConfig } from '../../tools/rsbuild/remote-config';
import mfConfig from './module-federation.config';
import packageJson from './package.json';

// consume-only: 공유 라이브러리를 소비만 하고 공급하지 않음(React 인스턴스 이중화 방지)
export default createRemoteRsbuildConfig(__dirname, packageJson, mfConfig, { consumeOnly: true });
