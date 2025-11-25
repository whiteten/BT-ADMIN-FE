#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// 로깅 및 시간 측정 유틸리티
function createTimer() {
  const startTime = Date.now();
  return {
    elapsed() {
      return Date.now() - startTime;
    },
    formatElapsed() {
      const ms = this.elapsed();
      if (ms < 1000) return `${ms}ms`;
      return `${(ms / 1000).toFixed(2)}s`;
    },
  };
}

function logStart(appName, task) {
  console.log(`\n🔄 [${appName}] ${task} 시작`);
}

function logSuccess(appName, task, timer) {
  const timeStr = timer ? ` (${timer.formatElapsed()})` : '';
  console.log(`✅ [${appName}] ${task} 완료${timeStr}`);
}

function logInfo(appName, message) {
  console.log(`💬 [${appName}] ${message}`);
}

function logError(appName, task, error) {
  console.error(`❌ [${appName}] ${task} 실패${error ? ': ' + error.message : ''}`);
}

function logProgress(message) {
  console.log(`📝 ${message}`);
}

function logGlobal(message) {
  console.log(`🌐 ${message}`);
}

function isValidKebabCase(str) {
  // kebab-case 정규식: 소문자로 시작하고, 소문자/숫자/하이픈만 허용, 하이픈으로 끝나면 안됨
  const kebabCaseRegex = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
  return kebabCaseRegex.test(str);
}

function createRemote() {
  rl.question('앱 이름을 입력하세요 (kebab-case): ', (appName) => {
    if (!appName || appName.trim() === '') {
      console.error('❌ 앱 이름을 입력해야 합니다.');
      rl.close();
      return;
    }
    const trimmedAppName = appName.trim();

    // kebab-case 유효성 검사
    if (!isValidKebabCase(trimmedAppName)) {
      console.error('❌ 앱 이름은 kebab-case 형식이어야 합니다. (예: my-app, user-management)');
      console.error('   - 소문자만 사용');
      console.error('   - 단어 구분은 하이픈(-) 사용');
      console.error('   - 숫자 사용 가능');
      console.error('   - 특수문자나 대문자 사용 불가');
      rl.close();
      return;
    }
    try {
      const totalTimer = createTimer();
      logGlobal(`${trimmedAppName} remote 앱 생성 시작`);

      const command = `nx g @nx/react:remote apps/${trimmedAppName} --host=host --style=tailwind --e2eTestRunner=none --bundler=webpack`;
      logProgress(`실행 명령어: ${command}`);
      execSync(command, { stdio: 'inherit', cwd: process.cwd() });
      logSuccess('nx', 'remote 앱 생성');

      // tsconfig.base.json에서 경로 제거하여, 빌드 종속성 제거
      removeTsConfigPath(trimmedAppName);
      formatTsConfig();

      // Host의 App.tsx 롤백 및 React.lazy 구문 추가
      rollbackAndUpdateAppTsx(trimmedAppName);

      // 신규앱의 style.css 파일 내용 제거
      clearStyleCss(trimmedAppName);

      // 신규앱의 webpack-helpers.ts 파일을 core와 동일하게 복사
      copyWebpackHelpers(trimmedAppName);

      // 신규앱의 webpack.config.ts 파일을 core와 동일하게 변경
      updateWebpackConfig(trimmedAppName);

      // 신규앱의 module-federation.config.ts 파일을 core와 동일하게 변경
      updateModuleFederationConfig(trimmedAppName);

      // 신규앱의 menu-config.ts 파일을 core의 sample에서 복사
      createMenuConfig(trimmedAppName);

      // host의 menuLoaders.ts 업데이트
      updateMenuLoaders(trimmedAppName);

      // 신규앱의 package.json 파일 생성
      createPackageJson(trimmedAppName);

      // 신규앱의 project.json 파일 수정
      updateProjectJson(trimmedAppName);

      // 신규앱의 postcss.config.js 파일을 core와 동일하게 복사
      copyPostcssConfig(trimmedAppName);

      // 신규앱의 Main.tsx 파일을 core의 sample에서 복사
      copyMainTemplate(trimmedAppName);

      // 신규앱의 app.tsx 파일을 core의 sample에서 복사 및 주석 제거
      copyAppTemplate(trimmedAppName);

      // 신규앱의 nx-welcome.tsx 파일 삭제
      removeNxWelcome(trimmedAppName);

      // build-selective.js와 serve-host.js 업데이트
      updateBuildScripts(trimmedAppName);

      // 신규앱의 .babelrc 파일을 host와 동일하게 복사
      copyBabelrc(trimmedAppName);

      logGlobal(`${trimmedAppName} remote 앱 생성 완료 (총 소요시간: ${totalTimer.formatElapsed()})`);
    } catch (error) {
      logError('create-remote', `${trimmedAppName} remote 앱 생성`, error);
    } finally {
      rl.close();
    }
  });
}

function removeTsConfigPath(appName) {
  const timer = createTimer();
  logStart('tsconfig.base.json', 'Module 경로 제거');
  try {
    const tsconfigPath = path.join(process.cwd(), 'tsconfig.base.json');
    const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf8');
    const tsconfig = JSON.parse(tsconfigContent);

    // paths 객체에서 해당 앱의 Module 경로 제거
    const pathKey = `${appName}/Module`;
    if (tsconfig.compilerOptions && tsconfig.compilerOptions.paths && tsconfig.compilerOptions.paths[pathKey]) {
      delete tsconfig.compilerOptions.paths[pathKey];

      // 수정된 내용을 파일에 저장
      fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
      logSuccess('tsconfig.base.json', `${pathKey} 경로 제거`, timer);
      return true;
    } else {
      logInfo('tsconfig.base.json', `${pathKey} 경로가 없음 (이미 정리됨)`);
      return false;
    }
  } catch (error) {
    logError('tsconfig.base.json', 'Module 경로 제거', error);
    return false;
  }
}

function formatTsConfig() {
  const timer = createTimer();
  logStart('tsconfig.base.json', '포맷팅');
  try {
    execSync('npx prettier --write tsconfig.base.json', { stdio: 'inherit', cwd: process.cwd() });
    logSuccess('tsconfig.base.json', '포맷팅', timer);
  } catch (error) {
    logError('tsconfig.base.json', '포맷팅', error);
  }
}

function rollbackAndUpdateAppTsx(appName) {
  const timer = createTimer();
  logStart('host/app.tsx', 'Git 롤백 및 React.lazy 추가');
  try {
    // Git으로 App.tsx 변경사항 롤백
    execSync('git checkout -- apps/host/src/app/app.tsx', { stdio: 'inherit', cwd: process.cwd() });
    logProgress('App.tsx Git 롤백 완료');

    addReactLazyToApp(appName);
    logSuccess('host/app.tsx', 'Git 롤백 및 React.lazy 추가', timer);
  } catch (error) {
    logError('host/app.tsx', 'Git 롤백 및 React.lazy 추가', error);
  }
}

function addReactLazyToApp(appName) {
  const timer = createTimer();
  logStart('host/app.tsx', `${appName} React.lazy 및 Route 추가`);
  try {
    const appPath = path.join(process.cwd(), 'apps/host/src/app/app.tsx');
    const content = fs.readFileSync(appPath, 'utf8');
    const lines = content.split('\n');

    // const 변수명 = React.lazy로 시작하는 라인들 찾기
    const lazyLines = [];
    lines.forEach((line, index) => {
      if (line.trim().startsWith('const ') && line.includes('React.lazy')) {
        lazyLines.push(index);
      }
    });

    if (lazyLines.length === 0) {
      logError('host/app.tsx', '기존 React.lazy 구문을 찾을 수 없음');
      return;
    }

    // 마지막 React.lazy 라인 찾기
    const lastLazyLineIndex = lazyLines[lazyLines.length - 1];

    // 앱 이름을 PascalCase로 변환 (첫 글자 대문자)
    const componentName = appName.charAt(0).toUpperCase() + appName.slice(1);

    // 새로운 React.lazy 구문 생성
    const newLazyImport = `const ${componentName} = React.lazy(() => import('${appName}/Module').catch(() => ({ default: () => <NotFound /> })));`;

    // 마지막 React.lazy 라인 다음에 새 라인 추가
    lines.splice(lastLazyLineIndex + 1, 0, newLazyImport);

    // Route 패턴 찾아서 추가
    addRoutePattern(lines, appName, componentName);

    // 파일 저장
    const updatedContent = lines.join('\n');
    fs.writeFileSync(appPath, updatedContent);
    logProgress(`${componentName} React.lazy 및 Route 추가 완료`);

    // ESLint로 포맷팅
    execSync('npx eslint --fix apps/host/src/app/app.tsx', { stdio: 'inherit', cwd: process.cwd() });
    logSuccess('host/app.tsx', `${appName} React.lazy 및 Route 추가`, timer);
  } catch (error) {
    logError('host/app.tsx', `${appName} React.lazy 및 Route 추가`, error);
  }
}

function addRoutePattern(lines, appName, componentName) {
  // 기존 Route 패턴 찾기 (예: <Route path="/ipron" element={<Layout />}>)
  let lastRouteBlockEndIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Route 블록 패턴 찾기: path 속성과 Layout을 가진 Route
    if (line.includes('<Route path="/') && line.includes('element={<Layout />}>')) {
      // 해당 Route 블록의 끝 찾기 (다음 </Route>)
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() === '</Route>') {
          lastRouteBlockEndIndex = j;
          break;
        }
      }
    }
  }

  if (lastRouteBlockEndIndex === -1) {
    logError('host/app.tsx', '기존 Route 패턴을 찾을 수 없음');
    return;
  }

  // 새로운 Route 블록 생성
  const newRouteBlock = [`          <Route path="/${appName}" element={<Layout />}>`, `            <Route index path="*" element={<${componentName} />} />`, `          </Route>`];

  // 마지막 Route 블록 다음에 새 Route 블록 추가
  lines.splice(lastRouteBlockEndIndex + 1, 0, ...newRouteBlock);
  logProgress(`/${appName} Route 패턴 추가 완료`);
}

function clearStyleCss(appName) {
  const timer = createTimer();
  logStart(`${appName}/styles.css`, '내용 제거');
  try {
    const stylePath = path.join(process.cwd(), `apps/${appName}/src/styles.css`);

    // 파일이 존재하는지 확인
    if (fs.existsSync(stylePath)) {
      // 파일 내용을 빈 문자열로 덮어쓰기
      fs.writeFileSync(stylePath, '');
      logSuccess(`${appName}/styles.css`, '내용 제거', timer);
    } else {
      logInfo(`${appName}/styles.css`, '파일이 존재하지 않음 (스킵)');
    }
  } catch (error) {
    logError(`${appName}/styles.css`, '내용 제거', error);
  }
}

function copyWebpackHelpers(appName) {
  const timer = createTimer();
  logStart(`${appName}/webpack-helpers.ts`, 'core에서 복사 및 포맷팅');
  try {
    const coreHelpersPath = path.join(process.cwd(), 'apps/core/webpack-helpers.ts');
    const targetHelpersPath = path.join(process.cwd(), `apps/${appName}/webpack-helpers.ts`);

    // core의 webpack-helpers.ts 파일 읽기
    if (!fs.existsSync(coreHelpersPath)) {
      logError('core/webpack-helpers.ts', '소스 파일을 찾을 수 없음');
      return;
    }

    const coreHelpersContent = fs.readFileSync(coreHelpersPath, 'utf8');

    // 대상 앱에 webpack-helpers.ts 파일 생성/덮어쓰기
    fs.writeFileSync(targetHelpersPath, coreHelpersContent);
    logProgress(`${appName}/webpack-helpers.ts 복사 완료`);

    // ESLint로 포맷팅
    execSync(`npx eslint --fix apps/${appName}/webpack-helpers.ts`, { stdio: 'inherit', cwd: process.cwd() });
    logSuccess(`${appName}/webpack-helpers.ts`, 'core에서 복사 및 포맷팅', timer);
  } catch (error) {
    logError(`${appName}/webpack-helpers.ts`, 'core에서 복사 및 포맷팅', error);
  }
}

function updateWebpackConfig(appName) {
  const timer = createTimer();
  logStart(appName, 'webpack.config.ts 파일을 core와 동일하게 변경');
  try {
    const coreWebpackPath = path.join(process.cwd(), 'apps/core/webpack.config.ts');
    const targetWebpackPath = path.join(process.cwd(), `apps/${appName}/webpack.config.ts`);

    // core의 webpack.config.ts 파일 읽기
    if (!fs.existsSync(coreWebpackPath)) {
      logError('core', 'webpack.config.ts 파일을 찾을 수 없음');
      return;
    }

    const coreWebpackContent = fs.readFileSync(coreWebpackPath, 'utf8');

    // 대상 앱의 webpack.config.ts 파일이 존재하는지 확인
    if (!fs.existsSync(targetWebpackPath)) {
      logError(appName, 'webpack.config.ts 파일을 찾을 수 없음');
      return;
    }

    // core의 내용을 대상 앱에 복사
    fs.writeFileSync(targetWebpackPath, coreWebpackContent);
    logSuccess(appName, 'webpack.config.ts 파일을 core와 동일하게 변경', timer);
  } catch (error) {
    logError(appName, 'webpack.config.ts 파일 처리', error);
  }
}

function updateModuleFederationConfig(appName) {
  const timer = createTimer();
  logStart(appName, 'module-federation.config.ts 파일을 core와 동일하게 변경');
  try {
    const coreConfigPath = path.join(process.cwd(), 'apps/core/module-federation.config.ts');
    const targetConfigPath = path.join(process.cwd(), `apps/${appName}/module-federation.config.ts`);

    // core의 module-federation.config.ts 파일 읽기
    if (!fs.existsSync(coreConfigPath)) {
      logError('core', 'module-federation.config.ts 파일을 찾을 수 없음');
      return;
    }

    let coreConfigContent = fs.readFileSync(coreConfigPath, 'utf8');

    // 대상 앱의 module-federation.config.ts 파일이 존재하는지 확인
    if (!fs.existsSync(targetConfigPath)) {
      logError(appName, 'module-federation.config.ts 파일을 찾을 수 없음');
      return;
    }

    // name을 새 앱 이름으로 변경
    coreConfigContent = coreConfigContent.replace(/name: 'core'/, `name: '${appName}'`);

    // 대상 앱에 수정된 내용 저장
    fs.writeFileSync(targetConfigPath, coreConfigContent);
    logInfo(appName, `name 속성을 '${appName}'으로 변경`);
    logSuccess(appName, 'module-federation.config.ts 파일을 core와 동일하게 변경', timer);
  } catch (error) {
    logError(appName, 'module-federation.config.ts 파일 처리', error);
  }
}

function createMenuConfig(appName) {
  const timer = createTimer();
  logStart(appName, 'menu-config.ts 파일 생성');
  try {
    const menuConfigDefaultPath = path.join(process.cwd(), 'apps/core/src/app/features/sample/menu-config.ts');
    const targetMenuConfigDir = path.join(process.cwd(), `apps/${appName}/src/app/features/sidebar`);
    const targetMenuConfigPath = path.join(targetMenuConfigDir, 'menu-config.ts');

    // menu-config-default.ts 파일 읽기
    if (!fs.existsSync(menuConfigDefaultPath)) {
      logError('core', 'src/app/features/sample/menu-config.ts 파일을 찾을 수 없음');
      return;
    }

    let menuConfigContent = fs.readFileSync(menuConfigDefaultPath, 'utf8');

    // appName 변수값을 새 앱 이름으로 변경
    menuConfigContent = menuConfigContent.replace(/const appName = '';/, `const appName = '${appName}';`);

    // 디렉토리가 없으면 생성
    if (!fs.existsSync(targetMenuConfigDir)) {
      fs.mkdirSync(targetMenuConfigDir, { recursive: true });
      logProgress(`${appName}/src/app/features/sidebar 디렉토리 생성`);
    }

    // menu-config.ts 파일 생성
    fs.writeFileSync(targetMenuConfigPath, menuConfigContent);
    logInfo(appName, `appName 변수를 '${appName}'으로 설정`);
    logSuccess(appName, 'menu-config.ts 파일 생성', timer);
  } catch (error) {
    logError(appName, 'menu-config.ts 파일 처리', error);
  }
}

function updateMenuLoaders(appName) {
  const timer = createTimer();
  logStart('host', `useMenuLoader.ts에 ${appName} 메뉴 로더 추가`);
  try {
    const useMenuLoaderPath = path.join(process.cwd(), 'apps/host/src/app/features/layout/hooks/useMenuLoader.ts');

    // useMenuLoader.ts 파일이 존재하는지 확인
    if (!fs.existsSync(useMenuLoaderPath)) {
      logError('host', 'useMenuLoader.ts 파일을 찾을 수 없음');
      return;
    }

    const content = fs.readFileSync(useMenuLoaderPath, 'utf8');

    // MENU_LOADERS 객체 찾기
    const menuLoadersRegex = /const MENU_LOADERS: Record<string, \(\) => Promise<MenuModule>> = \{([\s\S]*?)\};/;
    const match = content.match(menuLoadersRegex);

    if (match) {
      const currentLoaders = match[1];

      // 이미 존재하는지 확인
      if (currentLoaders.includes(`${appName}:`)) {
        logInfo('host', `${appName} 로더가 이미 존재함 (스킵)`);
        return;
      }

      // 새 로더 추가 (마지막 항목 뒤에)
      const newLoader = `  ${appName}: () => import('${appName}/MenuConfig').catch(() => ({ default: {} })) as Promise<MenuModule>,`;
      const updatedLoaders = currentLoaders.trimEnd() + '\n' + newLoader;

      const updatedContent = content.replace(menuLoadersRegex, `const MENU_LOADERS: Record<string, () => Promise<MenuModule>> = {${updatedLoaders}\n};`);

      // 파일 저장
      fs.writeFileSync(useMenuLoaderPath, updatedContent);
      logSuccess('host', `useMenuLoader.ts에 ${appName} 메뉴 로더 추가`, timer);
    } else {
      logError('host', 'MENU_LOADERS 객체를 찾을 수 없음');
    }
  } catch (error) {
    logError('host', `${appName} useMenuLoader.ts 업데이트`, error);
  }
}

function updateBuildScripts(appName) {
  const timer = createTimer();
  logStart('build-scripts', `${appName} 앱 추가`);
  try {
    // build-selective.js 업데이트
    updateBuildSelective(appName);

    // serve-host.js 업데이트 (core는 제외)
    if (appName !== 'core') {
      updateServeHost(appName);
    } else {
      logInfo('build-scripts', 'core 앱은 serve-host.js 업데이트 제외');
    }

    logSuccess('build-scripts', `${appName} 앱 추가`, timer);
  } catch (error) {
    logError('build-scripts', `${appName} 앱 추가`, error);
  }
}

function updateBuildSelective(appName) {
  const timer = createTimer();
  logStart('build-selective.js', `${appName} 앱 추가`);
  try {
    const buildSelectivePath = path.join(process.cwd(), 'scripts/build-selective.js');

    if (!fs.existsSync(buildSelectivePath)) {
      logError('build-selective.js', '파일을 찾을 수 없음');
      return;
    }

    const content = fs.readFileSync(buildSelectivePath, 'utf8');

    // APPS 배열 찾기
    const appsRegex = /const APPS = \[(.*?)\];/s;
    const match = content.match(appsRegex);

    if (match) {
      const currentApps = match[1];

      // 이미 존재하는지 확인
      if (currentApps.includes(`'${appName}'`)) {
        logInfo('build-selective.js', `${appName}이 이미 존재함 (스킵)`);
        return;
      }

      // 새 앱 추가 (배열 끝에)
      const trimmedApps = currentApps.trim();
      const separator = trimmedApps ? ', ' : '';
      const updatedApps = trimmedApps + separator + `'${appName}']`;
      const updatedContent = content.replace(appsRegex, `const APPS = [${updatedApps};`);

      fs.writeFileSync(buildSelectivePath, updatedContent);
      logSuccess('build-selective.js', `${appName} 앱 추가`, timer);
    } else {
      logError('build-selective.js', 'APPS 배열을 찾을 수 없음');
    }
  } catch (error) {
    logError('build-selective.js', `${appName} 앱 추가`, error);
  }
}

function updateServeHost(appName) {
  const timer = createTimer();
  logStart('serve-host.js', `${appName} 앱 추가`);
  try {
    const serveHostPath = path.join(process.cwd(), 'scripts/serve-host.js');

    if (!fs.existsSync(serveHostPath)) {
      logError('serve-host.js', '파일을 찾을 수 없음');
      return;
    }

    const content = fs.readFileSync(serveHostPath, 'utf8');

    // REMOTE_APPS 배열 찾기
    const remoteAppsRegex = /const REMOTE_APPS = \[(.*?)\];/s;
    const match = content.match(remoteAppsRegex);

    if (match) {
      const currentRemoteApps = match[1];

      // 이미 존재하는지 확인
      if (currentRemoteApps.includes(`'${appName}'`)) {
        logInfo('serve-host.js', `${appName}이 이미 존재함 (스킵)`);
        return;
      }

      // 새 앱 추가 (배열 끝에)
      const trimmedRemoteApps = currentRemoteApps.trim();
      const separator = trimmedRemoteApps ? ', ' : '';
      const updatedRemoteApps = trimmedRemoteApps + separator + `'${appName}']`;
      const updatedContent = content.replace(remoteAppsRegex, `const REMOTE_APPS = [${updatedRemoteApps};`);

      fs.writeFileSync(serveHostPath, updatedContent);
      logSuccess('serve-host.js', `${appName} 앱 추가`, timer);
    } else {
      logError('serve-host.js', 'REMOTE_APPS 배열을 찾을 수 없음');
    }
  } catch (error) {
    logError('serve-host.js', `${appName} 앱 추가`, error);
  }
}

function createPackageJson(appName) {
  const timer = createTimer();
  logStart(appName, 'package.json 파일 생성');
  try {
    const targetPackageJsonPath = path.join(process.cwd(), `apps/${appName}/package.json`);

    // package.json 내용
    const packageJsonContent = {
      name: `@bridgetec/ui-remote-${appName}`,
      version: '0.0.1',
      private: true,
    };

    // package.json 파일 생성
    fs.writeFileSync(targetPackageJsonPath, JSON.stringify(packageJsonContent, null, 2));
    logInfo(appName, `package name: @bridgetec/ui-remote-${appName}`);
    logSuccess(appName, 'package.json 파일 생성', timer);
  } catch (error) {
    logError(appName, 'package.json 파일 생성', error);
  }
}

function updateProjectJson(appName) {
  const timer = createTimer();
  logStart(appName, 'project.json 파일 수정');
  try {
    const targetProjectJsonPath = path.join(process.cwd(), `apps/${appName}/project.json`);

    // project.json 파일이 존재하는지 확인
    if (!fs.existsSync(targetProjectJsonPath)) {
      logError(appName, 'project.json 파일을 찾을 수 없음');
      return;
    }

    // project.json 파일 읽기
    const projectJsonContent = fs.readFileSync(targetProjectJsonPath, 'utf8');
    const projectJson = JSON.parse(projectJsonContent);

    // targets.build.options.styles 값 변경
    if (projectJson.targets && projectJson.targets.build && projectJson.targets.build.options) {
      projectJson.targets.build.options.styles = ['libs/shared-ui/src/styles/global.css'];

      // 수정된 내용을 파일에 저장
      fs.writeFileSync(targetProjectJsonPath, JSON.stringify(projectJson, null, 2));
      logInfo(appName, 'styles 설정을 libs/shared-ui/src/styles/global.css로 변경');
      logSuccess(appName, 'project.json 파일 수정', timer);
    } else {
      logError(appName, 'targets.build.options 구조를 찾을 수 없음');
    }
  } catch (error) {
    logError(appName, 'project.json 파일 수정', error);
  }
}

function copyPostcssConfig(appName) {
  const timer = createTimer();
  logStart(appName, 'postcss.config.js 파일을 core와 동일하게 변경');
  try {
    const corePostcssPath = path.join(process.cwd(), 'apps/core/postcss.config.js');
    const targetPostcssPath = path.join(process.cwd(), `apps/${appName}/postcss.config.js`);

    // core의 postcss.config.js 파일 읽기
    if (!fs.existsSync(corePostcssPath)) {
      logError('core', 'postcss.config.js 파일을 찾을 수 없음');
      return;
    }

    const corePostcssContent = fs.readFileSync(corePostcssPath, 'utf8');

    // 대상 앱의 postcss.config.js 파일이 존재하는지 확인
    if (!fs.existsSync(targetPostcssPath)) {
      logError(appName, 'postcss.config.js 파일을 찾을 수 없음');
      return;
    }

    // core의 내용을 대상 앱에 복사
    fs.writeFileSync(targetPostcssPath, corePostcssContent);
    logSuccess(appName, 'postcss.config.js 파일을 core와 동일하게 변경', timer);
  } catch (error) {
    logError(appName, 'postcss.config.js 파일 처리', error);
  }
}

function removeNxWelcome(appName) {
  const timer = createTimer();
  logStart(appName, 'nx-welcome.tsx 파일 삭제');
  try {
    const nxWelcomePath = path.join(process.cwd(), `apps/${appName}/src/app/nx-welcome.tsx`);

    if (fs.existsSync(nxWelcomePath)) {
      fs.unlinkSync(nxWelcomePath);
      logSuccess(appName, 'nx-welcome.tsx 파일 삭제', timer);
    } else {
      logInfo(appName, 'nx-welcome.tsx 파일이 존재하지 않음 (스킵)');
    }
  } catch (error) {
    logError(appName, 'nx-welcome.tsx 삭제', error);
  }
}

function copyBabelrc(appName) {
  const timer = createTimer();
  logStart(appName, '.babelrc 파일을 host와 동일하게 복사');
  try {
    const hostBabelrcPath = path.join(process.cwd(), 'apps/host/.babelrc');
    const targetBabelrcPath = path.join(process.cwd(), `apps/${appName}/.babelrc`);

    // host의 .babelrc 파일 읽기
    if (!fs.existsSync(hostBabelrcPath)) {
      logError('host', '.babelrc 파일을 찾을 수 없음');
      return;
    }

    const hostBabelrcContent = fs.readFileSync(hostBabelrcPath, 'utf8');

    // 대상 앱에 .babelrc 파일 복사
    fs.writeFileSync(targetBabelrcPath, hostBabelrcContent);
    logSuccess(appName, '.babelrc 파일을 host와 동일하게 복사', timer);
  } catch (error) {
    logError(appName, '.babelrc 파일 처리', error);
  }
}

function copyAppTemplate(appName) {
  const timer = createTimer();
  logStart(appName, 'app.tsx 파일 복사 및 주석 제거');
  try {
    const sampleAppPath = path.join(process.cwd(), 'apps/core/src/app/features/sample/app.tsx');
    const targetAppPath = path.join(process.cwd(), `apps/${appName}/src/app/app.tsx`);

    // sample app.tsx 파일 읽기
    if (!fs.existsSync(sampleAppPath)) {
      logError('core', 'src/app/features/sample/app.tsx 파일을 찾을 수 없음');
      return;
    }

    let appContent = fs.readFileSync(sampleAppPath, 'utf8');

    // 주석 제거 (// 주석과 /* */ 주석)
    appContent = appContent
      .replace(/\/\*[\s\S]*?\*\//g, '') // /* */ 주석 제거
      .replace(/\/\/.*$/gm, '') // // 주석 제거
      .replace(/^\s*[\r\n]/gm, '') // 빈 줄 제거
      .trim();

    logProgress('주석 및 빈 줄 제거 완료');

    // NotFound 컴포넌트의 homePath를 새 앱 이름으로 변경
    appContent = appContent.replace(/homePath="\/[^"]*"/g, `homePath="/${appName}"`);
    logProgress(`homePath를 "/${appName}"으로 변경`);

    // app.tsx 파일에 저장
    fs.writeFileSync(targetAppPath, appContent);
    logSuccess(appName, 'app.tsx 파일 복사 및 주석 제거', timer);
  } catch (error) {
    logError(appName, 'app.tsx 복사', error);
  }
}

function copyMainTemplate(appName) {
  const timer = createTimer();
  logStart(appName, 'Main.tsx 파일 복사');
  try {
    const samplePath = path.join(process.cwd(), 'apps/core/src/app/features/sample/Main.tsx');
    const targetDir = path.join(process.cwd(), `apps/${appName}/src/app/pages/main`);
    const targetPath = path.join(targetDir, 'Main.tsx');

    // sample Main.tsx 파일 읽기
    if (!fs.existsSync(samplePath)) {
      logError('core', 'src/app/features/sample/Main.tsx 파일을 찾을 수 없음');
      return;
    }

    const mainContent = fs.readFileSync(samplePath, 'utf8');

    // 디렉토리가 없으면 생성
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      logProgress(`${appName}/src/app/pages/main 디렉토리 생성`);
    }

    // Main.tsx 파일 생성
    fs.writeFileSync(targetPath, mainContent);
    logSuccess(appName, 'Main.tsx 파일 복사', timer);
  } catch (error) {
    logError(appName, 'Main.tsx 복사', error);
  }
}

// 스크립트 실행
createRemote();
