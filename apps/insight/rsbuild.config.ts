import { createRemoteRsbuildConfig } from '../../tools/rsbuild/remote-config';
import mfConfig from './module-federation.config';
import packageJson from './package.json';

// sql-formatter@15.x: dist에 .ts 원본 없이 sourcemap만 포함 → 원본 못 찾는 경고 무시(원본 withIgnoreWarnings 이관)
export default createRemoteRsbuildConfig(__dirname, packageJson, mfConfig, {
  ignoreWarnings: [/Failed to parse source map.*sql-formatter/],
});
