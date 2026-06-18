#!/usr/bin/env node
// @ts-check
/**
 * manual-staleness.mjs
 *
 * 생성된 매뉴얼이 "언제 기준(커밋)으로 만들어졌는지"를 기록하고, 그 이후 바뀐 소스와
 * 각 화면의 import 의존성(backingFiles)을 교집합해 **어떤 화면 문서가 오래됐는지**를 판정한다.
 *
 * generate-manual 스킬의 부속 도구. extract-routes.mjs 의 backingFiles 산출을 재사용한다.
 *
 * 모드:
 *   1) 메타 기록 — 매뉴얼 생성 직후 호출. 현재 HEAD 커밋·날짜를 스탬프하고 화면별 backingFiles 를 저장.
 *        node manual-staleness.mjs --write-meta fca
 *        node manual-staleness.mjs --write-meta fca manager
 *
 *   2) 갱신 점검(기본) — 메타의 baseCommit 이후 변경(커밋 + 워킹트리)과 backingFiles 를 비교.
 *        node manual-staleness.mjs                 # 메타에 기록된 모든 앱
 *        node manual-staleness.mjs fca             # fca 만
 *        node manual-staleness.mjs --json          # 기계가 읽는 JSON 리포트
 *
 *   3) 가정(what-if) — 임의의 파일 집합을 바꾼다고 가정하고 영향 화면을 본다(계획용).
 *        node manual-staleness.mjs --changed apps/fca/src/app/pages/bot-config/BotList.tsx fca
 *
 * 공통 옵션:
 *   --config <path>   manual.config.json 경로(기본: 스킬 폴더의 manual.config.json) — outputDir 해석용
 *   --out <file>      리포트(JSON)를 파일로도 저장
 *
 * 판정 기준:
 *   - 변경 파일이 화면 backingFiles 중 apps/ 소스면 → "갱신 필요"(강한 신호: 화면 코드 직접 변경)
 *   - libs/ 공유 소스만 걸리면 → "검토 권장"(약한 신호: 공유 요소 변경, 화면 영향은 확인 필요)
 *   - 둘 다 없으면 → "최신"
 *   ※ 코드 변경 != 화면 변경(리팩터링 등)일 수 있으므로 최종 판단은 사람이 한다.
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { execFileSync } from 'node:child_process';

import { findRepoRoot, discoverApps, extractApp } from './extract-routes.mjs';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const META_BASENAME = '.manual-meta.json';

/** repo 상대경로로 정규화(역슬래시→슬래시, 선행 ./ 제거). */
function normRel(p) {
  return String(p)
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .trim();
}

/** git 명령 실행(실패 시 null). */
function git(repoRoot, args) {
  try {
    return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

/** manual.config.json 에서 outputDir 해석(기본 doc/manuals). */
function resolveOutputDir(repoRoot, configPath) {
  const candidate = configPath
    ? path.resolve(repoRoot, configPath)
    : path.join(__dirname, '..', 'manual.config.json');
  try {
    const cfg = JSON.parse(fs.readFileSync(candidate, 'utf-8'));
    if (cfg && typeof cfg.outputDir === 'string' && cfg.outputDir.trim()) return cfg.outputDir.trim();
  } catch {
    /* config 없으면 기본값 */
  }
  return 'doc/manuals';
}

function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function readMeta(metaPath) {
  try {
    return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 모드 1: 메타 기록
// ---------------------------------------------------------------------------
function writeMeta(repoRoot, metaPath, targetApps) {
  const head = git(repoRoot, ['rev-parse', 'HEAD']);
  const headShort = git(repoRoot, ['rev-parse', '--short', 'HEAD']);
  if (!head) {
    console.error('[manual-staleness] git HEAD 를 읽지 못했습니다. git 저장소에서 실행하세요.');
    process.exit(1);
  }
  const generatedAt = todayStr();

  const meta = readMeta(metaPath) || { schema: 1, generatedFrom: 'manual-staleness.mjs', apps: {} };
  if (!meta.apps) meta.apps = {};

  let totalRoutes = 0;
  for (const appId of targetApps) {
    // 메타에는 기준 커밋·날짜·화면 수만 저장한다(경량). 화면별 backingFiles 는 무겁고
    // 커밋 노이즈가 크므로 보관하지 않고, 점검 시 현재 코드에서 즉석 재산출한다.
    const routes = extractApp(repoRoot, appId, { withDeps: false });
    if (!routes) {
      console.error(`[manual-staleness] 앱 '${appId}' 라우트 추출 실패 — 건너뜀`);
      continue;
    }
    meta.apps[appId] = {
      baseCommit: head,
      baseCommitShort: headShort,
      generatedAt,
      routeCount: routes.length,
    };
    totalRoutes += routes.length;
    console.log(`  ${appId}: ${routes.length}개 화면 (기준 커밋 ${headShort}, ${generatedAt})`);
  }

  meta.updatedAt = generatedAt;
  fs.mkdirSync(path.dirname(metaPath), { recursive: true });
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
  console.log(
    `[manual-staleness] 메타 기록 완료 → ${path.relative(repoRoot, metaPath).split(path.sep).join('/')} ` +
      `(기준 커밋 ${headShort}, ${generatedAt}, ${totalRoutes}개 화면)`,
  );
}

// ---------------------------------------------------------------------------
// 변경 파일 수집
// ---------------------------------------------------------------------------
/** baseCommit 이후 변경된 repo 상대경로 집합(커밋 + 워킹트리 + 미추적). base 가 유효하지 않으면 fallback. */
function changedFilesSince(repoRoot, baseCommit) {
  const result = new Set();
  let baseValid = false;
  if (baseCommit && git(repoRoot, ['cat-file', '-e', `${baseCommit}^{commit}`]) !== null) {
    baseValid = true;
    // base..워킹트리(스테이지 포함) 추적 파일 변경
    const tracked = git(repoRoot, ['diff', '--name-only', baseCommit]);
    if (tracked) tracked.split('\n').forEach((l) => l.trim() && result.add(normRel(l)));
  }
  // 미추적 신규 파일(워킹트리)
  const status = git(repoRoot, ['status', '--porcelain', '--untracked-files=all']);
  if (status) {
    for (const line of status.split('\n')) {
      if (!line.trim()) continue;
      let p = line.slice(3);
      if (p.includes(' -> ')) p = p.split(' -> ')[1]; // 리네임은 도착 경로
      result.add(normRel(p.replace(/^"|"$/g, '')));
    }
  }
  return { files: result, baseValid };
}

// ---------------------------------------------------------------------------
// 모드 2/3: 갱신 점검
// ---------------------------------------------------------------------------
function checkStale(repoRoot, metaPath, targetApps, changedOverride) {
  const meta = readMeta(metaPath);
  if (!meta || !meta.apps || !Object.keys(meta.apps).length) {
    console.error(
      `[manual-staleness] 메타가 없습니다: ${path.relative(repoRoot, metaPath).split(path.sep).join('/')}\n` +
        `  먼저 'node manual-staleness.mjs --write-meta <app>' 로 기록하세요(매뉴얼 생성 직후 1회).`,
    );
    process.exit(1);
  }
  const head = git(repoRoot, ['rev-parse', '--short', 'HEAD']) || '(unknown)';
  const apps = targetApps.length ? targetApps.filter((a) => meta.apps[a]) : Object.keys(meta.apps);

  const report = { head, generatedAt: meta.updatedAt || null, apps: {} };

  for (const appId of apps) {
    const appMeta = meta.apps[appId];
    let changed;
    let baseValid = true;
    if (changedOverride) {
      changed = new Set(changedOverride.map(normRel));
    } else {
      const r = changedFilesSince(repoRoot, appMeta.baseCommit);
      changed = r.files;
      baseValid = r.baseValid;
    }

    // backingFiles 는 메타에 보관하지 않고 현재 코드에서 즉석 재산출한다.
    const liveRoutes = extractApp(repoRoot, appId, { withDeps: true }) || [];

    const stale = [];
    const review = [];
    for (const route of liveRoutes) {
      const hits = (route.backingFiles || []).filter((f) => changed.has(f));
      if (!hits.length) continue;
      const appHits = hits.filter((f) => f.startsWith('apps/'));
      const sharedHits = hits.filter((f) => f.startsWith('libs/'));
      const entry = { fullUrl: route.fullUrl, appHits, sharedHits };
      if (appHits.length) stale.push(entry);
      else review.push(entry);
    }

    report.apps[appId] = {
      baseCommit: appMeta.baseCommitShort || appMeta.baseCommit,
      generatedAt: appMeta.generatedAt,
      baseValid,
      changedCount: changedOverride ? changedOverride.length : changed.size,
      total: liveRoutes.length,
      stale,
      review,
      upToDate: liveRoutes.length - stale.length - review.length,
    };
  }
  return report;
}

function printHuman(report) {
  for (const [appId, a] of Object.entries(report.apps)) {
    console.log(`\n[${appId}] 기준 ${a.generatedAt} · 커밋 ${a.baseCommit} → 현재 ${report.head}`);
    if (!a.baseValid) {
      console.log('  ⚠ 기준 커밋이 현재 히스토리에 없습니다(rebase 등). 워킹트리 변경만으로 점검했습니다.');
    }
    console.log(`  변경 감지: ${a.changedCount}개 파일`);
    if (a.stale.length) {
      console.log(`  ⚠ 갱신 필요(화면 코드 변경) ${a.stale.length}개:`);
      for (const s of a.stale) {
        const why = s.appHits[0] + (s.appHits.length > 1 ? ` 외 ${s.appHits.length - 1}` : '');
        console.log(`     - ${s.fullUrl}  ←  ${why}`);
      }
    }
    if (a.review.length) {
      console.log(`  · 검토 권장(공유 요소만 변경) ${a.review.length}개:`);
      for (const s of a.review) {
        const why = s.sharedHits[0] + (s.sharedHits.length > 1 ? ` 외 ${s.sharedHits.length - 1}` : '');
        console.log(`     - ${s.fullUrl}  ←  ${why}`);
      }
    }
    if (!a.stale.length && !a.review.length) {
      console.log(`  ✓ 전체 ${a.total}개 화면 최신`);
    } else {
      console.log(`  ✓ 최신 ${a.upToDate}개`);
    }
  }
}

// ---------------------------------------------------------------------------
function main() {
  const argv = process.argv.slice(2);
  const repoRoot = findRepoRoot();
  const allApps = discoverApps(repoRoot);

  let mode = 'check';
  let configPath = null;
  let outFile = null;
  let json = false;
  /** @type {string[]|null} */
  let changedOverride = null;
  const apps = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--write-meta') mode = 'write-meta';
    else if (a === '--json') json = true;
    else if (a === '--config') configPath = argv[++i];
    else if (a === '--out') outFile = argv[++i];
    else if (a === '--changed') {
      // 콤마 또는 공백으로 이어진 다음 인자들을 파일로 수집(다음 플래그 전까지).
      changedOverride = changedOverride || [];
      const next = argv[i + 1];
      if (next && next.includes(',')) {
        next.split(',').forEach((f) => f.trim() && changedOverride.push(f.trim()));
        i++;
      } else {
        while (argv[i + 1] && !argv[i + 1].startsWith('--') && !allApps.includes(argv[i + 1])) {
          changedOverride.push(argv[++i]);
        }
      }
    } else if (allApps.includes(a)) apps.push(a);
    else console.error(`[manual-staleness] 알 수 없는 인자: ${a} (유효 앱: ${allApps.join(', ')})`);
  }

  const outputDir = resolveOutputDir(repoRoot, configPath);
  const metaPath = path.join(repoRoot, outputDir, META_BASENAME);

  if (mode === 'write-meta') {
    const targets = apps.length ? apps : allApps;
    writeMeta(repoRoot, metaPath, targets);
    return;
  }

  const report = checkStale(repoRoot, metaPath, apps, changedOverride);
  if (json) console.log(JSON.stringify(report, null, 2));
  else printHuman(report);
  if (outFile) {
    fs.writeFileSync(path.resolve(repoRoot, outFile), JSON.stringify(report, null, 2), 'utf-8');
    if (!json) console.log(`\n[manual-staleness] 리포트 저장 → ${outFile}`);
  }
}

main();
