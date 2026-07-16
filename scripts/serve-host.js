#!/usr/bin/env node

/**
 * host + 선택 remote 동시 dev 기동 (원본 BT-ADMIN-FE scripts/serve-host.js UX 이식).
 *
 * 원본(Nx module-federation-dev-server의 --devRemotes/--skipRemotes)과 달리
 * turborepo에선 선택한 앱만 `turbo run dev --filter=...`로 띄운다.
 * 미선택 remote는 dev 서버 자체가 없으므로 host가 로드 실패(404/REFUSED)를
 * catch로 스킵 — 원본 legacy의 skipRemotes 동작과 등가.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');

const REMOTE_APPS = ['fca', 'ipron', 'aoe', 'stt', 'ivr', 'insight', 'taskboard', 'campaign', 'vel'];

/** 앱 이름 → pnpm 워크스페이스 패키지명 */
const packageName = (app) => (app === 'host' ? '@bridgetec/ui-host' : `@bridgetec/ui-remote-${app}`);

/**
 * LAN IPv4 주소를 자동 감지합니다.
 *
 * 외부(사내망 등)에서 IP로 host에 접속할 때, remote들도 이 IP로 해석되도록
 * host rsbuild.config.ts에 MF_REMOTE_HOST 환경변수로 전달합니다.
 * 사설망 대역(192.168.x / 10.x / 172.16~31.x)을 우선 선택합니다.
 *
 * MF_REMOTE_HOST 환경변수가 이미 지정돼 있으면(예: VPN·가상 어댑터가 많아
 * 자동 감지가 엉뚱한 IP를 고를 때) 그 값을 그대로 사용합니다.
 */
function detectRemoteHost() {
  if (process.env.MF_REMOTE_HOST) return process.env.MF_REMOTE_HOST.trim();

  const candidates = [];
  for (const ifaceList of Object.values(os.networkInterfaces())) {
    for (const iface of ifaceList || []) {
      if (iface.family === 'IPv4' && !iface.internal) candidates.push(iface.address);
    }
  }
  const privateIp = candidates.find((ip) => /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip));
  return privateIp || candidates[0] || null;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function showMenu() {
  console.log('\n🎯 Host 앱과 함께 실행할 Remote 앱을 선택해주세요:');
  console.log('  1. 모든 Remote 앱 실행');
  console.log('  2. Remote 앱 없이 Host만 실행 (manager는 항상 포함)');
  REMOTE_APPS.forEach((app, i) => console.log(`  ${i + 3}. ${app}`));
}

function parseSelection(input) {
  // 구분자는 콤마·공백 모두 허용. PowerShell→pnpm 경로에서 `3,4,8`이 단일 인자
  // `"3 4 8"`(공백 구분)로 전달되는 케이스까지 흡수한다.
  const selections = input
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((s) => parseInt(s, 10));
  const selected = [];

  // 1(모든 Remote)·2(Host만)는 단독 선택 전용. 다른 번호와 함께 입력하면 의미가 모순됨.
  if ((selections.includes(1) || selections.includes(2)) && selections.length > 1) {
    throw new Error('❌ 1(모든 Remote) 또는 2(Host만)는 다른 번호와 함께 선택할 수 없습니다. 단독으로 입력해주세요.');
  }

  for (const num of selections) {
    if (isNaN(num) || num < 1 || num > REMOTE_APPS.length + 2) throw new Error(`❌ 잘못된 번호입니다: ${num} (1~${REMOTE_APPS.length + 2} 사이의 숫자를 입력해주세요)`);

    if (num === 1) return Array.from(new Set(['manager', ...REMOTE_APPS]));
    else if (num === 2) return ['manager'];
    else selected.push(REMOTE_APPS[num - 3]);
  }

  return Array.from(new Set(['manager', ...selected]));
}

function buildCommand(selectedRemotes) {
  const apps = ['host', ...selectedRemotes];
  const filters = apps.map((app) => `--filter=${packageName(app)}`);
  // turbo 기본 동시성(10)이 persistent dev 태스크 수보다 작으면 기동 거부 — 앱 수 + 여유 1로 상향
  const concurrency = Math.max(apps.length + 1, 10);
  // turbo 2 기본 strict env mode는 미선언 환경변수를 태스크에 전달하지 않는다.
  // serve 경로는 SERVE_OPEN·MF_REMOTE_HOST에 더해 serve-host.local.json의 임의 env 키까지
  // 전달해야 하므로(원본 nx 동작) loose로 실행 — dev는 cache:false라 캐시 정합성 비용 없음.
  return `npx turbo run dev --env-mode=loose --concurrency=${concurrency} ${filters.join(' ')}`;
}

/**
 * scripts/serve-host.local.json — 개인 PC 전용 serve 옵션 override.
 * .gitignore 처리되어 커밋되지 않음.
 *
 * 포맷:
 *   {
 *     "env": {
 *       "NODE_OPTIONS": "--max-old-space-size=8192",
 *       "MF_REMOTE_HOST": "192.168.1.10"
 *     }
 *   }
 *
 * env 블록의 키는 자식 프로세스 환경변수에 머지됨. 셸에서 이미 export된
 * 값이 항상 우선이므로, 이미 존재하는 키는 덮어쓰지 않음. env 외 키는
 * 향후 스크립트 자체 옵션을 위해 예약(현재는 미사용).
 */
const LOCAL_CONFIG_PATH = path.join(__dirname, 'serve-host.local.json');
function applyLocalConfigEnv() {
  if (!fs.existsSync(LOCAL_CONFIG_PATH)) return [];
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(LOCAL_CONFIG_PATH, 'utf-8'));
  } catch (e) {
    console.warn(`⚠️  serve-host.local.json 로드 실패 (${e.message}). 무시하고 진행합니다.`);
    return [];
  }
  const env = parsed && typeof parsed === 'object' && parsed.env && typeof parsed.env === 'object' ? parsed.env : null;
  if (!env) return [];
  const applied = [];
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] !== undefined) continue;
    process.env[k] = String(v);
    applied.push(k);
  }
  return applied;
}

function runServe(answer) {
  try {
    const selectedRemotes = parseSelection(answer);
    const command = buildCommand(selectedRemotes);
    const remoteHost = detectRemoteHost();

    console.log(`\n🚀 실행할 명령어: ${command}`);
    console.log(`✅ 선택된 Remote: ${selectedRemotes.length > 0 ? selectedRemotes.join(', ') : '없음'}`);
    if (remoteHost) {
      console.log(`🌐 외부 접속 IP: ${remoteHost} (다른 PC에서 http://${remoteHost}:4200 으로 접속 가능)`);
      console.log('   ↳ 감지된 IP가 잘못됐다면 MF_REMOTE_HOST 환경변수로 직접 지정하세요.');
    } else {
      console.log('🌐 LAN IP를 감지하지 못해 remote는 localhost로 동작합니다.');
    }

    console.log('\n⏳ Host 앱을 시작하고 있습니다...');
    rl.close();

    const childEnv = { ...process.env };
    if (remoteHost) childEnv.MF_REMOTE_HOST = remoteHost;
    // 브라우저 자동 열기는 serve 경유 시에만 (host rsbuild.config.ts가 SERVE_OPEN을 읽음).
    // SERVE_NO_OPEN이 지정돼 있으면 원본과 동일하게 열지 않음.
    if (!process.env.SERVE_NO_OPEN) childEnv.SERVE_OPEN = '1';

    const child = spawn(command, [], {
      stdio: 'inherit',
      shell: true,
      windowsHide: true,
      env: childEnv,
    });

    process.on('SIGINT', () => {
      console.log('\n\n🛑 서버를 종료하는 중...');
      child.kill('SIGTERM');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      child.kill('SIGTERM');
      process.exit(0);
    });

    child.on('exit', (code) => {
      process.exit(code);
    });
  } catch (error) {
    console.error(`\n${error.message}`);
    console.log('💡 다시 시도해주세요.');
    rl.close();
  }
}

function serveHost() {
  const applied = applyLocalConfigEnv();
  if (applied.length > 0) console.log(`📄 serve-host.local.json 적용: ${applied.join(', ')}`);

  // PowerShell은 `pnpm serve 3,4,8`의 `3,4,8`을 배열 연산자로 해석해 인자 3개로
  // 쪼갠다. slice(2).join(',')으로 흩어진 인자를 다시 합쳐 따옴표 유무와 무관하게 처리.
  const cliArg = process.argv.slice(2).join(',');

  if (cliArg) {
    console.log(`\n📥 인자로 전달된 선택: ${cliArg}`);
    runServe(cliArg);
    return;
  }

  showMenu();

  rl.question('\n📝 번호를 입력하세요 (여러 개 선택 시 쉼표로 구분, 예: 3,4): ', runServe);
}

serveHost();
