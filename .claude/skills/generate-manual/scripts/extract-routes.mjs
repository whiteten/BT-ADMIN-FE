#!/usr/bin/env node
// @ts-check
/**
 * extract-routes.mjs
 *
 * 각 remote 앱의 routes.tsx를 TypeScript 컴파일러 API로 파싱해
 * "캡처해야 할 전체 화면 URL 매니페스트"를 결정적으로 추출한다.
 *
 * generate-manual 스킬의 1차 입력(라우트 목록) 생성용. 사람이 화면 목록을
 * 일일이 세지 않고, routes.tsx만 읽어 host 기준 전체 URL을 뽑는다.
 *
 * 사용법:
 *   node .claude/skills/generate-manual/scripts/extract-routes.mjs            # 전체 앱
 *   node .claude/skills/generate-manual/scripts/extract-routes.mjs fca ipron  # 특정 앱만
 *   node .claude/skills/generate-manual/scripts/extract-routes.mjs --out routes.json
 *   node .claude/skills/generate-manual/scripts/extract-routes.mjs --list-apps         # 발견된 remote 목록(줄바꿈)
 *   node .claude/skills/generate-manual/scripts/extract-routes.mjs --list-apps --json  # 발견된 remote 목록(JSON)
 *
 * remote 목록은 하드코딩이 아니라 apps/ 디렉토리에서 동적 발견한다(routes.tsx 보유 디렉토리).
 * 신규 remote가 추가되면 이 스크립트·스킬 수정 없이 자동으로 목록에 포함된다.
 *
 * 출력(JSON, stdout 또는 --out 파일):
 *   {
 *     "generatedFrom": "routes.tsx (static parse)",
 *     "apps": {
 *       "fca": [
 *         {
 *           "fullUrl": "/fca/bot-config/bot/list",
 *           "dynamic": false,
 *           "params": [],
 *           "componentName": "BotList",
 *           "componentFile": "apps/fca/src/app/pages/bot-config/BotList.tsx",
 *           "isList": true,
 *           "enterFromUrl": null
 *         },
 *         {
 *           "fullUrl": "/fca/bot-config/bot/:serviceId",
 *           "dynamic": true,
 *           "params": [":serviceId"],
 *           "componentName": "BotDetail",
 *           "componentFile": "apps/fca/src/app/pages/bot-config/BotDetail.tsx",
 *           "isList": false,
 *           "enterFromUrl": "/fca/bot-config/bot"
 *         }
 *       ]
 *     }
 *   }
 *
 * 한계:
 *  - variants(DynamicElement) / queryString 분기(handle.queryParams)는 런타임
 *    메뉴(DB componentKey) 의존이라 정적 열거 불가. 이 스크립트는 routes.tsx에
 *    선언된 기본 경로만 추출한다(스킬 문서의 "알려진 한계" 참조).
 *  - 동적 세그먼트(:id)는 dynamic:true로 표기하고, 첫 행 진입의 출발점이 될
 *    가장 가까운 정적 조상 URL을 enterFromUrl로 함께 제공한다.
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

let ts;
try {
  ts = (await import('typescript')).default ?? (await import('typescript'));
} catch {
  console.error('[extract-routes] typescript 모듈을 찾을 수 없습니다. 프로젝트 루트에서 실행하세요 (pnpm install 필요).');
  process.exit(1);
}

// element 태그가 아래에 해당하면 "페이지"가 아니라 레이아웃/리다이렉트로 간주.
const NON_PAGE_TAGS = new Set(['Navigate', 'Outlet', 'NotFound', 'React.Fragment', 'Fragment']);

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** apps/ 와 package.json 을 모두 가진 디렉토리를 위로 탐색해 repo 루트를 찾는다. */
function findRepoRoot() {
  const candidates = [process.cwd(), path.resolve(__dirname, '../../../..')];
  for (const start of candidates) {
    let dir = start;
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'apps')) && fs.existsSync(path.join(dir, 'package.json'))) {
        return dir;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return process.cwd();
}

/**
 * apps/ 디렉토리를 스캔해 remote 목록을 동적 발견한다.
 * 규칙: `apps/<app>/src/app/routes.tsx` 가 존재하는 디렉토리 = remote.
 *   - host 는 routes.tsx 가 없어 자동 제외된다.
 *   - 신규 remote 가 추가돼도 코드 수정 없이 자동 포함된다(확장성).
 * 정렬: serve 포트 오름차순(포트는 apps/<app>/project.json 의 targets.serve.options.port).
 *       포트를 못 읽은 앱은 뒤에 알파벳순으로 둔다.
 */
function readServePort(appsDir, app) {
  try {
    const pj = JSON.parse(fs.readFileSync(path.join(appsDir, app, 'project.json'), 'utf-8'));
    const port = pj?.targets?.serve?.options?.port;
    return typeof port === 'number' ? port : null;
  } catch {
    return null;
  }
}

function discoverApps(repoRoot) {
  const appsDir = path.join(repoRoot, 'apps');
  let names;
  try {
    names = fs
      .readdirSync(appsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .filter((name) => fs.existsSync(path.join(appsDir, name, 'src', 'app', 'routes.tsx')));
  } catch {
    return [];
  }
  return names
    .map((name) => ({ name, port: readServePort(appsDir, name) }))
    .sort((a, b) => {
      if (a.port != null && b.port != null) return a.port - b.port;
      if (a.port != null) return -1;
      if (b.port != null) return 1;
      return a.name.localeCompare(b.name);
    })
    .map((x) => x.name);
}

/** React.lazy(() => import('./pages/x/Y')) 선언에서 변수명 → import 경로 맵을 만든다. */
function collectLazyImports(sourceFile) {
  /** @type {Record<string, string>} */
  const map = {};
  /** @param {import('typescript').Node} node */
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.name && ts.isIdentifier(node.name) && node.initializer) {
      const init = node.initializer;
      const text = init.getText(sourceFile);
      if (text.includes('lazy') && text.includes('import(')) {
        const importPath = findImportString(init, sourceFile);
        if (importPath) map[node.name.text] = importPath;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return map;
}

/** 노드 하위에서 동적 import('...') 의 문자열 리터럴 인자를 찾는다. */
function findImportString(node, sourceFile) {
  let found = null;
  /** @param {import('typescript').Node} n */
  const visit = (n) => {
    if (found) return;
    if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const arg = n.arguments[0];
      if (arg && ts.isStringLiteralLike(arg)) {
        found = arg.text;
        return;
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return found;
}

/** `export const routes = [...]` 의 배열 리터럴을 찾는다. */
function findRoutesArray(sourceFile) {
  let result = null;
  /** @param {import('typescript').Node} node */
  const visit = (node) => {
    if (result) return;
    if (ts.isVariableDeclaration(node) && node.name && ts.isIdentifier(node.name) && node.name.text === 'routes' && node.initializer && ts.isArrayLiteralExpression(node.initializer)) {
      result = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return result;
}

/** ObjectLiteral 라우트 노드에서 path/index/element태그/children 을 추출. */
function readRouteObject(obj, sourceFile) {
  /** @type {{path:string|null, index:boolean, elementTag:string|null, children:import('typescript').ArrayLiteralExpression|null}} */
  const info = { path: null, index: false, elementTag: null, children: null };
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop) || !prop.name) continue;
    const key = prop.name.getText(sourceFile);
    const val = prop.initializer;
    if (key === 'path' && ts.isStringLiteralLike(val)) {
      info.path = val.text;
    } else if (key === 'index') {
      info.index = val.kind === ts.SyntaxKind.TrueKeyword;
    } else if (key === 'element') {
      info.elementTag = jsxTagName(val, sourceFile);
    } else if (key === 'children' && ts.isArrayLiteralExpression(val)) {
      info.children = val;
    }
  }
  return info;
}

/** element JSX 노드에서 태그 이름을 얻는다. */
function jsxTagName(node, sourceFile) {
  if (ts.isJsxSelfClosingElement(node)) return node.tagName.getText(sourceFile);
  if (ts.isJsxElement(node)) return node.openingElement.tagName.getText(sourceFile);
  // <Foo /> 가 괄호로 감싸진 경우 등
  if (ts.isParenthesizedExpression(node)) return jsxTagName(node.expression, sourceFile);
  return null;
}

function joinPath(base, seg) {
  if (!seg) return base;
  const cleaned = seg.replace(/^\/+|\/+$/g, '');
  if (!cleaned) return base || '/';
  if (!base || base === '/') return '/' + cleaned;
  return base + '/' + cleaned;
}

/** dynamic 세그먼트의 직전 정적 조상 경로(첫 행 진입 출발점)를 구한다. */
function staticAncestor(fullUrl) {
  const parts = fullUrl.split('/');
  const idx = parts.findIndex((p) => p.startsWith(':'));
  if (idx <= 0) return null;
  const ancestor = parts.slice(0, idx).join('/');
  return ancestor || null;
}

function resolveComponentFile(appId, importPath) {
  if (!importPath) return null;
  // routes.tsx 위치: apps/<appId>/src/app/routes.tsx → import 는 './pages/...' 상대경로
  const rel = importPath.replace(/^\.\//, '');
  const base = `apps/${appId}/src/app/${rel}`;
  return base.endsWith('.tsx') || base.endsWith('.ts') ? base : `${base}.tsx`;
}

// ---------------------------------------------------------------------------
// 화면별 import 의존성 클로저(backingFiles) 산출
//   각 화면(componentFile)이 직접/간접으로 import 하는 repo 내부 소스(apps/·libs/)를
//   BFS 로 모은다. 이 집합이 "이 화면 설명/캡처의 근거 파일"이며, git diff 와 교집합을
//   내면 어떤 화면 문서가 오래됐는지(staleness) 판정할 수 있다.
//   - node_modules(외부 패키지)는 따라가지 않는다.
//   - tsconfig.base.json 의 paths 별칭(@/shared-util 등)을 해석한다.
//   - 파일별 직접 import 목록은 캐시해 앱 간 재사용한다(성능).
// ---------------------------------------------------------------------------

/** tsconfig.base.json 의 paths 를 읽어 별칭 해석 규칙 리스트로 만든다(prefix 길이 내림차순). */
function buildAliasResolver(repoRoot) {
  let paths = {};
  try {
    const tsconfig = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tsconfig.base.json'), 'utf-8'));
    paths = tsconfig?.compilerOptions?.paths || {};
  } catch {
    /* tsconfig 없거나 파싱 실패 → 별칭 해석 생략(상대경로만) */
  }
  /** @type {{exact:boolean, pattern:string, prefix:string, suffix:string, targets:string[]}[]} */
  const list = [];
  for (const [pattern, targets] of Object.entries(paths)) {
    const star = pattern.indexOf('*');
    if (star === -1) list.push({ exact: true, pattern, prefix: pattern, suffix: '', targets });
    else list.push({ exact: false, pattern, prefix: pattern.slice(0, star), suffix: pattern.slice(star + 1), targets });
  }
  // 더 구체적인(긴 prefix) 규칙이 먼저 매칭되도록 정렬. exact 는 prefix=pattern 전체라 자연히 우선.
  list.sort((a, b) => b.prefix.length - a.prefix.length);
  return list;
}

/** 별칭 specifier 를 repo 절대경로(확장자 없음)로 치환. 매칭 없으면 null. */
function resolveAlias(spec, aliasList, repoRoot) {
  for (const a of aliasList) {
    if (a.exact) {
      if (spec === a.pattern && a.targets[0]) return path.resolve(repoRoot, a.targets[0]);
      continue;
    }
    if (spec.length >= a.prefix.length + a.suffix.length && spec.startsWith(a.prefix) && spec.endsWith(a.suffix) && a.targets[0]) {
      const star = spec.slice(a.prefix.length, spec.length - a.suffix.length);
      return path.resolve(repoRoot, a.targets[0].replace('*', star));
    }
  }
  return null;
}

/** 확장자/index 를 보강해 실제 파일 절대경로를 찾는다. 없으면 null. */
function probeFile(candidateAbs) {
  const exts = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];
  for (const e of exts) {
    const p = candidateAbs + e;
    try {
      if (fs.statSync(p).isFile()) return p;
    } catch {
      /* not found */
    }
  }
  for (const e of ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']) {
    const p = path.join(candidateAbs, 'index' + e);
    try {
      if (fs.statSync(p).isFile()) return p;
    } catch {
      /* not found */
    }
  }
  return null;
}

/** import specifier → repo 내부 소스 파일 절대경로. 외부 패키지/해석불가/repo 밖이면 null. */
function resolveModule(spec, fromAbs, repoRoot, aliasList) {
  let candidate = null;
  if (spec.startsWith('.')) candidate = path.resolve(path.dirname(fromAbs), spec);
  else candidate = resolveAlias(spec, aliasList, repoRoot);
  if (!candidate) return null;
  const file = probeFile(candidate);
  if (!file) return null;
  const rel = path.relative(repoRoot, file).split(path.sep).join('/');
  if (rel.startsWith('..') || rel.includes('node_modules')) return null;
  if (!(rel.startsWith('apps/') || rel.startsWith('libs/'))) return null;
  return file;
}

/** 한 파일의 직접 import/export-from/dynamic-import 가 가리키는 repo 내부 파일(절대경로) 목록. 캐시됨. */
function directImports(absFile, repoRoot, aliasList, cache) {
  if (cache.has(absFile)) return cache.get(absFile);
  /** @type {string[]} */
  const specs = [];
  try {
    const text = fs.readFileSync(absFile, 'utf-8');
    const kind = absFile.endsWith('.tsx') || absFile.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sf = ts.createSourceFile(absFile, text, ts.ScriptTarget.Latest, true, kind);
    /** @param {import('typescript').Node} n */
    const visit = (n) => {
      if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteralLike(n.moduleSpecifier)) {
        specs.push(n.moduleSpecifier.text);
      } else if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const a = n.arguments[0];
        if (a && ts.isStringLiteralLike(a)) specs.push(a.text);
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  } catch {
    /* 읽기/파싱 실패 → 의존성 없음으로 처리 */
  }
  const resolved = [];
  for (const spec of specs) {
    const r = resolveModule(spec, absFile, repoRoot, aliasList);
    if (r) resolved.push(r);
  }
  const uniq = [...new Set(resolved)];
  cache.set(absFile, uniq);
  return uniq;
}

/** componentFile 에서 시작해 repo 내부 import 를 BFS 로 모아 backingFiles(repo 상대경로, 정렬)를 반환. */
function collectBackingFiles(repoRoot, componentFileRel, aliasList, cache) {
  if (!componentFileRel) return [];
  const startAbs = path.resolve(repoRoot, componentFileRel);
  const visited = new Set();
  const queue = [startAbs];
  const MAX = 6000; // 폭주 방지 상한
  while (queue.length && visited.size < MAX) {
    const cur = queue.shift();
    if (visited.has(cur)) continue;
    visited.add(cur);
    for (const dep of directImports(cur, repoRoot, aliasList, cache)) {
      if (!visited.has(dep)) queue.push(dep);
    }
  }
  return [...visited]
    .map((a) => path.relative(repoRoot, a).split(path.sep).join('/'))
    .filter((r) => r.startsWith('apps/') || r.startsWith('libs/'))
    .sort();
}

// 앱 간 공유되는 파일별 직접-import 캐시(한 프로세스 내 재사용).
const _importCache = new Map();
let _aliasList = null;

/**
 * routes 배열을 재귀 순회하며 leaf 페이지를 수집.
 * 규칙:
 *  - children 이 있으면 레이아웃/그룹 → 재귀만(자기 element 는 페이지로 보지 않음)
 *  - children 이 없고 element 태그가 실제 컴포넌트(NON_PAGE_TAGS 제외)면 leaf
 *  - index:true 는 부모 경로에 세그먼트를 추가하지 않음
 */
function walkRoutes(arrayLiteral, sourceFile, appId, lazyMap, basePath, out) {
  for (const el of arrayLiteral.elements) {
    if (!ts.isObjectLiteralExpression(el)) continue;
    const info = readRouteObject(el, sourceFile);
    const currentPath = info.index ? basePath : joinPath(basePath, info.path);

    if (info.children) {
      walkRoutes(info.children, sourceFile, appId, lazyMap, currentPath, out);
      continue;
    }
    if (!info.elementTag || NON_PAGE_TAGS.has(info.elementTag)) continue;

    const fullUrl = `/${appId}${currentPath === '/' ? '' : currentPath}` || `/${appId}`;
    const normalized = fullUrl.replace(/\/{2,}/g, '/');
    const params = (normalized.match(/:[A-Za-z0-9_]+/g) || []);
    const dynamic = params.length > 0;
    const componentFile = resolveComponentFile(appId, lazyMap[info.elementTag]);

    out.push({
      fullUrl: normalized,
      dynamic,
      params,
      componentName: info.elementTag,
      componentFile,
      isList: /(^|\/)list$/.test(normalized) || /List$/.test(info.elementTag),
      enterFromUrl: dynamic ? staticAncestor(normalized) : null,
    });
  }
}

function extractApp(repoRoot, appId, opts = {}) {
  const routesPath = path.join(repoRoot, 'apps', appId, 'src', 'app', 'routes.tsx');
  if (!fs.existsSync(routesPath)) {
    console.error(`[extract-routes] routes.tsx 없음: ${routesPath} (앱 '${appId}' 건너뜀)`);
    return null;
  }
  const text = fs.readFileSync(routesPath, 'utf-8');
  const sourceFile = ts.createSourceFile(routesPath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const lazyMap = collectLazyImports(sourceFile);
  const routesArray = findRoutesArray(sourceFile);
  if (!routesArray) {
    console.error(`[extract-routes] 'routes' 배열을 찾지 못함: ${routesPath}. 해당 파일을 직접 읽어 보강 필요.`);
    return [];
  }
  /** @type {any[]} */
  const out = [];
  walkRoutes(routesArray, sourceFile, appId, lazyMap, '', out);
  // 중복 URL 제거(동일 element가 여러 path에 복사된 경우는 유지)
  const seen = new Set();
  const routes = out.filter((r) => {
    const k = `${r.fullUrl}__${r.componentName}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  // --with-deps: 각 화면의 import 의존성 클로저를 backingFiles 로 첨부(staleness 판정 근거).
  if (opts.withDeps) {
    if (!_aliasList) _aliasList = buildAliasResolver(repoRoot);
    for (const r of routes) {
      r.backingFiles = collectBackingFiles(repoRoot, r.componentFile, _aliasList, _importCache);
    }
  }
  return routes;
}

function main() {
  const args = process.argv.slice(2);
  const repoRoot = findRepoRoot();
  const allApps = discoverApps(repoRoot);

  // --list-apps: apps/ 에서 동적 발견한 remote 목록만 출력하고 종료.
  // 스킬이 "어떤 remote를 생성할지" 선택지를 구성할 때 이 출력을 SoT로 사용한다.
  // 기본은 줄바꿈 목록, --json 을 함께 주면 JSON({ repoRoot, apps }) 출력.
  if (args.includes('--list-apps')) {
    if (args.includes('--json')) {
      console.log(JSON.stringify({ repoRoot, apps: allApps }, null, 2));
    } else {
      console.log(allApps.join('\n'));
    }
    return;
  }

  let outFile = null;
  let withDeps = false;
  const apps = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out') {
      outFile = args[++i];
    } else if (args[i] === '--with-deps') {
      withDeps = true;
    } else if (allApps.includes(args[i])) {
      apps.push(args[i]);
    } else {
      console.error(`[extract-routes] 알 수 없는 인자/앱: ${args[i]} (유효 앱: ${allApps.join(', ')})`);
    }
  }
  const targetApps = apps.length > 0 ? apps : allApps;

  /** @type {Record<string, any[]>} */
  const result = {};
  let total = 0;
  for (const appId of targetApps) {
    const routes = extractApp(repoRoot, appId, { withDeps });
    if (routes === null) continue;
    result[appId] = routes;
    total += routes.length;
  }

  const payload = {
    generatedFrom: 'routes.tsx (static parse via TypeScript compiler API)',
    repoRoot,
    appCount: Object.keys(result).length,
    routeCount: total,
    apps: result,
  };
  const json = JSON.stringify(payload, null, 2);

  if (outFile) {
    fs.writeFileSync(path.resolve(repoRoot, outFile), json, 'utf-8');
    const summary = Object.entries(result)
      .map(([a, r]) => `  ${a}: ${r.length}`)
      .join('\n');
    console.log(`[extract-routes] ${total}개 라우트(${Object.keys(result).length}개 앱) → ${outFile}\n${summary}`);
  } else {
    console.log(json);
  }
}

// 이 파일을 직접 실행했을 때만 main() 을 돌린다(manual-staleness.mjs 등에서 import 시 부작용 방지).
const isEntry = (() => {
  try {
    return Boolean(process.argv[1]) && path.resolve(process.argv[1]) === __filename;
  } catch {
    return false;
  }
})();
if (isEntry) main();

export { findRepoRoot, discoverApps, extractApp, buildAliasResolver, collectBackingFiles };
