import { Link, useLocation } from 'react-router-dom';
import { Breadcrumb, type BreadcrumbProps } from 'antd';
import { Home } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { cn } from '@/lib/utils';

export default function BreadcrumbSlot() {
  const { pathname } = useLocation();
  const items = useBreadcrumbStore((s) => s.items);
  const params = useBreadcrumbStore((s) => s.params);

  if (!items || items.length === 0) return null;

  const firstSegment = pathname.split('/').filter(Boolean)[0];
  const homePath = firstSegment ? `/${firstSegment}` : '/';
  const itemsWithHome: BreadcrumbProps['items'] = [{ path: homePath }, ...items];

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
