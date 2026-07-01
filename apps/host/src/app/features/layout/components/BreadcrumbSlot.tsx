import { Link, useLocation } from 'react-router-dom';
import { Breadcrumb, type BreadcrumbProps } from 'antd';
import { Home } from 'lucide-react';
import { useBreadcrumbStore, useOpenTabsStore } from '@/shared-store';
import useCurrentRemote from '../../../hooks/useCurrentRemote';
import { cn } from '@/lib/utils';

export default function BreadcrumbSlot() {
  const { pathname } = useLocation();
  // 렌더 SoT는 활성 탭의 breadcrumb 스냅샷(useTabSync가 미러). keep-alive로 재방문 페이지가
  // breadcrumb을 다시 쓰지 않아도 탭별로 보존된 값을 표시한다. 비탭/chromeless·첫 동기 set 등
  // 스냅샷이 아직 없는 경우엔 전역 store(페이지가 직접 쓴 값)로 폴백한다.
  const snapshot = useOpenTabsStore((s) => (s.activeId ? s.breadcrumbsById[s.activeId] : undefined));
  const globalItems = useBreadcrumbStore((s) => s.items);
  const globalParams = useBreadcrumbStore((s) => s.params);
  const items = snapshot?.items ?? globalItems;
  const params = snapshot?.params ?? globalParams;
  const remote = useCurrentRemote();

  // host index('/')는 어느 탭에도 머물지 않는 위치 → breadcrumb 미표시(활성 탭 해제와 짝).
  // 안 그러면 keep-alive로 안 지워진 직전 페이지 breadcrumb이 홈에서 잔존.
  if (pathname === '/') return null;
  if (!items || items.length === 0) return null;

  const firstSegment = pathname.split('/').filter(Boolean)[0];
  const homePath = firstSegment ? `/${firstSegment}` : '/';
  // Home 아이콘 + remote appName(비링크) + 페이지 카테고리/leaf 순으로 합성.
  // appName은 useCurrentRemote().appName에서 자동 prepend되므로 페이지에서 직접 적지 않는다.
  const itemsWithHome: BreadcrumbProps['items'] = [{ path: homePath }, ...(remote ? [{ title: remote.appName }] : []), ...items];

  const itemRender: BreadcrumbProps['itemRender'] = (item, _params, list) => {
    if (item === list[0]) {
      return (
        <Link to={item.path ?? '/'} title="Home" className="flex items-center !text-white/70 hover:!text-white !p-0.5">
          <Home className="h-4 w-4" />
        </Link>
      );
    }

    const hasPlaceholder = typeof item.title === 'string' && /:(\w+)/.test(item.title);
    const resolvedTitle = typeof item.title === 'string' ? item.title.replace(/:(\w+)/g, (_match, p1) => _params[p1] ?? '') : item.title;
    const isResolved = hasPlaceholder && resolvedTitle && !String(resolvedTitle).includes(':');
    const className = cn('text-[13px] max-w-[150px] truncate !p-0.5', isResolved ? '!text-white font-bold' : '!text-white/70 hover:!text-white font-medium');
    const titleAttr = typeof resolvedTitle === 'string' && isResolved ? resolvedTitle : '';

    if (!item.path) {
      return (
        <span title={titleAttr} className={cn(className, 'inline-block leading-none align-middle')}>
          {resolvedTitle}
        </span>
      );
    }

    return (
      <Link to={item.path} title={titleAttr} className={className}>
        {resolvedTitle}
      </Link>
    );
  };

  return (
    <>
      <div className="h-6 w-px bg-white/10 shrink-0" />
      <div className="shrink-0 flex items-center">
        <Breadcrumb
          items={itemsWithHome}
          itemRender={itemRender}
          params={params}
          separator={<span className="text-white/30">&gt;</span>}
          styles={{ item: { display: 'flex', alignItems: 'center', fontSize: 13 } }}
        />
      </div>
    </>
  );
}
