import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigationStore, useOpenTabsStore } from '@/shared-store';
import type { NaviApp, NaviMenuItem } from '@/libs/shared-api/src/lib/types/navi.types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

/**
 * 운영자 모드 해제 가드.
 *
 * 운영자 전용 메뉴(featureFlag='operator')는 일반 콘솔에서 접근할 수 없으므로,
 * 운영자 모드를 끄거나(일반 콘솔로 나가기) 테넌트를 전환할 때 열려 있는 운영자 전용 탭을 정리해야 한다.
 * 해당 탭이 하나라도 열려 있으면 어떤 탭이 닫히는지 알리고 확인을 받은 뒤에만 전환한다.
 */

/**
 * 운영자 전용 메뉴의 절대 경로 목록 — 네비게이션 원본 트리(필터 이전) 기준.
 * 메뉴 path 는 앱 상대 경로('line/endpoint')이므로 appId 를 붙여 탭 url('/ipron/line/endpoint') 형식으로 맞춘다.
 */
function collectOperatorPaths(apps: NaviApp[]): string[] {
  const paths: string[] = [];
  const walk = (items: NaviMenuItem[], appId: string, inheritedOperator: boolean) => {
    for (const m of items) {
      const isOperator = inheritedOperator || m.featureFlag === 'operator';
      if (isOperator && m.path) {
        const rel = m.path.replace(/^\/+/, '');
        paths.push(rel.startsWith(`${appId}/`) ? `/${rel}` : `/${appId}/${rel}`);
      }
      if (m.children?.length) walk(m.children, appId, isOperator);
    }
  };
  for (const app of apps) walk(app.menus, app.appId, false);
  return paths;
}

/** 탭 url 이 운영자 전용 path 에 속하는지 — 하위 경로(상세/등록)도 포함. */
function isOperatorUrl(url: string, operatorPaths: string[]): boolean {
  const pathname = url.split('?')[0];
  return operatorPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function useOperatorTabGuard() {
  const navigate = useNavigate();
  const modal = useModal();
  const apps = useNavigationStore((s) => s.apps);
  const tabs = useOpenTabsStore((s) => s.tabs);
  const closeTab = useOpenTabsStore((s) => s.closeTab);

  /**
   * 운영자 전용 탭이 열려 있으면 확인을 받고 모두 닫은 뒤 `proceed` 실행.
   * 열려 있지 않으면 확인 없이 바로 실행.
   *
   * 운영자 전용 화면을 보고 있었다면 홈('/')으로 이동시킨 뒤 닫는다. 테넌트 전환처럼
   * 곧바로 리로드하는 경우에도 이동이 먼저라 리로드 대상 url 이 홈이 된다.
   *
   * @param proceed 실제 전환 동작(운영자 모드 해제 / 테넌트 전환)
   */
  const withOperatorTabCleanup = useCallback(
    (proceed: () => void) => {
      const operatorPaths = collectOperatorPaths(apps);
      const operatorTabs = tabs.filter((t) => isOperatorUrl(t.url, operatorPaths));

      if (operatorTabs.length === 0) {
        proceed();
        return;
      }

      const labels = operatorTabs.map((t) => t.label).join(', ');
      modal.confirm.execute({
        onOk: () => {
          const ids = operatorTabs.map((t) => t.id);
          const activeId = useOpenTabsStore.getState().activeId;
          const activeIsOperator = activeId != null && ids.includes(activeId);

          // ⚠️ 순서 주의 — 이동이 먼저다.
          // 운영자 경로에 머문 채로 탭을 닫으면 활성 탭이 사라지고, useTabSync 가 "활성 탭 없음"으로 보고
          // 현재(운영자) 경로에 대해 탭을 새로 부트스트랩한다(닫은 탭이 곧바로 되살아남).
          // 따라서 홈으로 먼저 이동하고(= 탭으로 추적하지 않는 위치), 이동이 커밋된 뒤에 닫는다.
          if (activeIsOperator) navigate('/', { replace: true });
          proceed();
          setTimeout(() => {
            for (const id of ids) closeTab(id);
          }, 0);
        },
        options: {
          title: '운영자 전용 화면 닫기',
          content: `일반 콘솔에서는 운영자 전용 화면을 열어둘 수 없습니다. 열려 있는 운영자 전용 탭 ${operatorTabs.length}개(${labels})가 닫힙니다. 계속할까요?`,
          okText: '전환',
          cancelText: '취소',
        },
      });
    },
    [apps, tabs, closeTab, modal, navigate],
  );

  return { withOperatorTabCleanup };
}
