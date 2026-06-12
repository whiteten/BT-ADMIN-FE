/**
 * 현장 커스텀 오버라이드 목록 (SoT).
 *
 * - key: '<appId>/<path>' — DynamicElement 소켓의 (appId, path) 및 MF exposes 키와 1:1 매칭.
 *   host가 부팅 시 이 목록을 읽어 화면 지정 관리 picker 카탈로그에 '커스텀' 카드로 노출한다.
 *   실제 적용은 운영자가 picker에서 커스텀 카드를 지정(componentKey 'site:<appId>/<path>')했을
 *   때만 이루어지며, 미지정 화면은 항상 표준으로 렌더된다.
 * - value: picker 카드에 표시할 메타.
 *
 * ⚠️ 오버라이드를 추가/제거할 때는 module-federation.config.ts의 exposes에
 *    동일한 키('./<appId>/<path>')를 함께 추가/제거할 것.
 */
export interface SiteOverrideMeta {
  label: string;
  description?: string;
}

export const siteOverrides: Record<string, SiteOverrideMeta> = {
  // 예시:
  // 'fca/bot-config/bot/list': {
  //   label: '봇 목록 (커스텀)',
  //   description: '표준 봇 목록에 ○○ 기능을 추가한 커스텀 화면',
  // },
};
