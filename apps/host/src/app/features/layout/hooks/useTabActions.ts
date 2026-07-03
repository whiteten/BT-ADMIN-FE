import { useNavigate } from 'react-router-dom';
import { type OpenTab, useOpenTabsStore } from '@/shared-store';

/**
 * 탭 조작(활성화·복제·닫기 계열)과 그에 따른 화면 이동을 묶은 액션 훅.
 * "스토어 액션 호출 후 nextPath가 있으면 navigate" 결합 로직의 단일 소유자 —
 * TabChip·TabOverflowMenu·TabContextMenuContent가 공용한다.
 */
export function useTabActions() {
  const navigate = useNavigate();
  const openTab = useOpenTabsStore((s) => s.openTab);
  const activateTab = useOpenTabsStore((s) => s.activateTab);
  const closeTab = useOpenTabsStore((s) => s.closeTab);
  const closeOthers = useOpenTabsStore((s) => s.closeOthers);
  const closeToRight = useOpenTabsStore((s) => s.closeToRight);
  const closeAll = useOpenTabsStore((s) => s.closeAll);

  const goIfNeeded = (result: { nextPath: string | null }) => {
    if (result.nextPath) navigate(result.nextPath);
  };

  return {
    /** 탭 활성화 + 그 url로 이동(탭 클릭). */
    activate: (tab: OpenTab) => {
      activateTab(tab.id);
      navigate(tab.url);
    },
    /**
     * 탭 복제 — 대상 탭의 meta(url·라벨·isDynamic)로 새 탭을 열어 활성화하고 그 url로 이동한다.
     * openTab이 중복 탭 생성을 지원하므로(같은 url 별개 id) 브라우저 '탭 복제'와 동일: 내용은 별개
     * keepAlive 노드라 새로 로드되고 입력·스크롤 등 상태는 원본과 공유하지 않는다.
     */
    duplicate: (tab: OpenTab) => {
      openTab({ appId: tab.appId, url: tab.url, label: tab.label, isDynamic: tab.isDynamic });
      navigate(tab.url);
    },
    /** 탭 닫기. 활성 탭이었다면 승계 탭(또는 '/')으로 이동. */
    close: (id: string) => goIfNeeded(closeTab(id)),
    /** id 탭만 남기고 닫기. 활성이 바뀌면 이동. */
    closeOthers: (id: string) => goIfNeeded(closeOthers(id)),
    /** id 오른쪽 탭 전부 닫기. 활성이 잘렸으면 id 탭으로 이동. */
    closeToRight: (id: string) => goIfNeeded(closeToRight(id)),
    /** 모두 닫기 — 항상 '/'로 이동. */
    closeAll: () => goIfNeeded(closeAll()),
  };
}
