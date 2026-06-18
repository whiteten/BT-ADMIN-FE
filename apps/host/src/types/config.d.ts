/** public/config.js가 세팅하는 런타임 설정 — 빌드 없이 배포 환경에서 교체 가능 */
interface RuntimeConfig {
  /** TopHeader·SubHeader 배경색 (CSS color 값, 예: '#1f2937'). 미지정 시 --color-bt-primary 사용 */
  headerBgColor?: string;
}

declare global {
  interface Window {
    __CONFIG__?: RuntimeConfig;
  }
}

export {};
