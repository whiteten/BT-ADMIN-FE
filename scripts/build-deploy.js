#!/usr/bin/env node
/**
 * prod 배포 산출물 조립 — 원본 BT-ADMIN-FE scripts/build-selective.js 상당.
 *
 * 산출 구조 (원본 dist/apps/host 트리와 동일한 상대 경로 규약):
 *   dist/deploy/                  ← apps/host/dist (host 산출물이 루트)
 *   dist/deploy/remotes/<name>/   ← apps/<name>/dist (remote별 remoteEntry.js)
 *
 * host rsbuild.config.ts의 prod remote URL(`/remotes/<name>/remoteEntry.js`)이
 * 이 배치를 전제한다. 로컬 스모크: `pnpm serve:prod` (serve -s, 4200).
 *
 * 사용 (`pnpm build`가 이 스크립트를 실행 — raw 빌드는 `pnpm build:raw`):
 *   pnpm build                              # 대화형 메뉴
 *   pnpm build all                          # 전체 빌드·조립
 *   pnpm build host vel                     # 선택 앱만 빌드 후 해당 부분만 교체
 *
 * 참고: 부분 갱신은 덮어쓰기 복사라 host의 옛 해시 파일이 잔존할 수 있다(스모크 용도).
 * 실배포 파이프라인은 항상 all 기준으로 조립할 것.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.join(__dirname, '..');
const DEPLOY_DIR = path.join(ROOT, 'dist', 'deploy');

// custom은 배포 트리(/remotes) 대상 아님 — 런타임 동적 등록 운반체 (원본 APPS와 동일하게 제외)
const REMOTE_APPS = fs
  .readdirSync(path.join(ROOT, 'apps'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'host' && d.name !== 'custom')
  .map((d) => d.name)
  .sort();
const APPS = ['host', ...REMOTE_APPS];

/** 앱 이름 → pnpm 워크스페이스 패키지명 */
const packageName = (app) => (app === 'host' ? '@bridgetec/ui-host' : `@bridgetec/ui-remote-${app}`);

function showMenu() {
  console.log('\n🎯 빌드할 앱을 선택해주세요 (콤마로 복수 선택):');
  console.log('  1. 모든 앱 빌드');
  APPS.forEach((app, i) => console.log(`  ${i + 2}. ${app}`));
}

function parseSelection(input) {
  const selected = [];
  for (const token of input
    .trim()
    .split(/[,\s]+/)
    .filter(Boolean)) {
    if (token === 'all') return [...APPS];
    if (APPS.includes(token)) {
      selected.push(token);
      continue;
    }
    const num = parseInt(token, 10);
    if (isNaN(num) || num < 1 || num > APPS.length + 1) throw new Error(`❌ 잘못된 선택입니다: ${token}`);
    if (num === 1) return [...APPS];
    selected.push(APPS[num - 2]);
  }
  if (selected.length === 0) throw new Error('❌ 선택된 앱이 없습니다');
  return Array.from(new Set(selected));
}

function build(apps) {
  const filters = apps.map((app) => `--filter=${packageName(app)}`).join(' ');
  const command = `npx turbo run build ${filters}`;
  console.log(`\n⏳ 빌드 중... (${apps.join(', ')})`);
  console.log(`   명령어: ${command}`);
  const result = spawnSync(command, [], { stdio: 'inherit', shell: true, cwd: ROOT, windowsHide: true });
  if (result.status !== 0) throw new Error(`빌드 실패 (exit code: ${result.status})`);
}

function assemble(apps) {
  console.log(`\n📦 dist/deploy 조립 중...`);
  if (apps.includes('host')) {
    fs.cpSync(path.join(ROOT, 'apps', 'host', 'dist'), DEPLOY_DIR, { recursive: true, force: true });
    console.log('  ✅ host → dist/deploy');
  }
  for (const app of apps.filter((a) => a !== 'host')) {
    const target = path.join(DEPLOY_DIR, 'remotes', app);
    fs.rmSync(target, { recursive: true, force: true });
    fs.cpSync(path.join(ROOT, 'apps', app, 'dist'), target, { recursive: true, force: true });
    console.log(`  ✅ ${app} → dist/deploy/remotes/${app}`);
  }
}

async function main() {
  let apps;
  const args = process.argv.slice(2);
  if (args.length > 0) {
    apps = parseSelection(args.join(','));
  } else {
    showMenu();
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise((resolve) => rl.question('\n선택: ', resolve));
    rl.close();
    apps = parseSelection(answer);
  }

  // 전체 조립일 때만 초기화 (부분 갱신은 기존 배치 위에 교체)
  if (apps.length === APPS.length && fs.existsSync(DEPLOY_DIR)) {
    console.log('\n🗑️  기존 dist/deploy 삭제');
    fs.rmSync(DEPLOY_DIR, { recursive: true, force: true });
  }

  build(apps);
  assemble(apps);
  console.log(`\n✅ 완료 — 스모크: pnpm serve:prod (http://localhost:4200)`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
