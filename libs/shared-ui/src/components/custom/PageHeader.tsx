import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb, type BreadcrumbProps, Divider } from 'antd';

interface PageHeaderProps {
  title: string;
  breadcrumb: BreadcrumbProps['items'];
  extra?: ReactNode;
}

export default function PageHeader({ title, breadcrumb, extra }: PageHeaderProps) {
  const itemRender: BreadcrumbProps['itemRender'] = (item, _params, items) => {
    return !item.path ? (
      <span className="text-sm text-[#495057]">{item.title}</span>
    ) : (
      <Link to={item.path} className="text-sm text-[#495057]">
        {item.title}
      </Link>
    );
  };

  return (
    <header className="flex items-center justify-between bg-white bt-shadow flex-wrap py-2.5 gap-y-1">
      <div className="shrink-0 flex items-center gap-5 px-7">
        <span className="text-[20px] font-bold text-[#495057]">{title}</span>
        <Divider orientation="vertical" className="!m-0 !h-5" />
        <Breadcrumb items={breadcrumb} itemRender={itemRender} />
      </div>
      {extra && <div className="min-w-0 px-7">{extra}</div>}
    </header>
  );
}
