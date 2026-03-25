import type { BreadcrumbProps } from 'antd';
import PageHeader from '@/components/custom/PageHeader';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '관리', path: '/aoe/bot-config' },
  { title: 'Agent', path: '/aoe/bot-config/bot' },
  { title: 'Agent 목록', path: '/aoe/bot-config/bot/AgentList' },
];

export default function AgentList() {
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />
      <div className="w-full h-full bg-white bt-shadow overflow-y-auto">
        <div className="flex flex-col w-full h-full p-7">AgentList</div>
      </div>
    </div>
  );
}
