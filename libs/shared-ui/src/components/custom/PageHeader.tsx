import { Link } from 'react-router-dom';
import { Breadcrumb, type BreadcrumbProps } from 'antd';

export default function PageHeader({ title, breadcrumb }: { title: string; breadcrumb: BreadcrumbProps['items'] }) {
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
    <header className="flex items-center justify-between w-full h-[58px] min-h-[58px] bg-white bt-shadow px-7 py-4">
      <div>
        <span className="text-[20px] font-bold text-[#495057]">{title}</span>
      </div>
      <div>
        <Breadcrumb items={breadcrumb} itemRender={itemRender} />
      </div>
    </header>
  );
}
