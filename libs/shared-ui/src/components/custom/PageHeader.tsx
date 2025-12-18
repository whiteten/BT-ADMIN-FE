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

  if (extra) {
    return (
      <header className="flex flex-col bg-white bt-shadow">
        <div className="flex items-center justify-between w-full px-7 py-4">
          <span className="text-[20px] font-bold text-[#495057]">{title}</span>
          <Breadcrumb items={breadcrumb} itemRender={itemRender} />
        </div>
        <Divider className="!m-0" />
        <div className="w-full px-7 py-[14px]">{extra}</div>
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between w-full h-[58px] min-h-[58px] bg-white bt-shadow px-7 py-4">
      <span className="text-[20px] font-bold text-[#495057]">{title}</span>
      <Breadcrumb items={breadcrumb} itemRender={itemRender} />
    </header>
  );
}
