#!/usr/bin/env node

/**
 * 현장 커스터마이징 오버라이드 스캐폴딩 스크립트.
 *
 * 대상 remote의 routes.tsx에서 화면 키(pv 소켓)를 추출해 선택받고,
 * 원본 페이지 + 상대 경로 import 의존 파일 전체를 apps/custom/src/app/overrides/ 아래에
 * 구조 그대로 미러링 복사한 뒤, module-federation.config.ts(exposes)와 site-manifest.ts에
 * 동일 키를 자동 등록한다. (상세 절차: doc/CUSTOM_DEVELOPMENT_GUIDE.md)
 *
 * 사용법:
 *   node scripts/create-custom.js                              # 대화형
 *   node scripts/create-custom.js <appId> <화면키> [라벨]       # 비대화형
 *   node scripts/create-custom.js <appId> <화면키> --dry-run    # 복사 대상만 출력
 *   node scripts/create-custom.js --check                      # exposes·manifest·routes 키 정합성 검증
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = process.cwd();
const APPS_DIR = path.join(ROOT, 'apps');
const CUSTOM_DIR = path.join(APPS_DIR, 'custom');
const OVERRIDES_DIR = path.join(CUSTOM_DIR, 'src', 'app', 'overrides');
const MF_CONFIG_PATH = path.join(CUSTOM_DIR, 'module-federation.config.ts');
const MANIFEST_PATH = path.join(CUSTOM_DIR, 'src', 'app', 'site-manifest.ts');

// custom(자기 자신)·host(셸)는 오버라이드 대상이 아님
const EXCLUDED_APPS = ['custom', 'host'];

// import 그래프 추적 시 파싱 대상 코드 확장자 — 그 외(svg·css 등)는 복사만
const CODE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];
const RESOLVE_SUFFIXES = ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts'];

function logInfo(message) {
  console.log(`💬 ${message}`);
}

function logProgress(message) {
  console.log(`📝 ${message}`);
}

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

function logWarn(message) {
  console.warn(`⚠️  ${message}`);
}

function logError(message) {
  console.error(`❌ ${message}`);
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

/** 주석 제거 — 설정 파일의 예시 주석이 실제 키로 오탐되는 것을 방지 */
function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** apps/ 아래에서 routes.tsx를 가진 오버라이드 대상 remote 목록 */
function listRemoteApps() {
  return fs
    .readdirSync(APPS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !EXCLUDED_APPS.includes(d.name))
    .map((d) => d.name)
    .filter((name) => fs.existsSync(path.join(APPS_DIR, name, 'src', 'app', 'routes.tsx')))
    .sort();
}

/**
 * routes.tsx에서 pv 소켓 항목 추출.
 * - lazy 선언: const X = React.lazy(() => import('./pages/...'))
 * - 소켓 호출: pv('<화면 키>', X)
 * @returns {{ key: string, varName: string, importPath: string | null }[]}
 */
function extractPvEntries(appId) {
  const routesPath = path.join(APPS_DIR, appId, 'src', 'app', 'routes.tsx');
  const content = fs.readFileSync(routesPath, 'utf-8');

  const lazyImports = new Map();
  const lazyRegex = /const\s+(\w+)\s*=\s*React\.lazy\(\(\)\s*=>\s*import\(\s*['"]([^'"]+)['"]\s*\)\)/g;
  let match;
  while ((match = lazyRegex.exec(content)) !== null) {
    lazyImports.set(match[1], match[2]);
  }

  const entries = [];
  const pvRegex = /\bpv\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)\s*\)/g;
  while ((match = pvRegex.exec(content)) !== null) {
    entries.push({ key: match[1], varName: match[2], importPath: lazyImports.get(match[2]) ?? null });
  }
  return entries;
}

/** 상대 경로 import 스펙을 실제 파일로 해석 (확장자 보정 + index 보정) */
function resolveImport(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const suffix of RESOLVE_SUFFIXES) {
    const candidate = base + suffix;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** 파일 내용에서 import 스펙(상대 경로만) 추출 */
function extractImportSpecs(content) {
  const specs = new Set();
  // import ... from '...' / export ... from '...' (멀티라인 named import 포함)
  for (const m of content.matchAll(/from\s+['"]([^'"]+)['"]/g)) specs.add(m[1]);
  // 동적 import('...')
  for (const m of content.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.add(m[1]);
  // side-effect import '...' (css 등)
  for (const m of content.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm)) specs.add(m[1]);
  return [...specs].filter((s) => s.startsWith('./') || s.startsWith('../'));
}

/**
 * 진입 파일부터 상대 경로 import 그래프를 BFS로 추적.
 * '@/' 별칭(공유 라이브러리)은 host 것을 소비하므로 추적 대상 아님.
 * @returns {{ files: string[], warnings: string[] }} files는 절대 경로(원본 기준)
 */
function collectDependencies(entryFile, appSrcRoot) {
  const visited = new Set();
  const warnings = [];
  const queue = [entryFile];

  while (queue.length > 0) {
    const file = queue.shift();
    if (visited.has(file)) continue;

    if (!file.startsWith(appSrcRoot + path.sep)) {
      warnings.push(`앱 src 밖을 참조하여 복사 대상에서 제외: ${toPosix(path.relative(ROOT, file))}`);
      continue;
    }
    visited.add(file);

    if (!CODE_EXTENSIONS.includes(path.extname(file))) continue; // 에셋은 복사만, 파싱 안 함

    const content = fs.readFileSync(file, 'utf-8');
    for (const spec of extractImportSpecs(content)) {
      const resolved = resolveImport(file, spec);
      if (resolved) {
        queue.push(resolved);
      } else {
        warnings.push(`import 해석 실패 (${toPosix(path.relative(ROOT, file))}): '${spec}'`);
      }
    }
  }
  return { files: [...visited].sort(), warnings };
}

/**
 * 원본 파일들을 overrides 아래로 미러링 복사.
 * apps/<appId>/src/<rel> → apps/custom/src/app/overrides/<appId>/<rel>
 * @returns {{ copied: string[], skipped: string[] }} overrides 기준 상대 경로
 */
function copyFiles(files, appId, appSrcRoot) {
  const copied = [];
  const skipped = [];
  for (const file of files) {
    const rel = path.relative(appSrcRoot, file);
    const dest = path.join(OVERRIDES_DIR, appId, rel);
    if (fs.existsSync(dest)) {
      skipped.push(toPosix(rel)); // 현장 수정분 보호 — 덮어쓰지 않음
      continue;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file, dest);
    copied.push(toPosix(rel));
  }
  return { copied, skipped };
}

/** 블록 시작 라인부터 첫 닫힘 라인을 찾아 그 앞에 삽입 */
function insertBeforeClosing(content, startPattern, closePattern, insertLines, label) {
  const lines = content.split('\n');
  const startIdx = lines.findIndex((line) => startPattern.test(line));
  if (startIdx === -1) throw new Error(`${label}에서 블록 시작을 찾지 못했습니다.`);
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (closePattern.test(lines[i])) {
      lines.splice(i, 0, ...insertLines);
      return lines.join('\n');
    }
  }
  throw new Error(`${label}에서 블록 닫힘을 찾지 못했습니다.`);
}

/** module-federation.config.ts exposes에 키 등록 */
function registerExpose(appId, key, entryRelFromSrc) {
  const exposeKey = `./${appId}/${key}`;
  let content = fs.readFileSync(MF_CONFIG_PATH, 'utf-8');
  if (stripComments(content).includes(`'${exposeKey}':`)) {
    logWarn(`exposes에 이미 등록된 키라 건너뜀: '${exposeKey}'`);
    return;
  }
  const modulePath = `./src/app/overrides/${appId}/${toPosix(entryRelFromSrc)}`;
  content = insertBeforeClosing(content, /^\s*exposes:\s*\{/, /^\s*\},?\s*$/, [`    '${exposeKey}': '${modulePath}',`], 'module-federation.config.ts');
  fs.writeFileSync(MF_CONFIG_PATH, content, 'utf-8');
  logSuccess(`module-federation.config.ts exposes 등록: '${exposeKey}'`);
}

/** site-manifest.ts에 메타 등록 */
function registerManifest(appId, key, label, description) {
  const manifestKey = `${appId}/${key}`;
  let content = fs.readFileSync(MANIFEST_PATH, 'utf-8');
  if (stripComments(content).includes(`'${manifestKey}':`)) {
    logWarn(`site-manifest.ts에 이미 등록된 키라 건너뜀: '${manifestKey}'`);
    return;
  }
  const insertLines = [`  '${manifestKey}': {`, `    label: '${label}',`];
  if (description) insertLines.push(`    description: '${description}',`);
  insertLines.push('  },');
  content = insertBeforeClosing(content, /^export const siteOverrides[^=]*=\s*\{/, /^\};?\s*$/, insertLines, 'site-manifest.ts');
  fs.writeFileSync(MANIFEST_PATH, content, 'utf-8');
  logSuccess(`site-manifest.ts 메타 등록: '${manifestKey}' (label: '${label}')`);
}

/** 오버라이드 생성 본 작업 */
function createOverride(appId, key, label, description, dryRun) {
  const entries = extractPvEntries(appId);
  const entry = entries.find((e) => e.key === key);
  if (!entry) {
    logError(`'${appId}'의 routes.tsx에 화면 키 '${key}'의 pv 소켓이 없습니다.`);
    const variantHint = `정식 variant 화면(DynamicElement 직접 사용)은 이 스크립트가 지원하지 않습니다.`;
    logInfo(`사용 가능한 키 목록은 대화형 모드(인자 없이 실행)에서 확인할 수 있습니다. ${variantHint}`);
    process.exitCode = 1;
    return false;
  }
  if (!entry.importPath) {
    logError(`pv 소켓의 컴포넌트 '${entry.varName}'의 React.lazy import 선언을 routes.tsx에서 찾지 못했습니다.`);
    process.exitCode = 1;
    return false;
  }

  const appSrcRoot = path.join(APPS_DIR, appId, 'src');
  const routesPath = path.join(appSrcRoot, 'app', 'routes.tsx');
  const entryFile = resolveImport(routesPath, entry.importPath);
  if (!entryFile) {
    logError(`원본 페이지 파일을 찾지 못했습니다: ${entry.importPath}`);
    process.exitCode = 1;
    return false;
  }

  logProgress(`원본 페이지: ${toPosix(path.relative(ROOT, entryFile))}`);
  logProgress('상대 경로 import 그래프 추적 중...');
  const { files, warnings } = collectDependencies(entryFile, appSrcRoot);
  warnings.forEach((w) => logWarn(w));

  console.log(`\n📦 복사 대상 ${files.length}개 파일 (apps/${appId}/src/ → apps/custom/src/app/overrides/${appId}/):`);
  files.forEach((f) => console.log(`   - ${toPosix(path.relative(appSrcRoot, f))}`));

  if (dryRun) {
    logInfo('--dry-run: 복사·등록 없이 종료합니다.');
    return true;
  }

  const { copied, skipped } = copyFiles(files, appId, appSrcRoot);
  if (skipped.length > 0) {
    console.log(`\n⚠️  이미 존재하여 건너뛴 파일 ${skipped.length}개 (현장 수정분 보호 — 덮어쓰지 않음):`);
    skipped.forEach((f) => console.log(`   - ${f}`));
  }
  logSuccess(`${copied.length}개 파일 복사 완료`);

  const entryRelFromSrc = path.relative(appSrcRoot, entryFile);
  registerExpose(appId, key, entryRelFromSrc);
  registerManifest(appId, key, label, description);

  console.log('\n🎉 오버라이드 스캐폴딩 완료. 다음 단계:');
  console.log(`   1. apps/custom/src/app/overrides/${appId}/ 아래 사본을 수정해 커스텀 구현`);
  console.log(`   2. site-manifest.ts의 label/description을 현장에 맞게 다듬기`);
  console.log('   3. 로컬 확인: 터미널 1) pnpm run serve (host 포함), 터미널 2) npx nx serve custom');
  console.log(`   4. 운영자가 manager의 화면 지정 메뉴에서 '커스텀' 카드 선택 (componentKey 'site:${appId}/${key}')`);
  console.log('   상세: doc/CUSTOM_DEVELOPMENT_GUIDE.md');
  return true;
}

/** exposes ↔ site-manifest ↔ routes pv 키 정합성 검증 */
function checkConsistency() {
  const mfContent = fs.readFileSync(MF_CONFIG_PATH, 'utf-8');
  const manifestContent = fs.readFileSync(MANIFEST_PATH, 'utf-8');

  const exposeKeys = [];
  for (const m of stripComments(mfContent).matchAll(/'\.\/([^'\n]+)':\s*'/g)) {
    if (m[1] !== 'SiteManifest' && !m[1].startsWith('src/')) exposeKeys.push(m[1]);
  }
  const manifestKeys = [];
  for (const m of stripComments(manifestContent).matchAll(/^\s*'([^'\n]+)':\s*\{/gm)) {
    manifestKeys.push(m[1]);
  }

  let ok = true;
  const report = (problem) => {
    ok = false;
    logError(problem);
  };

  // 1) exposes ↔ manifest 1:1
  for (const key of exposeKeys) {
    if (!manifestKeys.includes(key)) report(`exposes에만 있고 site-manifest.ts에 없는 키: '${key}'`);
  }
  for (const key of manifestKeys) {
    if (!exposeKeys.includes(key)) report(`site-manifest.ts에만 있고 exposes에 없는 키: '${key}'`);
  }

  // 2) 키가 실제 remote routes.tsx의 pv 키와 일치하는지 + 노출 모듈 파일 존재 여부
  const pvKeyCache = new Map();
  for (const key of exposeKeys) {
    const [appId, ...rest] = key.split('/');
    const screenKey = rest.join('/');
    if (!fs.existsSync(path.join(APPS_DIR, appId, 'src', 'app', 'routes.tsx'))) {
      report(`존재하지 않는 remote를 가리키는 키: '${key}'`);
      continue;
    }
    if (!pvKeyCache.has(appId))
      pvKeyCache.set(
        appId,
        extractPvEntries(appId).map((e) => e.key),
      );
    if (!pvKeyCache.get(appId).includes(screenKey)) {
      report(`'${appId}'의 routes.tsx에 pv 소켓이 없는 화면 키: '${screenKey}'`);
    }

    const moduleMatch = stripComments(mfContent).match(new RegExp(`'\\./${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}':\\s*'([^']+)'`));
    if (moduleMatch) {
      const modulePath = path.join(CUSTOM_DIR, moduleMatch[1]);
      if (!fs.existsSync(modulePath)) report(`exposes '${key}'가 가리키는 모듈 파일 없음: ${moduleMatch[1]}`);
    }
  }

  if (ok) {
    logSuccess(`정합성 검증 통과 (오버라이드 ${exposeKeys.length}개)`);
  } else {
    process.exitCode = 1;
  }
}

/** 대화형 플로우 */
async function runInteractive() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  // rl.question은 프롬프트 사이에 도착한 입력(붙여넣기·파이프)을 유실하므로 line 이벤트를 직접 버퍼링
  const pendingLines = [];
  const pendingWaiters = [];
  rl.on('line', (line) => {
    const waiter = pendingWaiters.shift();
    if (waiter) waiter(line);
    else pendingLines.push(line);
  });
  rl.on('close', () => {
    while (pendingWaiters.length > 0) pendingWaiters.shift()('');
  });
  const question = (q) =>
    new Promise((resolve) => {
      process.stdout.write(q);
      const buffered = pendingLines.shift();
      if (buffered !== undefined) resolve(buffered.trim());
      else pendingWaiters.push((line) => resolve(line.trim()));
    });

  try {
    const apps = listRemoteApps();
    console.log('\n오버라이드 대상 remote 앱:');
    apps.forEach((app, i) => console.log(`  ${i + 1}. ${app}`));
    const appAnswer = await question('\n앱 번호 또는 이름 입력: ');
    const appId = /^\d+$/.test(appAnswer) ? apps[Number(appAnswer) - 1] : apps.find((a) => a === appAnswer);
    if (!appId) {
      logError('잘못된 앱 선택입니다.');
      return;
    }

    const entries = extractPvEntries(appId);
    if (entries.length === 0) {
      logError(`'${appId}'의 routes.tsx에서 pv 소켓을 찾지 못했습니다.`);
      return;
    }
    console.log(`\n'${appId}'의 화면 키 (${entries.length}개):`);
    entries.forEach((e, i) => console.log(`  ${String(i + 1).padStart(2)}. ${e.key}  (${e.varName})`));
    const keyAnswer = await question('\n화면 번호 또는 키 입력: ');
    const entry = /^\d+$/.test(keyAnswer) ? entries[Number(keyAnswer) - 1] : entries.find((e) => e.key === keyAnswer);
    if (!entry) {
      logError('잘못된 화면 선택입니다.');
      return;
    }

    const defaultLabel = `${entry.key} (커스텀)`;
    const label = (await question(`picker 카드 라벨 [${defaultLabel}]: `)) || defaultLabel;
    const description = await question('picker 카드 설명 (생략 가능): ');

    // 복사 대상 미리보기 후 확인
    createOverride(appId, entry.key, label, description, true);
    const confirm = await question('\n위 파일을 복사하고 exposes·site-manifest에 등록할까요? (y/N): ');
    if (confirm.toLowerCase() !== 'y') {
      logInfo('취소했습니다.');
      return;
    }
    createOverride(appId, entry.key, label, description, false);
  } finally {
    rl.close();
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--check')) {
    checkConsistency();
    return;
  }

  const positional = args.filter((a) => !a.startsWith('--'));
  if (positional.length === 0) {
    runInteractive();
    return;
  }

  if (positional.length < 2) {
    logError('사용법: node scripts/create-custom.js <appId> <화면키> [라벨] [--dry-run]');
    process.exitCode = 1;
    return;
  }

  const [appId, key, labelArg] = positional;
  if (!listRemoteApps().includes(appId)) {
    logError(`오버라이드 대상이 아닌 앱입니다: '${appId}' (대상: ${listRemoteApps().join(', ')})`);
    process.exitCode = 1;
    return;
  }
  createOverride(appId, key, labelArg || `${key} (커스텀)`, '', args.includes('--dry-run'));
}

main();
