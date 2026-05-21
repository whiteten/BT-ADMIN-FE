/**
 * ⚠️ host 개발 서버 proxy 설정 (공유본 — git 추적됨).
 *
 * 개인 PC에서 다른 서버를 바라보려면 이 파일을 직접 고치지 마세요.
 * 고쳐서 커밋하면 다른 사람의 개발 환경이 깨집니다.
 *
 * 대신 이 디렉토리에 proxy.config.local.json 을 만들어 본인 서버 target만 적으면 됩니다.
 * (proxy.config.local.json 은 .gitignore 처리되어 커밋되지 않습니다.)
 *
 *   // apps/host/proxy.config.local.json
 *   { "target": "http://192.168.0.x:8501" }
 *
 * 이 파일이 있으면 아래 모든 proxy 항목의 target 을 해당 값으로 덮어씁니다.
 * /api·/ws 같은 context 구조 변경만 이 파일(공유본)에서 합니다.
 */
const fs = require('fs');
const path = require('path');

// 공유 기본 proxy 설정
const config = [
  { context: ['/api'], target: 'http://localhost:8080', secure: false, changeOrigin: true },
  { context: ['/ws'], target: 'http://localhost:8080', secure: false, changeOrigin: true, ws: true },
];

// 개인 override (proxy.config.local.json) 가 있으면 target 만 교체
const localPath = path.join(__dirname, 'proxy.config.local.json');
if (fs.existsSync(localPath)) {
  const local = JSON.parse(fs.readFileSync(localPath, 'utf8'));
  if (local.target) {
    config.forEach((entry) => {
      entry.target = local.target;
    });
  }
}

module.exports = config;
