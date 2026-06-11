/**
 * 런타임 config(public/config.js → window.__CONFIG__) 적용 SoT.
 * root.render() 전에 1회 호출되어 깜빡임(FOUC) 없이 반영된다.
 */
export function applyRuntimeConfig() {
  const config = window.__CONFIG__ ?? {};

  // 헤더(TopHeader·SubHeader) 배경색 — 값이 없으면 global.css 기본값(--color-bt-primary) 유지
  if (config.headerBgColor) {
    document.documentElement.style.setProperty('--color-bt-header', config.headerBgColor);
  }
}
