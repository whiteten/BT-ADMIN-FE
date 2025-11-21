#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 변경된 파일 목록
const changedFiles = process.argv.slice(2).filter((file) => file.endsWith('.ts') || file.endsWith('.tsx'));

if (changedFiles.length === 0) {
  console.log('No TypeScript files to check.');
  process.exit(0);
}

// 프로젝트별로 파일 그룹화
const projectFiles = {};

changedFiles.forEach((file) => {
  // Handle both relative and absolute paths by extracting the project part
  const match = file.match(/(apps\/[^/]+|libs\/[^/]+)/);
  if (match) {
    const projectPath = match[1];
    const tsconfigPath = path.join(projectPath, 'tsconfig.json');

    // tsconfig.json이 존재하는 프로젝트만 처리
    if (fs.existsSync(tsconfigPath)) {
      if (!projectFiles[projectPath]) {
        projectFiles[projectPath] = [];
      }
      projectFiles[projectPath].push(file);
    }
  }
});

const projectNames = Object.keys(projectFiles);
if (projectNames.length === 0) {
  console.log('No project TypeScript files found in changed files.');
  process.exit(0);
}

const totalFiles = changedFiles.filter((f) => f.match(/(apps\/[^/]+|libs\/[^/]+)/)).length;
console.log(`Type checking ${totalFiles} files across ${projectNames.length} projects...`);

let hasErrors = false;

// 각 프로젝트별로 타입 검사
for (const projectPath of projectNames) {
  const files = projectFiles[projectPath];
  const tempConfigPath = `.tsconfig.temp.${projectPath.replace('/', '-')}.json`;

  try {
    // 해당 프로젝트의 tsconfig를 extends
    const tempConfig = {
      extends: `./${projectPath}/tsconfig.json`,
      files,
      include: [`./${projectPath}/src/**/*.d.ts`],
      compilerOptions: {
        noEmit: true,
      },
    };

    fs.writeFileSync(tempConfigPath, JSON.stringify(tempConfig, null, 2));

    console.log(`\nType checking ${projectPath} (${files.length} files):`);
    execSync(`pnpm exec tsc --project ${tempConfigPath}`, { stdio: 'inherit' });
  } catch (error) {
    hasErrors = true;
  } finally {
    // 임시 파일 정리
    if (fs.existsSync(tempConfigPath)) {
      fs.unlinkSync(tempConfigPath);
    }
  }
}

if (hasErrors) {
  process.exit(1);
} else {
  console.log('\n✅ Type checking passed!');
}
