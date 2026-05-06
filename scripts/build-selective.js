#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');
const fs = require('fs-extra');

// 사용 가능한 앱 목록
const APPS = ['host', 'manager', 'fca'];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function showMenu() {
  console.log('\n🎯 빌드할 앱을 선택해주세요:');
  console.log('  1. 모든 앱 빌드');
  APPS.forEach((app, i) => console.log(`  ${i + 2}. ${app}`));
}

function parseSelection(input) {
  const selections = input
    .trim()
    .split(',')
    .map((s) => parseInt(s.trim()));
  const selected = [];

  for (const num of selections) {
    if (isNaN(num) || num < 1 || num > APPS.length + 1) {
      throw new Error(`❌ 잘못된 번호입니다: ${num} (1~${APPS.length + 1} 사이의 숫자를 입력해주세요)`);
    }

    if (num === 1) {
      return [...APPS];
    } else {
      selected.push(APPS[num - 2]);
    }
  }

  return Array.from(new Set(selected));
}

async function runCommand(command, description) {
  console.log(`\n⏳ ${description}...`);
  console.log(`   명령어: ${command}`);

  return new Promise((resolve, reject) => {
    const child = spawn(command, [], {
      stdio: 'inherit',
      shell: true,
      windowsHide: true,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        console.log(`✅ ${description} 완료`);
        resolve();
      } else {
        reject(new Error(`${description} 실패 (exit code: ${code})`));
      }
    });

    child.on('error', (err) => {
      reject(new Error(`${description} 실행 중 오류: ${err.message}`));
    });
  });
}

async function cleanDist() {
  const distPath = path.join(__dirname, '..', 'dist');

  if (fs.existsSync(distPath)) {
    console.log('\n🗑️  기존 dist 폴더 삭제 중...');
    await fs.remove(distPath);
    console.log('✅ dist 폴더 삭제 완료');
  }
}

async function copyRemotesToHost(selectedApps) {
  // host가 선택되지 않았으면 복사하지 않음
  if (!selectedApps.includes('host')) {
    console.log('\n📦 host가 빌드 목록에 없어 remote 복사를 건너뜁니다.');
    return;
  }

  // host를 제외한 remote 앱들
  const remoteApps = selectedApps.filter((app) => app !== 'host');

  if (remoteApps.length === 0) {
    console.log('\n📦 복사할 remote 앱이 없습니다.');
    return;
  }

  const distPath = path.join(__dirname, '..', 'dist', 'apps');
  const hostPath = path.join(distPath, 'host');
  const remotesPath = path.join(hostPath, 'remotes');

  console.log('\n📦 Remote 앱들을 host/remotes로 복사 중...');

  // remotes 폴더 생성
  await fs.ensureDir(remotesPath);

  for (const app of remoteApps) {
    const sourcePath = path.join(distPath, app);
    const targetPath = path.join(remotesPath, app);

    if (fs.existsSync(sourcePath)) {
      console.log(`   ${app}: ${sourcePath} → ${targetPath}`);
      await fs.copy(sourcePath, targetPath);
      console.log(`   ✅ ${app} 복사 완료`);
    } else {
      console.warn(`   ⚠️  ${app} 빌드 결과를 찾을 수 없습니다: ${sourcePath}`);
    }
  }

  console.log('✅ 모든 remote 앱 복사 완료');
}

async function runBuild(answer) {
  try {
    const selectedApps = parseSelection(answer);

    console.log(`\n✅ 선택된 앱: ${selectedApps.join(', ')}`);
    console.log('\n🚀 빌드를 시작합니다...');

    // 1. nx reset 실행 -> 메모리 이슈 방지를 위해 주석 처리
    // await runCommand('nx reset', 'Nx 캐시 초기화');

    // 2. dist 폴더 삭제
    await cleanDist();

    // 3. 선택한 앱들 빌드 (순차적으로 빌드하여 메모리 이슈 방지)
    const projects = selectedApps.join(',');
    const buildCommand = `nx run-many --target=build --projects=${projects} --parallel=1`;
    await runCommand(buildCommand, `앱 빌드 (${projects})`);

    // 4. host가 포함된 경우 remote들을 host/remotes로 복사
    await copyRemotesToHost(selectedApps);

    console.log('\n🎉 모든 작업이 완료되었습니다!');
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ 오류 발생: ${error.message}`);
    rl.close();
    process.exit(1);
  }
}

async function buildApps() {
  const cliArg = process.argv[2];

  if (cliArg) {
    console.log(`\n📥 인자로 전달된 선택: ${cliArg}`);
    await runBuild(cliArg);
    return;
  }

  showMenu();

  rl.question('\n📝 번호를 입력하세요 (여러 개 선택 시 쉼표로 구분, 예: 2,3,4): ', runBuild);
}

// Ctrl+C 처리
process.on('SIGINT', () => {
  console.log('\n\n🛑 빌드를 취소합니다...');
  rl.close();
  process.exit(0);
});

// 스크립트 실행
buildApps();
