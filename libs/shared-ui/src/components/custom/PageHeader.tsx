import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb, type BreadcrumbProps } from 'antd';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  breadcrumb: BreadcrumbProps['items'];
  params?: BreadcrumbProps['params'] | undefined;
  extra?: ReactNode;
}

export default function PageHeader({ breadcrumb, params, extra }: PageHeaderProps) {
  const itemRender: BreadcrumbProps['itemRender'] = (item, _params, items) => {
    const hasPlaceholder = typeof item.title === 'string' && /:(\w+)/.test(item.title);
    const resolvedTitle = typeof item.title === 'string' ? item.title.replace(/:(\w+)/g, (_match, p1) => _params[p1] ?? '') : item.title;
    const isResolved = hasPlaceholder && resolvedTitle && !String(resolvedTitle).includes(':');
    return (
      <Link
        to={item.path ?? '#'}
        title={typeof resolvedTitle === 'string' && isResolved ? resolvedTitle : ''}
        className={cn('text-[15px] max-w-[150px] truncate', isResolved ? '!text-[var(--color-bt-primary)] font-bold' : '!text-[#495057] font-medium')}
      >
        {resolvedTitle}
      </Link>
    );
  };

  return (
    <header className="flex items-center justify-between bg-white bt-shadow flex-wrap py-2.5 gap-y-1 min-h-[58px]">
      <div className="shrink-0 flex items-center gap-5 px-7">
        <Breadcrumb items={breadcrumb} itemRender={itemRender} params={params} />
      </div>
      {extra && <div className="min-w-0 px-7">{extra}</div>}
    </header>
  );
}
