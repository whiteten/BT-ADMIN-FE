#!/usr/bin/env node

const { spawn } = require('child_process');
const os = require('os');
const readline = require('readline');

const REMOTE_APPS = ['fca', 'ipron', 'aoe', 'stt', 'ivr', 'insight'];

/**
 * LAN IPv4 주소를 자동 감지합니다.
 *
 * 외부(사내망 등)에서 IP로 host에 접속할 때, remote들도 이 IP로 해석되도록
 * module-federation.config.ts에 MF_REMOTE_HOST 환경변수로 전달합니다.
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
  const selections = input
    .trim()
    .split(',')
    .map((s) => parseInt(s.trim()));
  const selected = [];

  for (const num of selections) {
    if (isNaN(num) || num < 1 || num > REMOTE_APPS.length + 2) throw new Error(`❌ 잘못된 번호입니다: ${num} (1~${REMOTE_APPS.length + 2} 사이의 숫자를 입력해주세요)`);

    if (num === 1) return Array.from(new Set(['manager', ...REMOTE_APPS]));
    else if (num === 2) return ['manager'];
    else selected.push(REMOTE_APPS[num - 3]);
  }

  return Array.from(new Set(['manager', ...selected]));
}

function buildCommand(selectedRemotes) {
  const skipRemotes = REMOTE_APPS.filter((app) => !selectedRemotes.includes(app));
  let command = 'nx serve host --open --host=0.0.0.0';

  if (selectedRemotes.length > 0) command += ` --devRemotes=${selectedRemotes.join(',')}`;
  if (skipRemotes.length > 0) command += ` --skipRemotes=${skipRemotes.join(',')}`;

  return command;
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

    const child = spawn(command, [], {
      stdio: 'inherit',
      shell: true,
      windowsHide: true,
      env: remoteHost ? { ...process.env, MF_REMOTE_HOST: remoteHost } : process.env,
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
  const cliArg = process.argv[2];

  if (cliArg) {
    console.log(`\n📥 인자로 전달된 선택: ${cliArg}`);
    runServe(cliArg);
    return;
  }

  showMenu();

  rl.question('\n📝 번호를 입력하세요 (여러 개 선택 시 쉼표로 구분, 예: 3,4): ', runServe);
}

serveHost();
