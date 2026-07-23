/**
 * rsbuild `source.define`으로 빌드 시 주입되는 전역 상수 선언.
 *
 * - `__APP_NAME__`: 앱 폴더명 (remote: tools/rsbuild/remote-config.ts,
 *   host: apps/host/rsbuild.config.ts). 각 앱 번들에서 치환되므로 앱 소스에서만
 *   읽을 것 — libs(MF 공유 싱글턴)에서 읽으면 공급자 앱 값이 박힌다.
 */
declare const __APP_NAME__: string;
