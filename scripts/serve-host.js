#!/usr/bin/env node

const { spawn } = require('child_process');
const readline = require('readline');

const REMOTE_APPS = ['fca', 'ipron', 'aoe', 'stt', 'ivr'];

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
  let command = 'nx serve host --open';

  if (selectedRemotes.length > 0) command += ` --devRemotes=${selectedRemotes.join(',')}`;
  if (skipRemotes.length > 0) command += ` --skipRemotes=${skipRemotes.join(',')}`;

  return command;
}

function runServe(answer) {
  try {
    const selectedRemotes = parseSelection(answer);
    const command = buildCommand(selectedRemotes);

    console.log(`\n🚀 실행할 명령어: ${command}`);
    console.log(`✅ 선택된 Remote: ${selectedRemotes.length > 0 ? selectedRemotes.join(', ') : '없음'}`);

    console.log('\n⏳ Host 앱을 시작하고 있습니다...');
    rl.close();

    const child = spawn(command, [], { stdio: 'inherit', shell: true, windowsHide: true });

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
