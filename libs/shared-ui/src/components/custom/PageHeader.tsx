import { Link, useLocation } from 'react-router-dom';
import { Breadcrumb, type BreadcrumbProps } from 'antd';
import { Home } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  breadcrumb: BreadcrumbProps['items'];
  params?: BreadcrumbProps['params'] | undefined;
}

export default function PageHeader({ breadcrumb, params }: PageHeaderProps) {
  const { pathname } = useLocation();
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  const homePath = firstSegment ? `/${firstSegment}` : '/';

  const itemsWithHome: BreadcrumbProps['items'] = [{ path: homePath }, ...(breadcrumb ?? [])];

  const itemRender: BreadcrumbProps['itemRender'] = (item, _params, items) => {
    if (item === items[0]) {
      return (
        <Link to={item.path ?? '/'} title="Home" className="flex items-center !text-[#495057] !p-0.5">
          <Home className="h-4 w-4" />
        </Link>
      );
    }

    const hasPlaceholder = typeof item.title === 'string' && /:(\w+)/.test(item.title);
    const resolvedTitle = typeof item.title === 'string' ? item.title.replace(/:(\w+)/g, (_match, p1) => _params[p1] ?? '') : item.title;
    const isResolved = hasPlaceholder && resolvedTitle && !String(resolvedTitle).includes(':');
    const className = cn('text-[13px] max-w-[150px] truncate !p-0.5', isResolved ? '!text-[var(--color-bt-primary)] font-bold' : '!text-[#495057] font-medium');
    const titleAttr = typeof resolvedTitle === 'string' && isResolved ? resolvedTitle : '';

    // path가 없으면 비링크 텍스트로 렌더 (redirect-only 부모 등에서 의도적으로 path를 비울 때 활용).
    // a 태그와 line-box를 맞추기 위해 inline-block + leading-none + align-middle을 박는다.
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

  return <Breadcrumb items={itemsWithHome} itemRender={itemRender} params={params} styles={{ item: { display: 'flex', alignItems: 'center', fontSize: 13 } }} />;
}
