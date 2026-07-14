/**
 * 캠페인 앱 단독 서빙(standalone dev) 시 프록시 설정.
 * /api/** 요청을 캠페인 BE(:8903)로 직접 전달한다(데모용 — BFF/auth 우회).
 */
module.exports = [
  { context: ['/api'], target: 'http://localhost:8903', secure: false, changeOrigin: true },
];
