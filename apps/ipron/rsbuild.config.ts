import { createRemoteRsbuildConfig } from '../../tools/rsbuild/remote-config';
import mfConfig from './module-federation.config';
import packageJson from './package.json';

export default createRemoteRsbuildConfig(__dirname, packageJson, mfConfig);
