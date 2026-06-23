import { useMenuStore, useRemoteAvailabilityStore } from '@/shared-store';

/**
 * AI 에이전트 채팅 노출 가능 여부. 트리거 버튼(TopHeader)과 패널 본체(Layout)가 공유한다.
 *
 * 두 조건을 모두 충족해야 한다:
 * 1) aoe remote 가 메뉴(menuConfigs)에 등록됨 — 운영자가 메뉴로 노출을 끄면 숨김.
 * 2) aoe remote 가 실제 기동(availableRemotes) — 미기동/로드 실패 시 죽은 버튼 방지.
 * TODO: 추후 aoe 에이전트 조회 권한 체크와 결합.
 */
export function useCanUseAgentChat() {
  const isAoeInMenu = useMenuStore((s) => s.menuConfigs.some((m) => m.appId === 'aoe'));
  const isAoeAvailable = useRemoteAvailabilityStore((s) => s.availableRemotes.aoe === true);
  return isAoeInMenu && isAoeAvailable;
}
